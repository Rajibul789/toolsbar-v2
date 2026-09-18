/**
 * lib/pdf-fonts.ts
 *
 * Embeds Lora (the tool's fixed default — see markdown-pdf.ts) and
 * JetBrains Mono (used for code regardless of body font) as real vector
 * fonts in the PDF, and provides the data needed to decide, character by
 * character, whether the embedded font can actually render a given
 * codepoint — see the coverage-range section below. That decision is what
 * lets the rest of the system stay genuinely language-agnostic: nothing
 * here checks "is this Bengali" or names any specific script or language.
 * It only ever asks "is this codepoint in the font we embedded," which is
 * true or false the same way for every script.
 */

export type PdfFontFamily = "lora" | "inter" | "jetbrains-mono";

const FONT_FILES: Record<PdfFontFamily, { normal: string; bold: string; italic: string; bolditalic: string }> = {
  lora: {
    normal: "Lora-Regular.ttf",
    bold: "Lora-Bold.ttf",
    italic: "Lora-Italic.ttf",
    bolditalic: "Lora-BoldItalic.ttf",
  },
  inter: {
    normal: "Inter-Regular.ttf",
    bold: "Inter-Bold.ttf",
    italic: "Inter-Italic.ttf",
    bolditalic: "Inter-BoldItalic.ttf",
  },
  "jetbrains-mono": {
    normal: "JetBrainsMono-Regular.ttf",
    bold: "JetBrainsMono-Bold.ttf",
    italic: "JetBrainsMono-Italic.ttf",
    bolditalic: "JetBrainsMono-BoldItalic.ttf",
  },
};

// jsPDF's internal font "id" strings — arbitrary but must be unique and
// must match what's later passed to pdf.setFont(id, style).
const FONT_IDS: Record<PdfFontFamily, string> = {
  lora: "TB-Lora",
  inter: "TB-Inter",
  "jetbrains-mono": "TB-JetBrainsMono",
};

/** Monospace family, used for inline code / code blocks regardless of the
 *  document's body font. */
export const MONO_FONT_FAMILY: PdfFontFamily = "jetbrains-mono";

const fetchCache = new Map<string, Promise<ArrayBuffer>>();

function fetchFontBuffer(filename: string): Promise<ArrayBuffer> {
  let cached = fetchCache.get(filename);
  if (!cached) {
    cached = fetch(`/fonts/${filename}`).then((res) => {
      if (!res.ok) throw new Error(`Font asset missing: /fonts/${filename} (${res.status})`);
      return res.arrayBuffer();
    });
    fetchCache.set(filename, cached);
  }
  return cached;
}

/** ArrayBuffer -> base64, chunked to avoid call-stack blowups on large
 *  files (spreading a full Uint8Array into String.fromCharCode at once
 *  can exceed engine argument-count limits for fonts in the ~100-300KB
 *  range). */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

async function fetchFontBase64(filename: string): Promise<string> {
  return arrayBufferToBase64(await fetchFontBuffer(filename));
}

/** Fetches and embeds one font family's four style variants into the
 *  given jsPDF document as genuine vector fonts. */
export async function registerPdfFont(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  family: PdfFontFamily
): Promise<{ id: string }> {
  const files = FONT_FILES[family];
  const id = FONT_IDS[family];

  const [normal, bold, italic, bolditalic] = await Promise.all([
    fetchFontBase64(files.normal),
    fetchFontBase64(files.bold),
    fetchFontBase64(files.italic),
    fetchFontBase64(files.bolditalic),
  ]);

  pdf.addFileToVFS(files.normal, normal);
  pdf.addFont(files.normal, id, "normal");
  pdf.addFileToVFS(files.bold, bold);
  pdf.addFont(files.bold, id, "bold");
  pdf.addFileToVFS(files.italic, italic);
  pdf.addFont(files.italic, id, "italic");
  pdf.addFileToVFS(files.bolditalic, bolditalic);
  pdf.addFont(files.bolditalic, id, "bolditalic");

  return { id };
}

/** Registers the body font plus (if different) the mono font used for
 *  code, as real embedded vector fonts. Returns the jsPDF font-id to use
 *  for each role. */
export async function registerDocumentFonts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  bodyFamily: PdfFontFamily
): Promise<{ bodyFontId: string; monoFontId: string }> {
  const body = await registerPdfFont(pdf, bodyFamily);
  const mono =
    bodyFamily === MONO_FONT_FAMILY ? body : await registerPdfFont(pdf, MONO_FONT_FAMILY);
  return { bodyFontId: body.id, monoFontId: mono.id };
}

// ───────────────────────── Universal Unicode fallback ─────────────────────────
//
// The embedded fonts above are subsetted TTFs (~226-230 glyphs each) that
// cover Latin text, Western European accented characters, and common
// typographic punctuation — not the full range of scripts a person might
// paste into a text editor. Rather than bundling a specific font for a
// specific language (which only ever covers the languages someone
// remembered to name), every codepoint is checked against what the
// embedded font actually contains. Anything outside that coverage is
// rendered through a separate path (see markdown-pdf.ts) that uses the
// browser's own font stack, so whatever script it is, the browser's own
// installed fonts and text-shaping engine handle it — the same way any
// other web page displays that language correctly. That works for any
// script the browser and device can display, not a preset list.
//
// COVERAGE_RANGES below is generated directly from each embedded TTF's
// own cmap table (which codepoints it actually contains), not typed by
// hand and not a guess.

const LORA_COVERAGE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x000d, 0x000d], [0x0020, 0x007e], [0x00a0, 0x00ac], [0x00ae, 0x00ff],
  [0x0102, 0x0102], [0x0131, 0x0131], [0x0152, 0x0153], [0x02bb, 0x02bc],
  [0x02c6, 0x02c6], [0x02da, 0x02da], [0x02dc, 0x02dc], [0x0300, 0x0301],
  [0x0303, 0x0304], [0x0308, 0x0309], [0x0323, 0x0323], [0x2013, 0x2014],
  [0x2018, 0x201a], [0x201c, 0x201e], [0x2022, 0x2022], [0x2026, 0x2026],
  [0x2032, 0x2033], [0x2039, 0x203a], [0x2044, 0x2044], [0x20ac, 0x20ac],
  [0x2122, 0x2122], [0x2212, 0x2212], [0x2215, 0x2215],
];

const JETBRAINS_MONO_COVERAGE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x000d, 0x000d], [0x0020, 0x007e], [0x00a0, 0x00ff], [0x0102, 0x0102],
  [0x0131, 0x0131], [0x0152, 0x0153], [0x02bc, 0x02bc], [0x02c6, 0x02c6],
  [0x02da, 0x02da], [0x02dc, 0x02dc], [0x0300, 0x0301], [0x0303, 0x0304],
  [0x0308, 0x0309], [0x0323, 0x0323], [0x2013, 0x2014], [0x2018, 0x201a],
  [0x201c, 0x201e], [0x2022, 0x2022], [0x2026, 0x2026], [0x2032, 0x2033],
  [0x2039, 0x203a], [0x2044, 0x2044], [0x20ac, 0x20ac], [0x2122, 0x2122],
  [0x2191, 0x2191], [0x2193, 0x2193], [0x2212, 0x2212], [0x2215, 0x2215],
  [0xfeff, 0xfeff],
];

function isCoveredBy(ranges: ReadonlyArray<readonly [number, number]>, codePoint: number): boolean {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start, end] = ranges[mid];
    if (codePoint < start) hi = mid - 1;
    else if (codePoint > end) lo = mid + 1;
    else return true;
  }
  return false;
}

/** True if the embedded body font (Lora) has a glyph for this character. */
export function isCoveredByBodyFont(ch: string): boolean {
  const cp = ch.codePointAt(0);
  return cp !== undefined && isCoveredBy(LORA_COVERAGE_RANGES, cp);
}

/** True if the embedded mono font (JetBrains Mono, used for code) has a
 *  glyph for this character. */
export function isCoveredByMonoFont(ch: string): boolean {
  const cp = ch.codePointAt(0);
  return cp !== undefined && isCoveredBy(JETBRAINS_MONO_COVERAGE_RANGES, cp);
}

/** Generic CSS font stack for the canvas-rendered fallback path — no
 *  specific language or script is named. "Noto Sans" is tried first
 *  because, as a design goal of that font family, it aims for broad
 *  multi-script coverage; system-ui and sans-serif fall through to
 *  whatever the browser/OS provides for scripts Noto Sans itself doesn't
 *  cover on this device. Actual coverage for any given script therefore
 *  depends on the fonts available in the browser/OS, same as any web
 *  page's text rendering — not something a bundled file can guarantee
 *  for every possible script. */
export const FALLBACK_FONT_CSS_STACK = '"Noto Sans", system-ui, sans-serif';