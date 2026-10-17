/**
 * lib/txt-pdf-raster.ts
 *
 * Unicode-capable page renderer for the TXT → PDF tool.
 *
 * jsPDF's built-in PDF fonts (Helvetica / Courier / Times) only contain the
 * Latin-1 + Windows-1252 repertoire. Anything else — Bengali, Hindi, Arabic,
 * Chinese, Cyrillic, Greek, Latin Extended letters such as ł / ı / ş, emoji —
 * simply does not render (measured: of 236 probe characters, every one
 * outside Latin-1/CP-1252 failed, in all three fonts).
 *
 * For such text the converter draws each page with the browser's own text
 * engine instead (canvas fillText), which supplies real glyph shaping
 * (Indic conjuncts, Arabic joining), per-character font fallback from the
 * fonts installed on the device, and the Unicode bidirectional algorithm, and
 * embeds each page as an image. The trade-off — pages are images, so the text
 * is not selectable — is stated to the user in the UI. Text that jsPDF *can*
 * draw keeps using the original vector path (selectable, tiny files).
 */

export type TxtFontFamily = "helvetica" | "courier" | "times";

/** Windows-1252 characters above U+00FF that jsPDF's standard fonts do render. */
const CP1252_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

/**
 * Cleans raw file text: strips a BOM, unifies line endings (a stray "\r" is
 * not a line break to jsPDF), expands tabs, and drops control characters.
 */
export function normalizePlainText(text: string): string {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?|\u2028|\u2029|\f/g, "\n")
    .replace(/\t/g, "    ")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F]/g, "");
}

/** True if any character falls outside what jsPDF's standard fonts can draw. */
export function needsUnicodeRendering(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 0x0a || (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || CP1252_EXTRA.has(c)) continue;
    return true;
  }
  return false;
}

const RTL_SCRIPT = /[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}]/u;
const LETTER = /\p{L}/u;

/** Base direction of a paragraph: the first strong (letter) character decides (UAX #9, P2–P3). */
export function paragraphDirection(paragraph: string): "ltr" | "rtl" {
  for (const ch of paragraph) {
    if (LETTER.test(ch)) return RTL_SCRIPT.test(ch) ? "rtl" : "ltr";
  }
  return "ltr";
}

type SegmenterCtor = new (
  locale?: string | string[],
  options?: { granularity: "grapheme" | "word" | "sentence" }
) => { segment(input: string): Iterable<{ segment: string }> };

function getSegmenter(): SegmenterCtor | null {
  const S = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  return S ?? null;
}

/** Splits into user-perceived characters (keeps base + combining marks / ZWJ sequences together). */
function graphemes(s: string): string[] {
  const S = getSegmenter();
  if (S) return Array.from(new S(undefined, { granularity: "grapheme" }).segment(s), (x) => x.segment);
  return Array.from(s);
}

/** Dictionary-aware word pieces — used only to break tokens that are too wide for one line (CJK, Thai...). */
function wordPieces(s: string): string[] {
  const S = getSegmenter();
  if (S) return Array.from(new S(undefined, { granularity: "word" }).segment(s), (x) => x.segment);
  return [s];
}

/**
 * Greedy line wrapping driven by real glyph metrics (`measure` = canvas
 * measureText width). Whitespace never forces a break; a token wider than a
 * whole line is split at word-piece boundaries, then at character boundaries.
 * Leading indentation of the paragraph is preserved.
 */
export function wrapParagraph(paragraph: string, maxWidth: number, measure: (s: string) => number): string[] {
  if (paragraph.trim() === "") return [""];

  const lines: string[] = [];
  let line = "";
  const flush = () => { lines.push(line.replace(/\s+$/, "")); line = ""; };

  const placePiece = (piece: string) => {
    if (line !== "" && measure((line + piece).replace(/\s+$/, "")) > maxWidth) flush();
    if (measure(piece) <= maxWidth) { line += piece; return; }
    for (const g of graphemes(piece)) {          // piece wider than a line: split by character
      if (line !== "" && measure(line + g) > maxWidth) flush();
      line += g;
    }
  };

  for (const token of paragraph.split(/(\s+)/)) {
    if (token === "") continue;
    if (/^\s+$/.test(token)) { line += token; continue; }
    if (measure((line + token).replace(/\s+$/, "")) <= maxWidth) { line += token; continue; }
    if (line.trim() !== "") flush(); else line = "";
    if (measure(token) <= maxWidth) { line = token; continue; }
    for (const piece of wordPieces(token)) placePiece(piece);
  }
  if (line !== "" || lines.length === 0) flush();
  return lines;
}

/** CSS font stacks; trailing generics let the browser pick per-character fallbacks for other scripts. */
export const CSS_FONT_STACKS: Record<TxtFontFamily, string> = {
  courier:   `"Courier New", Courier, "Noto Sans Mono", "DejaVu Sans Mono", monospace`,
  helvetica: `Helvetica, Arial, "Noto Sans", system-ui, sans-serif`,
  times:     `"Times New Roman", Times, "Noto Serif", serif`,
};

export interface RasterOptions {
  pageWidthMm: number;
  pageHeightMm: number;
  marginMm: number;
  fontSizePt: number;
  fontFamily: TxtFontFamily;
  /** Render resolution; 170 dpi keeps small text crisp while a page stays ~2.8 MP. */
  dpi?: number;
  /** Override the CSS font stack (tests). */
  fontStack?: string;
}

type Canvas = HTMLCanvasElement;
type Ctx = CanvasRenderingContext2D;

interface LaidOutLine { text: string; dir: "ltr" | "rtl" }

const yieldToUi = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Lays the text out and hands every finished page canvas to `onPage` (the
 * caller encodes it and adds it to the PDF). The canvas is released right
 * afterwards, so memory stays flat however long the document is.
 *
 * Returns the number of pages produced.
 */
export async function renderPlainTextPages(
  text: string,
  opts: RasterOptions,
  createCanvas: (width: number, height: number) => Canvas,
  onPage: (canvas: Canvas, pageIndex: number, pageCount: number) => void | Promise<void>
): Promise<number> {
  const dpi = opts.dpi ?? 170;
  const pxPerMm = dpi / 25.4;
  const pageW = Math.round(opts.pageWidthMm * pxPerMm);
  const pageH = Math.round(opts.pageHeightMm * pxPerMm);
  const margin = Math.round(opts.marginMm * pxPerMm);
  const fontPx = (opts.fontSizePt * dpi) / 72;
  const lineH = fontPx * 1.45; // generous: Indic/Arabic marks need more leading than Latin
  const maxWidth = pageW - margin * 2;
  const font = `${fontPx}px ${opts.fontStack ?? CSS_FONT_STACKS[opts.fontFamily]}`;

  const scratch = createCanvas(16, 16).getContext("2d") as Ctx | null;
  if (!scratch) throw new Error("Canvas context unavailable");
  scratch.font = font;
  const measure = (s: string) => scratch.measureText(s).width;

  // ── Layout: wrap every paragraph ─────────────────────────────────────────
  const laidOut: LaidOutLine[] = [];
  const paragraphs = normalizePlainText(text).split("\n");
  for (let i = 0; i < paragraphs.length; i++) {
    const dir = paragraphDirection(paragraphs[i]);
    for (const l of wrapParagraph(paragraphs[i], maxWidth, measure)) laidOut.push({ text: l, dir });
    if (i % 200 === 199) await yieldToUi();
  }

  const linesPerPage = Math.max(1, Math.floor((pageH - margin * 2) / lineH));
  const pageCount = Math.max(1, Math.ceil(laidOut.length / linesPerPage));

  // ── Paint ────────────────────────────────────────────────────────────────
  for (let p = 0; p < pageCount; p++) {
    const canvas = createCanvas(pageW, pageH);
    const ctx = canvas.getContext("2d") as Ctx | null;
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageW, pageH);
    ctx.fillStyle = "#000000";
    ctx.font = font;
    ctx.textBaseline = "alphabetic";

    const m = ctx.measureText("Hg");
    const ascent  = m.fontBoundingBoxAscent  ?? fontPx * 0.9;
    const descent = m.fontBoundingBoxDescent ?? fontPx * 0.25;

    const first = p * linesPerPage;
    for (let i = 0; i < linesPerPage && first + i < laidOut.length; i++) {
      const { text: t, dir } = laidOut[first + i];
      if (t === "") continue;
      const baseline = margin + i * lineH + (lineH - (ascent + descent)) / 2 + ascent;
      ctx.direction = dir;
      ctx.textAlign = dir === "rtl" ? "right" : "left";
      ctx.fillText(t, dir === "rtl" ? pageW - margin : margin, baseline);
    }

    await onPage(canvas, p, pageCount);
    canvas.width = canvas.height = 0; // release the backing store
    if (p % 3 === 2) await yieldToUi();
  }
  return pageCount;
}