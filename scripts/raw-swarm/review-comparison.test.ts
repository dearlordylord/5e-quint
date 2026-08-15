import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { verifyReviewComparison } from "./review-comparison.ts";
import { repoRoot } from "./transcript.ts";

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

describe("compact review comparison", () => {
  test("requires every old and new verdict to be classified with exact evidence", () => {
    const directory = mkdtempSync(
      resolve(repoRoot, "scripts/raw-swarm/out/review-comparison-test-"),
    );
    temporaryDirectories.push(directory);
    const baseline = review(directory, "baseline.json", [
      { class: "bug", claim: "old bug", evidence: "seq 3" },
      { class: "pass", claim: "old pass", evidence: "setup.ts:10" },
    ]);
    const compact = review(directory, "compact.json", [
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
          compactVerdicts: [1],
          claim: "The compact review reproduced the bug.",
          evidence: "SDK seq 3 carries the same transition.",
        },
        {
          baselineVerdict: 2,
          disposition: "rejected",
          compactVerdicts: [],
          claim: "The old pass was too broad.",
          evidence: "setup.ts:10 does not prove the full claim.",
        },
      ],
      newCompactVerdicts: [2],
    };

    expect(
      verifyReviewComparison({
        baselineReviewPath: baseline,
        compactReviewPath: compact,
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
        compactReviewPath: compact,
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
        compactReviewPath: compact,
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
  });
});
