"use client";

import { useState, useEffect, useCallback, type ReactElement } from "react";
import { motion } from "framer-motion";
import {
  FileEdit, Eye, Download, Save, RotateCcw, Type,
  Underline as UnderlineIcon, Highlighter, Palette, Superscript, Subscript,
  Eraser, AlignLeft, AlignCenter, AlignRight, AlignJustify, SeparatorHorizontal,
  ClipboardPaste, ClipboardCopy, CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/utils";
import dynamic from "next/dynamic";
import rehypeRaw from "rehype-raw";
import { generateMarkdownPdf } from "@/lib/markdown-pdf";
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

// ─────────────────────────────────────────────────────────────────────────
// Custom toolbar commands.
//
// Standard Markdown/GFM has no syntax for underline, highlight, text color,
// superscript, or subscript (deliberately, in most cases, to avoid ambiguity
// with other syntax) — so each of these wraps the selection in a small,
// conventional inline HTML tag instead. This is the same technique the
// pre-existing Underline command already used. Three things all read this
// same convention the same way, so it stays correct everywhere at once:
//   1. marked (the parser) passes inline HTML through as its own token type
//   2. the live preview renders it via rehype-raw below
//   3. lib/markdown-pdf.ts's flattenInline() recognizes exactly these tags
//      (<u>, <mark style="background:#hex">, <span style="color:#hex">,
//      <sup>, <sub>) and turns them into real PDF text styling — not just a
//      visual effect in the browser preview.
//
// Alignment works differently: it's block-level, not inline, and wrapping a
// paragraph in a raw HTML <div> would make marked treat the whole thing as
// one opaque, non-markdown blob (bold/links/etc. inside it would stop
// working). Instead these commands prepend a plain {center}/{right}/
// {justify} marker to the paragraph's own first line, which
// lib/markdown-pdf.ts strips back out before laying out that paragraph's
// normal, fully-formatted content.
// ─────────────────────────────────────────────────────────────────────────

const UNDERLINE_ICON = <UnderlineIcon size={13} />;

function swatchIcon(hex: string): ReactElement {
  return (
    <span
      aria-hidden
      style={{
        width: 14, height: 14, borderRadius: 3, background: hex,
        display: "inline-block", border: "1px solid rgba(255,255,255,0.35)",
      }}
    />
  );
}

const HIGHLIGHT_COLORS = [
  { label: "Yellow", hex: "#ffeb3b" },
  { label: "Green", hex: "#a7f3d0" },
  { label: "Pink", hex: "#fbcfe8" },
  { label: "Cyan", hex: "#a5f3fc" },
];

const TEXT_COLORS = [
  { label: "Red", hex: "#dc2626" },
  { label: "Blue", hex: "#2563eb" },
  { label: "Green", hex: "#16a34a" },
  { label: "Purple", hex: "#9333ea" },
];

function buildColorGroupCommand(
  commandsApi: typeof import("@uiw/react-md-editor")["commands"],
  opts: {
    name: string;
    label: string;
    icon: ReactElement;
    colors: { label: string; hex: string }[];
    wrap: (hex: string, text: string) => string;
  }
): ICommand {
  return commandsApi.group(
    opts.colors.map((c) => ({
      name: `${opts.name}-${c.label.toLowerCase()}`,
      keyCommand: `${opts.name}-${c.label.toLowerCase()}`,
      buttonProps: { "aria-label": c.label, title: c.label },
      icon: swatchIcon(c.hex),
      execute: (state: { selectedText: string }, api: { replaceSelection: (t: string) => void }) => {
        api.replaceSelection(opts.wrap(c.hex, state.selectedText || "text"));
      },
    })),
    {
      name: opts.name,
      groupName: opts.name,
      buttonProps: { "aria-label": opts.label, title: opts.label },
      icon: opts.icon,
    }
  );
}

const ALIGN_MARKER_RE = /^\{(center|right|justify)\}\s?/;

function alignCommand(align: "left" | "center" | "right" | "justify", icon: ReactElement, label: string): ICommand {
  return {
    name: `align-${align}`,
    keyCommand: `align-${align}`,
    buttonProps: { "aria-label": label, title: label },
    icon,
    execute: (state, api) => {
      const text = state.text;
      const pos = state.selection.start;
      const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
      let lineEnd = text.indexOf("\n", pos);
      if (lineEnd === -1) lineEnd = text.length;
      const line = text.slice(lineStart, lineEnd);

      // Insert after a heading's #'s, if any — never before them, or the
      // line stops parsing as a heading at all.
      const prefixMatch = line.match(/^(#{1,6}\s+)/);
      const prefixLen = prefixMatch ? prefixMatch[0].length : 0;
      const head = line.slice(0, prefixLen);
      const rest = line.slice(prefixLen);

      const existing = rest.match(ALIGN_MARKER_RE);
      let newRest: string;
      if (align === "left") {
        newRest = existing ? rest.slice(existing[0].length) : rest;
      } else if (existing && existing[1] === align) {
        newRest = rest.slice(existing[0].length); // toggle off
      } else if (existing) {
        newRest = `{${align}} ` + rest.slice(existing[0].length); // switch
      } else {
        newRest = `{${align}} ` + rest;
      }

      api.setSelectionRange({ start: lineStart, end: lineEnd });
      api.replaceSelection(head + newRest);
    },
  };
}

// Converts pasted rich-HTML clipboard content to the Markdown (+ our inline
// HTML extensions) this editor understands. Beyond turndown's own defaults
// — which only recognize semantic tags like <b>/<i>/<u> — this also reads
// inline CSS on <span> elements. Google Docs and many other rich-text
// sources paste formatting as style="font-weight:700" rather than
// <strong>, and turndown's defaults silently drop that: bold/italic would
// vanish on paste rather than survive it, which is exactly the "flatten
// rich content to plain text" failure this tool needs to avoid.
async function htmlToMarkdown(html: string): Promise<string> {
  const { default: TurndownService } = await import("turndown");
  const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", emDelimiter: "*" });

  turndown.addRule("underline", { filter: ["u"], replacement: (text) => `<u>${text}</u>` });
  turndown.addRule("mark", {
    filter: ["mark"],
    replacement: (text, node) => {
      const bg = (node as HTMLElement).style?.backgroundColor || "#ffeb3b";
      return `<mark style="background:${bg}">${text}</mark>`;
    },
  });
  turndown.addRule("styledSpan", {
    filter: (node) => {
      if (node.nodeName !== "SPAN") return false;
      const style = (node as HTMLElement).getAttribute("style") || "";
      return /font-weight:\s*(bold|[6-9]00)/i.test(style)
        || /font-style:\s*italic/i.test(style)
        || /text-decoration:\s*[^;]*underline/i.test(style);
    },
    replacement: (text, node) => {
      const style = (node as HTMLElement).getAttribute("style") || "";
      let result = text;
      if (/text-decoration:\s*[^;]*underline/i.test(style)) result = `<u>${result}</u>`;
      if (/font-style:\s*italic/i.test(style)) result = `*${result}*`;
      if (/font-weight:\s*(bold|[6-9]00)/i.test(style)) result = `**${result}**`;
      return result;
    },
  });

  return turndown.turndown(html);
}

const AUTOSAVE_KEY = "toolsbar_text_to_pdf_content";

const DEFAULT_CONTENT = `# My Document

Write your content here using **Markdown** formatting.

## What's Supported

- **Bold**, *italic*, <u>underline</u>, ~~strikethrough~~
- <mark style="background:#ffeb3b">Highlight</mark> and <span style="color:#2563eb">color</span>
- \`Inline code\`
- [Hyperlinks](https://toolsbar.com) — real clickable links in the exported PDF

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
  const [fontFamily, setFontFamily] = useState<PdfFontFamily>("lora");
  const [isExporting, setIsExporting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editorCommands, setEditorCommands] = useState<ICommand[] | undefined>(undefined);

  // Build the toolbar's full command list once the editor package has
  // loaded (it's dynamically imported above, so its `commands` helpers
  // aren't available until then): all of @uiw/react-md-editor's defaults,
  // plus Underline, Highlight, Text Color, Superscript, Subscript, Clear
  // Formatting, Alignment, and Page Break.
  useEffect(() => {
    let cancelled = false;
    import("@uiw/react-md-editor").then((m) => {
      if (cancelled) return;

      const underlineCommand: ICommand = {
        name: "underline",
        keyCommand: "underline",
        shortcuts: "ctrlcmd+u",
        buttonProps: { "aria-label": "Underline", title: "Underline (Ctrl+U)" },
        icon: UNDERLINE_ICON,
        execute: (state, api) => {
          api.replaceSelection(`<u>${state.selectedText || "underlined text"}</u>`);
        },
      };

      const highlightGroup = buildColorGroupCommand(m.commands, {
        name: "highlight",
        label: "Highlight",
        icon: <Highlighter size={13} />,
        colors: HIGHLIGHT_COLORS,
        wrap: (hex, text) => `<mark style="background:${hex}">${text}</mark>`,
      });

      const colorGroup = buildColorGroupCommand(m.commands, {
        name: "text-color",
        label: "Text color",
        icon: <Palette size={13} />,
        colors: TEXT_COLORS,
        wrap: (hex, text) => `<span style="color:${hex}">${text}</span>`,
      });

      const superscriptCommand: ICommand = {
        name: "superscript",
        keyCommand: "superscript",
        buttonProps: { "aria-label": "Superscript", title: "Superscript" },
        icon: <Superscript size={13} />,
        execute: (state, api) => api.replaceSelection(`<sup>${state.selectedText || "text"}</sup>`),
      };

      const subscriptCommand: ICommand = {
        name: "subscript",
        keyCommand: "subscript",
        buttonProps: { "aria-label": "Subscript", title: "Subscript" },
        icon: <Subscript size={13} />,
        execute: (state, api) => api.replaceSelection(`<sub>${state.selectedText || "text"}</sub>`),
      };

      const clearFormattingCommand: ICommand = {
        name: "clear-formatting",
        keyCommand: "clear-formatting",
        buttonProps: { "aria-label": "Clear formatting", title: "Clear formatting" },
        icon: <Eraser size={13} />,
        execute: (state, api) => {
          if (!state.selectedText) return;
          const cleared = state.selectedText
            .replace(/<\/?(u|sup|sub|mark|span)(?:\s+style="[^"]*")?>/gi, "")
            .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
            .replace(/\*\*(.+?)\*\*/g, "$1")
            .replace(/\*(.+?)\*/g, "$1")
            .replace(/~~(.+?)~~/g, "$1")
            .replace(/`(.+?)`/g, "$1");
          api.replaceSelection(cleared);
        },
      };

      const alignGroup = m.commands.group(
        [
          alignCommand("left", <AlignLeft size={13} />, "Align left"),
          alignCommand("center", <AlignCenter size={13} />, "Align center"),
          alignCommand("right", <AlignRight size={13} />, "Align right"),
          alignCommand("justify", <AlignJustify size={13} />, "Justify"),
        ],
        {
          name: "align",
          groupName: "align",
          buttonProps: { "aria-label": "Alignment", title: "Alignment" },
          icon: <AlignLeft size={13} />,
        }
      );

      const pageBreakCommand: ICommand = {
        name: "page-break",
        keyCommand: "page-break",
        buttonProps: { "aria-label": "Insert page break", title: "Insert page break in PDF" },
        icon: <SeparatorHorizontal size={13} />,
        execute: (_state, api) => {
          api.replaceSelection('\n\n<div class="pdf-pagebreak"></div>\n\n');
        },
      };

      const insertDateCommand: ICommand = {
        name: "insert-date",
        keyCommand: "insert-date",
        buttonProps: { "aria-label": "Insert today's date", title: "Insert today's date" },
        icon: <CalendarDays size={13} />,
        execute: (_state, api) => {
          const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
          api.replaceSelection(today);
        },
      };

      setEditorCommands([
        ...m.commands.getCommands(),
        underlineCommand,
        highlightGroup,
        colorGroup,
        superscriptCommand,
        subscriptCommand,
        clearFormattingCommand,
        alignGroup,
        pageBreakCommand,
        insertDateCommand,
      ]);
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

  // Inserts text at the editor's current cursor position. MDEditor doesn't
  // expose an imperative "insert" API, but it does render a real <textarea>
  // (class name confirmed against the installed package) whose native
  // selectionStart/selectionEnd we can read directly — the same technique
  // the toolbar commands above use via MDEditor's own internal api object.
  const insertAtCursor = useCallback((insertText: string) => {
    const textarea = document.querySelector<HTMLTextAreaElement>(".w-md-editor-text-input");
    if (textarea) {
      const start = textarea.selectionStart ?? content.length;
      const end = textarea.selectionEnd ?? content.length;
      const next = content.slice(0, start) + insertText + content.slice(end);
      setContent(next);
      requestAnimationFrame(() => {
        textarea.focus();
        const pos = start + insertText.length;
        textarea.setSelectionRange(pos, pos);
      });
    } else {
      setContent((c) => c + insertText);
    }
  }, [content]);

  async function handlePaste() {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) {
        toast.error("Clipboard access isn't available — try Ctrl+V / long-press paste in the editor instead.");
        return;
      }
      if ("read" in navigator.clipboard) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes("text/html")) {
            const blob = await item.getType("text/html");
            const html = await blob.text();
            const md = await htmlToMarkdown(html);
            insertAtCursor(md);
            toast.success("Pasted with formatting");
            return;
          }
        }
        for (const item of items) {
          if (item.types.includes("text/plain")) {
            const blob = await item.getType("text/plain");
            insertAtCursor(await blob.text());
            toast.success("Pasted");
            return;
          }
        }
      }
      // Clipboard.read() unsupported in this browser — plain-text fallback.
      const text = await navigator.clipboard.readText();
      insertAtCursor(text);
      toast.success("Pasted");
    } catch (err) {
      console.error("[TextToPdf] paste error:", err);
      toast.error("Couldn't read the clipboard — your browser may be blocking permission. Try Ctrl+V in the editor directly.");
    }
  }

  async function handleCopy() {
    try {
      const { marked } = await import("marked");
      const html = await marked(content, { async: false }) as string;
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard && "write" in navigator.clipboard) {
        const item = new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([content], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
        toast.success("Copied with formatting");
        return;
      }
      await navigator.clipboard.writeText(content);
      toast.success("Copied");
    } catch (err) {
      console.error("[TextToPdf] copy error:", err);
      try {
        await navigator.clipboard.writeText(content);
        toast.success("Copied as plain text");
      } catch {
        toast.error("Couldn't copy — check clipboard permissions.");
      }
    }
  }

  async function handleExport() {
    if (!content.trim()) { toast.error("Nothing to export!"); return; }
    setIsExporting(true);
    try {
      const { pageCount } = await generateAndDownload();
      toast.success(`PDF exported — ${pageCount} page${pageCount === 1 ? "" : "s"}`);
    } catch (err) {
      console.error("[TextToPdf] export error:", err);
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  async function generateAndDownload() {
    // Real vector-text PDF generation (lib/markdown-pdf.ts) — draws with
    // jsPDF's native text API instead of rasterizing the page, so
    // pagination is based on actual line positions (nothing is ever cut
    // mid-line) and links become real clickable annotations, not just
    // blue pixels in a screenshot. See that file for the full design
    // rationale.
    const { blob, pageCount } = await generateMarkdownPdf(content, {
      pageSize,
      fontFamily,
      fontSize,
    });
    downloadBlob(blob, "document.pdf");
    return { pageCount };
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
      <div className={`gap-4 ${viewMode === "split" ? "grid grid-cols-1 lg:grid-cols-2" : "block"}`} style={{ minHeight: 400 }}>
        {viewMode !== "preview" && (
          <div className="flex flex-col" style={{ minHeight: 400 }}>
            <div className="text-[10px] font-mono px-3 py-1.5 rounded-t-lg flex items-center justify-between gap-2 flex-wrap"
              style={{ background: "rgba(0,245,255,0.06)", border: "1px solid rgba(0,245,255,0.1)" }}>
              <div className="flex items-center gap-2">
                <Type className="w-3 h-3 text-neon-cyan" />
                <span className="text-neon-cyan/70 uppercase tracking-widest">Markdown Editor</span>
              </div>
              {/* Large, clearly-labeled Paste/Copy — separate from the dense
                  toolbar row above since these need to be easy to find and
                  tap on mobile, not buried among 20+ small icons. */}
              <div className="flex items-center gap-1.5">
                <button onClick={handlePaste} type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wide transition-all"
                  style={{ background: "rgba(0,245,255,0.1)", color: "#00f5ff", minHeight: 32 }}
                  aria-label="Paste from clipboard" title="Paste from clipboard">
                  <ClipboardPaste className="w-3.5 h-3.5" />Paste
                </button>
                <button onClick={handleCopy} type="button"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wide transition-all"
                  style={{ background: "rgba(0,245,255,0.1)", color: "#00f5ff", minHeight: 32 }}
                  aria-label="Copy document" title="Copy document">
                  <ClipboardCopy className="w-3.5 h-3.5" />Copy
                </button>
              </div>
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
                  <MarkdownPreview source={content} style={{ background: "transparent", color: "#e2e8f0" }} rehypePlugins={[rehypeRaw]} />
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
