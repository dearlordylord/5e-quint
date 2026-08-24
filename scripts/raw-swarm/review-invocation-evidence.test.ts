import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, Schema } from "effect";
import { afterEach, describe, expect, test } from "vitest";

import {
  invocationEventsSha256,
  parseModelInvocationLedgerEntry,
} from "./model-telemetry.ts";
import { controlledReviewEvidenceFixture } from "./review-invocation-evidence.test-support.ts";
import {
  readReviewInvocationEvidenceManifest,
  writeReviewInvocationEvidenceManifest,
} from "./review-invocation-evidence.ts";
import {
  RetainedScenarioReviewInputSchema,
  retainedScenarioReviewMatchesReplayBinding,
} from "./scenario-review-input.ts";
import {
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
} from "./scenario-campaign.ts";
import { validateRetainedScenarioReviewInvocation } from "./review-invocation-binding.ts";
import { rawSwarmTestOutputDirectory } from "./test-output.ts";
import { isJsonRecord, sha256Text } from "./transcript.ts";

const directories: string[] = [];

function parseJsonRecord(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isJsonRecord(value)) throw new Error("Expected a JSON object fixture.");
  return value;
}

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
          schemaVersion: 4,
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
          schemaVersion: 4,
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

  test("retains revised Candidate milestone and admitted final manifest inputs", () => {
    const directory = rawSwarmTestOutputDirectory(
      "review-revised-candidate-evidence-test-",
    );
    directories.push(directory);
    const fixture = controlledReviewEvidenceFixture({
      directory,
      ledgerEntries: [
        {
          schemaVersion: 4,
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
    const admittedScenarioSha256 = sha256Text(
      readFileSync(resolve(directory, "run/SCENARIO.md"), "utf8"),
    );
    const subjects = [
      {
        tag: "scenarioCandidate" as const,
        campaignId: "fixture-campaign",
        evidenceSetId: "fixture-evidence",
        candidateId: "fixture-candidate-milestone",
        candidateScenarioSha256: "b".repeat(64),
        plannedScenarioId: "same",
      },
      {
        tag: "scenarioCandidate" as const,
        campaignId: "fixture-campaign",
        evidenceSetId: "fixture-evidence",
        candidateId: "fixture-candidate-final",
        candidateScenarioSha256: admittedScenarioSha256,
        plannedScenarioId: "same",
      },
    ] as const;
    const resultWithQuality = (index: number) => ({
      ...(parseJsonRecord(
        readFileSync(fixture.replayPrePlayReviewInputPaths[index]!, "utf8"),
      ).result as Record<string, unknown>),
      scenarioQuality: {
        classification: "ready",
        evidence: "The revised Candidate is ready for admission.",
      },
    });
    for (const [index, subject] of subjects.entries()) {
      for (const path of [
        fixture.sourcePrePlayReviewInputPaths[index]!,
        fixture.replayPrePlayReviewInputPaths[index]!,
      ]) {
        const input = parseJsonRecord(readFileSync(path, "utf8"));
        delete input.scenarioId;
        input.schemaVersion = 3;
        input.subject = subject;
        input.outputJsonSchema = codexOutputJsonSchema(
          CurrentScenarioCompositeReviewSchema,
        );
        input.result = resultWithQuality(index);
        writeFileSync(path, `${JSON.stringify(input)}\n`);
      }
      const eventPaths = [
        fixture.eventPaths[index]!,
        `${fixture.replayPrePlayReviewInputPaths[index]!.slice(0, -".json".length)}.events.jsonl`,
      ];
      for (const path of eventPaths) {
        const events = readFileSync(path, "utf8")
          .trim()
          .split("\n")
          .map(parseJsonRecord);
        const started = events[0];
        if (started === undefined) throw new Error("Missing start event.");
        started.subject = subject;
        const message = events.find(
          (event) =>
            event.type === "item.completed" &&
            isJsonRecord(event.item) &&
            event.item.type === "agent_message",
        );
        if (message === undefined || !isJsonRecord(message.item)) {
          throw new Error("Missing composite-review output event.");
        }
        message.item.text = JSON.stringify({
          result: resultWithQuality(index),
        });
        writeFileSync(
          path,
          `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
        );
      }
    }
    const ledger = readFileSync(fixture.ledgerPath, "utf8")
      .trim()
      .split("\n")
      .map(parseJsonRecord);
    for (const [index, subject] of subjects.entries()) {
      const entry = ledger[index];
      if (entry === undefined) throw new Error("Missing composite ledger row.");
      entry.subject = subject;
      entry.eventsSha256 = invocationEventsSha256(fixture.eventPaths[index]!);
    }
    writeFileSync(
      fixture.ledgerPath,
      `${ledger.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
    );
    rmSync(fixture.manifestPath);
    const manifest = writeReviewInvocationEvidenceManifest({
      transcriptPath: fixture.transcriptPath,
      reviewPath: fixture.reviewPath,
      auditPath: fixture.auditPath,
      packetPath: fixture.packetPath,
      prePlayReviewPaths: [
        {
          sourceInputPath: fixture.sourcePrePlayReviewInputPaths[0],
          replayInputPath: fixture.replayPrePlayReviewInputPaths[0],
        },
        {
          sourceInputPath: fixture.sourcePrePlayReviewInputPaths[1],
          replayInputPath: fixture.replayPrePlayReviewInputPaths[1],
        },
      ],
      invocationLedgerPaths: [fixture.ledgerPath],
      invocationEventPaths: fixture.eventPaths,
      outputPath: fixture.manifestPath,
    });
    expect(manifest.prePlayReviews).toHaveLength(2);
    expect(
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toMatchObject({
      prePlayReviews: [{ reviewStage: "milestone" }, { reviewStage: "final" }],
    });
    const wrongFinalSubject = {
      ...subjects[1],
      candidateScenarioSha256: "d".repeat(64),
    };
    for (const path of [
      fixture.sourcePrePlayReviewInputPaths[1],
      fixture.replayPrePlayReviewInputPaths[1],
    ]) {
      const input = parseJsonRecord(readFileSync(path, "utf8"));
      input.subject = wrongFinalSubject;
      writeFileSync(path, `${JSON.stringify(input)}\n`);
    }
    for (const path of [
      fixture.eventPaths[1]!,
      `${fixture.replayPrePlayReviewInputPaths[1].slice(0, -".json".length)}.events.jsonl`,
    ]) {
      const events = readFileSync(path, "utf8")
        .trim()
        .split("\n")
        .map(parseJsonRecord);
      const started = events[0];
      if (started === undefined) throw new Error("Missing final start event.");
      started.subject = wrongFinalSubject;
      writeFileSync(
        path,
        `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
      );
    }
    const tamperedLedger = readFileSync(fixture.ledgerPath, "utf8")
      .trim()
      .split("\n")
      .map(parseJsonRecord);
    const finalLedger = tamperedLedger[1];
    if (finalLedger === undefined) throw new Error("Missing final ledger row.");
    finalLedger.subject = wrongFinalSubject;
    finalLedger.eventsSha256 = invocationEventsSha256(fixture.eventPaths[1]!);
    writeFileSync(
      fixture.ledgerPath,
      `${tamperedLedger.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
    );
    expect(() =>
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toThrow(/source hash/);
  });

  test("binds schema-v2 envelopes to migrated Candidate Campaign ownership", () => {
    const directory = rawSwarmTestOutputDirectory(
      "review-migrated-candidate-evidence-test-",
    );
    directories.push(directory);
    const fixture = controlledReviewEvidenceFixture({
      directory,
      ledgerEntries: [
        {
          schemaVersion: 4,
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
    const admittedScenarioSha256 = sha256Text(
      readFileSync(resolve(directory, "run/SCENARIO.md"), "utf8"),
    );
    const subjects = [
      {
        tag: "scenarioCandidate" as const,
        campaignId: "fixture-campaign",
        evidenceSetId: "fixture-evidence",
        candidateId: "fixture-historical-milestone",
        candidateScenarioSha256: "b".repeat(64),
        plannedScenarioId: "same",
      },
      {
        tag: "scenarioCandidate" as const,
        campaignId: "fixture-campaign",
        evidenceSetId: "fixture-evidence",
        candidateId: "fixture-historical-final",
        candidateScenarioSha256: admittedScenarioSha256,
        plannedScenarioId: "same",
      },
    ] as const;
    const rewriteSubject = (
      index: 0 | 1,
      subject: (typeof subjects)[number],
    ) => {
      for (const path of [
        fixture.eventPaths[index]!,
        `${fixture.replayPrePlayReviewInputPaths[index]!.slice(0, -".json".length)}.events.jsonl`,
      ]) {
        const events = readFileSync(path, "utf8")
          .trim()
          .split("\n")
          .map(parseJsonRecord);
        const started = events[0];
        if (started === undefined) throw new Error("Missing start event.");
        started.subject = subject;
        writeFileSync(
          path,
          `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
        );
      }
      const ledger = readFileSync(fixture.ledgerPath, "utf8")
        .trim()
        .split("\n")
        .map(parseJsonRecord);
      const entry = ledger[index];
      if (entry === undefined) throw new Error("Missing composite ledger row.");
      entry.subject = subject;
      entry.eventsSha256 = invocationEventsSha256(fixture.eventPaths[index]!);
      writeFileSync(
        fixture.ledgerPath,
        `${ledger.map((value) => JSON.stringify(value)).join("\n")}\n`,
      );
    };
    rewriteSubject(0, subjects[0]);
    rewriteSubject(1, subjects[1]);
    rmSync(fixture.manifestPath);
    writeReviewInvocationEvidenceManifest({
      transcriptPath: fixture.transcriptPath,
      reviewPath: fixture.reviewPath,
      auditPath: fixture.auditPath,
      packetPath: fixture.packetPath,
      prePlayReviewPaths: [
        {
          sourceInputPath: fixture.sourcePrePlayReviewInputPaths[0],
          replayInputPath: fixture.replayPrePlayReviewInputPaths[0],
        },
        {
          sourceInputPath: fixture.sourcePrePlayReviewInputPaths[1],
          replayInputPath: fixture.replayPrePlayReviewInputPaths[1],
        },
      ],
      invocationLedgerPaths: [fixture.ledgerPath],
      invocationEventPaths: fixture.eventPaths,
      outputPath: fixture.manifestPath,
    });
    expect(
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toMatchObject({
      prePlayReviews: [{ reviewStage: "milestone" }, { reviewStage: "final" }],
    });

    const wrongFinalSubject = {
      ...subjects[1],
      candidateScenarioSha256: "d".repeat(64),
    };
    rewriteSubject(1, wrongFinalSubject);
    expect(() =>
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toThrow(/admitted Scenario source hash/);

    rewriteSubject(1, {
      ...subjects[1],
      campaignId: "foreign-campaign",
      evidenceSetId: "foreign-evidence",
    });
    expect(() =>
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toThrow(/one Campaign, Evidence Set/);
  });

  test("validates event output from a parsed replay binding without rereading the envelope", () => {
    const directory = rawSwarmTestOutputDirectory(
      "review-parsed-binding-test-",
    );
    directories.push(directory);
    const fixture = controlledReviewEvidenceFixture({
      directory,
      ledgerEntries: [
        {
          schemaVersion: 4,
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
    const retained = Schema.decodeUnknownEither(
      RetainedScenarioReviewInputSchema,
      { onExcessProperty: "error" },
    )(
      parseJsonRecord(
        readFileSync(fixture.replayPrePlayReviewInputPaths[0], "utf8"),
      ),
    );
    const ledger = parseModelInvocationLedgerEntry(
      parseJsonRecord(readFileSync(fixture.ledgerPath, "utf8").split("\n")[0]!),
    );
    expect(Either.isRight(retained)).toBe(true);
    expect(Either.isRight(ledger)).toBe(true);
    if (Either.isLeft(retained) || Either.isLeft(ledger)) return;
    const binding = retainedScenarioReviewMatchesReplayBinding(
      retained.right,
      ledger.right,
      {
        tag: "scenario",
        reviewStage: "milestone",
        scenarioId: "same",
      },
    );
    expect(Either.isRight(binding)).toBe(true);
    if (Either.isLeft(binding)) return;
    writeFileSync(
      fixture.replayPrePlayReviewInputPaths[0],
      '{"tampered":true}\n',
    );
    const eventPath = `${fixture.replayPrePlayReviewInputPaths[0].slice(0, -".json".length)}.events.jsonl`;
    const events = readFileSync(eventPath, "utf8")
      .trim()
      .split("\n")
      .map(parseJsonRecord);
    expect(() =>
      validateRetainedScenarioReviewInvocation({
        binding: binding.right,
        eventSha256: ledger.right.eventsSha256,
        events,
      }),
    ).not.toThrow();
  });

  test("rejects equal but noncanonical retained review output schemas", () => {
    const directory = rawSwarmTestOutputDirectory(
      "review-schema-boundary-test-",
    );
    directories.push(directory);
    const fixture = controlledReviewEvidenceFixture({
      directory,
      ledgerEntries: [
        {
          schemaVersion: 4,
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
    for (const path of [
      fixture.sourcePrePlayReviewInputPaths[0],
      fixture.replayPrePlayReviewInputPaths[0],
    ]) {
      const input = parseJsonRecord(readFileSync(path, "utf8"));
      input.outputJsonSchema = { type: "object", properties: {} };
      writeFileSync(path, `${JSON.stringify(input)}\n`);
    }
    expect(() =>
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toThrow(/canonical composite-review schema/);
  });

  test("rejects an unrelated ledger and enforces current tracer commandless policy", () => {
    const ledgerDirectory = rawSwarmTestOutputDirectory(
      "review-ledger-identity-test-",
    );
    directories.push(ledgerDirectory);
    const entry = {
      schemaVersion: 4 as const,
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
          schemaVersion: 4,
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
        const entry = parseJsonRecord(line);
        const subject = parseJsonRecord(JSON.stringify(entry.subject));
        entry.scenarioId = subject.scenarioId;
        delete entry.subject;
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
    ).toThrow(/Current review invocation evidence requires v4/);
  });
});
