import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { sameDomainValue } from "./domain-value-equality.ts";

describe("runtime domain value equality", () => {
  test("is reflexive and symmetric for JSON-shaped immutable values", () => {
    fc.assert(
      fc.property(fc.jsonValue(), fc.jsonValue(), (left, right) => {
        expect(sameDomainValue(left, left)).toBe(true);
        expect(sameDomainValue(left, right)).toBe(sameDomainValue(right, left));
      }),
    );
  });

  test("compares nested maps, sets, arrays, and optional record fields", () => {
    const left = {
      values: new Map<string, unknown>([
        ["conditions", new Set(["blinded", "prone"])],
        ["rolls", [1, { total: 7 }]],
      ]),
      optional: undefined,
    };
    const equal = {
      values: new Map<string, unknown>([
        ["conditions", new Set(["prone", "blinded"])],
        ["rolls", [1, { total: 7 }]],
      ]),
    };
    const changedMapValue = {
      values: new Map<string, unknown>([
        ["conditions", new Set(["blinded"])],
        ["rolls", [1, { total: 7 }]],
      ]),
    };
    const missingMapKey = {
      values: new Map<string, unknown>([
        ["conditions", new Set(["prone", "blinded"])],
      ]),
    };

    expect(sameDomainValue(left, equal)).toBe(true);
    expect(sameDomainValue(left, changedMapValue)).toBe(false);
    expect(sameDomainValue(left, missingMapKey)).toBe(false);
    expect(sameDomainValue(new Set(["a"]), new Set(["b"]))).toBe(false);
    expect(sameDomainValue([1], [1, 2])).toBe(false);
    expect(sameDomainValue<unknown>(null, {})).toBe(false);
    expect(sameDomainValue<unknown>({}, 1)).toBe(false);
  });
});
