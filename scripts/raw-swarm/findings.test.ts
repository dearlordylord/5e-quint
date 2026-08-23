import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { relative, resolve } from "node:path";

import { Either, Schema } from "effect";
import { afterEach, describe, expect, test } from "vitest";

import {
  authorityFor,
  findingsFromGenerationLedger,
  projectExecutionFindings,
  readFindingsProjection,
  makeFinding,
  readSourceWithAuthority,
  validateFindingsProjection,
  writeFindingsProjection,
} from "./findings.ts";
import { renderFindingsAudit } from "./findings-audit.ts";
import { projectGenerationFindings } from "./generation-findings.ts";
import {
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
} from "./scenario-campaign.ts";
import {
  ingestGenerationFindings,
  openArtifactIndex,
} from "./artifact-index.ts";
import { rawSwarmTestOutputDirectory } from "./test-output.ts";
import { isJsonRecord, repoRoot, sha256Canonical } from "./transcript.ts";
import {
  planAdmittedScenarioStages,
  planScenarioStages,
  scenarioStagePlanFindings,
} from "./scenario-stage-plan.ts";
import { parseModelInvocationLedgerEntry } from "./model-telemetry.ts";
import {
  RetainedScenarioReviewInputSchema,
  retainedScenarioReviewMatchesReplayBinding,
} from "./scenario-review-input.ts";

const directories: string[] = [];
const reportScript = resolve(repoRoot, "scripts/raw-swarm/report.ts");

function parseJsonRecord(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isJsonRecord(value)) throw new Error("Expected a JSON object fixture.");
  return value;
}

function parseJsonRecordArray(text: string): Array<Record<string, unknown>> {
  const value: unknown = JSON.parse(text);
  if (!Array.isArray(value) || !value.every(isJsonRecord)) {
    throw new Error("Expected a JSON object array fixture.");
  }
  return value;
}

function directory(): string {
  const value = rawSwarmTestOutputDirectory("findings-test-");
  directories.push(value);
  return value;
}

afterEach(() => {
  for (const value of directories.splice(0)) {
    rmSync(value, { recursive: true, force: true });
  }
});

function fixture() {
  const root = directory();
  const run = resolve(root, "run");
  const evidence = resolve(run, "evidence");
  mkdirSync(evidence, { recursive: true });
  const executionStartPath = resolve(evidence, "execution-start.json");
  writeFileSync(
    executionStartPath,
    `${JSON.stringify({
      type: "raw-swarm-execution-start",
      schemaVersion: 1,
      executionId: "findings-execution",
      evidenceSetId: "findings-evidence",
      scenarioId: "findings-example",
      gitSha: "a".repeat(40),
      startedAt: "2026-08-18T00:00:00.000Z",
    })}\n`,
  );
  const initialSession = { battle: { round: 1 } };
  const outputSession = { battle: { round: 1 } };
  const result = { tag: "resolved" };
  const scenarioBytes = "# Findings scenario\n";
  const scenarioSha256 = createHash("sha256")
    .update(scenarioBytes)
    .digest("hex");
  const scenarioReviewValue = finalScenarioReview({
    scenarioId: "findings-example",
    scenarioSha256,
    gitSha: "a".repeat(40),
  });
  const scenarioReviewBytes = `${JSON.stringify(scenarioReviewValue, null, 2)}\n`;
  const scenarioReviewSha256 = createHash("sha256")
    .update(scenarioReviewBytes)
    .digest("hex");
  writeFileSync(resolve(run, "SCENARIO.md"), scenarioBytes);
  writeFileSync(resolve(run, "SCENARIO_REVIEW.json"), scenarioReviewBytes);
  const stagePlan = planAdmittedScenarioStages({
    scenarioId: "findings-example",
    scenarioSha256,
    scenarioReviewSha256,
    facts: {
      schemaVersion: 1,
      characterRequirement: {
        tag: "statBlocksOnly",
        evidence: "Fixture uses stat-block creatures.",
      },
      spatialRequirement: {
        tag: "notRequired",
        evidence: "Fixture has no spatial witness.",
      },
    },
  });
  if (stagePlan._tag === "Left") throw new Error(stagePlan.left);
  writeFileSync(
    resolve(evidence, "stage-plan.json"),
    `${JSON.stringify(stagePlan.right, null, 2)}\n`,
  );
  writeFileSync(
    resolve(evidence, "stage-plan-findings.json"),
    `${JSON.stringify(scenarioStagePlanFindings(stagePlan.right), null, 2)}\n`,
  );
  const transcriptPath = resolve(evidence, "sdk-calls.jsonl");
  const header = {
    type: "sdk-player-header",
    scenarioId: "findings-example",
    gitSha: "a".repeat(40),
    startedAt: "2026-08-18T00:00:00.000Z",
    consumerIsolation: "instructionalFallback",
    replaySupervisorSha256: "b".repeat(64),
    scenarioSha256,
    scenarioReviewSha256,
    charactersSha256: "e".repeat(64),
    characterObservation: {},
    characterOutcome: "ready",
    characterSheets: [],
    characterSheetsSha256: sha256Canonical([]),
    setupSha256: "f".repeat(64),
    setupObservation: {},
    setupOutcome: "ready",
    initialSession,
    initialSessionSha256: sha256Canonical(initialSession),
    initialTurnProjection: {},
    initialTurnProjectionSha256: sha256Canonical({}),
  } as const;
  const call = {
    type: "sdk-call",
    seq: 1,
    continuation: 1,
    operation: "discoverBattleActs",
    inputSession: initialSession,
    inputSessionSha256: sha256Canonical(initialSession),
    input: {},
    outcome: "returned",
    outputSession,
    outputSessionSha256: sha256Canonical(outputSession),
    result,
    resultSha256: sha256Canonical(result),
  } as const;
  writeFileSync(
    transcriptPath,
    `${JSON.stringify(header)}\n${JSON.stringify(call)}\n`,
  );

  const eventPath = resolve(evidence, "player-events.jsonl");
  writeFileSync(
    eventPath,
    `${[
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "node player-client.mjs attempt.ts",
          aggregated_output:
            '{"tag":"error","message":"Continuation did not typecheck: TS2353"}',
          exit_code: 1,
          status: "failed",
        },
      },
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "node player-client.mjs attempt.ts",
          aggregated_output: '{"tag":"ok"}',
          exit_code: 0,
          status: "completed",
        },
      },
    ]
      .map((value) => JSON.stringify(value))
      .join("\n")}\n`,
  );
  writeFileSync(
    resolve(evidence, "frozen-prefix.json"),
    `${JSON.stringify({
      scenarioId: header.scenarioId,
      gitSha: header.gitSha,
      transcriptSha256: "0".repeat(64),
      reviewer: "not-a-review-authority",
      verdicts: [],
    })}\n`,
  );

  const reviewPath = resolve(root, "review.json");
  const transcriptSha256 = createHash("sha256")
    .update(readFileSync(transcriptPath))
    .digest("hex");
  const claim = "Accepted transition contradicts the local rule.";
  writeFileSync(
    reviewPath,
    `${JSON.stringify({
      scenarioId: header.scenarioId,
      gitSha: header.gitSha,
      transcriptSha256,
      reviewer: "test-reviewer",
      verdicts: [
        {
          class: "bug",
          claim,
          evidence: "Transcript seq 1; local RAW passage.",
        },
      ],
    })}\n`,
  );
  return {
    root,
    run,
    transcriptPath,
    eventPath,
    reviewPath,
    transcriptRelative: relative(repoRoot, transcriptPath),
    eventRelative: relative(repoRoot, eventPath),
    runStartRelative: relative(repoRoot, executionStartPath),
    reviewRelative: relative(repoRoot, reviewPath),
    runRelative: relative(repoRoot, run),
    scenarioSha256,
    claim,
  };
}

function finalScenarioReview(input: {
  readonly scenarioId: string;
  readonly scenarioSha256: string;
  readonly gitSha: string;
}) {
  return {
    scenarioId: input.scenarioId,
    scenarioSha256: input.scenarioSha256,
    gitSha: input.gitSha,
    reviewScope: "rawContentSdkCapabilityPolicy" as const,
    contentAvailabilityIntent: "availableOnly" as const,
    sdkCapabilityIntent: "supportedOnly" as const,
    admitReviewedUnsupported: false,
    rawReview: { classification: "supported" as const, evidence: "RAW." },
    contentReview: {
      classification: "supplied" as const,
      evidence: "Catalog.",
    },
    sdkCapabilityReview: {
      classification: "supported" as const,
      evidence: "SDK.",
    },
    policyReview: { classification: "safe" as const, evidence: "Policy." },
  };
}

function retainedCompositeReviewInput(input: {
  readonly reviewStage: "milestone" | "final";
  readonly invocationId: string;
  readonly scenarioQuality?: CompositeReviewScenarioQuality;
}) {
  return {
    schemaVersion: 2 as const,
    phase: "scenarioCompositeReview" as const,
    reviewStage: input.reviewStage,
    scenarioId: "findings-example",
    sourceGitSha: "a".repeat(40),
    invocationId: input.invocationId,
    model: "gpt-5.6-luna" as const,
    reasoningEffort: "max" as const,
    prompt: `${input.reviewStage} prompt`,
    outputJsonSchema: codexOutputJsonSchema(
      CurrentScenarioCompositeReviewSchema,
    ),
    result: {
      raw: { classification: "supported" as const, evidence: "RAW." },
      contentAvailability: {
        classification: "supplied" as const,
        evidence: "Catalog.",
      },
      sdkCapability: {
        classification: "supported" as const,
        evidence: "SDK.",
      },
      artifactPolicy: { classification: "safe" as const, evidence: "Policy." },
      scenarioQuality: {
        ...(input.scenarioQuality ?? {
          classification: "ready" as const,
          evidence: "Quality.",
        }),
      },
    },
  };
}

type CompositeReviewScenarioQuality =
  | Readonly<{
      readonly classification: "ready";
      readonly evidence: string;
    }>
  | Readonly<{
      readonly classification: "needsRevision";
      readonly evidence: string;
      readonly critique: string;
    }>;

type CompositeReviewFixtureSubject =
  | Readonly<{
      readonly tag: "scenario";
      readonly scenarioId: "findings-example";
    }>
  | Readonly<{
      readonly tag: "scenarioCandidate";
      readonly campaignId: string;
      readonly evidenceSetId: string;
      readonly candidateId: string;
      readonly candidateScenarioSha256: string;
      readonly plannedScenarioId: string;
    }>;

const FINDINGS_REVIEW_SUBJECT = {
  tag: "scenario",
  scenarioId: "findings-example",
} as const satisfies CompositeReviewFixtureSubject;

function retainedCandidateCompositeReviewInput(input: {
  readonly reviewStage: "milestone" | "final";
  readonly invocationId: string;
  readonly scenarioQuality?: CompositeReviewScenarioQuality;
  readonly subject: Extract<
    CompositeReviewFixtureSubject,
    { readonly tag: "scenarioCandidate" }
  >;
}) {
  const historical = retainedCompositeReviewInput(input);
  const { scenarioId: _scenarioId, ...common } = historical;
  return {
    ...common,
    schemaVersion: 3 as const,
    subject: input.subject,
  };
}

function retainedBenchmarkCompositeReviewInput(input: {
  readonly reviewStage: "milestone" | "final";
  readonly invocationId: string;
  readonly subject: {
    readonly tag: "benchmark";
    readonly benchmarkId: string;
    readonly profile: "documentDeclarationSet" | "boundedCapabilityProjection";
    readonly scenarioId: "findings-example";
  };
}) {
  const historical = retainedCompositeReviewInput(input);
  const { scenarioId: _scenarioId, ...common } = historical;
  return {
    ...common,
    schemaVersion: 3 as const,
    model: "gpt-5.6-luna" as const,
    reasoningEffort: "medium" as const,
    subject: input.subject,
    result: historical.result,
  };
}

type CompositeReviewLedgerSpec = Readonly<{
  readonly invocationId: string;
  readonly reviewStage: "milestone" | "final";
  readonly subject: CompositeReviewFixtureSubject;
  readonly ledgerSchemaVersion?: 2 | 4 | 5;
  readonly scenarioQuality?: CompositeReviewScenarioQuality;
}>;

type OrderedLedgerEntry =
  | Readonly<{
      readonly tag: "generation";
      readonly invocationId: string;
    }>
  | Readonly<{
      readonly tag: "review";
      readonly review: CompositeReviewLedgerSpec;
    }>;

function retainedGenerationReviewLedger(
  root: string,
  subject: CompositeReviewFixtureSubject = FINDINGS_REVIEW_SUBJECT,
  options: Readonly<{
    readonly reviewEntries?: readonly CompositeReviewLedgerSpec[];
    readonly generationInvocationIds?: readonly string[];
    readonly orderedLedgerEntries?: readonly OrderedLedgerEntry[];
    readonly campaignIdentity?: Readonly<{
      readonly campaignId: string;
      readonly evidenceSetId: string;
      readonly plannedScenarioId: string;
    }>;
  }> = {},
): string {
  const path = resolve(root, "generation-invocations.jsonl");
  const reviewEntries =
    options.reviewEntries ??
    ([
      {
        invocationId: "original-milestone",
        reviewStage: "milestone",
        subject,
      },
      {
        invocationId: "original-final",
        reviewStage: "final",
        subject,
      },
    ] as const satisfies readonly CompositeReviewLedgerSpec[]);
  const common = {
    gitSha: "a".repeat(40),
    startedAt: "2026-08-18T00:00:00.000Z",
    elapsedMilliseconds: 10,
    exit: { tag: "exited", status: 0 },
    result: { tag: "succeeded" },
    usage: {
      tag: "unavailable",
      reason:
        "The first-party event stream exposed no turn.completed usage object.",
    },
  } as const;
  const eventPath = (invocationId: string) =>
    resolve(root, `${invocationId}.events.jsonl`);
  const eventBytes = (review: CompositeReviewLedgerSpec): string => {
    const ledgerSchemaVersion = review.ledgerSchemaVersion ?? 5;
    return `${[
      ...(ledgerSchemaVersion === 2
        ? [
            {
              type: "raw-swarm.invocation.started",
              schemaVersion: 2,
              scenarioId: "findings-example",
              gitSha: common.gitSha,
              phase: "scenarioCompositeReview",
              stagePlanReason: "The campaign requires a composite review.",
              fallbackInvocationId: review.invocationId,
              model: "gpt-5.6-luna",
              reasoningEffort: "max",
              startedAt: common.startedAt,
            },
          ]
        : [
            {
              type: "raw-swarm.invocation.started",
              schemaVersion: ledgerSchemaVersion,
              subject: review.subject,
              gitSha: common.gitSha,
              phase: "scenarioCompositeReview",
              stagePlanReason: "The campaign requires a composite review.",
              fallbackInvocationId: review.invocationId,
              model: "gpt-5.6-luna",
              reasoningEffort: "max",
              startedAt: common.startedAt,
            },
          ]),
      { type: "thread.started", thread_id: review.invocationId },
      {
        type: "item.completed",
        item: {
          type: "agent_message",
          text: JSON.stringify({
            result: retainedCompositeReviewInput({
              reviewStage: review.reviewStage,
              invocationId: review.invocationId,
              scenarioQuality: review.scenarioQuality,
            }).result,
          }),
        },
      },
      ...(ledgerSchemaVersion === 5 ? [{ type: "turn.completed" }] : []),
      {
        type: "raw-swarm.invocation.completed",
        schemaVersion: ledgerSchemaVersion,
        elapsedMilliseconds: common.elapsedMilliseconds,
        exit: common.exit,
        result: common.result,
      },
    ]
      .map((value) => JSON.stringify(value))
      .join("\n")}\n`;
  };
  for (const review of reviewEntries) {
    writeFileSync(eventPath(review.invocationId), eventBytes(review));
  }
  const reviewLedgerEntry = (review: CompositeReviewLedgerSpec) => {
    const commonReview = {
      invocationId: review.invocationId,
      model: "gpt-5.6-luna" as const,
      reasoningEffort: "max" as const,
      phase: "scenarioCompositeReview" as const,
      stagePlanReason: "The campaign requires a composite review.",
      eventsSha256: createHash("sha256")
        .update(readFileSync(eventPath(review.invocationId)))
        .digest("hex"),
      ...common,
    };
    const ledgerSchemaVersion = review.ledgerSchemaVersion ?? 5;
    return ledgerSchemaVersion === 2
      ? {
          schemaVersion: 2 as const,
          scenarioId: "findings-example" as const,
          ...commonReview,
        }
      : {
          schemaVersion: ledgerSchemaVersion,
          subject: review.subject,
          ...commonReview,
        };
  };
  const generationSubject = {
    tag: "scenarioCampaign" as const,
    campaignId: "findings-campaign" as const,
    evidenceSetId: "findings-campaign-evidence" as const,
    plannedScenarioId: "findings-example" as const,
  };
  const generationLedgerEntry = (invocationId: string) => ({
    schemaVersion: 4 as const,
    subject: generationSubject,
    invocationId,
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
    phase: "scenarioGeneration" as const,
    stagePlanReason: "The campaign requires scenario generation.",
    eventsSha256: "0".repeat(64),
    ...common,
  });
  const orderedEntries = options.orderedLedgerEntries ?? [
    ...(options.generationInvocationIds ?? []).map(
      (invocationId): OrderedLedgerEntry => ({
        tag: "generation",
        invocationId,
      }),
    ),
    ...reviewEntries.map(
      (review): OrderedLedgerEntry => ({ tag: "review", review }),
    ),
  ];
  const entries = orderedEntries.map((entry) =>
    entry.tag === "generation"
      ? generationLedgerEntry(entry.invocationId)
      : reviewLedgerEntry(entry.review),
  );
  writeFileSync(
    path,
    `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
  );
  const campaignIdentity = options.campaignIdentity ?? {
    campaignId: "findings-campaign",
    evidenceSetId: "findings-campaign-evidence",
    plannedScenarioId: "findings-example",
  };
  writeFileSync(
    resolve(root, "campaign.json"),
    `${JSON.stringify({
      type: "raw-swarm-scenario-campaign",
      schemaVersion: 1,
      ...campaignIdentity,
      gitSha: common.gitSha,
      startedAt: common.startedAt,
      configSha256: "c".repeat(64),
    })}\n`,
  );
  return relative(repoRoot, path);
}

function retainedBenchmarkReviewLedger(
  root: string,
  subject: {
    readonly tag: "benchmark";
    readonly benchmarkId: string;
    readonly profile: "documentDeclarationSet" | "boundedCapabilityProjection";
    readonly scenarioId: "findings-example";
  },
): string {
  const path = resolve(root, "benchmark-invocations.jsonl");
  const common = {
    gitSha: "a".repeat(40),
    startedAt: "2026-08-18T00:00:00.000Z",
    elapsedMilliseconds: 10,
    exit: { tag: "exited" as const, status: 0 },
    result: { tag: "succeeded" as const },
    usage: {
      tag: "unavailable" as const,
      reason:
        "The first-party event stream exposed no turn.completed usage object.",
    },
  };
  const entries = [
    {
      invocationId: "benchmark-generation",
      phase: "scenarioGeneration" as const,
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      stagePlanReason: "The fixed benchmark requires generation.",
    },
    {
      invocationId: "benchmark-final",
      phase: "scenarioCompositeReview" as const,
      model: "gpt-5.6-luna",
      reasoningEffort: "medium",
      stagePlanReason: "The fixed benchmark requires a final review.",
    },
  ].map((entry) => {
    const eventPath = resolve(root, `${entry.invocationId}.events.jsonl`);
    const events = [
      {
        type: "raw-swarm.invocation.started",
        schemaVersion: 5,
        subject,
        gitSha: common.gitSha,
        phase: entry.phase,
        stagePlanReason: entry.stagePlanReason,
        fallbackInvocationId: entry.invocationId,
        model: entry.model,
        reasoningEffort: entry.reasoningEffort,
        startedAt: common.startedAt,
      },
      { type: "thread.started", thread_id: entry.invocationId },
      {
        type: "item.completed",
        item: {
          type: "agent_message",
          text: JSON.stringify({
            result: retainedCompositeReviewInput({
              reviewStage: "final",
              invocationId: entry.invocationId,
            }).result,
          }),
        },
      },
      { type: "turn.completed" },
      {
        type: "raw-swarm.invocation.completed",
        schemaVersion: 5,
        elapsedMilliseconds: common.elapsedMilliseconds,
        exit: common.exit,
        result: common.result,
      },
    ];
    writeFileSync(
      eventPath,
      `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
    );
    return {
      schemaVersion: 5 as const,
      subject,
      invocationId: entry.invocationId,
      model: entry.model,
      reasoningEffort: entry.reasoningEffort,
      phase: entry.phase,
      stagePlanReason: entry.stagePlanReason,
      eventsSha256: createHash("sha256")
        .update(readFileSync(eventPath))
        .digest("hex"),
      ...common,
    };
  });
  writeFileSync(
    path,
    `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
  );
  return relative(repoRoot, path);
}

function findingIdentity(finding: {
  readonly stage: string;
  readonly category: string;
  readonly kind: string;
  readonly summary: string;
  readonly detail?: string;
  readonly pointer: unknown;
  readonly fingerprint?: string;
}) {
  return {
    stage: finding.stage,
    category: finding.category,
    kind: finding.kind,
    summary: finding.summary,
    ...(finding.detail === undefined ? {} : { detail: finding.detail }),
    pointer: finding.pointer,
    ...(finding.fingerprint === undefined
      ? {}
      : { fingerprint: finding.fingerprint }),
  };
}

function reportCommand(args: readonly string[]): string {
  return execFileSync(
    "mise",
    ["exec", "--", "node", "--experimental-strip-types", reportScript, ...args],
    { cwd: repoRoot, encoding: "utf8" },
  );
}

describe("Raw Swarm findings projection", () => {
  test("retains parsed source authority instead of rereading mutated bytes", () => {
    const root = directory();
    const path = resolve(root, "cached-authority.json");
    writeFileSync(path, '{"value":"before"}\n');
    const source = readSourceWithAuthority({
      role: "replay-final",
      path: relative(repoRoot, path),
    });
    expect(source._tag).toBe("Right");
    if (Either.isLeft(source)) return;
    const original = authorityFor(source.right);
    writeFileSync(path, '{"value":"after"}\n');
    expect(authorityFor(source.right)).toEqual(original);
  });

  test("projects a zero-exit invalid last message as a generation invocation failure", () => {
    const root = directory();
    const ledgerPath = retainedGenerationReviewLedger(root);
    const absoluteLedgerPath = resolve(repoRoot, ledgerPath);
    const rows = readFileSync(absoluteLedgerPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => parseJsonRecord(line));
    const failedRow = {
      ...rows[0],
      invocationId: "missing-last-message",
      eventsSha256: "c".repeat(64),
      exit: { tag: "exited", status: 0 },
      result: {
        tag: "failed",
        failureKind: "lastMessageMissing",
        operation: "expectedLastMessage",
        reason: "Expected Codex last-message output file does not exist.",
      },
    };
    writeFileSync(
      absoluteLedgerPath,
      `${rows.map((row) => JSON.stringify(row)).join("\n")}\n${JSON.stringify(failedRow)}\n`,
    );

    const findings = findingsFromGenerationLedger(
      { role: "generationLedger", path: ledgerPath },
      {
        scenarioId: "findings-example",
        gitSha: "a".repeat(40),
        owner: { tag: "scenario" },
      },
    );
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "generation-invocation-failure",
          pointer: expect.objectContaining({ line: 3 }),
        }),
      ]),
    );
  });

  test("retains the milestone Candidate after a three-iteration revision with a distinct final hash", () => {
    const input = fixture();
    const milestoneQuality = {
      classification: "needsRevision" as const,
      evidence: "The milestone Candidate is not ready for admission.",
      critique: "Revise the Candidate before the final admission review.",
    };
    const finalQuality = {
      classification: "ready" as const,
      evidence: "The revised Candidate is ready for admission.",
    };
    const milestoneSubject = {
      tag: "scenarioCandidate",
      campaignId: "findings-campaign",
      evidenceSetId: "findings-campaign-evidence",
      candidateId: "findings-milestone-candidate",
      candidateScenarioSha256: "b".repeat(64),
      plannedScenarioId: "findings-example",
    } as const satisfies CompositeReviewFixtureSubject;
    const finalSubject = {
      tag: "scenarioCandidate",
      campaignId: "findings-campaign",
      evidenceSetId: "findings-campaign-evidence",
      candidateId: "findings-final-candidate",
      candidateScenarioSha256: input.scenarioSha256,
      plannedScenarioId: "findings-example",
    } as const satisfies CompositeReviewFixtureSubject;
    const generationLedgerRelative = retainedGenerationReviewLedger(
      input.root,
      FINDINGS_REVIEW_SUBJECT,
      {
        reviewEntries: [
          {
            invocationId: "iteration-two-milestone",
            reviewStage: "milestone",
            subject: milestoneSubject,
            scenarioQuality: milestoneQuality,
          },
          {
            invocationId: "iteration-three-final",
            reviewStage: "final",
            subject: finalSubject,
            scenarioQuality: finalQuality,
          },
        ],
        orderedLedgerEntries: [
          { tag: "generation", invocationId: "iteration-one-generation" },
          { tag: "generation", invocationId: "iteration-two-revision" },
          {
            tag: "review",
            review: {
              invocationId: "iteration-two-milestone",
              reviewStage: "milestone",
              subject: milestoneSubject,
            },
          },
          { tag: "generation", invocationId: "iteration-three-generation" },
          {
            tag: "review",
            review: {
              invocationId: "iteration-three-final",
              reviewStage: "final",
              subject: finalSubject,
            },
          },
        ],
        campaignIdentity: {
          campaignId: "findings-campaign",
          evidenceSetId: "findings-campaign-evidence",
          plannedScenarioId: "findings-example",
        },
      },
    );
    const milestonePath = resolve(input.root, "iteration-two-milestone.json");
    const finalPath = resolve(input.root, "iteration-three-final.json");
    const milestoneInput = retainedCandidateCompositeReviewInput({
      reviewStage: "milestone",
      invocationId: "iteration-two-milestone",
      subject: milestoneSubject,
      scenarioQuality: milestoneQuality,
    });
    const finalInput = retainedCandidateCompositeReviewInput({
      reviewStage: "final",
      invocationId: "iteration-three-final",
      subject: finalSubject,
      scenarioQuality: finalQuality,
    });
    writeFileSync(milestonePath, `${JSON.stringify(milestoneInput)}\n`);
    writeFileSync(finalPath, `${JSON.stringify(finalInput)}\n`);

    expect(milestoneInput.result.scenarioQuality).toEqual(milestoneQuality);
    expect(finalInput.result.scenarioQuality).toEqual(finalQuality);
    expect(milestoneInput.result.scenarioQuality).toMatchObject({
      classification: "needsRevision",
      critique: expect.stringContaining("Revise the Candidate"),
    });
    expect(finalInput.result.scenarioQuality).toMatchObject({
      classification: "ready",
    });
    expect(milestoneSubject.candidateId).not.toBe(finalSubject.candidateId);
    expect(milestoneSubject.candidateScenarioSha256).not.toBe(
      finalSubject.candidateScenarioSha256,
    );
    expect(finalSubject.candidateScenarioSha256).toBe(input.scenarioSha256);
    expect(
      readFileSync(resolve(repoRoot, generationLedgerRelative), "utf8")
        .trim()
        .split("\n")
        .map((line) => parseJsonRecord(line).invocationId),
    ).toEqual([
      "iteration-one-generation",
      "iteration-two-revision",
      "iteration-two-milestone",
      "iteration-three-generation",
      "iteration-three-final",
    ]);

    const projection = projectExecutionFindings({
      transcriptPath: input.transcriptRelative,
      evidenceSetDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [generationLedgerRelative],
      reviewReplay: {
        tag: "milestoneAndFinal",
        milestonePath: relative(repoRoot, milestonePath),
        finalPath: relative(repoRoot, finalPath),
      },
      issueLinks: [],
    });

    expect(projection.authorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "replay-milestone" }),
        expect.objectContaining({ role: "replay-final" }),
        expect.objectContaining({
          role: "campaign",
          path: relative(repoRoot, resolve(input.root, "campaign.json")),
        }),
      ]),
    );
    expect(
      projection.authorities.filter(({ role }) => role.startsWith("replay-")),
    ).toHaveLength(2);
    const finalLedgerValue = readFileSync(
      resolve(repoRoot, generationLedgerRelative),
      "utf8",
    )
      .trim()
      .split("\n")
      .map(parseJsonRecord)
      .find(({ invocationId }) => invocationId === "iteration-three-final");
    if (finalLedgerValue === undefined) {
      throw new Error("Synthetic final Candidate ledger entry is incomplete.");
    }
    const finalLedgerEntry = parseModelInvocationLedgerEntry(finalLedgerValue);
    const finalReplayInput = Schema.decodeUnknownEither(
      RetainedScenarioReviewInputSchema,
      { onExcessProperty: "error" },
    )(finalInput);
    expect(Either.isRight(finalLedgerEntry)).toBe(true);
    expect(Either.isRight(finalReplayInput)).toBe(true);
    if (Either.isLeft(finalLedgerEntry) || Either.isLeft(finalReplayInput)) {
      return;
    }
    const finalBinding = retainedScenarioReviewMatchesReplayBinding(
      finalReplayInput.right,
      finalLedgerEntry.right,
      {
        tag: "candidate",
        reviewStage: "final",
        scenarioId: "findings-example",
        admittedScenarioSha256: input.scenarioSha256,
        campaign: {
          campaignId: "findings-campaign",
          evidenceSetId: "findings-campaign-evidence",
          plannedScenarioId: "findings-example",
        },
      },
    );
    expect(Either.isRight(finalBinding)).toBe(true);
    if (Either.isLeft(finalBinding)) return;
    expect(finalBinding.right).toMatchObject({
      tag: "candidate",
      retainedInput: { subject: finalSubject },
      ledgerEntry: { subject: finalSubject },
    });
    expect(finalBinding.right).not.toHaveProperty("candidateScenarioSha256");
    expect(finalBinding.right).not.toHaveProperty("campaign");

    const milestoneLedgerValue = readFileSync(
      resolve(repoRoot, generationLedgerRelative),
      "utf8",
    )
      .trim()
      .split("\n")
      .map(parseJsonRecord)
      .find(({ invocationId }) => invocationId === "iteration-two-milestone");
    if (milestoneLedgerValue === undefined) {
      throw new Error(
        "Synthetic milestone Candidate ledger entry is incomplete.",
      );
    }
    const milestoneLedgerEntry =
      parseModelInvocationLedgerEntry(milestoneLedgerValue);
    const milestoneReplayInput = Schema.decodeUnknownEither(
      RetainedScenarioReviewInputSchema,
      { onExcessProperty: "error" },
    )(milestoneInput);
    expect(Either.isRight(milestoneLedgerEntry)).toBe(true);
    expect(Either.isRight(milestoneReplayInput)).toBe(true);
    if (
      Either.isLeft(milestoneLedgerEntry) ||
      Either.isLeft(milestoneReplayInput)
    ) {
      return;
    }
    const milestoneBinding = retainedScenarioReviewMatchesReplayBinding(
      milestoneReplayInput.right,
      milestoneLedgerEntry.right,
      {
        tag: "candidate",
        reviewStage: "milestone",
        scenarioId: "findings-example",
        campaign: {
          campaignId: "findings-campaign",
          evidenceSetId: "findings-campaign-evidence",
          plannedScenarioId: "findings-example",
        },
      },
    );
    expect(Either.isRight(milestoneBinding)).toBe(true);
    if (Either.isLeft(milestoneBinding)) return;
    expect(milestoneBinding.right).toMatchObject({
      tag: "candidate",
      retainedInput: { subject: milestoneSubject },
      ledgerEntry: { subject: milestoneSubject },
    });
    expect(milestoneBinding.right).not.toHaveProperty(
      "candidateScenarioSha256",
    );
  });

  test("accepts an exact historical v2 composite-review ledger row", () => {
    const input = fixture();
    const generationLedgerRelative = retainedGenerationReviewLedger(
      input.root,
      FINDINGS_REVIEW_SUBJECT,
      {
        reviewEntries: [
          {
            invocationId: "historical-final",
            reviewStage: "final",
            subject: FINDINGS_REVIEW_SUBJECT,
            ledgerSchemaVersion: 2,
          },
        ],
      },
    );
    const finalPath = resolve(input.root, "historical-final.json");
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "final",
          invocationId: "historical-final",
        }),
      )}\n`,
    );

    const projection = projectExecutionFindings({
      transcriptPath: input.transcriptRelative,
      evidenceSetDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [generationLedgerRelative],
      reviewReplay: {
        tag: "finalOnly",
        finalPath: relative(repoRoot, finalPath),
      },
      issueLinks: [],
    });

    expect(
      projection.authorities.some(({ role }) => role === "replay-final"),
    ).toBe(true);
    const retained = Schema.decodeUnknownEither(
      RetainedScenarioReviewInputSchema,
      { onExcessProperty: "error" },
    )(parseJsonRecord(readFileSync(finalPath, "utf8")));
    const ledgerEntry = parseModelInvocationLedgerEntry(
      parseJsonRecord(
        readFileSync(resolve(repoRoot, generationLedgerRelative), "utf8"),
      ),
    );
    expect(Either.isRight(retained)).toBe(true);
    expect(Either.isRight(ledgerEntry)).toBe(true);
    if (Either.isLeft(retained) || Either.isLeft(ledgerEntry)) return;
    const binding = retainedScenarioReviewMatchesReplayBinding(
      retained.right,
      ledgerEntry.right,
      {
        tag: "historicalScenario",
        reviewStage: "final",
        scenarioId: "findings-example",
        admittedScenarioSha256: input.scenarioSha256,
        campaign: {
          campaignId: "findings-campaign",
          evidenceSetId: "findings-campaign-evidence",
          plannedScenarioId: "findings-example",
        },
      },
    );
    expect(Either.isRight(binding)).toBe(true);
    if (Either.isLeft(binding)) return;
    expect(binding.right).toMatchObject({
      tag: "historicalScenario",
      retainedInput: { scenarioId: "findings-example" },
      ledgerEntry: {
        schemaVersion: 2,
        scenarioId: "findings-example",
      },
    });
    expect(binding.right).not.toHaveProperty("scenarioId");
    expect(binding.right).not.toHaveProperty("envelopeSubject");
    expect(binding.right).not.toHaveProperty("ledgerSchemaVersion");
    expect(binding.right).not.toHaveProperty("campaign");
  });

  test("binds a current v5 fixed-benchmark replay to benchmark lifecycle ownership", () => {
    const benchmarkSubject = {
      tag: "benchmark" as const,
      benchmarkId: "synthetic-fixed-benchmark",
      profile: "boundedCapabilityProjection" as const,
      scenarioId: "findings-example",
    };
    const ledger = parseModelInvocationLedgerEntry({
      schemaVersion: 5,
      subject: benchmarkSubject,
      invocationId: "benchmark-final",
      model: "gpt-5.6-luna",
      reasoningEffort: "medium",
      phase: "scenarioCompositeReview",
      stagePlanReason: "The fixed benchmark requires a final review.",
      gitSha: "a".repeat(40),
      eventsSha256: "b".repeat(64),
      startedAt: "2026-08-18T00:00:00.000Z",
      elapsedMilliseconds: 10,
      exit: { tag: "exited", status: 0 },
      result: { tag: "succeeded" },
      usage: { tag: "unavailable", reason: "synthetic" },
    });
    const replay = Schema.decodeUnknownEither(
      RetainedScenarioReviewInputSchema,
      { onExcessProperty: "error" },
    )({
      schemaVersion: 3,
      phase: "scenarioCompositeReview",
      reviewStage: "final",
      sourceGitSha: "a".repeat(40),
      invocationId: "benchmark-final",
      model: "gpt-5.6-luna",
      reasoningEffort: "medium",
      prompt: "Synthetic fixed benchmark final review.",
      outputJsonSchema: codexOutputJsonSchema(
        CurrentScenarioCompositeReviewSchema,
      ),
      result: {
        raw: { classification: "supported", evidence: "RAW." },
        contentAvailability: {
          classification: "supplied",
          evidence: "Catalog.",
        },
        sdkCapability: { classification: "supported", evidence: "SDK." },
        artifactPolicy: { classification: "safe", evidence: "Policy." },
        scenarioQuality: { classification: "ready", evidence: "Quality." },
      },
      subject: benchmarkSubject,
    });
    expect(Either.isRight(ledger)).toBe(true);
    expect(Either.isRight(replay)).toBe(true);
    if (Either.isLeft(ledger) || Either.isLeft(replay)) return;
    const binding = retainedScenarioReviewMatchesReplayBinding(
      replay.right,
      ledger.right,
      {
        tag: "benchmark",
        reviewStage: "final",
        scenarioId: "findings-example",
        benchmark: {
          benchmarkId: "synthetic-fixed-benchmark",
          profile: "boundedCapabilityProjection",
        },
      },
    );
    expect(Either.isRight(binding)).toBe(true);
    if (Either.isLeft(binding)) return;
    expect(binding.right).toMatchObject({
      tag: "benchmark",
      retainedInput: { subject: benchmarkSubject },
      ledgerEntry: { schemaVersion: 5, subject: benchmarkSubject },
    });
  });

  test("projects a fresh v5 fixed-benchmark replay without a Campaign manifest", () => {
    const input = fixture();
    const subject = {
      tag: "benchmark" as const,
      benchmarkId: "synthetic-fixed-benchmark",
      profile: "boundedCapabilityProjection" as const,
      scenarioId: "findings-example" as const,
    };
    const generationLedgerRelative = retainedBenchmarkReviewLedger(
      input.root,
      subject,
    );
    const finalPath = resolve(input.root, "benchmark-final.json");
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedBenchmarkCompositeReviewInput({
          reviewStage: "final",
          invocationId: "benchmark-final",
          subject,
        }),
      )}\n`,
    );

    const projection = projectExecutionFindings({
      transcriptPath: input.transcriptRelative,
      evidenceSetDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [generationLedgerRelative],
      reviewReplay: {
        tag: "finalOnly",
        finalPath: relative(repoRoot, finalPath),
      },
      issueLinks: [],
    });

    expect(projection.authorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "replay-final" }),
        expect.objectContaining({
          role: "prePlayReviewReplayEvents-final",
        }),
      ]),
    );
    expect(projection.authorities.some(({ role }) => role === "campaign")).toBe(
      false,
    );
  });

  test("accepts a historical envelope paired with migrated v4 Candidate ownership", () => {
    const input = fixture();
    const candidateSubject = {
      tag: "scenarioCandidate",
      campaignId: "findings-campaign",
      evidenceSetId: "findings-campaign-evidence",
      candidateId: "findings-candidate",
      candidateScenarioSha256: input.scenarioSha256,
      plannedScenarioId: "findings-example",
    } as const satisfies CompositeReviewFixtureSubject;
    const generationLedgerRelative = retainedGenerationReviewLedger(
      input.root,
      candidateSubject,
      {
        reviewEntries: [
          {
            invocationId: "historical-v4-candidate",
            reviewStage: "final",
            subject: candidateSubject,
            ledgerSchemaVersion: 4,
          },
        ],
      },
    );
    const retained = Schema.decodeUnknownEither(
      RetainedScenarioReviewInputSchema,
      { onExcessProperty: "error" },
    )(
      retainedCompositeReviewInput({
        reviewStage: "final",
        invocationId: "historical-v4-candidate",
      }),
    );
    const ledger = parseModelInvocationLedgerEntry(
      parseJsonRecord(
        readFileSync(resolve(repoRoot, generationLedgerRelative), "utf8"),
      ),
    );
    expect(Either.isRight(retained)).toBe(true);
    expect(Either.isRight(ledger)).toBe(true);
    if (Either.isLeft(retained) || Either.isLeft(ledger)) return;
    const binding = retainedScenarioReviewMatchesReplayBinding(
      retained.right,
      ledger.right,
      {
        tag: "historicalScenario",
        reviewStage: "final",
        scenarioId: "findings-example",
        admittedScenarioSha256: input.scenarioSha256,
        campaign: {
          campaignId: "findings-campaign",
          evidenceSetId: "findings-campaign-evidence",
          plannedScenarioId: "findings-example",
        },
      },
    );
    expect(Either.isRight(binding)).toBe(true);
    if (Either.isLeft(binding)) return;
    expect(binding.right).toMatchObject({
      tag: "historicalScenario",
      retainedInput: { scenarioId: "findings-example" },
      ledgerEntry: { schemaVersion: 4, subject: candidateSubject },
    });
    expect(binding.right).not.toHaveProperty("scenarioId");
    expect(binding.right).not.toHaveProperty("envelopeSubject");
    expect(binding.right).not.toHaveProperty("campaign");

    const sameOwnerWrongHashLedger = {
      ...ledger.right,
      subject: {
        ...candidateSubject,
        candidateScenarioSha256: "f".repeat(64),
      },
    };
    const sameOwnerWrongHashBinding =
      retainedScenarioReviewMatchesReplayBinding(
        retained.right,
        sameOwnerWrongHashLedger,
        {
          tag: "historicalScenario",
          reviewStage: "final",
          scenarioId: "findings-example",
          admittedScenarioSha256: input.scenarioSha256,
          campaign: {
            campaignId: "findings-campaign",
            evidenceSetId: "findings-campaign-evidence",
            plannedScenarioId: "findings-example",
          },
        },
      );
    expect(Either.isLeft(sameOwnerWrongHashBinding)).toBe(true);
    if (Either.isRight(sameOwnerWrongHashBinding)) return;
    expect(sameOwnerWrongHashBinding.left).toContain(
      "admitted Scenario source hash",
    );

    const foreignLedger = {
      ...ledger.right,
      subject: {
        ...candidateSubject,
        campaignId: "foreign-campaign",
        evidenceSetId: "foreign-evidence",
      },
    };
    const foreignBinding = retainedScenarioReviewMatchesReplayBinding(
      retained.right,
      foreignLedger,
      {
        tag: "historicalScenario",
        reviewStage: "final",
        scenarioId: "findings-example",
        admittedScenarioSha256: input.scenarioSha256,
        campaign: {
          campaignId: "findings-campaign",
          evidenceSetId: "findings-campaign-evidence",
          plannedScenarioId: "findings-example",
        },
      },
    );
    expect(Either.isLeft(foreignBinding)).toBe(true);
    if (Either.isRight(foreignBinding)) return;
    expect(foreignBinding.left).toMatch(/Campaign, Evidence Set/);
  });

  test("preserves a revised Candidate hash at the historical milestone", () => {
    const input = fixture();
    const candidateSubject = {
      tag: "scenarioCandidate",
      campaignId: "findings-campaign",
      evidenceSetId: "findings-campaign-evidence",
      candidateId: "findings-milestone-candidate",
      candidateScenarioSha256: "f".repeat(64),
      plannedScenarioId: "findings-example",
    } as const satisfies CompositeReviewFixtureSubject;
    const generationLedgerRelative = retainedGenerationReviewLedger(
      input.root,
      candidateSubject,
      {
        reviewEntries: [
          {
            invocationId: "historical-v4-milestone",
            reviewStage: "milestone",
            subject: candidateSubject,
            ledgerSchemaVersion: 4,
          },
        ],
      },
    );
    const retained = Schema.decodeUnknownEither(
      RetainedScenarioReviewInputSchema,
      { onExcessProperty: "error" },
    )(
      retainedCompositeReviewInput({
        reviewStage: "milestone",
        invocationId: "historical-v4-milestone",
      }),
    );
    const ledger = parseModelInvocationLedgerEntry(
      parseJsonRecord(
        readFileSync(resolve(repoRoot, generationLedgerRelative), "utf8"),
      ),
    );
    expect(Either.isRight(retained)).toBe(true);
    expect(Either.isRight(ledger)).toBe(true);
    if (Either.isLeft(retained) || Either.isLeft(ledger)) return;
    const binding = retainedScenarioReviewMatchesReplayBinding(
      retained.right,
      ledger.right,
      {
        tag: "historicalScenario",
        reviewStage: "milestone",
        scenarioId: "findings-example",
        campaign: {
          campaignId: "findings-campaign",
          evidenceSetId: "findings-campaign-evidence",
          plannedScenarioId: "findings-example",
        },
      },
    );
    expect(Either.isRight(binding)).toBe(true);
  });

  test("rejects replay when the generation Campaign manifest is missing", () => {
    const input = fixture();
    const generationLedgerRelative = retainedGenerationReviewLedger(input.root);
    rmSync(resolve(input.root, "campaign.json"), { force: true });
    const finalPath = resolve(input.root, "original-final.json");
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "final",
          invocationId: "original-final",
        }),
      )}\n`,
    );

    expect(() =>
      projectExecutionFindings({
        transcriptPath: input.transcriptRelative,
        evidenceSetDirectory: input.runRelative,
        reviewPaths: [input.reviewRelative],
        scenarioReviewPaths: [],
        generationLedgerPaths: [generationLedgerRelative],
        reviewReplay: {
          tag: "finalOnly",
          finalPath: relative(repoRoot, finalPath),
        },
        issueLinks: [],
      }),
    ).toThrow(/Campaign manifest|required Campaign identity/);
  });

  test("rejects a historical milestone envelope with a foreign scenario identity", () => {
    const input = fixture();
    const generationLedgerRelative = retainedGenerationReviewLedger(
      input.root,
      FINDINGS_REVIEW_SUBJECT,
      {
        reviewEntries: [
          {
            invocationId: "historical-milestone",
            reviewStage: "milestone",
            subject: FINDINGS_REVIEW_SUBJECT,
            ledgerSchemaVersion: 2,
          },
          {
            invocationId: "historical-final",
            reviewStage: "final",
            subject: FINDINGS_REVIEW_SUBJECT,
            ledgerSchemaVersion: 2,
          },
        ],
      },
    );
    const foreignMilestone = {
      ...retainedCompositeReviewInput({
        reviewStage: "milestone",
        invocationId: "historical-milestone",
      }),
      scenarioId: "foreign-scenario",
    };
    const finalInput = retainedCompositeReviewInput({
      reviewStage: "final",
      invocationId: "historical-final",
    });
    const milestonePath = resolve(input.root, "historical-milestone.json");
    const finalPath = resolve(input.root, "historical-final.json");
    writeFileSync(milestonePath, `${JSON.stringify(foreignMilestone)}\n`);
    writeFileSync(finalPath, `${JSON.stringify(finalInput)}\n`);

    expect(() =>
      projectExecutionFindings({
        transcriptPath: input.transcriptRelative,
        evidenceSetDirectory: input.runRelative,
        reviewPaths: [input.reviewRelative],
        scenarioReviewPaths: [],
        generationLedgerPaths: [generationLedgerRelative],
        reviewReplay: {
          tag: "milestoneAndFinal",
          milestonePath: relative(repoRoot, milestonePath),
          finalPath: relative(repoRoot, finalPath),
        },
        issueLinks: [],
      }),
    ).toThrow(/Historical review invocation .*expected scenario/);
  });

  test("rejects a cross-campaign Candidate replay with the same scenario hash", () => {
    const input = fixture();
    const expectedSubject = {
      tag: "scenarioCandidate",
      campaignId: "findings-campaign",
      evidenceSetId: "findings-campaign-evidence",
      candidateId: "findings-final-candidate",
      candidateScenarioSha256: input.scenarioSha256,
      plannedScenarioId: "findings-example",
    } as const satisfies CompositeReviewFixtureSubject;
    const generationLedgerRelative = retainedGenerationReviewLedger(
      input.root,
      expectedSubject,
      {
        reviewEntries: [
          {
            invocationId: "cross-campaign-final",
            reviewStage: "final",
            subject: expectedSubject,
          },
        ],
        campaignIdentity: {
          campaignId: "findings-campaign",
          evidenceSetId: "findings-campaign-evidence",
          plannedScenarioId: "findings-example",
        },
      },
    );
    const foreignSubject = {
      ...expectedSubject,
      campaignId: "foreign-campaign",
      evidenceSetId: "foreign-evidence",
    } as const;
    const finalPath = resolve(input.root, "cross-campaign-final.json");
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedCandidateCompositeReviewInput({
          reviewStage: "final",
          invocationId: "cross-campaign-final",
          subject: foreignSubject,
        }),
      )}\n`,
    );

    expect(() =>
      projectExecutionFindings({
        transcriptPath: input.transcriptRelative,
        evidenceSetDirectory: input.runRelative,
        reviewPaths: [input.reviewRelative],
        scenarioReviewPaths: [],
        generationLedgerPaths: [generationLedgerRelative],
        reviewReplay: {
          tag: "finalOnly",
          finalPath: relative(repoRoot, finalPath),
        },
        issueLinks: [],
      }),
    ).toThrow(/Campaign and Evidence Set|lifecycle subject/);
  });

  test("retains original milestone/final composite-review envelopes as replay authorities without ledger rows", () => {
    const input = fixture();
    const generationLedgerRelative = retainedGenerationReviewLedger(input.root);
    const milestonePath = resolve(input.root, "original-milestone.json");
    const finalPath = resolve(input.root, "original-final.json");
    writeFileSync(
      milestonePath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "milestone",
          invocationId: "original-milestone",
        }),
      )}\n`,
    );
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "final",
          invocationId: "original-final",
        }),
      )}\n`,
    );
    const projection = projectExecutionFindings({
      transcriptPath: input.transcriptRelative,
      evidenceSetDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [generationLedgerRelative],
      reviewReplay: {
        tag: "milestoneAndFinal",
        milestonePath: relative(repoRoot, milestonePath),
        finalPath: relative(repoRoot, finalPath),
      },
      issueLinks: [],
    });
    expect(projection.authorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "replay-milestone" }),
        expect.objectContaining({ role: "replay-final" }),
      ]),
    );
    expect(
      projection.authorities.filter(({ role }) => role.startsWith("replay-")),
    ).toHaveLength(2);
    expect(JSON.stringify(projection)).not.toContain("usage");
    expect(projection.findings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pointer: expect.objectContaining({
            authorityRole: "replay-milestone",
          }),
        }),
      ]),
    );
    const tamperedEventPath = resolve(
      input.root,
      "original-milestone.events.jsonl",
    );
    const tamperedEvents = readFileSync(tamperedEventPath, "utf8").replace(
      '\\"classification\\":\\"supported\\"',
      '\\"classification\\":\\"unsupported\\"',
    );
    writeFileSync(tamperedEventPath, tamperedEvents);
    const tamperedLedgerPath = resolve(repoRoot, generationLedgerRelative);
    const tamperedLedgerEntries = readFileSync(tamperedLedgerPath, "utf8")
      .trim()
      .split("\n")
      .map(parseJsonRecord);
    tamperedLedgerEntries[0] = {
      ...tamperedLedgerEntries[0],
      eventsSha256: createHash("sha256").update(tamperedEvents).digest("hex"),
    };
    writeFileSync(
      tamperedLedgerPath,
      `${tamperedLedgerEntries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
    );
    expect(() =>
      projectExecutionFindings({
        transcriptPath: input.transcriptRelative,
        evidenceSetDirectory: input.runRelative,
        reviewPaths: [input.reviewRelative],
        scenarioReviewPaths: [],
        generationLedgerPaths: [generationLedgerRelative],
        reviewReplay: {
          tag: "milestoneAndFinal",
          milestonePath: relative(repoRoot, milestonePath),
          finalPath: relative(repoRoot, finalPath),
        },
        issueLinks: [],
      }),
    ).toThrow(/result does not match its invocation event output/);
  });

  test("binds Candidate review reservations to the exact admitted Scenario source", () => {
    const input = fixture();
    const subject = {
      tag: "scenarioCandidate",
      campaignId: "findings-campaign",
      evidenceSetId: "findings-campaign-evidence",
      candidateId: "findings-candidate",
      candidateScenarioSha256: input.scenarioSha256,
      plannedScenarioId: "findings-example",
    } as const satisfies CompositeReviewFixtureSubject;
    const generationLedgerRelative = retainedGenerationReviewLedger(
      input.root,
      subject,
    );
    const milestonePath = resolve(input.root, "original-milestone.json");
    const finalPath = resolve(input.root, "original-final.json");
    writeFileSync(
      milestonePath,
      `${JSON.stringify(
        retainedCandidateCompositeReviewInput({
          reviewStage: "milestone",
          invocationId: "original-milestone",
          subject,
        }),
      )}\n`,
    );
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedCandidateCompositeReviewInput({
          reviewStage: "final",
          invocationId: "original-final",
          subject,
        }),
      )}\n`,
    );
    const common = {
      transcriptPath: input.transcriptRelative,
      evidenceSetDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [generationLedgerRelative],
      issueLinks: [],
    } as const;
    const reviewReplay = {
      tag: "milestoneAndFinal" as const,
      milestonePath: relative(repoRoot, milestonePath),
      finalPath: relative(repoRoot, finalPath),
    };

    const projection = projectExecutionFindings({ ...common, reviewReplay });
    expect(projection.authorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "replay-milestone" }),
        expect.objectContaining({ role: "replay-final" }),
      ]),
    );

    const mismatchedSubject = {
      ...subject,
      candidateScenarioSha256: "f".repeat(64),
    };
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedCandidateCompositeReviewInput({
          reviewStage: "final",
          invocationId: "original-final",
          subject: mismatchedSubject,
        }),
      )}\n`,
    );
    expect(() => projectExecutionFindings({ ...common, reviewReplay })).toThrow(
      /Candidate source hash does not match admitted scenario/,
    );
  });

  test("retains the bounded final-only composite-review envelope", () => {
    const input = fixture();
    const generationLedgerRelative = retainedGenerationReviewLedger(input.root);
    const finalPath = resolve(input.root, "original-final.json");
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "final",
          invocationId: "original-final",
        }),
      )}\n`,
    );

    const projection = projectExecutionFindings({
      transcriptPath: input.transcriptRelative,
      evidenceSetDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [generationLedgerRelative],
      reviewReplay: {
        tag: "finalOnly",
        finalPath: relative(repoRoot, finalPath),
      },
      issueLinks: [],
    });

    expect(projection.authorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "replay-final" }),
        expect.objectContaining({
          role: "prePlayReviewReplayEvents-final",
        }),
      ]),
    );
    expect(
      projection.authorities.some(({ role }) => role.includes("milestone")),
    ).toBe(false);
  });

  test("rejects missing, duplicate-stage, and mismatched original review replay inputs", () => {
    const input = fixture();
    const generationLedgerRelative = retainedGenerationReviewLedger(input.root);
    const milestonePath = resolve(input.root, "original-milestone.json");
    const finalPath = resolve(input.root, "original-final.json");
    writeFileSync(
      milestonePath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "milestone",
          invocationId: "original-milestone",
        }),
      )}\n`,
    );
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "final",
          invocationId: "original-final",
        }),
      )}\n`,
    );
    const common = {
      transcriptPath: input.transcriptRelative,
      evidenceSetDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [generationLedgerRelative],
      issueLinks: [],
    } as const;
    expect(() =>
      projectExecutionFindings({
        ...common,
        reviewReplay: {
          tag: "finalOnly",
          finalPath: relative(repoRoot, milestonePath),
        },
      }),
    ).toThrow(/expected final/);
    expect(() =>
      projectExecutionFindings({
        ...common,
        reviewReplay: {
          tag: "milestoneAndFinal",
          milestonePath: relative(repoRoot, milestonePath),
          finalPath: relative(repoRoot, milestonePath),
        },
      }),
    ).toThrow(/distinct envelope paths/);
    const duplicateStagePath = resolve(input.root, "duplicate-milestone.json");
    writeFileSync(
      duplicateStagePath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "milestone",
          invocationId: "original-final",
        }),
      )}\n`,
    );
    expect(() =>
      projectExecutionFindings({
        ...common,
        reviewReplay: {
          tag: "milestoneAndFinal",
          milestonePath: relative(repoRoot, milestonePath),
          finalPath: relative(repoRoot, duplicateStagePath),
        },
      }),
    ).toThrow(/expected final/);

    const foreign = parseJsonRecord(readFileSync(finalPath, "utf8"));
    foreign.scenarioId = "foreign-scenario";
    writeFileSync(finalPath, `${JSON.stringify(foreign)}\n`);
    expect(() =>
      projectExecutionFindings({
        ...common,
        reviewReplay: {
          tag: "milestoneAndFinal",
          milestonePath: relative(repoRoot, milestonePath),
          finalPath: relative(repoRoot, finalPath),
        },
      }),
    ).toThrow(/foreign-scenario does not match admitted scenario/);
    writeFileSync(
      finalPath,
      `${JSON.stringify(
        retainedCompositeReviewInput({
          reviewStage: "final",
          invocationId: "original-final",
        }),
      )}\n`,
    );

    const ledgerPath = resolve(repoRoot, generationLedgerRelative);
    const ledgerEntries = readFileSync(ledgerPath, "utf8")
      .trim()
      .split("\n")
      .map(parseJsonRecord);
    for (const [field, value] of [
      ["model", "gpt-5.6-sol"],
      ["reasoningEffort", "medium"],
      ["gitSha", "b".repeat(40)],
    ] as const) {
      ledgerEntries[1] = { ...ledgerEntries[1], [field]: value };
      writeFileSync(
        ledgerPath,
        `${ledgerEntries.map((entry) => JSON.stringify(entry)).join("\n")}\n`,
      );
      expect(() =>
        projectExecutionFindings({
          ...common,
          reviewReplay: {
            tag: "milestoneAndFinal",
            milestonePath: relative(repoRoot, milestonePath),
            finalPath: relative(repoRoot, finalPath),
          },
        }),
      ).toThrow(/does not match original composite-review invocation/);
      ledgerEntries[1] = {
        ...ledgerEntries[1],
        [field]:
          field === "gitSha"
            ? "a".repeat(40)
            : field === "model"
              ? "gpt-5.6-luna"
              : "max",
      };
    }
  });

  test("retains pre-call failure, correction, accepted verdict, and exact authorities", () => {
    const input = fixture();
    const projection = projectExecutionFindings({
      transcriptPath: input.transcriptRelative,
      evidenceSetDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [],
      issueLinks: [],
    });
    expect(validateFindingsProjection(projection)).toEqual({
      tag: "valid",
      projection,
    });
    expect(projection.subject.sdkCalls).toMatchObject({
      tag: "retainedTranscript",
      callCount: 1,
    });
    expect(projection.authorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          role: "transcript",
          path: input.transcriptRelative,
        }),
        expect.objectContaining({
          role: "playerEvents",
          path: input.eventRelative,
        }),
        expect.objectContaining({
          role: "review-1",
          path: input.reviewRelative,
        }),
      ]),
    );
    expect(projection.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "pre-call-compilation-failure" }),
        expect.objectContaining({ kind: "successful-correction" }),
        expect.objectContaining({
          kind: "accepted-call-verdict",
          category: "runtime-rules-defect",
          fingerprint: sha256Canonical({
            class: "bug",
            claim: input.claim,
          }),
          pointer: expect.objectContaining({
            kind: "sdkSequence",
            sequence: 1,
          }),
        }),
        expect.objectContaining({
          stage: "character-authoring",
          category: "informational-observation",
          kind: "informational-observation",
        }),
      ]),
    );
    expect(
      projection.findings.some(
        (finding) => finding.pointer.authorityRole === "frozenPrefix",
      ),
    ).toBe(false);
    expect(JSON.stringify(projection)).not.toContain("inputSession");
    expect(renderFindingsAudit(projection)).toContain(
      "pre-call-compilation-failure",
    );
  });

  test("reprojection is deterministic and writing is immutable/idempotent", () => {
    const input = fixture();
    const options = {
      transcriptPath: input.transcriptRelative,
      evidenceSetDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [],
      issueLinks: [],
    } as const;
    const first = projectExecutionFindings(options);
    const second = projectExecutionFindings(options);
    expect(second).toEqual(first);
    const path = resolve(input.run, "evidence/findings.json");
    const authority = writeFindingsProjection({
      projection: first,
      path: relative(repoRoot, path),
    });
    expect(authority.sha256).toBe(
      createHash("sha256").update(readFileSync(path)).digest("hex"),
    );
    expect(
      writeFindingsProjection({
        projection: second,
        path: relative(repoRoot, path),
      }),
    ).toEqual(authority);
    expect(readFindingsProjection(relative(repoRoot, path))).toEqual(first);
  });

  test("rejects a review authority from another run", () => {
    const input = fixture();
    const foreignReviewPath = resolve(input.root, "foreign-review.json");
    const foreignReview = parseJsonRecord(
      readFileSync(resolve(input.root, "review.json"), "utf8"),
    );
    foreignReview.scenarioId = "another-run";
    writeFileSync(foreignReviewPath, `${JSON.stringify(foreignReview)}\n`);
    expect(() =>
      projectExecutionFindings({
        transcriptPath: input.transcriptRelative,
        evidenceSetDirectory: input.runRelative,
        reviewPaths: [relative(repoRoot, foreignReviewPath)],
        scenarioReviewPaths: [],
        generationLedgerPaths: [],
        issueLinks: [],
      }),
    ).toThrow(/Review authority identity does not match the findings subject/);
  });

  test("binds a pre-play scenario review without requiring the player commit", () => {
    const input = fixture();
    const scenarioPath = resolve(input.run, "SCENARIO.md");
    const scenarioBytes = "# Findings scenario\n";
    writeFileSync(scenarioPath, scenarioBytes);
    const scenarioSha256 = createHash("sha256")
      .update(scenarioBytes)
      .digest("hex");
    const reviewPath = resolve(input.run, "SCENARIO_REVIEW.json");
    const review = finalScenarioReview({
      scenarioId: "findings-example",
      scenarioSha256,
      gitSha: "b".repeat(40),
    });
    const reviewBytes = `${JSON.stringify(review, null, 2)}\n`;
    writeFileSync(reviewPath, reviewBytes);
    const scenarioReviewSha256 = createHash("sha256")
      .update(reviewBytes)
      .digest("hex");
    const records = readFileSync(input.transcriptPath, "utf8")
      .trimEnd()
      .split("\n")
      .map(parseJsonRecord);
    records[0] = {
      ...records[0],
      scenarioSha256,
      scenarioReviewSha256,
    };
    writeFileSync(
      input.transcriptPath,
      `${records.map((record) => JSON.stringify(record)).join("\n")}\n`,
    );
    const stagePlanFindings = parseJsonRecordArray(
      readFileSync(
        resolve(input.run, "evidence/stage-plan-findings.json"),
        "utf8",
      ),
    );
    stagePlanFindings[0] = {
      ...stagePlanFindings[0],
      identity: {
        tag: "admitted",
        scenarioId: "findings-example",
        scenarioSha256,
        scenarioReviewSha256,
      },
    };
    writeFileSync(
      resolve(input.run, "evidence/stage-plan-findings.json"),
      `${JSON.stringify(stagePlanFindings)}\n`,
    );
    const stagePlanPath = resolve(input.run, "evidence/stage-plan.json");
    const stagePlan = parseJsonRecord(readFileSync(stagePlanPath, "utf8"));
    stagePlan.identity = {
      tag: "admitted",
      scenarioId: "findings-example",
      scenarioSha256,
      scenarioReviewSha256,
    };
    writeFileSync(stagePlanPath, `${JSON.stringify(stagePlan, null, 2)}\n`);

    const projection = projectExecutionFindings({
      transcriptPath: input.transcriptRelative,
      evidenceSetDirectory: input.runRelative,
      reviewPaths: [],
      scenarioReviewPaths: [relative(repoRoot, reviewPath)],
      generationLedgerPaths: [],
      issueLinks: [],
    });
    expect(
      projection.authorities.some(
        (authority) => authority.role === "scenarioReview",
      ),
    ).toBe(true);
  });

  test("keeps scenario-review parsing separate from ordinary and historical reviews", () => {
    const input = fixture();
    const scenarioPath = resolve(input.root, "ordinary-scenario.md");
    writeFileSync(scenarioPath, "# Ordinary scenario\n");
    const historicalPath = resolve(
      input.root,
      "historical-scenario-review.json",
    );
    writeFileSync(
      historicalPath,
      `${JSON.stringify({
        raw: { classification: "supported", evidence: "RAW." },
        contentAvailability: {
          classification: "supplied",
          evidence: "Catalog.",
        },
        sdkCapability: { classification: "supported", evidence: "SDK." },
        artifactPolicy: { classification: "safe", evidence: "Policy." },
      })}\n`,
    );
    expect(() =>
      projectExecutionFindings({
        transcriptPath: input.transcriptRelative,
        evidenceSetDirectory: input.runRelative,
        reviewPaths: [],
        scenarioReviewPaths: [relative(repoRoot, historicalPath)],
        generationLedgerPaths: [],
        issueLinks: [],
      }),
    ).toThrow(/Historical scenario review has no execution identity/);
    expect(() =>
      projectGenerationFindings({
        disposition: { tag: "completed" },
        scenarioId: "findings-example",
        gitSha: "a".repeat(40),
        startedAt: "2026-08-18T00:00:00.000Z",
        authorityPaths: [
          { role: "execution", path: input.runStartRelative },
          { role: "scenario", path: relative(repoRoot, scenarioPath) },
          { role: "review", path: input.reviewRelative },
        ],
        scenarioReviewPaths: [input.reviewRelative],
        generationLedgerPaths: [],
        stagePlanPaths: [],
        stagePlanFindingsPaths: [],
      }),
    ).toThrow(/Scenario-review authority has an unsupported schema/);
  });

  test("rejects a foreign final scenario review during generation projection", () => {
    const input = fixture();
    const scenarioPath = resolve(input.root, "generated-candidate.md");
    const scenarioBytes = "# Generated candidate\n";
    writeFileSync(scenarioPath, scenarioBytes);
    const reviewPath = resolve(input.root, "generated-review.json");
    writeFileSync(
      reviewPath,
      `${JSON.stringify(
        finalScenarioReview({
          scenarioId: "findings-example",
          scenarioSha256: createHash("sha256")
            .update(scenarioBytes)
            .digest("hex"),
          gitSha: "b".repeat(40),
        }),
        null,
        2,
      )}\n`,
    );
    expect(() =>
      projectGenerationFindings({
        disposition: { tag: "completed" },
        scenarioId: "findings-example",
        gitSha: "a".repeat(40),
        startedAt: "2026-08-18T00:00:00.000Z",
        authorityPaths: [
          { role: "execution", path: input.runStartRelative },
          { role: "scenario", path: relative(repoRoot, scenarioPath) },
          { role: "scenarioReview", path: relative(repoRoot, reviewPath) },
        ],
        scenarioReviewPaths: [relative(repoRoot, reviewPath)],
        generationLedgerPaths: [],
        stagePlanPaths: [],
        stagePlanFindingsPaths: [],
      }),
    ).toThrow(
      /Scenario review authority identity does not match the findings subject/,
    );
  });

  test("rejects a transcript authority for a transcript-free identity", () => {
    const input = fixture();
    const projection = projectGenerationFindings({
      disposition: { tag: "completed" },
      scenarioId: "findings-example",
      gitSha: "a".repeat(40),
      startedAt: "2026-08-18T00:00:00.000Z",
      authorityPaths: [{ role: "execution", path: input.runStartRelative }],
      scenarioReviewPaths: [],
      generationLedgerPaths: [],
      stagePlanPaths: [],
      stagePlanFindingsPaths: [],
    });
    expect(
      validateFindingsProjection({
        ...projection,
        authorities: projection.authorities.map((authority) =>
          authority.role === "execution"
            ? { ...authority, role: "transcript" }
            : authority,
        ),
      }),
    ).toMatchObject({
      tag: "invalid",
      message: /transcript-free subject cannot have a transcript authority/,
    });
  });

  test("projects and indexes a generation rejection without inventing a transcript", () => {
    const root = directory();
    const run = resolve(root, "generation-run");
    const manifest = resolve(run, "campaign.json");
    const campaign = resolve(root, "campaign.json");
    const ledger = resolve(root, "generation.jsonl");
    const scenario = resolve(root, "candidate.md");
    const stagePlanFindings = resolve(root, "stage-plan-findings.json");
    const candidateRejection = resolve(root, "candidate-rejection.json");
    const candidateReview = resolve(root, "candidate-review.json");
    mkdirSync(run, { recursive: true });
    writeFileSync(
      manifest,
      `${JSON.stringify({
        type: "raw-swarm-scenario-campaign",
        schemaVersion: 1,
        campaignId: "generation-campaign",
        plannedScenarioId: "generation-example",
        evidenceSetId: "generation-evidence",
        gitSha: "a".repeat(40),
        startedAt: "2026-08-18T00:00:00.000Z",
        configSha256: "c".repeat(64),
      })}\n`,
    );
    writeFileSync(campaign, '{"scenarioId":"generation-example"}\n');
    const scenarioBytes = "The candidate is incoherent outside the envelope.\n";
    writeFileSync(scenario, scenarioBytes);
    const candidateScenarioSha256 = createHash("sha256")
      .update(scenarioBytes)
      .digest("hex");
    const stagePlan = planScenarioStages({
      identity: {
        tag: "candidate",
        campaignId: "generation-campaign",
        candidateId: "generation-candidate",
        candidateScenarioSha256,
      },
      facts: {
        schemaVersion: 1,
        characterRequirement: {
          tag: "statBlocksOnly",
          evidence: "Fixture rejection has no character-sheet requirement.",
        },
        spatialRequirement: {
          tag: "outsideExperimentEnvelope",
          resolution: "incoherent",
          evidence: "Fixture candidate is incoherent.",
        },
      },
    });
    if (stagePlan._tag === "Left") throw new Error(stagePlan.left);
    const stagePlanPath = resolve(root, "stage-plan.json");
    writeFileSync(
      stagePlanPath,
      `${JSON.stringify(stagePlan.right, null, 2)}\n`,
    );
    writeFileSync(
      ledger,
      `${JSON.stringify({
        schemaVersion: 1,
        scenarioId: "generation-example",
        gitSha: "a".repeat(40),
        eventsSha256: "b".repeat(64),
        phase: "scenarioGeneration",
        invocationId: "fixture-generation",
        model: "synthetic",
        reasoningEffort: "medium",
        startedAt: "2026-08-18T00:00:00.000Z",
        elapsedMilliseconds: 0,
        exit: { tag: "exited", status: 1 },
        usage: { tag: "unavailable", reason: "fixture" },
      })}\n`,
    );
    writeFileSync(
      stagePlanFindings,
      `${JSON.stringify(scenarioStagePlanFindings(stagePlan.right), null, 2)}\n`,
    );
    writeFileSync(
      candidateRejection,
      `${JSON.stringify({ schemaVersion: 1, candidateId: "generation-candidate", campaignId: "generation-campaign", evidenceSetId: "generation-evidence", reason: "The candidate is incoherent." })}\n`,
    );
    writeFileSync(
      candidateReview,
      `${JSON.stringify({
        campaignId: "generation-campaign",
        candidateId: "generation-candidate",
        candidateScenarioSha256,
        gitSha: "a".repeat(40),
        admitReviewedUnsupported: false,
        reviewScope: "rawContentSdkCapabilityPolicyQuality",
        contentAvailabilityIntent: "availableOnly",
        sdkCapabilityIntent: "supportedOnly",
        rawReview: { classification: "supported", evidence: "Supported." },
        contentReview: { classification: "supplied", evidence: "Supplied." },
        sdkCapabilityReview: {
          classification: "supported",
          evidence: "Supported.",
        },
        policyReview: { classification: "safe", evidence: "Safe." },
        scenarioQuality: {
          classification: "needsRevision",
          evidence: "The candidate is incoherent.",
          critique: "Repair the contradictory geometry.",
        },
      })}\n`,
    );
    const projectionInput = {
      scenarioId: "generation-example",
      gitSha: "a".repeat(40),
      startedAt: "2026-08-18T00:00:00.000Z",
      authorityPaths: [
        { role: "campaign", path: relative(repoRoot, manifest) },
        { role: "campaign", path: relative(repoRoot, campaign) },
        { role: "generationLedger", path: relative(repoRoot, ledger) },
      ],
      scenarioReviewPaths: [],
      generationLedgerPaths: [relative(repoRoot, ledger)],
      pointerAuthorityRole: "stagePlanFindings",
      disposition: {
        tag: "reviewedCandidateRejection",
        candidateRejectionPath: relative(repoRoot, candidateRejection),
        candidateProsePath: relative(repoRoot, scenario),
        candidateReviewPath: relative(repoRoot, candidateReview),
        stagePlanPath: relative(repoRoot, stagePlanPath),
        stagePlanFindingsPath: relative(repoRoot, stagePlanFindings),
      },
    } as const;
    const projection = projectGenerationFindings(projectionInput);
    expect(projection.subject.sdkCalls).toEqual({ tag: "transcriptFree" });
    if (projection.subject.tag !== "scenarioCampaign")
      throw new Error("fixture subject");
    const forgedSubject = {
      ...projection.subject,
      campaignId: "forged-campaign" as typeof projection.subject.campaignId,
    };
    expect(
      validateFindingsProjection({
        ...projection,
        subject: forgedSubject,
        subjectIdentity: sha256Canonical(forgedSubject),
      }),
    ).toMatchObject({
      tag: "invalid",
      message: /does not match its decoded campaign manifest/,
    });
    expect(projection.authorities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: relative(repoRoot, candidateReview),
        }),
      ]),
    );
    expect(projection.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "generation-rejection" }),
        expect.objectContaining({ kind: "generation-invocation-failure" }),
        expect.objectContaining({
          kind: "generation-rejection",
          pointer: expect.objectContaining({
            authorityRole: "candidateRejection",
          }),
        }),
      ]),
    );
    const foreignLedger = resolve(root, "foreign-generation.jsonl");
    const ledgerEntry = parseJsonRecord(readFileSync(ledger, "utf8"));
    writeFileSync(
      foreignLedger,
      `${JSON.stringify({ ...ledgerEntry, scenarioId: "foreign-scenario" })}\n`,
    );
    expect(() =>
      projectGenerationFindings({
        ...projectionInput,
        authorityPaths: [
          ...projectionInput.authorityPaths.filter(
            ({ role }) => role !== "generationLedger",
          ),
          {
            role: "generationLedger",
            path: relative(repoRoot, foreignLedger),
          },
        ],
        generationLedgerPaths: [relative(repoRoot, foreignLedger)],
      }),
    ).toThrow(/belongs to a different findings identity/);
    const mismatchedStagePlanFindings = resolve(
      root,
      "mismatched-stage-plan-findings.json",
    );
    writeFileSync(
      mismatchedStagePlanFindings,
      `${JSON.stringify(
        scenarioStagePlanFindings(stagePlan.right).map((finding) => ({
          ...finding,
          identity: {
            tag: "admitted" as const,
            scenarioId: "generation-example",
            scenarioSha256: candidateScenarioSha256,
            scenarioReviewSha256: "d".repeat(64),
          },
        })),
        null,
        2,
      )}\n`,
    );
    expect(() =>
      projectGenerationFindings({
        ...projectionInput,
        disposition: {
          ...projectionInput.disposition,
          stagePlanFindingsPath: relative(
            repoRoot,
            mismatchedStagePlanFindings,
          ),
        },
      }),
    ).toThrow(/Stage-plan findings authority does not match the retained plan/);
    const wrongCandidateHashFindings = resolve(
      root,
      "wrong-candidate-hash-findings.json",
    );
    writeFileSync(
      wrongCandidateHashFindings,
      `${JSON.stringify(
        scenarioStagePlanFindings(stagePlan.right).map((finding) => ({
          ...finding,
          identity: {
            tag: "candidate" as const,
            campaignId: "generation-campaign",
            candidateId: "generation-candidate",
            candidateScenarioSha256: "0".repeat(64),
          },
        })),
        null,
        2,
      )}\n`,
    );
    expect(() =>
      projectGenerationFindings({
        ...projectionInput,
        disposition: {
          ...projectionInput.disposition,
          stagePlanFindingsPath: relative(repoRoot, wrongCandidateHashFindings),
        },
      }),
    ).toThrow(/Stage-plan findings authority does not match the retained plan/);
    const findingsPath = resolve(run, "evidence/findings.json");
    writeFindingsProjection({
      projection,
      path: relative(repoRoot, findingsPath),
    });
    const dbPath = resolve(root, "generation.sqlite");
    expect(
      ingestGenerationFindings({
        findingsPath: relative(repoRoot, findingsPath),
        dbPath: relative(repoRoot, dbPath),
      }),
    ).toBe(1);
    const db = openArtifactIndex(relative(repoRoot, dbPath));
    try {
      expect(
        db
          .prepare(
            "SELECT campaignId, plannedScenarioId, evidenceSetId FROM scenarioCampaigns",
          )
          .get(),
      ).toEqual({
        campaignId: "generation-campaign",
        plannedScenarioId: "generation-example",
        evidenceSetId: "generation-evidence",
      });
      expect(
        db
          .prepare("SELECT COUNT(*) AS count FROM scenarioCampaignFindings")
          .get(),
      ).toEqual({ count: 7 });
    } finally {
      db.close();
    }
    const audit = reportCommand([
      "generation-audit",
      "--campaign-row",
      "1",
      "--db",
      relative(repoRoot, dbPath),
    ]);
    expect(audit).toContain("generation-rejection");
  }, 30_000);

  test("rejects malformed projections, duplicate identities, broken pointers, and tampering", () => {
    const input = fixture();
    const projection = projectExecutionFindings({
      transcriptPath: input.transcriptRelative,
      evidenceSetDirectory: input.runRelative,
      reviewPaths: [input.reviewRelative],
      scenarioReviewPaths: [],
      generationLedgerPaths: [],
      issueLinks: [],
    });
    expect(
      validateFindingsProjection({
        ...projection,
        authorities: [],
      }),
    ).toMatchObject({ tag: "invalid" });
    const first = projection.findings[0]!;
    expect(
      validateFindingsProjection({
        ...projection,
        findings: [first, first],
      }),
    ).toMatchObject({ tag: "invalid", message: /Duplicate finding/ });
    const unknownPointer = {
      ...first,
      pointer: { kind: "artifact", authorityRole: "missing-authority" },
    };
    expect(
      validateFindingsProjection({
        ...projection,
        findings: [
          {
            ...unknownPointer,
            findingId: sha256Canonical(findingIdentity(unknownPointer)),
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", message: /unknown authority/ });
    const brokenSequence = projection.findings.find(
      (finding) => finding.pointer.kind === "sdkSequence",
    );
    expect(brokenSequence).toBeDefined();
    if (brokenSequence === undefined) return;
    const pointer = {
      kind: "sdkSequence" as const,
      authorityRole: "transcript",
      sequence: 2,
    };
    expect(
      validateFindingsProjection({
        ...projection,
        findings: [
          {
            ...brokenSequence,
            pointer,
            findingId: sha256Canonical(
              findingIdentity({ ...brokenSequence, pointer }),
            ),
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: /past the recorded SDK call count/,
    });
    expect(
      validateFindingsProjection({
        ...projection,
        findings: [{ ...first, findingId: "0".repeat(64) }],
      }),
    ).toMatchObject({ tag: "invalid", message: /inconsistent identity/ });
    expect(
      validateFindingsProjection({
        ...projection,
        subjectIdentity: "0".repeat(64),
      }),
    ).toMatchObject({ tag: "invalid", message: /subject identity/ });
    expect(
      validateFindingsProjection({
        ...projection,
        authorities: projection.authorities.map((authority) =>
          authority.role === "transcript"
            ? { ...authority, sha256: "0".repeat(64) }
            : authority,
        ),
      }),
    ).toMatchObject({ tag: "invalid", message: /authority hash/ });
    expect(
      validateFindingsProjection({
        ...projection,
        findings: projection.findings.map((finding) => {
          if (finding.pointer.kind !== "sdkSequence") return finding;
          const pointer = { ...finding.pointer, authorityRole: "review-1" };
          return {
            ...finding,
            pointer,
            findingId: sha256Canonical(
              findingIdentity({ ...finding, pointer }),
            ),
          };
        }),
      }),
    ).toMatchObject({ tag: "invalid", message: /must use the transcript/ });
  });

  test("omits empty optional detail and preserves physical JSONL line pointers", () => {
    const input = fixture();
    const emptyDetail = makeFinding({
      stage: "player",
      category: "informational-observation",
      kind: "informational-observation",
      summary: "No detail",
      detail: " \u0000 ",
      pointer: { kind: "artifact", authorityRole: "transcript" },
    });
    expect(emptyDetail).not.toHaveProperty("detail");
    const observationsPath = resolve(input.run, "evidence/observations.jsonl");
    writeFileSync(
      observationsPath,
      "\n\n" +
        `${JSON.stringify({ kind: "executionError", message: "line three" })}\n`,
    );
    const projection = projectExecutionFindings({
      transcriptPath: input.transcriptRelative,
      evidenceSetDirectory: input.runRelative,
      reviewPaths: [],
      scenarioReviewPaths: [],
      generationLedgerPaths: [],
      issueLinks: [],
    });
    expect(projection.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          detail: "line three",
          pointer: expect.objectContaining({
            authorityRole: "observations",
            line: 3,
          }),
        }),
      ]),
    );
  });

  test("does not downgrade a structurally malformed SDK transcript to zero calls", () => {
    const input = fixture();
    writeFileSync(
      input.transcriptPath,
      `${JSON.stringify({
        type: "sdk-player-header",
        scenarioId: "findings-example",
        gitSha: "a".repeat(40),
        startedAt: "2026-08-18T00:00:00.000Z",
      })}\n${JSON.stringify({ type: "not-an-sdk-call" })}\n`,
    );
    expect(() =>
      projectExecutionFindings({
        transcriptPath: input.transcriptRelative,
        evidenceSetDirectory: input.runRelative,
        reviewPaths: [],
        scenarioReviewPaths: [],
        generationLedgerPaths: [],
        issueLinks: [],
      }),
    ).toThrow(/SDK transcript is malformed/);
  });

  test("rejects non-SDK transcript formats instead of projecting a zero-call run", () => {
    const root = directory();
    const run = resolve(root, "mcp-run");
    const evidence = resolve(run, "evidence");
    mkdirSync(evidence, { recursive: true });
    const transcriptPath = resolve(run, "run.jsonl");
    writeFileSync(
      transcriptPath,
      `${JSON.stringify({ type: "header", scenarioId: "not-sdk" })}\n`,
    );
    expect(() =>
      projectExecutionFindings({
        transcriptPath: relative(repoRoot, transcriptPath),
        evidenceSetDirectory: relative(repoRoot, run),
        reviewPaths: [],
        scenarioReviewPaths: [],
        generationLedgerPaths: [],
        issueLinks: [],
      }),
    ).toThrow(/SDK transcript is malformed/);
  });

  test("rejects an external transcript reached through an in-repository symlink", () => {
    const input = fixture();
    const outside = mkdtempSync(
      resolve(tmpdir(), "raw-swarm-findings-outside-"),
    );
    directories.push(outside);
    const linkedTranscript = resolve(input.run, "evidence/linked.jsonl");
    const outsideTranscript = resolve(outside, "transcript.jsonl");
    writeFileSync(outsideTranscript, readFileSync(input.transcriptPath));
    symlinkSync(outsideTranscript, linkedTranscript);
    expect(() =>
      projectExecutionFindings({
        transcriptPath: relative(repoRoot, linkedTranscript),
        evidenceSetDirectory: input.runRelative,
        reviewPaths: [],
        scenarioReviewPaths: [],
        generationLedgerPaths: [],
        issueLinks: [],
      }),
    ).toThrow(/Finding source is not repository-owned/);
  });
});
