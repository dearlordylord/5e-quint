import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { Either, Schema } from "effect";
import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>();
  return { ...original, readFileSync: vi.fn(original.readFileSync) };
});

import {
  assembleCompletePathMeasurement,
  BenchmarkContextSourceManifestDocumentSchema,
  codexOutputJsonSchema,
  HistoricalScenarioCompositeReviewSchema,
  compareCompleteEquivalentPaths,
  deriveBenchmarkPathOutcome,
  parseBenchmarkMeasurement,
  parseCompletePathMeasurement,
  readCompletePathMeasurement,
  validateCompletePathMeasurement,
  writeCompletePathComparison,
  writeCompletePathMeasurement,
  type CurrentCompletePathMeasurement,
  type CompletePathMeasurement,
  type CurrentBenchmarkMeasurement,
  type ValidatedCompletePathMeasurement,
} from "./performance-comparison.ts";
import {
  benchmarkModelInvocationCompletedEvent,
  benchmarkModelInvocationStartedEvent,
  BenchmarkAuxiliaryModelInvocationLedgerEntrySchema,
} from "./model-telemetry.ts";
import {
  CurrentScenarioCompositeReviewSchema,
  ScenarioQualityReviewSchema,
  scenarioCompositeReviewSchemaForIntents,
} from "./scenario-campaign.ts";
import { capabilityContextSizeEstimate } from "./capability-context-size-estimate.ts";
import {
  BENCHMARK_CONTEXT_ROLES,
  benchmarkContextForRole,
  historicalDeclarationBundleText,
} from "./benchmark-context.ts";
import { planAdmittedScenarioStages } from "./scenario-stage-plan.ts";
import { rawSwarmTestOutputDirectory } from "./test-output.ts";
import {
  GitShaSchema,
  isJsonRecord,
  repoRoot,
  ScenarioIdSchema,
  sha256Canonical,
  sha256Text,
} from "./transcript.ts";
import {
  playerInitialTurnProjection,
  reprojectSdkTranscriptTurns,
} from "./sdk-player/player-turn-projection.ts";

function parseJsonRecord(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isJsonRecord(value)) throw new Error("Expected a JSON object fixture.");
  return value;
}

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

const scenarioId = Schema.decodeUnknownSync(ScenarioIdSchema)(
  "synthetic-complete-path",
);
const gitSha = Schema.decodeUnknownSync(GitShaSchema)("a".repeat(40));
const alternateGitSha = Schema.decodeUnknownSync(GitShaSchema)("b".repeat(40));
const scenarioBytes = "# Synthetic complete path\n";
const scenarioReview = {
  scenarioId,
  scenarioSha256: createHash("sha256").update(scenarioBytes).digest("hex"),
  gitSha,
  admitReviewedUnsupported: false,
  rawReview: {
    classification: "supported" as const,
    evidence: "Synthetic RAW review is supported.",
  },
  policyReview: {
    classification: "safe" as const,
    evidence: "Synthetic artifact policy review is safe.",
  },
  reviewScope: "rawContentSdkCapabilityPolicyQuality" as const,
  scenarioQuality: {
    classification: "ready" as const,
    evidence: "Synthetic scenario quality is ready.",
  },
  contentAvailabilityIntent: "availableOnly" as const,
  contentReview: {
    classification: "supplied" as const,
    evidence: "Synthetic content is supplied.",
  },
  sdkCapabilityIntent: "supportedOnly" as const,
  sdkCapabilityReview: {
    classification: "supported" as const,
    evidence: "Synthetic SDK capability is supported.",
  },
};
const scenarioReviewBytes = `${JSON.stringify(scenarioReview)}\n`;
const scenarioSha256 = createHash("sha256").update(scenarioBytes).digest("hex");
const scenarioReviewSha256 = createHash("sha256")
  .update(scenarioReviewBytes)
  .digest("hex");
const stagePlanResult = planAdmittedScenarioStages({
  scenarioId,
  scenarioSha256,
  scenarioReviewSha256,
  facts: {
    schemaVersion: 1,
    characterRequirement: {
      tag: "statBlocksOnly",
      evidence: "Synthetic creatures are admitted from stat blocks.",
    },
    spatialRequirement: {
      tag: "notRequired",
      evidence: "The synthetic scenario does not require geometry.",
    },
  },
});
if (Either.isLeft(stagePlanResult)) throw new Error(stagePlanResult.left);
const stagePlan = stagePlanResult.right;
const stageReason = (
  stage: (typeof stagePlan.stages)[number]["stage"],
): string => {
  const entry = stagePlan.stages.find((candidate) => candidate.stage === stage);
  if (entry === undefined)
    throw new Error(`Synthetic ${stage} stage is missing.`);
  return entry.reason;
};
type CurrentInvocation = CurrentCompletePathMeasurement["invocations"][number];

const usage = {
  tag: "available" as const,
  input: { tag: "available" as const, count: 100 },
  cachedInput: { tag: "available" as const, count: 50 },
  cacheWriteInput: { tag: "available" as const, count: 0 },
  output: { tag: "available" as const, count: 10 },
  reasoningOutput: { tag: "available" as const, count: 5 },
};

function invocation(
  overrides: Record<string, unknown> = {},
): CurrentInvocation {
  const values = {
    gitSha,
    eventsSha256: "d".repeat(64),
    phase: "player",
    stagePlanReason: "The admitted stage requires player execution.",
    invocationId: "invocation-1",
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
    startedAt: "2026-08-14T00:00:00.000Z",
    elapsedMilliseconds: 100,
    exit: { tag: "exited", status: 0 },
    result: { tag: "succeeded" },
    usage,
    ...overrides,
  };
  const subject =
    values.phase === "scenarioGeneration"
      ? {
          tag: "scenarioCampaign" as const,
          campaignId: "synthetic-complete-path-campaign",
          evidenceSetId: "synthetic-complete-path-evidence",
          plannedScenarioId: scenarioId,
        }
      : values.phase === "scenarioCompositeReview"
        ? {
            tag: "scenarioCandidate" as const,
            campaignId: "synthetic-complete-path-campaign",
            evidenceSetId: "synthetic-complete-path-evidence",
            candidateId: "synthetic-complete-path-candidate",
            candidateScenarioSha256: scenarioSha256,
            plannedScenarioId: scenarioId,
          }
        : values.phase === "player" || values.phase === "postPlayReview"
          ? {
              tag: "execution" as const,
              executionId: "synthetic-complete-path-execution",
              evidenceSetId: "synthetic-complete-path-evidence",
              scenarioId,
            }
          : { tag: "scenario" as const, scenarioId };
  const entry = {
    schemaVersion: 4,
    subject,
    ...values,
  } as CurrentInvocation;
  return {
    ...entry,
    eventsSha256: createHash("sha256").update(entry.invocationId).digest("hex"),
  };
}

function finding(
  kind: "accepted-call-verdict" | "successful-correction",
  index: number,
) {
  const identity = {
    stage: "player" as const,
    category:
      kind === "accepted-call-verdict"
        ? ("runtime-rules-defect" as const)
        : ("model-controller-mistake" as const),
    kind,
    summary: `Synthetic ${kind} ${String(index)}.`,
    pointer: {
      kind: "sdkSequence" as const,
      authorityRole: "transcript",
      sequence: index,
    },
  };
  return {
    findingId: sha256Canonical(identity),
    ...identity,
  };
}

function writeAuthority(root: string, name: string, contents: string) {
  const absolute = resolve(root, name);
  mkdirSync(resolve(absolute, ".."), { recursive: true });
  writeFileSync(absolute, contents);
  const bytes = readFileSync(absolute);
  return {
    path: relative(repoRoot, absolute),
    byteLength: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function replaceJsonAuthority(
  authority: CurrentBenchmarkMeasurement["findings"]["authorities"][number],
  value: unknown,
) {
  const bytes = Buffer.from(JSON.stringify(value) + "\n");
  writeFileSync(resolve(repoRoot, authority.path), bytes);
  return {
    ...authority,
    byteLength: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function syntheticCompositeReview() {
  return {
    raw: {
      classification: "supported" as const,
      evidence: "Synthetic RAW review is supported.",
    },
    contentAvailability: {
      classification: "supplied" as const,
      evidence: "Synthetic content is supplied.",
    },
    sdkCapability: {
      classification: "supported" as const,
      evidence: "Synthetic SDK capability is supported.",
    },
    artifactPolicy: {
      classification: "safe" as const,
      evidence: "Synthetic artifact policy is safe.",
    },
    scenarioQuality: {
      classification: "ready" as const,
      evidence: "Synthetic scenario quality is ready.",
    },
  };
}

function historicalCompositeReview() {
  const { scenarioQuality: _scenarioQuality, ...historical } =
    syntheticCompositeReview();
  return historical;
}

function findingsProjection(
  root: string,
  findings: readonly ReturnType<typeof finding>[],
  replayEvents: readonly ReturnType<typeof retainInvocation>[] = [],
  executionGitSha: typeof gitSha = gitSha,
  firstCallThrows = false,
): CompletePathMeasurement["findings"] {
  const scenario = writeAuthority(root, "SCENARIO.md", scenarioBytes);
  const scenarioReview = writeAuthority(
    root,
    "SCENARIO_REVIEW.json",
    scenarioReviewBytes,
  );
  const initialSession = {
    battle: {
      state: {
        initiative: { round: 1, stillToAct: [{ creature: "actor" }] },
        subjectResolutionPhase: { kind: "subjectSelection" },
        combatants: {
          $map: [
            [
              "actor",
              {
                hp: 10,
                maxHp: 10,
                tempHp: 0,
                conditions: {},
                reactionAvailable: true,
                movementSpentFeet: 0,
                zeroHpLifecycle: {
                  policy: "usesDeathSavingThrows",
                  deathSaves: {
                    deathSaves: { successes: 0, failures: 0 },
                    stable: false,
                    dead: false,
                    hpRegained: false,
                  },
                },
                ammunitionStocks: [],
                origin: {
                  kind: "character",
                  resources: [],
                  spellcasting: { spellSlots: [] },
                },
              },
            ],
          ],
        },
        groundObjects: { $map: [] },
      },
    },
    battlefield: {
      spatial: {
        kind: "geometryDerived",
        space: {
          placements: [{ token: "actor", coordinate: { x: 0, y: 0 } }],
        },
      },
      objects: [],
    },
  } as const;
  const initialSessionSha256 = sha256Canonical(initialSession);
  const characterSheets = {};
  const characterSheetsSha256 = sha256Canonical(characterSheets);
  const setupObservation = {};
  const replaySupervisor = writeAuthority(
    root,
    "replay-supervisor.mjs",
    "export default {};\n",
  );
  const characterAuthority = writeAuthority(
    root,
    "characters.json",
    `${JSON.stringify(characterSheets)}\n`,
  );
  const setupAuthority = writeAuthority(
    root,
    "setup.json",
    `${JSON.stringify(setupObservation)}\n`,
  );
  const returnedCall = (seq: 1 | 2) => ({
    type: "sdk-call" as const,
    seq,
    continuation: seq,
    operation: "discoverBattleActs" as const,
    inputSession: initialSession,
    inputSessionSha256: initialSessionSha256,
    input: {},
    outcome: "returned" as const,
    outputSession: initialSession,
    outputSessionSha256: initialSessionSha256,
    result: [],
    resultSha256: sha256Canonical([]),
  });
  const returnedCalls = [returnedCall(1), returnedCall(2)] as const;
  const calls = firstCallThrows
    ? [
        {
          type: "sdk-call" as const,
          seq: 1,
          continuation: 1,
          operation: "discoverBattleActs" as const,
          inputSession: initialSession,
          inputSessionSha256: initialSessionSha256,
          input: {},
          outcome: "threw" as const,
          rejection: "operationFailure" as const,
          error: {
            name: "Error",
            message:
              "Synthetic first-call failure recovered on continuation two.",
          },
        },
        returnedCalls[1],
      ]
    : returnedCalls;
  const initialProjection = playerInitialTurnProjection({
    session: initialSession,
    acts: [],
  });
  if (initialProjection.tag === "invalid") {
    throw new Error(initialProjection.message);
  }
  const transcriptHeader = {
    type: "sdk-player-header" as const,
    scenarioId,
    gitSha: executionGitSha,
    startedAt: "2026-08-14T00:00:00.000Z",
    consumerIsolation: "permissionProfile" as const,
    replaySupervisorSha256: replaySupervisor.sha256,
    charactersSha256: characterAuthority.sha256,
    scenarioSha256: scenario.sha256,
    scenarioReviewSha256: scenarioReview.sha256,
    characterOutcome: "ready" as const,
    characterObservation: {},
    characterSheets,
    characterSheetsSha256,
    setupSha256: setupAuthority.sha256,
    setupOutcome: "ready" as const,
    setupObservation,
    initialSession,
    initialSessionSha256,
    initialTurnProjection: initialProjection.projection,
    initialTurnProjectionSha256: sha256Canonical(initialProjection.projection),
  };
  const transcript = writeAuthority(
    root,
    "transcript.jsonl",
    `${JSON.stringify(transcriptHeader)}\n${calls.map((call) => JSON.stringify(call)).join("\n")}\n`,
  );
  const projected = reprojectSdkTranscriptTurns({
    calls,
    holeEvidenceSource: { kind: "recordedCurrentRuntime" },
  });
  if (projected.tag === "invalid") throw new Error(projected.message);
  const terminalProjection = projected.projections.at(-1);
  if (terminalProjection === undefined) {
    throw new Error("Synthetic terminal projection is missing.");
  }
  const firstProjection = projected.projections.at(0);
  if (firstProjection === undefined) {
    throw new Error("Synthetic first continuation projection is missing.");
  }
  const observations = writeAuthority(
    root,
    "evidence/observations.jsonl",
    `${JSON.stringify({
      transcriptHeaderSha256: sha256Canonical(transcriptHeader),
      continuation: 1,
      kind: "continue" as const,
      projection: firstProjection,
      tacticalNote: "Synthetic first continuation.",
    })}\n${JSON.stringify({
      transcriptHeaderSha256: sha256Canonical(transcriptHeader),
      continuation: 2,
      kind: "playerConcluded" as const,
      projection: terminalProjection,
      tacticalNote: "Synthetic tactical note.",
      conclusion: "Synthetic player concluded after an accepted SDK call.",
    })}\n`,
  );
  const program =
    'import type { PlayerContinuation } from "@dnd/player-sdk";\n\n' +
    "export const continuation0001: PlayerContinuation = async (context) => ({\n" +
    '  kind: "continue",\n' +
    "  session: context.session,\n" +
    '  tacticalNote: "Synthetic first continuation.",\n' +
    "});\n\n" +
    "export const continuation0002: PlayerContinuation = async (context) => ({\n" +
    '  kind: "playerConcluded",\n' +
    "  session: context.session,\n" +
    '  tacticalNote: "Synthetic tactical note.",\n' +
    '  conclusion: "Synthetic player concluded after an accepted SDK call.",\n' +
    "});\n";
  const programAuthority = writeAuthority(root, "evidence/program.ts", program);
  const frozenPrefix = writeAuthority(
    root,
    "evidence/frozen-prefix.json",
    `${JSON.stringify({
      frozenByteLength: programAuthority.byteLength,
      frozenSha256: programAuthority.sha256,
      continuationCount: 2,
      run: {
        kind: "playerConcluded",
        conclusion: "Synthetic player concluded after an accepted SDK call.",
      },
    })}\n`,
  );
  const finalArtifact = writeAuthority(
    root,
    "evidence/final.json",
    `${JSON.stringify({
      transcriptHeaderSha256: sha256Canonical(transcriptHeader),
      continuation: 2,
      kind: "playerConcluded",
      projection: terminalProjection,
      tacticalNote: "Synthetic tactical note.",
      conclusion: "Synthetic player concluded after an accepted SDK call.",
    })}\n`,
  );
  const review = writeAuthority(
    root,
    "review.json",
    `${JSON.stringify({
      scenarioId,
      gitSha: executionGitSha,
      transcriptSha256: transcript.sha256,
      reviewer: "synthetic-reviewer",
      verdicts: [
        {
          class: "pass" as const,
          claim: "The synthetic path is reviewable.",
          evidence: "The synthetic transcript is retained.",
        },
      ],
    })}\n`,
  );
  const compositeReview = syntheticCompositeReview();
  const retainedReviewInput = (
    reviewStage: "milestone" | "final",
    invocationId: string,
  ) => ({
    schemaVersion: 3 as const,
    phase: "scenarioCompositeReview" as const,
    reviewStage,
    sourceGitSha: gitSha,
    invocationId,
    model: "gpt-5.6-luna" as const,
    reasoningEffort: "max" as const,
    prompt: `Synthetic ${reviewStage} review prompt.`,
    outputJsonSchema: codexOutputJsonSchema(
      CurrentScenarioCompositeReviewSchema,
    ),
    result: compositeReview,
    subject: {
      tag: "scenarioCandidate" as const,
      campaignId: "synthetic-complete-path-campaign",
      evidenceSetId: "synthetic-complete-path-evidence",
      candidateId: "synthetic-complete-path-candidate",
      candidateScenarioSha256: scenarioSha256,
      plannedScenarioId: scenarioId,
    },
  });
  const replayMilestone = writeAuthority(
    root,
    "replay-milestone.json",
    `${JSON.stringify(retainedReviewInput("milestone", "composite-milestone"))}\n`,
  );
  const replayFinal = writeAuthority(
    root,
    "replay-final.json",
    `${JSON.stringify(retainedReviewInput("final", "composite-final"))}\n`,
  );
  const replayResult = writeAuthority(
    root,
    "evidence/replay-result.json",
    `${JSON.stringify({
      type: "raw-swarm-sdk-replay-result",
      schemaVersion: 1,
      scenarioId,
      transcriptSha256: transcript.sha256,
      replaySupervisorSha256: replaySupervisor.sha256,
      matchedCallCount: calls.length,
      status: "succeeded",
    })}\n`,
  );
  const replayEventAuthorities = replayEvents.flatMap(
    ({ entry, authority }) => {
      const reviewStage =
        entry.invocationId === "composite-milestone"
          ? "milestone"
          : entry.invocationId === "composite-final"
            ? "final"
            : undefined;
      return reviewStage === undefined
        ? []
        : [
            {
              role: `prePlayReviewReplayEvents-${reviewStage}`,
              ...authority,
            },
          ];
    },
  );
  const subject = {
    tag: "execution" as const,
    executionId: "synthetic-complete-path-execution",
    evidenceSetId: "synthetic-complete-path-evidence",
    scenarioId,
    gitSha: executionGitSha,
    startedAt: "2026-08-14T00:00:00.000Z",
    sdkCalls: {
      tag: "retainedTranscript" as const,
      transcriptSha256: transcript.sha256,
      callCount: calls.length,
    },
  };
  const executionStart = writeAuthority(
    root,
    "execution-start.json",
    `${JSON.stringify({
      type: "raw-swarm-execution-start",
      schemaVersion: 1,
      executionId: subject.executionId,
      evidenceSetId: subject.evidenceSetId,
      scenarioId: subject.scenarioId,
      gitSha: subject.gitSha,
      startedAt: subject.startedAt,
    })}\n`,
  );
  const campaign = writeAuthority(
    root,
    "campaign.json",
    `${JSON.stringify({
      type: "raw-swarm-scenario-campaign",
      schemaVersion: 1,
      campaignId: "synthetic-complete-path-campaign",
      plannedScenarioId: scenarioId,
      evidenceSetId: "synthetic-complete-path-evidence",
      gitSha,
      startedAt: "2026-08-14T00:00:00.000Z",
      configSha256: "c".repeat(64),
    })}\n`,
  );
  return {
    type: "raw-swarm-findings",
    schemaVersion: 2,
    subjectIdentity: sha256Canonical(subject),
    subject,
    authorities: [
      { role: "transcript", ...transcript },
      { role: "scenario", ...scenario },
      { role: "scenarioReview", ...scenarioReview },
      { role: "review-1", ...review },
      { role: "replay-milestone", ...replayMilestone },
      { role: "replay-final", ...replayFinal },
      ...replayEventAuthorities,
      { role: "replaySupervisor", ...replaySupervisor },
      { role: "replayResult", ...replayResult },
      { role: "observations", ...observations },
      { role: "frozenPrefix", ...frozenPrefix },
      { role: "final", ...finalArtifact },
      { role: "executionStart", ...executionStart },
      { role: "campaign", ...campaign },
    ],
    findings,
  };
}

function retainInvocation(
  root: string,
  entry: ReturnType<typeof invocation>,
  compositeReview: unknown = syntheticCompositeReview(),
) {
  const events = [
    {
      type: "raw-swarm.invocation.started",
      schemaVersion: 4,
      subject: entry.subject,
      gitSha: entry.gitSha,
      phase: entry.phase,
      stagePlanReason: entry.stagePlanReason,
      fallbackInvocationId: entry.invocationId,
      model: entry.model,
      reasoningEffort: entry.reasoningEffort,
      startedAt: entry.startedAt,
    },
    ...(entry.phase === "scenarioCompositeReview"
      ? [
          {
            type: "item.completed",
            item: {
              type: "agent_message",
              text: JSON.stringify({ result: compositeReview }),
            },
          },
        ]
      : []),
    {
      type: "turn.completed",
      usage:
        entry.usage.tag === "available"
          ? {
              input_tokens:
                entry.usage.input.tag === "available"
                  ? entry.usage.input.count
                  : undefined,
              cached_input_tokens:
                entry.usage.cachedInput.tag === "available"
                  ? entry.usage.cachedInput.count
                  : undefined,
              cache_write_input_tokens:
                entry.usage.cacheWriteInput.tag === "available"
                  ? entry.usage.cacheWriteInput.count
                  : undefined,
              output_tokens:
                entry.usage.output.tag === "available"
                  ? entry.usage.output.count
                  : undefined,
              reasoning_output_tokens:
                entry.usage.reasoningOutput.tag === "available"
                  ? entry.usage.reasoningOutput.count
                  : undefined,
            }
          : undefined,
    },
    {
      type: "raw-swarm.invocation.completed",
      schemaVersion: 4,
      elapsedMilliseconds: entry.elapsedMilliseconds,
      exit: entry.exit,
      result: entry.result,
    },
  ].map((event) => JSON.stringify(event));
  const authority = writeAuthority(
    root,
    `events/${entry.invocationId}.jsonl`,
    `${events.join("\n")}\n`,
  );
  return {
    entry: { ...entry, eventsSha256: authority.sha256 },
    authority,
  };
}

function retainBenchmarkAuxiliaryInvocation(
  root: string,
  input: {
    readonly responsibility:
      | "scenarioQuality"
      | "redundantCharacterPreparation";
    readonly phase: "scenarioReadiness" | "scenarioCharacterAuthoring";
    readonly invocationId: string;
    readonly implementationGitSha?: typeof gitSha;
    readonly result?: unknown;
  },
) {
  const implementationGitSha = input.implementationGitSha ?? gitSha;
  const stagePlanReason =
    input.responsibility === "scenarioQuality"
      ? "The benchmark retained the historical quality pass."
      : "The benchmark retained redundant character preparation.";
  const started = benchmarkModelInvocationStartedEvent({
    scenarioId,
    gitSha: implementationGitSha,
    profile: "documentDeclarationSet",
    responsibility: input.responsibility,
    phase: input.phase,
    stagePlanReason,
    fallbackInvocationId: input.invocationId,
    model:
      input.responsibility === "scenarioQuality"
        ? "gpt-5.6-luna"
        : "gpt-5.6-sol",
    reasoningEffort:
      input.responsibility === "scenarioQuality" ? "max" : "medium",
    startedAt: "2026-08-14T00:00:00.000Z",
  });
  const completed = benchmarkModelInvocationCompletedEvent({
    elapsedMilliseconds: 25,
    exit: { tag: "exited", status: 0 },
    result: { tag: "succeeded" },
  });
  if (Either.isLeft(started) || Either.isLeft(completed)) {
    throw new Error("Synthetic benchmark event fixture is invalid.");
  }
  const events = [
    started.right,
    ...(input.result === undefined
      ? []
      : [
          {
            type: "item.completed",
            item: {
              type: "agent_message",
              text: JSON.stringify({ result: input.result }),
            },
          },
        ]),
    { type: "thread.started", thread_id: input.invocationId },
    {
      type: "turn.completed",
      usage: {
        input_tokens: 30,
        cached_input_tokens: 0,
        cache_write_input_tokens: 0,
        output_tokens: 4,
        reasoning_output_tokens: 1,
      },
    },
    completed.right,
  ];
  const authority = writeAuthority(
    root,
    `events/${input.invocationId}.benchmark.jsonl`,
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
  );
  const parsed = Schema.decodeUnknownSync(
    BenchmarkAuxiliaryModelInvocationLedgerEntrySchema,
  )({
    schemaVersion: 3,
    profile: "documentDeclarationSet",
    responsibility: input.responsibility,
    phase: input.phase,
    scenarioId,
    gitSha: implementationGitSha,
    eventsSha256: authority.sha256,
    stagePlanReason,
    invocationId: input.invocationId,
    model:
      input.responsibility === "scenarioQuality"
        ? "gpt-5.6-luna"
        : "gpt-5.6-sol",
    reasoningEffort:
      input.responsibility === "scenarioQuality" ? "max" : "medium",
    startedAt: "2026-08-14T00:00:00.000Z",
    elapsedMilliseconds: 25,
    exit: { tag: "exited", status: 0 },
    result: { tag: "succeeded" },
    usage: {
      tag: "available",
      input: { tag: "available", count: 30 },
      cachedInput: { tag: "available", count: 0 },
      cacheWriteInput: { tag: "available", count: 0 },
      output: { tag: "available", count: 4 },
      reasoningOutput: { tag: "available", count: 1 },
    },
  });
  return { entry: parsed, authority };
}

function measurement(
  overrides: Partial<CurrentCompletePathMeasurement> = {},
  executionGitSha: typeof gitSha = gitSha,
  firstCallThrows = false,
): CurrentCompletePathMeasurement {
  const root = rawSwarmTestOutputDirectory("complete-path-test-");
  temporaryDirectories.push(root);
  const invocations = [
    invocation({
      phase: "scenarioGeneration",
      stagePlanReason: stageReason("scenarioGeneration"),
      invocationId: "generation",
    }),
    invocation({
      phase: "scenarioCompositeReview",
      stagePlanReason: stageReason("scenarioCompositeReview"),
      invocationId: "composite-milestone",
      model: "gpt-5.6-luna",
      reasoningEffort: "max",
    }),
    invocation({
      phase: "scenarioCompositeReview",
      stagePlanReason: stageReason("scenarioCompositeReview"),
      invocationId: "composite-final",
      model: "gpt-5.6-luna",
      reasoningEffort: "max",
    }),
    invocation({
      phase: "scenarioSetupNeutralAuthoring",
      stagePlanReason: stageReason("scenarioSetupAuthoring"),
      invocationId: "setup-neutral",
    }),
    invocation({
      phase: "scenarioSetupControllerAuthoring",
      stagePlanReason: stageReason("scenarioSetupAuthoring"),
      invocationId: "setup-controller",
    }),
    invocation({ stagePlanReason: stageReason("player") }),
    invocation({
      phase: "postPlayReview",
      model: "gpt-5.6-luna",
      reasoningEffort: "max",
      stagePlanReason: stageReason("postPlayReview"),
      invocationId: "invocation-2",
      elapsedMilliseconds: 50,
    }),
  ];
  const base = {
    schemaVersion: 4,
    pathId: `same-path-${root}`,
    stagePlan,
    invocations,
    outcome: { tag: "completed" },
    ...overrides,
  };
  const executionInvocations = base.invocations.map((entry) => ({
    ...entry,
    gitSha: executionGitSha,
  }));
  const retainedInvocations = executionInvocations.map((entry) =>
    retainInvocation(root, entry),
  );
  const stagePlanAuthority = writeAuthority(
    root,
    "stage-plan.json",
    `${JSON.stringify(base.stagePlan)}\n`,
  );
  const invocationLedger = writeAuthority(
    root,
    "invocations.jsonl",
    `${retainedInvocations.map(({ entry }) => JSON.stringify(entry)).join("\n")}\n`,
  );
  const findings = findingsProjection(
    root,
    [finding("accepted-call-verdict", 1), finding("successful-correction", 2)],
    retainedInvocations,
    executionGitSha,
    firstCallThrows,
  );
  const findingsAuthority = writeAuthority(
    root,
    "findings.json",
    `${JSON.stringify(findings)}\n`,
  );
  const result = {
    ...base,
    pathId: base.pathId,
    stagePlanAuthority,
    invocationLedgers: [invocationLedger],
    invocations: retainedInvocations.map(({ entry }) => entry),
    invocationEvents: retainedInvocations.map(({ authority }) => authority),
    findingsAuthority,
    findings,
  } satisfies CurrentCompletePathMeasurement;
  return result;
}

function benchmarkMeasurement(
  profile: "documentDeclarationSet" | "boundedCapabilityProjection",
  overrides: Partial<CurrentBenchmarkMeasurement> = {},
  implementationGitSha: typeof gitSha = gitSha,
): CurrentBenchmarkMeasurement {
  const source = measurement({}, implementationGitSha);
  const root = resolve(repoRoot, source.stagePlanAuthority.path, "..");
  const requiredFindingAuthority = (role: string) => {
    const authority = source.findings.authorities.find(
      (candidate) => candidate.role === role,
    );
    if (authority === undefined) {
      throw new Error(`Synthetic ${role} finding authority is missing.`);
    }
    return authority;
  };
  const authorityOnly = ({
    path,
    byteLength,
    sha256,
  }: (typeof source.findings.authorities)[number]) => ({
    path,
    byteLength,
    sha256,
  });
  const scenarioAuthority = authorityOnly(requiredFindingAuthority("scenario"));
  const scenarioReviewAuthority = authorityOnly(
    requiredFindingAuthority("scenarioReview"),
  );
  const scenarioRecord = writeAuthority(
    root,
    "benchmark-scenario-record.json",
    `${JSON.stringify({ schemaVersion: 1, scenarioId })}\n`,
  );
  const stageFacts = writeAuthority(
    root,
    "benchmark-stage-facts.json",
    `${JSON.stringify(source.stagePlan.facts)}\n`,
  );
  const stagePlan = writeAuthority(
    root,
    "benchmark-stage-plan.json",
    `${JSON.stringify(source.stagePlan)}\n`,
  );
  const characters = writeAuthority(root, "characters.json", "{}\n");
  const setup = writeAuthority(root, "setup.json", "{}\n");
  const contextSourceKind =
    profile === "documentDeclarationSet"
      ? ("declarationSet" as const)
      : ("capabilityProjection" as const);
  const contextDeliveryMode =
    profile === "documentDeclarationSet"
      ? ("document" as const)
      : ("roleProjection" as const);
  const declarationBundle =
    profile === "documentDeclarationSet"
      ? historicalDeclarationBundleText()
      : undefined;
  const contextAuthorities = BENCHMARK_CONTEXT_ROLES.map((role) => ({
    role,
    authority: writeAuthority(
      root,
      `context/${role}.md`,
      benchmarkContextForRole(profile, role, declarationBundle),
    ),
  }));
  const contextAuthorityForRole = (
    role: (typeof BENCHMARK_CONTEXT_ROLES)[number],
  ) => {
    const context = contextAuthorities.find(
      (candidate) => candidate.role === role,
    );
    if (context === undefined) {
      throw new Error(`Synthetic ${role} context authority is missing.`);
    }
    return context.authority;
  };
  const contextDocument = {
    schemaVersion: 1,
    profile,
    scenarioId,
    sources: contextAuthorities.map(({ role, authority }) => ({
      role,
      sourceKind: contextSourceKind,
      deliveryMode: contextDeliveryMode,
      authority,
    })),
  };
  const contextSourceManifest = writeAuthority(
    root,
    "benchmark-context-sources.json",
    `${JSON.stringify(contextDocument)}\n`,
  );
  const playerContextAuthority = contextAuthorityForRole("player");
  const postPlayContextAuthority = contextAuthorityForRole("postPlayReview");
  const playerContextDelivery = writeAuthority(
    root,
    "player-context-delivery.json",
    `${JSON.stringify({
      schemaVersion: 1,
      profile,
      role: "player",
      ...playerContextAuthority,
    })}\n`,
  );
  const postPlayContextDelivery = writeAuthority(
    root,
    "post-play-context-delivery.json",
    `${JSON.stringify({
      schemaVersion: 1,
      profile,
      role: "postPlayReview",
      ...postPlayContextAuthority,
    })}\n`,
  );
  const compositeReview =
    profile === "documentDeclarationSet"
      ? historicalCompositeReview()
      : syntheticCompositeReview();
  const benchmarkId =
    profile === "documentDeclarationSet"
      ? "synthetic-document-benchmark"
      : "synthetic-bounded-benchmark";
  const benchmarkEntries = source.invocations
    .filter(
      (entry) =>
        profile === "documentDeclarationSet" ||
        entry.invocationId !== "composite-milestone",
    )
    .map((entry) =>
      profile === "boundedCapabilityProjection"
        ? {
            ...entry,
            ...(entry.phase === "scenarioCompositeReview"
              ? {
                  subject: {
                    tag: "benchmark" as const,
                    benchmarkId,
                    profile,
                    scenarioId,
                  },
                }
              : {}),
            ...(entry.phase === "scenarioCompositeReview" ||
            entry.phase === "postPlayReview"
              ? { reasoningEffort: "medium" as const }
              : {}),
          }
        : entry,
    );
  const readinessResultValue = {
    classification: "ready" as const,
    evidence: "Synthetic readiness review is ready.",
  };
  const canonicalRetained = benchmarkEntries.map((entry) =>
    retainInvocation(root, entry, compositeReview),
  );
  const auxiliaryRetained =
    profile === "documentDeclarationSet"
      ? [
          retainBenchmarkAuxiliaryInvocation(root, {
            responsibility: "scenarioQuality",
            phase: "scenarioReadiness",
            invocationId: "benchmark-readiness",
            implementationGitSha,
            result: readinessResultValue,
          }),
          retainBenchmarkAuxiliaryInvocation(root, {
            responsibility: "redundantCharacterPreparation",
            phase: "scenarioCharacterAuthoring",
            invocationId: "benchmark-character-1",
            implementationGitSha,
          }),
          retainBenchmarkAuxiliaryInvocation(root, {
            responsibility: "redundantCharacterPreparation",
            phase: "scenarioCharacterAuthoring",
            invocationId: "benchmark-character-2",
            implementationGitSha,
          }),
        ]
      : [];
  const generationRetained = canonicalRetained.filter(
    ({ entry }) => entry.phase === "scenarioGeneration",
  );
  const compositeRetained = canonicalRetained.filter(
    ({ entry }) => entry.phase === "scenarioCompositeReview",
  );
  const laterRetained = canonicalRetained.filter(
    ({ entry }) =>
      entry.phase !== "scenarioGeneration" &&
      entry.phase !== "scenarioCompositeReview",
  );
  const requiredComposite = (reviewStage: "milestone" | "final") => {
    const invocationId = `composite-${reviewStage}`;
    const retained = compositeRetained.find(
      ({ entry }) => entry.invocationId === invocationId,
    );
    if (retained === undefined) {
      throw new Error(`Synthetic ${reviewStage} composite review is missing.`);
    }
    return retained;
  };
  const requiredAuxiliary = (invocationId: string) => {
    const retained = auxiliaryRetained.find(
      ({ entry }) => entry.invocationId === invocationId,
    );
    if (retained === undefined) {
      throw new Error(
        `Synthetic auxiliary invocation ${invocationId} is missing.`,
      );
    }
    return retained;
  };
  type ReviewStage = "milestone" | "final";
  const reviewStages: readonly ReviewStage[] =
    profile === "documentDeclarationSet" ? ["milestone", "final"] : ["final"];
  const orderedRetained =
    profile === "documentDeclarationSet"
      ? [
          ...generationRetained,
          requiredComposite("milestone"),
          requiredAuxiliary("benchmark-readiness"),
          requiredComposite("final"),
          requiredAuxiliary("benchmark-character-1"),
          requiredAuxiliary("benchmark-character-2"),
          ...laterRetained,
        ]
      : [...generationRetained, ...compositeRetained, ...laterRetained];
  const benchmarkLedger = writeAuthority(
    root,
    `benchmark-${profile}-invocations.jsonl`,
    `${orderedRetained.map(({ entry }) => JSON.stringify(entry)).join("\n")}\n`,
  );
  const retainedReplayByStage = new Map<
    ReviewStage,
    ReturnType<typeof writeAuthority>
  >();
  for (const reviewStage of reviewStages) {
    const invocationId = `composite-${reviewStage}`;
    const retainedInput =
      profile === "documentDeclarationSet"
        ? {
            schemaVersion: 2 as const,
            phase: "scenarioCompositeReview" as const,
            reviewStage,
            scenarioId,
            sourceGitSha: implementationGitSha,
            invocationId,
            model: "gpt-5.6-luna" as const,
            reasoningEffort:
              requiredComposite(reviewStage).entry.reasoningEffort,
            prompt: `Synthetic ${reviewStage} review prompt.`,
            outputJsonSchema: codexOutputJsonSchema(
              HistoricalScenarioCompositeReviewSchema,
            ),
            result: compositeReview,
          }
        : {
            schemaVersion: 3 as const,
            phase: "scenarioCompositeReview" as const,
            reviewStage,
            sourceGitSha: implementationGitSha,
            invocationId,
            model: "gpt-5.6-luna" as const,
            reasoningEffort:
              requiredComposite(reviewStage).entry.reasoningEffort,
            prompt: `Synthetic ${reviewStage} review prompt.`,
            outputJsonSchema: codexOutputJsonSchema(
              CurrentScenarioCompositeReviewSchema,
            ),
            result: compositeReview,
            subject: {
              tag: "benchmark" as const,
              benchmarkId,
              profile,
              scenarioId,
            },
          };
    retainedReplayByStage.set(
      reviewStage,
      writeAuthority(
        root,
        `benchmark-${profile}-pre-play-${reviewStage}.json`,
        `${JSON.stringify(retainedInput)}\n`,
      ),
    );
  }
  const retainedReviewEvents = new Map<
    ReviewStage,
    ReturnType<typeof writeAuthority>
  >();
  for (const reviewStage of reviewStages) {
    const retained = requiredComposite(reviewStage);
    retainedReviewEvents.set(reviewStage, retained.authority);
  }
  const reviewEventFor = (reviewStage: "milestone" | "final") => {
    const authority = retainedReviewEvents.get(reviewStage);
    if (authority === undefined) {
      throw new Error(`Synthetic ${reviewStage} review event is missing.`);
    }
    return authority;
  };
  const replayFor = (reviewStage: "milestone" | "final") => {
    const authority = retainedReplayByStage.get(reviewStage);
    if (authority === undefined) {
      throw new Error(`Synthetic ${reviewStage} replay is missing.`);
    }
    return authority;
  };
  const benchmarkFindings = {
    ...source.findings,
    authorities: [
      ...source.findings.authorities.flatMap((authority) => {
        if (authority.role === "replay-milestone") {
          return profile === "documentDeclarationSet"
            ? [{ role: authority.role, ...replayFor("milestone") }]
            : [];
        }
        if (authority.role === "replay-final") {
          return [{ role: authority.role, ...replayFor("final") }];
        }
        if (authority.role === "prePlayReviewReplayEvents-milestone") {
          return profile === "documentDeclarationSet"
            ? [{ role: authority.role, ...reviewEventFor("milestone") }]
            : [];
        }
        if (authority.role === "prePlayReviewReplayEvents-final") {
          return [
            {
              role: authority.role,
              ...reviewEventFor("final"),
            },
          ];
        }
        return [authority];
      }),
      {
        role: "playerContextDelivery",
        ...playerContextDelivery,
      },
      {
        role: "postPlayReviewContextDelivery",
        ...postPlayContextDelivery,
      },
      ...(profile === "documentDeclarationSet"
        ? (() => {
            const readinessInvocation = requiredAuxiliary(
              "benchmark-readiness",
            ).entry;
            const readinessResult = writeAuthority(
              root,
              "benchmark-readiness-result.json",
              `${JSON.stringify(readinessResultValue)}\n`,
            );
            const readinessSource = writeAuthority(
              root,
              "benchmark-readiness-source.json",
              `${JSON.stringify({
                schemaVersion: 1 as const,
                profile: "documentDeclarationSet" as const,
                scenarioId,
                responsibility: "scenarioQuality" as const,
                phase: "scenarioReadiness" as const,
                sourceGitSha: implementationGitSha,
                invocationId: readinessInvocation.invocationId,
                model: readinessInvocation.model,
                reasoningEffort: readinessInvocation.reasoningEffort,
                prompt: "Synthetic historical readiness prompt.",
                outputJsonSchema: codexOutputJsonSchema(
                  ScenarioQualityReviewSchema,
                ),
                result: readinessResultValue,
              })}\n`,
            );
            return [
              {
                role: "prePlayReviewReadinessSource",
                ...readinessSource,
              },
              {
                role: "prePlayReviewReadinessResult",
                ...readinessResult,
              },
              {
                role: "prePlayReviewReadinessEvents",
                ...requiredAuxiliary("benchmark-readiness").authority,
              },
            ];
          })()
        : []),
    ],
  };
  const measurementFindings = overrides.findings ?? benchmarkFindings;
  const findingsAuthority = writeAuthority(
    root,
    "benchmark-findings.json",
    `${JSON.stringify(measurementFindings)}\n`,
  );
  return {
    schemaVersion: 5,
    pathId: `benchmark-${profile}-${root}`,
    profile,
    scenarioId,
    executionId: "synthetic-complete-path-execution",
    evidenceSetId: "synthetic-complete-path-evidence",
    implementationGitSha,
    scenarioBundle: {
      scenario: scenarioAuthority,
      scenarioRecord,
      scenarioReview: scenarioReviewAuthority,
      stageFacts,
      stagePlan,
      characters,
      setup,
    },
    contextSourceManifest,
    stagePlan: source.stagePlan,
    invocations: orderedRetained.map(({ entry }) => entry),
    invocationLedgers: [benchmarkLedger],
    invocationEvents: orderedRetained.map(({ authority }) => authority),
    findingsAuthority,
    findings: measurementFindings,
    outcome: source.outcome,
    ...overrides,
  };
}

let retainedFindingsSequence = 0;

function withRetainedFindings(
  measurement: CurrentCompletePathMeasurement,
  findings: CurrentCompletePathMeasurement["findings"],
): CurrentCompletePathMeasurement;
function withRetainedFindings(
  measurement: CurrentBenchmarkMeasurement,
  findings: CurrentCompletePathMeasurement["findings"],
): CurrentBenchmarkMeasurement;
function withRetainedFindings(
  measurement: CurrentCompletePathMeasurement | CurrentBenchmarkMeasurement,
  findings: CurrentCompletePathMeasurement["findings"],
): CurrentCompletePathMeasurement | CurrentBenchmarkMeasurement {
  retainedFindingsSequence += 1;
  const root = resolve(repoRoot, measurement.findingsAuthority.path, "..");
  const findingsAuthority = writeAuthority(
    root,
    `findings-override-${String(retainedFindingsSequence)}.json`,
    `${JSON.stringify(findings)}\n`,
  );
  return { ...measurement, findingsAuthority, findings };
}

function validated(
  value: CompletePathMeasurement,
): ValidatedCompletePathMeasurement {
  const result = validateCompletePathMeasurement(value);
  if (Either.isLeft(result)) throw new Error(result.left);
  return result.right;
}

describe("complete Raw Swarm path comparison", () => {
  test("allows generation and composite review interleaving within pre-play admission, but rejects a later-stage reversal", () => {
    const source = measurement();
    const root = resolve(repoRoot, source.stagePlanAuthority.path, "..");
    const generationFollowup = invocation({
      phase: "scenarioGeneration",
      stagePlanReason: stageReason("scenarioGeneration"),
      invocationId: "generation-followup",
    });
    const retainOrdered = (ordered: readonly CurrentInvocation[]) => {
      const retained = ordered.map((entry) => retainInvocation(root, entry));
      const ledger = writeAuthority(
        root,
        "ordered-invocations.jsonl",
        `${retained.map(({ entry }) => JSON.stringify(entry)).join("\n")}\n`,
      );
      return {
        ...source,
        invocations: retained.map(({ entry }) => entry),
        invocationLedgers: [ledger],
        invocationEvents: retained.map(({ authority }) => authority),
      };
    };

    const interleaved = retainOrdered([
      source.invocations[0]!,
      source.invocations[1]!,
      generationFollowup,
      ...source.invocations.slice(2),
    ]);
    expect(validateCompletePathMeasurement(interleaved)).toEqual(
      expect.objectContaining({ _tag: "Right" }),
    );

    const afterFinalReview = retainOrdered([
      ...source.invocations.slice(0, 3),
      generationFollowup,
      ...source.invocations.slice(3),
    ]);
    const finalReviewValidation =
      validateCompletePathMeasurement(afterFinalReview);
    expect(Either.isLeft(finalReviewValidation)).toBe(true);
    if (Either.isRight(finalReviewValidation)) return;
    expect(finalReviewValidation.left).toContain(
      "follow the retained final review",
    );

    const reversed = retainOrdered([
      ...source.invocations.slice(0, 5),
      generationFollowup,
      ...source.invocations.slice(5),
    ]);
    const validation = validateCompletePathMeasurement(reversed);
    expect(Either.isLeft(validation)).toBe(true);
    if (Either.isRight(validation)) return;
    expect(validation.left).toContain("out of order");
  });

  test("recognizes the hyphenated pre-play replay authority role", () => {
    const source = measurement();
    const findings = {
      ...source.findings,
      authorities: source.findings.authorities.map((authority) =>
        authority.role === "replay-milestone"
          ? { ...authority, role: "prePlayReviewReplayInput-milestone" }
          : authority.role === "replay-final"
            ? { ...authority, role: "prePlayReviewReplayInput-final" }
            : authority,
      ),
    };
    expect(
      validateCompletePathMeasurement(withRetainedFindings(source, findings)),
    ).toEqual(expect.objectContaining({ _tag: "Right" }));
  });

  test("compares consolidated implementations when outcome and evidence semantics match", () => {
    const baseline = measurement({
      invocations: measurement().invocations.map((entry) => ({
        ...entry,
        model: entry.phase === "player" ? "gpt-5.6-luna" : entry.model,
        elapsedMilliseconds: entry.elapsedMilliseconds + 100,
      })),
      outcome: { tag: "completed" },
    });
    const candidate = measurement({
      invocations: measurement().invocations.map((entry) => ({
        ...entry,
        elapsedMilliseconds: entry.elapsedMilliseconds / 2,
      })),
    });
    const comparison = compareCompleteEquivalentPaths({
      baseline: validated(baseline),
      candidate: validated(candidate),
    });
    expect(comparison).toMatchObject({
      identity: "equivalent-path",
      equivalence: { tag: "equivalent" },
      baseline: {
        outcome: { tag: "completed" },
        sdkCallCount: { tag: "available", count: 2 },
        corrections: { tag: "available", count: 1 },
        failedStages: { tag: "available", count: 0 },
      },
      candidate: {
        outcome: { tag: "completed" },
        corrections: { tag: "available", count: 1 },
        failedStages: { tag: "available", count: 0 },
      },
      implementation: {
        phaseSequenceChanged: false,
        modelSequenceChanged: true,
        reasoningEffortSequenceChanged: false,
      },
      modelInvocationElapsedMilliseconds: { tag: "comparable" },
      inputTokens: { tag: "comparable" },
    });
  });

  test("binds benchmark equivalence to an immutable scenario bundle and exposes profiles", () => {
    const baseline = benchmarkMeasurement("documentDeclarationSet");
    const candidate = benchmarkMeasurement("boundedCapabilityProjection", {
      pathId: "candidate-benchmark",
      scenarioBundle: baseline.scenarioBundle,
      stagePlan: baseline.stagePlan,
    });
    expect(
      baseline.invocations.filter(
        (entry) => entry.phase === "scenarioCompositeReview",
      ),
    ).toHaveLength(2);
    expect(
      candidate.invocations.filter(
        (entry) => entry.phase === "scenarioCompositeReview",
      ),
    ).toHaveLength(1);
    expect(
      candidate.findings.authorities.some(
        ({ role }) =>
          role === "replay-milestone" ||
          role === "prePlayReviewReplayEvents-milestone",
      ),
    ).toBe(false);
    const comparison = compareCompleteEquivalentPaths({
      baseline: validated(baseline),
      candidate: validated(candidate),
    });
    expect(comparison).toMatchObject({
      identity: "equivalent-path",
      equivalence: { tag: "equivalent" },
      implementation: {
        baselineProfile: "documentDeclarationSet",
        candidateProfile: "boundedCapabilityProjection",
        reasoningEffortSequenceChanged: true,
      },
    });
    expect(comparison.implementation.baselineReasoningEfforts).toContain("max");
    expect(comparison.implementation.candidateReasoningEfforts).toSatisfy(
      (efforts: readonly string[]) =>
        efforts.length > 0 && efforts.every((effort) => effort === "medium"),
    );

    const wrongEffortCandidate = {
      ...candidate,
      invocations: candidate.invocations.map((invocation) =>
        invocation.schemaVersion === 4 &&
        invocation.phase === "scenarioCompositeReview"
          ? { ...invocation, reasoningEffort: "max" }
          : invocation,
      ),
    };
    expect(validateCompletePathMeasurement(wrongEffortCandidate)).toMatchObject(
      {
        _tag: "Left",
        left: expect.stringContaining(
          "boundedCapabilityProjection benchmark scenarioCompositeReview invocation must use medium reasoning",
        ),
      },
    );

    const malformedBundle = {
      ...candidate,
      scenarioBundle: {
        ...candidate.scenarioBundle,
        setup: {
          ...candidate.scenarioBundle.setup,
          sha256: "f".repeat(64),
        },
      },
    };
    expect(validateCompletePathMeasurement(malformedBundle)).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("setup authority"),
    });
  }, 120_000);

  test("rejects a historical benchmark Candidate from a foreign Campaign, Evidence Set, or planned Scenario", () => {
    const source = benchmarkMeasurement("documentDeclarationSet");
    const candidateIndex = source.invocations.findIndex(
      ({ invocationId }) => invocationId === "composite-final",
    );
    const candidate = source.invocations[candidateIndex];
    const eventAuthority = source.invocationEvents[candidateIndex];
    if (
      candidate === undefined ||
      eventAuthority === undefined ||
      candidate.schemaVersion !== 4 ||
      candidate.phase !== "scenarioCompositeReview" ||
      candidate.subject.tag !== "scenarioCandidate"
    ) {
      throw new Error("Synthetic historical Candidate evidence is incomplete.");
    }
    const root = resolve(repoRoot, source.invocationLedgers[0]!.path, "..");
    const foreignSubject = {
      ...candidate.subject,
      campaignId:
        "foreign-benchmark-campaign" as typeof candidate.subject.campaignId,
      evidenceSetId:
        "foreign-benchmark-evidence" as typeof candidate.subject.evidenceSetId,
      plannedScenarioId:
        "foreign-benchmark-scenario" as typeof candidate.subject.plannedScenarioId,
    };
    const foreignEvents = readFileSync(
      resolve(repoRoot, eventAuthority.path),
      "utf8",
    )
      .trim()
      .split("\n")
      .map(parseJsonRecord)
      .map((event, index) =>
        index === 0 ? { ...event, subject: foreignSubject } : event,
      );
    const foreignEventAuthority = writeAuthority(
      root,
      "events/foreign-composite-final.jsonl",
      `${foreignEvents.map((event) => JSON.stringify(event)).join("\n")}\n`,
    );
    const foreignCandidate = {
      ...candidate,
      subject: foreignSubject,
      eventsSha256: foreignEventAuthority.sha256,
    };
    const foreignInvocations = source.invocations.map((invocation, index) =>
      index === candidateIndex ? foreignCandidate : invocation,
    );
    const foreignLedgerAuthority = writeAuthority(
      root,
      "foreign-benchmark-invocations.jsonl",
      `${foreignInvocations.map((invocation) => JSON.stringify(invocation)).join("\n")}\n`,
    );
    const foreignFindings = {
      ...source.findings,
      authorities: source.findings.authorities.map((authority) =>
        authority.role === "prePlayReviewReplayEvents-final"
          ? { role: authority.role, ...foreignEventAuthority }
          : authority,
      ),
    };
    const foreignFindingsAuthority = writeAuthority(
      root,
      "foreign-benchmark-findings.json",
      `${JSON.stringify(foreignFindings)}\n`,
    );
    const validation = validateCompletePathMeasurement({
      ...source,
      invocations: foreignInvocations,
      invocationLedgers: [foreignLedgerAuthority],
      invocationEvents: source.invocationEvents.map((authority, index) =>
        index === candidateIndex ? foreignEventAuthority : authority,
      ),
      findings: foreignFindings,
      findingsAuthority: foreignFindingsAuthority,
    });
    expect(Either.isLeft(validation)).toBe(true);
    if (Either.isRight(validation)) return;
    expect(validation.left).toMatch(
      /Campaign, Evidence Set|admitted Scenario source hash/,
    );
  }, 120_000);

  test("retains player obstruction evidence, rejects zero-call conclusion, and blocks comparison", () => {
    const obstructed = benchmarkMeasurement("boundedCapabilityProjection");
    const frozenPrefix = obstructed.findings.authorities.find(
      ({ role }) => role === "frozenPrefix",
    );
    expect(frozenPrefix).toBeDefined();
    if (frozenPrefix === undefined) return;
    const root = resolve(repoRoot, frozenPrefix.path, "..", "..");
    const originalFrozenPrefix = parseJsonRecord(
      readFileSync(resolve(repoRoot, frozenPrefix.path), "utf8"),
    );
    const obstructionAuthority = writeAuthority(
      root,
      "evidence/frozen-prefix-obstructed.json",
      `${JSON.stringify({
        frozenByteLength: originalFrozenPrefix.frozenByteLength,
        frozenSha256: originalFrozenPrefix.frozenSha256,
        continuationCount: originalFrozenPrefix.continuationCount,
        run: {
          kind: "playerObstructed",
          obstruction: {
            kind: "continuationLimit",
            limit: 128,
            message: "Synthetic player protocol obstruction.",
          },
        },
      })}\n`,
    );
    const retainedObstruction = withRetainedFindings(
      {
        ...obstructed,
        outcome: {
          tag: "failed" as const,
          reason: "Synthetic player protocol obstruction.",
        },
      },
      {
        ...obstructed.findings,
        authorities: obstructed.findings.authorities.map((authority) =>
          authority.role === "frozenPrefix"
            ? { role: authority.role, ...obstructionAuthority }
            : authority,
        ),
      },
    );
    const staleFinalValidation =
      validateCompletePathMeasurement(retainedObstruction);
    expect(staleFinalValidation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining(
        "terminal state and final artifact disagree",
      ),
    });
    const finalAuthority = obstructed.findings.authorities.find(
      ({ role }) => role === "final",
    );
    expect(finalAuthority).toBeDefined();
    if (finalAuthority === undefined) return;
    const validatedCompletedCandidate = validated(obstructed);
    rmSync(resolve(repoRoot, finalAuthority.path), { force: true });
    const obstructionWithoutStaleFinal = withRetainedFindings(
      retainedObstruction,
      {
        ...retainedObstruction.findings,
        authorities: retainedObstruction.findings.authorities.filter(
          ({ role }) => role !== "final",
        ),
      },
    );
    const validatedObstruction = validateCompletePathMeasurement(
      obstructionWithoutStaleFinal,
    );
    expect(validatedObstruction).toMatchObject({ _tag: "Right" });
    if (Either.isLeft(validatedObstruction)) return;
    const missingPlayerContext = validateCompletePathMeasurement(
      withRetainedFindings(obstructionWithoutStaleFinal, {
        ...obstructionWithoutStaleFinal.findings,
        authorities: obstructionWithoutStaleFinal.findings.authorities.filter(
          ({ role }) => role !== "playerContextDelivery",
        ),
      }),
    );
    expect(missingPlayerContext).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining(
        "no retained player context-delivery authority",
      ),
    });
    const missingPostPlayContext = validateCompletePathMeasurement(
      withRetainedFindings(obstructionWithoutStaleFinal, {
        ...obstructionWithoutStaleFinal.findings,
        authorities: obstructionWithoutStaleFinal.findings.authorities.filter(
          ({ role }) => role !== "postPlayReviewContextDelivery",
        ),
      }),
    );
    expect(missingPostPlayContext).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining(
        "no retained postPlayReview context-delivery authority",
      ),
    });
    const comparison = compareCompleteEquivalentPaths({
      baseline: validatedObstruction.right,
      candidate: validatedCompletedCandidate,
    });
    expect(comparison.identity).toBe("different-path");
    expect(comparison.equivalence.reason).toContain("failed");

    const transcript = obstructed.findings.authorities.find(
      ({ role }) => role === "transcript",
    );
    expect(transcript).toBeDefined();
    if (transcript === undefined) return;
    const noCallRoot = rawSwarmTestOutputDirectory("benchmark-no-call-");
    temporaryDirectories.push(noCallRoot);
    const header = readFileSync(
      resolve(repoRoot, transcript.path),
      "utf8",
    ).split("\n")[0];
    const noCallTranscript = writeAuthority(
      noCallRoot,
      "no-call-transcript.jsonl",
      `${header}\n`,
    );
    const noCallProgram = writeAuthority(
      noCallRoot,
      "program.ts",
      'import type { PlayerContinuation } from "@dnd/player-sdk";\n',
    );
    const noCallFrozenPrefix = writeAuthority(
      noCallRoot,
      "no-call-frozen-prefix.json",
      `${JSON.stringify({
        frozenByteLength: noCallProgram.byteLength,
        frozenSha256: noCallProgram.sha256,
        continuationCount: 0,
        run: {
          kind: "playerConcluded",
          conclusion: "Synthetic conclusion without a call.",
        },
      })}\n`,
    );
    const noCallObservations = writeAuthority(
      noCallRoot,
      "no-call-observations.jsonl",
      "",
    );
    const noCallFinal = writeAuthority(
      noCallRoot,
      "no-call-final.json",
      "{}\n",
    );
    const replaySupervisor = obstructed.findings.authorities.find(
      ({ role }) => role === "replaySupervisor",
    );
    expect(replaySupervisor).toBeDefined();
    if (replaySupervisor === undefined) return;
    const noCallReview = writeAuthority(
      noCallRoot,
      "no-call-review.json",
      `${JSON.stringify({
        scenarioId,
        gitSha,
        transcriptSha256: noCallTranscript.sha256,
        reviewer: "synthetic-reviewer",
        verdicts: [
          {
            class: "pass" as const,
            claim: "The synthetic path is reviewable.",
            evidence: "The synthetic transcript is retained.",
          },
        ],
      })}\n`,
    );
    const noCallReplayResult = writeAuthority(
      noCallRoot,
      "no-call-replay-result.json",
      `${JSON.stringify({
        type: "raw-swarm-sdk-replay-result",
        schemaVersion: 1,
        scenarioId,
        transcriptSha256: noCallTranscript.sha256,
        replaySupervisorSha256: replaySupervisor.sha256,
        matchedCallCount: 0,
        status: "succeeded",
      })}\n`,
    );
    const noCallOutcome = deriveBenchmarkPathOutcome({
      transcriptPath: noCallTranscript.path,
      frozenPrefixPath: noCallFrozenPrefix.path,
      continuationObservationPath: noCallObservations.path,
      finalArtifactPath: noCallFinal.path,
    });
    expect(Either.isRight(noCallOutcome)).toBe(true);
    if (Either.isLeft(noCallOutcome)) return;
    expect(noCallOutcome.right).toEqual({
      tag: "failed",
      reason:
        "Player terminal evidence claims playerConcluded without an SDK call.",
    });

    const noCallSubject = {
      ...obstructed.findings.subject,
      sdkCalls: {
        tag: "retainedTranscript" as const,
        callCount: 0,
        transcriptSha256: noCallTranscript.sha256,
      },
    };
    const noCallFindings = {
      ...obstructed.findings,
      subject: noCallSubject,
      subjectIdentity: sha256Canonical(noCallSubject),
      authorities: obstructed.findings.authorities.flatMap((authority) => {
        if (authority.role === "review-1") {
          return [{ role: authority.role, ...noCallReview }];
        }
        if (authority.role === "replayResult") {
          return [{ role: authority.role, ...noCallReplayResult }];
        }
        if (authority.role === "transcript") {
          return [{ role: authority.role, ...noCallTranscript }];
        }
        if (authority.role === "frozenPrefix") {
          return [{ role: authority.role, ...noCallFrozenPrefix }];
        }
        if (authority.role === "observations") {
          return [{ role: authority.role, ...noCallObservations }];
        }
        if (authority.role === "final") {
          return [{ role: authority.role, ...noCallFinal }];
        }
        return [authority];
      }),
      findings: obstructed.findings.findings.filter(
        ({ pointer }) => pointer.kind !== "sdkSequence",
      ),
    };
    const noCallMeasurement = withRetainedFindings(
      { ...obstructed, outcome: noCallOutcome.right },
      noCallFindings,
    );
    const validatedNoCall = validateCompletePathMeasurement(noCallMeasurement);
    expect(validatedNoCall).toMatchObject({ _tag: "Right" });
    if (Either.isLeft(validatedNoCall)) return;
    const noCallComparison = compareCompleteEquivalentPaths({
      baseline: validatedNoCall.right,
      candidate: validatedCompletedCandidate,
    });
    expect(noCallComparison.identity).toBe("different-path");
    expect(noCallComparison.equivalence.reason).toContain(
      "no retained SDK call",
    );
  }, 60_000);

  test("rejects a forged completion whose final artifact is not canonical terminal evidence", () => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    const finalAuthority = benchmark.findings.authorities.find(
      ({ role }) => role === "final",
    );
    expect(finalAuthority).toBeDefined();
    if (finalAuthority === undefined) return;
    const forgedFinal = replaceJsonAuthority(finalAuthority, {
      tag: "syntheticFinal",
    });
    const validation = validateCompletePathMeasurement({
      ...benchmark,
      findings: {
        ...benchmark.findings,
        authorities: benchmark.findings.authorities.map((authority) =>
          authority.role === "final"
            ? { role: authority.role, ...forgedFinal }
            : authority,
        ),
      },
    });
    expect(validation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("final player artifact is invalid"),
    });
  }, 60_000);

  test("rejects a gap in contiguous player continuation observations", () => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    const observationsAuthority = benchmark.findings.authorities.find(
      ({ role }) => role === "observations",
    );
    expect(observationsAuthority).toBeDefined();
    if (observationsAuthority === undefined) return;
    const root = resolve(repoRoot, observationsAuthority.path, "..", "..");
    const observations = readFileSync(
      resolve(repoRoot, observationsAuthority.path),
      "utf8",
    )
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const gapObservations = observations.map((observation, index) =>
      index === 1 ? { ...observation, continuation: 3 } : observation,
    );
    const gapAuthority = writeAuthority(
      root,
      "evidence/gap-observations.jsonl",
      `${gapObservations.map((observation) => JSON.stringify(observation)).join("\n")}\n`,
    );
    const validation = validateCompletePathMeasurement({
      ...benchmark,
      findings: {
        ...benchmark.findings,
        authorities: benchmark.findings.authorities.map((authority) =>
          authority.role === "observations"
            ? { role: authority.role, ...gapAuthority }
            : authority,
        ),
      },
    });
    expect(validation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("continuation evidence is invalid"),
    });
  }, 60_000);

  test("rejects an internally valid benchmark pair from mixed implementation revisions", () => {
    const baseline = benchmarkMeasurement("documentDeclarationSet");
    const candidate = benchmarkMeasurement(
      "boundedCapabilityProjection",
      {
        pathId: "mixed-revision-candidate-benchmark",
        scenarioBundle: baseline.scenarioBundle,
        stagePlan: baseline.stagePlan,
      },
      alternateGitSha,
    );
    expect(validateCompletePathMeasurement(candidate)).toMatchObject({
      _tag: "Right",
    });
    const comparison = compareCompleteEquivalentPaths({
      baseline: validated(baseline),
      candidate: validated(candidate),
    });
    expect(comparison).toMatchObject({
      identity: "different-path",
      equivalence: {
        tag: "incomparable",
        reason: expect.stringContaining("implementation revisions differ"),
      },
      modelInvocationElapsedMilliseconds: { tag: "incomparable" },
      inputTokens: { tag: "incomparable" },
    });
  }, 60_000);

  test("uses semantic review and finding identity instead of reviewer prose", () => {
    const baseline = benchmarkMeasurement("documentDeclarationSet");
    const candidate = benchmarkMeasurement("boundedCapabilityProjection", {
      pathId: "semantic-candidate-benchmark",
      scenarioBundle: baseline.scenarioBundle,
      stagePlan: baseline.stagePlan,
    });
    const postPlay = candidate.findings.authorities.find(
      ({ role }) => role === "review-1",
    );
    expect(postPlay).toBeDefined();
    if (postPlay === undefined) return;
    const postPlayValue = parseJsonRecord(
      readFileSync(resolve(repoRoot, postPlay.path), "utf8"),
    );
    if (!Array.isArray(postPlayValue.verdicts)) return;
    const rewrittenPostPlay = replaceJsonAuthority(postPlay, {
      ...postPlayValue,
      reviewer: "independent-reviewer",
      verdicts: postPlayValue.verdicts.map((verdict) =>
        isJsonRecord(verdict)
          ? {
              ...verdict,
              claim: "Independent wording for the same semantic verdict.",
              evidence: "Independent wording for the same retained evidence.",
            }
          : verdict,
      ),
    });
    const findings = candidate.findings.findings.map((original, index) => {
      const summary = `Independent finding wording ${String(index)}.`;
      const detail = "Independent detail for the same semantic finding.";
      const identity = {
        stage: original.stage,
        category: original.category,
        kind: original.kind,
        summary,
        detail,
        pointer: original.pointer,
        ...(original.fingerprint === undefined
          ? {}
          : { fingerprint: original.fingerprint }),
      };
      return {
        ...original,
        findingId: sha256Canonical(identity),
        summary,
        detail,
      };
    });
    const candidateWithIndependentWording = withRetainedFindings(candidate, {
      ...candidate.findings,
      authorities: candidate.findings.authorities.map((authority) =>
        authority.role === postPlay.role ? rewrittenPostPlay : authority,
      ),
      findings,
    });
    const comparison = compareCompleteEquivalentPaths({
      baseline: validated(baseline),
      candidate: validated(candidateWithIndependentWording),
    });
    expect(comparison).toMatchObject({
      identity: "equivalent-path",
      equivalence: { tag: "equivalent" },
    });

    const firstVerdict = postPlayValue.verdicts[0];
    if (!isJsonRecord(firstVerdict)) return;
    const postPlayWithAdditionalPass = replaceJsonAuthority(postPlay, {
      ...postPlayValue,
      verdicts: [
        ...postPlayValue.verdicts,
        {
          ...firstVerdict,
          claim: "An additional pass row over the same retained semantics.",
          evidence: "Reviewer row count is not a semantic outcome.",
        },
      ],
    });
    const candidateWithAdditionalPass = withRetainedFindings(candidate, {
      ...candidate.findings,
      authorities: candidate.findings.authorities.map((authority) =>
        authority.role === postPlay.role
          ? postPlayWithAdditionalPass
          : authority,
      ),
    });
    expect(
      compareCompleteEquivalentPaths({
        baseline: validated(baseline),
        candidate: validated(candidateWithAdditionalPass),
      }),
    ).toMatchObject({
      identity: "equivalent-path",
      equivalence: { tag: "equivalent" },
    });

    const postPlayWithReviewerError = replaceJsonAuthority(postPlay, {
      ...postPlayValue,
      verdicts: [
        ...postPlayValue.verdicts,
        {
          class: "reviewer-error",
          claim: "Synthetic reviewer error remains a distinct semantic class.",
          evidence: "Distinct verdict classes must remain comparison evidence.",
        },
      ],
    });
    const candidateWithReviewerError = withRetainedFindings(candidate, {
      ...candidate.findings,
      authorities: candidate.findings.authorities.map((authority) =>
        authority.role === postPlay.role
          ? postPlayWithReviewerError
          : authority,
      ),
    });
    expect(
      compareCompleteEquivalentPaths({
        baseline: validated(baseline),
        candidate: validated(candidateWithReviewerError),
      }),
    ).toMatchObject({
      identity: "different-path",
      equivalence: { tag: "incomparable" },
    });
  }, 60_000);

  test("compares retained reliability observations without equating actionable issue fingerprints", () => {
    const baseline = benchmarkMeasurement("documentDeclarationSet");
    const candidate = benchmarkMeasurement("boundedCapabilityProjection", {
      pathId: "reliability-observation-candidate-benchmark",
      scenarioBundle: baseline.scenarioBundle,
      stagePlan: baseline.stagePlan,
    });
    const accepted = candidate.findings.findings.find(
      ({ kind }) => kind === "accepted-call-verdict",
    )!;
    if (accepted.pointer.kind !== "sdkSequence") {
      throw new Error("Expected the benchmark accepted-call SDK pointer.");
    }
    const pointerDriftIdentity = {
      stage: accepted.stage,
      category: accepted.category,
      kind: accepted.kind,
      summary: accepted.summary,
      ...(accepted.detail === undefined ? {} : { detail: accepted.detail }),
      pointer: { ...accepted.pointer, sequence: 2 },
    };
    const candidateWithPointerDrift = withRetainedFindings(candidate, {
      ...candidate.findings,
      findings: candidate.findings.findings.map((original) =>
        original === accepted
          ? {
              ...pointerDriftIdentity,
              findingId: sha256Canonical(pointerDriftIdentity),
            }
          : original,
      ),
    });
    expect(
      compareCompleteEquivalentPaths({
        baseline: validated(baseline),
        candidate: validated(candidateWithPointerDrift),
      }),
    ).toMatchObject({
      identity: "equivalent-path",
      equivalence: { tag: "equivalent" },
    });

    const candidateWithoutCorrection = withRetainedFindings(candidate, {
      ...candidate.findings,
      findings: candidate.findings.findings.filter(
        ({ kind }) => kind !== "successful-correction",
      ),
    });
    const reliabilityComparison = compareCompleteEquivalentPaths({
      baseline: validated(baseline),
      candidate: validated(candidateWithoutCorrection),
    });
    expect(reliabilityComparison).toMatchObject({
      identity: "equivalent-path",
      equivalence: { tag: "equivalent" },
      baseline: { corrections: { tag: "available", count: 1 } },
      candidate: { corrections: { tag: "available", count: 0 } },
    });

    const correction = candidate.findings.findings.find(
      ({ kind }) => kind === "successful-correction",
    )!;
    for (const kind of ["malformed-submission", "sdk-call-failure"] as const) {
      const worseReliabilityIdentity = {
        stage: correction.stage,
        category: correction.category,
        kind,
        summary: `Synthetic additional candidate ${kind}.`,
        pointer: correction.pointer,
      };
      const candidateWithWorseReliability = withRetainedFindings(candidate, {
        ...candidate.findings,
        findings: candidate.findings.findings.map((original) =>
          original === correction
            ? {
                ...worseReliabilityIdentity,
                findingId: sha256Canonical(worseReliabilityIdentity),
              }
            : original,
        ),
      });
      const worseReliabilityComparison = compareCompleteEquivalentPaths({
        baseline: validated(baseline),
        candidate: validated(candidateWithWorseReliability),
      });
      expect(worseReliabilityComparison).toMatchObject({
        identity: "different-path",
        equivalence: {
          tag: "incomparable",
          reason: expect.stringContaining("worse player failures"),
        },
      });
    }

    const additionalAcceptedIdentity = {
      ...accepted,
      summary: "Synthetic additional accepted-call verdict.",
    };
    const baselineWithAdditionalAccepted = withRetainedFindings(baseline, {
      ...baseline.findings,
      findings: [
        ...baseline.findings.findings,
        {
          ...additionalAcceptedIdentity,
          findingId: sha256Canonical({
            stage: additionalAcceptedIdentity.stage,
            category: additionalAcceptedIdentity.category,
            kind: additionalAcceptedIdentity.kind,
            summary: additionalAcceptedIdentity.summary,
            ...(additionalAcceptedIdentity.detail === undefined
              ? {}
              : { detail: additionalAcceptedIdentity.detail }),
            pointer: additionalAcceptedIdentity.pointer,
            ...(additionalAcceptedIdentity.fingerprint === undefined
              ? {}
              : { fingerprint: additionalAcceptedIdentity.fingerprint }),
          }),
        },
      ],
    });
    const reviewerVerbosityComparison = compareCompleteEquivalentPaths({
      baseline: validated(baselineWithAdditionalAccepted),
      candidate: validated(candidate),
    });
    expect(reviewerVerbosityComparison).toMatchObject({
      identity: "equivalent-path",
      equivalence: { tag: "equivalent" },
      baseline: { sdkCallCount: { tag: "available", count: 2 } },
      candidate: { sdkCallCount: { tag: "available", count: 2 } },
    });

    const candidateWithoutAcceptedVerdictRows = withRetainedFindings(
      candidate,
      {
        ...candidate.findings,
        findings: candidate.findings.findings.filter(
          ({ kind }) => kind !== "accepted-call-verdict",
        ),
      },
    );
    expect(
      compareCompleteEquivalentPaths({
        baseline: validated(candidate),
        candidate: validated(candidateWithoutAcceptedVerdictRows),
      }),
    ).toMatchObject({
      identity: "equivalent-path",
      equivalence: { tag: "equivalent" },
      baseline: { sdkCallCount: { tag: "available", count: 2 } },
      candidate: { sdkCallCount: { tag: "available", count: 2 } },
    });

    const failedOutcome = {
      tag: "failed" as const,
      reason: "Synthetic retained model-stage failure.",
    };
    const failedStageBaseline = measurement({ outcome: failedOutcome });
    const failedStageCandidate = measurement({
      outcome: failedOutcome,
      invocations: measurement().invocations.map((entry) =>
        entry.phase === "player"
          ? {
              ...entry,
              exit: { tag: "exited" as const, status: 1 },
              result: {
                tag: "failed" as const,
                reason: "Synthetic retained model-stage failure.",
              },
            }
          : entry,
      ),
    });
    const failedStageComparison = compareCompleteEquivalentPaths({
      baseline: validated(failedStageBaseline),
      candidate: validated(failedStageCandidate),
    });
    expect(failedStageComparison).toMatchObject({
      identity: "different-path",
      equivalence: {
        tag: "incomparable",
        reason: expect.stringContaining("worse failed model stages"),
      },
    });

    const original = candidateWithoutCorrection.findings.findings[0]!;
    const fingerprint = "f".repeat(64);
    const actionableIdentity = {
      stage: original.stage,
      category: original.category,
      kind: original.kind,
      summary: original.summary,
      ...(original.detail === undefined ? {} : { detail: original.detail }),
      pointer: original.pointer,
      fingerprint,
    };
    const candidateWithActionableIssue = withRetainedFindings(
      candidateWithoutCorrection,
      {
        ...candidateWithoutCorrection.findings,
        findings: [
          {
            ...actionableIdentity,
            findingId: sha256Canonical(actionableIdentity),
            githubIssueNumber: 292,
          },
          ...candidateWithoutCorrection.findings.findings.slice(1),
        ],
      },
    );
    const actionableComparison = compareCompleteEquivalentPaths({
      baseline: validated(baseline),
      candidate: validated(candidateWithActionableIssue),
    });
    expect(actionableComparison.identity).toBe("different-path");
  }, 60_000);

  test("rejects inline findings tampering against the retained projection authority", () => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    const correction = benchmark.findings.findings.find(
      ({ kind }) => kind === "successful-correction",
    );
    expect(correction).toBeDefined();
    if (correction === undefined) return;
    const tampered = {
      ...benchmark,
      findings: {
        ...benchmark.findings,
        findings: benchmark.findings.findings.filter(
          (candidate) => candidate !== correction,
        ),
      },
    };
    expect(validateCompletePathMeasurement(tampered)).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining(
        "findings projection authority does not match the measurement",
      ),
    });
  });

  test("counts a recovered thrown SDK attempt from transcript authority without calling it accepted", () => {
    const recovered = validated(measurement({}, gitSha, true));
    const comparison = compareCompleteEquivalentPaths({
      baseline: recovered,
      candidate: recovered,
    });

    expect(comparison).toMatchObject({
      identity: "equivalent-path",
      baseline: {
        outcome: { tag: "completed" },
        sdkCallCount: { tag: "available", count: 2 },
      },
      candidate: {
        outcome: { tag: "completed" },
        sdkCallCount: { tag: "available", count: 2 },
      },
    });
  });

  test("keeps legacy-unbound benchmark envelopes readable but ineligible for strict acceptance", () => {
    const boundBaseline = benchmarkMeasurement("documentDeclarationSet");
    const boundCandidate = benchmarkMeasurement("boundedCapabilityProjection", {
      scenarioBundle: boundBaseline.scenarioBundle,
      stagePlan: boundBaseline.stagePlan,
    });
    const {
      findingsAuthority: _baselineAuthority,
      executionId: _baselineExecutionId,
      evidenceSetId: _baselineEvidenceSetId,
      ...baselineEvidence
    } = boundBaseline;
    const {
      findingsAuthority: _candidateAuthority,
      executionId: _candidateExecutionId,
      evidenceSetId: _candidateEvidenceSetId,
      ...candidateEvidence
    } = boundCandidate;
    const baseline = validateCompletePathMeasurement({
      ...baselineEvidence,
      schemaVersion: 3,
    });
    const candidate = validateCompletePathMeasurement({
      ...candidateEvidence,
      schemaVersion: 3,
    });
    expect(baseline).toMatchObject({ _tag: "Right" });
    expect(candidate).toMatchObject({ _tag: "Right" });
    if (Either.isLeft(baseline) || Either.isLeft(candidate)) return;
    expect(
      compareCompleteEquivalentPaths({
        baseline: baseline.right,
        candidate: candidate.right,
      }),
    ).toMatchObject({
      identity: "different-path",
      equivalence: {
        tag: "incomparable",
        reason: expect.stringContaining("legacy unbound findings projection"),
      },
    });
  }, 60_000);

  test("rejects a benchmark invocation from a mixed implementation revision", () => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    const validation = validateCompletePathMeasurement({
      ...benchmark,
      invocations: benchmark.invocations.map((entry, index) =>
        index === 0 ? { ...entry, gitSha: "b".repeat(40) } : entry,
      ),
    });
    expect(validation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("different implementation revision"),
    });
  });

  test("binds current player and post-play invocation subjects to one Execution and Evidence Set", () => {
    const source = benchmarkMeasurement("boundedCapabilityProjection");
    const player = source.invocations.find(({ phase }) => phase === "player");
    expect(player).toBeDefined();
    if (player === undefined || player.subject.tag !== "execution") return;
    const tampered = {
      ...source,
      invocations: source.invocations.map((invocation) =>
        invocation.invocationId === player.invocationId
          ? {
              ...invocation,
              subject: {
                ...invocation.subject,
                evidenceSetId: "swapped-benchmark-evidence",
              },
            }
          : invocation,
      ),
    };
    const parsed = parseBenchmarkMeasurement(tampered);
    expect(Either.isRight(parsed)).toBe(true);
    if (Either.isRight(parsed)) {
      expect(validateCompletePathMeasurement(parsed.right)).toMatchObject({
        _tag: "Left",
      });
    }
  });

  test("rejects a fixed benchmark measurement whose descriptor identity is swapped", () => {
    const source = benchmarkMeasurement("boundedCapabilityProjection");
    const tampered = {
      ...source,
      executionId: "swapped-benchmark-execution",
      evidenceSetId: "swapped-benchmark-evidence",
    };
    const parsed = parseBenchmarkMeasurement(tampered);
    expect(Either.isRight(parsed)).toBe(true);
    if (Either.isRight(parsed)) {
      expect(validateCompletePathMeasurement(parsed.right)).toMatchObject({
        _tag: "Left",
        left: expect.stringContaining(
          "does not match the retained player Execution",
        ),
      });
    }
  });

  test("rejects a tampered or role-swapped benchmark context authority", () => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    const manifest = parseJsonRecord(
      readFileSync(
        resolve(repoRoot, benchmark.contextSourceManifest.path),
        "utf8",
      ),
    );
    const sources = Array.isArray(manifest.sources)
      ? manifest.sources.filter(isJsonRecord)
      : [];
    expect(sources.length).toBe(BENCHMARK_CONTEXT_ROLES.length);
    const sourceAuthorityForRole = (
      role: "player" | "postPlayReview",
    ): Record<string, unknown> => {
      const source = sources.find((candidate) => candidate.role === role);
      if (source === undefined || !isJsonRecord(source.authority)) {
        throw new Error(`Synthetic context authority ${role} is missing.`);
      }
      return source.authority;
    };
    const playerAuthority = sourceAuthorityForRole("player");
    const postPlayAuthority = sourceAuthorityForRole("postPlayReview");
    const swappedSources = sources.map((source) =>
      source.role !== "player" && source.role !== "postPlayReview"
        ? source
        : {
            ...source,
            authority:
              source.role === "player" ? postPlayAuthority : playerAuthority,
          },
    );
    const root = resolve(repoRoot, benchmark.contextSourceManifest.path, "..");
    const swappedManifest = writeAuthority(
      root,
      "role-swapped-context-sources.json",
      `${JSON.stringify({ ...manifest, sources: swappedSources })}\n`,
    );
    const validation = validateCompletePathMeasurement({
      ...benchmark,
      contextSourceManifest: swappedManifest,
    });
    expect(validation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("canonical"),
    });

    if (typeof playerAuthority.path !== "string") return;
    writeFileSync(
      resolve(repoRoot, playerAuthority.path),
      "Tampered benchmark context.\n",
    );
    const tamperedValidation = validateCompletePathMeasurement(benchmark);
    expect(tamperedValidation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("context"),
    });
  });

  test.each([
    ["profile", { profile: "documentDeclarationSet" }],
    ["role", { role: "player" }],
    ["path", { path: "context/player.md" }],
    ["hash", { sha256: "f".repeat(64) }],
  ])("rejects tampered post-play context-delivery %s", (_label, patch) => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    const authority = benchmark.findings.authorities.find(
      ({ role }) => role === "postPlayReviewContextDelivery",
    );
    expect(authority).toBeDefined();
    if (authority === undefined) return;
    const value = parseJsonRecord(
      readFileSync(resolve(repoRoot, authority.path), "utf8"),
    );
    writeFileSync(
      resolve(repoRoot, authority.path),
      `${JSON.stringify({ ...value, ...patch })}\n`,
    );
    const validation = validateCompletePathMeasurement(benchmark);
    expect(validation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("context"),
    });
  });

  test("requires retained post-play and replay authorities for schema-3 paths", () => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    const withoutPostPlay = validateCompletePathMeasurement({
      ...benchmark,
      findings: {
        ...benchmark.findings,
        authorities: benchmark.findings.authorities.filter(
          ({ role }) => role !== "review-1",
        ),
      },
    });
    expect(withoutPostPlay).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("post-play"),
    });

    const withoutReplay = validateCompletePathMeasurement({
      ...benchmark,
      findings: {
        ...benchmark.findings,
        authorities: benchmark.findings.authorities.filter(
          ({ role }) => role !== "replay-final",
        ),
      },
    });
    expect(withoutReplay).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("pre-play replay"),
    });
  });

  test("binds benchmark replay results to final invocation agent messages", () => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    const replay = benchmark.findings.authorities.find(
      ({ role }) => role === "replay-final",
    );
    expect(replay).toBeDefined();
    if (replay === undefined) return;
    const replayValue = parseJsonRecord(
      readFileSync(resolve(repoRoot, replay.path), "utf8"),
    );
    if (!isJsonRecord(replayValue.result)) return;
    if (!isJsonRecord(replayValue.result.raw)) return;
    const tamperedReplay = replaceJsonAuthority(replay, {
      ...replayValue,
      result: {
        ...replayValue.result,
        raw: {
          ...replayValue.result.raw,
          evidence: "Tampered replay result not present in invocation events.",
        },
      },
    });
    const validation = validateCompletePathMeasurement({
      ...benchmark,
      findings: {
        ...benchmark.findings,
        authorities: benchmark.findings.authorities.map((authority) =>
          authority.role === replay.role ? tamperedReplay : authority,
        ),
      },
    });
    expect(validation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining(
        "result does not match its invocation event output",
      ),
    });
  });

  test("binds benchmark readiness results to final invocation agent messages", () => {
    const benchmark = benchmarkMeasurement("documentDeclarationSet");
    const readinessSource = benchmark.findings.authorities.find(
      ({ role }) => role === "prePlayReviewReadinessSource",
    );
    const readinessResult = benchmark.findings.authorities.find(
      ({ role }) => role === "prePlayReviewReadinessResult",
    );
    expect(readinessSource).toBeDefined();
    expect(readinessResult).toBeDefined();
    if (readinessSource === undefined || readinessResult === undefined) return;
    const sourceValue = parseJsonRecord(
      readFileSync(resolve(repoRoot, readinessSource.path), "utf8"),
    );
    const tamperedResultValue = {
      classification: "needsRevision" as const,
      evidence: "Tampered readiness result not present in invocation events.",
      critique: "Synthetic tampering regression.",
    };
    const tamperedSource = replaceJsonAuthority(readinessSource, {
      ...sourceValue,
      result: tamperedResultValue,
    });
    const tamperedResult = replaceJsonAuthority(
      readinessResult,
      tamperedResultValue,
    );
    const validation = validateCompletePathMeasurement({
      ...benchmark,
      findings: {
        ...benchmark.findings,
        authorities: benchmark.findings.authorities.map((authority) =>
          authority.role === readinessSource.role
            ? tamperedSource
            : authority.role === readinessResult.role
              ? tamperedResult
              : authority,
        ),
      },
    });
    expect(validation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining(
        "readiness result does not match its invocation event output",
      ),
    });
  }, 60_000);

  test.each([
    "prePlayReviewSourceInput-final",
    "prePlayReviewSourceInputfinal",
  ])(
    "rejects retired benchmark pre-play source review authority %s",
    (role) => {
      const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
      const root = resolve(
        repoRoot,
        benchmark.scenarioBundle.stagePlan.path,
        "..",
      );
      const retiredSource = writeAuthority(
        root,
        "retired-pre-play-source-input.json",
        "{}\n",
      );
      const validation = validateCompletePathMeasurement({
        ...benchmark,
        findings: {
          ...benchmark.findings,
          authorities: [
            ...benchmark.findings.authorities,
            { role, ...retiredSource },
          ],
        },
      });
      expect(validation).toMatchObject({
        _tag: "Left",
        left: expect.stringContaining("retired"),
      });
    },
  );

  test("rejects empty and bounded auxiliary invocation sets at the schema boundary", () => {
    const bounded = benchmarkMeasurement("boundedCapabilityProjection");
    expect(
      parseBenchmarkMeasurement({ ...bounded, invocations: [] }),
    ).toMatchObject({ _tag: "Left" });

    const baseline = benchmarkMeasurement("documentDeclarationSet");
    const auxiliary = baseline.invocations.find(
      (entry) => entry.schemaVersion === 3,
    );
    expect(auxiliary).toBeDefined();
    if (auxiliary === undefined) return;
    expect(
      parseBenchmarkMeasurement({
        ...bounded,
        invocations: [...bounded.invocations, auxiliary],
      }),
    ).toMatchObject({ _tag: "Left" });
  });

  test("binds an admitted benchmark stage plan to the scenario and review bundle hashes", () => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    if (benchmark.stagePlan.identity.tag !== "admitted") return;
    const root = resolve(
      repoRoot,
      benchmark.scenarioBundle.stagePlan.path,
      "..",
    );
    const mismatchedStagePlan = {
      ...benchmark.stagePlan,
      identity: {
        ...benchmark.stagePlan.identity,
        scenarioSha256: "f".repeat(64),
      },
    };
    const stagePlanAuthority = writeAuthority(
      root,
      "mismatched-stage-plan.json",
      `${JSON.stringify(mismatchedStagePlan)}\n`,
    );
    const validation = validateCompletePathMeasurement({
      ...benchmark,
      stagePlan: mismatchedStagePlan,
      scenarioBundle: {
        ...benchmark.scenarioBundle,
        stagePlan: stagePlanAuthority,
      },
    });
    expect(validation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining(
        "Admitted benchmark stage-plan scenario hash is not bound",
      ),
    });
  });

  test("decodes and binds the benchmark scenario-review authority identity", () => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    const root = resolve(
      repoRoot,
      benchmark.scenarioBundle.scenarioReview.path,
      "..",
    );
    const scenarioReview = parseJsonRecord(
      readFileSync(
        resolve(repoRoot, benchmark.scenarioBundle.scenarioReview.path),
        "utf8",
      ),
    );
    const malformedScenarioReview = writeAuthority(
      root,
      "mismatched-scenario-review.json",
      `${JSON.stringify({ ...scenarioReview, scenarioId: "other-scenario" })}\n`,
    );
    const validation = validateCompletePathMeasurement({
      ...benchmark,
      scenarioBundle: {
        ...benchmark.scenarioBundle,
        scenarioReview: malformedScenarioReview,
      },
    });
    expect(validation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining(
        "Benchmark scenario-review authority is not bound",
      ),
    });
  });

  test("requires an exact invocation-event hash bijection for benchmark paths", () => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    const duplicateAuthority = benchmark.invocationEvents[0]!;
    const malformed = {
      ...benchmark,
      invocationEvents: benchmark.invocationEvents.map((authority, index) =>
        index === 1 ? duplicateAuthority : authority,
      ),
    };
    const validation = validateCompletePathMeasurement(malformed);
    expect(validation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("exact bijection"),
    });
  });

  test("rejects a mutated current invocation event authority", () => {
    const source = measurement();
    const authority = source.invocationEvents[0];
    if (authority === undefined) throw new Error("Missing invocation event.");
    const path = resolve(repoRoot, authority.path);
    writeFileSync(path, `${readFileSync(path, "utf8")}\n{"tampered":true}\n`);
    const validation = validateCompletePathMeasurement(source);
    expect(validation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("event authority hash is not canonical"),
    });
  });

  test("rejects a mutated benchmark invocation event authority", () => {
    const source = benchmarkMeasurement("boundedCapabilityProjection");
    const authority = source.invocationEvents[0];
    if (authority === undefined) throw new Error("Missing invocation event.");
    const path = resolve(repoRoot, authority.path);
    writeFileSync(path, `${readFileSync(path, "utf8")}\n{"tampered":true}\n`);
    const validation = validateCompletePathMeasurement(source);
    expect(validation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining(
        "Benchmark invocation event authority hash is not canonical",
      ),
    });
  });

  test.each([
    ["current", () => measurement()],
    ["benchmark", () => benchmarkMeasurement("boundedCapabilityProjection")],
  ])(
    "reads each %s invocation event authority once across validation",
    (_label, createMeasurement) => {
      const source = createMeasurement();
      const authority = source.invocationEvents[1];
      if (authority === undefined) throw new Error("Missing invocation event.");
      const absolutePath = resolve(repoRoot, authority.path);
      const reads = vi.mocked(readFileSync);
      reads.mockClear();
      const originalRead = reads.getMockImplementation();
      if (originalRead === undefined) throw new Error("Missing read mock.");
      let eventReadCount = 0;
      reads.mockImplementation((...args) => {
        const result = originalRead(...args);
        if (args[0] === absolutePath && eventReadCount++ === 0) {
          writeFileSync(
            absolutePath,
            `${result.toString()}\n{"tamperedAfterSnapshot":true}\n`,
          );
        }
        return result;
      });
      const validation = validateCompletePathMeasurement(source);
      const eventReads = reads.mock.calls.filter(
        ([path]) => path === absolutePath,
      );
      reads.mockImplementation(originalRead);
      expect(validation._tag).toBe("Right");
      expect(eventReads).toHaveLength(1);
    },
  );

  test("keeps historical baseline review fields separate from readiness and rejects readiness on the bounded profile", () => {
    const baseline = benchmarkMeasurement("documentDeclarationSet");
    const baselineReplay = baseline.findings.authorities.find(
      ({ role }) => role === "replay-milestone",
    );
    expect(baselineReplay).toBeDefined();
    if (baselineReplay === undefined) return;
    const baselineReview = parseJsonRecord(
      readFileSync(resolve(repoRoot, baselineReplay.path), "utf8"),
    );
    if (!isJsonRecord(baselineReview.result)) return;
    writeFileSync(
      resolve(repoRoot, baselineReplay.path),
      `${JSON.stringify({
        ...baselineReview,
        result: {
          ...baselineReview.result,
          scenarioQuality: {
            classification: "ready",
            evidence: "Must remain a separate readiness result.",
          },
        },
      })}\n`,
    );
    const historicalReplayBytes = readFileSync(
      resolve(repoRoot, baselineReplay.path),
    );
    const baselineWithHistoricalReview = {
      ...baseline,
      findings: {
        ...baseline.findings,
        authorities: baseline.findings.authorities.map((authority) =>
          authority.path === baselineReplay.path
            ? {
                ...authority,
                byteLength: historicalReplayBytes.byteLength,
                sha256: createHash("sha256")
                  .update(historicalReplayBytes)
                  .digest("hex"),
              }
            : authority,
        ),
      },
    };
    const historicalValidation = validateCompletePathMeasurement(
      baselineWithHistoricalReview,
    );
    expect(historicalValidation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("not a retained review envelope"),
    });

    const candidate = benchmarkMeasurement("boundedCapabilityProjection");
    const root = resolve(
      repoRoot,
      candidate.scenarioBundle.stagePlan.path,
      "..",
    );
    const readinessAuthority = writeAuthority(
      root,
      "unexpected-readiness-source.txt",
      "Unexpected readiness source.\n",
    );
    const candidateWithReadiness = {
      ...candidate,
      findings: {
        ...candidate.findings,
        authorities: [
          ...candidate.findings.authorities,
          { role: "prePlayReviewReadinessSource", ...readinessAuthority },
        ],
      },
    };
    const readinessValidation = validateCompletePathMeasurement(
      candidateWithReadiness,
    );
    expect(readinessValidation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("retains no readiness"),
    });
  });

  test("requires one profile context authority for every model role", () => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    const manifest = parseJsonRecord(
      readFileSync(
        resolve(repoRoot, benchmark.contextSourceManifest.path),
        "utf8",
      ),
    );
    expect(Array.isArray(manifest.sources)).toBe(true);
    if (!Array.isArray(manifest.sources)) return;
    const root = resolve(repoRoot, benchmark.contextSourceManifest.path, "..");
    const incompleteManifest = writeAuthority(
      root,
      "incomplete-benchmark-context-sources.json",
      `${JSON.stringify({
        ...manifest,
        sources: manifest.sources.filter(
          (source) => isJsonRecord(source) && source.role !== "postPlayReview",
        ),
      })}\n`,
    );

    const validation = validateCompletePathMeasurement({
      ...benchmark,
      contextSourceManifest: incompleteManifest,
    });
    expect(validation).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("postPlayReview"),
    });
  });

  test("decodes context manifests as canonical profile-specific six-role tuples", () => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    const manifest = parseJsonRecord(
      readFileSync(
        resolve(repoRoot, benchmark.contextSourceManifest.path),
        "utf8",
      ),
    );
    const decodeManifest = (value: unknown) =>
      Schema.decodeUnknownEither(BenchmarkContextSourceManifestDocumentSchema, {
        onExcessProperty: "error",
      })(value);
    expect(Either.isRight(decodeManifest(manifest))).toBe(true);
    if (!Array.isArray(manifest.sources)) return;
    expect(
      Either.isLeft(
        decodeManifest({
          ...manifest,
          sources: [...manifest.sources].reverse(),
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodeManifest({
          ...manifest,
          sources: manifest.sources.slice(0, -1),
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        decodeManifest({
          ...manifest,
          profile: "documentDeclarationSet",
        }),
      ),
    ).toBe(true);
  });

  test("parses benchmark measurements without widening production complete-path parsing", () => {
    const benchmark = benchmarkMeasurement("boundedCapabilityProjection");
    const parsed = parseBenchmarkMeasurement(benchmark);
    expect(Either.isRight(parsed)).toBe(true);
    expect(
      Either.isLeft(
        parseCompletePathMeasurement({
          ...benchmark,
          schemaVersion: 2,
        }),
      ),
    ).toBe(true);
  });

  test("retains a validated complete equivalent-path comparison without overwriting evidence", () => {
    const slower = measurement();
    const baseline = validated(
      measurement({
        invocations: slower.invocations.map((entry) => ({
          ...entry,
          elapsedMilliseconds: entry.elapsedMilliseconds * 2,
          usage:
            entry.usage.tag === "available"
              ? {
                  ...entry.usage,
                  input:
                    entry.usage.input.tag === "available"
                      ? {
                          ...entry.usage.input,
                          count: entry.usage.input.count * 2,
                        }
                      : entry.usage.input,
                }
              : entry.usage,
        })),
      }),
    );
    const candidate = validated(measurement());
    const root = rawSwarmTestOutputDirectory("complete-path-comparison-");
    temporaryDirectories.push(root);
    const outputPath = resolve(root, "comparison.json");

    const written = writeCompletePathComparison({
      baseline,
      candidate,
      outputPath,
    });
    expect(Either.isRight(written)).toBe(true);
    const output = parseJsonRecord(readFileSync(outputPath, "utf8"));
    expect(output).toMatchObject({
      schemaVersion: 3,
      identity: "equivalent-path",
      equivalence: { tag: "equivalent" },
      modelInvocationElapsedMilliseconds: { tag: "comparable" },
    });
    expect(output).not.toHaveProperty("elapsedMilliseconds");

    const overwrite = writeCompletePathComparison({
      baseline,
      candidate,
      outputPath,
    });
    expect(overwrite).toMatchObject({ _tag: "Left" });
  });

  test("gates input tokens and model-invocation elapsed without claiming total tokens", () => {
    const baseline = validated(measurement());
    const candidate = validated(
      measurement({
        invocations: baseline.invocations.map((entry) => ({
          ...entry,
          elapsedMilliseconds: Math.floor(entry.elapsedMilliseconds / 2),
          usage:
            entry.usage.tag === "available"
              ? {
                  ...entry.usage,
                  input: { tag: "available" as const, count: 50 },
                  output: { tag: "available" as const, count: 1_000 },
                }
              : entry.usage,
        })),
      }),
    );
    const root = rawSwarmTestOutputDirectory("complete-path-input-gate-");
    temporaryDirectories.push(root);
    const result = writeCompletePathComparison({
      baseline,
      candidate,
      outputPath: resolve(root, "comparison.json"),
    });
    expect(Either.isRight(result)).toBe(true);
    if (Either.isLeft(result)) return;
    expect(result.right.inputTokens).toMatchObject({
      tag: "comparable",
      reduction: 0.5,
    });
    expect(result.right.modelInvocationElapsedMilliseconds).toMatchObject({
      tag: "comparable",
      reduction: 0.5,
    });
    expect(result.right).not.toHaveProperty("totalTokens");
  });

  test("refuses to write a comparison below the forty-percent reduction gate", () => {
    const baseline = validated(measurement());
    const candidate = validated(measurement());
    const root = rawSwarmTestOutputDirectory("complete-path-below-gate-");
    temporaryDirectories.push(root);
    const result = writeCompletePathComparison({
      baseline,
      candidate,
      outputPath: resolve(root, "comparison.json"),
    });
    expect(result).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("below the required"),
    });
  });

  test("refuses to write a comparison with unavailable metrics", () => {
    const source = measurement();
    const baseline = validated(
      measurement({
        invocations: source.invocations.map((entry) => ({
          ...entry,
          usage: {
            tag: "unavailable" as const,
            reason:
              "The first-party event stream exposed no turn.completed usage object.",
          },
        })),
      }),
    );
    const candidate = validated(measurement());
    const root = rawSwarmTestOutputDirectory("complete-path-incomparable-");
    temporaryDirectories.push(root);
    const result = writeCompletePathComparison({
      baseline,
      candidate,
      outputPath: resolve(root, "comparison.json"),
    });
    expect(result).toMatchObject({
      _tag: "Left",
      left: expect.stringContaining("incomparable"),
    });
  });

  test("does not make a skipped redundant stage change semantic identity", () => {
    const baselineStagePlan = {
      ...stagePlan,
      facts: {
        ...stagePlan.facts,
        characterRequirement: {
          tag: "characterSheetsRequired" as const,
          evidence: "The baseline retained a character-authoring pass.",
        },
      },
      stages: stagePlan.stages.map((entry) =>
        entry.stage === "scenarioCharacterAuthoring"
          ? {
              ...entry,
              decision: "required" as const,
              determinedBy: "characterRequirement" as const,
              reason: "The baseline retained character authoring.",
              modelInvocation: "planned" as const,
            }
          : entry,
      ),
    };
    const baselineInvocations = measurement().invocations;
    const baseline = measurement({
      stagePlan: baselineStagePlan,
      invocations: [
        ...baselineInvocations.slice(0, 3),
        invocation({
          phase: "scenarioCharacterAuthoring",
          stagePlanReason: "The baseline retained character authoring.",
          invocationId: "character-authoring",
        }),
        ...baselineInvocations.slice(3),
      ],
    });
    const comparison = compareCompleteEquivalentPaths({
      baseline: validated(baseline),
      candidate: validated(measurement()),
    });
    expect(comparison.identity).toBe("equivalent-path");
    expect(comparison.implementation.phaseSequenceChanged).toBe(true);
  });

  test("rejects a phase that the current stage plan cannot explain", () => {
    const baseInvocations = measurement().invocations;
    const baseline = measurement({
      invocations: [
        ...baseInvocations.slice(0, 3),
        invocation({
          phase: "scenarioCharacterAuthoring",
          stagePlanReason: stageReason("scenarioCharacterAuthoring"),
          invocationId: "skipped-character-authoring",
        }),
        ...baseInvocations.slice(3),
      ],
    });
    const comparison = compareCompleteEquivalentPaths({
      baseline: validated(baseline),
      candidate: validated(measurement()),
    });
    expect(comparison).toMatchObject({
      identity: "different-path",
      equivalence: {
        tag: "incomparable",
        reason: expect.stringContaining("skipped/rejected"),
      },
      modelInvocationElapsedMilliseconds: { tag: "incomparable" },
      inputTokens: { tag: "incomparable" },
    });
  });

  test("rejects duplicate composite reviews beyond the milestone and final pair", () => {
    const baseInvocations = measurement().invocations;
    const baseline = measurement({
      invocations: [
        ...baseInvocations.slice(0, 2),
        invocation({
          phase: "scenarioCompositeReview",
          stagePlanReason: stageReason("scenarioCompositeReview"),
          invocationId: "duplicate-composite-review",
        }),
        ...baseInvocations.slice(2),
      ],
    });
    const comparison = compareCompleteEquivalentPaths({
      baseline: validated(baseline),
      candidate: validated(measurement()),
    });
    expect(comparison.identity).toBe("different-path");
    expect(comparison.equivalence.reason).toContain("exactly two");
  });

  test("does not equate a failed complete path with a completed path", () => {
    const baseline = measurement({
      invocations: measurement().invocations.map((entry) =>
        entry.invocationId === "invocation-1"
          ? {
              ...entry,
              result: {
                tag: "failed" as const,
                reason: "The player invocation failed.",
              },
              exit: { tag: "exited" as const, status: 1 },
            }
          : entry,
      ),
      outcome: { tag: "failed", reason: "The player stage failed." },
    });
    const comparison = compareCompleteEquivalentPaths({
      baseline: validated(baseline),
      candidate: validated(measurement()),
    });
    expect(comparison.identity).toBe("different-path");
    expect(comparison.equivalence.reason).toContain("retained evidence");
  });

  test("rejects a completed path that retains a failed invocation", () => {
    const malformed = measurement({
      invocations: measurement().invocations.map((entry) =>
        entry.invocationId === "invocation-1"
          ? {
              ...entry,
              result: {
                tag: "failed" as const,
                reason: "The player invocation failed.",
              },
              exit: { tag: "exited" as const, status: 1 },
            }
          : entry,
      ),
      outcome: { tag: "completed" },
    });
    const validation = validateCompletePathMeasurement(malformed);
    expect(Either.isLeft(validation)).toBe(true);
    if (Either.isRight(validation)) return;
    expect(validation.left).toContain("completed complete path");
  });

  test("binds invocation reasons and order to the retained stage plan", () => {
    const wrongReason = measurement({
      invocations: measurement().invocations.map((entry) =>
        entry.invocationId === "invocation-1"
          ? { ...entry, stagePlanReason: "unbound reason" }
          : entry,
      ),
    });
    const wrongReasonValidation = validateCompletePathMeasurement(wrongReason);
    expect(Either.isLeft(wrongReasonValidation)).toBe(true);
    if (Either.isRight(wrongReasonValidation)) return;
    expect(wrongReasonValidation.left).toContain("stage-plan reason");

    const ordered = measurement().invocations;
    const outOfOrder = measurement({
      invocations: [
        ...ordered.slice(0, 5),
        ordered[6]!,
        ordered[5]!,
        ...ordered.slice(7),
      ],
    });
    const outOfOrderValidation = validateCompletePathMeasurement(outOfOrder);
    expect(Either.isLeft(outOfOrderValidation)).toBe(true);
    if (Either.isRight(outOfOrderValidation)) return;
    expect(outOfOrderValidation.left).toContain("out of order");
  });

  test("keeps unavailable dimensions unavailable instead of treating them as zero", () => {
    const baseline = measurement({
      invocations: measurement().invocations.map((entry) => ({
        ...entry,
        usage: {
          tag: "unavailable" as const,
          reason:
            "The first-party event stream exposed no turn.completed usage object.",
        },
      })),
    });
    const comparison = compareCompleteEquivalentPaths({
      baseline: validated(baseline),
      candidate: validated(measurement()),
    });
    expect(comparison.inputTokens).toMatchObject({
      tag: "incomparable",
      reason: expect.stringContaining("unavailable"),
    });
    expect(comparison.baseline.usage).toEqual({
      tag: "unavailable",
      reason:
        "The first-party event stream exposed no turn.completed usage object.",
    });
  });

  test("retains historical baseline gaps instead of fabricating current authorities", () => {
    const historical = {
      schemaVersion: 1 as const,
      pathId: "open-grid-wolf-skeleton-pursuit",
      legacy: {
        schemaVersion: 1 as const,
        scenarioId: "open-grid-wolf-skeleton-pursuit",
        scenarioSha256: "1".repeat(64),
        scenarioReviewSha256: "2".repeat(64),
        charactersSha256: "3".repeat(64),
        setupSha256: "4".repeat(64),
        calls: 4,
        continuations: 1,
        player: {
          model: "gpt-5.6-sol",
          reasoningEffort: "medium",
          footerTokens: 361_700,
          elapsedMilliseconds: 100,
        },
        postPlayReview: {
          model: "gpt-5.6-luna",
          reasoningEffort: "max",
          footerTokens: 97_500,
          elapsedMilliseconds: 100,
        },
        wholePathElapsedMilliseconds: 200,
      },
      stagePlan: {
        tag: "unavailable" as const,
        reason: "The retained #287 baseline predates typed stage plans.",
      },
      invocations: {
        tag: "unavailable" as const,
        reason: "The retained #287 baseline has no v2 invocation ledger.",
      },
      findings: {
        tag: "unavailable" as const,
        reason: "The retained #287 baseline has no findings projection.",
      },
      outcome: {
        tag: "unavailable" as const,
        reason: "The retained #287 baseline has no typed path outcome.",
      },
    };
    const parsed = parseCompletePathMeasurement(historical);
    expect(Either.isRight(parsed)).toBe(true);
    if (Either.isLeft(parsed)) return;
    const comparison = compareCompleteEquivalentPaths({
      baseline: validated(parsed.right),
      candidate: validated(measurement()),
    });
    expect(comparison).toMatchObject({
      identity: "different-path",
      equivalence: {
        tag: "incomparable",
        reason: expect.stringContaining("historical"),
      },
      baseline: {
        evidenceVersion: "historical",
        sdkCallCount: { tag: "unavailable" },
        corrections: { tag: "unavailable" },
      },
      inputTokens: { tag: "incomparable" },
    });
  });

  test("rejects unversioned or structurally widened measurements at the boundary", () => {
    const parsed = parseCompletePathMeasurement(measurement());
    expect(Either.isRight(parsed)).toBe(true);
    expect(
      Either.isLeft(
        parseCompletePathMeasurement({ ...measurement(), schemaVersion: 1 }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        parseCompletePathMeasurement({ ...measurement(), unexpected: true }),
      ),
    ).toBe(true);
  });

  test("records the bounded capability-context size by role", () => {
    const estimate = capabilityContextSizeEstimate();
    expect(estimate.schemaVersion).toBe(1);
    expect(estimate.roles).toHaveLength(5);
    expect(estimate.totalBytes).toBe(
      estimate.roles.reduce((total, role) => total + role.bytes, 0),
    );
    expect(estimate.estimatedTokens).toBeGreaterThan(0);
    expect(
      estimate.roles.every(({ bytes }) => bytes <= estimate.maxBytes),
    ).toBe(true);
  });

  test("requires hash-linked findings, stage-plan, and invocation authorities", () => {
    const validated = validateCompletePathMeasurement(measurement());
    expect(Either.isRight(validated)).toBe(true);
    const malformed = validateCompletePathMeasurement({
      ...measurement(),
      findings: {
        ...measurement().findings,
        subjectIdentity: "e".repeat(64),
      },
    });
    expect(Either.isLeft(malformed)).toBe(true);
    if (Either.isRight(malformed)) return;
    expect(malformed.left).toContain("Findings authority");
  });

  test("rejects an incident-shaped classification under a strict current replay schema", () => {
    const source = measurement();
    const replay = source.findings.authorities.find(
      ({ role }) => role === "replay-final",
    );
    if (replay === undefined) {
      throw new Error("Synthetic final replay authority is missing.");
    }
    const retained = parseJsonRecord(
      readFileSync(resolve(repoRoot, replay.path), "utf8"),
    );
    const incidentResult = {
      ...(retained.result as Record<string, unknown>),
      sdkCapability: {
        classification: "missingUnsupportedProbe",
        evidence: "The synthetic scenario requires an unsupported capability.",
        critique: "Declare the unsupported capability probe.",
      },
    };
    const strictSchema = codexOutputJsonSchema(
      scenarioCompositeReviewSchemaForIntents({
        contentAvailabilityIntent: "availableOnly",
        sdkCapabilityIntent: "supportedOnly",
      }),
    );
    const strictReplay = replaceJsonAuthority(replay, {
      ...retained,
      outputJsonSchema: strictSchema,
      result: incidentResult,
    });
    const findings = {
      ...source.findings,
      authorities: source.findings.authorities.map((authority) =>
        authority.role === replay.role ? strictReplay : authority,
      ),
    };
    const validation = validateCompletePathMeasurement(
      withRetainedFindings(source, findings),
    );
    expect(Either.isLeft(validation)).toBe(true);
    if (Either.isRight(validation)) return;
    expect(validation.left).toContain(
      "Replay authority replay-final is not bound to a current scenario review schema",
    );
  });

  test("retains a revised Candidate milestone while final replay binds admission", () => {
    const source = measurement();
    if (source.stagePlan.identity.tag !== "admitted")
      throw new Error("Synthetic stage plan is not admitted.");
    const root = resolve(repoRoot, source.stagePlanAuthority.path, "..");
    const milestone = source.invocations.find(
      ({ invocationId }) => invocationId === "composite-milestone",
    );
    const final = source.invocations.find(
      ({ invocationId }) => invocationId === "composite-final",
    );
    if (
      milestone === undefined ||
      final === undefined ||
      milestone.subject.tag !== "scenarioCandidate" ||
      final.subject.tag !== "scenarioCandidate"
    ) {
      throw new Error("Synthetic composite-review invocations are incomplete.");
    }
    const milestoneSubject = {
      ...milestone.subject,
      candidateScenarioSha256: "b".repeat(64),
    };
    const finalSubject = {
      ...final.subject,
      candidateScenarioSha256: source.stagePlan.identity.scenarioSha256,
    };
    const revisedEntries = source.invocations.map((entry) =>
      entry.invocationId === milestone.invocationId
        ? { ...entry, subject: milestoneSubject }
        : entry.invocationId === final.invocationId
          ? { ...entry, subject: finalSubject }
          : entry,
    );
    const retained = revisedEntries.map((entry) =>
      retainInvocation(root, entry),
    );
    const retainedMilestone = retained.find(
      ({ entry }) => entry.invocationId === milestone.invocationId,
    );
    const retainedFinal = retained.find(
      ({ entry }) => entry.invocationId === final.invocationId,
    );
    if (retainedMilestone === undefined || retainedFinal === undefined) {
      throw new Error("Synthetic revised invocation evidence is incomplete.");
    }
    const invocationLedger = writeAuthority(
      root,
      "revised-invocations.jsonl",
      `${retained.map(({ entry }) => JSON.stringify(entry)).join("\n")}\n`,
    );
    const replayInput = (
      reviewStage: "milestone" | "final",
      invocationId: string,
      subject: typeof milestoneSubject,
    ) => ({
      schemaVersion: 3 as const,
      phase: "scenarioCompositeReview" as const,
      reviewStage,
      subject,
      sourceGitSha: gitSha,
      invocationId,
      model: "gpt-5.6-luna" as const,
      reasoningEffort: "max" as const,
      prompt: `Synthetic ${reviewStage} review prompt.`,
      outputJsonSchema: codexOutputJsonSchema(
        CurrentScenarioCompositeReviewSchema,
      ),
      result: syntheticCompositeReview(),
    });
    const replayMilestone = writeAuthority(
      root,
      "revised-replay-milestone.json",
      `${JSON.stringify(replayInput("milestone", milestone.invocationId, milestoneSubject))}\n`,
    );
    const replayFinal = writeAuthority(
      root,
      "revised-replay-final.json",
      `${JSON.stringify(replayInput("final", final.invocationId, finalSubject))}\n`,
    );
    const replayAuthorityReplacements = new Map([
      ["replay-milestone", replayMilestone],
      ["replay-final", replayFinal],
      ["prePlayReviewReplayEvents-milestone", retainedMilestone.authority],
      ["prePlayReviewReplayEvents-final", retainedFinal.authority],
    ]);
    const revisedFindings = {
      ...source.findings,
      authorities: source.findings.authorities.map((authority) => {
        const replacement = replayAuthorityReplacements.get(authority.role);
        return replacement === undefined
          ? authority
          : { role: authority.role, ...replacement };
      }),
    };
    const revised = withRetainedFindings(
      {
        ...source,
        invocationLedgers: [invocationLedger],
        invocations: retained.map(({ entry }) => entry),
        invocationEvents: retained.map(({ authority }) => authority),
      },
      revisedFindings,
    );

    const validation = validateCompletePathMeasurement(revised);
    expect(Either.isRight(validation)).toBe(true);
  });

  test("rejects swapped named replay authorities even when each path and hash is valid", () => {
    const source = measurement();
    const milestone = source.findings.authorities.find(
      ({ role }) => role === "replay-milestone",
    );
    const final = source.findings.authorities.find(
      ({ role }) => role === "replay-final",
    );
    if (milestone === undefined || final === undefined) {
      throw new Error("Synthetic named replay authorities are incomplete.");
    }
    const swappedFindings = {
      ...source.findings,
      authorities: source.findings.authorities.map((authority) =>
        authority.role === "replay-milestone"
          ? {
              role: authority.role,
              path: final.path,
              sha256: final.sha256,
              byteLength: final.byteLength,
            }
          : authority.role === "replay-final"
            ? {
                role: authority.role,
                path: milestone.path,
                sha256: milestone.sha256,
                byteLength: milestone.byteLength,
              }
            : authority,
      ),
    };
    const invalid = validateCompletePathMeasurement(
      withRetainedFindings(source, swappedFindings),
    );
    expect(Either.isLeft(invalid)).toBe(true);
    if (Either.isRight(invalid)) return;
    expect(invalid.left).toContain("Replay authority role replay-milestone");
  });

  test("rejects numbered replay authorities without milestone/final stage names", () => {
    const source = measurement();
    const numberedFindings = {
      ...source.findings,
      authorities: source.findings.authorities.map((authority) =>
        authority.role === "replay-milestone"
          ? { ...authority, role: "replay-1" }
          : authority.role === "replay-final"
            ? { ...authority, role: "replay-2" }
            : authority,
      ),
    };
    const invalid = validateCompletePathMeasurement(
      withRetainedFindings(source, numberedFindings),
    );
    expect(Either.isLeft(invalid)).toBe(true);
    if (Either.isRight(invalid)) return;
    expect(invalid.left).toMatch(
      /replay-(?:1|2)|retained milestone and one final/,
    );
  });

  test("rejects the legacy unnumbered replay authority role", () => {
    const source = measurement();
    const milestone = source.findings.authorities.find(
      ({ role }) => role === "replay-milestone",
    );
    if (milestone === undefined) {
      throw new Error("Synthetic milestone replay authority is incomplete.");
    }
    const root = resolve(repoRoot, milestone.path, "..");
    const legacy = writeAuthority(
      root,
      "legacy-replay.json",
      readFileSync(resolve(repoRoot, milestone.path), "utf8"),
    );
    const legacyFindings = {
      ...source.findings,
      authorities: [
        ...source.findings.authorities,
        { role: "replay", ...legacy },
      ],
    };
    const invalid = validateCompletePathMeasurement(
      withRetainedFindings(source, legacyFindings),
    );
    expect(Either.isLeft(invalid)).toBe(true);
    if (Either.isRight(invalid)) return;
    expect(invalid.left).toContain("role is not closed: replay");
  });

  test("assembles and writes a current measurement from canonical authorities", () => {
    const source = measurement();
    const sourceRoot = resolve(repoRoot, source.stagePlanAuthority.path, "..");
    const findingsPath = writeAuthority(
      sourceRoot,
      "findings.json",
      JSON.stringify(source.findings) + "\n",
    );
    const descriptor = {
      schemaVersion: 1 as const,
      pathId: source.pathId,
      stagePlanPath: source.stagePlanAuthority.path,
      findingsPath: findingsPath.path,
      invocationLedgerPaths: source.invocationLedgers.map(({ path }) => path),
      invocationEventPaths: source.invocationEvents.map(({ path }) => path),
      outcome: source.outcome,
    };
    const assembled = assembleCompletePathMeasurement(descriptor);
    expect(Either.isRight(assembled)).toBe(true);
    if (Either.isLeft(assembled)) return;
    expect(assembled.right).toMatchObject({
      schemaVersion: 4,
      pathId: source.pathId,
      invocations: source.invocations,
      invocationLedgers: source.invocationLedgers,
      invocationEvents: source.invocationEvents,
    });
    const outputPath = resolve(sourceRoot, "assembled-measurement.json");
    const written = writeCompletePathMeasurement({
      descriptor,
      outputPath,
    });
    expect(Either.isRight(written)).toBe(true);
    expect(
      readCompletePathMeasurement(relative(repoRoot, outputPath)),
    ).toMatchObject({
      pathId: source.pathId,
      invocations: source.invocations,
    });
  });

  test("allows scenario generation/review authorities from a prior clean commit", () => {
    const source = measurement();
    const scenarioReviewAuthority = source.findings.authorities.find(
      ({ role }) => role === "scenarioReview",
    );
    const transcriptAuthority = source.findings.authorities.find(
      ({ role }) => role === "transcript",
    );
    const postPlayReviewAuthority = source.findings.authorities.find(
      ({ role }) => role === "review-1",
    );
    const replayResultAuthority = source.findings.authorities.find(
      ({ role }) => role === "replayResult",
    );
    expect(scenarioReviewAuthority).toBeDefined();
    expect(transcriptAuthority).toBeDefined();
    expect(postPlayReviewAuthority).toBeDefined();
    expect(replayResultAuthority).toBeDefined();
    if (
      scenarioReviewAuthority === undefined ||
      transcriptAuthority === undefined ||
      postPlayReviewAuthority === undefined ||
      replayResultAuthority === undefined
    )
      return;

    const priorGitSha = "b".repeat(40);
    const scenarioReviewPath = resolve(repoRoot, scenarioReviewAuthority.path);
    const reviewed = parseJsonRecord(readFileSync(scenarioReviewPath, "utf8"));
    const scenarioReviewBytes =
      JSON.stringify({ ...reviewed, gitSha: priorGitSha }) + "\n";
    writeFileSync(scenarioReviewPath, scenarioReviewBytes);
    const scenarioReviewSha256 = sha256Text(scenarioReviewBytes);

    const stagePlan = {
      ...source.stagePlan,
      identity: {
        ...source.stagePlan.identity,
        scenarioReviewSha256,
      },
    };
    const stagePlanPath = resolve(repoRoot, source.stagePlanAuthority.path);
    const stagePlanBytes = JSON.stringify(stagePlan) + "\n";
    writeFileSync(stagePlanPath, stagePlanBytes);
    const stagePlanAuthority = {
      ...source.stagePlanAuthority,
      byteLength: Buffer.byteLength(stagePlanBytes),
      sha256: sha256Text(stagePlanBytes),
    };

    const transcriptPath = resolve(repoRoot, transcriptAuthority.path);
    const transcriptRecords = readFileSync(transcriptPath, "utf8")
      .trimEnd()
      .split("\n")
      .map(parseJsonRecord);
    transcriptRecords[0] = {
      ...transcriptRecords[0],
      scenarioReviewSha256,
    };
    const transcriptBytes =
      transcriptRecords.map((record) => JSON.stringify(record)).join("\n") +
      "\n";
    writeFileSync(transcriptPath, transcriptBytes);
    const transcriptSha256 = sha256Text(transcriptBytes);

    const replayResultPath = resolve(repoRoot, replayResultAuthority.path);
    const replayResult = parseJsonRecord(
      readFileSync(replayResultPath, "utf8"),
    );
    const replayResultBytes =
      JSON.stringify({ ...replayResult, transcriptSha256 }) + "\n";
    writeFileSync(replayResultPath, replayResultBytes);

    const postPlayReviewPath = resolve(repoRoot, postPlayReviewAuthority.path);
    const postPlayReview = parseJsonRecord(
      readFileSync(postPlayReviewPath, "utf8"),
    );
    const postPlayReviewBytes =
      JSON.stringify({ ...postPlayReview, transcriptSha256 }) + "\n";
    writeFileSync(postPlayReviewPath, postPlayReviewBytes);

    const authorities = source.findings.authorities.map((authority) => {
      if (authority.role === "scenarioReview") {
        return {
          ...authority,
          byteLength: Buffer.byteLength(scenarioReviewBytes),
          sha256: scenarioReviewSha256,
        };
      }
      if (authority.role === "transcript") {
        return {
          ...authority,
          byteLength: Buffer.byteLength(transcriptBytes),
          sha256: transcriptSha256,
        };
      }
      if (authority.role === "review-1") {
        return {
          ...authority,
          byteLength: Buffer.byteLength(postPlayReviewBytes),
          sha256: sha256Text(postPlayReviewBytes),
        };
      }
      if (authority.role === "replayResult") {
        return {
          ...authority,
          byteLength: Buffer.byteLength(replayResultBytes),
          sha256: sha256Text(replayResultBytes),
        };
      }
      return authority;
    });
    const findingsSubject = {
      ...source.findings.subject,
      sdkCalls: {
        tag: "retainedTranscript" as const,
        transcriptSha256,
        callCount:
          source.findings.subject.sdkCalls.tag === "retainedTranscript"
            ? source.findings.subject.sdkCalls.callCount
            : 0,
      },
    };
    const findings = {
      ...source.findings,
      subject: findingsSubject,
      subjectIdentity: sha256Canonical(findingsSubject),
      authorities,
    };
    const validation = validateCompletePathMeasurement(
      withRetainedFindings(
        {
          ...source,
          stagePlan,
          stagePlanAuthority,
        },
        findings,
      ),
    );
    expect(Either.isRight(validation)).toBe(true);
  });
});
