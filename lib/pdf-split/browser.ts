/**
 * lib/pdf-split/browser.ts — pipeline dependencies for the browser.
 * Client-side only; everything heavy is loaded lazily on first use.
 */
import { createQpdfRunner, type QpdfInstanceLike } from "./qpdf";
import { createPdfJsRenderer, type CanvasLike } from "./pdfjs-renderer";
import type { PipelineDeps } from "./pipeline";

/** Served from /public by scripts/copy-qpdf-wasm.mjs (runs on postinstall/prebuild). */
export const QPDF_WASM_URL = "/vendor/qpdf/qpdf.wasm";

const PDFJS_WORKER_URL = (version: string) =>
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;

export function createBrowserPipelineDeps(): PipelineDeps {
  const renderer = createPdfJsRenderer({
    loadPdfJs: async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL(pdfjs.version);
      return pdfjs;
    },
    createCanvas: (w, h) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      return c as unknown as CanvasLike;
    },
    loadJsPdf: async () => (await import("jspdf")).jsPDF,
  });

  // If the WASM file cannot be fetched the loader rejects, the runner throws,
  // and the pipeline simply continues with the pdf-lib / raster tiers.
  const qpdf = createQpdfRunner(async () => {
    const mod = (await import("@neslinesli93/qpdf-wasm")) as unknown as {
      default?: (o: Record<string, unknown>) => Promise<QpdfInstanceLike>;
    };
    const create = (mod.default ?? (mod as unknown)) as (o: Record<string, unknown>) => Promise<QpdfInstanceLike>;
    return create({ noInitialRun: true, locateFile: () => QPDF_WASM_URL });
  });

  return { renderer, qpdf, loadPdfLib: () => import("pdf-lib") };
}