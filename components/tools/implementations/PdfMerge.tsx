"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitMerge, GripVertical, Trash2 } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal, DownloadButton } from "@/components/tools/ResultReveal";
import { formatBytes, downloadBlob } from "@/lib/utils";
import { toast } from "sonner";

type ProcessState = "idle" | "processing" | "complete" | "error";

export function PdfMerge() {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<ProcessState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const onDrop = useCallback((dropped: File[]) => {
    setFiles((prev) => [...prev, ...dropped].slice(0, 20));
  }, []);

  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  function moveFile(from: number, to: number) {
    setFiles((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  }

  async function handleMerge() {
    if (files.length < 2) {
      toast.error("Please upload at least 2 PDF files.");
      return;
    }

    setState("processing");
    setProgress(10);
    setStatus("LOADING PDF LIBRARY...");

    try {
      const { PDFDocument } = await import("pdf-lib");

      setProgress(25);
      setStatus("READING DOCUMENTS...");
      await new Promise((r) => setTimeout(r, 300));

      const merged = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        setStatus(`MERGING FILE ${i + 1} OF ${files.length}...`);
        setProgress(25 + Math.floor(((i + 1) / files.length) * 55));

        const bytes = await files[i].arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(doc, doc.getPageIndices());
        pages.forEach((p) => merged.addPage(p));

        await new Promise((r) => setTimeout(r, 100));
      }

      setProgress(88);
      setStatus("FINALIZING DOCUMENT...");
      await new Promise((r) => setTimeout(r, 300));

      const uint8 = await merged.save();
      const blob = new Blob([uint8], { type: "application/pdf" });

      setResult(blob);
      setProgress(100);
      setState("complete");
    } catch (err) {
      console.error(err);
      setState("error");
      toast.error("Failed to merge PDFs. Please check the files and try again.");
    }
  }

  function handleReset() {
    setFiles([]);
    setState("idle");
    setProgress(0);
    setResult(null);
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <UploadZone
              onDrop={onDrop}
              accept={{ "application/pdf": [".pdf"] }}
              accentColor="purple"
              multiple
              maxFiles={20}
              maxSizeMb={100}
              label={<>Click to add PDFs <span className="text-neon-purple">or drag & drop</span></>}
              sublabel="PDF files only · Max 100MB per file · Up to 20 files"
            />

            {/* File list (draggable) */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-mono text-text-muted">
                      {files.length} file{files.length !== 1 ? "s" : ""} — drag to reorder
                    </p>
                    <button
                      onClick={() => setFiles([])}
                      className="text-xs font-mono text-neon-red/60 hover:text-neon-red transition-colors"
                    >
                      Clear all
                    </button>
                  </div>

                  {files.map((file, i) => (
                    <motion.div
                      key={`${file.name}-${i}`}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      draggable
                      onDragStart={() => setDragIndex(i)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragIndex !== null && dragIndex !== i) moveFile(dragIndex, i);
                        setDragIndex(i);
                      }}
                      onDragEnd={() => setDragIndex(null)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-grab active:cursor-grabbing"
                      style={{
                        background: "rgba(191,0,255,0.05)",
                        border: `1px solid rgba(191,0,255,0.15)`,
                        opacity: dragIndex === i ? 0.5 : 1,
                      }}
                    >
                      <GripVertical className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <div
                        className="w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center flex-shrink-0"
                        style={{
                          background: "rgba(191,0,255,0.12)",
                          border: "1px solid rgba(191,0,255,0.25)",
                          color: "#bf00ff",
                        }}
                      >
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-mono text-text-primary truncate">{file.name}</p>
                        <p className="text-[11px] font-mono text-text-muted">{formatBytes(file.size)}</p>
                      </div>
                      <button
                        onClick={() => removeFile(i)}
                        className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-neon-red transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {files.length >= 2 && (
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleMerge}
                className="w-full btn-neon-purple py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm"
              >
                <GitMerge className="w-4 h-4" />
                MERGE {files.length} PDFs
              </motion.button>
            )}

            {files.length === 1 && (
              <p className="text-center text-xs font-mono text-text-muted">
                Add at least one more PDF to merge
              </p>
            )}
          </motion.div>
        )}

        {state === "processing" && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CyberScanner statusText={status} progress={progress} />
          </motion.div>
        )}

        {state === "complete" && result && (
          <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultReveal onReset={handleReset} successMessage="MERGE COMPLETE">
              <div
                className="rounded-xl p-6 flex flex-col sm:flex-row items-center gap-5"
                style={{
                  background: "rgba(191,0,255,0.04)",
                  border: "1px solid rgba(191,0,255,0.15)",
                }}
              >
                <div className="text-center">
                  <p className="text-2xl font-display font-black text-neon-purple mb-1">
                    {formatBytes(result.size)}
                  </p>
                  <p className="text-xs font-mono text-text-muted">
                    {files.length} PDFs merged
                  </p>
                </div>
                <DownloadButton
                  onClick={() => downloadBlob(result, "merged.pdf")}
                  label="Download Merged PDF"
                  color="purple"
                  className="flex-1 sm:max-w-xs"
                />
              </div>
            </ResultReveal>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl p-6 text-center"
              style={{ background: "rgba(255,0,60,0.05)", border: "1px solid rgba(255,0,60,0.2)" }}>
              <p className="text-sm font-mono text-neon-red mb-4">PROCESSING FAILED</p>
              <button onClick={handleReset} className="btn-neon text-sm">Try Again</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
