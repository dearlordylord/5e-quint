import { describe, expect, test } from "vitest";
import {
  isFixedDistancePointRange,
  isThresholdTierPointRange,
  type Range,
} from "./types.ts";

describe("Surface range narrowing", () => {
  test("distinguishes fixed-distance and threshold-tier point ranges", () => {
    const fixed = {
      kind: "point",
      feet: 60,
    } as const satisfies Range;
    const tiered = {
      kind: "point",
      feet: {
        kind: "threshold_tiers",
        axis: "character",
        base: 15,
        tiers: [{ atLevel: 5, value: 30 }],
      },
    } as const satisfies Range;

    expect(isFixedDistancePointRange(fixed)).toBe(true);
    expect(isThresholdTierPointRange(fixed)).toBe(false);
    expect(isFixedDistancePointRange(tiered)).toBe(false);
    expect(isThresholdTierPointRange(tiered)).toBe(true);
  });

  test("does not classify non-point ranges as point ranges", () => {
    const touch = { kind: "touch" } as const satisfies Range;

    expect(isFixedDistancePointRange(touch)).toBe(false);
    expect(isThresholdTierPointRange(touch)).toBe(false);
  });
});
