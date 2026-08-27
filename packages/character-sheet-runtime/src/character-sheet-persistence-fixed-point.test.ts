import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { parseCharacterSheet } from "./index.ts";
import { unitLibrary } from "./test-support.test-support.ts";

const artifactPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/character-sheet-persistence-fixed-point.json",
);
const FIXED_POINT_CASE_IDS = [
  "nonspell-absent-optional-state",
  "nonspell-retained-resources",
  "spell-absent-optional-state",
  "spell-ordinary-slot-state",
  "spell-pact-slot-state",
  "spell-resource-expenditure-state",
  "null-rejected",
  "empty-record-rejected",
  "malformed-spell-slot-state-rejected",
] as const;
type FixedPointCaseId = (typeof FIXED_POINT_CASE_IDS)[number];
type FixedPointCase = {
  readonly id: FixedPointCaseId;
  readonly input: unknown;
  readonly expected:
    | { readonly outcome: "success"; readonly value: unknown }
    | { readonly outcome: "failure"; readonly issue: unknown };
};
type FixedPointArtifact = {
  readonly fixedPoint: { readonly commit: string };
  readonly provenance: {
    readonly certifiedBaseline: string;
    readonly oldParserProbe: string;
  };
  readonly cases: readonly FixedPointCase[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function fixedPointCaseId(value: unknown): FixedPointCaseId | undefined {
  for (const id of FIXED_POINT_CASE_IDS) {
    if (id === value) return id;
  }
  return undefined;
}

function parseFixedPointArtifact(value: unknown): FixedPointArtifact {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "artifactKind",
      "formatVersion",
      "fixedPoint",
      "provenance",
      "projection",
      "scope",
      "cases",
    ]) ||
    value.artifactKind !== "character-sheet-persistence-fixed-point" ||
    value.formatVersion !== 1 ||
    typeof value.projection !== "string" ||
    typeof value.scope !== "string"
  ) {
    throw new Error("Fixed-point artifact envelope is invalid.");
  }
  const fixedPoint = value.fixedPoint;
  const provenance = value.provenance;
  const cases = value.cases;
  if (
    !isRecord(fixedPoint) ||
    !hasExactKeys(fixedPoint, ["commit", "checkout", "parser"]) ||
    typeof fixedPoint.commit !== "string" ||
    typeof fixedPoint.checkout !== "string" ||
    typeof fixedPoint.parser !== "string" ||
    !isRecord(provenance) ||
    !hasExactKeys(provenance, ["certifiedBaseline", "oldParserProbe"]) ||
    typeof provenance.certifiedBaseline !== "string" ||
    typeof provenance.oldParserProbe !== "string" ||
    !Array.isArray(cases) ||
    cases.length !== FIXED_POINT_CASE_IDS.length
  ) {
    throw new Error("Fixed-point artifact metadata or case count is invalid.");
  }

  const parsedCases: FixedPointCase[] = [];
  for (const [index, candidate] of cases.entries()) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ["id", "input", "expected"])
    )
      throw new Error("Fixed-point case envelope is invalid.");
    const id = fixedPointCaseId(candidate.id);
    const expected = candidate.expected;
    if (
      id === undefined ||
      id !== FIXED_POINT_CASE_IDS[index] ||
      !isRecord(expected) ||
      (expected.outcome !== "success" && expected.outcome !== "failure")
    ) {
      throw new Error("Fixed-point case identity or shape is invalid.");
    }
    if (expected.outcome === "success") {
      if (!hasExactKeys(expected, ["outcome", "value"])) {
        throw new Error("Successful fixed-point case is missing its value.");
      }
      parsedCases.push({
        id,
        input: candidate.input,
        expected: { outcome: "success", value: expected.value },
      });
    } else {
      if (!hasExactKeys(expected, ["outcome", "issue"])) {
        throw new Error("Failed fixed-point case is missing its issue.");
      }
      parsedCases.push({
        id,
        input: candidate.input,
        expected: { outcome: "failure", issue: expected.issue },
      });
    }
  }
  return {
    fixedPoint: { commit: fixedPoint.commit },
    provenance: {
      certifiedBaseline: provenance.certifiedBaseline,
      oldParserProbe: provenance.oldParserProbe,
    },
    cases: parsedCases,
  };
}

const artifact = parseFixedPointArtifact(
  JSON.parse(readFileSync(artifactPath, "utf8")),
);

describe("character-sheet persistence fixed point", () => {
  test("replays the bounded old-parser matrix", () => {
    expect(artifact.fixedPoint.commit).toBe(
      "76d9abaf0ec9c8369d5f95f603c5cce88704d26e",
    );
    expect(artifact.provenance.certifiedBaseline).toBe(
      "docs/migrations/effect-4/baseline-certification.md",
    );
    expect(artifact.provenance.oldParserProbe).toContain("9/9 cases matched");
    expect(artifact.cases.map((testCase) => testCase.id)).toEqual(
      FIXED_POINT_CASE_IDS,
    );

    for (const testCase of artifact.cases) {
      const parsed = parseCharacterSheet(testCase.input, unitLibrary);
      const actual = Result.isSuccess(parsed)
        ? { outcome: "success" as const, value: parsed.success }
        : { outcome: "failure" as const, issue: parsed.failure };
      expect(actual, testCase.id).toEqual(testCase.expected);
    }
  });

  test("rejects corrupted artifact envelopes and Result-shaped additions", () => {
    const missingProbe = {
      ...artifact,
      provenance: { certifiedBaseline: artifact.provenance.certifiedBaseline },
    };
    expect(() => parseFixedPointArtifact(missingProbe)).toThrow();

    const resultTag = {
      ...artifact,
      cases: artifact.cases.map((testCase, index) =>
        index === 0
          ? {
              ...testCase,
              expected: { ...testCase.expected, _tag: "Success" },
            }
          : testCase,
      ),
    };
    expect(() => parseFixedPointArtifact(resultTag)).toThrow();

    const extraCaseKey = {
      ...artifact,
      cases: artifact.cases.map((testCase, index) =>
        index === 0 ? { ...testCase, payload: "unexpected" } : testCase,
      ),
    };
    expect(() => parseFixedPointArtifact(extraCaseKey)).toThrow();
  });
});
