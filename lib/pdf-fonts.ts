/**
 * lib/pdf-fonts.ts
 *
 * Embeds real, licensed TTF fonts (already shipped in /public/fonts for the
 * site's own UI) into a jsPDF document as genuine vector fonts, AND loads
 * the Bengali font as a browser FontFace for a different purpose — see the
 * long comment in markdown-pdf.ts's Bengali handling for why Bengali can't
 * use the same vector-text path as everything else.
 *
 * Why these families: Lora (serif), Inter (sans), and JetBrains Mono
 * (monospace) are the only fonts the project already ships as static TTF
 * files. Lora is a serif book font intended for long-form reading, never
 * wired into next/font or any stylesheet before Part 3 — the natural
 * "document" default. Inter is the site's existing UI sans-serif. All
 * three are OFL-licensed.
 *
 * Fonts NOT in this list (Georgia, Arial, Times New Roman, etc.) cannot be
 * embedded — there are no licensed TTF files for them, and jsPDF cannot
 * fabricate glyphs. Offering them as "supported" would silently produce
 * wrong output.
 */

export type PdfFontFamily = "lora" | "inter" | "jetbrains-mono";

export const PDF_FONT_LABELS: Record<PdfFontFamily, { label: string; description: string }> = {
  lora: { label: "Lora (Serif)", description: "Default — built for long-form reading" },
  inter: { label: "Inter (Sans)", description: "Clean, modern — matches the site UI" },
  "jetbrains-mono": { label: "JetBrains Mono", description: "Fixed-width, technical documents" },
};

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
 *  document's chosen body font. */
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

/**
 * Fetches and embeds one font family's four style variants into the given
 * jsPDF document as genuine vector fonts.
 */
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

/**
 * Registers the chosen body font plus (if different) the mono font used
 * for code, as real embedded vector fonts. Returns the jsPDF font-id to
 * use for each role.
 */
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

// ───────────────────────── Bengali (canvas path) ─────────────────────────
//
// See markdown-pdf.ts for the full explanation of why Bengali text is
// rendered via canvas rather than jsPDF's vector text API. In short:
// Bengali requires OpenType script shaping (reordering pre-base vowel
// signs, forming conjunct ligatures) that jsPDF's simple cmap-based
// text() does not perform — confirmed by direct visual test, where
// embedding the correct font still produced visibly wrong glyph order
// and missing conjuncts. A browser's own <canvas> 2D text rendering does
// perform real shaping (it's the same engine used for on-page text), so
// Bengali runs are rasterized through that instead of drawn as vector
// text, and placed into the PDF as a small image.
const BENGALI_FONT_FILES = { normal: "NotoSansBengali-Regular.ttf", bold: "NotoSansBengali-Bold.ttf" };
const BENGALI_FAMILY_NAME = "TB-NotoSansBengali";
let bengaliFontsLoadedPromise: Promise<void> | null = null;

/**
 * Loads the Bengali font as a browser FontFace usable by <canvas> (and by
 * regular DOM text, incidentally — but this tool only needs the canvas
 * use). Idempotent: safe to call multiple times per page.
 *
 * No italic variant exists for Noto Sans Bengali (Bengali script doesn't
 * use an italic convention the way Latin does) — bold Bengali text uses
 * the real bold face; italic Bengali text falls back to the upright
 * regular face rather than a synthetically-slanted one, which would not
 * be a real typeface design.
 */
export function ensureBengaliFontLoaded(): Promise<void> {
  if (bengaliFontsLoadedPromise) return bengaliFontsLoadedPromise;
  bengaliFontsLoadedPromise = (async () => {
    const [normalBuf, boldBuf] = await Promise.all([
      fetchFontBuffer(BENGALI_FONT_FILES.normal),
      fetchFontBuffer(BENGALI_FONT_FILES.bold),
    ]);
    const normalFace = new FontFace(BENGALI_FAMILY_NAME, normalBuf, { weight: "400" });
    const boldFace = new FontFace(BENGALI_FAMILY_NAME, boldBuf, { weight: "700" });
    await Promise.all([normalFace.load(), boldFace.load()]);
    document.fonts.add(normalFace);
    document.fonts.add(boldFace);
  })();
  return bengaliFontsLoadedPromise;
}

export const BENGALI_FONT_FAMILY_CSS = BENGALI_FAMILY_NAME;

/** Bengali Unicode block (U+0980-U+09FF) covers standard Bengali/Assamese
 *  text, including digits ০-৯. */
export function isBengaliChar(ch: string): boolean {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return false;
  return cp >= 0x0980 && cp <= 0x09ff;
}