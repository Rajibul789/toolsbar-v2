"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileOutput, Copy, Download } from "lucide-react";
import type { PDFPageProxy } from "pdfjs-dist";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal } from "@/components/tools/ResultReveal";
import { downloadBlob } from "@/lib/utils";
import { createOcrWorker, detectLanguage, isTextLayerUsable } from "@/lib/ocr";
import { toast } from "sonner";

type ProcessState = "idle" | "processing" | "complete" | "error";

/** Renders a PDF.js page to a canvas — used as OCR input when a page's
 *  embedded text layer is missing or unusable. Mirrors the same
 *  getViewport/render pattern already used by PDF Compress and PDF Split. */
async function renderPageToCanvas(page: PDFPageProxy, scale = 2.0): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is not available in this browser.");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

export function PdfToText() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [usedOcr, setUsedOcr] = useState(false);
  const [detectedScript, setDetectedScript] = useState<string | null>(null);

  const onDrop = useCallback((files: File[]) => {
    setFile(files[0]);
    setState("idle");
    setExtractedText("");
  }, []);

  async function handleExtract() {
    if (!file) { toast.error("Please upload a PDF first."); return; }
    setState("processing");
    setProgress(5);
    setStatus("LOADING PDF ENGINE...");

    // Created lazily, only if some page actually turns out to need OCR, and
    // reused across every page that needs it in this document (spinning up
    // a fresh worker per page would reload the language model every time).
    let ocrWorker: Awaited<ReturnType<typeof createOcrWorker>> | null = null;
    let resolvedLang = "";
    let currentOcrPage = 0; // read by the progress logger below, kept in sync each iteration

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      setProgress(10);
      setStatus("PARSING DOCUMENT STRUCTURE...");

      const bytes = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      const total = doc.numPages;
      setPageCount(total);

      const pages: { text: string; usedOcr: boolean; failed: boolean }[] = [];

      for (let i = 1; i <= total; i++) {
        const pageBaseProgress = 10 + Math.round(((i - 1) / total) * 80);
        setProgress(pageBaseProgress);
        try {
          setStatus(`READING PAGE ${i} OF ${total}...`);
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          const rawText = content.items
            .map((item: unknown) => {
              const it = item as { str: string; hasEOL?: boolean };
              return it.hasEOL ? it.str + "\n" : it.str + " ";
            })
            .join("")
            .trim();

          if (isTextLayerUsable(rawText)) {
            // Fast path, unchanged for the common case: a normal PDF with a
            // real, trustworthy text layer never touches OCR at all.
            pages.push({ text: rawText, usedOcr: false, failed: false });
          } else {
            // Text layer is missing (scanned/image-only page), too short to
            // trust, or looks corrupted (broken font encoding) -> OCR the
            // rendered page instead of the unreliable embedded text.
            currentOcrPage = i;
            const canvas = await renderPageToCanvas(page);

            if (!ocrWorker) {
              // Detected once per document (on whichever page first needs
              // OCR) and reused for every subsequent page that needs it -
              // re-running detection per page would be wasteful, and a
              // document's dominant language rarely changes page to page.
              setStatus(`DETECTING LANGUAGE (PAGE ${i} OF ${total})...`);
              const detected = await detectLanguage(canvas);
              resolvedLang = detected.lang;
              setDetectedScript(detected.script);
              ocrWorker = await createOcrWorker(resolvedLang, (update) => {
                const pct = Math.round(update.progress * 100);
                setStatus(`OCR PAGE ${currentOcrPage} OF ${total}: ${update.status.toUpperCase().replace(/_/g, " ")} ${pct}%`);
                setProgress(10 + Math.round(((currentOcrPage - 1 + update.progress) / total) * 80));
              });
            } else {
              setStatus(`RUNNING OCR ON PAGE ${i} OF ${total} (this can take longer)...`);
            }

            const { data } = await ocrWorker.recognize(canvas);
            const ocrText = data.text.trim();
            pages.push({ text: ocrText, usedOcr: ocrText.length > 0, failed: false });
          }
        } catch (pageErr) {
          // A single bad page (corrupt content stream, unsupported
          // feature, OCR failure, etc.) no longer aborts the whole
          // document - the rest of the pages still get returned.
          console.error(`Page ${i} failed:`, pageErr);
          pages.push({ text: "", usedOcr: false, failed: true });
        }
        await new Promise((r) => setTimeout(r, 10));
      }

      setProgress(95);
      setStatus("FINALIZING...");

      const pagesWithContent = pages.filter((p) => p.text.length > 0).length;
      const anyOcrUsed = pages.some((p) => p.usedOcr);

      // Page markers are only meaningful once we know whether a page truly
      // has content - unlike before, an empty page no longer masquerades
      // as extracted text just because a header was appended for it.
      const fullText = pages
        .map((p, idx) => {
          const label = `Page ${idx + 1}${p.usedOcr ? " (via OCR)" : ""}`;
          if (p.text.length === 0) {
            return `\n\n--- ${label} ---\n\n[No text could be extracted from this page${p.failed ? " (processing error)" : ""}.]`;
          }
          return `\n\n--- ${label} ---\n\n${p.text}`;
        })
        .join("")
        .trim();

      setExtractedText(pagesWithContent > 0 ? fullText : "");
      setUsedOcr(anyOcrUsed);
      setProgress(100);
      setState("complete");
    } catch (err) {
      console.error(err);
      setState("error");
      toast.error("Text extraction failed. The PDF may be corrupted, password-protected, or in an unsupported format.");
    } finally {
      if (ocrWorker) await ocrWorker.terminate();
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(extractedText).then(() => {
      toast.success("Copied to clipboard!");
    });
  }

  function downloadText() {
    const blob = new Blob([extractedText], { type: "text/plain" });
    downloadBlob(blob, (file?.name ?? "document").replace(".pdf", "") + "_text.txt");
  }

  function handleReset() {
    setFile(null);
    setExtractedText("");
    setState("idle");
    setProgress(0);
    setUsedOcr(false);
    setDetectedScript(null);
  }

  const wordCount = extractedText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <UploadZone
              onDrop={onDrop}
              accept={{ "application/pdf": [".pdf"] }}
              accentColor="green"
              currentFiles={file ? [file] : []}
              onRemoveFile={() => setFile(null)}
              maxSizeMb={30}
            />

            <div
              className="rounded-lg px-4 py-3 text-xs font-mono text-text-muted"
              style={{ background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.12)" }}
            >
              <span className="text-neon-green">ℹ</span>{" "}
              Reads text directly from the PDF. Scanned or image-only pages are automatically read with OCR as a fallback, with the language auto-detected per document — this makes those pages slower to process.
            </div>

            {file && (
              <motion.button
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                onClick={handleExtract}
                className="w-full btn-neon-green py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm"
              >
                <FileOutput className="w-4 h-4" />
                EXTRACT TEXT
              </motion.button>
            )}
          </motion.div>
        )}

        {state === "processing" && (
          <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CyberScanner statusText={status} progress={progress} />
          </motion.div>
        )}

        {state === "complete" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultReveal
              onReset={handleReset}
              successMessage={extractedText ? "EXTRACTION COMPLETE" : "NO TEXT FOUND"}
            >
              {extractedText ? (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: "Pages",     value: pageCount },
                      { label: "Words",     value: wordCount.toLocaleString() },
                      { label: "Characters",value: extractedText.length.toLocaleString() },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg p-2 sm:p-3 text-center overflow-hidden" style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.12)" }}>
                        <p className="text-sm sm:text-lg font-display font-black text-neon-green truncate">{value}</p>
                        <p className="text-[10px] sm:text-[11px] font-mono text-text-muted truncate">{label}</p>
                      </div>
                    ))}
                  </div>

                  {usedOcr && (
                    <div
                      className="rounded-lg px-4 py-2.5 text-xs font-mono text-text-muted"
                      style={{ background: "rgba(255,204,0,0.05)", border: "1px solid rgba(255,204,0,0.15)" }}
                    >
                      <span className="text-neon-yellow">ℹ</span>{" "}
                      One or more pages had no usable text layer, so OCR was used for those (marked "via OCR" below){detectedScript ? ` — detected script: ${detectedScript}` : ""}. OCR is best-effort and may contain errors, especially for handwriting or low-quality scans.
                    </div>
                  )}

                  {/* Text preview */}
                  <div className="relative">
                    <textarea
                      value={extractedText}
                      readOnly
                      rows={12}
                      className="w-full rounded-xl p-4 text-xs font-mono text-text-secondary resize-none outline-none"
                      style={{
                        background: "rgba(0,0,0,0.4)",
                        border: "1px solid rgba(0,255,136,0.12)",
                        lineHeight: 1.7,
                      }}
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={copyToClipboard}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border border-neon-cyan/20 text-sm font-mono text-text-muted hover:text-neon-cyan hover:border-neon-cyan/40 transition-all"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Text
                    </button>
                    <button
                      onClick={downloadText}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-mono transition-all"
                      style={{ borderColor: "rgba(0,255,136,0.3)", color: "#00ff88", background: "rgba(0,255,136,0.06)" }}
                    >
                      <Download className="w-4 h-4" />
                      Download .txt
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-xl p-6 text-center"
                  style={{ background: "rgba(255,204,0,0.05)", border: "1px solid rgba(255,204,0,0.2)" }}
                >
                  <p className="text-sm font-mono font-semibold text-neon-yellow mb-2">
                    No text could be recovered from this PDF{pageCount ? ` (${pageCount} page${pageCount === 1 ? "" : "s"})` : ""}.
                  </p>
                  <p className="text-xs font-mono text-text-muted leading-relaxed">
                    Both the embedded text layer and an automatic OCR pass came back empty. This usually means the pages are blank, extremely low quality, or in a format OCR can&apos;t read reliably.
                  </p>
                </div>
              )}
            </ResultReveal>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl p-6 text-center" style={{ background: "rgba(255,0,60,0.05)", border: "1px solid rgba(255,0,60,0.2)" }}>
              <p className="text-sm font-mono text-neon-red mb-4">EXTRACTION FAILED</p>
              <button onClick={handleReset} className="btn-neon text-sm">Try Again</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}