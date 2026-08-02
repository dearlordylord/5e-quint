import { describe, expect, test } from "vitest";

import { sameMultisetBy } from "./mechanical-equality.ts";

describe("mechanical multiset equality", () => {
  test("accounts for multiplicity and rejects unmatched values", () => {
    const equalNumbers = (left: number, right: number) => left === right;

    expect(sameMultisetBy([1, 2, 1], [2, 1, 1], equalNumbers)).toBe(true);
    expect(sameMultisetBy([1], [1, 2], equalNumbers)).toBe(false);
    expect(sameMultisetBy([1, 1], [1, 2], equalNumbers)).toBe(false);
  });
});
