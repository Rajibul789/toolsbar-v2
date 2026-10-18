/** Page-selection helpers (moved out of the component so they can be tested). */

export type SplitMode = "all" | "range" | "evens" | "odds";

/**
 * Parses "1-3, 5, 8-10" into ascending unique page numbers within 1..total.
 *  - A reversed range such as "5-3" is read as 3-5 (it used to select nothing).
 *  - Open-ended ranges work: "4-" is page 4 to the end, "-3" is pages 1-3.
 *  - Tokens that are not numbers are ignored.
 */
export function parseRanges(input: string, total: number): number[] {
  const pages = new Set<number>();
  for (const part of input.split(",").map((s) => s.trim()).filter(Boolean)) {
    if (part.includes("-")) {
      const [rawA, rawB] = part.split("-").map((x) => x.trim());
      if (rawA === "" && rawB === "") continue;
      let a = rawA === "" ? 1 : Number(rawA);
      let b = rawB === "" ? total : Number(rawB);
      if (!Number.isInteger(a) || !Number.isInteger(b)) continue;
      if (a > b) [a, b] = [b, a];
      for (let i = Math.max(a, 1); i <= Math.min(b, total); i++) pages.add(i);
    } else {
      const n = Number(part);
      if (Number.isInteger(n) && n >= 1 && n <= total) pages.add(n);
    }
  }
  return [...pages].sort((x, y) => x - y);
}

export function selectPages(mode: SplitMode, rangeStr: string, total: number): number[] {
  const all = Array.from({ length: total }, (_, i) => i + 1);
  switch (mode) {
    case "all":   return all;
    case "range": return parseRanges(rangeStr, total);
    case "evens": return all.filter((n) => n % 2 === 0);
    case "odds":  return all.filter((n) => n % 2 !== 0);
  }
}