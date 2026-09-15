"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { FileEdit, Eye, Download, Save, RotateCcw, Type, Underline as UnderlineIcon } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/utils";
import dynamic from "next/dynamic";
import rehypeRaw from "rehype-raw";
import { generateMarkdownPdf, preprocessWhitespace } from "@/lib/markdown-pdf";
import { PDF_FONT_LABELS, type PdfFontFamily } from "@/lib/pdf-fonts";
import type { ICommand } from "@uiw/react-md-editor";

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

- **Bold**, *italic*, <u>underline</u>, ~~strikethrough~~
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
  const [fontFamily, setFontFamily] = useState<PdfFontFamily>("lora");
  const [fontSize, setFontSize]   = useState(12);
  const [isExporting, setIsExporting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editorCommands, setEditorCommands] = useState<ICommand[] | undefined>(undefined);

  // Build the toolbar's command list once the editor package has loaded.
  // PART 2 SCOPE: unchanged from the original — still just all of
  // @uiw/react-md-editor's defaults plus the pre-existing Underline
  // command. New toolbar commands (highlight/color/sup/sub/alignment/
  // page-break) are Part 4/6 work, not touched here.
  useEffect(() => {
    let cancelled = false;
    import("@uiw/react-md-editor").then((m) => {
      if (cancelled) return;
      const underlineCommand: ICommand = {
        name: "underline",
        keyCommand: "underline",
        shortcuts: "ctrlcmd+u",
        buttonProps: { "aria-label": "Underline", title: "Underline (Ctrl+U)" },
        icon: <UnderlineIcon size={12} />,
        execute: (state, api) => {
          api.replaceSelection(`<u>${state.selectedText || "underlined text"}</u>`);
        },
      };
      setEditorCommands([...m.commands.getCommands(), underlineCommand]);
    });
    return () => { cancelled = true; };
  }, []);

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

  // ───────────────────────────────────────────────────────────────────
  // PART 2 CHANGE — this is the only functional change in this file.
  //
  // BEFORE: marked() -> HTML string -> off-screen div -> html2canvas
  // (one giant raster image) -> jsPDF.addImage(), sliced by raw pixel
  // height with no awareness of line/paragraph boundaries. That's the
  // root cause Part 1 traced the clipping/spacing/line-break bugs to.
  //
  // AFTER: lib/markdown-pdf.ts walks marked's token stream directly and
  // draws real vector text with jsPDF's own text API, so every line has
  // a known position and a page break can only happen between lines.
  // Font is jsPDF's built-in Times face for this Part only — the real
  // font system (and Bengali-script coverage) is Part 3.
  // ───────────────────────────────────────────────────────────────────
  async function handleExport() {
    if (!content.trim()) { toast.error("Nothing to export!"); return; }
    setIsExporting(true);
    try {
      const { blob, pageCount } = await generateMarkdownPdf(content, { pageSize, fontFamily, fontSize });
      downloadBlob(blob, "document.pdf");
      toast.success(`PDF exported — ${pageCount} page${pageCount === 1 ? "" : "s"}`);
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

  // PART 2 FIX: the preview must go through the exact same whitespace
  // preprocessing as the PDF export — otherwise "3 blank lines = extra
  // gap" or "a line break stays a line break" could be true in the PDF
  // but false in the editor's own preview, which is the mismatch Part 2
  // exists to prevent. preprocessWhitespace (lib/markdown-pdf.ts) now
  // handles line breaks via CommonMark's own hard-break syntax, so no
  // extra remark plugin/dependency is needed here for it to work.
  const previewSource = useMemo(() => preprocessWhitespace(content), [content]);

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
      <div className={`gap-4 ${viewMode === "split" ? "grid grid-cols-1 lg:grid-cols-2" : "block"}`} style={{ minHeight: 400 }}>
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
                commands={editorCommands}
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
                  <MarkdownPreview
                    source={previewSource}
                    style={{ background: "transparent", color: "#e2e8f0" }}
                    rehypePlugins={[rehypeRaw]}
                  />
                </div>
              ) : (
                <pre className="text-xs text-text-muted whitespace-pre-wrap">{content}</pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Page Size</label>
          <div className="flex gap-2">
            {(["a4", "letter"] as PageSize[]).map((s) => (
              <button key={s} onClick={() => setPageSize(s)}
                className="flex-1 py-2.5 text-xs font-mono rounded-lg border transition-all uppercase"
                style={{
                  background: pageSize === s ? "rgba(0,245,255,0.1)" : "transparent",
                  borderColor: pageSize === s ? "rgba(0,245,255,0.4)" : "rgba(0,245,255,0.1)",
                  color: pageSize === s ? "#00f5ff" : "#475569",
                  minHeight: 40,
                }}>{s}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">Font</label>
          <div className="flex gap-2">
            {(Object.keys(PDF_FONT_LABELS) as PdfFontFamily[]).map((f) => (
              <button key={f} onClick={() => setFontFamily(f)}
                className="flex-1 py-2.5 text-[11px] font-mono rounded-lg border transition-all"
                style={{
                  background: fontFamily === f ? "rgba(0,245,255,0.1)" : "transparent",
                  borderColor: fontFamily === f ? "rgba(0,245,255,0.4)" : "rgba(0,245,255,0.1)",
                  color: fontFamily === f ? "#00f5ff" : "#475569",
                  minHeight: 40,
                }}
                title={PDF_FONT_LABELS[f].description}
              >{PDF_FONT_LABELS[f].label}</button>
            ))}
          </div>
          <p className="text-[10px] font-mono text-text-muted/60 mt-1.5">
            Bengali text uses Noto Sans Bengali automatically, regardless of this choice.
          </p>
        </div>

        <div>
          <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">
            Font Size: <span className="text-neon-cyan">{fontSize}pt</span>
          </label>
          <input type="range" min={8} max={20} value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ background: `linear-gradient(90deg,#00f5ff ${((fontSize-8)/12)*100}%,rgba(0,245,255,0.2) ${((fontSize-8)/12)*100}%)`, marginTop: 14 }}
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