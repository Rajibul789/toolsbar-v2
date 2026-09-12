/**
 * lib/markdown-pdf.ts
 *
 * Renders Markdown (+ a small set of inline HTML extensions the editor's
 * toolbar produces: <u>, <mark style="background:#hex">, <span
 * style="color:#hex">, <sup>, <sub>) directly to a jsPDF document using
 * jsPDF's native vector text API — NOT html2canvas + addImage.
 *
 * Why this exists (replacing the old render-to-canvas-then-slice approach):
 *  - Real clickable links: pdf.link() creates an actual /Subtype /Link
 *    annotation. A rasterized screenshot embedded as a JPEG can never do
 *    this — there's no text/annotation layer in a flat image.
 *  - Real pagination: every line is placed with a known Y position, so we
 *    can check "does this fit before the bottom margin?" before drawing it,
 *    and start a new page between lines/blocks — never mid-line, and text
 *    is never silently lost at a page boundary.
 *  - Whitespace fidelity: we measure and place whitespace runs at their
 *    literal width instead of letting HTML/CSS collapse them, and treat
 *    every source line break as significant (this deliberately does NOT
 *    match CommonMark's "soft break = space" rule; seeing the exact text
 *    the user typed matters more here than strict Markdown spec fidelity).
 *  - Output is real vector text: selectable, searchable, small file size,
 *    crisp at any zoom — not a blurry raster screenshot.
 *
 * Known, honestly-reported limitations (see PART docs in the calling
 * component for the full list):
 *  - Table columns are equal-width. Content-aware column sizing would need
 *    a second measurement pass; equal-width is simple and never overflows.
 *  - Images are not embedded (no image-hosting/upload pipeline exists for
 *    this tool yet) — an image token renders as a small placeholder note
 *    rather than silently vanishing.
 *  - A single word wider than the content column (e.g. a very long URL
 *    with no break opportunities) will overflow its line slightly rather
 *    than being hyphen-split — the same behavior any text layout engine
 *    has for unbreakable runs.
 */

import { marked, type Token, type Tokens } from "marked";
import { registerDocumentFonts, type PdfFontFamily } from "./pdf-fonts";

// ───────────────────────────── Public API ─────────────────────────────

export interface MarkdownPdfOptions {
  pageSize: "a4" | "letter";
  fontFamily: PdfFontFamily;
  fontSize: number; // pt, body text base size
}

export interface MarkdownPdfResult {
  blob: Blob;
  pageCount: number;
}

export async function generateMarkdownPdf(
  markdown: string,
  options: MarkdownPdfOptions
): Promise<MarkdownPdfResult> {
  const { jsPDF } = await import("jspdf");

  const pageW = options.pageSize === "a4" ? 210 : 215.9;
  const pageH = options.pageSize === "a4" ? 297 : 279.4;
  const marginX = 20;
  const marginTop = 20;
  const marginBottom = 20;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: options.pageSize });
  const { bodyFontId, monoFontId } = await registerDocumentFonts(pdf, options.fontFamily);

  const ctx: Ctx = {
    pdf,
    pageW,
    pageH,
    marginX,
    marginTop,
    marginBottom,
    maxW: pageW - marginX * 2,
    y: marginTop,
    bodyFontId,
    monoFontId,
    baseFontSize: options.fontSize,
  };

  const preprocessed = preprocessWhitespace(markdown);
  const tokens = marked.lexer(preprocessed);

  setBodyFont(ctx, { fontSize: ctx.baseFontSize });
  renderBlocks(ctx, tokens, { x0: marginX, maxW: ctx.maxW, indent: 0 });

  const blob = pdf.output("blob") as Blob;
  return { blob, pageCount: pdf.getNumberOfPages() };
}

// ───────────────────────── Whitespace preprocessing ─────────────────────────
//
// Markdown's own semantics collapse runs of 2+ blank lines into a single
// paragraph break. To honor "preserve blank lines" (the user typed 3 blank
// lines, they should see extra gap, not the same gap as 1), we turn every
// *extra* blank line into an explicit block-level HTML marker that the
// block renderer below turns into additional vertical space. Multi-space
// and single-\n-inside-a-paragraph fidelity is handled later, during
// inline layout (see layoutRuns) by measuring literal whitespace width and
// treating "\n" as a forced break rather than a reflow point — that part
// doesn't need preprocessing since we read the literal characters directly
// from marked's text tokens.

function preprocessWhitespace(src: string): string {
  return src.replace(/\n{3,}/g, (match) => {
    // match is N newlines => (N-1) blank lines between two content lines.
    // The first newline plus one more newline (\n\n) is the normal single
    // paragraph break; every additional \n beyond that is one extra blank
    // line the user intentionally left.
    const extra = match.length - 2;
    const markers = "\n\n" + "<div class=\"pdf-blank-line\"></div>\n\n".repeat(extra);
    return markers;
  });
}

// ───────────────────────────── Style model ─────────────────────────────

interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  color?: [number, number, number];
  highlight?: [number, number, number];
  sup?: boolean;
  sub?: boolean;
  href?: string;
}

interface Run {
  text: string; // may contain literal "\n" for forced breaks
  style: RunStyle;
}

interface Ctx {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any;
  pageW: number;
  pageH: number;
  marginX: number;
  marginTop: number;
  marginBottom: number;
  maxW: number;
  y: number;
  bodyFontId: string;
  monoFontId: string;
  baseFontSize: number;
}

interface Frame {
  x0: number; // mm, left edge of the content column
  maxW: number; // mm, column width
  indent: number; // nesting depth, for list markers etc.
}

const PT_TO_MM = 0.352778;
const LINK_COLOR: [number, number, number] = [29, 78, 216]; // blue-700
const MUTED_COLOR: [number, number, number] = [90, 90, 90];
const BODY_COLOR: [number, number, number] = [17, 17, 17];

function ensureSpace(ctx: Ctx, neededMm: number) {
  if (ctx.y + neededMm > ctx.pageH - ctx.marginBottom) {
    ctx.pdf.addPage();
    ctx.y = ctx.marginTop;
  }
}

function setBodyFont(ctx: Ctx, opts: { fontSize: number; bold?: boolean; italic?: boolean }) {
  const style = opts.bold && opts.italic ? "bolditalic" : opts.bold ? "bold" : opts.italic ? "italic" : "normal";
  ctx.pdf.setFont(ctx.bodyFontId, style);
  ctx.pdf.setFontSize(opts.fontSize);
  ctx.pdf.setTextColor(...BODY_COLOR);
}

// ───────────────────────── Inline HTML style-patches ─────────────────────────

// A pasted document's own HTML (Word, Google Docs, a webpage) is far less
// predictable than what our own toolbar generates — colors show up as
// named keywords ("yellow"), rgb()/rgba(), or 3-digit hex, and mark/span
// tags carry extra attributes (class, data-*, other style properties)
// alongside the one we care about. htmlOpenTagStyle recognizes the tag
// *shape* (u/sup/sub/mark/span) independently of whether it can parse the
// specific color, and always returns a patch (even an empty one) for a
// recognized shape — that's what keeps push/pop balanced against
// isHtmlCloseTag, which matches on tag name alone. Returning null only for
// a genuinely unrecognized tag, never for "recognized tag, unreadable
// color", is what prevents a close tag later popping the wrong style off
// the stack and corrupting whatever formatting follows it.
const NAMED_COLORS: Record<string, [number, number, number]> = {
  yellow: [255, 235, 59], red: [220, 38, 38], blue: [37, 99, 235], green: [22, 163, 74],
  orange: [234, 88, 12], purple: [147, 51, 234], pink: [236, 72, 153], cyan: [6, 182, 212],
  magenta: [217, 70, 239], black: [0, 0, 0], white: [255, 255, 255], gray: [107, 114, 128],
  grey: [107, 114, 128], brown: [120, 53, 15], lime: [132, 204, 22], teal: [13, 148, 136],
  navy: [30, 58, 138], maroon: [127, 29, 29], olive: [77, 77, 20], silver: [203, 213, 225],
  gold: [234, 179, 8], indigo: [79, 70, 229], violet: [139, 92, 246], salmon: [248, 113, 113],
  crimson: [190, 18, 60], turquoise: [45, 212, 191], coral: [251, 146, 60], khaki: [217, 199, 122],
};

function parseColor(raw: string): [number, number, number] | null {
  const v = raw.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v) || /^#[0-9a-f]{6}$/.test(v)) return hexToRgb(v);
  const rgb = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  if (NAMED_COLORS[v]) return NAMED_COLORS[v];
  return null;
}

function htmlOpenTagStyle(raw: string): RunStyle | null {
  const trimmed = raw.trim();
  if (/^<u(\s[^>]*)?>$/i.test(trimmed)) return { underline: true };
  if (/^<sup(\s[^>]*)?>$/i.test(trimmed)) return { sup: true };
  if (/^<sub(\s[^>]*)?>$/i.test(trimmed)) return { sub: true };

  const markTag = trimmed.match(/^<mark(\s[^>]*)?>$/i);
  if (markTag) {
    const bg = markTag[1]?.match(/background(?:-color)?\s*:\s*([^;"']+)/i);
    const parsed = bg ? parseColor(bg[1]) : null;
    return { highlight: parsed ?? NAMED_COLORS.yellow };
  }

  const spanTag = trimmed.match(/^<span(\s[^>]*)?>$/i);
  if (spanTag) {
    const attrs = spanTag[1] ?? "";
    // "color:" but not the "color:" inside "background-color:" — a
    // negative lookbehind is the direct way to say that.
    const colorMatch = attrs.match(/(?<!background-)color\s*:\s*([^;"']+)/i);
    const underlineMatch = /text-decoration\s*:\s*[^;"']*underline/i.test(attrs);
    const boldMatch = /font-weight\s*:\s*(?:bold|[6-9]00)/i.test(attrs);
    const italicMatch = /font-style\s*:\s*italic/i.test(attrs);
    const patch: RunStyle = {};
    if (colorMatch) {
      const parsed = parseColor(colorMatch[1]);
      if (parsed) patch.color = parsed;
    }
    if (underlineMatch) patch.underline = true;
    if (boldMatch) patch.bold = true;
    if (italicMatch) patch.italic = true;
    return patch; // {} for an unrecognized span still balances the stack
  }

  return null;
}

function isHtmlCloseTag(raw: string): boolean {
  return /^<\/(u|sup|sub|mark|span)>$/i.test(raw.trim());
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// ───────────────────────────── Inline flattening ─────────────────────────────

// marked's inline tokenizer HTML-entity-escapes plain text as it tokenizes
// (confirmed empirically: a token's .raw keeps the literal source, but its
// .text has "'" -> "&#39;", "&" -> "&amp;", "<"/">" -> "&lt;"/"&gt;", etc.)
// because .text is normally destined for marked's own HTML renderer, where
// that escaping is exactly correct. We never call that renderer — we draw
// .text directly with pdf.text() — so left alone, every apostrophe in the
// document would print as the literal characters "&#39;". Every text-
// bearing token below (text, codespan, escape) needs this decoded back out
// before it reaches layout; block-level "code" tokens are unaffected and
// already carry literal, unescaped text, so they're deliberately not
// included here.
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

function flattenInline(tokens: Token[] | undefined, baseStyle: RunStyle): Run[] {
  if (!tokens) return [];
  const runs: Run[] = [];
  const stack: RunStyle[] = [];
  const active = (): RunStyle => stack.reduce((s, patch) => ({ ...s, ...patch }), baseStyle);

  for (const t of tokens) {
    switch (t.type) {
      case "text": {
        const tt = t as Tokens.Text;
        if (tt.tokens && tt.tokens.length) runs.push(...flattenInline(tt.tokens, active()));
        else runs.push({ text: decodeHtmlEntities(tt.text), style: active() });
        break;
      }
      case "strong":
        runs.push(...flattenInline((t as Tokens.Strong).tokens, { ...active(), bold: true }));
        break;
      case "em":
        runs.push(...flattenInline((t as Tokens.Em).tokens, { ...active(), italic: true }));
        break;
      case "del":
        runs.push(...flattenInline((t as Tokens.Del).tokens, { ...active(), strike: true }));
        break;
      case "codespan":
        runs.push({ text: decodeHtmlEntities((t as Tokens.Codespan).text), style: { ...active(), code: true } });
        break;
      case "link":
        runs.push(...flattenInline((t as Tokens.Link).tokens, { ...active(), href: (t as Tokens.Link).href }));
        break;
      case "br":
        runs.push({ text: "\n", style: active() });
        break;
      case "escape":
        runs.push({ text: decodeHtmlEntities((t as Tokens.Escape).text), style: active() });
        break;
      case "html": {
        const raw = (t as Tokens.HTML).raw;
        const patch = htmlOpenTagStyle(raw);
        if (patch) stack.push(patch);
        else if (isHtmlCloseTag(raw)) stack.pop();
        break;
      }
      default: {
        const anyT = t as unknown as { text?: string };
        if (anyT.text) runs.push({ text: decodeHtmlEntities(anyT.text), style: active() });
      }
    }
  }
  return runs;
}

// ───────────────────────────── Line layout ─────────────────────────────

interface WordTok {
  text: string;
  style: RunStyle;
  isSpace: boolean;
  isBreak: boolean;
}

interface PlacedTok extends WordTok {
  x: number;
  width: number;
}

function tokenizeRuns(runs: Run[]): WordTok[] {
  const out: WordTok[] = [];
  for (const run of runs) {
    // Split into: runs of non-newline whitespace | single "\n" | non-whitespace words
    const parts = run.text.match(/[^\S\n]+|\n|\S+/g) ?? [];
    for (const p of parts) {
      if (p === "\n") out.push({ text: "", style: run.style, isSpace: false, isBreak: true });
      else out.push({ text: p, style: run.style, isSpace: /^[^\S\n]+$/.test(p), isBreak: false });
    }
  }
  return out;
}

function fontSizeForStyle(baseSize: number, style: RunStyle): number {
  return style.sup || style.sub ? baseSize * 0.68 : baseSize;
}

function applyTokFont(ctx: Ctx, style: RunStyle, baseSize: number) {
  const size = fontSizeForStyle(baseSize, style);
  if (style.code) {
    ctx.pdf.setFont(ctx.monoFontId, style.bold ? "bold" : "normal");
    ctx.pdf.setFontSize(size * 0.92);
  } else {
    const fstyle = style.bold && style.italic ? "bolditalic" : style.bold ? "bold" : style.italic ? "italic" : "normal";
    ctx.pdf.setFont(ctx.bodyFontId, fstyle);
    ctx.pdf.setFontSize(size);
  }
}

/** Greedy line-breaking: whitespace runs are legal, width-preserving break
 *  points; "\n" tokens are forced breaks; words never split mid-word. */
function layoutRuns(ctx: Ctx, runs: Run[], maxW: number, baseSize: number): PlacedTok[][] {
  const tokens = tokenizeRuns(runs);
  const lines: PlacedTok[][] = [];
  let current: PlacedTok[] = [];
  let x = 0;

  const pushLine = () => {
    while (current.length && current[current.length - 1].isSpace) current.pop(); // trim trailing space
    lines.push(current);
    current = [];
    x = 0;
  };

  for (const tok of tokens) {
    if (tok.isBreak) {
      pushLine();
      continue;
    }
    if (tok.text === "") continue;
    applyTokFont(ctx, tok.style, baseSize);
    const w = ctx.pdf.getTextWidth(tok.text);
    if (x + w > maxW && current.length > 0) {
      if (tok.isSpace) continue; // drop a space that would start a wrapped line
      pushLine();
    }
    if (tok.isSpace && current.length === 0) continue; // no leading space on a line
    current.push({ ...tok, x, width: w });
    x += w;
  }
  if (current.length) pushLine();
  return lines;
}

function lineHeightMm(baseSizePt: number): number {
  return baseSizePt * PT_TO_MM * 1.5;
}

/** Draws already-broken lines starting at ctx.y, advancing ctx.y and
 *  paginating between lines as needed. Returns nothing; mutates ctx.y. */
function drawLines(ctx: Ctx, lines: PlacedTok[][], x0: number, baseSize: number) {
  const lh = lineHeightMm(baseSize);
  const fsMm = baseSize * PT_TO_MM;

  for (const line of lines) {
    if (line.length === 0) {
      ctx.y += lh;
      continue;
    }
    ensureSpace(ctx, lh);
    const lineY = ctx.y + fsMm * 0.75;

    // Highlights first (so text draws on top)
    for (const tok of line) {
      if (tok.style.highlight) {
        ctx.pdf.setFillColor(...tok.style.highlight);
        ctx.pdf.rect(x0 + tok.x, lineY - fsMm * 0.78, tok.width, fsMm * 1.02, "F");
      }
    }

    // Text + decorations
    for (const tok of line) {
      applyTokFont(ctx, tok.style, baseSize);
      if (tok.style.href) ctx.pdf.setTextColor(...LINK_COLOR);
      else if (tok.style.color) ctx.pdf.setTextColor(...tok.style.color);
      else if (tok.style.code) ctx.pdf.setTextColor(190, 30, 90);
      else ctx.pdf.setTextColor(...BODY_COLOR);

      let ty = lineY;
      if (tok.style.sup) ty -= fsMm * 0.32;
      if (tok.style.sub) ty += fsMm * 0.22;
      if (!tok.isSpace) ctx.pdf.text(tok.text, x0 + tok.x, ty);

      if ((tok.style.underline || tok.style.href) && !tok.isSpace) {
        const uy = lineY + fsMm * 0.1;
        ctx.pdf.setDrawColor(...(tok.style.href ? LINK_COLOR : BODY_COLOR));
        ctx.pdf.line(x0 + tok.x, uy, x0 + tok.x + tok.width, uy);
      }
      if (tok.style.strike && !tok.isSpace) {
        const sy = lineY - fsMm * 0.28;
        ctx.pdf.setDrawColor(...BODY_COLOR);
        ctx.pdf.line(x0 + tok.x, sy, x0 + tok.x + tok.width, sy);
      }
    }

    // Real clickable link annotations — merge contiguous same-href tokens
    let i = 0;
    while (i < line.length) {
      const href = line[i].style.href;
      if (!href) { i++; continue; }
      let j = i;
      while (j < line.length && line[j].style.href === href) j++;
      const startX = x0 + line[i].x;
      const endX = x0 + line[j - 1].x + line[j - 1].width;
      ctx.pdf.link(startX, lineY - fsMm * 0.78, endX - startX, fsMm * 1.0, { url: href });
      i = j;
    }

    ctx.y += lh;
  }
}

type Align = "left" | "center" | "right" | "justify";
const ALIGN_MARKER = /^\{(center|right|justify)\}\s?/;

/** The alignment toolbar buttons prepend a {center}/{right}/{justify}
 *  marker to a paragraph's first line (see TextToPdf.tsx) rather than
 *  wrapping it in raw HTML: marked treats a raw HTML block as one opaque
 *  token and does NOT parse markdown inside it, so a `<div align="center">`
 *  wrapper would silently stop bold/italic/links/etc. from working inside
 *  it. A plain-text marker we strip ourselves has no such limitation. */
function extractAlign(runs: Run[]): { align: Align; runs: Run[] } {
  if (runs.length === 0) return { align: "left", runs };
  const first = runs[0];
  const m = first.text.match(ALIGN_MARKER);
  if (!m) return { align: "left", runs };
  const stripped = first.text.slice(m[0].length);
  const newRuns = stripped.length ? [{ ...first, text: stripped }, ...runs.slice(1)] : runs.slice(1);
  return { align: m[1] as Align, runs: newRuns };
}

function applyAlignment(lines: PlacedTok[][], maxW: number, align: Align): PlacedTok[][] {
  if (align === "left") return lines;
  return lines.map((line, li) => {
    if (line.length === 0) return line;
    const last = line[line.length - 1];
    const natural = last.x + last.width;
    if (align === "center") {
      const off = Math.max(0, (maxW - natural) / 2);
      return line.map((t) => ({ ...t, x: t.x + off }));
    }
    if (align === "right") {
      const off = Math.max(0, maxW - natural);
      return line.map((t) => ({ ...t, x: t.x + off }));
    }
    // justify — distribute leftover width across this line's space tokens;
    // the final line of a paragraph is conventionally left, not stretched.
    const isLastLine = li === lines.length - 1;
    const spaceToks = line.filter((t) => t.isSpace);
    const extra = maxW - natural;
    if (isLastLine || spaceToks.length === 0 || extra <= 0) return line;
    const addPer = extra / spaceToks.length;
    let cum = 0;
    return line.map((t) => {
      const shifted = { ...t, x: t.x + cum };
      if (t.isSpace) {
        shifted.width = t.width + addPer;
        cum += addPer;
      }
      return shifted;
    });
  });
}

function drawParagraphRuns(ctx: Ctx, runs: Run[], frame: Frame, baseSize: number, forceAlign?: Align) {
  const { align, runs: cleanRuns } = forceAlign ? { align: forceAlign, runs } : extractAlign(runs);
  let lines = layoutRuns(ctx, cleanRuns, frame.maxW, baseSize);
  lines = applyAlignment(lines, frame.maxW, align);
  drawLines(ctx, lines, frame.x0, baseSize);
}

// ───────────────────────────── Block rendering ─────────────────────────────

function renderBlocks(ctx: Ctx, tokens: Token[], frame: Frame) {
  for (const token of tokens) {
    renderBlock(ctx, token, frame);
  }
}

function renderBlock(ctx: Ctx, token: Token, frame: Frame) {
  switch (token.type) {
    case "space":
      return;

    case "heading": {
      const h = token as Tokens.Heading;
      const sizes = [0, 22, 18, 15, 13, 12, 11];
      const size = sizes[Math.min(h.depth, 6)] ?? 13;
      ctx.y += lineHeightMm(size) * 0.35;
      const runs = flattenInline(h.tokens, { bold: true });
      drawParagraphRuns(ctx, runs, frame, size);
      if (h.depth <= 2) {
        ensureSpace(ctx, 3);
        ctx.pdf.setDrawColor(210, 210, 210);
        ctx.pdf.line(frame.x0, ctx.y - 2, frame.x0 + frame.maxW, ctx.y - 2);
      }
      ctx.y += lineHeightMm(size) * 0.3;
      return;
    }

    case "paragraph": {
      const p = token as Tokens.Paragraph;
      const runs = flattenInline(p.tokens, {});
      drawParagraphRuns(ctx, runs, frame, ctx.baseFontSize);
      ctx.y += lineHeightMm(ctx.baseFontSize) * 0.4;
      return;
    }

    case "blockquote": {
      const bq = token as Tokens.Blockquote;
      const startY = ctx.y;
      const innerFrame: Frame = { x0: frame.x0 + 6, maxW: frame.maxW - 6, indent: frame.indent + 1 };
      ctx.pdf.setTextColor(...MUTED_COLOR);
      renderBlocks(ctx, bq.tokens, innerFrame);
      ensureSpace(ctx, 0);
      ctx.pdf.setDrawColor(180, 180, 180);
      ctx.pdf.setLineWidth(0.8);
      ctx.pdf.line(frame.x0 + 1.5, startY, frame.x0 + 1.5, ctx.y - lineHeightMm(ctx.baseFontSize) * 0.4);
      ctx.pdf.setLineWidth(0.2);
      return;
    }

    case "code": {
      const c = token as Tokens.Code;
      const monoSize = ctx.baseFontSize * 0.88;
      ctx.pdf.setFont(ctx.monoFontId, "normal");
      ctx.pdf.setFontSize(monoSize);
      const rawLines = c.text.split("\n");
      const wrapped: string[] = [];
      for (const rl of rawLines) {
        const w = ctx.pdf.splitTextToSize(rl.length ? rl : " ", frame.maxW - 8) as string[];
        wrapped.push(...w);
      }
      const lh = lineHeightMm(monoSize) * 0.92;
      ctx.y += 2; // top padding before the shaded block
      // Shade + draw one line at a time (not one rect for the whole block):
      // a multi-page code block then gets a correctly-shaded background on
      // every page it spans, with no cross-page coordinate bookkeeping.
      for (const codeLine of wrapped) {
        ensureSpace(ctx, lh);
        // Fill exactly this line's own [ctx.y, ctx.y+lh) slot — never
        // reaching into the previous line's slot — so a later line's
        // rect can't get drawn on top of and erase part of an earlier
        // line's already-rendered glyphs (consecutive rects must tile
        // with zero overlap since each is drawn, then text drawn on top,
        // strictly in per-line order).
        ctx.pdf.setFillColor(244, 244, 244);
        ctx.pdf.rect(frame.x0, ctx.y, frame.maxW, lh, "F");
        ctx.pdf.setFont(ctx.monoFontId, "normal");
        ctx.pdf.setFontSize(monoSize);
        ctx.pdf.setTextColor(40, 40, 40);
        ctx.pdf.text(codeLine, frame.x0 + 4, ctx.y + lh * 0.55);
        ctx.y += lh;
      }
      ctx.y += 4; // bottom padding after the block
      return;
    }

    case "list": {
      const list = token as Tokens.List;
      let index = typeof list.start === "number" ? list.start : 1;
      for (const item of list.items) {
        renderListItem(ctx, item, frame, list.ordered, index);
        index++;
      }
      ctx.y += lineHeightMm(ctx.baseFontSize) * 0.25;
      return;
    }

    case "table": {
      renderTable(ctx, token as Tokens.Table, frame);
      return;
    }

    case "hr": {
      ensureSpace(ctx, 6);
      ctx.y += 2;
      ctx.pdf.setDrawColor(180, 180, 180);
      ctx.pdf.line(frame.x0, ctx.y, frame.x0 + frame.maxW, ctx.y);
      ctx.y += 4;
      return;
    }

    case "html": {
      const h = token as Tokens.HTML;
      const raw = h.raw.trim();
      if (/class="pdf-blank-line"/.test(raw)) {
        ctx.y += lineHeightMm(ctx.baseFontSize) * 0.8;
        return;
      }
      if (/class="pdf-pagebreak"/.test(raw)) {
        ctx.pdf.addPage();
        ctx.y = ctx.marginTop;
        return;
      }
      // Unknown raw HTML block: ignore rather than dump raw tags into the PDF.
      return;
    }

    case "image": {
      const img = token as Tokens.Image;
      setBodyFont(ctx, { fontSize: ctx.baseFontSize * 0.85, italic: true });
      ctx.pdf.setTextColor(...MUTED_COLOR);
      ensureSpace(ctx, lineHeightMm(ctx.baseFontSize));
      ctx.pdf.text(`[image: ${decodeHtmlEntities(img.text || img.href)}]`, frame.x0, ctx.y + ctx.baseFontSize * PT_TO_MM * 0.75);
      ctx.y += lineHeightMm(ctx.baseFontSize);
      return;
    }

    default: {
      const anyTok = token as unknown as { tokens?: Token[]; text?: string };
      if (anyTok.tokens) {
        const runs = flattenInline(anyTok.tokens, {});
        drawParagraphRuns(ctx, runs, frame, ctx.baseFontSize);
        ctx.y += lineHeightMm(ctx.baseFontSize) * 0.4;
      }
    }
  }
}

function renderListItem(ctx: Ctx, item: Tokens.ListItem, frame: Frame, ordered: boolean, index: number) {
  const markerW = 7;
  const innerFrame: Frame = { x0: frame.x0 + markerW, maxW: frame.maxW - markerW, indent: frame.indent + 1 };

  ensureSpace(ctx, lineHeightMm(ctx.baseFontSize));
  applyTokFont(ctx, {}, ctx.baseFontSize);
  ctx.pdf.setTextColor(...BODY_COLOR);
  // Plain ASCII brackets for checklist markers rather than Unicode ☑/☐:
  // those glyphs aren't reliably present in every embedded font's subset
  // (confirmed missing from Lora/Inter's), and a silently-skipped glyph is
  // worse than a slightly plainer but universally-renderable marker.
  const marker = item.task ? (item.checked ? "[x]" : "[ ]") : ordered ? `${index}.` : "\u2022";
  const markerY = ctx.y + ctx.baseFontSize * PT_TO_MM * 0.75;
  ctx.pdf.text(marker, frame.x0, markerY);

  // Render the item's own block content (paragraph/nested list/etc.) inside the indented frame.
  const startY = ctx.y;
  renderBlocks(ctx, item.tokens, innerFrame);
  if (ctx.y === startY) ctx.y += lineHeightMm(ctx.baseFontSize); // empty item guard
}

function renderTable(ctx: Ctx, table: Tokens.Table, frame: Frame) {
  const cols = table.header.length;
  const colW = frame.maxW / cols;
  const cellPad = 2;
  const fs = ctx.baseFontSize * 0.9;
  const lh = lineHeightMm(fs) * 0.85;

  const measureRow = (cells: Tokens.TableCell[]): string[][] => {
    return cells.map((cell) => {
      applyTokFont(ctx, {}, fs);
      return ctx.pdf.splitTextToSize(cell.text || " ", colW - cellPad * 2) as string[];
    });
  };

  const drawRow = (cells: Tokens.TableCell[], opts: { header?: boolean }) => {
    const wrapped = measureRow(cells);
    const rowLines = Math.max(...wrapped.map((w) => w.length), 1);
    const rowH = rowLines * lh + cellPad * 2;
    ensureSpace(ctx, rowH);
    const top = ctx.y;
    if (opts.header) {
      ctx.pdf.setFillColor(245, 245, 245);
      ctx.pdf.rect(frame.x0, top, frame.maxW, rowH, "F");
    }
    ctx.pdf.setDrawColor(210, 210, 210);
    for (let c = 0; c <= cols; c++) {
      const lx = frame.x0 + c * colW;
      ctx.pdf.line(lx, top, lx, top + rowH);
    }
    ctx.pdf.line(frame.x0, top, frame.x0 + frame.maxW, top);
    ctx.pdf.line(frame.x0, top + rowH, frame.x0 + frame.maxW, top + rowH);

    ctx.pdf.setFont(ctx.bodyFontId, opts.header ? "bold" : "normal");
    ctx.pdf.setFontSize(fs);
    ctx.pdf.setTextColor(...BODY_COLOR);
    wrapped.forEach((linesArr, c) => {
      linesArr.forEach((ln, li) => {
        ctx.pdf.text(ln, frame.x0 + c * colW + cellPad, top + cellPad + (li + 0.75) * lh);
      });
    });
    ctx.y = top + rowH;
  };

  drawRow(table.header, { header: true });
  for (const row of table.rows) drawRow(row, {});
  ctx.y += lineHeightMm(ctx.baseFontSize) * 0.4;
}
