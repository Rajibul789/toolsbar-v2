"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Download, Info, AlertTriangle, Lock, ShieldCheck } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal, DownloadButton } from "@/components/tools/ResultReveal";
import { formatBytes, downloadBlob } from "@/lib/utils";
import { toast } from "sonner";
import { PdfSplitError, type SplitProgress } from "@/lib/pdf-split/types";
import { selectPages, type SplitMode } from "@/lib/pdf-split/ranges";
import { splitPdf, type PipelineDeps } from "@/lib/pdf-split/pipeline";
import { createBrowserPipelineDeps } from "@/lib/pdf-split/browser";
import { createHttpServerClient } from "@/lib/pdf-split/client";
import { hybridSplit, type FallbackReason } from "@/lib/pdf-split/hybrid";

type ProcessState = "idle" | "processing" | "password" | "consent" | "complete" | "error";

interface PageResult {
  name: string;
  blob: Blob;
  url: string;
  size: number;
  /** False for image-based (rasterised) pages */
  textPreserved: boolean;
}

/** Files above this size only get a heads-up toast; they are still processed locally first. */
const LARGE_FILE_NOTICE_BYTES = 20 * 1024 * 1024; // 20 MB

/** Progress bar span for each pipeline stage. */
const STAGE_SPAN: Record<SplitProgress["stage"], [number, number, string]> = {
  inspect: [5, 12, "READING DOCUMENT STRUCTURE"],
  qpdf:    [12, 50, "EXTRACTING PAGES (QPDF)"],
  verify:  [50, 60, "VERIFYING PAGES"],
  pdflib:  [60, 80, "EXTRACTING PAGES (PDF-LIB)"],
  raster:  [80, 97, "RENDERING PAGES AS IMAGES"],
};

async function serverFallbackConfigured(): Promise<boolean> {
  try {
    const res = await fetch("/api/pdf/split/init", { cache: "no-store" });
    return res.ok && (await res.json()).serverFallback === true;
  } catch {
    return false;
  }
}

export function PdfSplit() {
  const [file,      setFile]      = useState<File | null>(null);
  const [state,     setState]     = useState<ProcessState>("idle");
  const [progress,  setProgress]  = useState(0);
  const [status,    setStatus]    = useState("");
  const [results,   setResults]   = useState<PageResult[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [mode,      setMode]      = useState<SplitMode>("all");
  const [rangeStr,  setRangeStr]  = useState("1-3, 5, 7-9");
  const [errorMsg,  setErrorMsg]  = useState("");
  const [password,  setPassword]  = useState("");
  const [passwordIssue, setPasswordIssue] = useState<"required" | "incorrect">("required");
  const [consentReason, setConsentReason] = useState<FallbackReason>("engine-failure");
  const [source,    setSource]    = useState<"browser" | "server" | "browser+server">("browser");
  const [missing,   setMissing]   = useState<number[]>([]);

  const depsRef    = useRef<PipelineDeps | null>(null);
  const consentRef = useRef<((agreed: boolean) => void) | null>(null);
  const getDeps = () => (depsRef.current ??= createBrowserPipelineDeps());

  const imageBased = results.filter((r) => !r.textPreserved).length;

  // ── File drop ────────────────────────────────────────────────────
  const onDrop = useCallback((files: File[]) => {
    setFile(files[0]);
    setState("idle");
    setResults([]);
    setPageCount(0);
    setPassword("");
    setMissing([]);
    previewPageCount(files[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Display-only: ignore every failure (encrypted / damaged files are handled when splitting). */
  async function previewPageCount(f: File) {
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      try {
        setPageCount(await getDeps().renderer.numPages(bytes));
      } catch {
        const { PDFDocument } = await import("pdf-lib");
        setPageCount((await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount());
      }
    } catch { /* non-critical */ }
  }

  // ── Split: browser first, server only after explicit consent ─────
  async function handleSplit(pwd?: string) {
    if (!file) { toast.error("Please upload a PDF first."); return; }

    setState("processing");
    setProgress(5);
    setStatus("INITIALISING PDF ENGINE...");
    setErrorMsg("");
    setMissing([]);
    results.forEach((r) => URL.revokeObjectURL(r.url));

    if (file.size > LARGE_FILE_NOTICE_BYTES) {
      toast.info("Large PDF — splitting runs on your device first and may take a while. Keep this tab open.");
    }

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const deps = getDeps();

      const outcome = await hybridSplit(
        {
          runLocal: (o) =>
            splitPdf(
              bytes,
              {
                ...o,
                onProgress: ({ stage, done, total }) => {
                  const [from, to, label] = STAGE_SPAN[stage];
                  setProgress(Math.round(from + (to - from) * (total ? done / total : 0)));
                  setStatus(`${label}...`);
                },
              },
              deps
            ),
          server: createHttpServerClient(),
          serverAvailable: serverFallbackConfigured,
          // Nothing is uploaded unless this resolves true — i.e. the user clicks the button.
          askConsent: (reason) =>
            new Promise<boolean>((resolve) => {
              consentRef.current = resolve;
              setConsentReason(reason);
              setState("consent");
            }),
          bytes,
          fileName: file.name,
          onServerStatus: (m) => {
            setState("processing");
            setStatus(m.toUpperCase());
            setProgress(70);
          },
        },
        {
          password: pwd || undefined,
          select: (total) => selectPages(mode, rangeStr, total),
        }
      );

      const out: PageResult[] = outcome.result.pages.map((p) => {
        const blob = new Blob([p.bytes as BlobPart], { type: "application/pdf" });
        return {
          name: `page_${String(p.pageNum).padStart(3, "0")}.pdf`,
          blob,
          url: URL.createObjectURL(blob),
          size: blob.size,
          textPreserved: p.textPreserved,
        };
      });

      if (outcome.result.failed.length > 0) {
        setMissing(outcome.result.failed);
        toast.warning(`Pages ${outcome.result.failed.join(", ")} could not be extracted.`);
      }
      setSource(outcome.source);
      setResults(out);
      setProgress(100);
      setState("complete");
    } catch (err) {
      console.error("[PdfSplit]", err);
      if (err instanceof PdfSplitError && (err.code === "PASSWORD_REQUIRED" || err.code === "PASSWORD_INCORRECT")) {
        setPasswordIssue(err.code === "PASSWORD_INCORRECT" ? "incorrect" : "required");
        setPassword("");
        setState("password");
        return;
      }
      setErrorMsg(
        err instanceof PdfSplitError || err instanceof Error
          ? err.message
          : "Split failed. Please try again."
      );
      setState("error");
    }
  }

  function answerConsent(agreed: boolean) {
    consentRef.current?.(agreed);
    consentRef.current = null;
    if (agreed) { setState("processing"); setStatus("PREPARING A SECURE UPLOAD..."); setProgress(65); }
  }

  // ── Download all ─────────────────────────────────────────────────
  async function downloadAll() {
    if (results.length === 0) return;
    if (results.length === 1) { downloadBlob(results[0].blob, results[0].name); return; }
    try {
      toast("Packaging ZIP…");
      const JSZip  = (await import("jszip")).default;
      const zip    = new JSZip();
      results.forEach((r) => zip.file(r.name, r.blob));
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      downloadBlob(zipBlob, `${file?.name.replace(/\.pdf$/i, "") ?? "split"}_split.zip`);
    } catch {
      results.forEach((r, i) => setTimeout(() => downloadBlob(r.blob, r.name), i * 200));
    }
  }

  function handleReset() {
    consentRef.current?.(false);
    consentRef.current = null;
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setFile(null); setResults([]); setState("idle");
    setProgress(0); setPageCount(0); setPassword(""); setMissing([]); setErrorMsg("");
  }

  // ── Split mode options ────────────────────────────────────────────
  const MODES: { id: SplitMode; label: string; desc: string }[] = [
    { id: "all",   label: "All Pages",    desc: "Extract every page separately" },
    { id: "range", label: "Custom Range", desc: "Specify pages and ranges"       },
    { id: "evens", label: "Even Pages",   desc: "Pages 2, 4, 6, 8…"             },
    { id: "odds",  label: "Odd Pages",    desc: "Pages 1, 3, 5, 7…"             },
  ];

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {/* ── IDLE: upload + options ─────────────────────── */}
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <UploadZone
              accept={{ "application/pdf": [".pdf"] }}
              onDrop={onDrop}
              accentColor="cyan"
              label={file ? file.name : "Drop your PDF here or click to browse"}
              sublabel={
                file
                  ? `${formatBytes(file.size)}${pageCount ? ` · ${pageCount} pages` : ""}`
                  : "PDF · up to 50 MB · processed in your browser"
              }
            />

            {file && (
              <div className="space-y-3">
                {/* Mode selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MODES.map(({ id, label, desc }) => (
                    <button key={id} onClick={() => setMode(id)}
                      className="text-left rounded-xl px-4 py-3 transition-all"
                      style={{
                        background: mode === id ? "rgba(0,245,255,0.08)" : "rgba(0,245,255,0.02)",
                        border: `1px solid ${mode === id ? "rgba(0,245,255,0.4)" : "rgba(0,245,255,0.1)"}`,
                      }}>
                      <p className="text-sm font-mono font-bold" style={{ color: mode === id ? "#00f5ff" : "#e2e8f0" }}>{label}</p>
                      <p className="text-[11px] font-mono text-text-muted">{desc}</p>
                    </button>
                  ))}
                </div>

                {mode === "range" && (
                  <div>
                    <label className="text-xs font-mono text-text-muted uppercase tracking-wider block mb-2">
                      Page ranges
                    </label>
                    <input
                      value={rangeStr}
                      onChange={(e) => setRangeStr(e.target.value)}
                      placeholder="e.g. 1-3, 5, 7-9, 12"
                      className="input-cyber w-full font-mono text-sm"
                    />
                    <p className="text-[11px] font-mono text-text-muted mt-1.5">
                      Use commas and hyphens. Example: <span className="text-neon-cyan">1-5, 8, 11-15</span>
                    </p>
                  </div>
                )}

                <button onClick={() => handleSplit()}
                  className="btn-solid-cyan w-full sm:w-auto px-8 py-3 font-display font-bold tracking-widest text-sm flex items-center justify-center gap-2">
                  <Scissors className="w-4 h-4" />SPLIT PDF
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── PROCESSING: CyberScanner ───────────────────── */}
        {state === "processing" && (
          <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CyberScanner progress={progress} statusText={status} isActive />
          </motion.div>
        )}

        {/* ── PASSWORD ───────────────────────────────────── */}
        {state === "password" && (
          <motion.div key="password" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl px-5 py-5 space-y-3"
            style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.2)" }}>
            <p className="text-sm font-mono font-bold text-neon-cyan flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {passwordIssue === "incorrect" ? "That password is incorrect" : "This PDF is password-protected"}
            </p>
            <p className="text-xs font-mono text-text-muted">
              Enter the password needed to open it. It is used only to unlock the file
              {" "}in this session and is never stored or logged.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && password) handleSplit(password); }}
                placeholder="PDF password"
                className="input-cyber flex-1 font-mono text-sm"
              />
              <button onClick={() => handleSplit(password)} disabled={!password}
                className="btn-solid-cyan px-6 py-2.5 font-display font-bold tracking-widest text-xs disabled:opacity-40">
                UNLOCK &amp; SPLIT
              </button>
            </div>
            <button onClick={handleReset} className="text-xs font-mono text-text-muted hover:text-neon-cyan hover:underline">
              ← Choose another file
            </button>
          </motion.div>
        )}

        {/* ── CONSENT: server fallback (nothing uploaded yet) ── */}
        {state === "consent" && (
          <motion.div key="consent" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl px-5 py-5 space-y-3"
            style={{ background: "rgba(255,204,0,0.05)", border: "1px solid rgba(255,204,0,0.25)" }}>
            <p className="text-sm font-mono font-bold text-neon-yellow flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              {consentReason === "partial-failure"
                ? "Some pages couldn't be processed in your browser"
                : "Your browser couldn't process this PDF"}
            </p>
            <p className="text-xs font-mono text-text-muted leading-relaxed">
              It may be too large or complex for this device. We can process
              {consentReason === "partial-failure" ? " the remaining pages" : " it"} on our server instead.
              That means <span className="text-text-primary">uploading the file</span> over HTTPS to private,
              temporary storage; it is deleted as soon as your results are downloaded (and automatically
              within an hour if anything is interrupted). Until you agree, nothing has left your device.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button onClick={() => answerConsent(true)}
                className="btn-solid-cyan px-6 py-2.5 font-display font-bold tracking-widest text-xs">
                UPLOAD &amp; PROCESS ON SERVER
              </button>
              <button onClick={() => answerConsent(false)}
                className="px-6 py-2.5 rounded-lg border border-neon-cyan/20 text-xs font-mono text-text-muted hover:text-neon-cyan hover:border-neon-cyan/40 transition-all">
                Keep it private — cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ERROR ──────────────────────────────────────── */}
        {state === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl px-5 py-4 text-center"
            style={{ background: "rgba(255,0,60,0.06)", border: "1px solid rgba(255,0,60,0.25)" }}>
            <p className="text-sm font-mono font-bold text-neon-red mb-1">Split failed</p>
            <p className="text-xs font-mono text-text-muted mb-3">
              {errorMsg || "The PDF could not be processed."}
            </p>
            <button onClick={handleReset} className="text-xs font-mono text-neon-cyan hover:underline">
              ← Try again
            </button>
          </motion.div>
        )}

        {/* ── COMPLETE: results ──────────────────────────── */}
        {state === "complete" && results.length > 0 && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <ResultReveal onReset={handleReset} successMessage={`${results.length} PAGE${results.length > 1 ? "S" : ""} EXTRACTED`}>
              <div className="space-y-4">

                {/* Processing notes */}
                {source !== "browser" && (
                  <div className="rounded-lg px-4 py-2.5 flex items-start gap-2.5"
                    style={{ background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.18)" }}>
                    <ShieldCheck className="w-3.5 h-3.5 text-neon-cyan mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] font-mono text-text-muted leading-relaxed">
                      {source === "server" ? "This PDF" : "Some pages"} {source === "server" ? "was" : "were"} processed on the
                      server with your permission. The uploaded file and the results have been deleted from storage.
                    </p>
                  </div>
                )}
                {imageBased > 0 && (
                  <div className="rounded-lg px-4 py-2.5 flex items-start gap-2.5"
                    style={{ background: "rgba(255,204,0,0.06)", border: "1px solid rgba(255,204,0,0.2)" }}>
                    <Info className="w-3.5 h-3.5 text-neon-yellow mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] font-mono text-text-muted leading-relaxed">
                      <span className="text-neon-yellow font-semibold">{imageBased} page{imageBased > 1 ? "s" : ""}</span> had to be
                      rendered as images because the PDF uses features that can&apos;t be extracted directly. The pages look identical
                      but their text isn&apos;t selectable.
                    </p>
                  </div>
                )}
                {missing.length > 0 && (
                  <div className="rounded-lg px-4 py-2.5 flex items-start gap-2.5"
                    style={{ background: "rgba(255,0,60,0.06)", border: "1px solid rgba(255,0,60,0.25)" }}>
                    <AlertTriangle className="w-3.5 h-3.5 text-neon-red mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] font-mono text-text-muted leading-relaxed">
                      Page{missing.length > 1 ? "s" : ""} {missing.join(", ")} could not be extracted.
                    </p>
                  </div>
                )}

                {/* Summary row + download-all button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl px-5 py-4"
                  style={{ background: "rgba(0,245,255,0.04)", border: "1px solid rgba(0,245,255,0.12)" }}>
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
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
                      style={{ background: "rgba(0,245,255,0.03)", border: "1px solid rgba(0,245,255,0.08)" }}>
                      <span className="text-xs font-mono text-neon-cyan/50 w-6 flex-shrink-0">{i + 1}</span>
                      <span className="flex-1 min-w-0 truncate text-xs font-mono text-text-primary">{r.name}</span>
                      {!r.textPreserved && (
                        <span title="Image-based page (text not selectable)" className="flex-shrink-0">
                          <AlertTriangle className="w-3 h-3 text-neon-yellow/60" />
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-text-muted flex-shrink-0">{formatBytes(r.size)}</span>
                      <button onClick={() => downloadBlob(r.blob, r.name)}
                        className="w-7 h-7 flex items-center justify-center rounded border border-neon-cyan/15 text-text-muted hover:text-neon-cyan hover:border-neon-cyan/35 transition-all flex-shrink-0">
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                {imageBased > 0 && (
                  <p className="text-[10px] font-mono text-text-muted flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3 text-neon-yellow/60" />
                    = Image-based page (looks identical, text not selectable)
                  </p>
                )}
              </div>
            </ResultReveal>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}