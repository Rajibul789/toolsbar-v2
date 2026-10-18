import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRanges, selectPages } from "../../lib/pdf-split/ranges";

test("parseRanges: ranges, singles, de-duplication and ascending order", () => {
  assert.deepEqual(parseRanges("1-3, 5, 7-9, 2", 20), [1, 2, 3, 5, 7, 8, 9]);
});

test("parseRanges: clamps to the document and ignores junk", () => {
  assert.deepEqual(parseRanges("0, 3-99, abc, 1.5, -, 4-", 6), [3, 4, 5, 6]);
});

test("parseRanges: a reversed range selects the pages (it used to select nothing)", () => {
  assert.deepEqual(parseRanges("5-3", 10), [3, 4, 5]);
});

test("selectPages: all / evens / odds / range", () => {
  assert.deepEqual(selectPages("all", "", 4), [1, 2, 3, 4]);
  assert.deepEqual(selectPages("evens", "", 7), [2, 4, 6]);
  assert.deepEqual(selectPages("odds", "", 7), [1, 3, 5, 7]);
  assert.deepEqual(selectPages("range", "2-3", 7), [2, 3]);
  assert.deepEqual(selectPages("range", "50", 7), []);
});