/**
 * End-to-end tests of the tiered split pipeline (qpdf -> pdf-lib -> raster)
 * against generated fixtures: ordinary, large, complex, encrypted, corrupted,
 * and engine-failure scenarios. The same pipeline code runs in the browser.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { splitPdf, type PipelineDeps } from "../../lib/pdf-split/pipeline";
import { PdfSplitError, type PageRenderer, type QpdfRunner } from "../../lib/pdf-split/types";
import { createPdfJsRenderer } from "../../lib/pdf-split/pdfjs-renderer";
import {
  asBuffer, blankMixPdf, deps, embeddedMarkers, encrypt, garbage, inheritedAttrsPdf, largePdf, marker,
  mixedSizePdf, noTrailer, pageInfo, rotatedPdf, textOf, textPdf, truncated,
} from "./helpers";

const noQpdf: PipelineDeps = { ...deps, qpdf: null };
const throwingQpdf = (err: Error): PipelineDeps => ({ ...deps, qpdf: { split: async () => { throw err; } } as QpdfRunner });

async function rejects(p: Promise<unknown>, code: string) {
  await assert.rejects(p, (e: unknown) => e instanceof PdfSplitError && e.code === code, `expected PdfSplitError ${code}`);
}

describe("ordinary PDFs", () => {
  test("splits every page, in order, with selectable text and no cross-page content", async () => {
    const src = await textPdf("ord", 10);
    const r = await splitPdf(src, {}, deps);
    assert.equal(r.totalPages, 10);
    assert.deepEqual(r.pages.map((p) => p.pageNum), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    assert.deepEqual(r.failed, []);
    for (const p of r.pages) {
      assert.equal(p.textPreserved, true);
      assert.equal(p.engine, "qpdf");
      const text = await textOf(p.bytes);
      assert.ok(text.includes(marker("ord", p.pageNum)), `page ${p.pageNum} carries its own marker`);
      assert.equal((text.match(/MARK-ord-P\d+/g) ?? []).length, 1, "and only its own marker");
      assert.equal((await pageInfo(p.bytes)).count, 1);
    }
  });

  test("page selection: arbitrary order input, out-of-range pages ignored, ascending output", async () => {
    const src = await textPdf("sel", 12);
    const r = await splitPdf(src, { pages: [9, 2, 99, 5, 2, 0] }, deps);
    assert.deepEqual(r.pages.map((p) => p.pageNum), [2, 5, 9]);
    for (const p of r.pages) assert.ok((await textOf(p.bytes)).includes(marker("sel", p.pageNum)));
  });

  test("select callback receives the real page count", async () => {
    const src = await textPdf("cb", 7);
    let seen = 0;
    const r = await splitPdf(src, { select: (t) => { seen = t; return Array.from({ length: t }, (_, i) => i + 1).filter((n) => n % 2 === 0); } }, deps);
    assert.equal(seen, 7);
    assert.deepEqual(r.pages.map((p) => p.pageNum), [2, 4, 6]);
  });

  test("no matching pages is a clear error", async () => {
    await rejects(splitPdf(await textPdf("none", 3), { pages: [10, 11] }, deps), "NO_PAGES");
  });

  test("progress is reported and cancellation is honoured", async () => {
    const stages = new Set<string>();
    await splitPdf(await textPdf("prog", 4), { onProgress: (p) => stages.add(p.stage) }, deps);
    assert.ok(stages.has("inspect") && stages.has("qpdf"));
    const ac = new AbortController();
    ac.abort();
    await rejects(splitPdf(await textPdf("abort", 4), { signal: ac.signal }, noQpdf), "ABORTED");
  });
});

describe("complex PDFs", () => {
  test("internal links: each page contains ONLY itself (qpdf)", async () => {
    const src = await textPdf("lnk", 24, { linkToNext: true });
    assert.equal((await embeddedMarkers(src, "lnk")).size, 24);
    const r = await splitPdf(src, { pages: [1, 7, 24] }, deps);
    for (const p of r.pages) {
      const hidden = await embeddedMarkers(p.bytes, "lnk");
      assert.deepEqual([...hidden], [marker("lnk", p.pageNum)], "no other page's content is embedded");
    }
  });

  test("internal links: the pdf-lib tier no longer drags the whole document into every page", async () => {
    // Regression: pdf-lib follows /Dest link annotations transitively, so each
    // one-page output used to contain all pages (40x bloat + a content leak).
    const src = await textPdf("lnk2", 24, { linkToNext: true });
    const r = await splitPdf(src, { pages: [3, 12] }, noQpdf);
    for (const p of r.pages) {
      assert.equal(p.engine, "pdflib");
      assert.deepEqual([...(await embeddedMarkers(p.bytes, "lnk2"))], [marker("lnk2", p.pageNum)]);
      assert.ok(p.bytes.length < src.length / 4, `output ${p.bytes.length} B vs source ${src.length} B`);
    }
  });

  for (const [label, d] of [["qpdf", deps], ["pdf-lib", noQpdf]] as const) {
    test(`inherited /MediaBox, /Rotate and /Resources survive splitting (${label})`, async () => {
      const r = await splitPdf(inheritedAttrsPdf("inh"), {}, d);
      assert.equal(r.pages.length, 4);
      for (const p of r.pages) {
        const info = await pageInfo(p.bytes);
        assert.deepEqual([info.w, info.h, info.rotation], [400, 300, 90]);
        assert.ok((await textOf(p.bytes)).includes(marker("inh", p.pageNum)));
        assert.equal(p.textPreserved, true);
      }
    });
  }

  test("mixed page sizes and per-page rotation are preserved", async () => {
    const { bytes, sizes } = await mixedSizePdf("mix");
    const r = await splitPdf(bytes, {}, deps);
    for (const p of r.pages) {
      const info = await pageInfo(p.bytes);
      assert.deepEqual([info.w, info.h], sizes[p.pageNum - 1]);
    }
    const rot = await splitPdf(await rotatedPdf("rot"), {}, deps);
    assert.deepEqual(await Promise.all(rot.pages.map(async (p) => (await pageInfo(p.bytes)).rotation)), [0, 90, 0, 90]);
  });

  test("blank pages stay clean vector pages (not turned into blank images)", async () => {
    const { bytes, blank } = await blankMixPdf("blk");
    const r = await splitPdf(bytes, {}, deps);
    assert.equal(r.pages.length, 6);
    for (const p of r.pages) {
      assert.equal(p.textPreserved, true, `page ${p.pageNum} kept as vector`);
      if (!blank.includes(p.pageNum)) assert.ok((await textOf(p.bytes)).includes(marker("blk", p.pageNum)));
    }
  });
});

describe("large PDFs", () => {
  test("a ~12 MB, 12-page file splits quickly and every output is pruned", async () => {
    const src = await largePdf("big", 12);
    assert.ok(src.length > 10 * 1024 * 1024, `fixture is ${(src.length / 1048576).toFixed(1)} MB`);
    const t0 = Date.now();
    const r = await splitPdf(src, { pages: [1, 6, 12] }, deps);
    assert.ok(Date.now() - t0 < 60_000, "completes within a minute");
    assert.deepEqual(r.pages.map((p) => p.pageNum), [1, 6, 12]);
    for (const p of r.pages) {
      assert.ok(p.bytes.length < 2 * 1024 * 1024, `page ${p.pageNum} output is ${p.bytes.length} B (only its own image)`);
      assert.ok((await textOf(p.bytes)).includes(marker("big", p.pageNum)));
    }
  });
});

describe("encrypted PDFs", () => {
  for (const kind of ["aes256", "aes128", "rc4"] as const) {
    test(`owner-restricted ${kind}: text stays selectable, size and order intact`, async () => {
      const enc = await encrypt(await textPdf("enc", 5), kind);
      const r = await splitPdf(enc, { pages: [2, 4] }, deps);
      assert.deepEqual(r.pages.map((p) => p.pageNum), [2, 4]);
      for (const p of r.pages) {
        assert.equal(p.engine, "qpdf");
        assert.equal(p.textPreserved, true);
        assert.ok((await textOf(p.bytes)).includes(marker("enc", p.pageNum)));
        const info = await pageInfo(p.bytes); // output is decrypted, so pdf-lib can open it
        assert.deepEqual([info.w, info.h], [595, 842]);
      }
    });
  }

  test("user password: missing -> PASSWORD_REQUIRED, wrong -> PASSWORD_INCORRECT, right -> text preserved", async () => {
    const enc = await encrypt(await textPdf("pw", 4), "aes256", "s3cret");
    await rejects(splitPdf(enc, {}, deps), "PASSWORD_REQUIRED");
    await rejects(splitPdf(enc, { password: "nope" }, deps), "PASSWORD_INCORRECT");
    const r = await splitPdf(enc, { password: "s3cret", pages: [3] }, deps);
    assert.equal(r.pages[0].engine, "qpdf");
    assert.ok((await textOf(r.pages[0].bytes)).includes(marker("pw", 3)));
  });

  test("password also works through the raster tier when qpdf is unavailable", async () => {
    const enc = await encrypt(await textPdf("pwr", 3), "aes128", "abc");
    await rejects(splitPdf(enc, {}, noQpdf), "PASSWORD_REQUIRED");
    const r = await splitPdf(enc, { password: "abc", pages: [2] }, noQpdf);
    assert.equal(r.pages[0].engine, "raster");
  });

  test("raster fallback keeps the SOURCE page size (regression: it used to shrink pages to 75%)", async () => {
    const enc = await encrypt(await textPdf("ras", 3), "aes256");
    const r = await splitPdf(enc, {}, noQpdf);
    assert.equal(r.pages.length, 3);
    for (const p of r.pages) {
      assert.equal(p.engine, "raster");
      assert.equal(p.textPreserved, false);
      const info = await pageInfo(p.bytes);
      assert.ok(Math.abs(info.w - 595) <= 2 && Math.abs(info.h - 842) <= 2, `got ${info.w}x${info.h}, expected 595x842`);
      assert.ok(await deps.renderer.hasInk(p.bytes), "rendered page is not blank");
    }
  });
});

describe("corrupted PDFs", () => {
  test("missing xref/trailer is still split (pdf-lib tier) — the browser flow used to reject it", async () => {
    const damaged = noTrailer(await textPdf("dmg", 5));
    const r = await splitPdf(damaged, {}, deps);
    assert.equal(r.pages.length, 5);
    for (const p of r.pages) {
      assert.equal(p.engine, "pdflib");
      assert.ok((await textOf(p.bytes)).includes(marker("dmg", p.pageNum)));
    }
  });

  test("unrecoverable files give a clear UNREADABLE error (never blank output)", async () => {
    const good = await textPdf("bad", 6);
    await rejects(splitPdf(truncated(good, 0.4), {}, deps), "UNREADABLE");
    await rejects(splitPdf(garbage(), {}, deps), "UNREADABLE");
    await rejects(splitPdf(new Uint8Array(0), {}, deps), "UNREADABLE");
  });
});

describe("engine failures and verification", () => {
  test("qpdf failing hands over to pdf-lib", async () => {
    const r = await splitPdf(await textPdf("f1", 4), {}, throwingQpdf(new Error("wasm aborted")));
    assert.ok(r.pages.every((p) => p.engine === "pdflib" && p.textPreserved));
    assert.equal(r.pages.length, 4);
  });

  test("qpdf AND pdf-lib failing hands over to image rendering, with correct sizes", async () => {
    const brokenLib = async () => {
      const real = await import("pdf-lib");
      const proxy = Object.create(real) as typeof real;
      proxy.PDFDocument = { ...real.PDFDocument, load: async () => { throw new Error("cannot parse"); }, create: real.PDFDocument.create.bind(real.PDFDocument) } as never;
      return proxy;
    };
    const r = await splitPdf(await textPdf("f2", 3), {}, { ...deps, qpdf: null, loadPdfLib: brokenLib });
    assert.ok(r.pages.every((p) => p.engine === "raster" && !p.textPreserved));
    const info = await pageInfo(r.pages[0].bytes);
    assert.ok(Math.abs(info.w - 595) <= 2);
  });

  test("a qpdf output that renders blank is rejected and replaced", async () => {
    const good = await textPdf("ver", 4);
    const blankDoc = await PDFDocument.create();
    blankDoc.addPage([595, 842]);
    const blankBytes = await blankDoc.save();
    const flaky: QpdfRunner = {
      async split(bytes, pages, pw) {
        const real = await deps.qpdf!.split(bytes, pages, pw);
        real.set(3, blankBytes); // simulate silently corrupted output for page 3
        return real;
      },
    };
    const r = await splitPdf(good, {}, { ...deps, qpdf: flaky });
    const p3 = r.pages.find((p) => p.pageNum === 3)!;
    assert.ok((await textOf(p3.bytes)).includes(marker("ver", 3)), "page 3 recovered via another engine");
    assert.notEqual(p3.engine, "qpdf");
  });

  test("pdf.js unavailable (worker blocked / offline): structurally extracted pages are still delivered", async () => {
    // Small pages are normally render-checked; when pdf.js itself cannot run, "cannot verify"
    // must mean "trust the copy" — not "blank", and never a failed job.
    const noPdfJs = createPdfJsRenderer({
      loadPdfJs: async () => { throw new Error("worker blocked"); },
      createCanvas: () => { throw new Error("unused"); },
      loadJsPdf: async () => { throw new Error("unused"); },
    });
    const r = await splitPdf(await textPdf("nopdfjs", 4), {}, { ...deps, renderer: noPdfJs });
    assert.deepEqual(r.pages.map((p) => p.pageNum), [1, 2, 3, 4]);
    assert.ok(r.pages.every((p) => p.engine === "qpdf" && p.textPreserved));
  });

  test("a renderer that calls everything blank AND cannot rasterise still delivers the vector pages", async () => {
    const blankAndBroken: PageRenderer = {
      ...deps.renderer,
      hasInk: async () => false,
      openRaster: async () => { throw new PdfSplitError("UNREADABLE", "pdf.js unavailable"); },
    };
    const r = await splitPdf(await textPdf("bb", 3), {}, { ...deps, renderer: blankAndBroken });
    assert.equal(r.pages.length, 3);
    assert.ok(r.pages.every((p) => p.textPreserved));
  });

  test("out-of-memory style failures surface as ENGINE_FAILURE (the server-fallback trigger)", async () => {
    await rejects(splitPdf(await textPdf("oom", 3), {}, throwingQpdf(new RangeError("Array buffer allocation failed"))), "ENGINE_FAILURE");
  });

  test("ordinary single-page buffers are not mutated by the pipeline", async () => {
    const src = await textPdf("mut", 3);
    const copy = asBuffer(src).toString("base64");
    await splitPdf(src, {}, deps);
    assert.equal(asBuffer(src).toString("base64"), copy);
  });
});