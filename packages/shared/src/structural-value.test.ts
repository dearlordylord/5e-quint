import { describe, expect, it } from "vitest";

import {
  compareCodePoints,
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

  it("encodes every scalar type without coercion", () => {
    expect(canonicalStructuralKey(null)).toBe("null;");
    expect(canonicalStructuralKey(undefined)).toBe("undefined;");
    expect(canonicalStructuralKey(true)).toBe("boolean:true;");
    expect(canonicalStructuralKey(false)).toBe("boolean:false;");
    expect(canonicalStructuralKey(1n)).toBe("bigint:1:1;");
    expect(canonicalStructuralKey(Symbol("named"))).toBe("symbol:5:named;");
    expect(canonicalStructuralKey(Symbol())).toBe("symbol:0:;");
    expect(canonicalStructuralKey(() => "function")).toBe("function;");

    expect(canonicalStructuralKey(Number.NaN)).toBe("number:NaN;");
    expect(canonicalStructuralKey(Number.POSITIVE_INFINITY)).toBe(
      "number:+Infinity;",
    );
    expect(canonicalStructuralKey(Number.NEGATIVE_INFINITY)).toBe(
      "number:-Infinity;",
    );
    expect(canonicalStructuralKey(-0)).toBe("number:-0;");
  });

  it("orders keys by code point and keeps prefix keys distinct", () => {
    expect(compareCodePoints("z", "a")).toBeGreaterThan(0);
    expect(compareCodePoints("a", "aa")).toBeLessThan(0);
    expect(compareCodePoints("😄", "z")).toBeGreaterThan(0);

    const key = canonicalStructuralKey({ aa: 1, a: 2, z: 3, "😄": 4 });
    expect(key.indexOf("k:1:a=")).toBeLessThan(key.indexOf("k:2:aa="));
    expect(key.indexOf("k:1:z=")).toBeLessThan(key.indexOf("k:2:😄="));
  });

  it("preserves sparse array holes and records accessor failures", () => {
    const sparse = new Array(2);
    sparse[1] = "present";
    expect(canonicalStructuralKey(sparse)).toContain("h:hole");
    expect(canonicalStructuralKey(sparse)).toContain("string:7:present;");

    const throwingObject = {};
    Object.defineProperty(throwingObject, "value", {
      enumerable: true,
      get: () => {
        throw new Error("value unavailable");
      },
    });
    expect(canonicalStructuralKey(throwingObject)).toContain(
      "k:5:value=h:getter;",
    );
  });

  it("keeps hostile arrays total and distinguishes length limits", () => {
    const hasFailure = new Proxy(["value"], {
      has: () => {
        throw new Error("has failed");
      },
    });
    expect(canonicalStructuralKey(hasFailure)).toContain("h:array-member");

    const getFailure = new Proxy(["value"], {
      get: (target, property, receiver) => {
        if (property === "0") throw new Error("get failed");
        return Reflect.get(target, property, receiver);
      },
    });
    expect(canonicalStructuralKey(getFailure)).toContain("h:array-member");

    const hostileLength = new Proxy([], {
      get: (target, property, receiver) =>
        property === "length"
          ? Infinity
          : Reflect.get(target, property, receiver),
    });
    expect(canonicalStructuralKey(hostileLength)).toBe("array:length-limit;");

    const throwingLength = new Proxy([], {
      get: (target, property, receiver) => {
        if (property === "length") throw new Error("length unavailable");
        return Reflect.get(target, property, receiver);
      },
    });
    expect(canonicalStructuralKey(throwingLength)).toBe("array:hostile;");

    expect(canonicalStructuralKey(new Array(100_001))).toBe(
      "array:length-limit;",
    );
  });

  it("keeps revoked and oversized objects total", () => {
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(canonicalStructuralKey(revoked.proxy)).toBe("object:hostile;");

    const keyCount = 100_001;
    const oversized = new Proxy(Object.create(null), {
      ownKeys: () =>
        Array.from({ length: keyCount }, (_, index) => `key-${index}`),
      getOwnPropertyDescriptor: () => ({
        enumerable: true,
        configurable: true,
        value: 1,
      }),
    });
    expect(canonicalStructuralKey(oversized)).toBe("object:key-limit;");
  });
});
