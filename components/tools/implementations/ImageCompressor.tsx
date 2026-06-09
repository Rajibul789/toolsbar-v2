"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageDown, ArrowDown } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal, DownloadButton } from "@/components/tools/ResultReveal";
import { formatBytes, downloadBlob, readFileAsDataURL } from "@/lib/utils";
import { toast } from "sonner";

type ProcessState = "idle" | "processing" | "complete" | "error";

interface CompressResult {
  file: File;
  originalSize: number;
  compressedBlob: Blob;
  compressedSize: number;
  dataUrl: string;
  savings: number;
}

export function ImageCompressor() {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessState>("idle");
  const [quality, setQuality] = useState(80);
  const [results, setResults] = useState<CompressResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = useCallback((dropped: File[]) => {
    setFiles((prev) => [...prev, ...dropped].slice(0, 10));
    setState("idle");
    setResults([]);
  }, []);

  async function compressImage(file: File, q: number): Promise<CompressResult> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not available"));
        ctx.drawImage(img, 0, 0);

        const mimeType =
          file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, q / 100);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) return reject(new Error("Compression failed"));
            const savings = Math.max(
              0,
              Math.round(((file.size - blob.size) / file.size) * 100)
            );
            resolve({
              file,
              originalSize: file.size,
              compressedBlob: blob,
              compressedSize: blob.size,
              dataUrl,
              savings,
            });
          },
          mimeType,
          q / 100
        );
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function handleCompress() {
    if (files.length === 0) {
      toast.error("Please upload at least one image.");
      return;
    }

    setState("processing");
    setProgress(0);

    const statusMessages = [
      "INITIALIZING COMPRESSION ENGINE...",
      "ANALYZING PIXEL DATA...",
      "APPLYING COMPRESSION ALGORITHMS...",
      "OPTIMIZING COLOR PALETTE...",
      "FINALIZING OUTPUT...",
    ];
    let msgIdx = 0;
    setStatus(statusMessages[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % statusMessages.length;
      setStatus(statusMessages[msgIdx]);
    }, 700);

    try {
      const compressedResults: CompressResult[] = [];
      for (let i = 0; i < files.length; i++) {
        const r = await compressImage(files[i], quality);
        compressedResults.push(r);
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }
      setResults(compressedResults);
      setState("complete");
    } catch (err) {
      console.error(err);
      setState("error");
      toast.error("Compression failed. Please try again.");
    } finally {
      clearInterval(interval);
    }
  }

  function handleReset() {
    setFiles([]);
    setResults([]);
    setState("idle");
    setProgress(0);
  }

  function downloadAll() {
    results.forEach((r, i) => {
      const ext = r.file.name.split(".").pop() ?? "jpg";
      const name = r.file.name.replace(`.${ext}`, `_compressed.${ext}`);
      setTimeout(() => downloadBlob(r.compressedBlob, name), i * 200);
    });
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <UploadZone
              onDrop={onDrop}
              accept={{ "image/jpeg": [], "image/png": [], "image/webp": [] }}
              accentColor="purple"
              multiple
              maxFiles={10}
              maxSizeMb={20}
              currentFiles={files}
              onRemoveFile={(i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              sublabel="JPG, PNG, WebP · Max 20MB · Up to 10 images"
            />

            {/* Quality slider */}
            {files.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono text-text-muted uppercase tracking-wider">
                    Compression Quality
                  </label>
                  <span className="text-sm font-mono font-bold text-neon-purple">{quality}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(90deg, #bf00ff ${quality}%, rgba(191,0,255,0.2) ${quality}%)`,
                  }}
                />
                <div className="flex justify-between text-[10px] font-mono text-text-muted">
                  <span>Maximum Compression</span>
                  <span>Best Quality</span>
                </div>
              </motion.div>
            )}

            {files.length > 0 && (
              <button
                onClick={handleCompress}
                className="w-full btn-neon-purple py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm"
              >
                <ImageDown className="w-4 h-4" />
                COMPRESS {files.length} IMAGE{files.length > 1 ? "S" : ""}
              </button>
            )}
          </motion.div>
        )}

        {state === "processing" && (
          <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CyberScanner statusText={status} progress={progress} />
          </motion.div>
        )}

        {state === "complete" && results.length > 0 && (
          <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultReveal onReset={handleReset} successMessage="COMPRESSION COMPLETE">
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Original",
                      value: formatBytes(results.reduce((s, r) => s + r.originalSize, 0)),
                      color: "text-text-muted",
                    },
                    {
                      label: "Saved",
                      value: `${Math.round(((results.reduce((s, r) => s + r.originalSize, 0) - results.reduce((s, r) => s + r.compressedSize, 0)) / results.reduce((s, r) => s + r.originalSize, 0)) * 100)}%`,
                      color: "text-neon-green",
                    },
                    {
                      label: "Compressed",
                      value: formatBytes(results.reduce((s, r) => s + r.compressedSize, 0)),
                      color: "text-neon-purple",
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="rounded-lg p-3 text-center"
                      style={{ background: "rgba(191,0,255,0.05)", border: "1px solid rgba(191,0,255,0.12)" }}
                    >
                      <p className={`text-lg font-display font-black ${color}`}>{value}</p>
                      <p className="text-[11px] font-mono text-text-muted">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Per-file results */}
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                      style={{ background: "rgba(191,0,255,0.04)", border: "1px solid rgba(191,0,255,0.1)" }}
                    >
                      <img src={r.dataUrl} alt="" className="w-8 h-8 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-text-primary truncate">{r.file.name}</p>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
                          <span>{formatBytes(r.originalSize)}</span>
                          <ArrowDown className="w-2.5 h-2.5 text-neon-green" />
                          <span className="text-neon-green">{formatBytes(r.compressedSize)}</span>
                          <span className="text-neon-purple">-{r.savings}%</span>
                        </div>
                      </div>
                      <DownloadButton
                        onClick={() => {
                          const ext = r.file.name.split(".").pop() ?? "jpg";
                          downloadBlob(r.compressedBlob, r.file.name.replace(`.${ext}`, `_compressed.${ext}`));
                        }}
                        label="Save"
                        color="purple"
                        className="text-xs px-3 py-1.5"
                      />
                    </div>
                  ))}
                </div>

                {results.length > 1 && (
                  <DownloadButton
                    onClick={downloadAll}
                    label={`Download All ${results.length} Images`}
                    color="purple"
                    className="w-full"
                  />
                )}
              </div>
            </ResultReveal>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl p-6 text-center"
              style={{ background: "rgba(255,0,60,0.05)", border: "1px solid rgba(255,0,60,0.2)" }}>
              <p className="text-sm font-mono text-neon-red mb-4">COMPRESSION FAILED</p>
              <button onClick={handleReset} className="btn-neon text-sm">Try Again</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
