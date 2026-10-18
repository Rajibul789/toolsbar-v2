/**
 * lib/pdf-split/qpdf.ts — QpdfRunner on top of qpdf compiled to WebAssembly
 * (@neslinesli93/qpdf-wasm; qpdf itself is Apache-2.0).
 *
 * Why qpdf is the primary engine (measured against the old route's engines —
 * see the audit in the PR notes):
 *  - It decrypts AES-256 / AES-128 / RC4 files and keeps the text selectable
 *    (pdf-lib cannot decrypt; Ghostscript silently produced blank pages for
 *    RC4 and AES-128 owner-restricted files).
 *  - It prunes: a single-page output contains only that page. pdf-lib follows
 *    internal link annotations and drags the whole document into every
 *    output page (40 pages -> all 40 pages hidden inside each page; a
 *    privacy leak as well as 40× bloat).
 *  - It runs identically in the browser and on the Node server, so complex
 *    PDFs can stay on the user's device.
 *
 * A fresh WebAssembly instance is used per call so nothing leaks between jobs.
 */
import type { QpdfRunner } from "./types";

export interface QpdfInstanceLike {
  callMain(args: string[]): number;
  FS: {
    writeFile(path: string, data: Uint8Array): void;
    readFile(path: string): Uint8Array;
    readdir(path: string): string[];
    unlink(path: string): void;
  };
}

export type QpdfLoader = () => Promise<QpdfInstanceLike>;

export class QpdfProcessError extends Error {
  constructor(message: string, readonly exitCode: number) {
    super(message);
    this.name = "QpdfProcessError";
  }
}

/** qpdf exit codes: 0 = ok, 3 = finished with warnings (output still written). */
function run(m: QpdfInstanceLike, args: string[]): number {
  try {
    return m.callMain(args) ?? 0;
  } catch (e) {
    // Emscripten signals exit(n) by throwing an object with a numeric `status`.
    if (e && typeof (e as { status?: unknown }).status === "number") return (e as { status: number }).status;
    throw e;
  }
}

function tryRead(m: QpdfInstanceLike, path: string): Uint8Array | null {
  try {
    return m.FS.readFile(path);
  } catch {
    return null;
  }
}

export function createQpdfRunner(load: QpdfLoader): QpdfRunner {
  return {
    async split(bytes, pages, password) {
      const result = new Map<number, Uint8Array>();
      if (pages.length === 0) return result;

      const m = await load();
      m.FS.writeFile("/in.pdf", bytes);

      // Stage 1: decrypt (when needed) and keep only the requested pages.
      const args = ["--decrypt"];
      if (password) args.push(`--password=${password}`);
      args.push("/in.pdf", "--pages", ".", pages.join(","), "--", "/sub.pdf");
      const code = run(m, args);
      const sub = tryRead(m, "/sub.pdf");
      if ((code !== 0 && code !== 3) || !sub) {
        throw new QpdfProcessError(`qpdf could not process this file (exit ${code}).`, code);
      }

      if (pages.length === 1) {
        result.set(pages[0], sub);
        return result;
      }

      // Stage 2: one pass over the (small) subset writes every page separately.
      const code2 = run(m, ["--split-pages=1", "/sub.pdf", "/out.pdf"]);
      const files = m.FS.readdir("/")
        .filter((f) => /^out-\d+\.pdf$/.test(f))
        .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
      if ((code2 !== 0 && code2 !== 3) || files.length !== pages.length) {
        throw new QpdfProcessError(
          `qpdf produced ${files.length} files for ${pages.length} pages (exit ${code2}).`,
          code2
        );
      }
      files.forEach((f, i) => {
        const data = tryRead(m, "/" + f);
        if (!data) throw new QpdfProcessError(`qpdf output ${f} is missing.`, code2);
        result.set(pages[i], data);
      });
      return result;
    },
  };
}