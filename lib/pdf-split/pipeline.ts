/**
 * lib/pdf-split/pipeline.ts — the PDF Split engine orchestration.
 *
 * Runs unchanged in the browser and on the Node server; the environment
 * supplies a qpdf runner (WASM) and a pdf.js page renderer.
 *
 * Tier order (each tier only handles what the previous ones could not):
 *   1. qpdf    — decrypts, repairs, and writes a page-pruned file with the
 *                text still selectable.
 *   2. pdf-lib — structural copy; tolerant of files qpdf rejects (for example
 *                a missing xref/trailer). Internal link annotations are
 *                stripped first, otherwise pdf-lib pulls every linked page —
 *                transitively, the whole document — into each output page.
 *   3. raster  — pdf.js renders the page to an image. Always correct visually,
 *                never selectable.
 * Every text-preserving output that is small enough to suspect is rendered
 * and checked for ink before it is trusted.
 */
import {
  PdfSplitError,
  type PageRenderer,
  type PipelineResult,
  type QpdfRunner,
  type SplitOptions,
  type SplitPage,
} from "./types";

type PdfLib = typeof import("pdf-lib");

export interface PipelineDeps {
  renderer: PageRenderer;
  /** null when the qpdf engine is unavailable (e.g. the WASM file failed to load). */
  qpdf: QpdfRunner | null;
  loadPdfLib: () => Promise<PdfLib>;
}

/** Outputs at or below this size are rendered and checked for ink before being trusted. */
export const VERIFY_BELOW_BYTES = 8_000;

function isExpectedParseError(e: unknown): boolean {
  return !(e instanceof RangeError) && !/memory|allocation/i.test((e as Error)?.message ?? "");
}

/**
 * Removes link annotations whose target is inside the document (/Dest or a
 * GoTo action) from every page of an in-memory pdf-lib document. External
 * links, form fields and other annotations are kept.
 */
export function stripInternalLinks(doc: import("pdf-lib").PDFDocument, lib: PdfLib): void {
  const { PDFName, PDFArray, PDFDict } = lib;
  for (const page of doc.getPages()) {
    const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    const keep: import("pdf-lib").PDFObject[] = [];
    for (let i = 0; i < annots.size(); i++) {
      const dict = annots.lookupMaybe(i, PDFDict);
      let internal = false;
      if (dict && dict.get(PDFName.of("Subtype")) === PDFName.of("Link")) {
        const action = dict.lookupMaybe(PDFName.of("A"), PDFDict);
        internal =
          dict.has(PDFName.of("Dest")) ||
          (!!action && action.get(PDFName.of("S")) === PDFName.of("GoTo"));
      }
      if (!internal) keep.push(annots.get(i));
    }
    if (keep.length !== annots.size()) {
      page.node.set(PDFName.of("Annots"), doc.context.obj(keep));
    }
  }
}

export async function splitPdf(src: Uint8Array, opts: SplitOptions, deps: PipelineDeps): Promise<PipelineResult> {
  const { renderer } = deps;
  const progress = opts.onProgress;
  const checkAbort = () => {
    if (opts.signal?.aborted) throw new PdfSplitError("ABORTED", "Cancelled.");
  };

  // ── Inspect ────────────────────────────────────────────────────────────────
  progress?.({ stage: "inspect", done: 0, total: 1 });
  const lib = await deps.loadPdfLib();
  let srcDoc: import("pdf-lib").PDFDocument | null = null;
  let encrypted = false;
  let totalPages = 0;
  try {
    srcDoc = await lib.PDFDocument.load(src, { ignoreEncryption: true, updateMetadata: false });
    encrypted = srcDoc.isEncrypted;
    totalPages = srcDoc.getPageCount();
  } catch (e) {
    if (!isExpectedParseError(e)) throw new PdfSplitError("ENGINE_FAILURE", "Ran out of memory.", { cause: e });
    srcDoc = null; // pdf-lib can't parse it; pdf.js / qpdf may still be able to
  }

  // pdf.js is the authority on passwords (precise NEED/INCORRECT signals) and the
  // fallback page counter for files pdf-lib cannot parse.
  if (encrypted || !srcDoc) {
    totalPages = await renderer.numPages(src, opts.password); // throws PASSWORD_* / UNREADABLE
  }
  if (totalPages < 1) throw new PdfSplitError("UNREADABLE", "The PDF has no pages.");

  const wanted = opts.pages ?? opts.select?.(totalPages) ?? Array.from({ length: totalPages }, (_, i) => i + 1);
  const selected = [...new Set(wanted)]
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
  if (selected.length === 0) throw new PdfSplitError("NO_PAGES", "None of the selected pages exist in this PDF.");

  const done = new Map<number, SplitPage>();
  const blankCandidates = new Map<number, SplitPage>();
  let lastEngineError: unknown;
  const remaining = () => selected.filter((n) => !done.has(n));

  /** Accept a text-preserving output unless it is small AND renders blank. */
  async function accept(pageNum: number, bytes: Uint8Array, engine: "qpdf" | "pdflib"): Promise<void> {
    const page: SplitPage = { pageNum, bytes, engine, textPreserved: true };
    if (bytes.length > VERIFY_BELOW_BYTES || (await renderer.hasInk(bytes))) {
      done.set(pageNum, page);
    } else if (!blankCandidates.has(pageNum)) {
      blankCandidates.set(pageNum, page); // may just be a genuinely blank page — decided below
    }
  }

  // ── Tier 1: qpdf ───────────────────────────────────────────────────────────
  if (deps.qpdf) {
    checkAbort();
    progress?.({ stage: "qpdf", done: 0, total: selected.length });
    try {
      const out = await deps.qpdf.split(src, remaining(), opts.password);
      let n = 0;
      for (const [pageNum, bytes] of out) {
        await accept(pageNum, bytes, "qpdf");
        progress?.({ stage: "verify", done: ++n, total: out.size });
      }
    } catch (e) {
      if (!isExpectedParseError(e)) throw new PdfSplitError("ENGINE_FAILURE", "Ran out of memory.", { cause: e });
      // qpdf could not handle this file -> fall through to the next tier
    }
  }

  // ── Tier 2: pdf-lib (never for encrypted sources: it cannot decrypt) ───────
  if (srcDoc && !encrypted && remaining().length > 0) {
    stripInternalLinks(srcDoc, lib);
    const todo = remaining();
    for (let i = 0; i < todo.length; i++) {
      checkAbort();
      progress?.({ stage: "pdflib", done: i, total: todo.length });
      try {
        const pageDoc = await lib.PDFDocument.create();
        const [copied] = await pageDoc.copyPages(srcDoc, [todo[i] - 1]);
        pageDoc.addPage(copied);
        await accept(todo[i], await pageDoc.save(), "pdflib");
      } catch (e) {
        if (!isExpectedParseError(e)) throw new PdfSplitError("ENGINE_FAILURE", "Ran out of memory.", { cause: e });
        // this page's structure defeats pdf-lib -> raster tier
      }
      if (i % 8 === 7) await new Promise((r) => setTimeout(r, 0)); // keep the UI responsive
    }
  }

  // ── Tier 3: raster ─────────────────────────────────────────────────────────
  if (remaining().length > 0) {
    const todo = remaining();
    let session: Awaited<ReturnType<typeof renderer.openRaster>> | null = null;
    try {
      session = await renderer.openRaster(src, opts.password);
    } catch (e) {
      if (e instanceof PdfSplitError && (e.code === "PASSWORD_REQUIRED" || e.code === "PASSWORD_INCORRECT")) throw e;
      // pdf.js is unavailable (e.g. its worker is blocked): image rendering is impossible, so
      // pages that only looked blank because they could not be verified are kept as they are.
      lastEngineError = e;
      for (const n of todo) {
        const candidate = blankCandidates.get(n);
        if (candidate) done.set(n, candidate);
      }
    }
    if (session) try {
      for (let i = 0; i < todo.length; i++) {
        checkAbort();
        progress?.({ stage: "raster", done: i, total: todo.length });
        try {
          const bytes = await session.rasterise(todo[i]);
          const candidate = blankCandidates.get(todo[i]);
          // A genuinely blank page rasterises blank too: then keep the clean
          // vector page instead of a blank JPEG.
          if (candidate && !(await renderer.hasInk(bytes))) {
            done.set(todo[i], candidate);
          } else {
            done.set(todo[i], { pageNum: todo[i], bytes, engine: "raster", textPreserved: false });
          }
        } catch (e) {
          if (!isExpectedParseError(e)) throw new PdfSplitError("ENGINE_FAILURE", "Ran out of memory.", { cause: e });
          lastEngineError = e;
          const candidate = blankCandidates.get(todo[i]);
          if (candidate) done.set(todo[i], candidate);
        }
      }
    } finally {
      await session.close();
    }
  }

  const pages = selected.filter((n) => done.has(n)).map((n) => done.get(n)!);
  const failed = selected.filter((n) => !done.has(n));
  if (pages.length === 0) {
    throw new PdfSplitError("UNREADABLE", "No pages could be extracted. The PDF may be corrupt or use an unsupported format.", { cause: lastEngineError });
  }
  return { totalPages, pages, failed };
}