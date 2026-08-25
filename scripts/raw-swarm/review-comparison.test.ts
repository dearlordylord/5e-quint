import { rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { verifyReviewComparison } from "./review-comparison.ts";
import { rawSwarmTestOutputDirectory } from "./test-output.ts";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function review(
  directory: string,
  name: string,
  verdicts: readonly unknown[],
): string {
  const path = resolve(directory, name);
  writeFileSync(
    path,
    JSON.stringify({
      scenarioId: "comparison-example",
      gitSha: "a".repeat(40),
      transcriptSha256: "b".repeat(64),
      reviewer: name,
      verdicts,
    }),
  );
  return path;
}

describe("review comparison", () => {
  test("requires every baseline and candidate verdict to be classified with exact evidence", () => {
    const directory = rawSwarmTestOutputDirectory("review-comparison-test-");
    temporaryDirectories.push(directory);
    const baseline = review(directory, "baseline.json", [
      { class: "bug", claim: "old bug", evidence: "seq 3" },
      { class: "pass", claim: "old pass", evidence: "setup.ts:10" },
    ]);
    const candidate = review(directory, "candidate.json", [
      { class: "bug", claim: "same bug", evidence: "seq 3 and seq 4" },
      { class: "pass", claim: "new pass", evidence: "characters.ts:12" },
    ]);
    const comparison = {
      schemaVersion: 1,
      scenarioId: "comparison-example",
      transcriptSha256: "b".repeat(64),
      mappings: [
        {
          baselineVerdict: 1,
          disposition: "reproduced",
          candidateVerdicts: [1],
          claim: "The candidate review reproduced the bug.",
          evidence: "SDK seq 3 carries the same transition.",
        },
        {
          baselineVerdict: 2,
          disposition: "rejected",
          candidateVerdicts: [],
          claim: "The old pass was too broad.",
          evidence: "setup.ts:10 does not prove the full claim.",
        },
      ],
      newCandidateVerdicts: [2],
    };

    expect(
      verifyReviewComparison({
        baselineReviewPath: baseline,
        candidateReviewPath: candidate,
        comparison,
        evidenceCatalog: {
          sequences: new Set([3, 4]),
          setupLineCount: 10,
          charactersLineCount: 12,
          hasTranscriptHeader: true,
        },
      }),
    ).toEqual(comparison);
    expect(() =>
      verifyReviewComparison({
        baselineReviewPath: baseline,
        candidateReviewPath: candidate,
        comparison: {
          ...comparison,
          mappings: comparison.mappings.slice(0, 1),
        },
        evidenceCatalog: {
          sequences: new Set([3, 4]),
          setupLineCount: 10,
          charactersLineCount: 12,
          hasTranscriptHeader: true,
        },
      }),
    ).toThrow("Every baseline verdict");
    expect(() =>
      verifyReviewComparison({
        baselineReviewPath: baseline,
        candidateReviewPath: candidate,
        comparison: {
          ...comparison,
          newCandidateVerdicts: [1, 2],
        },
        evidenceCatalog: {
          sequences: new Set([3, 4]),
          setupLineCount: 10,
          charactersLineCount: 12,
          hasTranscriptHeader: true,
        },
      }),
    ).toThrow("Every candidate verdict");
    expect(() =>
      verifyReviewComparison({
        baselineReviewPath: baseline,
        candidateReviewPath: candidate,
        comparison: {
          ...comparison,
          mappings: comparison.mappings.map((mapping, index) =>
            index === 0 ? { ...mapping, candidateVerdicts: [1, 1] } : mapping,
          ),
        },
        evidenceCatalog: {
          sequences: new Set([3, 4]),
          setupLineCount: 10,
          charactersLineCount: 12,
          hasTranscriptHeader: true,
        },
      }),
    ).toThrow("Every candidate verdict");
    expect(() =>
      verifyReviewComparison({
        baselineReviewPath: baseline,
        candidateReviewPath: candidate,
        comparison: {
          ...comparison,
          mappings: comparison.mappings.map((mapping, index) =>
            index === 0 ? { ...mapping, evidence: "seq 999" } : mapping,
          ),
        },
        evidenceCatalog: {
          sequences: new Set([3, 4]),
          setupLineCount: 10,
          charactersLineCount: 12,
          hasTranscriptHeader: true,
        },
      }),
    ).toThrow("exact setup or call-sequence evidence");
    expect(() =>
      verifyReviewComparison({
        baselineReviewPath: baseline,
        candidateReviewPath: candidate,
        comparison: {
          ...comparison,
          scenarioId: "generated-battle-123",
        },
        evidenceCatalog: {
          sequences: new Set([3, 4]),
          setupLineCount: 10,
          charactersLineCount: 12,
          hasTranscriptHeader: true,
        },
      }),
    ).toThrow("Invalid review comparison");
  });
});
