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
  readonly provenance: { readonly certifiedBaseline: string };
  readonly cases: readonly FixedPointCase[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function fixedPointCaseId(value: unknown): FixedPointCaseId | undefined {
  for (const id of FIXED_POINT_CASE_IDS) {
    if (id === value) return id;
  }
  return undefined;
}

function parseFixedPointArtifact(value: unknown): FixedPointArtifact {
  if (!isRecord(value))
    throw new Error("Fixed-point artifact must be an object.");
  const fixedPoint = value.fixedPoint;
  const provenance = value.provenance;
  const cases = value.cases;
  if (
    !isRecord(fixedPoint) ||
    typeof fixedPoint.commit !== "string" ||
    !isRecord(provenance) ||
    typeof provenance.certifiedBaseline !== "string" ||
    !Array.isArray(cases) ||
    cases.length !== FIXED_POINT_CASE_IDS.length
  ) {
    throw new Error("Fixed-point artifact metadata or case count is invalid.");
  }

  const parsedCases: FixedPointCase[] = [];
  for (const [index, candidate] of cases.entries()) {
    if (!isRecord(candidate))
      throw new Error("Fixed-point case must be an object.");
    const id = fixedPointCaseId(candidate.id);
    const expected = candidate.expected;
    if (
      id === undefined ||
      id !== FIXED_POINT_CASE_IDS[index] ||
      !Object.hasOwn(candidate, "input") ||
      !isRecord(expected) ||
      (expected.outcome !== "success" && expected.outcome !== "failure")
    ) {
      throw new Error("Fixed-point case identity or shape is invalid.");
    }
    if (expected.outcome === "success") {
      if (!Object.hasOwn(expected, "value")) {
        throw new Error("Successful fixed-point case is missing its value.");
      }
      parsedCases.push({
        id,
        input: candidate.input,
        expected: { outcome: "success", value: expected.value },
      });
    } else {
      if (!Object.hasOwn(expected, "issue")) {
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
    provenance: { certifiedBaseline: provenance.certifiedBaseline },
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
});
