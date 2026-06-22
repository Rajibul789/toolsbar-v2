"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Download, Package } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal, DownloadButton } from "@/components/tools/ResultReveal";
import { formatBytes, downloadBlob } from "@/lib/utils";
import { toast } from "sonner";

type ProcessState = "idle" | "processing" | "complete" | "error";
type SplitMode = "all" | "range" | "evens" | "odds";

interface PageResult {
  name: string;
  blob: Blob;
  url: string;
  size: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseRanges(input: string, total: number): number[] {
  const pages = new Set<number>();
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      for (let i = a; i <= Math.min(b, total); i++) {
        if (i >= 1) pages.add(i);
      }
    } else {
      const n = Number(part);
      if (n >= 1 && n <= total) pages.add(n);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

/** Convert base64 string → Blob */
function base64ToBlob(base64: string, mimeType = "application/pdf"): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

// ── Component ────────────────────────────────────────────────────────────────

export function PdfSplit() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ProcessState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [results, setResults] = useState<PageResult[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<SplitMode>("all");
  const [rangeStr, setRangeStr] = useState("1-3, 5, 7-9");

  // ── File drop ──────────────────────────────────────────────────
  const onDrop = useCallback((files: File[]) => {
    setFile(files[0]);
    setState("idle");
    setResults([]);
    setPageCount(0);
    previewPageCount(files[0]);
  }, []);

  async function previewPageCount(f: File) {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const bytes = await f.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      setPageCount(doc.numPages);
      doc.destroy();
    } catch {
      // Non-critical — proceed without page count
    }
  }

  // ── Browser-side split using pdf-lib ───────────────────────────
  async function splitInBrowser(f: File, pages: number[]): Promise<PageResult[]> {
    const { PDFDocument } = await import("pdf-lib");

    setStatus("LOADING PDF INTO MEMORY...");
    setProgress(15);

    const sourceBytes = await f.arrayBuffer();
    const srcDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const out: PageResult[] = [];

    for (let i = 0; i < pages.length; i++) {
      const pageNum = pages[i];
      setStatus(`EXTRACTING PAGE ${pageNum}${pageCount ? ` OF ${pageCount}` : ""}...`);
      setProgress(15 + Math.round(((i + 1) / pages.length) * 75));

      const newDoc = await PDFDocument.create();
      const [copied] = await newDoc.copyPages(srcDoc, [pageNum - 1]);
      newDoc.addPage(copied);

      const uint8 = await newDoc.save();
      const blob = new Blob([uint8.buffer as ArrayBuffer], { type: "application/pdf" });
      out.push({
        name: `page_${String(pageNum).padStart(3, "0")}.pdf`,
        blob,
        url: URL.createObjectURL(blob),
        size: blob.size,
      });

      // Yield to keep UI responsive
      await new Promise((r) => setTimeout(r, 10));
    }

    return out;
  }

  // ── Server-side split via Next.js API route ─────────────────────
  // Mirrors the original Express backend (pdf-split-backend-main/index.js)
  // but runs inside Next.js — no external URL, no Ghostscript needed.
  async function splitViaApiRoute(f: File, pages: number[]): Promise<PageResult[]> {
    setStatus("SENDING TO SERVER-SIDE PROCESSOR...");
    setProgress(20);

    const form = new FormData();
    form.append("pdf", f);
    // Pass page list so the server only extracts what we need
    if (pages.length > 0 && pages.length !== pageCount) {
      form.append("pages", pages.join(","));
    }

    const res = await fetch("/api/pdf/split", { method: "POST", body: form });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown server error" }));
      throw new Error(err.error ?? "Server-side split failed");
    }

    setProgress(80);
    setStatus("RECONSTRUCTING PAGES...");

    const data: Array<{ name: string; data: string }> = await res.json();

    const out: PageResult[] = data.map((item) => {
      const blob = base64ToBlob(item.data);
      return {
        name: item.name,
        blob,
        url: URL.createObjectURL(blob),
        size: blob.size,
      };
    });

    return out;
  }

  // ── Main handler ───────────────────────────────────────────────
  async function handleSplit() {
    if (!file) { toast.error("Please upload a PDF first."); return; }

    setState("processing");
    setProgress(5);
    setStatus("INITIALIZING PDF PARSER...");

    // Revoke previous object URLs to avoid memory leaks
    results.forEach((r) => URL.revokeObjectURL(r.url));

    try {
      // If page count is still unknown (user clicked fast), load it now
      let resolvedPageCount = pageCount;
      if (resolvedPageCount === 0) {
        setStatus("READING DOCUMENT STRUCTURE...");
        setProgress(8);
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        const bytes = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
        resolvedPageCount = doc.numPages;
        setPageCount(resolvedPageCount);
        doc.destroy();
      }

      // Determine selected pages
      let selected: number[] = [];
      switch (mode) {
        case "all":
          selected = Array.from({ length: resolvedPageCount }, (_, i) => i + 1);
          break;
        case "range":
          selected = parseRanges(rangeStr, resolvedPageCount);
          if (selected.length === 0) {
            toast.error("No valid page numbers in the range.");
            setState("idle");
            return;
          }
          break;
        case "evens":
          selected = Array.from({ length: resolvedPageCount }, (_, i) => i + 1).filter((n) => n % 2 === 0);
          break;
        case "odds":
          selected = Array.from({ length: resolvedPageCount }, (_, i) => i + 1).filter((n) => n % 2 !== 0);
          break;
      }

      if (selected.length === 0) {
        toast.error("No pages match the selected mode.");
        setState("idle");
        return;
      }

      let splitResults: PageResult[];

      // Strategy:
      //  • Files ≤ 20 MB → split in the browser (zero network, instant)
      //  • Files > 20 MB → use integrated Next.js API route (pdf-lib in Node.js)
      const BROWSER_LIMIT = 20 * 1024 * 1024;

      if (file.size <= BROWSER_LIMIT) {
        splitResults = await splitInBrowser(file, selected);
      } else {
        setStatus("FILE TOO LARGE FOR IN-BROWSER PROCESSING — USING SERVER...");
        splitResults = await splitViaApiRoute(file, selected);
      }

      setResults(splitResults);
      setProgress(100);
      setState("complete");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Split failed. Please try again.";
      console.error("[PdfSplit]", err);
      toast.error(msg);
      setState("error");
    }
  }

  // ── Download all as ZIP ────────────────────────────────────────
  async function downloadAll() {
    if (results.length === 0) return;

    if (results.length === 1) {
      downloadBlob(results[0].blob, results[0].name);
      return;
    }

    try {
      toast("Packaging ZIP…");
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      results.forEach((r) => zip.file(r.name, r.blob));
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      const baseName = file?.name.replace(/\.pdf$/i, "") ?? "split";
      downloadBlob(zipBlob, `${baseName}_split.zip`);
    } catch {
      // Fallback: download individually
      results.forEach((r, i) => setTimeout(() => downloadBlob(r.blob, r.name), i * 200));
    }
  }

  function handleReset() {
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setFile(null);
    setResults([]);
    setState("idle");
    setProgress(0);
    setPageCount(0);
  }

  // ── Split mode options ─────────────────────────────────────────
  const MODES: { id: SplitMode; label: string; desc: string }[] = [
    { id: "all",   label: "All Pages",    desc: "Extract every page separately" },
    { id: "range", label: "Custom Range", desc: "Specify pages and ranges" },
    { id: "evens", label: "Even Pages",   desc: "Pages 2, 4, 6, 8…" },
    { id: "odds",  label: "Odd Pages",    desc: "Pages 1, 3, 5, 7…" },
  ];

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">

        {/* ── IDLE ── */}
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <UploadZone
              onDrop={onDrop}
              accept={{ "application/pdf": [".pdf"] }}
              accentColor="cyan"
              currentFiles={file ? [file] : []}
              onRemoveFile={() => { setFile(null); setPageCount(0); }}
              maxSizeMb={50}
            />

            {file && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                {/* Page count badge */}
                {pageCount > 0 && (
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono"
                    style={{ background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.15)" }}
                  >
                    <span className="text-neon-cyan">▸</span>
                    <span className="text-text-muted">
                      Document contains{" "}
                      <span className="text-neon-cyan font-bold">{pageCount} pages</span>
                      {file.size > 20 * 1024 * 1024 && (
                        <span className="ml-2 text-neon-yellow">
                          · Large file — server-side processing will be used
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Split mode selector */}
                <div>
                  <p className="text-xs font-mono text-text-muted uppercase tracking-wider mb-3">Split Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    {MODES.map(({ id, label, desc }) => (
                      <button
                        key={id}
                        onClick={() => setMode(id)}
                        className="text-left rounded-lg px-3 py-2.5 transition-all duration-150"
                        style={{
                          background: mode === id ? "rgba(0,245,255,0.10)" : "rgba(0,245,255,0.03)",
                          border: `1px solid ${mode === id ? "rgba(0,245,255,0.40)" : "rgba(0,245,255,0.10)"}`,
                        }}
                      >
                        <p className="text-xs font-mono font-semibold" style={{ color: mode === id ? "#00f5ff" : "#e2e8f0" }}>
                          {label}
                        </p>
                        <p className="text-[11px] font-mono text-text-muted mt-0.5">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom range input */}
                {mode === "range" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                    <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">
                      Page Ranges
                    </label>
                    <input
                      type="text"
                      value={rangeStr}
                      onChange={(e) => setRangeStr(e.target.value)}
                      placeholder="e.g. 1-3, 5, 7-9"
                      className="input-cyber w-full"
                    />
                    <p className="text-[11px] font-mono text-text-muted mt-1.5">
                      Separate individual pages and ranges with commas
                    </p>
                  </motion.div>
                )}

                {/* Split button */}
                <button
                  onClick={handleSplit}
                  className="w-full btn-neon py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm"
                >
                  <Scissors className="w-4 h-4" />
                  SPLIT PDF
                </button>

                {/* Processing note */}
                <p className="text-center text-[11px] font-mono text-text-muted">
                  {file.size <= 20 * 1024 * 1024
                    ? "🔒 Processed entirely in your browser — file never leaves your device"
                    : "⚡ Large file — processed server-side via integrated Next.js API route"}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── PROCESSING ── */}
        {state === "processing" && (
          <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CyberScanner statusText={status} progress={progress} />
          </motion.div>
        )}

        {/* ── COMPLETE ── */}
        {state === "complete" && results.length > 0 && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultReveal onReset={handleReset} successMessage="SPLIT COMPLETE">
              <div className="space-y-4">
                {/* Summary row */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl px-5 py-4 sm:py-3"
                  style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.12)" }}
                >
                  <div>
                    <p className="text-xl font-display font-black text-neon-cyan">{results.length}</p>
                    <p className="text-xs font-mono text-text-muted">
                      {results.length === 1 ? "Page extracted" : "Pages extracted"}
                    </p>
                  </div>
                  <DownloadButton
                    onClick={downloadAll}
                    label={results.length === 1 ? "Download Page" : "Download All as ZIP"}
                    color="cyan"
                    className="w-full sm:w-auto"
                  />
                </div>

                {/* Per-page list */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
                      style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.08)" }}
                    >
                      <span className="text-xs font-mono text-neon-cyan/50 w-6 flex-shrink-0">{i + 1}</span>
                      <span className="flex-1 min-w-0 truncate text-xs font-mono text-text-primary">{r.name}</span>
                      <span className="text-[11px] font-mono text-text-muted flex-shrink-0">{formatBytes(r.size)}</span>
                      <button
                        onClick={() => downloadBlob(r.blob, r.name)}
                        className="w-7 h-7 flex items-center justify-center rounded border border-neon-cyan/15 text-text-muted hover:text-neon-cyan hover:border-neon-cyan/35 transition-all flex-shrink-0"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* ZIP download (when > 1 page) */}
                {results.length > 1 && (
                  <button
                    onClick={downloadAll}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border text-sm font-mono transition-all"
                    style={{ borderColor: "rgba(0,245,255,0.2)", color: "#94a3b8" }}
                  >
                    <Package className="w-4 h-4" />
                    Download All {results.length} Pages as ZIP
                  </button>
                )}
              </div>
            </ResultReveal>
          </motion.div>
        )}

        {/* ── ERROR ── */}
        {state === "error" && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div
              className="rounded-xl p-6 text-center"
              style={{ background: "rgba(255,0,60,0.05)", border: "1px solid rgba(255,0,60,0.2)" }}
            >
              <p className="text-sm font-mono text-neon-red mb-4">SPLIT FAILED</p>
              <button onClick={handleReset} className="btn-neon text-sm">Try Again</button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}