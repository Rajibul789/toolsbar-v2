"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { ResultReveal, DownloadButton } from "@/components/tools/ResultReveal";
import { formatBytes, downloadBlob } from "@/lib/utils";
import { toast } from "sonner";
import { CyberScanner } from "@/components/animations/CyberScanner";

type ProcessState = "idle" | "processing" | "complete" | "error";
type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

interface ConvertResult {
  blob: Blob;
  dataUrl: string;
  name: string;
  size: number;
}

const FORMAT_OPTIONS: { value: OutputFormat; label: string; ext: string }[] = [
  { value: "image/jpeg", label: "JPG",  ext: "jpg" },
  { value: "image/png",  label: "PNG",  ext: "png" },
  { value: "image/webp", label: "WebP", ext: "webp" },
];

export function ImageConverter() {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessState>("idle");
  const [format, setFormat] = useState<OutputFormat>("image/webp");
  const [quality, setQuality] = useState(90);
  const [results, setResults] = useState<ConvertResult[]>([]);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((dropped: File[]) => {
    setFiles((prev) => [...prev, ...dropped].slice(0, 10));
    setState("idle");
    setResults([]);
  }, []);

  async function handleConvert() {
    if (files.length === 0) { toast.error("Please upload images first."); return; }
    setState("processing");
    setProgress(0);

    try {
      const converted: ConvertResult[] = [];
      const ext = FORMAT_OPTIONS.find((f) => f.value === format)?.ext ?? "jpg";

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(Math.round(((i) / files.length) * 90));

        const result = await new Promise<ConvertResult>((resolve, reject) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d")!;

            // White background for JPEG (prevents transparency issues)
            if (format === "image/jpeg") {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);

            const q = format === "image/png" ? undefined : quality / 100;
            const dataUrl = canvas.toDataURL(format, q);

            canvas.toBlob(
              (blob) => {
                if (!blob) return reject(new Error("Conversion failed"));
                const baseName = file.name.replace(/\.[^/.]+$/, "");
                resolve({
                  blob,
                  dataUrl,
                  name: `${baseName}.${ext}`,
                  size: blob.size,
                });
              },
              format,
              q
            );
          };
          img.onerror = reject;
          img.src = url;
        });

        converted.push(result);
        await new Promise((r) => setTimeout(r, 50));
      }

      setResults(converted);
      setProgress(100);
      setState("complete");
    } catch (err) {
      console.error(err);
      setState("error");
      toast.error("Conversion failed.");
    }
  }

  function handleReset() {
    setFiles([]);
    setResults([]);
    setState("idle");
    setProgress(0);
  }

  const isPng = format === "image/png";

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <UploadZone
              onDrop={onDrop}
              accept={{ "image/jpeg": [], "image/png": [], "image/webp": [], "image/gif": [], "image/bmp": [] }}
              accentColor="purple"
              multiple maxFiles={10} maxSizeMb={20}
              currentFiles={files}
              onRemoveFile={(i) => setFiles((p) => p.filter((_, idx) => idx !== i))}
              sublabel="JPG, PNG, WebP, GIF, BMP · Max 20MB · Up to 10 images"
            />

            {files.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Format selector */}
                <div>
                  <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-3">
                    Convert to Format
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {FORMAT_OPTIONS.map(({ value, label }) => (
                      <button key={value} onClick={() => setFormat(value)}
                        className="py-3 text-sm font-mono font-bold rounded-lg border transition-all duration-150"
                        style={{
                          background: format === value ? "rgba(191,0,255,0.12)" : "transparent",
                          borderColor: format === value ? "rgba(191,0,255,0.5)" : "rgba(191,0,255,0.15)",
                          color: format === value ? "#bf00ff" : "#475569",
                        }}
                      >{label}</button>
                    ))}
                  </div>
                </div>

                {/* Quality slider (not for PNG) */}
                {!isPng && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-mono text-text-muted uppercase tracking-wider">Quality</label>
                      <span className="text-sm font-mono font-bold text-neon-purple">{quality}%</span>
                    </div>
                    <input type="range" min={20} max={100} value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{ background: `linear-gradient(90deg, #bf00ff ${quality}%, rgba(191,0,255,0.2) ${quality}%)` }}
                    />
                  </div>
                )}
                {isPng && (
                  <p className="text-xs font-mono text-text-muted">PNG uses lossless compression — quality slider not applicable.</p>
                )}

                <button onClick={handleConvert}
                  className="w-full py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm rounded-lg border transition-all duration-300"
                  style={{ background: "rgba(191,0,255,0.1)", borderColor: "rgba(191,0,255,0.5)", color: "#bf00ff", textShadow: "0 0 10px rgba(191,0,255,0.6)" }}>
                  <RefreshCw className="w-4 h-4" />
                  CONVERT {files.length} IMAGE{files.length > 1 ? "S" : ""}
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {state === "processing" && (
          <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CyberScanner statusText="CONVERTING FORMAT..." progress={progress} />
          </motion.div>
        )}

        {state === "complete" && results.length > 0 && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultReveal onReset={handleReset} successMessage="CONVERSION COMPLETE">
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-4 py-2.5"
                    style={{ background: "rgba(191,0,255,0.05)", border: "1px solid rgba(191,0,255,0.12)" }}>
                    <img src={r.dataUrl} alt="" className="w-10 h-10 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-text-primary truncate">{r.name}</p>
                      <p className="text-[11px] font-mono text-text-muted">{formatBytes(r.size)}</p>
                    </div>
                    <DownloadButton onClick={() => downloadBlob(r.blob, r.name)} label="Save" color="purple" className="text-xs px-3 py-1.5" />
                  </div>
                ))}

                {results.length > 1 && (
                  <button onClick={() => results.forEach((r, i) => setTimeout(() => downloadBlob(r.blob, r.name), i * 200))}
                    className="w-full py-3 rounded-lg border text-xs font-mono transition-all"
                    style={{ borderColor: "rgba(191,0,255,0.25)", color: "#bf00ff", background: "rgba(191,0,255,0.06)" }}>
                    Download All {results.length} Files
                  </button>
                )}
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
