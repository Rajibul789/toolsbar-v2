/**
 * lib/pdf-split/pdfjs-renderer.ts — PageRenderer built on pdf.js.
 *
 * The same code runs in the browser (document canvas, pdf.js worker) and on
 * the server (pdfjs-dist legacy build + @napi-rs/canvas); only the injected
 * environment differs.
 *
 * Two defects of the previous implementations are fixed here:
 *  - Page size: the browser fallback converted the pdf.js viewport with
 *    `* 72 / 96`, but a scale-1 viewport is already in points, so every
 *    rasterised page came out at 75 % of its real size (A4 595×842 pt ->
 *    446×631 pt). Sizes now match the source exactly.
 *  - Node rendering of PDFs that use the standard-14 fonts without embedding
 *    them produced BLANK pages because pdf.js was never given
 *    `standardFontDataUrl`; the server environment now supplies it.
 */
import { PdfSplitError, type PageRenderer, type RasterSession } from "./types";

type PdfJsModule = typeof import("pdfjs-dist");

export interface CanvasLike {
  width: number;
  height: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getContext(type: "2d", options?: unknown): any;
  toDataURL(type?: string, quality?: number): string;
}

export interface PdfJsEnv {
  loadPdfJs(): Promise<PdfJsModule>;
  createCanvas(width: number, height: number): CanvasLike;
  loadJsPdf(): Promise<typeof import("jspdf")["jsPDF"]>;
  /** Extra getDocument() options (e.g. standardFontDataUrl, canvasFactory, disableFontFace). */
  docOptions?: Record<string, unknown>;
}

const THUMB = 256;       // content-check thumbnail (longest edge, px)
const RASTER_SCALE = 2.5; // render scale for the image fallback

/** Maps pdf.js failures onto the pipeline's error codes. */
export function mapPdfJsError(e: unknown): PdfSplitError {
  const err = e as { name?: string; code?: number; message?: string };
  if (err?.name === "PasswordException") {
    // pdf.js: code 1 = NEED_PASSWORD, 2 = INCORRECT_PASSWORD
    return err.code === 2
      ? new PdfSplitError("PASSWORD_INCORRECT", "The password is incorrect.", { cause: e })
      : new PdfSplitError("PASSWORD_REQUIRED", "This PDF is password-protected.", { cause: e });
  }
  if (err instanceof RangeError || /memory|allocation/i.test(err?.message ?? "")) {
    return new PdfSplitError("ENGINE_FAILURE", "Ran out of memory while reading the PDF.", { cause: e });
  }
  if (err?.name === "InvalidPDFException" || err?.name === "FormatError" || err?.name === "MissingPDFException" || /invalid pdf|xref|not a pdf/i.test(err?.message ?? "")) {
    return new PdfSplitError("UNREADABLE", "This file is damaged or isn't a valid PDF, so it can't be split.", { cause: e });
  }
  return new PdfSplitError("UNREADABLE", err?.message || "The PDF could not be read.", { cause: e });
}

export function createPdfJsRenderer(env: PdfJsEnv): PageRenderer {
  async function open(bytes: Uint8Array, password?: string) {
    const pdfjs = await env.loadPdfJs();
    try {
      // pdf.js takes ownership of (transfers) the buffer it is given -> hand it a copy.
      return await pdfjs.getDocument({
        data: new Uint8Array(bytes),
        password,
        isEvalSupported: false,
        ...env.docOptions,
      } as Parameters<PdfJsModule["getDocument"]>[0]).promise;
    } catch (e) {
      throw mapPdfJsError(e);
    }
  }

  return {
    async numPages(bytes, password) {
      const doc = await open(bytes, password);
      try {
        return doc.numPages;
      } finally {
        await doc.destroy();
      }
    },

    async hasInk(singlePagePdf) {
      try {
        const doc = await open(singlePagePdf);
        try {
          const page = await doc.getPage(1);
          const vp = page.getViewport({ scale: 1 });
          const scale = Math.min(THUMB / vp.width, THUMB / vp.height);
          const scaled = page.getViewport({ scale });
          const canvas = env.createCanvas(Math.max(1, Math.round(scaled.width)), Math.max(1, Math.round(scaled.height)));
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return true; // cannot check -> keep the structurally-copied page
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: scaled, ...(env.docOptions?.canvasFactory ? { canvasFactory: env.docOptions.canvasFactory } : {}) } as never).promise;
          page.cleanup();
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data as Uint8ClampedArray;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
          }
          return false;
        } finally {
          await doc.destroy();
        }
      } catch {
        // pdf.js itself failed (worker blocked/offline, out of memory...). That says nothing
        // about the page, so the structurally-copied output is trusted — "false" is reserved
        // for a render that SUCCEEDED and found nothing to draw.
        return true;
      }
    },

    async openRaster(bytes, password): Promise<RasterSession> {
      const doc = await open(bytes, password);
      const JsPDF = await env.loadJsPdf();
      return {
        async rasterise(pageNum) {
          const page = await doc.getPage(pageNum);
          const viewport = page.getViewport({ scale: RASTER_SCALE });
          const canvas = env.createCanvas(Math.round(viewport.width), Math.round(viewport.height));
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new PdfSplitError("ENGINE_FAILURE", "Canvas context unavailable.");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          try {
            await page.render({ canvasContext: ctx, viewport, ...(env.docOptions?.canvasFactory ? { canvasFactory: env.docOptions.canvasFactory } : {}) } as never).promise;
          } finally {
            page.cleanup();
          }
          // pdf.js viewports at scale 1 are already in PDF points — no 72/96 factor.
          const widthPt = viewport.width / RASTER_SCALE;
          const heightPt = viewport.height / RASTER_SCALE;
          const pdf = new JsPDF({
            unit: "pt",
            format: [widthPt, heightPt],
            orientation: widthPt > heightPt ? "landscape" : "portrait",
            compress: true,
          });
          pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, widthPt, heightPt, "", "FAST");
          const out = new Uint8Array(pdf.output("arraybuffer"));
          canvas.width = canvas.height = 0; // release the backing store (matters on mobile Safari)
          return out;
        },
        close: () => doc.destroy(),
      };
    },
  };
}