import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { compareCodePointStrings } from "./publication-delta-verifier-core.ts";

function compareCodePointArrays(left: string, right: string): number {
  const leftCodePoints = Array.from(left, (character) =>
    character.codePointAt(0),
  );
  const rightCodePoints = Array.from(right, (character) =>
    character.codePointAt(0),
  );
  const sharedLength = Math.min(leftCodePoints.length, rightCodePoints.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const leftCodePoint = leftCodePoints[index];
    const rightCodePoint = rightCodePoints[index];
    if (leftCodePoint === rightCodePoint) continue;
    return leftCodePoint! < rightCodePoint! ? -1 : 1;
  }
  return leftCodePoints.length - rightCodePoints.length;
}

const utf16String = fc
  .array(fc.integer({ min: 0, max: 0xffff }), { maxLength: 80 })
  .map((codeUnits) => String.fromCharCode(...codeUnits));

describe("publication delta verifier code-point ordering", () => {
  test("matches the previous array comparator for arbitrary UTF-16 strings", () => {
    fc.assert(
      fc.property(utf16String, utf16String, (left, right) => {
        expect(compareCodePointStrings(left, right)).toBe(
          compareCodePointArrays(left, right),
        );
      }),
      { numRuns: 1_000, seed: 445 },
    );
  });

  test.each([
    ["", ""],
    ["", "a"],
    ["a", ""],
    ["a", "abc"],
    ["abc", "a"],
    ["same", "same"],
    ["\ud83d\ude00", "\ue000"],
    ["\ud83d\ude00", "\ud83d\ude01"],
    ["\ud83d\ude00", "\ud83d\ude00\ud83d\ude01"],
    ["\ud83d", "\ud83d\ude00"],
    ["\udc00", "\ud83d\ude00"],
    ["a\ud83d\ude00z", "a\ud83d\ude01z"],
  ])("preserves edge-case order for %j and %j", (left, right) => {
    expect(compareCodePointStrings(left, right)).toBe(
      compareCodePointArrays(left, right),
    );
  });
});
