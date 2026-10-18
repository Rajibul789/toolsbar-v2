/**
 * Browser -> server fallback behaviour, end to end:
 * real orchestrator + real HTTP client + real request handlers + the real
 * Node pipeline, with in-memory storage standing in for Supabase.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { hybridSplit, type FallbackReason, type HybridDeps } from "../../lib/pdf-split/hybrid";
import { createHttpServerClient } from "../../lib/pdf-split/client";
import { splitPdf, type PipelineDeps } from "../../lib/pdf-split/pipeline";
import { PdfSplitError, type PipelineResult, type QpdfRunner, type SplitPage } from "../../lib/pdf-split/types";
import { deps as nodeDeps, encrypt, garbage, marker, textOf, textPdf } from "./helpers";
import { makeServerDeps, memoryStorage, routedFetch, storageUploader } from "./fakes";

/** A "browser" whose engines all die the way they do when the tab runs out of memory. */
const oomBrowser: PipelineDeps = {
  ...nodeDeps,
  qpdf: { split: async () => { throw new RangeError("Array buffer allocation failed"); } } as QpdfRunner,
  loadPdfLib: async () => { throw new RangeError("Array buffer allocation failed"); },
};

function harness(opts: { storage?: ReturnType<typeof memoryStorage> | null; serverConfigured?: boolean; consent?: boolean | (() => boolean); browser?: PipelineDeps } = {}) {
  const storage = opts.storage === undefined ? memoryStorage() : opts.storage;
  const calls: string[] = [];
  const consentLog: FallbackReason[] = [];
  const serverDeps = makeServerDeps(storage);
  const client = storage
    ? createHttpServerClient({ fetchImpl: routedFetch(serverDeps, storage, calls), uploader: storageUploader(storage, calls) })
    : createHttpServerClient({ fetchImpl: routedFetch(serverDeps, memoryStorage(), calls), uploader: storageUploader(memoryStorage(), calls) });

  const make = (bytes: Uint8Array, fileName = "doc.pdf"): HybridDeps => ({
    runLocal: (o) => splitPdf(bytes, o, opts.browser ?? nodeDeps),
    server: client,
    serverAvailable: async () => opts.serverConfigured ?? !!storage,
    askConsent: async (reason) => {
      consentLog.push(reason);
      return typeof opts.consent === "function" ? opts.consent() : (opts.consent ?? true);
    },
    bytes,
    fileName,
  });
  return { storage, calls, consentLog, make };
}

const pagesOf = (r: PipelineResult) => r.pages.map((p) => p.pageNum);
async function assertMarkers(pages: SplitPage[], name: string) {
  for (const p of pages) assert.ok((await textOf(p.bytes)).includes(marker(name, p.pageNum)), `page ${p.pageNum} has its own content`);
}

describe("browser succeeds -> server is never involved", () => {
  test("no consent prompt, no network", async () => {
    const h = harness();
    const out = await hybridSplit(h.make(await textPdf("ok", 4)), {});
    assert.equal(out.source, "browser");
    assert.deepEqual(pagesOf(out.result), [1, 2, 3, 4]);
    assert.deepEqual(h.consentLog, []);
    assert.deepEqual(h.calls, []);
  });
});

describe("browser engine failure -> consented server fallback", () => {
  test("memory exhaustion in the browser: upload, process on the server, download, clean up", async () => {
    const h = harness({ browser: oomBrowser });
    const src = await textPdf("srv", 5);
    const out = await hybridSplit(h.make(src), { pages: [1, 3, 5] });

    assert.equal(out.source, "server");
    assert.deepEqual(h.consentLog, ["engine-failure"], "user was asked exactly once");
    assert.deepEqual(h.calls, ["init", "upload", "process", "cleanup"]);
    assert.deepEqual(pagesOf(out.result), [1, 3, 5]);
    await assertMarkers(out.result.pages, "srv");
    assert.ok(out.result.pages.every((p) => p.textPreserved && p.engine === "qpdf"));
    assert.equal(h.storage!.objects.size, 0, "nothing remains in storage afterwards");
  });

  test("DECLINING sends nothing anywhere", async () => {
    const h = harness({ browser: oomBrowser, consent: false });
    await assert.rejects(hybridSplit(h.make(await textPdf("no", 3)), {}), (e: unknown) => e instanceof PdfSplitError && e.code === "CONSENT_DECLINED");
    assert.deepEqual(h.calls, [], "no init, no upload, no process");
    assert.equal(h.storage!.objects.size, 0);
  });

  test("partial failure: only the failed pages go to the server, results are merged in order", async () => {
    const h = harness();
    const src = await textPdf("part", 6);
    let askedFor: number[] | undefined;
    const base = h.make(src);
    const out = await hybridSplit(
      {
        ...base,
        // the browser extracted pages 1,2,4,5,6 but could not do page 3
        runLocal: async (o) => {
          const full = await splitPdf(src, { ...o, pages: [1, 2, 4, 5, 6] }, nodeDeps);
          return { totalPages: 6, pages: full.pages, failed: [3] };
        },
        server: {
          split: async (args) => { askedFor = args.pages; return createHttpServerClient({ fetchImpl: routedFetch(makeServerDeps(h.storage), h.storage!, h.calls), uploader: storageUploader(h.storage!, h.calls) }).split(args); },
        },
      },
      {}
    );
    assert.deepEqual(askedFor, [3], "only the failed page was uploaded for processing");
    assert.deepEqual(h.consentLog, ["partial-failure"]);
    assert.equal(out.source, "browser+server");
    assert.deepEqual(pagesOf(out.result), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(out.result.failed, []);
    await assertMarkers(out.result.pages, "part");
  });

  test("partial failure + declined: the browser's partial result is returned, nothing uploaded", async () => {
    const h = harness({ consent: false });
    const src = await textPdf("pd", 4);
    const out = await hybridSplit(
      { ...h.make(src), runLocal: async () => ({ totalPages: 4, pages: (await splitPdf(src, { pages: [1, 2] }, nodeDeps)).pages, failed: [3, 4] }) },
      {}
    );
    assert.equal(out.source, "browser");
    assert.deepEqual(out.result.failed, [3, 4]);
    assert.deepEqual(h.calls, []);
  });

  test("an encrypted file that exhausts the browser is processed on the server with the user's password", async () => {
    const h = harness({ browser: oomBrowser });
    const enc = await encrypt(await textPdf("encsrv", 3), "aes256", "pa55word");
    // Note: the browser pipeline needs the password check to pass before engines run -> give it
    // an engine failure only after inspection; oomBrowser fails in pdf-lib load, so inspection
    // falls to pdf.js (works) and then qpdf (fails with RangeError) -> ENGINE_FAILURE.
    const out = await hybridSplit(h.make(enc), { password: "pa55word" });
    assert.equal(out.source, "server");
    await assertMarkers(out.result.pages, "encsrv");
    assert.equal(h.storage!.objects.size, 0);
  });

  test("a wrong password surfaces from the server as PASSWORD_INCORRECT (and the upload is kept for a retry)", async () => {
    const h = harness({ browser: oomBrowser });
    const enc = await encrypt(await textPdf("wp", 2), "aes256", "right");
    await assert.rejects(hybridSplit(h.make(enc), { password: "wrong" }), (e: unknown) => e instanceof PdfSplitError && e.code === "PASSWORD_INCORRECT");
    assert.ok(!h.calls.includes("cleanup"), "no cleanup, so the retry needs no re-upload");
  });

  test("when the page count was unknown, the user's selection is applied to the server's results", async () => {
    const h = harness({ browser: oomBrowser });
    const out = await hybridSplit(h.make(await textPdf("sel", 6)), { select: (t) => Array.from({ length: t }, (_, i) => i + 1).filter((n) => n % 2 === 0) });
    assert.deepEqual(pagesOf(out.result), [2, 4, 6]);
  });
});

describe("cases where the server must NOT be offered", () => {
  test("password needed: surfaced to the user, no consent prompt, no upload", async () => {
    const h = harness();
    const enc = await encrypt(await textPdf("pw", 2), "aes256", "needed");
    await assert.rejects(hybridSplit(h.make(enc), {}), (e: unknown) => e instanceof PdfSplitError && e.code === "PASSWORD_REQUIRED");
    assert.deepEqual(h.consentLog, []);
    assert.deepEqual(h.calls, []);
  });

  test("a corrupt file: the server's identical engines couldn't read it either, so nothing is uploaded", async () => {
    const h = harness();
    await assert.rejects(hybridSplit(h.make(garbage()), {}), (e: unknown) => e instanceof PdfSplitError && e.code === "UNREADABLE");
    assert.deepEqual(h.consentLog, []);
    assert.deepEqual(h.calls, []);
  });

  test("fallback not configured on this deployment: honest error, no prompt, no network", async () => {
    const h = harness({ browser: oomBrowser, serverConfigured: false });
    await assert.rejects(hybridSplit(h.make(await textPdf("nc", 2)), {}), (e: unknown) => e instanceof PdfSplitError && e.code === "ENGINE_FAILURE");
    assert.deepEqual(h.consentLog, []);
    assert.deepEqual(h.calls, []);
  });

  test("no storage at all -> /init answers 501 -> SERVER_UNAVAILABLE (when the probe is skipped)", async () => {
    const h = harness({ storage: null, serverConfigured: true, browser: oomBrowser });
    await assert.rejects(hybridSplit(h.make(await textPdf("u", 2)), {}), (e: unknown) => e instanceof PdfSplitError && e.code === "SERVER_UNAVAILABLE");
  });
});

describe("HTTP client behaviour", () => {
  test("a failed upload cleans up and reports SERVER_FAILED", async () => {
    const storage = memoryStorage();
    const calls: string[] = [];
    const client = createHttpServerClient({
      fetchImpl: routedFetch(makeServerDeps(storage), storage, calls),
      uploader: async () => { throw new Error("network down"); },
    });
    await assert.rejects(client.split({ bytes: await textPdf("x", 1), fileName: "x.pdf" }), (e: unknown) => e instanceof PdfSplitError && e.code === "SERVER_FAILED");
    assert.ok(calls.includes("cleanup"));
  });

  test("a terminal server error (corrupt PDF) triggers cleanup; the original is not left behind", async () => {
    const storage = memoryStorage();
    const calls: string[] = [];
    const client = createHttpServerClient({ fetchImpl: routedFetch(makeServerDeps(storage), storage, calls), uploader: storageUploader(storage, calls) });
    const bad = new Uint8Array([...new TextEncoder().encode("%PDF-1.4\n"), ...garbage(1500)]);
    await assert.rejects(client.split({ bytes: bad, fileName: "bad.pdf" }), (e: unknown) => e instanceof PdfSplitError && e.code === "UNREADABLE");
    assert.equal(storage.objects.size, 0);
  });

  test("oversized files are refused before any upload", async () => {
    const storage = memoryStorage();
    const calls: string[] = [];
    const client = createHttpServerClient({ fetchImpl: routedFetch(makeServerDeps(storage), storage, calls), uploader: storageUploader(storage, calls) });
    await assert.rejects(client.split({ bytes: new Uint8Array(51 * 1024 * 1024), fileName: "huge.pdf" }), (e: unknown) => e instanceof PdfSplitError && e.code === "TOO_LARGE");
    assert.ok(!calls.includes("upload"));
  });
});