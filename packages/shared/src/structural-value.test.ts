import { describe, expect, it } from "vitest";

import {
  canonicalStructuralKey,
  hasDuplicateStructuralValues,
} from "./structural-value.ts";

describe("shared structural values", () => {
  it("is independent of object key order while preserving array order", () => {
    expect(canonicalStructuralKey({ a: 1, b: "two" })).toBe(
      canonicalStructuralKey({ b: "two", a: 1 }),
    );
    expect(canonicalStructuralKey([1, 2])).not.toBe(
      canonicalStructuralKey([2, 1]),
    );
    expect(canonicalStructuralKey([1])).not.toBe(canonicalStructuralKey(["1"]));
  });

  it("detects structural duplicates without coercing values or deduplicating", () => {
    expect(hasDuplicateStructuralValues([{ a: 1 }, { a: 1 }])).toBe(true);
    expect(hasDuplicateStructuralValues([{ a: 1 }, { a: "1" }])).toBe(false);
    expect(hasDuplicateStructuralValues(["x", "x"])).toBe(true);
  });

  it("represents cycles and hostile properties without throwing", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => canonicalStructuralKey(cyclic)).not.toThrow();
    expect(canonicalStructuralKey(cyclic)).toContain("object:cycle");

    const hostile = new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("hostile ownKeys");
        },
      },
    );
    expect(() => canonicalStructuralKey(hostile)).not.toThrow();
    expect(canonicalStructuralKey(hostile)).toContain("object:hostile");

    let deep: unknown = null;
    for (let index = 0; index < 2_000; index += 1) {
      deep = { nested: deep };
    }
    expect(() => canonicalStructuralKey(deep)).not.toThrow();
    expect(canonicalStructuralKey(deep)).toContain("object:depth-limit");
  });
});
