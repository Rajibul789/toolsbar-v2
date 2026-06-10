"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Table } from "lucide-react";
import { UploadZone } from "@/components/tools/UploadZone";
import { CyberScanner } from "@/components/animations/CyberScanner";
import { ResultReveal, DownloadButton } from "@/components/tools/ResultReveal";
import { downloadBlob } from "@/lib/utils";
import { toast } from "sonner";

type ProcessState = "idle" | "processing" | "complete" | "error";

interface SheetRow { page: number; text: string; }

export function PdfToExcel() {
  const [file, setFile]     = useState<File | null>(null);
  const [state, setState]   = useState<ProcessState>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [rows, setRows]     = useState<SheetRow[]>([]);
  const [result, setResult] = useState<Blob | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const onDrop = useCallback((files: File[]) => {
    setFile(files[0]); setState("idle"); setRows([]); setResult(null); setPageCount(0);
  }, []);

  async function handleConvert() {
    if (!file) { toast.error("Upload a PDF first."); return; }
    setState("processing"); setProgress(5); setStatus("LOADING PDF ENGINE...");

    try {
      // 1. Load PDF
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const bytes = await file.arrayBuffer();
      const doc   = await pdfjsLib.getDocument({ data: bytes }).promise;
      const total = doc.numPages;
      setPageCount(total);

      // 2. Extract text per page
      setProgress(15); setStatus("EXTRACTING TEXT CONTENT...");
      const allRows: SheetRow[] = [];

      for (let p = 1; p <= total; p++) {
        setStatus(`PROCESSING PAGE ${p} OF ${total}...`);
        setProgress(15 + Math.round((p / total) * 60));

        const page    = await doc.getPage(p);
        const content = await page.getTextContent();

        // Group items into lines by vertical position (y coordinate)
        const lineMap = new Map<number, string[]>();
        for (const item of content.items as Array<{ str: string; transform: number[] }>) {
          const y = Math.round(item.transform[5]);
          if (!lineMap.has(y)) lineMap.set(y, []);
          lineMap.get(y)!.push(item.str);
        }

        // Sort lines top-to-bottom (descending y in PDF coords)
        const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
        for (const y of sortedYs) {
          const lineText = lineMap.get(y)!.join(" ").trim();
          if (lineText) allRows.push({ page: p, text: lineText });
        }

        await new Promise((r) => setTimeout(r, 10));
      }

      setRows(allRows);
      setProgress(80); setStatus("BUILDING EXCEL WORKBOOK...");

      // 3. Build XLSX workbook using SheetJS
      const XLSX = await import("xlsx");

      const wsData: (string | number)[][] = [
        ["Page", "Text Content"], // header
        ...allRows.map((r) => [r.page, r.text]),
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Column widths
      ws["!cols"] = [{ wch: 8 }, { wch: 120 }];

      XLSX.utils.book_append_sheet(wb, ws, "Extracted Content");

      // Also add a sheet per page if multiple pages
      if (total > 1 && total <= 10) {
        for (let p = 1; p <= total; p++) {
          const pageRows = allRows.filter((r) => r.page === p);
          const pageData: (string | number)[][] = [
            ["Line", "Text"],
            ...pageRows.map((r, i) => [i + 1, r.text]),
          ];
          const pageWs = XLSX.utils.aoa_to_sheet(pageData);
          pageWs["!cols"] = [{ wch: 6 }, { wch: 120 }];
          XLSX.utils.book_append_sheet(wb, pageWs, `Page ${p}`);
        }
      }

      const xlsxBytes = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const blob = new Blob([xlsxBytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      setResult(blob);
      setProgress(100);
      setState("complete");
    } catch (err) {
      console.error("[PdfToExcel]", err);
      setState("error");
      toast.error("Extraction failed. The PDF may be encrypted or image-only.");
    }
  }

  function handleReset() {
    setFile(null); setRows([]); setResult(null); setState("idle"); setProgress(0);
  }

  const baseName = file?.name.replace(/\.pdf$/i, "") ?? "document";

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">

        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <UploadZone
              onDrop={onDrop}
              accept={{ "application/pdf": [".pdf"] }}
              accentColor="green"
              currentFiles={file ? [file] : []}
              onRemoveFile={() => { setFile(null); setRows([]); }}
              maxSizeMb={30}
            />

            <div className="rounded-lg px-4 py-3 text-xs font-mono"
              style={{ background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.12)" }}>
              <span className="text-neon-green">ℹ</span>{" "}
              Best results with PDFs that have a real text layer. Scanned image-only PDFs will produce minimal output.
            </div>

            {file && (
              <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                onClick={handleConvert}
                className="w-full btn-neon-green py-3.5 flex items-center justify-center gap-2 font-mono font-bold tracking-widest text-sm">
                <Table className="w-4 h-4" />EXTRACT TO EXCEL
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
            <ResultReveal onReset={handleReset} successMessage="EXTRACTION COMPLETE">
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Pages",    value: pageCount },
                    { label: "Rows",     value: rows.length },
                    { label: "File",     value: `${(result.size / 1024).toFixed(0)} KB` },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg p-3 text-center"
                      style={{ background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.12)" }}>
                      <p className="text-lg font-display font-black text-neon-green">{value}</p>
                      <p className="text-[11px] font-mono text-text-muted">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Preview */}
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(0,255,136,0.12)" }}>
                  <div className="px-4 py-2 flex items-center gap-2 border-b border-neon-green/10"
                    style={{ background: "rgba(0,255,136,0.05)" }}>
                    <Table className="w-3.5 h-3.5 text-neon-green" />
                    <span className="text-[11px] font-mono text-neon-green/70 uppercase tracking-widest">Preview (first 10 rows)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr style={{ background: "rgba(0,255,136,0.06)" }}>
                          <th className="px-3 py-2 text-left text-neon-green/80 font-semibold w-12">Page</th>
                          <th className="px-3 py-2 text-left text-neon-green/80 font-semibold">Text</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 10).map((r, i) => (
                          <tr key={i} style={{ borderTop: "1px solid rgba(0,255,136,0.06)" }}>
                            <td className="px-3 py-1.5 text-text-muted">{r.page}</td>
                            <td className="px-3 py-1.5 text-text-secondary truncate max-w-xs">{r.text}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 10 && (
                    <div className="px-4 py-2 text-[11px] font-mono text-text-muted border-t border-neon-green/8">
                      + {rows.length - 10} more rows in the Excel file
                    </div>
                  )}
                </div>

                <DownloadButton
                  onClick={() => downloadBlob(result, `${baseName}.xlsx`)}
                  label={`Download ${baseName}.xlsx`}
                  color="green"
                  className="w-full"
                />
              </div>
            </ResultReveal>
          </motion.div>
        )}

        {state === "error" && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-xl p-6 text-center" style={{ background: "rgba(255,0,60,0.05)", border: "1px solid rgba(255,0,60,0.2)" }}>
              <p className="text-sm font-mono text-neon-red mb-4">EXTRACTION FAILED</p>
              <button onClick={handleReset} className="btn-neon text-sm">Try Again</button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}