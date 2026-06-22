"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PackageMinus } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal, DownloadButton } from "@/components/tools/ResultReveal";
import { formatBytes, downloadBlob } from "@/lib/utils";
import { toast } from "sonner";

type ProcessState = "idle" | "processing" | "complete" | "error";
type CompressionLevel = "light" | "balanced" | "maximum";

const QUALITY_MAP: Record<CompressionLevel, number> = {
  light: 0.85,
  balanced: 0.65,
  maximum: 0.4,
};

const SCALE_MAP: Record<CompressionLevel, number> = {
  light: 1.5,
  balanced: 1.2,
  maximum: 0.9,
};

export function PdfCompress() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  const [level, setLevel] = useState<CompressionLevel>("balanced");
  const [savings, setSavings] = useState(0);

  const onDrop = useCallback((files: File[]) => {
    setFile(files[0]);
    setState("idle");
    setResult(null);
  }, []);

  async function handleCompress() {
    if (!file) { toast.error("Please upload a PDF first."); return; }
    setState("processing");
    setProgress(5);

    const msgs = [
      "INITIALIZING PDF RENDERER...",
      "LOADING DOCUMENT PAGES...",
      "RASTERIZING CONTENT...",
      "APPLYING COMPRESSION...",
      "REBUILDING PDF STRUCTURE...",
    ];
    let mi = 0;
    setStatus(msgs[0]);
    const iv = setInterval(() => {
      mi = (mi + 1) % msgs.length;
      setStatus(msgs[mi]);
    }, 900);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const { default: jsPDF } = await import("jspdf");

      const bytes = await file.arrayBuffer();
      setProgress(15);

      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      const total = doc.numPages;
      const q = QUALITY_MAP[level];
      const scale = SCALE_MAP[level];

      // Determine page dimensions from first page
      const firstPage = await doc.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1 });
      const isLandscape = viewport.width > viewport.height;

      const pdfW = isLandscape ? 297 : 210;
      const pdfH = isLandscape ? 210 : 297;
      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: [pdfW, pdfH],
      });

      for (let i = 1; i <= total; i++) {
        setStatus(`COMPRESSING PAGE ${i} OF ${total}...`);
        setProgress(15 + Math.round((i / total) * 75));

        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        const imgData = canvas.toDataURL("image/jpeg", q);
        const imgW = pdfW - 10;
        const imgH = (vp.height * imgW) / vp.width;

        if (i > 1) pdf.addPage([pdfW, pdfH], isLandscape ? "landscape" : "portrait");
        pdf.addImage(imgData, "JPEG", 5, 5, imgW, Math.min(imgH, pdfH - 10));

        canvas.remove();
        await new Promise((r) => setTimeout(r, 20));
      }

      setProgress(95);
      setStatus("FINALIZING COMPRESSED PDF...");

      const blob = pdf.output("blob");
      const pct = Math.max(0, Math.round(((file.size - blob.size) / file.size) * 100));
      setSavings(pct);
      setResult(blob);
      setProgress(100);
      setState("complete");
    } catch (err) {
      console.error(err);
      setState("error");
      toast.error("Compression failed. The PDF may be encrypted or damaged.");
    } finally {
      clearInterval(iv);
    }
  }

  function handleReset() {
    setFile(null);
    setState("idle");
    setResult(null);
    setProgress(0);
    setSavings(0);
  }

  const LEVELS: { id: CompressionLevel; label: string; desc: string }[] = [
    { id: "light",    label: "Light",    desc: "~20–40% smaller · Best quality" },
    { id: "balanced", label: "Balanced", desc: "~40–65% smaller · Good quality" },
    { id: "maximum",  label: "Maximum",  desc: "~60–80% smaller · Lower quality" },
  ];

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <UploadZone
              onDrop={onDrop}
              accept={{ "application/pdf": [".pdf"] }}
              accentColor="orange"
              currentFiles={file ? [file] : []}
              onRemoveFile={() => setFile(null)}
              maxSizeMb={50}
            />

            {file && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Compression level */}
                <div>
                  <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-3">
                    Compression Level
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {LEVELS.map(({ id, label, desc }) => (
                      <button
                        key={id}
                        onClick={() => setLevel(id)}
                        className="text-left rounded-lg px-3 py-3 transition-all duration-150"
                        style={{
                          background: level === id ? "rgba(255,102,0,0.1)" : "rgba(255,102,0,0.03)",
                          border: `1px solid ${level === id ? "rgba(255,102,0,0.5)" : "rgba(255,102,0,0.12)"}`,
                        }}
                      >
                        <p className="text-xs font-mono font-bold" style={{ color: level === id ? "#ff6600" : "#e2e8f0" }}>
                          {label}
                        </p>
                        <p className="text-[10px] font-mono text-text-muted mt-0.5 leading-tight">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCompress}
                  className="w-full py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm rounded-lg border transition-all duration-300"
                  style={{
                    background: "rgba(255,102,0,0.1)",
                    borderColor: "rgba(255,102,0,0.5)",
                    color: "#ff6600",
                    textShadow: "0 0 10px rgba(255,102,0,0.6)",
                  }}
                >
                  <PackageMinus className="w-4 h-4" />
                  COMPRESS PDF
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

        {state === "complete" && result && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultReveal onReset={handleReset} successMessage="COMPRESSION COMPLETE">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: "Original",   value: formatBytes(file!.size),  color: "text-text-muted" },
                    { label: "Saved",      value: `${savings}%`,            color: "text-neon-green" },
                    { label: "Compressed", value: formatBytes(result.size), color: "#ff6600" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg p-2 sm:p-3 text-center overflow-hidden"
                      style={{ background: "rgba(255,102,0,0.05)", border: "1px solid rgba(255,102,0,0.12)" }}>
                      <p className={`text-sm sm:text-lg font-display font-black truncate ${color.startsWith("text-") ? color : ""}`}
                        style={!color.startsWith("text-") ? { color } : {}}>
                        {value}
                      </p>
                      <p className="text-[10px] sm:text-[11px] font-mono text-text-muted truncate">{label}</p>
                    </div>
                  ))}
                </div>

                <DownloadButton
                  onClick={() => downloadBlob(result, (file?.name ?? "document").replace(".pdf", "_compressed.pdf"))}
                  label="Download Compressed PDF"
                  color="cyan"
                  className="w-full"
                />
              </div>
            </ResultReveal>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl p-6 text-center" style={{ background: "rgba(255,0,60,0.05)", border: "1px solid rgba(255,0,60,0.2)" }}>
              <p className="text-sm font-mono text-neon-red mb-4">COMPRESSION FAILED</p>
              <button onClick={handleReset} className="btn-neon text-sm">Try Again</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}