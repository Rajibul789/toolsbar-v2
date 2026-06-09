"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileType, Eye } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal, DownloadButton } from "@/components/tools/ResultReveal";
import { readFileAsText, downloadBlob } from "@/lib/utils";
import { toast } from "sonner";

type ProcessState = "idle" | "preview" | "processing" | "complete" | "error";
type PageSize = "a4" | "letter";

export function TxtToPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [state, setState] = useState<ProcessState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<Blob | null>(null);
  const [fontSize, setFontSize] = useState(11);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [fontFamily, setFontFamily] = useState<"helvetica" | "courier" | "times">("courier");

  const onDrop = useCallback(async (files: File[]) => {
    const f = files[0];
    setFile(f);
    setState("preview");
    const content = await readFileAsText(f);
    setText(content);
  }, []);

  async function handleConvert() {
    if (!text.trim()) { toast.error("File is empty or couldn't be read."); return; }
    setState("processing");
    setProgress(10);
    setStatus("LOADING PDF ENGINE...");

    try {
      const { default: jsPDF } = await import("jspdf");
      setProgress(30);
      setStatus("FORMATTING TEXT CONTENT...");
      await new Promise((r) => setTimeout(r, 200));

      const pageW = pageSize === "a4" ? 210 : 216;
      const pageH = pageSize === "a4" ? 297 : 279;
      const margin = 15;
      const maxW = pageW - margin * 2;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: pageSize });
      pdf.setFont(fontFamily);
      pdf.setFontSize(fontSize);

      setProgress(50);
      setStatus("PAGINATING CONTENT...");

      const lines = pdf.splitTextToSize(text, maxW) as string[];
      const lineH = fontSize * 0.4;
      const linesPerPage = Math.floor((pageH - margin * 2) / lineH);

      let y = margin;
      let pageNum = 1;

      for (let i = 0; i < lines.length; i++) {
        if (i > 0 && i % linesPerPage === 0) {
          pdf.addPage();
          y = margin;
          pageNum++;
          setProgress(50 + Math.round((i / lines.length) * 40));
          setStatus(`GENERATING PAGE ${pageNum}...`);
        }
        pdf.text(lines[i], margin, y);
        y += lineH;
      }

      setProgress(95);
      setStatus("FINALIZING PDF...");
      await new Promise((r) => setTimeout(r, 200));

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
    setFile(null);
    setText("");
    setState("idle");
    setResult(null);
    setProgress(0);
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const lineCount = text.split("\n").length;

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {/* IDLE */}
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <UploadZone
              onDrop={onDrop}
              accept={{ "text/plain": [".txt"] }}
              accentColor="yellow"
              maxSizeMb={5}
              label={<>Upload a <span className="text-neon-yellow">.txt file</span> or drag it here</>}
              sublabel="Plain text files only · Max 5MB"
            />
          </motion.div>
        )}

        {/* PREVIEW */}
        {state === "preview" && (
          <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            {/* File info */}
            <div className="flex items-center gap-3 rounded-lg px-4 py-3"
              style={{ background: "rgba(255,204,0,0.05)", border: "1px solid rgba(255,204,0,0.15)" }}>
              <Eye className="w-4 h-4 text-neon-yellow" />
              <div className="flex-1">
                <p className="text-xs font-mono text-text-primary">{file?.name}</p>
                <p className="text-[11px] font-mono text-text-muted">
                  {lineCount.toLocaleString()} lines · {wordCount.toLocaleString()} words
                </p>
              </div>
              <button onClick={handleReset} className="text-xs font-mono text-text-muted hover:text-neon-red transition-colors">
                Remove
              </button>
            </div>

            {/* Text preview */}
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,204,0,0.12)" }}>
              <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ background: "rgba(255,204,0,0.05)", borderColor: "rgba(255,204,0,0.1)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-neon-yellow" />
                <span className="text-[10px] font-mono text-neon-yellow/70 uppercase tracking-widest">File Preview</span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                className="w-full p-4 text-xs font-mono text-text-secondary resize-none outline-none"
                style={{ background: "rgba(0,0,0,0.35)", lineHeight: 1.7, color: "var(--neon-green)" }}
                spellCheck={false}
              />
            </div>

            {/* Settings */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Page Size</label>
                <div className="flex gap-1.5">
                  {(["a4", "letter"] as PageSize[]).map((s) => (
                    <button key={s} onClick={() => setPageSize(s)}
                      className="flex-1 py-2 text-[11px] font-mono rounded border transition-all uppercase"
                      style={{
                        background: pageSize === s ? "rgba(255,204,0,0.1)" : "transparent",
                        borderColor: pageSize === s ? "rgba(255,204,0,0.5)" : "rgba(255,204,0,0.12)",
                        color: pageSize === s ? "#ffcc00" : "#475569",
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">
                  Font <span className="text-neon-yellow">{fontSize}pt</span>
                </label>
                <input type="range" min={8} max={16} value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(90deg, #ffcc00 ${((fontSize - 8) / 8) * 100}%, rgba(255,204,0,0.2) ${((fontSize - 8) / 8) * 100}%)` }}
                />
              </div>

              <div>
                <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Font Style</label>
                <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value as typeof fontFamily)}
                  className="input-cyber w-full text-xs py-2">
                  <option value="courier">Monospace</option>
                  <option value="helvetica">Sans-serif</option>
                  <option value="times">Serif</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleConvert}
              className="w-full py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm rounded-lg border transition-all duration-300"
              style={{
                background: "rgba(255,204,0,0.1)",
                borderColor: "rgba(255,204,0,0.5)",
                color: "#ffcc00",
                textShadow: "0 0 10px rgba(255,204,0,0.6)",
              }}
            >
              <FileType className="w-4 h-4" />
              CONVERT TO PDF
            </button>
          </motion.div>
        )}

        {/* PROCESSING */}
        {state === "processing" && (
          <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CyberScanner statusText={status} progress={progress} />
          </motion.div>
        )}

        {/* COMPLETE */}
        {state === "complete" && result && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultReveal onReset={handleReset} successMessage="CONVERSION COMPLETE">
              <div className="rounded-xl px-5 py-4 flex items-center gap-4"
                style={{ background: "rgba(255,204,0,0.05)", border: "1px solid rgba(255,204,0,0.15)" }}>
                <div>
                  <p className="text-xl font-display font-black" style={{ color: "#ffcc00" }}>
                    {(result.size / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-xs font-mono text-text-muted">PDF generated</p>
                </div>
                <DownloadButton
                  onClick={() => downloadBlob(result, (file?.name ?? "file").replace(".txt", ".pdf"))}
                  label="Download PDF"
                  color="cyan"
                  className="flex-1"
                />
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
