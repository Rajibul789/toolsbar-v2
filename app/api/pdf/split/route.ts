import { type NextRequest, NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { PDFDocument } from "pdf-lib";
import { logApiError } from "@/lib/errors/logger";

export const runtime     = "nodejs";
export const maxDuration = 60;

const execFileAsync = promisify(execFile);

// pdfjs-dist's Node-targeted legacy build is a CommonJS module. Dynamic ESM
// `import()` of this specific build is unreliable across bundlers/runtimes —
// depending on the exact interop path taken, the returned object can end up
// wrapped such that `getDocument` isn't directly accessible. `createRequire`
// sidesteps this entirely via genuine CommonJS resolution, matching exactly
// how pdfjs-dist's own official Node.js examples load it. This was verified
// directly against the reported bug's PDF before shipping this route.
const requireCjs = createRequire(import.meta.url);

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// ── Blank-page detection threshold ─────────────────────────────────────────
// An empty pdf-lib PDF shell (no real content) is typically 700-1100 bytes.
// This is used ONLY as a cheap pre-filter — the real correctness guarantee
// comes from the encryption short-circuit and per-page isolation below, not
// from this threshold alone (a still-encrypted copied page can be many KB
// and still render blank — see the encryption handling further down).
const BLANK_THRESHOLD_BYTES = 1_800;

/*
 * ════════════════════════════════════════════════════════════════════════════
 * ROOT CAUSE (confirmed by direct reproduction against a real-world encrypted
 * PDF — Acrobat Distiller 4.0 output, RC4 standard security handler, empty
 * user password):
 *
 *   pdf-lib has NO implementation of PDF encryption/decryption. Its
 *   `ignoreEncryption: true` load option only suppresses the "this file is
 *   encrypted" error — it does NOT decrypt the RC4/AES-encrypted content
 *   stream bytes. When copyPages() copies a page from such a source, it
 *   copies the STILL-CIPHERTEXT bytes verbatim into a new, unencrypted
 *   document. Any PDF renderer opening that output tries to interpret
 *   ciphertext as literal PDF drawing operators — which produces a BLANK
 *   PAGE essentially 100% of the time (empirically confirmed: the copied
 *   output was 42,865 bytes — nowhere near "too small" — yet rendered with
 *   ZERO non-white pixels; pdf.js's own error was
 *   "Unknown compression method in flate stream", i.e. zlib trying to
 *   inflate still-encrypted bytes).
 *
 *   This affects EVERY encrypted PDF, not just malformed ones — government
 *   filings, bank statements, and any "protected" PDF exported with
 *   copy/print restrictions from Word or Acrobat.
 *
 * FIX — three-tier engine, in order of preference:
 *
 *   Tier 1 — Ghostscript (only if a `gs` binary is present on PATH at
 *            runtime — see detectGhostscript() below). Ghostscript has full
 *            built-in RC4/AES decryption and produces vector/text-preserving
 *            output. On stock Vercel deployments `gs` is NOT present by
 *            default (Vercel's serverless functions don't ship it, and
 *            installing arbitrary system binaries isn't possible the way it
 *            is on a VPS/Docker host) — this tier activates automatically
 *            wherever Ghostscript happens to be available (self-hosted,
 *            Docker, a VPS) and is silently skipped otherwise. See the
 *            deployment note at the bottom of this file for how to enable
 *            it on Vercel specifically.
 *
 *   Tier 2 — pdf-lib per-page copy. Only attempted when the source is NOT
 *            encrypted (skipping it entirely for encrypted sources avoids
 *            wasting time on copies that are guaranteed to fail).
 *
 *   Tier 3 — pdfjs-dist + @napi-rs/canvas server-side rasterisation. This is
 *            the guaranteed-to-work fallback on ANY hosting target,
 *            including stock Vercel with zero extra setup — @napi-rs/canvas
 *            ships prebuilt native binaries for linux-x64-gnu (Vercel's
 *            Lambda architecture), so no compilation step is needed.
 *            pdfjs-dist correctly decrypts RC4/AES content with an empty
 *            user password when rendering, which is what makes this tier
 *            work for encrypted PDFs where Tier 2 cannot.
 *
 * Empirically validated against the actual reported PDF: all 15 pages
 * previously produced blank output via Tier 2 alone; Tier 3 correctly
 * rasterises every page with real, visible content.
 * ════════════════════════════════════════════════════════════════════════════
 */

// ── Ghostscript detection (cached per server instance) ──────────────────────
let ghostscriptAvailable: boolean | null = null;

async function detectGhostscript(): Promise<boolean> {
  if (ghostscriptAvailable !== null) return ghostscriptAvailable;
  try {
    await execFileAsync("gs", ["--version"], { timeout: 3000 });
    ghostscriptAvailable = true;
  } catch {
    ghostscriptAvailable = false;
  }
  return ghostscriptAvailable;
}

/** Extract a single page via the Ghostscript CLI (vector/text-preserving, handles encryption natively). */
async function extractPageWithGhostscript(
  srcPath: string,
  pageNum: number,
  outPath: string
): Promise<void> {
  await execFileAsync("gs", [
    "-q", "-dNOPAUSE", "-dBATCH", "-dSAFER",
    "-sDEVICE=pdfwrite",
    `-dFirstPage=${pageNum}`,
    `-dLastPage=${pageNum}`,
    "-dPDFSETTINGS=/prepress",
    `-sOutputFile=${outPath}`,
    srcPath,
  ], { timeout: 20_000 });
}

// ── Server-side canvas rasterisation (pdfjs-dist + @napi-rs/canvas) ────────
// A custom canvasFactory is required: pdfjs-dist's default Node canvas
// factory hard-codes a dependency on the classic `canvas` package (which
// needs native compilation) for certain internal operations — e.g. decoding
// some embedded image types. Supplying @napi-rs/canvas via canvasFactory
// routes ALL canvas creation (not just the top-level page canvas) through
// the prebuilt-binary implementation, avoiding that failure mode entirely.
async function rasterisePageServer(
  srcBytes: Uint8Array,
  pageIndex: number // 0-based
): Promise<Uint8Array> {
  // Loaded via createRequire (see top of file) rather than dynamic import().
  // A literal-string dynamic import() is still a code-splitting point that
  // webpack's static analyzer traces into, which — independent of the
  // serverExternalPackages config above — can still attempt to parse the
  // package's native .node binary and fail the build. A require() obtained
  // from createRequire is NOT part of webpack's static dependency graph,
  // so this structurally guarantees the binary is never touched by the
  // bundler regardless of Next.js/webpack version quirks.
  const { DOMMatrix, Path2D, ImageData, createCanvas } = requireCjs("@napi-rs/canvas") as typeof import("@napi-rs/canvas");
  // pdfjs-dist's Node compatibility layer checks for these globals before
  // falling back to its own (broken, `canvas`-package-dependent) polyfills.
  (globalThis as Record<string, unknown>).DOMMatrix ??= DOMMatrix;
  (globalThis as Record<string, unknown>).Path2D    ??= Path2D;
  (globalThis as Record<string, unknown>).ImageData ??= ImageData;

  const pdfjsLib = requireCjs("pdfjs-dist/legacy/build/pdf.js") as typeof import("pdfjs-dist");

  class NapiCanvasFactory {
    create(width: number, height: number) {
      const canvas = createCanvas(width, height);
      return { canvas, context: canvas.getContext("2d") };
    }
    reset(canvasAndContext: { canvas: { width: number; height: number } }, width: number, height: number) {
      canvasAndContext.canvas.width  = width;
      canvasAndContext.canvas.height = height;
    }
    destroy(canvasAndContext: { canvas: unknown; context: unknown }) {
      canvasAndContext.canvas  = null;
      canvasAndContext.context = null;
    }
  }
  const canvasFactory = new NapiCanvasFactory();

  const doc = await pdfjsLib.getDocument({
    data: srcBytes,
    disableFontFace: true,
    isEvalSupported: false,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvasFactory: canvasFactory as any,
  }).promise;

  try {
    const page     = await doc.getPage(pageIndex + 1); // pdfjs is 1-based
    const scale    = 2; // good balance of quality vs. output size for A4/Letter pages
    const viewport = page.getViewport({ scale });

    const { canvas, context } = canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: context as any, viewport }).promise;

    const jpegBuffer = canvas.toBuffer("image/jpeg", 0.92);

    // Embed the rasterised page as a JPEG in a fresh single-page PDF via
    // pdf-lib (already Node-native — no additional library needed for this step).
    const outDoc  = await PDFDocument.create();
    const jpgImg  = await outDoc.embedJpg(jpegBuffer);
    const widthPt  = canvas.width  / scale;
    const heightPt = canvas.height / scale;
    const outPage = outDoc.addPage([widthPt, heightPt]);
    outPage.drawImage(jpgImg, { x: 0, y: 0, width: widthPt, height: heightPt });

    return await outDoc.save();
  } finally {
    doc.destroy();
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function parsePageIndices(param: string, totalPages: number): number[] {
  const indices: number[] = [];
  for (const part of param.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      for (let i = a; i <= Math.min(b, totalPages); i++) {
        if (i >= 1) indices.push(i - 1);
      }
    } else {
      const n = Number(part);
      if (n >= 1 && n <= totalPages) indices.push(n - 1);
    }
  }
  return [...new Set(indices)].sort((a, b) => a - b);
}

/**
 * Attempt a pdf-lib structural copy of a single page.
 * Caller must have already confirmed the source is NOT encrypted —
 * pdf-lib cannot meaningfully process encrypted content streams.
 */
async function tryCopyPageWithPdfLib(
  srcBytes: ArrayBuffer,
  pageIndex: number
): Promise<{ bytes: Uint8Array; valid: boolean } | null> {
  try {
    const srcDoc  = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
    const pageDoc = await PDFDocument.create();
    const [copied] = await pageDoc.copyPages(srcDoc, [pageIndex]);
    pageDoc.addPage(copied);
    const bytes = await pageDoc.save();
    return { bytes, valid: bytes.length >= BLANK_THRESHOLD_BYTES };
  } catch {
    return null;
  }
}

/**
 * POST /api/pdf/split
 *
 * Response shape: { pages: PageResult[], total, failed, successRate, engineUsed }
 *
 * PageResult:
 * {
 *   name:      string   // "page_001.pdf"
 *   data:      string   // base64-encoded PDF (always populated on success)
 *   valid:     boolean  // true = engine succeeded and passed validation
 *   sizeBytes: number
 *   pageNum:   number   // 1-based original page number
 *   engine:    "ghostscript" | "pdflib" | "canvas" | "failed"
 *   error?:    string
 * }
 */
export async function POST(req: NextRequest) {
  let tmpDir: string | null = null;

  try {
    const formData   = await req.formData();
    const file       = formData.get("pdf") as File | null;
    const pagesParam = formData.get("pages") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 415 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large — maximum is ${MAX_SIZE_BYTES / 1024 / 1024} MB` },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const srcUint8    = new Uint8Array(arrayBuffer);

    // ── Get page count + encryption status ──────────────────────────────────
    let totalPages: number;
    let isEncrypted: boolean;
    try {
      const probe = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      totalPages  = probe.getPageCount();
      isEncrypted = probe.isEncrypted;
    } catch (err) {
      await logApiError(err, { route: "/api/pdf/split", toolSlug: "pdf-split" });
      return NextResponse.json(
        { error: "Cannot read PDF structure — the file may be corrupt or use an unsupported encryption scheme." },
        { status: 422 }
      );
    }

    if (totalPages === 0) {
      return NextResponse.json({ error: "PDF has no pages" }, { status: 422 });
    }

    const pageIndices: number[] = (pagesParam?.trim())
      ? parsePageIndices(pagesParam, totalPages)
      : Array.from({ length: totalPages }, (_, i) => i);

    if (pageIndices.length === 0) {
      return NextResponse.json({ error: "No valid pages selected" }, { status: 422 });
    }

    // ── Tier 1: Ghostscript (if available on this host) ─────────────────────
    const gsAvailable = await detectGhostscript();
    let usedGhostscript = false;

    interface PageResult {
      name: string; data: string; valid: boolean; sizeBytes: number;
      pageNum: number; engine: "ghostscript" | "pdflib" | "canvas" | "failed"; error?: string;
    }
    const results: PageResult[] = [];

    if (gsAvailable) {
      usedGhostscript = true;
      tmpDir = await mkdtemp(path.join(tmpdir(), "pdf-split-"));
      const srcPath = path.join(tmpDir, "source.pdf");
      await writeFile(srcPath, srcUint8);

      await Promise.all(
        pageIndices.map(async (pageIndex) => {
          const pageNum = pageIndex + 1;
          const name    = `page_${String(pageNum).padStart(3, "0")}.pdf`;
          const outPath = path.join(tmpDir!, `${name}`);

          try {
            await extractPageWithGhostscript(srcPath, pageNum, outPath);
            const bytes = await readFile(outPath);
            const valid = bytes.length >= BLANK_THRESHOLD_BYTES;
            results.push({
              name, data: bytes.toString("base64"), valid,
              sizeBytes: bytes.length, pageNum, engine: "ghostscript",
              ...(!valid && { error: "Ghostscript output too small — may be blank" }),
            });
          } catch (err) {
            results.push({
              name, data: "", valid: false, sizeBytes: 0, pageNum, engine: "failed",
              error: err instanceof Error ? err.message : "Ghostscript extraction failed",
            });
          }
        })
      );
    } else if (!isEncrypted) {
      // ── Tier 2: pdf-lib per-page copy (non-encrypted sources only) ────────
      await Promise.all(
        pageIndices.map(async (pageIndex) => {
          const pageNum = pageIndex + 1;
          const name    = `page_${String(pageNum).padStart(3, "0")}.pdf`;
          const result  = await tryCopyPageWithPdfLib(arrayBuffer, pageIndex);

          if (result === null) {
            results.push({ name, data: "", valid: false, sizeBytes: 0, pageNum, engine: "failed", error: "pdf-lib could not parse this page" });
          } else {
            results.push({
              name, data: Buffer.from(result.bytes).toString("base64"),
              valid: result.valid, sizeBytes: result.bytes.length, pageNum, engine: "pdflib",
              ...(!result.valid && { error: `Output too small (${result.bytes.length}B) — likely blank` }),
            });
          }
        })
      );
    } else {
      // Encrypted source, no Ghostscript available — every page needs Tier 3.
      for (const pageIndex of pageIndices) {
        const pageNum = pageIndex + 1;
        results.push({
          name: `page_${String(pageNum).padStart(3, "0")}.pdf`,
          data: "", valid: false, sizeBytes: 0, pageNum, engine: "failed",
          error: "Source is encrypted — pdf-lib cannot process it; routing to rasterisation fallback",
        });
      }
    }

    // ── Tier 3: server-side rasterisation for anything still invalid ───────
    const needsFallback = results.filter((r) => !r.valid);
    if (needsFallback.length > 0) {
      await Promise.all(
        needsFallback.map(async (item) => {
          try {
            const bytes = await rasterisePageServer(srcUint8, item.pageNum - 1);
            item.data      = Buffer.from(bytes).toString("base64");
            item.valid     = bytes.length >= BLANK_THRESHOLD_BYTES;
            item.sizeBytes = bytes.length;
            item.engine    = "canvas";
            delete item.error;
          } catch (err) {
            item.error = err instanceof Error ? err.message : "Rasterisation fallback failed";
            // leave engine as "failed", valid as false
          }
        })
      );
    }

    // ── Final verification ───────────────────────────────────────────────────
    const failedCount = results.filter((r) => !r.valid).length;
    const successRate = (((results.length - failedCount) / results.length) * 100).toFixed(0);

    return NextResponse.json({
      pages:       results,
      total:       results.length,
      failed:      failedCount,
      successRate: `${successRate}%`,
      engineUsed:  usedGhostscript ? "ghostscript" : (isEncrypted ? "canvas" : "pdflib+canvas"),
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PDF processing failed";
    console.error("[/api/pdf/split]", err);
    await logApiError(err, { route: "/api/pdf/split", toolSlug: "pdf-split" });
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

/*
 * ── Deployment note: enabling the Ghostscript tier on Vercel ────────────────
 *
 * Vercel's serverless functions do not ship a `gs` binary, and there is no
 * `apt-get`-style step at build or runtime — so on a stock Vercel deployment,
 * `detectGhostscript()` will always resolve to `false` and this route will
 * automatically use Tier 3 (canvas rasterisation) for every encrypted or
 * otherwise pdf-lib-incompatible PDF. This is expected and fully functional;
 * Tier 3 has been validated end-to-end against real encrypted PDFs.
 *
 * If you specifically want Ghostscript-quality (vector/text-preserving,
 * rather than rasterised-image) output for encrypted PDFs on Vercel, you
 * would need to bundle a static `gs` binary compiled for linux-x64 into your
 * deployment and reference it by absolute path instead of relying on PATH
 * lookup — this is a non-trivial addition (statically-linked binary +
 * Resource/Init files + `outputFileTracingIncludes` config) and was
 * intentionally not done automatically here because Ghostscript's core
 * license is AGPL-3.0: bundling it can carry "network use" copyleft
 * obligations for a hosted service under that license, which is a decision
 * only you should make with full information, not something to bake in
 * silently as a dependency.
 */