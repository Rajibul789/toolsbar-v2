/**
 * Test helpers for the PDF Split pipeline: deterministic fixture builders
 * (pdf-lib + qpdf-wasm — no binary fixtures, no Python) and inspection tools.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { PDFDocument, PDFName, PDFRawStream, StandardFonts, degrees } from "pdf-lib";
import { createNodePipelineDeps } from "../../lib/pdf-split/node";
import type { PipelineDeps } from "../../lib/pdf-split/pipeline";

const requireCjs = createRequire(path.join(process.cwd(), "noop.js"));

export const deps: PipelineDeps = createNodePipelineDeps();

export const marker = (name: string, page: number) => `MARK-${name}-P${String(page).padStart(3, "0")}`;

// ── qpdf (WASM) scripting, used for fixtures and for leak inspection ─────────
async function qpdfRun(args: string[], input: Uint8Array): Promise<Uint8Array> {
  const mod = requireCjs("@neslinesli93/qpdf-wasm");
  const create = (mod.default ?? mod) as (o: Record<string, unknown>) => Promise<{
    callMain(a: string[]): number;
    FS: { writeFile(p: string, d: Uint8Array): void; readFile(p: string): Uint8Array };
  }>;
  const dist = path.dirname(requireCjs.resolve("@neslinesli93/qpdf-wasm"));
  const m = await create({ noInitialRun: true, locateFile: (f: string) => path.join(dist, f || "qpdf.wasm") });
  m.FS.writeFile("/in.pdf", input);
  try { m.callMain([...args, "/in.pdf", "/out.pdf"]); } catch { /* exit(n) */ }
  return m.FS.readFile("/out.pdf");
}

export type EncryptKind = "aes256" | "aes128" | "rc4";
/** Encrypts with qpdf. userPw "" = openable without a password (owner-restricted only). */
export function encrypt(bytes: Uint8Array, kind: EncryptKind, userPw = "", ownerPw = "owner"): Promise<Uint8Array> {
  const spec = kind === "aes256" ? ["256"] : kind === "aes128" ? ["128", "--use-aes=y"] : ["128", "--use-aes=n"];
  // qpdf refuses to WRITE RC4 unless weak crypto is explicitly allowed (it is only used to build a fixture).
  const weak = kind === "rc4" ? ["--allow-weak-crypto"] : [];
  return qpdfRun([...weak, "--encrypt", userPw, ownerPw, ...spec, "--"], bytes);
}

/** Every distinct page marker found anywhere in the DECOMPRESSED file — visible or hidden. */
export async function embeddedMarkers(bytes: Uint8Array, name: string): Promise<Set<string>> {
  const flat = await qpdfRun(["--qdf", "--object-streams=disable", "--stream-data=uncompress"], bytes);
  const text = Buffer.from(flat).toString("latin1");
  return new Set(text.match(new RegExp(`MARK-${name}-P\\d+`, "g")) ?? []);
}

// ── Fixture builders ─────────────────────────────────────────────────────────
export async function textPdf(name: string, pages: number, opts: { linkToNext?: boolean } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const made = Array.from({ length: pages }, () => doc.addPage([595, 842]));
  made.forEach((page, i) => {
    page.drawText(marker(name, i + 1), { x: 72, y: 780, size: 14, font });
    for (let l = 0; l < 25; l++) page.drawText(`Line ${l} of page ${i + 1}: the quick brown fox jumps over the lazy dog.`, { x: 72, y: 740 - l * 14, size: 10, font });
    if (opts.linkToNext && pages > 1) {
      const target = made[(i + 1) % pages];
      const link = doc.context.register(
        doc.context.obj({ Type: "Annot", Subtype: "Link", Rect: [72, 40, 200, 60], Border: [0, 0, 0], Dest: [target.ref, "Fit"] })
      );
      page.node.set(PDFName.of("Annots"), doc.context.obj([link]));
    }
  });
  return doc.save({ useObjectStreams: false }); // classic xref table: lets noTrailer() cut it off
}

export async function mixedSizePdf(name: string): Promise<{ bytes: Uint8Array; sizes: Array<[number, number]> }> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const sizes: Array<[number, number]> = [[595, 842], [612, 792], [300, 500], [800, 400], [200, 200]];
  sizes.forEach(([w, h], i) => {
    const p = doc.addPage([w, h]);
    p.drawText(marker(name, i + 1), { x: 20, y: h - 40, size: 14, font });
  });
  return { bytes: await doc.save(), sizes };
}

export async function rotatedPdf(name: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 4; i++) {
    const p = doc.addPage([400, 300]);
    p.drawText(marker(name, i + 1), { x: 20, y: 150, size: 18, font });
    p.setRotation(degrees(i % 2 ? 90 : 0));
  }
  return doc.save();
}

/** /MediaBox, /Rotate and /Resources live ONLY on the /Pages node (legal, common in the wild). */
export function inheritedAttrsPdf(name: string, n = 4): Uint8Array {
  const objs: string[] = ["<< /Type /Catalog /Pages 2 0 R >>"];
  const kids = Array.from({ length: n }, (_, i) => `${3 + i} 0 R`).join(" ");
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${n} /MediaBox [0 0 400 300] /Rotate 90 /Resources << /Font << /F1 ${3 + 2 * n} 0 R >> >> >>`);
  for (let i = 0; i < n; i++) objs.push(`<< /Type /Page /Parent 2 0 R /Contents ${3 + n + i} 0 R >>`);
  for (let i = 0; i < n; i++) {
    const s = `BT /F1 24 Tf 40 150 Td (${marker(name, i + 1)}) Tj ET`;
    objs.push(`<< /Length ${s.length} >>\nstream\n${s}\nendstream`);
  }
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let out = "%PDF-1.4\n";
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

/** pages × ~1 MB of image data (real, valid, drawn) plus a text marker each. */
export async function largePdf(name: string, pages: number, imageSide = 580): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const rnd = new Uint8Array(imageSide * imageSide * 3);
  for (let p = 0; p < pages; p++) {
    // Incompressible pixel data (getRandomValues is capped at 64 KiB per call), so the file
    // really is as big as it claims to be and qpdf cannot simply deflate it away.
    for (let i = 0; i < rnd.length; i += 65536) crypto.getRandomValues(rnd.subarray(i, Math.min(i + 65536, rnd.length)));
    const img = PDFRawStream.of(
      doc.context.obj({ Type: "XObject", Subtype: "Image", Width: imageSide, Height: imageSide, ColorSpace: "DeviceRGB", BitsPerComponent: 8 }),
      new Uint8Array(rnd)
    );
    const ref = doc.context.register(img);
    const page = doc.addPage([595, 842]);
    page.node.Resources()!.set(PDFName.of("XObject"), doc.context.obj({ Im0: ref }));
    page.node.addContentStream(doc.context.register(doc.context.stream("q 400 0 0 400 100 300 cm /Im0 Do Q")));
    page.drawText(marker(name, p + 1), { x: 20, y: 20, size: 10, font });
  }
  return doc.save();
}

export async function blankMixPdf(name: string): Promise<{ bytes: Uint8Array; blank: number[] }> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const blank: number[] = [];
  for (let i = 1; i <= 6; i++) {
    const p = doc.addPage([595, 842]);
    if (i % 2) p.drawText(marker(name, i), { x: 72, y: 780, size: 14, font });
    else blank.push(i);
  }
  return { bytes: await doc.save(), blank };
}

// ── Corruptions ──────────────────────────────────────────────────────────────
export const noTrailer = (b: Uint8Array) => b.subarray(0, Buffer.from(b).lastIndexOf("\nxref") + 1);
export const truncated = (b: Uint8Array, keep = 0.55) => b.subarray(0, Math.floor(b.length * keep));
export const garbage = (n = 5000) => crypto.getRandomValues(new Uint8Array(n));

// ── Inspection ───────────────────────────────────────────────────────────────
export async function textOf(bytes: Uint8Array): Promise<string> {
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.js")) as unknown as { default?: typeof import("pdfjs-dist") } & typeof import("pdfjs-dist");
  const lib = pdfjs.default ?? pdfjs;
  const doc = await lib.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, disableFontFace: true } as never).promise;
  try {
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent();
      out += tc.items.map((it) => ("str" in it ? it.str : "")).join(" ") + " ";
    }
    return out.replace(/\s+/g, " ").trim();
  } finally {
    await doc.destroy();
  }
}

export async function pageInfo(bytes: Uint8Array, index = 0): Promise<{ w: number; h: number; rotation: number; count: number }> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const page = doc.getPage(index);
  const { width, height } = page.getSize();
  return { w: Math.round(width), h: Math.round(height), rotation: page.getRotation().angle, count: doc.getPageCount() };
}

export const asBuffer = (u: Uint8Array) => Buffer.from(u.buffer, u.byteOffset, u.byteLength);