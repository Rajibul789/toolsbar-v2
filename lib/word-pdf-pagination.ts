/**
 * lib/word-pdf-pagination.ts
 *
 * Pure (DOM-free) page-break planner for the Word → PDF converter.
 *
 * The converter renders the whole document to an image and then cuts it into
 * A4-sized pages. Cutting at fixed pixel heights (the previous approach)
 * slices straight through lines of text, table rows and images. This module
 * instead picks each page's end at a position where nothing is cut:
 *
 *   tier 1  bottoms of top-level blocks, list items and table rows
 *   tier 2  bottoms of other block elements (nested paragraphs, headings...)
 *   tier 3  bottoms of individual text lines (for a paragraph taller than the
 *           space left on the page)
 *   last    a hard cut at the page limit — only when a single unbreakable
 *           item (e.g. an image) is taller than a page
 *
 * A candidate is only "safe" if no measured ink rectangle (a line of text or
 * an image) straddles it, which also stops cuts through one cell of a table
 * row while another cell's text continues across the same line.
 * Headings are kept with the content that follows them whenever possible.
 *
 * All measurements are CSS pixels relative to the top of the rendered
 * document.
 */

export interface InkRect {
  top: number;
  bottom: number;
}

export interface BreakCandidate {
  /** y position of a block's bottom edge */
  y: number;
  tier: 1 | 2;
  /** Breaking here would strand a heading at the bottom of a page. */
  keepWithNext?: boolean;
}

export interface PageSlice {
  start: number;
  end: number;
  /** True when the page had to be cut at the limit (nothing safe was found). */
  hardCut: boolean;
}

export interface PlanInput {
  /** Height of the part of the document that has content (px). */
  totalHeight: number;
  /** Height of one page's content area (px). */
  pageHeight: number;
  candidates: BreakCandidate[];
  inkRects: InkRect[];
}

/** Tolerance for sub-pixel layout rounding. */
const EPS = 1;
/** A page must be at least this full (fraction of pageHeight) at block level. */
const MIN_FILL_BLOCK = 0.3;
/** ...and at least this full when breaking between lines of one paragraph. */
const MIN_FILL_LINE = 0.1;

/** Builds an O(log n) "does any ink rect straddle y?" test. */
function makeStraddleTest(rects: InkRect[]): (y: number) => boolean {
  const sorted = [...rects].sort((a, b) => a.top - b.top);
  const tops = sorted.map((r) => r.top);
  // prefixMaxBottom[i] = max bottom among sorted[0..i]
  const prefixMaxBottom: number[] = [];
  let max = -Infinity;
  for (const r of sorted) {
    max = Math.max(max, r.bottom);
    prefixMaxBottom.push(max);
  }

  return (y: number) => {
    // Rects that begin strictly above y: sorted indices [0, n)
    let lo = 0;
    let hi = tops.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tops[mid] < y - EPS) lo = mid + 1;
      else hi = mid;
    }
    if (lo === 0) return false;
    // Any of them reaching below y means y lies inside a line / image.
    return prefixMaxBottom[lo - 1] > y + EPS;
  };
}

export function planPages(input: PlanInput): PageSlice[] {
  const { totalHeight, pageHeight } = input;
  if (!(pageHeight > 0)) throw new Error("pageHeight must be positive");

  const straddles = makeStraddleTest(input.inkRects);
  const candidates = [...input.candidates].sort((a, b) => a.y - b.y);
  const lineBottoms = [...new Set(input.inkRects.map((r) => Math.round(r.bottom * 100) / 100))].sort(
    (a, b) => a - b
  );

  const slices: PageSlice[] = [];
  let start = 0;

  while (totalHeight - start > pageHeight + EPS) {
    const limit = start + pageHeight;
    const blockFloor = start + pageHeight * MIN_FILL_BLOCK;
    const lineFloor = start + pageHeight * MIN_FILL_LINE;

    const bestBlock = (tier: 1 | 2, allowKeep: boolean): number | null => {
      let best: number | null = null;
      for (const c of candidates) {
        if (c.tier !== tier) continue;
        if (c.y <= blockFloor || c.y > limit + EPS) continue;
        if (c.keepWithNext && !allowKeep) continue;
        if (straddles(c.y)) continue;
        if (best === null || c.y > best) best = c.y;
      }
      return best;
    };

    const bestLine = (): number | null => {
      let best: number | null = null;
      for (const y of lineBottoms) {
        if (y <= lineFloor || y > limit + EPS) continue;
        if (straddles(y)) continue;
        if (best === null || y > best) best = y;
      }
      return best;
    };

    let end =
      bestBlock(1, false) ?? bestBlock(2, false) ?? bestLine() ?? bestBlock(1, true) ?? bestBlock(2, true);
    let hardCut = false;
    if (end === null || end <= start + EPS) {
      end = limit;
      hardCut = true;
    }
    end = Math.min(end, limit);

    slices.push({ start, end, hardCut });
    start = end;
  }

  slices.push({ start, end: Math.max(totalHeight, start + 1), hardCut: false });
  return slices;
}

/**
 * Groups consecutive slices into render windows no taller than maxWindowHeight
 * (px). Each window is rendered to one canvas, then cut into its pages, so no
 * single canvas ever exceeds the browser's canvas limits however long the
 * document is. A window always holds at least one slice.
 */
export function groupIntoWindows(slices: PageSlice[], maxWindowHeight: number): PageSlice[][] {
  const windows: PageSlice[][] = [];
  let current: PageSlice[] = [];
  for (const slice of slices) {
    const windowStart = current.length ? current[0].start : slice.start;
    if (current.length && slice.end - windowStart > maxWindowHeight) {
      windows.push(current);
      current = [];
    }
    current.push(slice);
  }
  if (current.length) windows.push(current);
  return windows;
}