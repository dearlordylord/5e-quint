import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

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
  classifyScenarioReviewOutputSchema,
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
  scenarioCompositeReviewSchemaForIntents,
} from "./scenario-campaign.ts";
import { ScenarioCampaignManifestSchema } from "./evidence-manifests.ts";
import { validateRetainedScenarioReviewInvocation } from "./review-invocation-binding.ts";
import { replayRetainedScenarioReview } from "./generate-scenario.ts";
import { rawSwarmTestOutputDirectory } from "./test-output.ts";
import { isJsonRecord, repoRoot, sha256Text } from "./transcript.ts";

const directories: string[] = [];

function parseJsonRecord(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isJsonRecord(value)) throw new Error("Expected a JSON object fixture.");
  return value;
}

type ControlledReviewEvidenceFixture = ReturnType<
  typeof controlledReviewEvidenceFixture
>;

function rewriteCurrentReviewSubject(
  fixture: ControlledReviewEvidenceFixture,
  index: 0 | 1,
  subject: Record<string, unknown>,
  options: Readonly<{
    readonly outputJsonSchema?: unknown;
    readonly result?: Record<string, unknown>;
  }> = {},
): void {
  const sourcePath = fixture.sourcePrePlayReviewInputPaths[index];
  const replayPath = fixture.replayPrePlayReviewInputPaths[index];
  if (sourcePath === undefined || replayPath === undefined) {
    throw new Error("Missing retained review input fixture.");
  }
  const result = options.result ?? {
    ...(parseJsonRecord(readFileSync(replayPath, "utf8")).result as Record<
      string,
      unknown
    >),
    scenarioQuality: {
      classification: "ready",
      evidence: "The current lifecycle subject is retained for this test.",
    },
  };
  for (const path of [sourcePath, replayPath]) {
    const input = parseJsonRecord(readFileSync(path, "utf8"));
    delete input.scenarioId;
    input.schemaVersion = 3;
    input.subject = subject;
    input.outputJsonSchema =
      options.outputJsonSchema ??
      codexOutputJsonSchema(CurrentScenarioCompositeReviewSchema);
    input.result = result;
    writeFileSync(path, `${JSON.stringify(input)}\n`);
  }
  const eventPaths = [
    fixture.eventPaths[index],
    `${replayPath.slice(0, -".json".length)}.events.jsonl`,
  ];
  for (const path of eventPaths) {
    if (path === undefined) throw new Error("Missing review event fixture.");
    const events = readFileSync(path, "utf8")
      .trim()
      .split("\n")
      .map(parseJsonRecord);
    const started = events[0];
    if (started === undefined) throw new Error("Missing review start event.");
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
    message.item.text = JSON.stringify({ result });
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
  const eventPath = fixture.eventPaths[index];
  if (entry === undefined || eventPath === undefined) {
    throw new Error("Missing composite ledger fixture.");
  }
  entry.subject = subject;
  entry.eventsSha256 = invocationEventsSha256(eventPath);
  writeFileSync(
    fixture.ledgerPath,
    `${ledger.map((value) => JSON.stringify(value)).join("\n")}\n`,
  );
}

function rewriteHistoricalLedgerSubject(
  fixture: ControlledReviewEvidenceFixture,
  index: 0 | 1,
  subject: Record<string, unknown>,
  ledgerSchemaVersion?: 4 | 5,
): void {
  const replayPath = fixture.replayPrePlayReviewInputPaths[index];
  if (replayPath === undefined) {
    throw new Error("Missing retained review input fixture.");
  }
  for (const path of [
    fixture.eventPaths[index],
    `${replayPath.slice(0, -".json".length)}.events.jsonl`,
  ]) {
    if (path === undefined) throw new Error("Missing review event fixture.");
    const events = readFileSync(path, "utf8")
      .trim()
      .split("\n")
      .map(parseJsonRecord);
    const started = events[0];
    if (started === undefined) throw new Error("Missing review start event.");
    started.subject = subject;
    if (ledgerSchemaVersion !== undefined) {
      started.schemaVersion = ledgerSchemaVersion;
      const completed = events.at(-1);
      if (completed !== undefined)
        completed.schemaVersion = ledgerSchemaVersion;
      if (
        ledgerSchemaVersion === 5 &&
        !events.some((event) => event.type === "turn.completed") &&
        completed !== undefined
      ) {
        events.splice(events.length - 1, 0, { type: "turn.completed" });
      }
    }
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
  const eventPath = fixture.eventPaths[index];
  if (entry === undefined || eventPath === undefined) {
    throw new Error("Missing composite ledger fixture.");
  }
  entry.subject = subject;
  if (ledgerSchemaVersion !== undefined)
    entry.schemaVersion = ledgerSchemaVersion;
  entry.eventsSha256 = invocationEventsSha256(eventPath);
  writeFileSync(
    fixture.ledgerPath,
    `${ledger.map((value) => JSON.stringify(value)).join("\n")}\n`,
  );
}

function writeControlledReviewManifest(
  fixture: ControlledReviewEvidenceFixture,
): void {
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
}

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("review invocation evidence", () => {
  test("admits and binds failed invocation raw sidecars", () => {
    const directory = rawSwarmTestOutputDirectory("review-raw-retention-");
    directories.push(directory);
    const fixture = controlledReviewEvidenceFixture({
      directory,
      retainFailedRawArtifacts: true,
      ledgerEntries: [
        {
          schemaVersion: 5,
          phase: "player",
          stagePlanReason: "The fixture player stage requires this invocation.",
          invocationId: "failed-player",
          model: "gpt-5.6-sol",
          reasoningEffort: "medium",
          startedAt: "2026-08-17T00:00:00.000Z",
          elapsedMilliseconds: 1,
          exit: { tag: "exited", status: 7 },
          result: { tag: "failed", reason: "Synthetic failure." },
          usage: {
            tag: "unavailable",
            reason:
              "The first-party event stream exposed no turn.completed usage object.",
          },
        },
        {
          schemaVersion: 4,
          phase: "postPlayReview",
          stagePlanReason:
            "The fixture post-play stage requires this invocation.",
          invocationId: "review",
          model: "gpt-5.6-luna",
          reasoningEffort: "max",
          startedAt: "2026-08-17T00:00:01.000Z",
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
    const eventPath = fixture.eventPaths[2];
    if (eventPath === undefined)
      throw new Error("Missing failed event fixture.");
    const rawPath = `${eventPath}.codex-raw`;
    const manifest = readReviewInvocationEvidenceManifest(fixture.manifestPath);
    expect(manifest.invocationRawArtifacts).toEqual([
      expect.objectContaining({ path: relative(repoRoot, rawPath) }),
    ]);
    rmSync(rawPath);
    expect(() =>
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toThrow(/Raw retention artifact is missing/);
  });

  test("rejects a substituted failed invocation raw sidecar", () => {
    const directory = rawSwarmTestOutputDirectory("review-raw-substitute-");
    directories.push(directory);
    const fixture = controlledReviewEvidenceFixture({
      directory,
      retainFailedRawArtifacts: true,
      ledgerEntries: [
        {
          schemaVersion: 5,
          phase: "player",
          stagePlanReason: "The fixture player stage requires this invocation.",
          invocationId: "failed-player",
          model: "gpt-5.6-sol",
          reasoningEffort: "medium",
          startedAt: "2026-08-17T00:00:00.000Z",
          elapsedMilliseconds: 1,
          exit: { tag: "exited", status: 7 },
          result: { tag: "failed", reason: "Synthetic failure." },
          usage: {
            tag: "unavailable",
            reason:
              "The first-party event stream exposed no turn.completed usage object.",
          },
        },
        {
          schemaVersion: 4,
          phase: "postPlayReview",
          stagePlanReason:
            "The fixture post-play stage requires this invocation.",
          invocationId: "review",
          model: "gpt-5.6-luna",
          reasoningEffort: "max",
          startedAt: "2026-08-17T00:00:01.000Z",
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
    const eventPath = fixture.eventPaths[2];
    if (eventPath === undefined)
      throw new Error("Missing failed event fixture.");
    writeFileSync(`${eventPath}.codex-raw`, "substituted\n");
    expect(() =>
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toThrow(/does not match its canonical event/);
  });

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
      campaign: {
        path: relative(repoRoot, resolve(directory, "campaign.json")),
        byteLength: readFileSync(resolve(directory, "campaign.json"))
          .byteLength,
        sha256: sha256Text(
          readFileSync(resolve(directory, "campaign.json"), "utf8"),
        ),
      },
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
    ).toThrow(/Campaign, Evidence Set/);
  });

  test("rejects a coordinated foreign Campaign owner", () => {
    const directory = rawSwarmTestOutputDirectory(
      "review-foreign-campaign-owner-test-",
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
    const foreignSubjects = [
      {
        tag: "scenarioCandidate",
        campaignId: "foreign-campaign",
        evidenceSetId: "foreign-evidence",
        candidateId: "foreign-milestone",
        candidateScenarioSha256: "b".repeat(64),
        plannedScenarioId: "same",
      },
      {
        tag: "scenarioCandidate",
        campaignId: "foreign-campaign",
        evidenceSetId: "foreign-evidence",
        candidateId: "foreign-final",
        candidateScenarioSha256: admittedScenarioSha256,
        plannedScenarioId: "same",
      },
    ] as const;
    rewriteCurrentReviewSubject(fixture, 0, foreignSubjects[0]);
    rewriteCurrentReviewSubject(fixture, 1, foreignSubjects[1]);
    rmSync(fixture.manifestPath, { force: true });

    expect(() => writeControlledReviewManifest(fixture)).toThrow(
      /Campaign, Evidence Set, and planned Scenario/,
    );
  });

  test("rejects a current same-name Scenario substitution under Campaign ownership", () => {
    const directory = rawSwarmTestOutputDirectory(
      "review-same-name-scenario-substitution-test-",
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
    const sameNameSubject = {
      tag: "scenario",
      scenarioId: "same",
    };
    rewriteCurrentReviewSubject(fixture, 0, sameNameSubject);
    rewriteCurrentReviewSubject(fixture, 1, sameNameSubject);
    rmSync(fixture.manifestPath, { force: true });

    expect(() => writeControlledReviewManifest(fixture)).toThrow(
      /lifecycle scenario, not expected candidate/,
    );
  });

  test("rejects a migrated v4/v5 Scenario row for a schema-v2 review envelope", () => {
    const directory = rawSwarmTestOutputDirectory(
      "review-migrated-scenario-row-test-",
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
    const sameNameSubject = { tag: "scenario", scenarioId: "same" };
    rewriteHistoricalLedgerSubject(fixture, 0, sameNameSubject, 4);
    rewriteHistoricalLedgerSubject(fixture, 1, sameNameSubject, 5);
    rmSync(fixture.manifestPath, { force: true });

    expect(() => writeControlledReviewManifest(fixture)).toThrow(
      /requires a scenarioCandidate lifecycle row when migrated to ledger schema (4|5)/,
    );
  });

  test("retains and validates the Campaign authority path and hash", () => {
    const directory = rawSwarmTestOutputDirectory(
      "review-campaign-authority-test-",
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
    const campaignPath = resolve(directory, "campaign.json");
    const manifest = parseJsonRecord(
      readFileSync(fixture.manifestPath, "utf8"),
    );
    const campaignAuthority = manifest.campaign;
    if (!isJsonRecord(campaignAuthority)) {
      throw new Error("Fixture manifest is missing Campaign authority.");
    }
    expect(campaignAuthority).toMatchObject({
      path: relative(repoRoot, campaignPath),
      byteLength: readFileSync(campaignPath).byteLength,
      sha256: sha256Text(readFileSync(campaignPath, "utf8")),
    });

    writeFileSync(
      campaignPath,
      readFileSync(campaignPath, "utf8").replace(
        `"configSha256":"${"c".repeat(64)}"`,
        `"configSha256":"${"d".repeat(64)}"`,
      ),
    );
    expect(() =>
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toThrow(/changed from its hash-linked artifacts/);
  });

  test("rejects a tampered Campaign authority path or hash", () => {
    const makeFixture = (suffix: string) => {
      const directory = rawSwarmTestOutputDirectory(suffix);
      directories.push(directory);
      return controlledReviewEvidenceFixture({
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
    };
    const pathFixture = makeFixture("review-campaign-path-tamper-test-");
    const pathManifest = parseJsonRecord(
      readFileSync(pathFixture.manifestPath, "utf8"),
    );
    if (!isJsonRecord(pathManifest.campaign)) {
      throw new Error("Fixture manifest is missing Campaign authority.");
    }
    pathManifest.campaign.path = "tampered/campaign.json";
    writeFileSync(
      pathFixture.manifestPath,
      `${JSON.stringify(pathManifest)}\n`,
    );
    expect(() =>
      readReviewInvocationEvidenceManifest(pathFixture.manifestPath),
    ).toThrow(/changed from its hash-linked artifacts/);

    const hashFixture = makeFixture("review-campaign-hash-tamper-test-");
    const hashManifest = parseJsonRecord(
      readFileSync(hashFixture.manifestPath, "utf8"),
    );
    if (!isJsonRecord(hashManifest.campaign)) {
      throw new Error("Fixture manifest is missing Campaign authority.");
    }
    hashManifest.campaign.sha256 = "0".repeat(64);
    writeFileSync(
      hashFixture.manifestPath,
      `${JSON.stringify(hashManifest)}\n`,
    );
    expect(() =>
      readReviewInvocationEvidenceManifest(hashFixture.manifestPath),
    ).toThrow(/changed from its hash-linked artifacts/);
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

  test("rejects the incident cross-intent result in a strict current envelope", async () => {
    const directory = rawSwarmTestOutputDirectory(
      "review-strict-intent-envelope-test-",
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
    const strictSchema = codexOutputJsonSchema(
      scenarioCompositeReviewSchemaForIntents({
        contentAvailabilityIntent: "availableOnly",
        sdkCapabilityIntent: "supportedOnly",
      }),
    );
    const incidentResult = {
      raw: {
        classification: "supported",
        evidence: "Synthetic RAW evidence.",
      },
      contentAvailability: {
        classification: "supplied",
        evidence: "The selected records are available.",
      },
      sdkCapability: {
        classification: "missingUnsupportedProbe",
        evidence: "The scenario requires an undocumented operation.",
        critique: "Declare the unsupported capability probe.",
      },
      artifactPolicy: {
        classification: "safe",
        evidence: "Synthetic policy evidence.",
      },
      scenarioQuality: {
        classification: "ready",
        evidence: "Synthetic quality evidence.",
      },
    } satisfies Record<string, unknown>;
    rewriteCurrentReviewSubject(
      fixture,
      0,
      {
        tag: "scenarioCandidate",
        campaignId: "fixture-campaign",
        evidenceSetId: "fixture-evidence",
        candidateId: "fixture-candidate-milestone",
        candidateScenarioSha256: "b".repeat(64),
        plannedScenarioId: "same",
      },
      {
        outputJsonSchema: strictSchema,
        result: incidentResult,
      },
    );
    rewriteCurrentReviewSubject(
      fixture,
      1,
      {
        tag: "scenarioCandidate",
        campaignId: "fixture-campaign",
        evidenceSetId: "fixture-evidence",
        candidateId: "fixture-candidate-final",
        candidateScenarioSha256: "c".repeat(64),
        plannedScenarioId: "same",
      },
      {
        outputJsonSchema: strictSchema,
        result: incidentResult,
      },
    );
    expect(() =>
      readReviewInvocationEvidenceManifest(fixture.manifestPath),
    ).toThrow(/replay input|invocation event output|composite-review/);
    const retained = Schema.decodeUnknownEither(
      RetainedScenarioReviewInputSchema,
      { onExcessProperty: "error" },
    )(
      parseJsonRecord(
        readFileSync(fixture.replayPrePlayReviewInputPaths[0], "utf8"),
      ),
    );
    expect(Either.isRight(retained)).toBe(true);
    if (Either.isLeft(retained)) return;
    await expect(
      replayRetainedScenarioReview({
        retainedInput: retained.right,
        ledgerPath: resolve(directory, "review-ledger.jsonl"),
        gitSha: retained.right.sourceGitSha,
      }),
    ).rejects.toThrow(/result does not match its canonical output schema/);
  });

  test("keeps an incident-shaped broad v3 envelope in explicit legacy compatibility", () => {
    const directory = rawSwarmTestOutputDirectory(
      "review-broad-v3-incident-envelope-test-",
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
    const broadSchema = codexOutputJsonSchema(
      CurrentScenarioCompositeReviewSchema,
    );
    const strictSchema = codexOutputJsonSchema(
      scenarioCompositeReviewSchemaForIntents({
        contentAvailabilityIntent: "availableOnly",
        sdkCapabilityIntent: "supportedOnly",
      }),
    );
    const incidentResult = {
      raw: {
        classification: "supported",
        evidence: "Synthetic RAW evidence.",
      },
      contentAvailability: {
        classification: "supplied",
        evidence: "The selected records are available.",
      },
      sdkCapability: {
        classification: "missingUnsupportedProbe",
        evidence: "The scenario requires an undocumented operation.",
        critique: "Declare the unsupported capability probe.",
      },
      artifactPolicy: {
        classification: "safe",
        evidence: "Synthetic artifact policy evidence.",
      },
      scenarioQuality: {
        classification: "ready",
        evidence: "Synthetic scenario quality evidence.",
      },
    } satisfies Record<string, unknown>;
    const legacy = classifyScenarioReviewOutputSchema({
      schemaVersion: 3,
      outputJsonSchema: broadSchema,
    });
    expect(Either.isRight(legacy)).toBe(true);
    if (Either.isLeft(legacy)) return;
    expect(legacy.right.tag).toBe("legacyCurrent");
    expect(Either.isRight(legacy.right.decodeResult(incidentResult))).toBe(
      true,
    );
    const strict = classifyScenarioReviewOutputSchema({
      schemaVersion: 3,
      outputJsonSchema: strictSchema,
    });
    expect(Either.isRight(strict)).toBe(true);
    if (Either.isLeft(strict)) return;
    expect(strict.right.tag).toBe("intentSpecificCurrent");
    expect(Either.isLeft(strict.right.decodeResult(incidentResult))).toBe(true);

    const subjects = [
      {
        tag: "scenarioCandidate",
        campaignId: "fixture-campaign",
        evidenceSetId: "fixture-evidence",
        candidateId: "fixture-candidate-milestone",
        candidateScenarioSha256: "b".repeat(64),
        plannedScenarioId: "same",
      },
      {
        tag: "scenarioCandidate",
        campaignId: "fixture-campaign",
        evidenceSetId: "fixture-evidence",
        candidateId: "fixture-candidate-final",
        candidateScenarioSha256: String(
          parseJsonRecord(
            readFileSync(
              resolve(directory, "run", "SCENARIO_REVIEW.json"),
              "utf8",
            ),
          ).scenarioSha256,
        ),
        plannedScenarioId: "same",
      },
    ] as const;
    for (const [index, subject] of subjects.entries()) {
      rewriteCurrentReviewSubject(fixture, index as 0 | 1, subject, {
        outputJsonSchema: broadSchema,
        result: incidentResult,
      });
    }
    rmSync(fixture.manifestPath);
    writeControlledReviewManifest(fixture);
    const manifest = readReviewInvocationEvidenceManifest(fixture.manifestPath);
    expect(manifest.prePlayReviews).toHaveLength(2);
    const campaign = Schema.decodeUnknownSync(ScenarioCampaignManifestSchema)(
      parseJsonRecord(
        readFileSync(resolve(directory, "campaign.json"), "utf8"),
      ),
    );
    for (const [index, subject] of subjects.entries()) {
      const retained = Schema.decodeUnknownEither(
        RetainedScenarioReviewInputSchema,
        { onExcessProperty: "error" },
      )(
        parseJsonRecord(
          readFileSync(
            fixture.replayPrePlayReviewInputPaths[index as 0 | 1]!,
            "utf8",
          ),
        ),
      );
      const ledger = parseModelInvocationLedgerEntry(
        parseJsonRecord(
          readFileSync(fixture.ledgerPath, "utf8").trim().split("\n")[index]!,
        ),
      );
      expect(Either.isRight(retained)).toBe(true);
      expect(Either.isRight(ledger)).toBe(true);
      if (Either.isLeft(retained) || Either.isLeft(ledger)) continue;
      const binding = retainedScenarioReviewMatchesReplayBinding(
        retained.right,
        ledger.right,
        index === 1
          ? {
              tag: "candidate",
              reviewStage: "final",
              scenarioId: "same",
              admittedScenarioSha256: subject.candidateScenarioSha256,
              campaign,
            }
          : {
              tag: "candidate",
              reviewStage: "milestone",
              scenarioId: "same",
              campaign,
            },
      );
      expect(Either.isRight(binding)).toBe(true);
      if (Either.isLeft(binding)) continue;
      expect(() =>
        validateRetainedScenarioReviewInvocation({
          binding: binding.right,
          eventSha256: ledger.right.eventsSha256,
          events: readFileSync(fixture.eventPaths[index]!, "utf8")
            .trim()
            .split("\n")
            .map(parseJsonRecord),
        }),
      ).not.toThrow();
    }
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
        entry.scenarioId =
          typeof subject.plannedScenarioId === "string"
            ? subject.plannedScenarioId
            : subject.scenarioId;
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
