/** Request-handler tests for the server fallback (init / process / cleanup). */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { handleCapabilities, handleCleanup, handleInit, handleProcess, sweepAbandoned, createMemoryRateLimiter, ABANDONED_AFTER_MS, JOB_PREFIX } from "../../lib/pdf-split/server";
import { MAX_PDF_BYTES } from "../../lib/pdf-split/types";
import { encrypt, garbage, marker, noTrailer, textOf, textPdf } from "./helpers";
import { makeServerDeps, memoryStorage, post, readJson } from "./fakes";

const sourcePath = (id: string) => `${JOB_PREFIX}/${id}/source.pdf`;

async function initJob(deps: ReturnType<typeof makeServerDeps>, storage: ReturnType<typeof memoryStorage>, bytes: Uint8Array) {
  const res = await handleInit(post("/api/pdf/split/init", { size: bytes.length }), deps);
  assert.equal(res.status, 200);
  const slot = await readJson(res);
  storage.putViaSignedUpload(slot as { path: string }, bytes);
  return slot;
}

describe("capability probe", () => {
  test("reports whether the fallback is configured", async () => {
    const s = memoryStorage();
    assert.equal((await readJson(handleCapabilities(makeServerDeps(s)))).serverFallback, true);
    assert.equal((await readJson(handleCapabilities(makeServerDeps(null)))).serverFallback, false);
    assert.equal((await readJson(handleCapabilities(makeServerDeps(s, { publicConfig: () => null })))).serverFallback, false);
  });
});

describe("POST /init", () => {
  test("issues a private signed upload slot (no path chosen by the client)", async () => {
    const s = memoryStorage();
    const res = await handleInit(post("/api/pdf/split/init", { size: 1234, fileName: "../../etc/passwd" }), makeServerDeps(s));
    assert.equal(res.status, 200);
    const body = await readJson(res);
    assert.match(body.jobId, /^[0-9a-f-]{36}$/);
    assert.equal(body.path, sourcePath(body.jobId));
    assert.ok(body.token && body.bucket && body.supabaseUrl && body.anonKey);
    assert.equal(res.headers.get("cache-control"), "no-store");
  });

  test("rejects cross-site and Origin-less requests", async () => {
    const deps = makeServerDeps(memoryStorage());
    assert.equal((await handleInit(post("/api/pdf/split/init", { size: 10 }, { origin: "https://evil.example" }), deps)).status, 403);
    const noOrigin = new Request("https://site.example/api/pdf/split/init", { method: "POST", body: JSON.stringify({ size: 10 }), headers: { host: "site.example" } });
    assert.equal((await handleInit(noOrigin, deps)).status, 403);
  });

  test("validates size: bad -> 400, over 50 MB -> 413", async () => {
    const deps = makeServerDeps(memoryStorage());
    for (const size of [0, -5, 1.5, "abc", null]) assert.equal((await handleInit(post("/x", { size }), deps)).status, 400, `size ${String(size)}`);
    assert.equal((await handleInit(post("/x", "not json"), deps)).status, 400);
    const big = await handleInit(post("/x", { size: MAX_PDF_BYTES + 1 }), deps);
    assert.equal(big.status, 413);
    assert.equal((await readJson(big)).error.code, "TOO_LARGE");
  });

  test("501 when the server fallback is not configured", async () => {
    const res = await handleInit(post("/x", { size: 10 }), makeServerDeps(null));
    assert.equal(res.status, 501);
    assert.equal((await readJson(res)).error.code, "SERVER_UNAVAILABLE");
  });

  test("rate limits per client", async () => {
    const deps = makeServerDeps(memoryStorage());
    let last = 200;
    for (let i = 0; i < 11; i++) last = (await handleInit(post("/x", { size: 10 }, { "x-forwarded-for": "9.9.9.9" }), deps)).status;
    assert.equal(last, 429);
    assert.equal((await handleInit(post("/x", { size: 10 }, { "x-forwarded-for": "8.8.8.8" }), deps)).status, 200, "other clients unaffected");
  });

  test("sweeps abandoned objects (and only those) on init", async () => {
    const s = memoryStorage();
    s.objects.set(`${JOB_PREFIX}/old/source.pdf`, { bytes: new Uint8Array(1), createdAt: s.clock.now - ABANDONED_AFTER_MS - 1000 });
    s.objects.set(`${JOB_PREFIX}/fresh/source.pdf`, { bytes: new Uint8Array(1), createdAt: s.clock.now - 1000 });
    await handleInit(post("/x", { size: 10 }), makeServerDeps(s));
    await new Promise((r) => setTimeout(r, 20)); // the sweep is fire-and-forget
    assert.equal(s.objects.has(`${JOB_PREFIX}/old/source.pdf`), false);
    assert.equal(s.objects.has(`${JOB_PREFIX}/fresh/source.pdf`), true);
    assert.equal(await sweepAbandoned(s, s.clock.now), 0);
  });
});

describe("POST /process", () => {
  test("splits, stores pages, signs download URLs, and deletes the source immediately", async () => {
    const s = memoryStorage(); const deps = makeServerDeps(s);
    const slot = await initJob(deps, s, await textPdf("srv", 6));
    const res = await handleProcess(post("/x", { jobId: slot.jobId, pages: [2, 5] }), deps);
    assert.equal(res.status, 200);
    const body = await readJson(res);
    assert.deepEqual(body.results.map((r: { pageNum: number }) => r.pageNum), [2, 5]);
    assert.deepEqual(body.failed, []);
    assert.equal(body.totalPages, 6);
    for (const r of body.results) {
      assert.match(r.url, /^memory:\/\//);
      assert.equal(r.textPreserved, true);
      const stored = s.objects.get(`${JOB_PREFIX}/${slot.jobId}/out/${r.name}`)!;
      assert.ok((await textOf(stored.bytes)).includes(marker("srv", r.pageNum)));
    }
    assert.equal(s.objects.has(sourcePath(slot.jobId)), false, "uploaded original is removed once processed");
  });

  test("rejects malformed requests and path-traversal job ids", async () => {
    const deps = makeServerDeps(memoryStorage());
    for (const jobId of ["../../etc/passwd", "jobs/x", "", "123", `${randomUUID()}/../x`]) {
      assert.equal((await handleProcess(post("/x", { jobId }), deps)).status, 400, jobId);
    }
    const id = randomUUID();
    for (const pages of [[], [0], [1.5], "1", [1, "2"], new Array(10001).fill(1)]) {
      assert.equal((await handleProcess(post("/x", { jobId: id, pages }), deps)).status, 400);
    }
    assert.equal((await handleProcess(post("/x", { jobId: id, password: "x".repeat(300) }), deps)).status, 400);
  });

  test("404 for an upload that never happened / expired", async () => {
    const res = await handleProcess(post("/x", { jobId: randomUUID() }), makeServerDeps(memoryStorage()));
    assert.equal(res.status, 404);
  });

  test("non-PDF content is rejected (415) and removed", async () => {
    const s = memoryStorage(); const deps = makeServerDeps(s);
    const slot = await initJob(deps, s, new TextEncoder().encode("<html>definitely not a pdf</html>"));
    const res = await handleProcess(post("/x", { jobId: slot.jobId }), deps);
    assert.equal(res.status, 415);
    assert.equal(s.objects.size, 0);
  });

  test("oversized stored object is rejected (413) and removed", async () => {
    const s = memoryStorage(); const deps = makeServerDeps(s);
    const id = randomUUID();
    s.objects.set(sourcePath(id), { bytes: new Uint8Array(MAX_PDF_BYTES + 10), createdAt: s.clock.now });
    assert.equal((await handleProcess(post("/x", { jobId: id }), deps)).status, 413);
    assert.equal(s.objects.size, 0);
  });

  test("corrupt PDFs give a clear UNREADABLE error and nothing is left behind", async () => {
    const s = memoryStorage(); const deps = makeServerDeps(s);
    const bad = new Uint8Array([...new TextEncoder().encode("%PDF-1.4\n"), ...garbage(2000)]);
    const slot = await initJob(deps, s, bad);
    const res = await handleProcess(post("/x", { jobId: slot.jobId }), deps);
    assert.equal(res.status, 422);
    assert.equal((await readJson(res)).error.code, "UNREADABLE");
    assert.equal(s.objects.size, 0);
  });

  test("a damaged-but-parseable PDF is still processed", async () => {
    const s = memoryStorage(); const deps = makeServerDeps(s);
    const slot = await initJob(deps, s, noTrailer(await textPdf("dm", 3)));
    const body = await readJson(await handleProcess(post("/x", { jobId: slot.jobId }), deps));
    assert.equal(body.results.length, 3);
  });

  test("encrypted: password required keeps the upload for a retry; correct password succeeds; the password is never echoed", async () => {
    const s = memoryStorage(); const deps = makeServerDeps(s);
    const slot = await initJob(deps, s, await encrypt(await textPdf("pw", 3), "aes256", "hunter2-secret"));

    const first = await handleProcess(post("/x", { jobId: slot.jobId }), deps);
    assert.equal(first.status, 422);
    assert.equal((await readJson(first)).error.code, "PASSWORD_REQUIRED");
    assert.ok(s.objects.has(sourcePath(slot.jobId)), "upload kept so the retry needs no re-upload");

    const wrong = await handleProcess(post("/x", { jobId: slot.jobId, password: "wrong-password" }), deps);
    const wrongText = await wrong.text();
    assert.equal(JSON.parse(wrongText).error.code, "PASSWORD_INCORRECT");
    assert.ok(!wrongText.includes("wrong-password"));

    const ok = await handleProcess(post("/x", { jobId: slot.jobId, password: "hunter2-secret" }), deps);
    const okText = await ok.text();
    assert.equal(ok.status, 200);
    assert.ok(!okText.includes("hunter2-secret"), "the password is never reflected in a response");
    assert.equal(JSON.parse(okText).results.length, 3);
  });

  test("owner-restricted encrypted PDFs need no password", async () => {
    const s = memoryStorage(); const deps = makeServerDeps(s);
    const slot = await initJob(deps, s, await encrypt(await textPdf("own", 2), "aes128"));
    const body = await readJson(await handleProcess(post("/x", { jobId: slot.jobId }), deps));
    assert.equal(body.results.length, 2);
    assert.ok(body.results.every((r: { engine: string; textPreserved: boolean }) => r.engine === "qpdf" && r.textPreserved));
  });
});

describe("POST /cleanup", () => {
  test("removes every object of the job and only that job", async () => {
    const s = memoryStorage(); const deps = makeServerDeps(s);
    const a = await initJob(deps, s, await textPdf("a", 2));
    const b = await initJob(deps, s, await textPdf("b", 2));
    await handleProcess(post("/x", { jobId: a.jobId }), deps);
    const res = await handleCleanup(post("/x", { jobId: a.jobId }), deps);
    assert.equal(res.status, 200);
    assert.ok([...s.objects.keys()].every((k) => !k.includes(a.jobId)));
    assert.ok(s.objects.has(sourcePath(b.jobId)), "other jobs untouched");
    assert.equal((await handleCleanup(post("/x", { jobId: "nope" }), deps)).status, 400);
  });
});

test("memory rate limiter: window slides", () => {
  let t = 0;
  const rl = createMemoryRateLimiter(() => t);
  assert.equal(rl.hit("k", 2, 1000), 0);
  assert.equal(rl.hit("k", 2, 1000), 0);
  assert.ok(rl.hit("k", 2, 1000) > 0);
  t = 1500;
  assert.equal(rl.hit("k", 2, 1000), 0);
});