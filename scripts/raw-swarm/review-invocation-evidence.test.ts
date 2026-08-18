import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { controlledReviewEvidenceFixture } from "./review-invocation-evidence.test-support.ts";
import { readReviewInvocationEvidenceManifest } from "./review-invocation-evidence.ts";
import { repoRoot } from "./transcript.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("review invocation evidence", () => {
  test("binds exact review artifacts and rejects later substitution", () => {
    const directory = mkdtempSync(
      resolve(repoRoot, "scripts/raw-swarm/out/review-evidence-test-"),
    );
    directories.push(directory);
    const fixture = controlledReviewEvidenceFixture({
      directory,
      ledgerEntries: [
        {
          schemaVersion: 1,
          phase: "postPlayReview",
          invocationId: "review",
          model: "gpt-5.6-luna",
          reasoningEffort: "max",
          startedAt: "2026-08-17T00:00:00.000Z",
          elapsedMilliseconds: 1,
          exit: { tag: "exited", status: 0 },
          usage: {
            tag: "unavailable",
            reason:
              "The first-party event stream exposed no turn.completed usage object.",
          },
        },
      ],
    });
    expect(
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toMatchObject({
      type: "review-invocation-evidence",
      scenarioId: "same",
    });
    writeFileSync(
      fixture.reviewPath,
      readFileSync(fixture.reviewPath, "utf8").replace(
        "SDK sequence 1",
        "unsupported citation",
      ),
    );
    expect(() =>
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toThrow(/exact audited sequence/);
  });

  test("rejects an unrelated ledger and a tool-using reviewer", () => {
    const ledgerDirectory = mkdtempSync(
      resolve(repoRoot, "scripts/raw-swarm/out/review-ledger-identity-test-"),
    );
    directories.push(ledgerDirectory);
    const entry = {
      schemaVersion: 1 as const,
      phase: "postPlayReview" as const,
      invocationId: "review",
      model: "gpt-5.6-luna",
      reasoningEffort: "max",
      startedAt: "2026-08-17T00:00:00.000Z",
      elapsedMilliseconds: 1,
      exit: { tag: "exited" as const, status: 0 },
      usage: {
        tag: "unavailable" as const,
        reason:
          "The first-party event stream exposed no turn.completed usage object.",
      },
    };
    expect(() =>
      controlledReviewEvidenceFixture({
        directory: resolve(ledgerDirectory, "unrelated"),
        ledgerEntries: [entry],
        ledgerScenarioId: "another-scenario",
      }),
    ).toThrow(/identity does not match/);
    expect(() =>
      controlledReviewEvidenceFixture({
        directory: resolve(ledgerDirectory, "tool-use"),
        ledgerEntries: [entry],
        postPlayUsesTool: true,
      }),
    ).toThrow(/used a tool/);
  });
});
