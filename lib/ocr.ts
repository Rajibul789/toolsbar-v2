"use client";

/**
 * Shared OCR utilities.
 *
 * Used by PDF to Text (OCR fallback for pages whose embedded text layer is
 * missing or unusable) and, from Part 3 onward, by Image to Word — kept in
 * one place instead of duplicated per-tool.
 *
 * Uses tesseract.js's modern createWorker(lang) -> worker.recognize() ->
 * worker.terminate() pattern. The older top-level Tesseract.recognize()
 * convenience function is deprecated as of tesseract.js v5: the library's
 * own docs were rewritten to steer users toward createWorker instead, which
 * is also the API that actually accepts a language selection.
 */

const MIN_USABLE_LENGTH = 20;
const MAX_CONTROL_CHAR_RATIO = 0.05;

/**
 * Decides whether a PDF page's embedded text layer can be trusted, or
 * whether it should be treated as unusable (empty/too short, or corrupted)
 * so an OCR fallback should run instead.
 *
 * Calibrated against real documents, not guessed: legitimate extracted
 * text - in English, Bengali, or any other script - runs at ~0% control
 * characters. PDFs built on a legacy font with a missing or incorrect
 * ToUnicode CMap (a known real-world issue with certain older Bengali
 * fonts) decode to text that is 18-28% raw control characters. A 5%
 * threshold leaves a wide safety margin on both sides.
 */
export function isTextLayerUsable(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < MIN_USABLE_LENGTH) return false;

  let control = 0;
  for (const ch of trimmed) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 32 && ch !== "\n" && ch !== "\t" && ch !== "\r") control++;
  }
  return control / trimmed.length <= MAX_CONTROL_CHAR_RATIO;
}

/**
 * Curated script -> Tesseract language-pack map. Extend this to support
 * more scripts - the detection/selection logic below needs no changes
 * when a new entry is added, which is what makes this scalable rather
 * than hardcoded. Every code is verified against tesseract.js's own
 * `languages` export (100 supported packs) - nothing here is guessed.
 *
 * Known, real limitation: Tesseract's OSD detects a *script*, not an
 * exact *language*. Several languages can share one script (Latin covers
 * English, French, Spanish, German, Vietnamese...; Arabic script also
 * covers Persian and Urdu; Cyrillic covers Russian, Bulgarian, Ukrainian,
 * Serbian...) - detection can only resolve to one representative default
 * per script, not to every language that happens to use it. This is an
 * inherent ceiling of script-level detection, not something fixable in
 * this implementation; it's reported here rather than papered over.
 */
const SCRIPT_LANGUAGE_MAP: Record<string, string> = {
  Latin: "eng",
  Bengali: "ben",
  Devanagari: "hin",
  Arabic: "ara",
  Cyrillic: "rus",
  Greek: "ell",
  Hebrew: "heb",
  Thai: "tha",
  Han: "chi_sim",
  Hangul: "kor",
  Japanese: "jpn",
  Hiragana: "jpn",
  Katakana: "jpn",
  Tamil: "tam",
  Telugu: "tel",
  Kannada: "kan",
  Malayalam: "mal",
  Gujarati: "guj",
  Gurmukhi: "pan",
  Oriya: "ori",
  Myanmar: "mya",
  Georgian: "kat",
  Khmer: "khm",
};

/** Safe default when script detection is inconclusive (empirically
 *  observed on sparse/short pages - OSD needs a reasonable amount of text
 *  to classify confidently), fails outright, or returns a script with no
 *  mapping above. Specifically validated for this app's primary real-world
 *  case (English + Bengali government/institutional PDFs). */
const FALLBACK_LANGS = "eng+ben";

export interface DetectedLanguage {
  /** Language string ready to pass to createOcrWorker, e.g. "hin+eng". */
  lang: string;
  /** Raw script name Tesseract reported, or null if detection didn't resolve one. */
  script: string | null;
}

/**
 * Detects the dominant script on a page image and resolves it to an
 * appropriate Tesseract language pack, always paired with English since
 * real documents very commonly mix in English words, numbers, and dates
 * regardless of primary language (observed on this app's own regression
 * PDFs). Falls back to FALLBACK_LANGS when detection is inconclusive or
 * returns an unmapped script - detection failing must never block
 * extraction outright.
 *
 * Uses a short-lived dedicated worker with Tesseract's Legacy-engine OSD
 * model (script detection isn't part of the default LSTM-only engine in
 * tesseract.js v5, so it needs legacyCore/legacyLang explicitly enabled).
 * This worker is discarded immediately after detection - the actual
 * recognition worker created afterwards only loads the resolved
 * language(s), not the extra legacy/OSD data.
 */
export async function detectLanguage(image: string | Blob | HTMLCanvasElement): Promise<DetectedLanguage> {
  try {
    const { createWorker } = await import("tesseract.js");
    const osdWorker = await createWorker("osd", 1, { legacyCore: true, legacyLang: true });
    try {
      const { data } = await osdWorker.detect(image);
      const script = (data as { script?: string } | undefined)?.script ?? null;
      const mapped = script ? SCRIPT_LANGUAGE_MAP[script] : undefined;
      if (!mapped) return { lang: FALLBACK_LANGS, script };
      return { lang: mapped === "eng" ? "eng" : `${mapped}+eng`, script };
    } finally {
      await osdWorker.terminate();
    }
  } catch {
    // Detection erroring out (unusual input, engine issue, etc.) must
    // never block extraction - fall back to the validated default.
    return { lang: FALLBACK_LANGS, script: null };
  }
}

export interface OcrProgressUpdate {
  status: string;
  progress: number; // 0-1
}

/**
 * Creates a ready-to-use Tesseract worker for the given language(s), e.g.
 * "eng", "ben", or "eng+ben" for combined recognition. The caller owns the
 * worker's lifecycle and must call worker.terminate() when done - reuse one
 * worker across multiple pages/images rather than creating one per item,
 * since spinning up a worker reloads the language model each time.
 */
export async function createOcrWorker(lang: string, onProgress?: (update: OcrProgressUpdate) => void) {
  const { createWorker } = await import("tesseract.js");
  return createWorker(lang, undefined, {
    logger: (m: { status?: string; progress?: number }) => {
      if (onProgress && typeof m?.progress === "number" && typeof m?.status === "string") {
        onProgress({ status: m.status, progress: m.progress });
      }
    },
  });
}