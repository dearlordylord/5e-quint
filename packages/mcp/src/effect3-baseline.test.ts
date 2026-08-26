import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  EFFECT3_BASELINE_PATH,
  canonicalBaselineJson,
  captureEffect3Baseline,
  renderEffect3Baseline,
} from "../../../scripts/effect3-baseline.ts";

function recordField(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`Expected a certificate object before reading ${key}.`);
  }
  return Reflect.get(value, key);
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Expected a certificate object.");
  }
  return Object.fromEntries(Object.entries(value));
}

function array(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Expected a certificate array.");
  }
  return value;
}

function number(value: unknown): number {
  if (typeof value !== "number") {
    throw new TypeError("Expected a certificate number.");
  }
  return value;
}

describe("Effect 3 migration baseline", () => {
  test("sorts object keys while preserving observable array order", () => {
    expect(
      canonicalBaselineJson({
        z: 1,
        a: [{ y: true, x: "first" }, "second"],
      }),
    ).toBe(
      '{\n  "a": [\n    {\n      "x": "first",\n      "y": true\n    },\n    "second"\n  ],\n  "z": 1\n}\n',
    );
  });

  test("rejects non-JSON values instead of silently changing the oracle", () => {
    expect(() => canonicalBaselineJson({ value: Number.NaN })).toThrow(
      "finite numbers",
    );
    expect(() => canonicalBaselineJson({ value: undefined })).toThrow(
      "unsupported undefined",
    );
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => canonicalBaselineJson(cyclic)).toThrow(
      "must not contain cycles",
    );
  });

  test("the checked certificate is byte-for-byte reproducible", () => {
    const certificatePath = fileURLToPath(
      new URL(`../../../${EFFECT3_BASELINE_PATH}`, import.meta.url),
    );
    const expected = readFileSync(certificatePath, "utf8");
    const actual = renderEffect3Baseline(captureEffect3Baseline());
    expect(actual).toBe(expected);

    const baseline: unknown = JSON.parse(expected);
    const mcp = record(recordField(baseline, "mcp"));
    const registeredOrder = array(recordField(mcp, "registeredOrder"));
    const advertisedOrder = array(recordField(mcp, "advertisedOrder"));
    expect(registeredOrder).toHaveLength(27);
    expect(advertisedOrder).toEqual(registeredOrder);
    expect(
      Object.keys(record(recordField(mcp, "modelFacingOutputSchemas"))),
    ).toHaveLength(27);
    const persistence = record(recordField(baseline, "persistence"));
    expect(Object.keys(record(recordField(persistence, "fixtures")))).toEqual([
      "contradictoryTenure",
      "guest",
      "malformedOperations",
      "saved",
    ]);
    const surface = record(recordField(baseline, "surface"));
    expect(array(recordField(surface, "publication"))).toHaveLength(2);
    expect(array(recordField(surface, "content"))).toHaveLength(1_215);
    const reducers = record(recordField(baseline, "reducers"));
    const characterCreation = record(
      recordField(reducers, "characterCreation"),
    );
    expect(number(recordField(characterCreation, "holeCount"))).toBeGreaterThan(
      0,
    );
    const rawSwarm = record(recordField(baseline, "rawSwarm"));
    expect(array(recordField(rawSwarm, "artifacts"))).toHaveLength(76);
  }, 60_000);
});
