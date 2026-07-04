"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Download, Info, AlertTriangle } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal, DownloadButton } from "@/components/tools/ResultReveal";
import { formatBytes, downloadBlob } from "@/lib/utils";
import { toast } from "sonner";

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
 * Minimum byte size to consider a pdf-lib output page non-blank.
 * An empty 1-page PDF shell (no content) from pdf-lib is ~700-1100 bytes.
 * Any page with real text, images, or vector content will be several KB+.
 */
const BLANK_THRESHOLD_BYTES = 1_800;

/** Thumbnail canvas size for pixel-level blank detection (small = fast) */
const THUMB_SIZE = 48;

/** Canvas rasterisation DPI multiplier (2× = crisp on Retina, fast enough) */
const RASTER_SCALE = 2.5;

/** Browser split limit: files larger than this go via the API route */
const BROWSER_LIMIT_BYTES = 20 * 1024 * 1024; // 20 MB

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

function base64ToBlob(b64: string, mime = "application/pdf"): Blob {
  const bin  = atob(b64);
  const u8   = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

/**
 * Render a single PDF page from raw bytes to a Blob via pdfjs-dist canvas.
 * Used as the fallback engine for every page that fails the primary engine.
 */
async function rasterisePage(
  srcBytes: Uint8Array,
  pageIndex: number,         // 0-based
  pdfjsLib: typeof import("pdfjs-dist")
): Promise<Blob> {
  const loadingTask = pdfjsLib.getDocument({ data: srcBytes.slice(), disableFontFace: false });
  const pdfDoc = await loadingTask.promise;

  try {
    const page      = await pdfDoc.getPage(pageIndex + 1); // pdfjs is 1-based
    const viewport  = page.getViewport({ scale: RASTER_SCALE });

    const canvas        = document.createElement("canvas");
    canvas.width        = Math.round(viewport.width);
    canvas.height       = Math.round(viewport.height);
    const ctx           = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    // White background (PDFs render transparent without it)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    page.cleanup();

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
    return new Blob([pdfBytes], { type: "application/pdf" });
  } finally {
    pdfDoc.destroy();
  }
}

/**
 * Quick blank-page detection: render at tiny resolution and check pixel variance.
 * A blank/white page will have all pixels near 255. Returns true if the page
 * appears to have visible content.
 */
async function hasVisibleContent(
  srcBytes: Uint8Array,
  pageIndex: number,
  pdfjsLib: typeof import("pdfjs-dist")
): Promise<boolean> {
  try {
    const task = pdfjsLib.getDocument({ data: srcBytes.slice() });
    const pdf  = await task.promise;
    const page = await pdf.getPage(pageIndex + 1);

    const vp     = page.getViewport({ scale: 1 });
    const scale  = Math.min(THUMB_SIZE / vp.width, THUMB_SIZE / vp.height);
    const scaled = page.getViewport({ scale });

    const canvas  = document.createElement("canvas");
    canvas.width  = Math.round(scaled.width);
    canvas.height = Math.round(scaled.height);
    const ctx     = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: scaled }).promise;
    page.cleanup();
    pdf.destroy();

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    // Count pixels that are meaningfully non-white (< 240 in any channel)
    let nonWhite = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) {
        nonWhite++;
        if (nonWhite > 5) return true; // Early exit — definitely has content
      }
    }
    return nonWhite > 5;
  } catch {
    // If we can't render the thumbnail, assume it has content (fail safe)
    return true;
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
   *   results:     successfully extracted pages
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

        if (uint8.length < BLANK_THRESHOLD_BYTES) {
          // Too small → likely blank; queue for fallback
          needFallback.push(pageNum);
        } else {
          const blob = new Blob([uint8.buffer as ArrayBuffer], { type: "application/pdf" });
          out.push({
            name:   `page_${String(pageNum).padStart(3, "0")}.pdf`,
            blob,
            url:    URL.createObjectURL(blob),
            size:   blob.size,
            engine: "pdflib",
          });
        }
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
   *
   * Output is image-based (not text-selectable) but pixel-perfect.
   */
  async function fallbackEngine(
    srcBytes: ArrayBuffer,
    failedPages: number[]
  ): Promise<PageResult[]> {
    if (failedPages.length === 0) return [];

    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const srcUint8 = new Uint8Array(srcBytes);
    const out: PageResult[] = [];

    for (let i = 0; i < failedPages.length; i++) {
      const pageNum = failedPages[i];
      setStatus(`CANVAS FALLBACK · PAGE ${pageNum} (${i + 1}/${failedPages.length})`);
      setProgress(65 + Math.round(((i + 1) / failedPages.length) * 25));

      try {
        const blob = await rasterisePage(srcUint8, pageNum - 1, pdfjsLib);
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

    return out;
  }

  // ── VALIDATION: pixel-level blank check on suspicious pages ─────
  /**
   * Re-validates pdf-lib results that are small-but-above-threshold.
   * For very complex PDFs, some pages pass the size check but still render
   * blank because the content stream uses operators pdf-lib can't copy.
   * We render a tiny thumbnail via pdfjs to catch these.
   */
  async function validateAndRerouteBlankPages(
    primaryResults: PageResult[],
    srcBytes: ArrayBuffer,
    pdfjsLib: typeof import("pdfjs-dist")
  ): Promise<{ valid: PageResult[]; reroutePages: number[] }> {
    // Only validate pages that are small (2-8 KB) — larger pages are very
    // unlikely to be blank and the thumbnail render is CPU-intensive.
    const RECHECK_UPPER = 8_000;
    const valid: PageResult[] = [];
    const reroutePages: number[] = [];
    const srcUint8 = new Uint8Array(srcBytes);

    for (const result of primaryResults) {
      if (result.size > RECHECK_UPPER) {
        valid.push(result);
        continue;
      }

      // Small page — run pixel check
      const pageNum = parseInt(result.name.replace(/\D/g, ""), 10);
      const hasContent = await hasVisibleContent(srcUint8, pageNum - 1, pdfjsLib);

      if (hasContent) {
        valid.push(result);
      } else {
        URL.revokeObjectURL(result.url); // Clean up the discarded blob URL
        reroutePages.push(pageNum);
      }
    }

    return { valid, reroutePages };
  }

  // ── SERVER-SIDE PATH for large files (>20 MB) ───────────────────
  async function serverEngine(f: File, pages: number[]): Promise<{ results: PageResult[]; needFallback: number[] }> {
    setStatus("SENDING TO SERVER PROCESSOR...");
    setProgress(20);

    const form = new FormData();
    form.append("pdf", f);
    if (pages.length > 0 && pages.length !== pageCount) {
      form.append("pages", pages.join(","));
    }

    const res = await fetch("/api/pdf/split", { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Server error" }));
      throw new Error(err.error ?? "Server-side split failed");
    }

    setProgress(70);
    setStatus("VALIDATING SERVER RESULTS...");

    const data = await res.json() as {
      pages: Array<{ name: string; data: string; valid: boolean; sizeBytes: number; pageNum: number; engine: string; error?: string }>;
      failed: number;
    };

    // v2 response shape: { pages: [...], failed: N }
    const pageList = data.pages ?? (Array.isArray(data) ? data : []);

    const out: PageResult[]      = [];
    const needFallback: number[] = [];

    for (const item of pageList) {
      if (!item.valid || !item.data) {
        needFallback.push(item.pageNum);
        continue;
      }
      const blob = base64ToBlob(item.data);
      out.push({ name: item.name, blob, url: URL.createObjectURL(blob), size: blob.size, engine: "pdflib" });
    }

    return { results: out, needFallback };
  }

  // ── MAIN HANDLER: 4-stage orchestration ─────────────────────────
  async function handleSplit() {
    if (!file) { toast.error("Please upload a PDF first."); return; }

    setState("processing");
    setProgress(5);
    setStatus("INITIALISING PDF ENGINE...");
    setFallbackCount(0);
    results.forEach((r) => URL.revokeObjectURL(r.url));

    try {
      // ── Stage 0: resolve page count ────────────────────────────────────────
      let totalPages = pageCount;
      if (totalPages === 0) {
        setStatus("READING DOCUMENT STRUCTURE...");
        setProgress(8);
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
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
      let primaryResults: PageResult[];
      let needFallback: number[];

      if (file.size <= BROWSER_LIMIT_BYTES) {
        const srcBytes = await file.arrayBuffer();
        const primary  = await primaryEngine(srcBytes, selected);
        primaryResults  = primary.results;
        needFallback    = primary.needFallback;

        // ── Stage 2: AUTOMATIC VALIDATION ──────────────────────────────────
        setStatus("STAGE 2/4 · VALIDATING PAGES...");
        setProgress(60);

        if (primaryResults.length > 0) {
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
          const { valid, reroutePages } = await validateAndRerouteBlankPages(
            primaryResults,
            srcBytes,
            pdfjsLib
          );
          primaryResults = valid;
          needFallback   = [...needFallback, ...reroutePages].sort((a, b) => a - b);
        }
      } else {
        // Large files: server handles Stage 1 + Stage 2 validation
        const server   = await serverEngine(file, selected);
        primaryResults  = server.results;
        needFallback    = server.needFallback;
      }

      // ── Stage 3: FALLBACK ENGINE (pdfjs-dist canvas → jsPDF) ────────────
      let fallbackResults: PageResult[] = [];
      if (needFallback.length > 0) {
        setStatus(`STAGE 3/4 · CANVAS RASTERISATION (${needFallback.length} PAGE${needFallback.length > 1 ? "S" : ""})`);
        setProgress(65);

        // Re-read the original file for rasterisation. This works correctly
        // regardless of whether Stage 1 ran in-browser or on the server,
        // since File.arrayBuffer() can be safely called multiple times.
        const srcUint8 = new Uint8Array(await file.arrayBuffer());

        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const ab = srcUint8.buffer as ArrayBuffer;
        fallbackResults = await fallbackEngine(ab, needFallback);
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
      const msg = err instanceof Error ? err.message : "Split failed. Please try again.";
      console.error("[PdfSplit]", err);
      toast.error(msg);
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
                  : "PDF · up to 50 MB · all formats supported"
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