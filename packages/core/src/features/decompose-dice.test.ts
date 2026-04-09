import { describe, expect, it } from "vitest";

import { decomposeDice } from "#/features/decompose-dice.ts";

describe("decomposeDice", () => {
  it("partitions 25 into 8d6 with even distribution", () => {
    const result = decomposeDice(25, 8, 6);
    expect(result).not.toBeNull();
    expect(result).toHaveLength(8);
    expect(result!.reduce((a, b) => a + b, 0)).toBe(25);
    expect(result!.every((v) => v >= 1 && v <= 6)).toBe(true);
    // 25/8 = 3 remainder 1: first die gets 4, rest get 3
    expect(result).toEqual([4, 3, 3, 3, 3, 3, 3, 3]);
  });

  it("returns all 1s for minimum total", () => {
    expect(decomposeDice(8, 8, 6)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
  });

  it("returns all max for maximum total", () => {
    expect(decomposeDice(48, 8, 6)).toEqual([6, 6, 6, 6, 6, 6, 6, 6]);
  });

  it("returns null when total is below minimum", () => {
    expect(decomposeDice(7, 8, 6)).toBeNull();
  });

  it("returns null when total is above maximum", () => {
    expect(decomposeDice(49, 8, 6)).toBeNull();
  });

  it("handles single d20", () => {
    expect(decomposeDice(1, 1, 20)).toEqual([1]);
  });

  it("handles zero dice edge case", () => {
    expect(decomposeDice(0, 0, 6)).toEqual([]);
  });

  it("all values are integers in [1, dieSize]", () => {
    const result = decomposeDice(30, 10, 6)!;
    expect(result).toHaveLength(10);
    for (const v of result) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
    expect(result.reduce((a, b) => a + b, 0)).toBe(30);
  });
});
