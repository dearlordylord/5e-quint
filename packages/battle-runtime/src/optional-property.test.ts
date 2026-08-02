import { describe, expect, test } from "vitest";

import {
  nonEmptyArrayProperty,
  optionalProperty,
} from "./optional-property.ts";

describe("optionalProperty", () => {
  test("omits absent values and retains present values", () => {
    const omitted = optionalProperty("decision", undefined);
    expect(omitted).toStrictEqual({});
    expect(Object.hasOwn(omitted, "decision")).toBe(false);
    expect(optionalProperty("decision", "decline")).toStrictEqual({
      decision: "decline",
    });
    expect(optionalProperty("count", 0)).toStrictEqual({ count: 0 });
    expect(optionalProperty("enabled", false)).toStrictEqual({
      enabled: false,
    });
    expect(optionalProperty("selection", null)).toStrictEqual({
      selection: null,
    });
    expect(optionalProperty("choices", [])).toStrictEqual({ choices: [] });
  });

  test("omits empty collections and retains non-empty collections", () => {
    const omitted = nonEmptyArrayProperty("decisions", []);
    expect(omitted).toStrictEqual({});
    expect(Object.hasOwn(omitted, "decisions")).toBe(false);
    expect(nonEmptyArrayProperty("decisions", ["decline"])).toStrictEqual({
      decisions: ["decline"],
    });
  });
});
