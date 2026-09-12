/**
 * lib/pdf-fonts.ts
 *
 * Embeds real, licensed TTF fonts (already shipped in /public/fonts for the
 * site's own UI) into a jsPDF document so exported PDFs use genuine vector
 * glyphs — selectable, searchable, crisp at any zoom — instead of jsPDF's
 * generic Helvetica/Times/Courier fallbacks or a rasterized screenshot.
 *
 * Why these three families specifically: they're the only fonts the project
 * already ships as static TTF files (see /public/fonts). Lora is a serif
 * book font intended for long-form reading — never wired into next/font or
 * any stylesheet before this — which makes it the natural "document" default.
 * Inter is the site's existing UI sans-serif (next/font/google in
 * app/layout.tsx). JetBrains Mono is the site's existing code font
 * (referenced by --font-mono in tailwind.config.ts / globals.css). All three
 * are OFL-licensed and safe to embed.
 *
 * Fonts NOT in this list (Georgia, Arial, Times New Roman, etc.) cannot be
 * embedded — we don't have licensed TTF files for them, and jsPDF cannot
 * fabricate glyphs. Offering them as "supported" would silently produce
 * wrong output, which is exactly what Part 3 of the brief prohibits ("Do not
 * silently substitute fonts... implement the best technically reliable
 * fallback and report it honestly"). Reporting it honestly means: don't list
 * fonts we can't actually render.
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

// jsPDF's internal font "id" strings — arbitrary but must be unique and must
// match what we later pass to pdf.setFont(id, style).
const FONT_IDS: Record<PdfFontFamily, string> = {
  lora: "TB-Lora",
  inter: "TB-Inter",
  "jetbrains-mono": "TB-JetBrainsMono",
};

/** Monospace family, used for inline code / code blocks regardless of the
 *  document's chosen body font — matches how the site itself always renders
 *  code in JetBrains Mono no matter the surrounding font. */
export const MONO_FONT_FAMILY: PdfFontFamily = "jetbrains-mono";

const fetchCache = new Map<string, Promise<string>>();

/** ArrayBuffer -> base64, chunked to avoid call-stack blowups on large files
 *  (spreading a full Uint8Array into String.fromCharCode at once can exceed
 *  engine argument-count limits for fonts in the ~100-300KB range). */
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
  let cached = fetchCache.get(filename);
  if (!cached) {
    cached = fetch(`/fonts/${filename}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Font asset missing: /fonts/${filename} (${res.status})`);
        return res.arrayBuffer();
      })
      .then(arrayBufferToBase64);
    fetchCache.set(filename, cached);
  }
  return cached;
}

export interface RegisteredFont {
  /** Pass this as the first argument to pdf.setFont(id, style) */
  id: string;
  /** True for every style actually embedded (should always be all 4 here). */
  styles: Array<"normal" | "bold" | "italic" | "bolditalic">;
}

/**
 * Fetches and embeds one font family's four style variants into the given
 * jsPDF document. Safe to call more than once per document for the same
 * family (network fetch is cached; VFS registration is idempotent enough
 * for our purposes since each export builds a fresh jsPDF instance).
 */
export async function registerPdfFont(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  family: PdfFontFamily
): Promise<RegisteredFont> {
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

  return { id, styles: ["normal", "bold", "italic", "bolditalic"] };
}

/**
 * Registers the chosen body font plus (if different) the mono font used for
 * code, in one call. Returns the jsPDF font-id to use for each role.
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
