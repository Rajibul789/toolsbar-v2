"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanText, Copy, Download } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal } from "@/components/tools/ResultReveal";
import { downloadBlob } from "@/lib/utils";
import { toast } from "sonner";

type ProcessState = "idle" | "processing" | "complete" | "error";

export function ImageToWord() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [state, setState] = useState<ProcessState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [ocrText, setOcrText] = useState("");

  const onDrop = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setState("idle");
    setOcrText("");
  }, []);

  async function handleExtract() {
    if (!file) { toast.error("Please upload an image first."); return; }
    setState("processing");
    setProgress(5);
    setStatus("LOADING OCR ENGINE...");

    try {
      const Tesseract = await import("tesseract.js");
      setProgress(15);
      setStatus("INITIALIZING RECOGNITION MODEL...");

      const { data: { text } } = await Tesseract.recognize(file, "eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setProgress(15 + Math.round(m.progress * 75));
            setStatus(`RECOGNIZING TEXT... ${Math.round(m.progress * 100)}%`);
          }
          if (m.status === "loading tesseract core") setStatus("LOADING OCR CORE...");
          if (m.status === "loading language traineddata") setStatus("LOADING LANGUAGE MODEL...");
        },
      });

      setOcrText(text.trim());
      setProgress(100);
      setState("complete");
    } catch (err) {
      console.error(err);
      setState("error");
      toast.error("OCR failed. Please try a clearer image.");
    }
  }

  async function downloadDocx() {
    try {
      const { Document, Packer, Paragraph, TextRun } = await import("docx");

      const paragraphs = ocrText.split("\n").map(
        (line) =>
          new Paragraph({
            children: [new TextRun({ text: line, size: 24, font: "Calibri" })],
          })
      );

      const doc = new Document({ sections: [{ children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      downloadBlob(blob, (file?.name ?? "image").replace(/\.[^/.]+$/, "") + "_ocr.docx");
    } catch (err) {
      toast.error("Failed to generate DOCX file.");
      console.error(err);
    }
  }

  function downloadTxt() {
    const blob = new Blob([ocrText], { type: "text/plain" });
    downloadBlob(blob, (file?.name ?? "image").replace(/\.[^/.]+$/, "") + "_ocr.txt");
  }

  function copyText() {
    navigator.clipboard.writeText(ocrText).then(() => toast.success("Text copied!"));
  }

  function handleReset() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setState("idle");
    setOcrText("");
    setProgress(0);
  }

  const wordCount = ocrText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <UploadZone
              onDrop={onDrop}
              accept={{ "image/jpeg": [], "image/png": [], "image/webp": [] }}
              accentColor="green"
              currentFiles={file ? [file] : []}
              onRemoveFile={() => { if (preview) URL.revokeObjectURL(preview); setFile(null); setPreview(""); }}
              maxSizeMb={10}
              label={<>Upload image with <span className="text-neon-green">text content</span></>}
              sublabel="JPG, PNG, WebP · Max 10MB · Best results on high-contrast images"
            />

            {/* Image preview */}
            {preview && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="rounded-xl overflow-hidden border border-neon-green/15 max-h-64">
                  <img src={preview} alt="Preview" className="w-full object-contain max-h-64 bg-black/30" />
                </div>

                <div className="rounded-lg px-4 py-3 text-xs font-mono"
                  style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.12)" }}>
                  <span className="text-neon-green">💡 Tips for best results:</span>
                  <span className="text-text-muted ml-2">Use high-resolution images, ensure good contrast between text and background, and keep text horizontal.</span>
                </div>

                <button onClick={handleExtract}
                  className="w-full btn-neon-green py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm">
                  <ScanText className="w-4 h-4" />
                  EXTRACT TEXT (OCR)
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {state === "processing" && (
          <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CyberScanner statusText={status} progress={progress} />
          </motion.div>
        )}

        {state === "complete" && ocrText && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultReveal onReset={handleReset} successMessage="OCR COMPLETE">
              <div className="space-y-4">
                {/* Stats */}
                <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
                  <span><span className="text-neon-green font-bold">{wordCount}</span> words extracted</span>
                  <span><span className="text-neon-green font-bold">{ocrText.length}</span> characters</span>
                </div>

                {/* Text preview + edit */}
                <textarea
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                  rows={10}
                  className="w-full rounded-xl p-4 text-sm font-mono text-text-secondary resize-none outline-none"
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(0,255,136,0.15)",
                    lineHeight: 1.7,
                  }}
                />
                <p className="text-[11px] font-mono text-text-muted">You can edit the extracted text before downloading.</p>

                {/* Download buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={copyText}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-mono transition-all"
                    style={{ borderColor: "rgba(0,245,255,0.2)", color: "#94a3b8" }}>
                    <Copy className="w-3.5 h-3.5" />Copy
                  </button>
                  <button onClick={downloadTxt}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-mono transition-all"
                    style={{ borderColor: "rgba(0,245,255,0.2)", color: "#94a3b8" }}>
                    <Download className="w-3.5 h-3.5" />.txt
                  </button>
                  <button onClick={downloadDocx}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-xs font-mono font-semibold transition-all"
                    style={{ background: "rgba(0,255,136,0.08)", borderColor: "rgba(0,255,136,0.35)", color: "#00ff88" }}>
                    <Download className="w-3.5 h-3.5" />.docx
                  </button>
                </div>
              </div>
            </ResultReveal>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl p-6 text-center" style={{ background: "rgba(255,0,60,0.05)", border: "1px solid rgba(255,0,60,0.2)" }}>
              <p className="text-sm font-mono text-neon-red mb-4">OCR FAILED</p>
              <button onClick={handleReset} className="btn-neon text-sm">Try Again</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
