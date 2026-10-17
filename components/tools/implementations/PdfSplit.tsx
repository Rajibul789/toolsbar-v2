"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Download, Info, AlertTriangle } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal, DownloadButton } from "@/components/tools/ResultReveal";
import { formatBytes, downloadBlob } from "@/lib/utils";
import { toast } from "sonner";
import type { PDFDocumentProxy } from "pdfjs-dist";

type ProcessState = "idle" | "processing" | "complete" | "error";
type SplitMode    = "all" | "range" | "evens" | "odds";

interface PageResult {
  name:   string;
  blob:   Blob;
  url:    string;
  size:   number;
  /** Which engine produced this page */
  engine: "pdflib" | "canvas";
}

// ── Constants ────────────────────────────────────────────────────────────────
/**
 * pdf-lib outputs at or below this size are VERIFIED by rendering them (see
 * hasVisibleContent) before being trusted. Size is only a trigger for that
 * check — never a verdict on its own.
 *
 * The previous design treated any output under 1,800 bytes as "blank" and
 * sent it straight to image rasterisation. That was wrong: a perfectly valid
 * text page copied by pdf-lib is routinely smaller than that (measured:
 * 40 lines of 11 pt text -> 1,745 bytes; a short paragraph -> ~1,160 bytes;
 * a single line -> ~850 bytes), so ordinary text pages were needlessly
 * converted to non-selectable images.
 */
const VERIFY_BELOW_BYTES = 8_000;

/**
 * Thumbnail size (longest edge, px) for the content check. 256 px keeps even
 * a single short line of 10 pt text visible (at 48 px it rendered as 1-3
 * pixels and could be mistaken for blank).
 */
const THUMB_SIZE = 256;

/** Canvas rasterisation DPI multiplier (2.5× = crisp on Retina, fast enough) */
const RASTER_SCALE = 2.5;

/** Files above this size only get a heads-up toast; they are still processed locally. */
const LARGE_FILE_NOTICE_BYTES = 20 * 1024 * 1024; // 20 MB

const PDFJS_WORKER_URL = (version: string) =>
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseRanges(input: string, total: number): number[] {
  const pages = new Set<number>();
  for (const part of input.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      for (let i = a; i <= Math.min(b, total); i++) if (i >= 1) pages.add(i);
    } else {
      const n = Number(part);
      if (n >= 1 && n <= total) pages.add(n);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

/**
 * Render one page of an ALREADY-OPEN pdf.js document to a single-page,
 * image-based PDF Blob. Used as the fallback engine for pages pdf-lib cannot
 * copy faithfully.
 *
 * The document is opened once by the caller and shared across pages. The
 * previous version re-parsed (and copied) the whole source file for every
 * page, which for a 50 MB / 100-page PDF meant 100 full parses and 5 GB of
 * transient copies — the main reason large files were hard on the browser.
 */
async function rasterisePage(pdfDoc: PDFDocumentProxy, pageIndex: number): Promise<Blob> {
  const page     = await pdfDoc.getPage(pageIndex + 1); // pdfjs is 1-based
  const viewport = page.getViewport({ scale: RASTER_SCALE });

  const canvas  = document.createElement("canvas");
  canvas.width  = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx     = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  // White background (PDFs render transparent without it)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  try {
    await page.render({ canvasContext: ctx, viewport }).promise;
  } finally {
    page.cleanup();
  }

  // Embed canvas as JPEG in a new PDF via jsPDF
  const { jsPDF } = await import("jspdf");

  // Convert viewport (in CSS px at RASTER_SCALE) back to pt for jsPDF
  // 1 pt = 1/72 inch; pdfjs viewport uses CSS px at 96 dpi
  const widthPt  = viewport.width  / RASTER_SCALE * 72 / 96;
  const heightPt = viewport.height / RASTER_SCALE * 72 / 96;

  const doc = new jsPDF({
    unit:        "pt",
    format:      [widthPt, heightPt],
    orientation: widthPt > heightPt ? "landscape" : "portrait",
    compress:    true,
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  doc.addImage(imgData, "JPEG", 0, 0, widthPt, heightPt, "", "FAST");

  const pdfBytes = doc.output("arraybuffer");
  // Release the canvas backing store promptly (matters on mobile Safari).
  canvas.width = canvas.height = 0;
  return new Blob([pdfBytes], { type: "application/pdf" });
}

/**
 * Content check on the ACTUAL pdf-lib OUTPUT (a single-page PDF): render it
 * and look for any non-white pixel.
 *
 * It must render the pdf-lib OUTPUT bytes, not the original multi-page
 * source: pdf.js correctly decrypts and renders an encrypted SOURCE (so it
 * always "has content") even when pdf-lib's copyPages() has produced a
 * corrupted, still-encrypted, visually blank OUTPUT page.
 *
 * "Any non-white pixel" is deliberate. A genuinely blank page renders as
 * pure white (0 non-white pixels, measured), whereas the old ">5 pixels at
 * 48 px" rule misread short pages as blank. The failure directions are not
 * symmetric either: wrongly trusting a blank page costs nothing the user can
 * see in a fixed-size output, while wrongly distrusting a real page turns it
 * into a non-selectable image — so the check errs toward "has content".
 */
async function hasVisibleContent(
  outputBytes: Uint8Array,
  pdfjsLib: typeof import("pdfjs-dist")
): Promise<boolean> {
  try {
    const task = pdfjsLib.getDocument({ data: outputBytes.slice() });
    const pdf  = await task.promise;
    try {
      const page = await pdf.getPage(1); // output is always a single page

      const vp     = page.getViewport({ scale: 1 });
      const scale  = Math.min(THUMB_SIZE / vp.width, THUMB_SIZE / vp.height);
      const scaled = page.getViewport({ scale });

      const canvas  = document.createElement("canvas");
      canvas.width  = Math.max(1, Math.round(scaled.width));
      canvas.height = Math.max(1, Math.round(scaled.height));
      const ctx     = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return true; // cannot check -> keep the structurally-copied page
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: scaled }).promise;
      page.cleanup();

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < data.length; i += 4) {
        // Anything below near-white in any channel counts as ink.
        if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
      }
      return false;
    } finally {
      await pdf.destroy();
    }
  } catch {
    // If the output PDF can't even be parsed/rendered, treat as blank/broken
    // (fail closed — an unparseable "output" is not a good result either way).
    return false;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function PdfSplit() {
  const [file,      setFile]      = useState<File | null>(null);
  const [state,     setState]     = useState<ProcessState>("idle");
  const [progress,  setProgress]  = useState(0);
  const [status,    setStatus]    = useState("");
  const [results,   setResults]   = useState<PageResult[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [mode,      setMode]      = useState<SplitMode>("all");
  const [rangeStr,  setRangeStr]  = useState("1-3, 5, 7-9");
  const [fallbackCount, setFallbackCount] = useState(0);

  // ── File drop ────────────────────────────────────────────────────
  const onDrop = useCallback((files: File[]) => {
    setFile(files[0]);
    setState("idle");
    setResults([]);
    setPageCount(0);
    setFallbackCount(0);
    previewPageCount(files[0]);
  }, []);

  async function previewPageCount(f: File) {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const bytes = await f.arrayBuffer();
      const doc   = await pdfjsLib.getDocument({ data: bytes }).promise;
      setPageCount(doc.numPages);
      doc.destroy();
    } catch {
      // Non-critical
    }
  }

  // ── PRIMARY ENGINE: pdf-lib structural copy ──────────────────────
  /**
   * Attempts a text-preserving structural copy for each page.
   * Returns:
   *   results:      extracted pages (not yet verified — see validation stage)
   *   needFallback: page numbers (1-based) that need canvas rasterisation
   */
  async function primaryEngine(
    srcBytes: ArrayBuffer,
    pages: number[]
  ): Promise<{ results: PageResult[]; needFallback: number[] }> {
    const { PDFDocument } = await import("pdf-lib");

    let srcDoc: Awaited<ReturnType<typeof PDFDocument.load>>;
    try {
      srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
    } catch (err) {
      // If the entire document cannot be loaded, all pages need fallback
      console.warn("[PdfSplit/primary] Cannot load document:", err);
      return { results: [], needFallback: pages };
    }

    // ── Encryption short-circuit ─────────────────────────────────────────────
    // pdf-lib has no RC4/AES decryption implementation. `ignoreEncryption: true`
    // only suppresses the "this file is encrypted" error — it does NOT decrypt
    // the content-stream bytes. copyPages() on an encrypted source copies the
    // still-ciphertext bytes verbatim into a new (unencrypted) document; any
    // viewer opening that output tries to interpret ciphertext as PDF drawing
    // operators, which produces a blank page essentially 100% of the time
    // (reproduced with AES-256 and RC4-128 test files). We detect it upfront
    // and go straight to the canvas-rasterisation engine, which uses pdf.js
    // (full RC4/AES decryption support).
    if (srcDoc.isEncrypted) {
      console.info("[PdfSplit/primary] Source PDF is encrypted — pdf-lib cannot decrypt content streams; routing all pages to canvas fallback.");
      return { results: [], needFallback: pages };
    }

    const out: PageResult[]  = [];
    const needFallback: number[] = [];

    for (let i = 0; i < pages.length; i++) {
      const pageNum = pages[i];
      setStatus(`PRIMARY ENGINE · PAGE ${pageNum}/${pages[pages.length - 1]}`);
      setProgress(10 + Math.round(((i + 1) / pages.length) * 50));

      try {
        const pageDoc   = await PDFDocument.create();
        const [copied]  = await pageDoc.copyPages(srcDoc, [pageNum - 1]);
        pageDoc.addPage(copied);
        const uint8 = await pageDoc.save();

        // No size verdict here: every successfully copied page is kept, and
        // small ones are verified by rendering in the validation stage.
        const blob = new Blob([uint8.buffer as ArrayBuffer], { type: "application/pdf" });
        out.push({
          name:   `page_${String(pageNum).padStart(3, "0")}.pdf`,
          blob,
          url:    URL.createObjectURL(blob),
          size:   blob.size,
          engine: "pdflib",
        });
      } catch {
        // This page's structure is incompatible with pdf-lib → fallback
        needFallback.push(pageNum);
      }

      await new Promise((r) => setTimeout(r, 8)); // Yield to keep UI responsive
    }

    return { results: out, needFallback };
  }

  // ── FALLBACK ENGINE: pdfjs-dist canvas → jsPDF rasterisation ────
  /**
   * Renders each failing page to a canvas via pdfjs-dist (the same engine
   * Firefox uses — handles government, scanned, encrypted, linearised PDFs).
   * Embeds the canvas as a high-quality JPEG image in a new PDF via jsPDF.
   * The source document is opened once and shared by every page.
   *
   * Output is image-based (not text-selectable) but pixel-perfect.
   */
  async function fallbackEngine(
    srcBytes: ArrayBuffer,
    failedPages: number[]
  ): Promise<PageResult[]> {
    if (failedPages.length === 0) return [];

    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL(pdfjsLib.version);

    const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(srcBytes), disableFontFace: false }).promise;
    const out: PageResult[] = [];

    try {
      for (let i = 0; i < failedPages.length; i++) {
        const pageNum = failedPages[i];
        setStatus(`CANVAS FALLBACK · PAGE ${pageNum} (${i + 1}/${failedPages.length})`);
        setProgress(65 + Math.round(((i + 1) / failedPages.length) * 25));

        try {
          const blob = await rasterisePage(pdfDoc, pageNum - 1);
          out.push({
            name:   `page_${String(pageNum).padStart(3, "0")}.pdf`,
            blob,
            url:    URL.createObjectURL(blob),
            size:   blob.size,
            engine: "canvas",
          });
        } catch (err) {
          console.error(`[PdfSplit/fallback] Page ${pageNum} failed:`, err);
          toast.error(`Page ${pageNum} could not be extracted (${err instanceof Error ? err.message : "render error"})`);
        }

        await new Promise((r) => setTimeout(r, 8));
      }
    } finally {
      await pdfDoc.destroy();
    }

    return out;
  }

  // ── VALIDATION: render-based content check on small outputs ─────
  /**
   * Verifies every small pdf-lib output (<= VERIFY_BELOW_BYTES) by rendering
   * a thumbnail of the ACTUAL OUTPUT via pdf.js. Pages that render blank are
   * rerouted to the canvas engine (this catches ciphertext/undecodable
   * content that survived copyPages()). Larger outputs are trusted: they are
   * very unlikely to be blank and the render is comparatively expensive.
   */
  async function validateAndRerouteBlankPages(
    primaryResults: PageResult[],
    pdfjsLib: typeof import("pdfjs-dist")
  ): Promise<{ valid: PageResult[]; reroutePages: number[] }> {
    const valid: PageResult[] = [];
    const reroutePages: number[] = [];

    for (const result of primaryResults) {
      if (result.size > VERIFY_BELOW_BYTES) {
        valid.push(result);
        continue;
      }

      const pageNum    = parseInt(result.name.replace(/\D/g, ""), 10);
      const outputU8   = new Uint8Array(await result.blob.arrayBuffer());
      const hasContent = await hasVisibleContent(outputU8, pdfjsLib);

      if (hasContent) {
        valid.push(result);
      } else {
        URL.revokeObjectURL(result.url); // Clean up the discarded blob URL
        reroutePages.push(pageNum);
      }
    }

    return { valid, reroutePages };
  }

  // ── MAIN HANDLER: 4-stage orchestration (entirely in the browser) ─
  async function handleSplit() {
    if (!file) { toast.error("Please upload a PDF first."); return; }

    setState("processing");
    setProgress(5);
    setStatus("INITIALISING PDF ENGINE...");
    setFallbackCount(0);
    results.forEach((r) => URL.revokeObjectURL(r.url));

    // Everything runs on the user's device. (There is deliberately no server
    // upload path: Vercel rejects request bodies above ~4.5 MB, so a
    // "large files go to the server" route could never work in production.)
    if (file.size > LARGE_FILE_NOTICE_BYTES) {
      toast.info("Large PDF — splitting runs on your device and may take a while. Keep this tab open.");
    }

    try {
      // ── Stage 0: resolve page count ────────────────────────────────────────
      let totalPages = pageCount;
      if (totalPages === 0) {
        setStatus("READING DOCUMENT STRUCTURE...");
        setProgress(8);
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL(pdfjsLib.version);
        const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        totalPages  = doc.numPages;
        setPageCount(totalPages);
        doc.destroy();
      }

      // ── Select pages ────────────────────────────────────────────────────────
      let selected: number[] = [];
      switch (mode) {
        case "all":
          selected = Array.from({ length: totalPages }, (_, i) => i + 1);
          break;
        case "range":
          selected = parseRanges(rangeStr, totalPages);
          if (selected.length === 0) { toast.error("No valid page numbers in range."); setState("idle"); return; }
          break;
        case "evens":
          selected = Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => n % 2 === 0);
          break;
        case "odds":
          selected = Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => n % 2 !== 0);
          break;
      }
      if (selected.length === 0) { toast.error("No pages match the selected mode."); setState("idle"); return; }

      // ── Stage 1: PRIMARY ENGINE ─────────────────────────────────────────────
      setStatus("STAGE 1/4 · PRIMARY ENGINE (PDF-LIB)...");
      const primary = await primaryEngine(await file.arrayBuffer(), selected);
      let primaryResults = primary.results;
      let needFallback   = primary.needFallback;

      // ── Stage 2: AUTOMATIC VALIDATION ──────────────────────────────────
      setStatus("STAGE 2/4 · VALIDATING PAGES...");
      setProgress(60);

      if (primaryResults.length > 0) {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL(pdfjsLib.version);
        const { valid, reroutePages } = await validateAndRerouteBlankPages(
          primaryResults,
          pdfjsLib
        );
        primaryResults = valid;
        needFallback   = [...needFallback, ...reroutePages].sort((a, b) => a - b);
      }

      // ── Stage 3: FALLBACK ENGINE (pdfjs-dist canvas → jsPDF) ────────────
      let fallbackResults: PageResult[] = [];
      if (needFallback.length > 0) {
        setStatus(`STAGE 3/4 · CANVAS RASTERISATION (${needFallback.length} PAGE${needFallback.length > 1 ? "S" : ""})`);
        setProgress(65);

        // Fresh read: pdf.js takes ownership of (transfers) the buffer it is
        // given, so it can't share the one pdf-lib used.
        fallbackResults = await fallbackEngine(await file.arrayBuffer(), needFallback);
        setFallbackCount(fallbackResults.length);
      }

      // ── Stage 4: FINAL VERIFICATION ─────────────────────────────────────
      setStatus("STAGE 4/4 · FINAL VERIFICATION...");
      setProgress(92);

      // Merge and sort by page number (parse from filename)
      const allResults = [...primaryResults, ...fallbackResults].sort((a, b) => {
        const na = parseInt(a.name.replace(/\D/g, ""), 10);
        const nb = parseInt(b.name.replace(/\D/g, ""), 10);
        return na - nb;
      });

      // Verify count
      const expectedCount = selected.length;
      const gotCount      = allResults.length;

      if (gotCount < expectedCount) {
        const missing = selected.filter(
          (p) => !allResults.some((r) => parseInt(r.name.replace(/\D/g, ""), 10) === p)
        );
        console.warn(`[PdfSplit] ${missing.length} pages could not be extracted:`, missing);
        toast.warning(
          `${gotCount} of ${expectedCount} pages extracted. Pages ${missing.join(", ")} could not be processed.`
        );
      }

      if (allResults.length === 0) {
        throw new Error("No pages could be extracted. The PDF may be corrupt or use an unsupported format.");
      }

      setResults(allResults);
      setProgress(100);
      setState("complete");

    } catch (err: unknown) {
      console.error("[PdfSplit]", err);
      // pdf.js throws a PasswordException when a document needs a password to
      // open (as opposed to merely having edit/print restrictions).
      const needsPassword = err instanceof Error && err.name === "PasswordException";
      toast.error(
        needsPassword
          ? "This PDF needs a password to open. Remove the password first, then try again."
          : err instanceof Error ? err.message : "Split failed. Please try again."
      );
      setState("error");
    }
  }

  // ── Download all ─────────────────────────────────────────────────
  async function downloadAll() {
    if (results.length === 0) return;
    if (results.length === 1) { downloadBlob(results[0].blob, results[0].name); return; }
    try {
      toast("Packaging ZIP…");
      const JSZip  = (await import("jszip")).default;
      const zip    = new JSZip();
      results.forEach((r) => zip.file(r.name, r.blob));
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      downloadBlob(zipBlob, `${file?.name.replace(/\.pdf$/i, "") ?? "split"}_split.zip`);
    } catch {
      results.forEach((r, i) => setTimeout(() => downloadBlob(r.blob, r.name), i * 200));
    }
  }

  function handleReset() {
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setFile(null); setResults([]); setState("idle");
    setProgress(0); setPageCount(0); setFallbackCount(0);
  }

  // ── Split mode options ────────────────────────────────────────────
  const MODES: { id: SplitMode; label: string; desc: string }[] = [
    { id: "all",   label: "All Pages",    desc: "Extract every page separately" },
    { id: "range", label: "Custom Range", desc: "Specify pages and ranges"       },
    { id: "evens", label: "Even Pages",   desc: "Pages 2, 4, 6, 8…"             },
    { id: "odds",  label: "Odd Pages",    desc: "Pages 1, 3, 5, 7…"             },
  ];

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {/* ── IDLE: upload + options ─────────────────────── */}
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <UploadZone
              accept={{ "application/pdf": [".pdf"] }}
              onDrop={onDrop}
              accentColor="cyan"
              label={file ? file.name : "Drop your PDF here or click to browse"}
              sublabel={
                file
                  ? `${formatBytes(file.size)}${pageCount ? ` · ${pageCount} pages` : ""}`
                  : "PDF · up to 50 MB · processed in your browser"
              }
            />

            {file && (
              <div className="space-y-3">
                {/* Mode selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODES.map(({ id, label, desc }) => (
                    <button key={id} onClick={() => setMode(id)}
                      className="text-left rounded-xl px-4 py-3 transition-all"
                      style={{
                        background: mode === id ? "rgba(0,245,255,0.08)" : "rgba(0,245,255,0.02)",
                        border: `1px solid ${mode === id ? "rgba(0,245,255,0.4)" : "rgba(0,245,255,0.1)"}`,
                      }}>
                      <p className="text-sm font-mono font-bold" style={{ color: mode === id ? "#00f5ff" : "#e2e8f0" }}>{label}</p>
                      <p className="text-[11px] font-mono text-text-muted">{desc}</p>
                    </button>
                  ))}
                </div>

                {mode === "range" && (
                  <div>
                    <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">
                      Page ranges
                    </label>
                    <input
                      value={rangeStr}
                      onChange={(e) => setRangeStr(e.target.value)}
                      placeholder="e.g. 1-3, 5, 7-9, 12"
                      className="input-cyber w-full font-mono text-sm"
                    />
                    <p className="text-[11px] font-mono text-text-muted mt-1.5">
                      Use commas and hyphens. Example: <span className="text-neon-cyan">1-5, 8, 11-15</span>
                    </p>
                  </div>
                )}

                <button onClick={handleSplit}
                  className="btn-solid-cyan w-full sm:w-auto px-8 py-3 font-display font-bold tracking-widest text-sm flex items-center justify-center gap-2">
                  <Scissors className="w-4 h-4" />SPLIT PDF
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── PROCESSING: CyberScanner ───────────────────── */}
        {state === "processing" && (
          <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CyberScanner progress={progress} statusText={status} isActive />
          </motion.div>
        )}

        {/* ── ERROR ──────────────────────────────────────── */}
        {state === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl px-5 py-4 text-center"
            style={{ background: "rgba(255,0,60,0.06)", border: "1px solid rgba(255,0,60,0.25)" }}>
            <p className="text-sm font-mono font-bold text-neon-red mb-1">Split failed</p>
            <p className="text-xs font-mono text-text-muted mb-3">
              Try a different split mode, or check if the PDF is password-protected.
            </p>
            <button onClick={handleReset} className="text-xs font-mono text-neon-cyan hover:underline">
              ← Try again
            </button>
          </motion.div>
        )}

        {/* ── COMPLETE: results ──────────────────────────── */}
        {state === "complete" && results.length > 0 && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultReveal onReset={handleReset} successMessage={`${results.length} PAGE${results.length > 1 ? "S" : ""} EXTRACTED`}>
              <div className="space-y-4">

                {/* Fallback info banner */}
                {fallbackCount > 0 && (
                  <div className="rounded-lg px-4 py-2.5 flex items-start gap-2.5"
                    style={{ background: "rgba(255,204,0,0.06)", border: "1px solid rgba(255,204,0,0.2)" }}>
                    <Info className="w-3.5 h-3.5 text-neon-yellow mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] font-mono text-text-muted leading-relaxed">
                      <span className="text-neon-yellow font-semibold">{fallbackCount} page{fallbackCount > 1 ? "s" : ""}</span> used canvas rasterisation
                      (image-based) because the PDF uses features incompatible with direct extraction. All content is preserved.
                    </p>
                  </div>
                )}

                {/* Summary row + download-all button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl px-5 py-4"
                  style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.12)" }}>
                  <div>
                    <p className="text-xl font-display font-black text-neon-cyan">{results.length}</p>
                    <p className="text-xs font-mono text-text-muted">
                      {results.length === 1 ? "Page extracted" : "Pages extracted"}
                    </p>
                  </div>
                  <DownloadButton
                    onClick={downloadAll}
                    label={results.length === 1 ? "Download Page" : "Download All as ZIP"}
                    color="cyan"
                    className="w-full sm:w-auto"
                  />
                </div>

                {/* Per-page list */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {results.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
                      style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.08)" }}>
                      <span className="text-xs font-mono text-neon-cyan/50 w-6 flex-shrink-0">{i + 1}</span>
                      <span className="flex-1 min-w-0 truncate text-xs font-mono text-text-primary">{r.name}</span>
                      {r.engine === "canvas" && (
                        <span title="Canvas rasterised" className="flex-shrink-0">
                          <AlertTriangle className="w-3 h-3 text-neon-yellow/60" />
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-text-muted flex-shrink-0">{formatBytes(r.size)}</span>
                      <button onClick={() => downloadBlob(r.blob, r.name)}
                        className="w-7 h-7 flex items-center justify-center rounded border border-neon-cyan/15 text-text-muted hover:text-neon-cyan hover:border-neon-cyan/35 transition-all flex-shrink-0">
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                {fallbackCount > 0 && (
                  <p className="text-[10px] font-mono text-text-muted flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-neon-yellow/60" />
                    = Canvas rasterised (image-based, fully readable)
                  </p>
                )}
              </div>
            </ResultReveal>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}