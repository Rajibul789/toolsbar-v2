"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { FileEdit, Eye, Download, Save, RotateCcw, Type } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/utils";
import dynamic from "next/dynamic";

// Lazy-load the heavy editor
const MDEditor = dynamic(
  () => import("@uiw/react-md-editor").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-64 rounded-lg animate-pulse"
        style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.1)" }}
      />
    ),
  }
);

const MarkdownPreview = dynamic(
  () => import("@uiw/react-md-editor").then((m) => m.default.Markdown!),
  { ssr: false }
);

const AUTOSAVE_KEY = "toolsbar_text_to_pdf_content";

const DEFAULT_CONTENT = `# My Document

Write your content here using **Markdown** formatting.

## What's Supported

- **Bold** and *italic* text
- \`Inline code\`
- [Hyperlinks](https://toolsbar.com)

## Tables

| Column A | Column B | Column C |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |

## Code Block

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Blockquote

> This is a blockquote. Great for highlights.

1. First ordered item
2. Second ordered item
3. Third ordered item
`;

type ViewMode = "write" | "preview" | "split";
type PageSize = "a4" | "letter";

export function TextToPdf() {
  const [content, setContent]     = useState(DEFAULT_CONTENT);
  const [viewMode, setViewMode]   = useState<ViewMode>("split");
  const [pageSize, setPageSize]   = useState<PageSize>("a4");
  const [fontSize, setFontSize]   = useState(12);
  const [isExporting, setIsExporting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load auto-saved content
  useEffect(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) { setContent(saved); setLastSaved(new Date()); }
  }, []);

  // Auto-save every 30s
  useEffect(() => {
    const id = setInterval(() => {
      localStorage.setItem(AUTOSAVE_KEY, content);
      setLastSaved(new Date());
    }, 30_000);
    return () => clearInterval(id);
  }, [content]);

  const handleSave = useCallback(() => {
    localStorage.setItem(AUTOSAVE_KEY, content);
    setLastSaved(new Date());
    toast.success("Saved to browser storage");
  }, [content]);

  function handleReset() {
    if (!confirm("Clear the editor and reset to default?")) return;
    setContent(DEFAULT_CONTENT);
    localStorage.removeItem(AUTOSAVE_KEY);
    setLastSaved(null);
  }

  async function handleExport() {
    if (!content.trim()) { toast.error("Nothing to export!"); return; }
    setIsExporting(true);
    try {
      // 1. Convert markdown → HTML using marked (runs in browser)
      const { marked } = await import("marked");
      const htmlContent = await marked(content, { async: false }) as string;

      // 2. Build a styled off-screen div
      const pageW  = pageSize === "a4" ? 794  : 816;
      const container = document.createElement("div");
      container.style.cssText = [
        "position:absolute", "left:-9999px", "top:0",
        `width:${pageW}px`, "padding:40px", "background:#fff",
        `font-size:${fontSize}pt`, "font-family:Georgia,serif",
        "line-height:1.6", "color:#111", "box-sizing:border-box",
      ].join(";");

      container.innerHTML = `
        <style>
          *{box-sizing:border-box}
          h1{font-size:2em;margin:0 0 .5em}
          h2{font-size:1.5em;margin:1.4em 0 .5em;padding-bottom:.3em;border-bottom:1px solid #ddd}
          h3{font-size:1.25em;margin:1.2em 0 .4em}
          p{margin:0 0 .75em}
          strong{font-weight:700}
          em{font-style:italic}
          code{background:#f4f4f4;padding:2px 5px;border-radius:3px;font-family:monospace;font-size:.9em}
          pre{background:#f4f4f4;padding:12px;border-radius:4px;overflow:hidden;margin:0 0 1em}
          pre code{background:none;padding:0}
          blockquote{border-left:3px solid #999;padding-left:1em;color:#555;margin:1em 0}
          table{border-collapse:collapse;width:100%;margin:0 0 1em}
          th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}
          th{background:#f5f5f5;font-weight:700}
          ul,ol{padding-left:1.5em;margin:0 0 .75em}
          li{margin-bottom:.25em}
          a{color:#0066cc}
          img{max-width:100%}
        </style>
        ${htmlContent}
      `;
      document.body.appendChild(container);

      // 3. Render to canvas
      const { default: html2canvas } = await import("html2canvas");
      await new Promise((r) => setTimeout(r, 200)); // let fonts render

      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      document.body.removeChild(container);

      // 4. Slice canvas into PDF pages
      const { default: jsPDF } = await import("jspdf");
      const pdfW  = pageSize === "a4" ? 210   : 216;
      const pdfH  = pageSize === "a4" ? 297   : 279;
      const margin = 10;
      const imgW   = pdfW - margin * 2;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: pageSize });

      const totalImgH   = (canvas.height * imgW) / canvas.width;
      const pageImgH    = pdfH - margin * 2;
      let srcYmm = 0;

      while (srcYmm < totalImgH) {
        const sliceH = Math.min(pageImgH, totalImgH - srcYmm);
        const srcYpx = Math.round((srcYmm / totalImgH) * canvas.height);
        const sliceHpx = Math.round((sliceH / totalImgH) * canvas.height);

        const slice = document.createElement("canvas");
        slice.width  = canvas.width;
        slice.height = sliceHpx;
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, srcYpx, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);

        pdf.addImage(slice.toDataURL("image/jpeg", 0.95), "JPEG", margin, margin, imgW, sliceH);
        srcYmm += sliceH;
        if (srcYmm < totalImgH) pdf.addPage();
      }

      const blob = pdf.output("blob");
      downloadBlob(blob, "document.pdf");
      toast.success("PDF exported successfully!");
    } catch (err) {
      console.error("[TextToPdf] export error:", err);
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  function downloadMarkdown() {
    downloadBlob(new Blob([content], { type: "text/markdown" }), "document.md");
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden border border-neon-cyan/15">
          {(["write", "split", "preview"] as ViewMode[]).map((m) => (
            <button key={m} onClick={() => setViewMode(m)}
              className="px-3 py-1.5 text-xs font-mono capitalize transition-all"
              style={{
                background: viewMode === m ? "rgba(0,245,255,0.12)" : "transparent",
                color: viewMode === m ? "#00f5ff" : "#475569",
                borderRight: m !== "preview" ? "1px solid rgba(0,245,255,0.1)" : "none",
              }}>
              {m}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
          <span>{wordCount} words</span>
          <span>{content.length} chars</span>
          {lastSaved && (
            <span className="text-neon-green/60">✓ saved {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-neon-cyan/15 rounded-lg text-text-muted hover:text-neon-cyan hover:border-neon-cyan/35 transition-all">
            <Save className="w-3 h-3" />Save
          </button>
          <button onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-neon-red/15 rounded-lg text-text-muted hover:text-neon-red hover:border-neon-red/35 transition-all">
            <RotateCcw className="w-3 h-3" />Reset
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className={`gap-4 ${viewMode === "split" ? "grid grid-cols-2" : "block"}`} style={{ minHeight: 400 }}>
        {viewMode !== "preview" && (
          <div className="flex flex-col" style={{ minHeight: 400 }}>
            <div className="text-[10px] font-mono px-3 py-1.5 rounded-t-lg flex items-center gap-2"
              style={{ background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.1)" }}>
              <Type className="w-3 h-3 text-neon-cyan" />
              <span className="text-neon-cyan/70 uppercase tracking-widest">Markdown Editor</span>
            </div>
            <div className="flex-1 rounded-b-lg overflow-hidden"
              style={{ border: "1px solid rgba(0,245,255,0.1)", borderTop: "none" }}
              data-color-mode="dark">
              <MDEditor
                value={content}
                onChange={(v) => setContent(v ?? "")}
                preview="edit"
                height={viewMode === "split" ? 400 : 500}
                style={{ background: "rgba(10,15,30,0.9)", borderRadius: 0 }}
              />
            </div>
          </div>
        )}

        {viewMode !== "write" && (
          <div className="flex flex-col" style={{ minHeight: 400 }}>
            <div className="text-[10px] font-mono px-3 py-1.5 rounded-t-lg flex items-center gap-2"
              style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.1)" }}>
              <Eye className="w-3 h-3 text-neon-green" />
              <span className="text-neon-green/70 uppercase tracking-widest">Live Preview</span>
            </div>
            <div className="flex-1 rounded-b-lg overflow-y-auto p-6"
              style={{ background: "rgba(10,15,30,0.7)", border: "1px solid rgba(0,255,136,0.1)", borderTop: "none", maxHeight: viewMode === "preview" ? 500 : 400 }}
              data-color-mode="dark">
              {MarkdownPreview ? (
                <div className="prose-cyber">
                  <MarkdownPreview source={content} style={{ background: "transparent", color: "#e2e8f0" }} />
                </div>
              ) : (
                <pre className="text-xs text-text-muted whitespace-pre-wrap">{content}</pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Page Size</label>
          <div className="flex gap-2">
            {(["a4", "letter"] as PageSize[]).map((s) => (
              <button key={s} onClick={() => setPageSize(s)}
                className="flex-1 py-2 text-xs font-mono rounded-lg border transition-all uppercase"
                style={{
                  background: pageSize === s ? "rgba(0,245,255,0.1)" : "transparent",
                  borderColor: pageSize === s ? "rgba(0,245,255,0.4)" : "rgba(0,245,255,0.1)",
                  color: pageSize === s ? "#00f5ff" : "#475569",
                }}>{s}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">
            Font Size: <span className="text-neon-cyan">{fontSize}pt</span>
          </label>
          <input type="range" min={8} max={20} value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(90deg,#00f5ff ${((fontSize-8)/12)*100}%,rgba(0,245,255,0.2) ${((fontSize-8)/12)*100}%)` }}
          />
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-3 flex-wrap">
        <motion.button onClick={handleExport} disabled={isExporting}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex-1 btn-neon-green py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm disabled:opacity-50">
          {isExporting ? (
            <><motion.div className="w-4 h-4 border-2 border-neon-green border-t-transparent rounded-full"
              animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />GENERATING PDF...</>
          ) : (
            <><Download className="w-4 h-4" />EXPORT AS PDF</>
          )}
        </motion.button>
        <button onClick={downloadMarkdown}
          className="flex items-center gap-2 px-5 py-3.5 text-sm font-mono border rounded-lg transition-all"
          style={{ borderColor: "rgba(0,245,255,0.2)", color: "#94a3b8" }}>
          <FileEdit className="w-4 h-4" />Save .md
        </button>
      </div>
    </div>
  );
}