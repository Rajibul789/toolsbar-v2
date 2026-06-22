"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileOutput } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal, DownloadButton } from "@/components/tools/ResultReveal";
import { formatBytes, downloadBlob } from "@/lib/utils";
import { toast } from "sonner";

type ProcessState = "idle" | "processing" | "complete" | "error";

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

    try {
      // Step 1: DOCX → HTML via mammoth
      setProgress(20);
      const mammoth = await import("mammoth");
      const bytes = await file.arrayBuffer();
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer: bytes });
      setPreviewHtml(html);
      setProgress(50);

      await new Promise((r) => setTimeout(r, 400));

      // Step 2: HTML → PDF via jsPDF + html2canvas
      setProgress(55);
      setStatus("RENDERING HTML TO CANVAS...");

      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      // Build styled container
      const container = document.createElement("div");
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
          table{border-collapse:collapse;width:100%;margin-bottom:1em}
          td,th{border:1px solid #999;padding:6px 10px}
          th{background:#eee;font-weight:bold}
        </style>
        ${html}
      `;
      document.body.appendChild(container);

      setProgress(65);
      await new Promise((r) => setTimeout(r, 200));

      const canvas = await html2canvas(container, { scale: 1.8, backgroundColor: "#fff", useCORS: true });
      document.body.removeChild(container);

      setProgress(82);
      setStatus("ASSEMBLING PDF PAGES...");

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = 190, pageH = 267;
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let remaining = imgH;
      let srcY = 0;

      while (remaining > 0) {
        const sliceH = Math.min(remaining, pageH);
        const slicePx = Math.round(sliceH * (canvas.height / imgH));
        const srcYpx = Math.round(srcY * (canvas.height / imgH));

        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = slicePx;
        const sCtx = slice.getContext("2d")!;
        sCtx.fillStyle = "#fff";
        sCtx.fillRect(0, 0, slice.width, slice.height);
        sCtx.drawImage(canvas, 0, srcYpx, canvas.width, slicePx, 0, 0, canvas.width, slicePx);

        pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 10, 15, imgW, sliceH);

        remaining -= sliceH;
        srcY += sliceH;
        if (remaining > 0) pdf.addPage();
      }

      const blob = pdf.output("blob");
      setResult(blob);
      setProgress(100);
      setState("complete");
    } catch (err) {
      console.error(err);
      setState("error");
      toast.error("Conversion failed. Please check the file and try again.");
    } finally {
      clearInterval(iv);
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
                "application/msword": [".doc"],
              }}
              accentColor="blue"
              currentFiles={file ? [file] : []}
              onRemoveFile={() => { setFile(null); setPreviewHtml(""); }}
              maxSizeMb={20}
              label={<>Upload <span className="text-neon-blue">DOC or DOCX</span> file</>}
              sublabel=".doc, .docx · Max 20MB"
            />

            {/* Limitation note */}
            <div
              className="rounded-lg px-4 py-3 text-xs font-mono text-text-muted"
              style={{ background: "rgba(0,102,255,0.05)", border: "1px solid rgba(0,102,255,0.15)" }}
            >
              <span className="text-neon-blue">ℹ</span>{" "}
              Basic formatting (headings, bold, italic, lists, tables) is preserved.
              Complex layouts may not convert perfectly — no Word installation needed.
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