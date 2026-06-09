"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileOutput, Copy, Download } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal } from "@/components/tools/ResultReveal";
import { downloadBlob } from "@/lib/utils";
import { toast } from "sonner";

type ProcessState = "idle" | "processing" | "complete" | "error";

export function PdfToText() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [pageCount, setPageCount] = useState(0);

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

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      setProgress(15);
      setStatus("PARSING DOCUMENT STRUCTURE...");

      const bytes = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      const total = doc.numPages;
      setPageCount(total);

      let fullText = "";
      for (let i = 1; i <= total; i++) {
        setStatus(`EXTRACTING PAGE ${i} OF ${total}...`);
        setProgress(15 + Math.round((i / total) * 75));

        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: unknown) => {
            const it = item as { str: string; hasEOL?: boolean };
            return it.hasEOL ? it.str + "\n" : it.str + " ";
          })
          .join("")
          .trim();

        fullText += `\n\n--- Page ${i} ---\n\n${pageText}`;
        await new Promise((r) => setTimeout(r, 10));
      }

      setExtractedText(fullText.trim());
      setProgress(100);
      setState("complete");
    } catch (err) {
      console.error(err);
      setState("error");
      toast.error("Text extraction failed. The PDF may be scanned or encrypted.");
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
              Works on PDFs with a text layer. Scanned image-only PDFs return empty results — use Image to Word for those.
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

        {state === "complete" && extractedText && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultReveal onReset={handleReset} successMessage="EXTRACTION COMPLETE">
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Pages",     value: pageCount },
                    { label: "Words",     value: wordCount.toLocaleString() },
                    { label: "Characters",value: extractedText.length.toLocaleString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg p-3 text-center" style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.12)" }}>
                      <p className="text-lg font-display font-black text-neon-green">{value}</p>
                      <p className="text-[11px] font-mono text-text-muted">{label}</p>
                    </div>
                  ))}
                </div>

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
                <div className="flex gap-3">
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
