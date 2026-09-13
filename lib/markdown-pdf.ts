/**
 * lib/markdown-pdf.ts
 * PART 2 SCOPE ONLY — see the Part 2 report for what is deliberately not
 * here yet (font embedding/Bengali = Part 3, highlight/color/sup/sub/
 * alignment/page-break = Part 4/6, full link-workflow verification =
 * Part 6, table/pagination stress-matrix = Part 7).
 *
 * Renders Markdown directly to a jsPDF document using jsPDF's native
 * vector text API — NOT html2canvas + addImage, which is what the
 * original tool used and which Part 1 identified as the root cause of
 * clipped text and non-functional links.
 *
 * Why this fixes Part 2's specific complaints:
 *  - Real pagination: every line is placed at a known Y position, so we
 *    check "does this fit before the bottom margin?" before drawing it —
 *    a page break can only ever happen *between* lines, never through the
 *    middle of one, and nothing is silently lost.
 *  - Whitespace fidelity: whitespace runs are measured and placed at
 *    their literal width instead of being collapsed by HTML/CSS rules,
 *    and every source line break is treated as significant (this is a
 *    deliberate departure from CommonMark's "soft break = reflow" rule —
 *    matching what the user actually typed matters more here than strict
 *    spec fidelity for a plain writing tool).
 *  - Entity fidelity: marked's tokenizer HTML-entity-escapes plain text
 *    as it tokenizes (confirmed empirically — a token's .raw keeps the
 *    literal source, but .text turns "'" into "&#39;", "&" into "&amp;",
 *    etc., since .text is normally destined for marked's own HTML
 *    renderer). We never call that renderer — we draw .text directly —
 *    so left undecoded, every apostrophe or ampersand in the document
 *    would print as literal entity code. Decoded back out below.
 *
 * Preserves every formatting type the ORIGINAL tool already supported
 * (bold, italic, strikethrough, underline via the pre-existing <u>
 * command, inline code, links, ordered/unordered/checklist lists,
 * blockquote, fenced code blocks, tables, horizontal rules) — Part 2's
 * no-regression rule requires these keep working, not that they're
 * removed for simplicity.
 */

import { marked, type Token, type Tokens } from "marked";

// ───────────────────────────── Public API ─────────────────────────────

export interface MarkdownPdfOptions {
  pageSize: "a4" | "letter";
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

  // PART 2 PLACEHOLDER: jsPDF's built-in Times face. Always available, no
  // fetch/embedding needed — deliberately not the real font system (that's
  // Part 3, and it's where the Bengali-coverage question gets resolved).
  const BODY_FONT = "times";
  const MONO_FONT = "courier";

  const ctx: Ctx = {
    pdf,
    pageW,
    pageH,
    marginX,
    marginTop,
    marginBottom,
    maxW: pageW - marginX * 2,
    y: marginTop,
    bodyFontId: BODY_FONT,
    monoFontId: MONO_FONT,
    baseFontSize: options.fontSize,
  };

  const preprocessed = preprocessWhitespace(markdown);
  const tokens = marked.lexer(preprocessed);

  pdf.setFont(ctx.bodyFontId, "normal");
  pdf.setFontSize(ctx.baseFontSize);
  renderBlocks(ctx, tokens, { x0: marginX, maxW: ctx.maxW });

  const blob = pdf.output("blob") as Blob;
  return { blob, pageCount: pdf.getNumberOfPages() };
}

// ───────────────────────── Whitespace preprocessing ─────────────────────────
//
// Markdown's own semantics collapse runs of 2+ blank lines into a single
// paragraph break. To honor "preserve blank lines" (3 blank lines in the
// source should leave extra visible gap, not the same gap as 1), every
// *extra* blank line becomes an explicit block-level HTML marker that the
// block renderer turns into additional vertical space. Multi-space and
// single-\n-inside-a-paragraph fidelity need no preprocessing — they're
// handled later during inline layout by reading the literal characters
// straight from marked's text tokens.

/**
 * Exported (not just used internally) because it must also run on the
 * content fed into the live preview — otherwise "3 blank lines get extra
 * gap" (or forced line breaks) would be true in the exported PDF but false
 * in the editor's own preview, which is exactly the mismatch Part 2 exists
 * to eliminate. See TextToPdf.tsx's previewSource.
 *
 * Deliberately dependency-free: forced line breaks are produced using
 * CommonMark's own standard hard-break syntax (two trailing spaces before
 * a newline) rather than a plugin like remark-breaks. Both marked (this
 * file's PDF path) and vanilla remark/react-markdown (the live preview,
 * with no extra plugin) already recognize that syntax natively — verified
 * directly against both parsers before relying on it. That avoids the
 * class of bug where a preview-only plugin dependency turns out not to be
 * genuinely installed in the real project, only listed as intended.
 *
 * Code-fence–aware: content inside ``` fenced code blocks ``` is left
 * completely untouched, so this never injects trailing spaces into the
 * user's literal code.
 */
export function preprocessWhitespace(src: string): string {
  const segments = src.split(/(```[\s\S]*?```)/g);
  return segments
    .map((seg, i) => (i % 2 === 1 ? seg : preprocessProseSegment(seg)))
    .join("");
}

function preprocessProseSegment(seg: string): string {
  // 1. Collapse runs of 3+ newlines into a normal paragraph break plus an
  //    explicit, visible spacer marker for every EXTRA blank line beyond
  //    the first (a run of N newlines = N-1 blank lines; one blank line is
  //    the ordinary paragraph gap, so N-2 markers cover the rest).
  let out = seg.replace(/\n{3,}/g, (match) => {
    const extra = match.length - 2;
    // The inline height is what makes this marker actually visible in the
    // browser preview (an empty <div> with no content and no height
    // collapses to zero); the PDF renderer only checks the class name, so
    // the style attribute is harmless there.
    return "\n\n" + '<div class="pdf-blank-line" style="height:1em"></div>\n\n'.repeat(extra);
  });
  // 2. Every remaining lone single newline (not part of a \n\n paragraph
  //    break) becomes a real hard break via CommonMark's own syntax.
  out = out.replace(/(?<!\n)\n(?!\n)/g, "  \n");
  return out;
}

// marked's inline tokenizer HTML-entity-escapes plain text as it
// tokenizes. .raw keeps the literal source; .text does not. Every
// text-bearing token (text, codespan, escape, image alt) needs this
// decoded back out before it reaches layout. Block-level "code" tokens
// are unaffected (verified empirically) and are deliberately excluded.
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

// ───────────────────────────── Style model ─────────────────────────────

interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
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

// ───────────────────── Inline HTML (only <u>, pre-existing) ─────────────────────
// The original tool's only custom toolbar command wraps a selection in
// <u>...</u>. That's the one raw-HTML tag Part 2 needs to keep working;
// <mark>/<span>/<sup>/<sub> are new capability that doesn't exist yet
// (Part 4), so they're intentionally not recognized here.

function isUnderlineOpen(raw: string): boolean {
  return /^<u>$/i.test(raw.trim());
}
function isUnderlineClose(raw: string): boolean {
  return /^<\/u>$/i.test(raw.trim());
}

// ───────────────────────────── Inline flattening ─────────────────────────────

function flattenInline(tokens: Token[] | undefined, baseStyle: RunStyle): Run[] {
  if (!tokens) return [];
  const runs: Run[] = [];
  let underlineDepth = 0;
  const withUnderline = (s: RunStyle): RunStyle => (underlineDepth > 0 ? { ...s, underline: true } : s);

  for (const t of tokens) {
    switch (t.type) {
      case "text": {
        const tt = t as Tokens.Text;
        if (tt.tokens && tt.tokens.length) runs.push(...flattenInline(tt.tokens, withUnderline(baseStyle)));
        else runs.push({ text: decodeHtmlEntities(tt.text), style: withUnderline(baseStyle) });
        break;
      }
      case "strong":
        runs.push(...flattenInline((t as Tokens.Strong).tokens, withUnderline({ ...baseStyle, bold: true })));
        break;
      case "em":
        runs.push(...flattenInline((t as Tokens.Em).tokens, withUnderline({ ...baseStyle, italic: true })));
        break;
      case "del":
        runs.push(...flattenInline((t as Tokens.Del).tokens, withUnderline({ ...baseStyle, strike: true })));
        break;
      case "codespan":
        runs.push({ text: decodeHtmlEntities((t as Tokens.Codespan).text), style: withUnderline({ ...baseStyle, code: true }) });
        break;
      case "link":
        runs.push(...flattenInline((t as Tokens.Link).tokens, withUnderline({ ...baseStyle, href: (t as Tokens.Link).href })));
        break;
      case "br":
        runs.push({ text: "\n", style: baseStyle });
        break;
      case "escape":
        runs.push({ text: decodeHtmlEntities((t as Tokens.Escape).text), style: withUnderline(baseStyle) });
        break;
      case "html": {
        const raw = (t as Tokens.HTML).raw;
        if (isUnderlineOpen(raw)) underlineDepth++;
        else if (isUnderlineClose(raw)) underlineDepth = Math.max(0, underlineDepth - 1);
        break;
      }
      default: {
        const anyT = t as unknown as { text?: string };
        if (anyT.text) runs.push({ text: decodeHtmlEntities(anyT.text), style: withUnderline(baseStyle) });
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
    const parts = run.text.match(/[^\S\n]+|\n|\S+/g) ?? [];
    for (const p of parts) {
      if (p === "\n") out.push({ text: "", style: run.style, isSpace: false, isBreak: true });
      else out.push({ text: p, style: run.style, isSpace: /^[^\S\n]+$/.test(p), isBreak: false });
    }
  }
  return out;
}

function applyTokFont(ctx: Ctx, style: RunStyle, baseSize: number) {
  if (style.code) {
    ctx.pdf.setFont(ctx.monoFontId, style.bold ? "bold" : "normal");
    ctx.pdf.setFontSize(baseSize * 0.92);
  } else {
    const fstyle = style.bold && style.italic ? "bolditalic" : style.bold ? "bold" : style.italic ? "italic" : "normal";
    ctx.pdf.setFont(ctx.bodyFontId, fstyle);
    ctx.pdf.setFontSize(baseSize);
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
    while (current.length && current[current.length - 1].isSpace) current.pop();
    lines.push(current);
    current = [];
    x = 0;
  };

  for (const tok of tokens) {
    if (tok.isBreak) { pushLine(); continue; }
    if (tok.text === "") continue;
    applyTokFont(ctx, tok.style, baseSize);
    const w = ctx.pdf.getTextWidth(tok.text);
    if (x + w > maxW && current.length > 0) {
      if (tok.isSpace) continue;
      pushLine();
    }
    if (tok.isSpace && current.length === 0) continue;
    current.push({ ...tok, x, width: w });
    x += w;
  }
  if (current.length) pushLine();
  return lines;
}

function lineHeightMm(baseSizePt: number): number {
  return baseSizePt * PT_TO_MM * 1.5;
}

function drawLines(ctx: Ctx, lines: PlacedTok[][], x0: number, baseSize: number) {
  const lh = lineHeightMm(baseSize);
  const fsMm = baseSize * PT_TO_MM;

  for (const line of lines) {
    if (line.length === 0) { ctx.y += lh; continue; }
    ensureSpace(ctx, lh);
    const lineY = ctx.y + fsMm * 0.75;

    for (const tok of line) {
      applyTokFont(ctx, tok.style, baseSize);
      if (tok.style.href) ctx.pdf.setTextColor(...LINK_COLOR);
      else if (tok.style.code) ctx.pdf.setTextColor(190, 30, 90);
      else ctx.pdf.setTextColor(...BODY_COLOR);

      if (!tok.isSpace) ctx.pdf.text(tok.text, x0 + tok.x, lineY);

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

    // Links render as real clickable annotations as a direct consequence
    // of using jsPDF's text API at all — not something extra bolted on.
    // Full link-workflow verification (editing, removal, the dedicated
    // test matrix) is Part 6's job, not re-verified here.
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

function drawParagraphRuns(ctx: Ctx, runs: Run[], frame: Frame, baseSize: number) {
  const lines = layoutRuns(ctx, runs, frame.maxW, baseSize);
  drawLines(ctx, lines, frame.x0, baseSize);
}

// ───────────────────────────── Block rendering ─────────────────────────────

function renderBlocks(ctx: Ctx, tokens: Token[], frame: Frame) {
  for (const token of tokens) renderBlock(ctx, token, frame);
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
      drawParagraphRuns(ctx, flattenInline(h.tokens, { bold: true }), frame, size);
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
      drawParagraphRuns(ctx, flattenInline(p.tokens, {}), frame, ctx.baseFontSize);
      ctx.y += lineHeightMm(ctx.baseFontSize) * 0.4;
      return;
    }

    case "blockquote": {
      const bq = token as Tokens.Blockquote;
      const startY = ctx.y;
      const innerFrame: Frame = { x0: frame.x0 + 6, maxW: frame.maxW - 6 };
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
      for (const codeLine of wrapped) {
        ensureSpace(ctx, lh);
        // Fill exactly this line's own [ctx.y, ctx.y+lh) slot — never
        // reaching into the previous line's slot, or a later rect would
        // paint over and erase part of an earlier line's glyphs.
        ctx.pdf.setFillColor(244, 244, 244);
        ctx.pdf.rect(frame.x0, ctx.y, frame.maxW, lh, "F");
        ctx.pdf.setFont(ctx.monoFontId, "normal");
        ctx.pdf.setFontSize(monoSize);
        ctx.pdf.setTextColor(40, 40, 40);
        ctx.pdf.text(codeLine, frame.x0 + 4, ctx.y + lh * 0.55);
        ctx.y += lh;
      }
      ctx.y += 4;
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

    case "table":
      renderTable(ctx, token as Tokens.Table, frame);
      return;

    case "hr":
      ensureSpace(ctx, 6);
      ctx.y += 2;
      ctx.pdf.setDrawColor(180, 180, 180);
      ctx.pdf.line(frame.x0, ctx.y, frame.x0 + frame.maxW, ctx.y);
      ctx.y += 4;
      return;

    case "html": {
      const h = token as Tokens.HTML;
      if (/class="pdf-blank-line"/.test(h.raw.trim())) {
        ctx.y += lineHeightMm(ctx.baseFontSize) * 0.8;
      }
      // Any other raw HTML block: not recognized in this Part, ignored
      // rather than dumped as literal tags into the PDF.
      return;
    }

    case "image": {
      const img = token as Tokens.Image;
      ctx.pdf.setFont(ctx.bodyFontId, "italic");
      ctx.pdf.setFontSize(ctx.baseFontSize * 0.85);
      ctx.pdf.setTextColor(...MUTED_COLOR);
      ensureSpace(ctx, lineHeightMm(ctx.baseFontSize));
      ctx.pdf.text(`[image: ${decodeHtmlEntities(img.text || img.href)}]`, frame.x0, ctx.y + ctx.baseFontSize * PT_TO_MM * 0.75);
      ctx.y += lineHeightMm(ctx.baseFontSize);
      return;
    }

    default: {
      const anyTok = token as unknown as { tokens?: Token[] };
      if (anyTok.tokens) {
        drawParagraphRuns(ctx, flattenInline(anyTok.tokens, {}), frame, ctx.baseFontSize);
        ctx.y += lineHeightMm(ctx.baseFontSize) * 0.4;
      }
    }
  }
}

function renderListItem(ctx: Ctx, item: Tokens.ListItem, frame: Frame, ordered: boolean, index: number) {
  const markerW = 7;
  const innerFrame: Frame = { x0: frame.x0 + markerW, maxW: frame.maxW - markerW };

  ensureSpace(ctx, lineHeightMm(ctx.baseFontSize));
  ctx.pdf.setFont(ctx.bodyFontId, "normal");
  ctx.pdf.setFontSize(ctx.baseFontSize);
  ctx.pdf.setTextColor(...BODY_COLOR);
  const marker = item.task ? (item.checked ? "[x]" : "[ ]") : ordered ? `${index}.` : "\u2022";
  ctx.pdf.text(marker, frame.x0, ctx.y + ctx.baseFontSize * PT_TO_MM * 0.75);

  const startY = ctx.y;
  renderBlocks(ctx, item.tokens, innerFrame);
  if (ctx.y === startY) ctx.y += lineHeightMm(ctx.baseFontSize);
}

function renderTable(ctx: Ctx, table: Tokens.Table, frame: Frame) {
  const cols = table.header.length;
  const colW = frame.maxW / cols;
  const cellPad = 2;
  const fs = ctx.baseFontSize * 0.9;
  const lh = lineHeightMm(fs) * 0.85;

  const measureRow = (cells: Tokens.TableCell[]): string[][] =>
    cells.map((cell) => {
      ctx.pdf.setFont(ctx.bodyFontId, "normal");
      ctx.pdf.setFontSize(fs);
      return ctx.pdf.splitTextToSize(cell.text || " ", colW - cellPad * 2) as string[];
    });

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