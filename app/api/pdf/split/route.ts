import { type NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { logApiError } from "@/lib/errors/logger";

export const runtime   = "nodejs";
export const maxDuration = 60;

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// ── Blank-page detection threshold ─────────────────────────────────────────
// When pdf-lib copies a page whose resources are inherited from parent tree
// nodes (common in government / linearised PDFs), it silently produces a valid
// PDF shell with no content — typically 700-1 100 bytes.  Any page with real
// text, images, or vector paths will be several kilobytes or more.
const BLANK_THRESHOLD_BYTES = 1_800;

// ── Helpers ────────────────────────────────────────────────────────────────
function parsePageIndices(param: string, totalPages: number): number[] {
  const indices: number[] = [];
  for (const part of param.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      for (let i = a; i <= Math.min(b, totalPages); i++) {
        if (i >= 1) indices.push(i - 1);
      }
    } else {
      const n = Number(part);
      if (n >= 1 && n <= totalPages) indices.push(n - 1);
    }
  }
  return [...new Set(indices)].sort((a, b) => a - b);
}

/**
 * Attempt to copy a single page via pdf-lib structural copy.
 * Returns null on any error (caller will request client-side rasterisation).
 */
async function tryCopyPage(
  srcBytes: ArrayBuffer,
  pageIndex: number
): Promise<{ bytes: Uint8Array; valid: boolean } | null> {
  try {
    const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
    const pageDoc = await PDFDocument.create();
    const [copied] = await pageDoc.copyPages(srcDoc, [pageIndex]);
    pageDoc.addPage(copied);
    const bytes = await pageDoc.save();
    // Validate — size below threshold means blank/failed copy
    const valid = bytes.length >= BLANK_THRESHOLD_BYTES;
    return { bytes, valid };
  } catch {
    return null; // Caller must use fallback
  }
}

/**
 * POST /api/pdf/split
 *
 * ──────────────────── Part 8 upgrade ────────────────────────────────────────
 *
 * v2 response shape: JSON array of PageResult objects
 * {
 *   name:     string           // "page_001.pdf"
 *   data:     string           // base64-encoded PDF or empty string if failed
 *   valid:    boolean          // true = pdf-lib succeeded + passed size check
 *   sizeBytes: number          // byte length of the output PDF
 *   pageNum:  number           // 1-based original page number
 *   engine:   "pdflib" | "failed"
 *   error?:   string           // set only when engine === "failed"
 * }
 *
 * When engine === "failed", the client MUST use its local canvas-rasterisation
 * fallback engine (pdfjs-dist → jsPDF) to produce the page image.
 * ──────────────────────────────────────────────────────────────────────────
 */
export async function POST(req: NextRequest) {
  try {
    const formData    = await req.formData();
    const file        = formData.get("pdf") as File | null;
    const pagesParam  = formData.get("pages") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 415 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large — maximum is ${MAX_SIZE_BYTES / 1024 / 1024} MB` },
        { status: 413 }
      );
    }

    // ── Get page count (pdfjs-free — just pdf-lib is fine for count) ────────
    const arrayBuffer = await file.arrayBuffer();

    let totalPages: number;
    try {
      const probe = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      totalPages  = probe.getPageCount();
    } catch (err) {
      await logApiError(err, { route: "/api/pdf/split", toolSlug: "pdf-split" });
      return NextResponse.json(
        { error: "Cannot read PDF structure — the file may be corrupt or use an unsupported encryption scheme." },
        { status: 422 }
      );
    }

    if (totalPages === 0) {
      return NextResponse.json({ error: "PDF has no pages" }, { status: 422 });
    }

    // ── Determine which pages to extract ────────────────────────────────────
    const pageIndices: number[] = (pagesParam?.trim())
      ? parsePageIndices(pagesParam, totalPages)
      : Array.from({ length: totalPages }, (_, i) => i);

    if (pageIndices.length === 0) {
      return NextResponse.json({ error: "No valid pages selected" }, { status: 422 });
    }

    // ── Per-page extraction with isolation ──────────────────────────────────
    // Each page is wrapped in its own try/catch so a single corrupt page
    // cannot abort the entire split (important for government PDFs where
    // one page may have a broken resource dictionary while others are fine).
    const results = await Promise.all(
      pageIndices.map(async (pageIndex) => {
        const pageNum = pageIndex + 1;
        const name    = `page_${String(pageNum).padStart(3, "0")}.pdf`;

        const result = await tryCopyPage(arrayBuffer, pageIndex);

        if (result === null) {
          // pdf-lib threw — page structure is incompatible; client must rasterise
          return {
            name,
            data:      "",
            valid:     false,
            sizeBytes: 0,
            pageNum,
            engine:    "failed" as const,
            error:     "pdf-lib could not parse this page — use client-side rasterisation fallback",
          };
        }

        if (!result.valid) {
          // pdf-lib succeeded but output is suspiciously small → likely blank
          return {
            name,
            // Still return the bytes so the client can decide;
            // it will perform its own pixel-level blank check.
            data:      Buffer.from(result.bytes).toString("base64"),
            valid:     false,
            sizeBytes: result.bytes.length,
            pageNum,
            engine:    "pdflib" as const,
            error:     `Output too small (${result.bytes.length}B) — may be blank; use canvas fallback`,
          };
        }

        return {
          name,
          data:      Buffer.from(result.bytes).toString("base64"),
          valid:     true,
          sizeBytes: result.bytes.length,
          pageNum,
          engine:    "pdflib" as const,
        };
      })
    );

    // ── Final verification ─────────────────────────────────────────────────
    const failedCount = results.filter((r) => !r.valid).length;
    const successRate = ((results.length - failedCount) / results.length * 100).toFixed(0);

    // Include summary so the client can decide if a full re-rasterisation
    // is worthwhile vs handling individual page failures.
    return NextResponse.json({
      pages:       results,
      total:       results.length,
      failed:      failedCount,
      successRate: `${successRate}%`,
      // Legacy shape compatibility: also include flat array as `pages` field
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PDF processing failed";
    console.error("[/api/pdf/split]", err);
    await logApiError(err, { route: "/api/pdf/split", toolSlug: "pdf-split" });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}