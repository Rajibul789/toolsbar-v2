/**
 * lib/pdf-split/types.ts — shared types and errors for the PDF Split pipeline.
 *
 * The pipeline in pipeline.ts is environment-neutral: the browser and the
 * Node server inject different adapters (qpdf runner, page renderer) and run
 * exactly the same orchestration code.
 */

/** Which engine produced a page. `raster` output is image-based (no selectable text). */
export type EngineId = "qpdf" | "pdflib" | "raster";

export interface SplitPage {
  /** 1-based page number in the SOURCE document. */
  pageNum: number;
  /** A complete single-page PDF. */
  bytes: Uint8Array;
  engine: EngineId;
  /** False only for rasterised pages. */
  textPreserved: boolean;
}

export interface SplitProgress {
  stage: "inspect" | "qpdf" | "pdflib" | "verify" | "raster";
  done: number;
  total: number;
}

export interface SplitOptions {
  /** 1-based pages to extract. Defaults to every page. */
  pages?: number[];
  /** Alternative to `pages` when the page count isn't known yet (evens/odds/ranges). */
  select?: (totalPages: number) => number[];
  /** Open-password for encrypted files (never stored or logged). */
  password?: string;
  onProgress?: (p: SplitProgress) => void;
  signal?: AbortSignal;
}

export interface PipelineResult {
  totalPages: number;
  /** Extracted pages, ascending by pageNum. */
  pages: SplitPage[];
  /** Selected pages that no engine could extract. */
  failed: number[];
}

/** Renders / inspects PDFs (pdf.js in both environments). */
export interface PageRenderer {
  /**
   * Page count of a document. Throws PdfSplitError("PASSWORD_REQUIRED" |
   * "PASSWORD_INCORRECT") for encrypted files, PdfSplitError("UNREADABLE")
   * for files pdf.js cannot parse.
   */
  numPages(bytes: Uint8Array, password?: string): Promise<number>;
  /** True if the first page renders at least one non-white pixel — or if rendering isn't possible (the output is then trusted). */
  hasInk(singlePagePdf: Uint8Array): Promise<boolean>;
  /** Opens the source once; rasterise() renders one page to an image-based single-page PDF. */
  openRaster(bytes: Uint8Array, password?: string): Promise<RasterSession>;
}

export interface RasterSession {
  rasterise(pageNum: number): Promise<Uint8Array>;
  close(): Promise<void>;
}

/** Structural (text-preserving) splitter backed by qpdf. */
export interface QpdfRunner {
  /**
   * Extracts `pages` (ascending, 1-based) into individual single-page PDFs,
   * decrypting with `password` when given. Throws if qpdf cannot process the file.
   */
  split(bytes: Uint8Array, pages: number[], password?: string): Promise<Map<number, Uint8Array>>;
}

export type PdfSplitErrorCode =
  | "PASSWORD_REQUIRED"
  | "PASSWORD_INCORRECT"
  | "UNREADABLE"
  | "NO_PAGES"
  | "TOO_LARGE"
  | "NOT_A_PDF"
  /** An engine crashed / ran out of memory — the case a server fallback can help with. */
  | "ENGINE_FAILURE"
  | "SERVER_UNAVAILABLE"
  | "SERVER_FAILED"
  | "CONSENT_DECLINED"
  | "ABORTED";

export class PdfSplitError extends Error {
  readonly code: PdfSplitErrorCode;
  constructor(code: PdfSplitErrorCode, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "PdfSplitError";
    this.code = code;
    if (options?.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
  }
}

/** Largest PDF the tool accepts (matches the UploadZone limit and Supabase's free-plan object cap). */
export const MAX_PDF_BYTES = 50 * 1024 * 1024;