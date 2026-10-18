/**
 * lib/pdf-split/node.ts — pipeline dependencies for the Node server (and tests).
 *
 * Server-only: never import this from a client component.
 *  - qpdf: WebAssembly build (works on Vercel — no native binary required).
 *  - renderer: pdfjs-dist legacy build + @napi-rs/canvas, with the standard
 *    font data pdf.js needs to draw non-embedded Helvetica/Times/Courier text
 *    (without it those pages render blank in Node).
 */
import path from "node:path";
import { createQpdfRunner, type QpdfInstanceLike } from "./qpdf";
import { createPdfJsRenderer, type CanvasLike } from "./pdfjs-renderer";
import type { PipelineDeps } from "./pipeline";

// Package files that are loaded by PATH (standard fonts, the qpdf .wasm) are located
// relative to the project root. On Vercel the traced files keep their project-relative
// layout under process.cwd() (see outputFileTracingIncludes in next.config.ts).
// (createRequire(...).resolve() would be tidier but makes webpack emit a
// "createRequire failed parsing argument" warning.)
const nodeModules = (...parts: string[]) => path.join(process.cwd(), "node_modules", ...parts);

/** Dynamic imports of CommonJS packages expose module.exports as `default`. */
const cjs = <T,>(m: unknown): T => ((m as { default?: unknown }).default ?? m) as T;

let polyfilled = false;
async function installCanvasPolyfills(): Promise<void> {
  if (polyfilled) return;
  const { DOMMatrix, Path2D, ImageData } = await import("@napi-rs/canvas");
  const g = globalThis as Record<string, unknown>;
  g.DOMMatrix ??= DOMMatrix;
  g.Path2D ??= Path2D;
  g.ImageData ??= ImageData;
  polyfilled = true;
}

class NodeCanvasFactory {
  constructor(private readonly createCanvas: (w: number, h: number) => { getContext(t: "2d"): unknown }) {}
  create(width: number, height: number) {
    const canvas = this.createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(cc: { canvas: { width: number; height: number } }, width: number, height: number) {
    cc.canvas.width = width;
    cc.canvas.height = height;
  }
  destroy(cc: { canvas: unknown; context: unknown }) {
    cc.canvas = null;
    cc.context = null;
  }
}

export function createNodePipelineDeps(): PipelineDeps {
  const pdfjsRoot = nodeModules("pdfjs-dist");
  const qpdfDist = nodeModules("@neslinesli93", "qpdf-wasm", "dist");

  let makeCanvas: ((w: number, h: number) => CanvasLike) | null = null;
  let canvasFactory: NodeCanvasFactory | null = null;
  let envReady: Promise<void> | null = null;
  const ensureCanvas = () =>
    (envReady ??= (async () => {
      await installCanvasPolyfills();
      const { createCanvas } = await import("@napi-rs/canvas");
      makeCanvas = createCanvas as unknown as (w: number, h: number) => CanvasLike;
      canvasFactory = new NodeCanvasFactory(createCanvas as never);
    })());

  // `canvasFactory` only exists once ensureCanvas() has run, which loadPdfJs() guarantees
  // before pdf.js is ever asked to open a document — hence the getter.
  const docOptions: Record<string, unknown> = {
    standardFontDataUrl: path.join(pdfjsRoot, "standard_fonts") + path.sep,
    disableFontFace: true,
  };
  Object.defineProperty(docOptions, "canvasFactory", { enumerable: true, get: () => canvasFactory });

  const renderer = createPdfJsRenderer({
    loadPdfJs: async () => {
      await ensureCanvas();
      return cjs<typeof import("pdfjs-dist")>(await import("pdfjs-dist/legacy/build/pdf.js"));
    },
    createCanvas: (w, h) => {
      if (!makeCanvas) throw new Error("Canvas module not loaded.");
      return makeCanvas(w, h);
    },
    loadJsPdf: async () => {
      // Depending on the resolved build, jsPDF is a named export, `default`, or `default.jsPDF`.
      const m = (await import("jspdf")) as unknown as { jsPDF?: unknown; default?: unknown };
      const d = m.default as { jsPDF?: unknown } | undefined;
      return (m.jsPDF ?? (typeof d === "function" ? d : d?.jsPDF) ?? d) as typeof import("jspdf")["jsPDF"];
    },
    docOptions,
  });

  const qpdf = createQpdfRunner(async () => {
    const create = cjs<(o: Record<string, unknown>) => Promise<QpdfInstanceLike>>(await import("@neslinesli93/qpdf-wasm"));
    return create({ noInitialRun: true, locateFile: (f: string) => path.join(qpdfDist, f || "qpdf.wasm") });
  });

  return { renderer, qpdf, loadPdfLib: () => import("pdf-lib") };
}