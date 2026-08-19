import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { controlledReviewEvidenceFixture } from "./review-invocation-evidence.test-support.ts";
import { readReviewInvocationEvidenceManifest } from "./review-invocation-evidence.ts";
import { rawSwarmTestOutputDirectory } from "./test-output.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("review invocation evidence", () => {
  test("binds exact review artifacts and rejects later substitution", () => {
    const directory = rawSwarmTestOutputDirectory("review-evidence-test-");
    directories.push(directory);
    const fixture = controlledReviewEvidenceFixture({
      directory,
      ledgerEntries: [
        {
          schemaVersion: 2,
          phase: "postPlayReview",
          stagePlanReason: "The fixture stage requires post-play review.",
          invocationId: "review",
          model: "gpt-5.6-luna",
          reasoningEffort: "max",
          startedAt: "2026-08-17T00:00:00.000Z",
          elapsedMilliseconds: 1,
          exit: { tag: "exited", status: 0 },
          result: { tag: "succeeded" },
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
      prePlayReviews: [{ reviewStage: "milestone" }, { reviewStage: "final" }],
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

  test("binds both retained pre-play review inputs", () => {
    const directory = rawSwarmTestOutputDirectory(
      "review-preplay-evidence-test-",
    );
    directories.push(directory);
    const fixture = controlledReviewEvidenceFixture({
      directory,
      ledgerEntries: [
        {
          schemaVersion: 2,
          phase: "postPlayReview",
          stagePlanReason: "The fixture stage requires post-play review.",
          invocationId: "review",
          model: "gpt-5.6-luna",
          reasoningEffort: "max",
          startedAt: "2026-08-17T00:00:00.000Z",
          elapsedMilliseconds: 1,
          exit: { tag: "exited", status: 0 },
          result: { tag: "succeeded" },
          usage: {
            tag: "unavailable",
            reason:
              "The first-party event stream exposed no turn.completed usage object.",
          },
        },
      ],
    });
    writeFileSync(
      fixture.sourcePrePlayReviewInputPaths[0],
      readFileSync(fixture.sourcePrePlayReviewInputPaths[0], "utf8").replace(
        `"sourceGitSha":"${"a".repeat(40)}"`,
        `"sourceGitSha":"${"d".repeat(40)}"`,
      ),
    );
    expect(() =>
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toThrow(/Retained milestone source and replay inputs/);
  });

  test("rejects an unrelated ledger and a tool-using reviewer", () => {
    const ledgerDirectory = rawSwarmTestOutputDirectory(
      "review-ledger-identity-test-",
    );
    directories.push(ledgerDirectory);
    const entry = {
      schemaVersion: 2 as const,
      phase: "postPlayReview" as const,
      stagePlanReason: "The fixture stage requires post-play review.",
      invocationId: "review",
      model: "gpt-5.6-luna",
      reasoningEffort: "max",
      startedAt: "2026-08-17T00:00:00.000Z",
      elapsedMilliseconds: 1,
      exit: { tag: "exited" as const, status: 0 },
      result: { tag: "succeeded" as const },
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
    expect(() =>
      controlledReviewEvidenceFixture({
        directory: resolve(ledgerDirectory, "duplicate-invocations"),
        ledgerEntries: [entry, entry],
      }),
    ).toThrow(/invocation ids must be distinct/);
    expect(() =>
      controlledReviewEvidenceFixture({
        directory: resolve(ledgerDirectory, "relabeled-events"),
        ledgerEntries: [entry],
        eventEntries: [
          {
            ...entry,
            phase: "player",
            model: "gpt-5.6-sol",
            reasoningEffort: "medium",
            elapsedMilliseconds: 999,
            exit: { tag: "exited", status: 2 },
          },
        ],
      }),
    ).toThrow(/do not match|Invocation result must agree/);
  });

  test("accepts historical v1 parsing only outside the current review manifest", () => {
    const directory = rawSwarmTestOutputDirectory("review-v1-boundary-test-");
    directories.push(directory);
    const fixture = controlledReviewEvidenceFixture({
      directory,
      ledgerEntries: [
        {
          schemaVersion: 2,
          phase: "postPlayReview",
          stagePlanReason: "The fixture stage requires post-play review.",
          invocationId: "review",
          model: "gpt-5.6-luna",
          reasoningEffort: "max",
          startedAt: "2026-08-17T00:00:00.000Z",
          elapsedMilliseconds: 1,
          exit: { tag: "exited", status: 0 },
          result: { tag: "succeeded" },
          usage: {
            tag: "unavailable",
            reason:
              "The first-party event stream exposed no turn.completed usage object.",
          },
        },
      ],
    });
    const entries = readFileSync(fixture.ledgerPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => {
        const entry = JSON.parse(line) as Record<string, unknown>;
        delete entry.stagePlanReason;
        delete entry.result;
        return { ...entry, schemaVersion: 1 };
      });
    writeFileSync(
      fixture.ledgerPath,
      `${entries.map(JSON.stringify).join("\n")}\n`,
    );
    expect(() =>
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toThrow(/Current review invocation evidence requires v2/);
  });
});
