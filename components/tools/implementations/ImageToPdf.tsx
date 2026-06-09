"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Images, GripVertical, Trash2 } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal, DownloadButton } from "@/components/tools/ResultReveal";
import { formatBytes, downloadBlob } from "@/lib/utils";
import { toast } from "sonner";

type ProcessState = "idle" | "processing" | "complete" | "error";
type PageSizing = "a4" | "letter" | "fit";

interface ImageEntry { file: File; preview: string; }

export function ImageToPdf() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [state, setState] = useState<ProcessState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  const [pageSizing, setPageSizing] = useState<PageSizing>("a4");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const onDrop = useCallback((dropped: File[]) => {
    const entries = dropped.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setImages((prev) => [...prev, ...entries].slice(0, 20));
    setState("idle");
    setResult(null);
  }, []);

  function removeImage(i: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  function moveImage(from: number, to: number) {
    setImages((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }

  async function handleConvert() {
    if (images.length === 0) { toast.error("Add at least one image."); return; }
    setState("processing");
    setProgress(5);

    try {
      const { default: jsPDF } = await import("jspdf");
      setProgress(15);
      setStatus("INITIALIZING PDF BUILDER...");

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: pageSizing === "fit" ? "a4" : pageSizing });
      let firstPage = true;

      for (let i = 0; i < images.length; i++) {
        setStatus(`EMBEDDING IMAGE ${i + 1} OF ${images.length}...`);
        setProgress(15 + Math.round(((i + 1) / images.length) * 75));

        const entry = images[i];
        const imgData = await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg", 0.92));
          };
          img.src = entry.preview;
        });

        // Get actual image dimensions
        const img = new Image();
        img.src = imgData;
        await new Promise<void>((r) => { img.onload = () => r(); });

        if (!firstPage) pdf.addPage();
        firstPage = false;

        if (pageSizing === "fit") {
          // Resize page to fit image
          const maxW = 210, maxH = 297;
          const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
          const w = img.naturalWidth * ratio;
          const h = img.naturalHeight * ratio;
          (pdf.internal.pageSize as { width: number; height: number }).width = w;
          (pdf.internal.pageSize as { width: number; height: number }).height = h;
          pdf.addImage(imgData, "JPEG", 0, 0, w, h);
        } else {
          const pw = pageSizing === "a4" ? 210 : 216;
          const ph = pageSizing === "a4" ? 297 : 279;
          const margin = 5;
          const maxW = pw - margin * 2;
          const maxH = ph - margin * 2;
          const ratio = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
          const w = img.naturalWidth * ratio;
          const h = img.naturalHeight * ratio;
          const x = margin + (maxW - w) / 2;
          const y = margin + (maxH - h) / 2;
          pdf.addImage(imgData, "JPEG", x, y, w, h);
        }

        await new Promise((r) => setTimeout(r, 30));
      }

      setProgress(95);
      setStatus("FINALIZING PDF...");

      const blob = pdf.output("blob");
      setResult(blob);
      setProgress(100);
      setState("complete");
    } catch (err) {
      console.error(err);
      setState("error");
      toast.error("Conversion failed. Please try again.");
    }
  }

  function handleReset() {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setState("idle");
    setResult(null);
    setProgress(0);
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <UploadZone
              onDrop={onDrop}
              accept={{ "image/jpeg": [], "image/png": [], "image/webp": [] }}
              accentColor="cyan"
              multiple maxFiles={20} maxSizeMb={50}
              sublabel="JPG, PNG, WebP · Max 50MB total · Up to 20 images"
            />

            {images.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Page sizing */}
                <div>
                  <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Page Sizing</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["a4", "letter", "fit"] as PageSizing[]).map((s) => (
                      <button key={s} onClick={() => setPageSizing(s)}
                        className="py-2 text-xs font-mono rounded border transition-all uppercase"
                        style={{
                          background: pageSizing === s ? "rgba(0,245,255,0.1)" : "transparent",
                          borderColor: pageSizing === s ? "rgba(0,245,255,0.4)" : "rgba(0,245,255,0.12)",
                          color: pageSizing === s ? "#00f5ff" : "#475569",
                        }}>{s === "fit" ? "Fit to Image" : s.toUpperCase()}</button>
                    ))}
                  </div>
                </div>

                {/* Image thumbnails (draggable) */}
                <div className="grid grid-cols-4 gap-2">
                  {images.map((img, i) => (
                    <motion.div key={i} layout
                      draggable
                      onDragStart={() => setDragIdx(i)}
                      onDragOver={(e) => { e.preventDefault(); if (dragIdx !== null && dragIdx !== i) moveImage(dragIdx, i); setDragIdx(i); }}
                      onDragEnd={() => setDragIdx(null)}
                      className="relative group rounded-lg overflow-hidden cursor-grab active:cursor-grabbing aspect-square"
                      style={{ border: "1px solid rgba(0,245,255,0.1)", opacity: dragIdx === i ? 0.5 : 1 }}>
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <GripVertical className="w-3.5 h-3.5 text-white" />
                        <button onClick={() => removeImage(i)}
                          className="p-1 rounded text-neon-red hover:bg-neon-red/20 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="absolute bottom-1 left-1 text-[9px] font-mono bg-black/70 px-1 rounded text-white">
                        {i + 1}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <button onClick={handleConvert}
                  className="w-full btn-neon py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm">
                  <Images className="w-4 h-4" />
                  CREATE PDF ({images.length} {images.length === 1 ? "PAGE" : "PAGES"})
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
            <ResultReveal onReset={handleReset} successMessage="PDF CREATED">
              <div className="flex items-center gap-4 rounded-xl px-5 py-4"
                style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.15)" }}>
                <div>
                  <p className="text-xl font-display font-black text-neon-cyan">{formatBytes(result.size)}</p>
                  <p className="text-xs font-mono text-text-muted">{images.length} page PDF</p>
                </div>
                <DownloadButton onClick={() => downloadBlob(result, "images.pdf")} label="Download PDF" color="cyan" className="flex-1" />
              </div>
            </ResultReveal>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl p-6 text-center" style={{ background: "rgba(255,0,60,0.05)", border: "1px solid rgba(255,0,60,0.2)" }}>
              <p className="text-sm font-mono text-neon-red mb-4">FAILED TO CREATE PDF</p>
              <button onClick={handleReset} className="btn-neon text-sm">Try Again</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}