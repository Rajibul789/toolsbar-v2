import { type NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { logApiError } from "@/lib/errors/logger";

// Node.js runtime — gives us access to full memory for large PDFs
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * POST /api/pdf/split
 *
 * Accepts:  multipart/form-data with field "pdf" (File)
 *           Optional field "pages" (comma-separated 1-based page numbers)
 *           e.g. "1,2,5,6" → only split those pages
 *           Omit "pages" to split ALL pages.
 *
 * Returns:  JSON array of { name: string, data: string (base64) }
 *           Each item is one extracted page as a standalone PDF.
 *
 * This replicates the Ghostscript logic from the original Express backend
 * (pdf-split-backend-main/index.js) using pdf-lib — no system binary needed.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Parse multipart form ─────────────────────────────────────
    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;
    const pagesParam = formData.get("pages") as string | null; // optional

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 415 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_SIZE_BYTES / 1024 / 1024} MB` },
        { status: 413 }
      );
    }

    // ── Load the source PDF ──────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
    });

    const totalPages = srcDoc.getPageCount();

    if (totalPages === 0) {
      return NextResponse.json({ error: "PDF has no pages" }, { status: 422 });
    }

    // ── Determine which pages to extract ────────────────────────
    let pageIndices: number[]; // 0-based

    if (pagesParam && pagesParam.trim()) {
      // Parse "1,3,5-7" style string → 0-based indices
      pageIndices = [];
      const parts = pagesParam.split(",").map((s) => s.trim());
      for (const part of parts) {
        if (part.includes("-")) {
          const [a, b] = part.split("-").map(Number);
          for (let i = a; i <= Math.min(b, totalPages); i++) {
            if (i >= 1) pageIndices.push(i - 1);
          }
        } else {
          const n = Number(part);
          if (n >= 1 && n <= totalPages) pageIndices.push(n - 1);
        }
      }
      // Deduplicate and sort
      pageIndices = [...new Set(pageIndices)].sort((a, b) => a - b);
    } else {
      // Default: all pages (matches the original Ghostscript behaviour)
      pageIndices = Array.from({ length: totalPages }, (_, i) => i);
    }

    if (pageIndices.length === 0) {
      return NextResponse.json({ error: "No valid pages selected" }, { status: 422 });
    }

    // ── Split: one PDF per page ──────────────────────────────────
    // This is equivalent to the Ghostscript command:
    //   gs -sDEVICE=pdfwrite -sOutputFile=page_%03d.pdf input.pdf
    const results: Array<{ name: string; data: string }> = [];

    for (const pageIndex of pageIndices) {
      const pageDoc = await PDFDocument.create();
      const [copiedPage] = await pageDoc.copyPages(srcDoc, [pageIndex]);
      pageDoc.addPage(copiedPage);

      const pageBytes = await pageDoc.save();

      // Convert to base64 so the client can reconstruct a Blob
      const base64 = Buffer.from(pageBytes).toString("base64");
      const pageNumber = pageIndex + 1;

      results.push({
        name: `page_${String(pageNumber).padStart(3, "0")}.pdf`,
        data: base64,
      });
    }

    return NextResponse.json(results);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "PDF processing failed";
    console.error("[/api/pdf/split] Error:", err);
    await logApiError(err, { route: "/api/pdf/split", toolSlug: "pdf-split" });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}