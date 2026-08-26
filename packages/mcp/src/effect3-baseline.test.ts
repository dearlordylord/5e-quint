import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
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

  test("the checked certificate is byte-for-byte reproducible", async () => {
    const certificatePath = fileURLToPath(
      new URL(`../../../${EFFECT3_BASELINE_PATH}`, import.meta.url),
    );
    const expected = readFileSync(certificatePath, "utf8");
    const actual = renderEffect3Baseline(await captureEffect3Baseline());
    expect(actual).toBe(expected);

    const baseline: unknown = JSON.parse(expected);
    const mcp = record(recordField(baseline, "mcp"));
    const registeredOrder = array(recordField(mcp, "registeredOrder"));
    expect(registeredOrder).toHaveLength(27);
    const protocolEntrypoints = record(recordField(mcp, "protocolEntrypoints"));
    const defaultStdio = record(
      recordField(protocolEntrypoints, "defaultStdio"),
    );
    const defaultStdioTools = array(recordField(defaultStdio, "toolsList"));
    const defaultStdioOrder = array(recordField(defaultStdio, "toolOrder"));
    expect(defaultStdioTools).toHaveLength(24);
    expect(defaultStdioOrder).toHaveLength(24);
    const httpWithoutOAuth = record(
      recordField(protocolEntrypoints, "httpWithoutOAuth"),
    );
    expect(array(recordField(httpWithoutOAuth, "toolOrder"))).toEqual(
      defaultStdioOrder,
    );
    expect(
      Object.keys(record(recordField(defaultStdio, "securitySchemesByTool"))),
    ).toHaveLength(24);
    expect(recordField(defaultStdio, "securitySchemeOrder")).toEqual(
      defaultStdioOrder,
    );
    expect(
      Object.keys(
        record(recordField(httpWithoutOAuth, "securitySchemesByTool")),
      ),
    ).toHaveLength(24);
    expect(recordField(httpWithoutOAuth, "securitySchemeOrder")).toEqual(
      defaultStdioOrder,
    );
    expect(recordField(httpWithoutOAuth, "parityWithDefaultStdio")).toBe(true);
    expect(
      Object.keys(
        record(recordField(defaultStdio, "representativeCallResponses")),
      ),
    ).toEqual(["describeMcpWorkflow", "listCatalogUnits"]);
    expect(
      Object.keys(
        record(recordField(httpWithoutOAuth, "representativeCallResponses")),
      ),
    ).toEqual(["describeMcpWorkflow", "listCatalogUnits"]);
    const authenticatedProjection = record(
      recordField(mcp, "authenticatedProjection"),
    );
    const advertisedOrder = array(
      recordField(authenticatedProjection, "advertisedOrder"),
    );
    expect(advertisedOrder).toHaveLength(27);
    expect(
      Object.keys(
        record(
          recordField(authenticatedProjection, "modelFacingOutputSchemas"),
        ),
      ),
    ).toHaveLength(27);
    const persistence = record(recordField(baseline, "persistence"));
    expect(Object.keys(record(recordField(persistence, "fixtures")))).toEqual([
      "contradictoryTenure",
      "guest",
      "malformedOperations",
      "saved",
    ]);
    const malformedOperations = record(
      recordField(
        record(recordField(persistence, "fixtures")),
        "malformedOperations",
      ),
    );
    expect(
      recordField(record(recordField(malformedOperations, "value")), "message"),
    ).toBe("malformedOperationsJson");
    const manifestPolicy = record(
      recordField(baseline, "artifactManifestPolicy"),
    );
    expect(manifestPolicy).toMatchObject({
      acceptedFileType: "regular-file",
      ordering: "Unicode-code-point",
      pathFormat: "POSIX",
      source: "git-tracked-index",
    });
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
  }, 180_000);

  test("ignores dirty generated Raw Swarm output", async () => {
    const certificatePath = fileURLToPath(
      new URL(`../../../${EFFECT3_BASELINE_PATH}`, import.meta.url),
    );
    const generatedRoot = fileURLToPath(
      new URL("../../../scripts/raw-swarm/out/", import.meta.url),
    );
    const dirtyArtifact = join(
      generatedRoot,
      `.effect3-baseline-dirty-${randomUUID()}.json`,
    );
    const generatedRootExisted = existsSync(generatedRoot);
    mkdirSync(generatedRoot, { recursive: true });
    try {
      writeFileSync(dirtyArtifact, '{"generated":true}\n', "utf8");
      expect(renderEffect3Baseline(await captureEffect3Baseline())).toBe(
        readFileSync(certificatePath, "utf8"),
      );
    } finally {
      rmSync(dirtyArtifact, { force: true });
      if (!generatedRootExisted) rmSync(generatedRoot, { recursive: true });
    }
  }, 180_000);
});
