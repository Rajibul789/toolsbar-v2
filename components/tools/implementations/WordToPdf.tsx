"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileOutput } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal, DownloadButton } from "@/components/tools/ResultReveal";
import { formatBytes, downloadBlob } from "@/lib/utils";
import { toast } from "sonner";
import { planPages, groupIntoWindows, type BreakCandidate, type InkRect } from "@/lib/word-pdf-pagination";
import { sanitizeDocxHtml } from "@/lib/sanitize-docx-html";

type ProcessState = "idle" | "processing" | "complete" | "error";

// ── Layout constants ─────────────────────────────────────────────────────────
/** A4 content box in mm (10 mm side margins, 15 mm top/bottom). */
const PAGE_W_MM = 190;
const PAGE_H_MM = 267;
const MARGIN_X_MM = 10;
const MARGIN_Y_MM = 15;

/** Render scale for html2canvas (crispness vs. memory). */
const RENDER_SCALE = 1.8;

/**
 * Canvas safety limits. Browsers refuse (or silently blank) canvases above a
 * platform-specific size: iOS Safari caps the *area* at 16,777,216 px, and
 * Chrome/Firefox cap a single dimension around 16-32 k px. A whole long
 * document rendered as ONE canvas (the previous approach) therefore failed
 * on phones after roughly six pages. We render in windows of a few pages
 * instead, so no canvas ever approaches these limits.
 */
const CANVAS_AREA_LIMIT = 16_000_000;
const CANVAS_MAX_DIMENSION = 16_000;

/** An error whose message is safe and useful to show the user verbatim. */
class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

type DocKind = "docx" | "legacy-doc" | "unknown";

/** Identify the file by its first bytes (the extension can lie). */
function sniffDocKind(bytes: ArrayBuffer): DocKind {
  const b = new Uint8Array(bytes.slice(0, 8));
  if (b[0] === 0x50 && b[1] === 0x4b) return "docx";                       // "PK" — ZIP container (OOXML)
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "legacy-doc"; // OLE2 — binary .doc
  return "unknown";
}

/**
 * Measure the rendered document: where blocks end (preferred page breaks)
 * and where lines of text / images sit (places a page must never be cut).
 * Coordinates are CSS px relative to the container's top edge.
 */
function measureLayout(container: HTMLElement): {
  candidates: BreakCandidate[];
  inkRects: InkRect[];
  contentBottom: number;
} {
  const origin = container.getBoundingClientRect().top;
  const candidates: BreakCandidate[] = [];
  const inkRects: InkRect[] = [];
  let contentBottom = 0;

  const tier1 = new Set<Element>(Array.from(container.children).filter((el) => el.tagName !== "STYLE"));
  container.querySelectorAll("li, tr").forEach((el) => tier1.add(el));

  const addBlock = (el: Element, tier: 1 | 2) => {
    const r = el.getBoundingClientRect();
    if (r.height < 1) return;
    const bottom = r.bottom - origin;
    candidates.push({ y: bottom, tier, keepWithNext: /^H[1-6]$/.test(el.tagName) });
    contentBottom = Math.max(contentBottom, bottom);
  };

  tier1.forEach((el) => addBlock(el, 1));
  container
    .querySelectorAll("p, h1, h2, h3, h4, h5, h6, blockquote, pre, table, ul, ol")
    .forEach((el) => { if (!tier1.has(el)) addBlock(el, 2); });

  // Images are unbreakable ink.
  container.querySelectorAll("img").forEach((img) => {
    const r = img.getBoundingClientRect();
    if (r.height < 1) return;
    inkRects.push({ top: r.top - origin, bottom: r.bottom - origin });
    contentBottom = Math.max(contentBottom, r.bottom - origin);
  });

  // One rect per line fragment of every text node.
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue || !n.nodeValue.trim()) continue;
    range.selectNodeContents(n);
    for (const r of Array.from(range.getClientRects())) {
      if (r.width < 0.5 || r.height < 0.5) continue;
      inkRects.push({ top: r.top - origin, bottom: r.bottom - origin });
      contentBottom = Math.max(contentBottom, r.bottom - origin);
    }
  }
  range.detach?.();

  return { candidates, inkRects, contentBottom };
}

export function WordToPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const onDrop = useCallback((files: File[]) => {
    setFile(files[0]);
    setState("idle");
    setResult(null);
    setPreviewHtml("");
  }, []);

  async function handleConvert() {
    if (!file) { toast.error("Please upload a DOCX file first."); return; }
    setState("processing");
    setProgress(10);

    const msgs = [
      "PARSING DOCX STRUCTURE...",
      "EXTRACTING TEXT CONTENT...",
      "CONVERTING FORMATTING...",
      "RENDERING DOCUMENT...",
      "GENERATING PDF...",
    ];
    let mi = 0;
    setStatus(msgs[0]);
    const iv = setInterval(() => { mi = (mi + 1) % msgs.length; setStatus(msgs[mi]); }, 900);

    let container: HTMLDivElement | null = null;

    try {
      // Step 0: make sure this really is a .docx (mammoth cannot read the
      // legacy binary .doc format, and the extension alone can't be trusted).
      const bytes = await file.arrayBuffer();
      const kind = sniffDocKind(bytes);
      if (kind === "legacy-doc") {
        throw new UserFacingError(
          "This is an old binary .doc file, which can't be read in the browser. Open it in Word, LibreOffice or Google Docs, save it as .docx, and upload that."
        );
      }
      if (kind === "unknown") {
        throw new UserFacingError("This file isn't a valid .docx document (it may be corrupted or renamed from another format).");
      }

      // Step 1: DOCX → HTML via mammoth, then sanitise (mammoth output is untrusted)
      setProgress(20);
      const mammoth = await import("mammoth");
      let rawHtml: string;
      try {
        ({ value: rawHtml } = await mammoth.convertToHtml({ arrayBuffer: bytes }));
      } catch (err) {
        console.error("[WordToPdf] mammoth failed:", err);
        throw new UserFacingError("This .docx couldn't be read. It may be corrupted or password-protected.");
      }
      const html = sanitizeDocxHtml(rawHtml);
      setPreviewHtml(html);
      setProgress(50);

      await new Promise((r) => setTimeout(r, 400));

      // Step 2: HTML → PDF via html2canvas + jsPDF
      setProgress(55);
      setStatus("RENDERING HTML TO CANVAS...");

      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      // Build styled container
      container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "794px";
      container.style.padding = "40px";
      container.style.background = "#fff";
      container.style.fontFamily = "Georgia, 'Times New Roman', serif";
      container.style.fontSize = "12pt";
      container.style.lineHeight = "1.6";
      container.style.color = "#111";
      container.innerHTML = `
        <style>
          h1,h2,h3,h4{color:#111;margin-top:1.5em;margin-bottom:0.5em}
          p{margin-bottom:0.75em}
          strong{font-weight:bold}
          em{font-style:italic}
          ul,ol{padding-left:1.5em;margin-bottom:0.75em}
          li{margin-bottom:0.25em}
          img{max-width:100%;height:auto}
          table{border-collapse:collapse;width:100%;margin-bottom:1em}
          td,th{border:1px solid #999;padding:6px 10px}
          th{background:#eee;font-weight:bold}
        </style>
        ${html}
      `;
      document.body.appendChild(container);

      setProgress(65);
      await new Promise((r) => setTimeout(r, 200));
      // Fonts must be settled before measuring, or line positions shift.
      await document.fonts?.ready;

      // Step 3: plan page breaks that never cut through a line / row / image
      const widthPx    = container.offsetWidth;
      const pageHeight = Math.floor(widthPx * (PAGE_H_MM / PAGE_W_MM));
      const mmPerPx    = PAGE_W_MM / widthPx;
      const { candidates, inkRects, contentBottom } = measureLayout(container);
      // Only paginate down to the last piece of content (+ a little air), so
      // the container's bottom padding can't spill onto an empty last page.
      const totalHeight = Math.max(
        1,
        Math.min(container.scrollHeight, Math.ceil(contentBottom) + 20)
      );
      const slices = planPages({ totalHeight, pageHeight, candidates, inkRects });

      // Step 4: render in windows (canvas-size safe), then cut pages from them
      const maxWindowHeight = Math.max(
        pageHeight,
        Math.floor(
          Math.min(CANVAS_MAX_DIMENSION, CANVAS_AREA_LIMIT / (widthPx * RENDER_SCALE)) / RENDER_SCALE
        )
      );
      const windows = groupIntoWindows(slices, maxWindowHeight);

      setProgress(70);
      setStatus("ASSEMBLING PDF PAGES...");

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      let pageNo = 0;

      for (const win of windows) {
        const winStart = win[0].start;
        const winEnd   = win[win.length - 1].end;

        const canvas = await html2canvas(container, {
          scale: RENDER_SCALE,
          backgroundColor: "#fff",
          useCORS: true,
          // Crop (relative to the container's top-left) to just this window.
          y: winStart,
          height: Math.ceil(winEnd - winStart),
        });
        if (canvas.width === 0 || canvas.height === 0) {
          throw new Error("Rendering produced an empty canvas.");
        }

        for (const slice of win) {
          const sy = Math.round((slice.start - winStart) * RENDER_SCALE);
          const sh = Math.min(Math.round((slice.end - slice.start) * RENDER_SCALE), canvas.height - sy);
          if (sh <= 0) continue;

          const pageCanvas = document.createElement("canvas");
          pageCanvas.width  = canvas.width;
          pageCanvas.height = sh;
          const pctx = pageCanvas.getContext("2d");
          if (!pctx) throw new Error("Canvas context unavailable");
          pctx.fillStyle = "#fff";
          pctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          pctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);

          if (pageNo > 0) pdf.addPage();
          pdf.addImage(
            pageCanvas.toDataURL("image/jpeg", 0.92),
            "JPEG",
            MARGIN_X_MM,
            MARGIN_Y_MM,
            PAGE_W_MM,
            (slice.end - slice.start) * mmPerPx
          );
          pageNo++;
          pageCanvas.width = pageCanvas.height = 0; // free the backing store
        }

        canvas.width = canvas.height = 0;
        setProgress(70 + Math.round((pageNo / slices.length) * 25));
        await new Promise((r) => setTimeout(r, 0)); // keep the UI responsive
      }

      const blob = pdf.output("blob");
      setResult(blob);
      setProgress(100);
      setState("complete");
    } catch (err) {
      console.error(err);
      setState("error");
      toast.error(
        err instanceof UserFacingError
          ? err.message
          : "Conversion failed. Please check the file and try again."
      );
    } finally {
      clearInterval(iv);
      // Always remove the off-screen render container — previously an error
      // thrown during rendering left a 874 px-wide copy of the document in
      // the page for the rest of the session.
      if (container?.parentNode) container.parentNode.removeChild(container);
    }
  }

  function handleReset() {
    setFile(null);
    setState("idle");
    setResult(null);
    setProgress(0);
    setPreviewHtml("");
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <UploadZone
              onDrop={onDrop}
              accept={{
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
              }}
              accentColor="blue"
              currentFiles={file ? [file] : []}
              onRemoveFile={() => { setFile(null); setPreviewHtml(""); }}
              maxSizeMb={20}
              label={<>Upload <span className="text-neon-blue">DOCX</span> file</>}
              sublabel=".docx · Max 20MB"
            />

            {/* Limitation note */}
            <div
              className="rounded-lg px-4 py-3 text-xs font-mono text-text-muted"
              style={{ background: "rgba(0,102,255,0.05)", border: "1px solid rgba(0,102,255,0.15)" }}
            >
              <span className="text-neon-blue">ℹ</span>{" "}
              Basic formatting (headings, bold, italic, lists, tables) is preserved.
              Complex layouts may not convert perfectly. Pages are exported as images, so the
              text in the PDF is not selectable. Old .doc files must be saved as .docx first.
            </div>

            {file && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleConvert}
                className="w-full py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm rounded-lg border transition-all duration-300"
                style={{
                  background: "rgba(0,102,255,0.12)",
                  borderColor: "rgba(0,102,255,0.5)",
                  color: "#0066ff",
                  textShadow: "0 0 10px rgba(0,102,255,0.6)",
                  boxShadow: "0 0 20px rgba(0,102,255,0.1)",
                }}
              >
                <FileOutput className="w-4 h-4" />
                CONVERT TO PDF
              </motion.button>
            )}
          </motion.div>
        )}

        {state === "processing" && (
          <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CyberScanner statusText={status} progress={progress} />
          </motion.div>
        )}

        {state === "complete" && result && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultReveal onReset={handleReset} successMessage="CONVERSION COMPLETE">
              <div className="space-y-4">
                {/* HTML preview */}
                {previewHtml && (
                  <div
                    className="rounded-xl p-5 max-h-64 overflow-auto"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(0,102,255,0.15)" }}
                  >
                    <p className="text-[10px] font-mono text-text-muted mb-3 uppercase tracking-widest">Document Preview</p>
                    <div
                      className="text-sm text-text-secondary leading-relaxed [&_table]:max-w-full [&_img]:max-w-full [&_img]:h-auto"
                      dangerouslySetInnerHTML={{ __html: previewHtml }}
                      style={{ fontFamily: "Georgia, serif" }}
                    />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl px-5 py-4" style={{ background: "rgba(0,102,255,0.05)", border: "1px solid rgba(0,102,255,0.15)" }}>
                  <div>
                    <p className="font-display text-lg font-black" style={{ color: "#0066ff" }}>{formatBytes(result.size)}</p>
                    <p className="text-xs font-mono text-text-muted">PDF file ready</p>
                  </div>
                  <DownloadButton
                    onClick={() => downloadBlob(result, (file?.name ?? "document").replace(/\.docx?$/, "") + ".pdf")}
                    label="Download PDF"
                    color="cyan"
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            </ResultReveal>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl p-6 text-center" style={{ background: "rgba(255,0,60,0.05)", border: "1px solid rgba(255,0,60,0.2)" }}>
              <p className="text-sm font-mono text-neon-red mb-4">CONVERSION FAILED</p>
              <button onClick={handleReset} className="btn-neon text-sm">Try Again</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}