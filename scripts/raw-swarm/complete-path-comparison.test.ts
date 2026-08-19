import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import { Either, Schema } from "effect";
import { afterEach, describe, expect, test } from "vitest";

import {
  assembleCompletePathMeasurement,
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
  compareCompleteEquivalentPaths,
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
import { capabilityContextSizeEstimate } from "./capability-context-size-estimate.ts";
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
): string => stagePlan.stages.find((entry) => entry.stage === stage)!.reason;
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
  const entry = {
    schemaVersion: 2,
    scenarioId,
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

function findingsProjection(
  root: string,
  findings: readonly ReturnType<typeof finding>[],
  replayEvents: readonly ReturnType<typeof retainInvocation>[] = [],
): CompletePathMeasurement["findings"] {
  const scenario = writeAuthority(root, "SCENARIO.md", scenarioBytes);
  const scenarioReview = writeAuthority(
    root,
    "SCENARIO_REVIEW.json",
    scenarioReviewBytes,
  );
  const initialSession = {};
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
  const calls = [1, 2].map((seq) => ({
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
    result: {},
    resultSha256: sha256Canonical({}),
  }));
  const transcriptHeader = {
    type: "sdk-player-header" as const,
    scenarioId,
    gitSha,
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
  };
  const transcript = writeAuthority(
    root,
    "transcript.jsonl",
    `${JSON.stringify(transcriptHeader)}\n${calls.map((call) => JSON.stringify(call)).join("\n")}\n`,
  );
  const review = writeAuthority(
    root,
    "review.json",
    `${JSON.stringify({
      scenarioId,
      gitSha,
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
    schemaVersion: 2 as const,
    phase: "scenarioCompositeReview" as const,
    reviewStage,
    scenarioId,
    sourceGitSha: gitSha,
    invocationId,
    model: "gpt-5.6-luna" as const,
    reasoningEffort: "max" as const,
    prompt: `Synthetic ${reviewStage} review prompt.`,
    outputJsonSchema: codexOutputJsonSchema(
      CurrentScenarioCompositeReviewSchema,
    ),
    result: compositeReview,
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
  const run = {
    scenarioId,
    gitSha,
    startedAt: "2026-08-14T00:00:00.000Z",
    transcriptSha256: transcript.sha256,
    callCount: calls.length,
  };
  return {
    type: "raw-swarm-findings",
    schemaVersion: 1,
    runIdentity: sha256Canonical(run),
    run,
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
    ],
    findings,
  };
}

function retainInvocation(root: string, entry: ReturnType<typeof invocation>) {
  const events = [
    {
      type: "raw-swarm.invocation.started",
      schemaVersion: 2,
      scenarioId: entry.scenarioId,
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
              text: JSON.stringify({ result: syntheticCompositeReview() }),
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
      schemaVersion: 2,
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
  },
) {
  const stagePlanReason =
    input.responsibility === "scenarioQuality"
      ? "The benchmark retained the historical quality pass."
      : "The benchmark retained redundant character preparation.";
  const started = benchmarkModelInvocationStartedEvent({
    scenarioId,
    gitSha,
    profile: "documentDeclarationSet",
    responsibility: input.responsibility,
    phase: input.phase,
    stagePlanReason,
    fallbackInvocationId: input.invocationId,
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
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
    gitSha,
    eventsSha256: authority.sha256,
    stagePlanReason,
    invocationId: input.invocationId,
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
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
    schemaVersion: 2,
    pathId: `same-path-${root}`,
    stagePlan,
    invocations,
    outcome: { tag: "completed" },
    ...overrides,
  };
  const retainedInvocations = base.invocations.map((entry) =>
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
  const result = {
    ...base,
    pathId: base.pathId,
    stagePlanAuthority,
    invocationLedgers: [invocationLedger],
    invocations: retainedInvocations.map(({ entry }) => entry),
    invocationEvents: retainedInvocations.map(({ authority }) => authority),
    findings: findingsProjection(
      root,
      [
        finding("accepted-call-verdict", 1),
        finding("successful-correction", 2),
      ],
      retainedInvocations,
    ),
  } satisfies CurrentCompletePathMeasurement;
  return result;
}

function benchmarkMeasurement(
  profile: "documentDeclarationSet" | "boundedCapabilityProjection",
  overrides: Partial<CurrentBenchmarkMeasurement> = {},
): CurrentBenchmarkMeasurement {
  const source = measurement();
  const root = resolve(repoRoot, source.stagePlanAuthority.path, "..");
  const scenario = source.findings.authorities.find(
    ({ role }) => role === "scenario",
  )!;
  const scenarioReview = source.findings.authorities.find(
    ({ role }) => role === "scenarioReview",
  )!;
  const authorityOnly = ({
    path,
    byteLength,
    sha256,
  }: (typeof source.findings.authorities)[number]) => ({
    path,
    byteLength,
    sha256,
  });
  const scenarioAuthority = authorityOnly(scenario);
  const scenarioReviewAuthority = authorityOnly(scenarioReview);
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
  const contextDocument = {
    schemaVersion: 1,
    profile,
    scenarioId,
    sources: [
      {
        role: "scenarioGeneration" as const,
        sourceKind: contextSourceKind,
        deliveryMode: contextDeliveryMode,
        authority: scenarioAuthority,
      },
      {
        role: "scenarioReview" as const,
        sourceKind: contextSourceKind,
        deliveryMode: contextDeliveryMode,
        authority: scenarioReviewAuthority,
      },
      {
        role: "characterAuthoring" as const,
        sourceKind: contextSourceKind,
        deliveryMode: contextDeliveryMode,
        authority: characters,
      },
      {
        role: "setupAuthoring" as const,
        sourceKind: contextSourceKind,
        deliveryMode: contextDeliveryMode,
        authority: setup,
      },
      {
        role: "player" as const,
        sourceKind: contextSourceKind,
        deliveryMode: contextDeliveryMode,
        authority: scenarioAuthority,
      },
      {
        role: "postPlayReview" as const,
        sourceKind: contextSourceKind,
        deliveryMode: contextDeliveryMode,
        authority: scenarioReviewAuthority,
      },
    ],
  };
  const contextSourceManifest = writeAuthority(
    root,
    "benchmark-context-sources.json",
    `${JSON.stringify(contextDocument)}\n`,
  );
  const canonicalRetained = source.invocations.map((entry) =>
    retainInvocation(root, entry),
  );
  const auxiliaryRetained =
    profile === "documentDeclarationSet"
      ? [
          retainBenchmarkAuxiliaryInvocation(root, {
            responsibility: "scenarioQuality",
            phase: "scenarioReadiness",
            invocationId: "benchmark-readiness",
          }),
          retainBenchmarkAuxiliaryInvocation(root, {
            responsibility: "redundantCharacterPreparation",
            phase: "scenarioCharacterAuthoring",
            invocationId: "benchmark-character-1",
          }),
          retainBenchmarkAuxiliaryInvocation(root, {
            responsibility: "redundantCharacterPreparation",
            phase: "scenarioCharacterAuthoring",
            invocationId: "benchmark-character-2",
          }),
        ]
      : [];
  const orderedRetained = [
    canonicalRetained[0]!,
    canonicalRetained[1]!,
    ...(profile === "documentDeclarationSet" ? [auxiliaryRetained[0]!] : []),
    canonicalRetained[2]!,
    ...(profile === "documentDeclarationSet"
      ? [auxiliaryRetained[1]!, auxiliaryRetained[2]!]
      : []),
    ...canonicalRetained.slice(3),
  ];
  const benchmarkLedger = writeAuthority(
    root,
    `benchmark-${profile}-invocations.jsonl`,
    `${orderedRetained.map(({ entry }) => JSON.stringify(entry)).join("\n")}\n`,
  );
  return {
    schemaVersion: 3,
    pathId: `benchmark-${profile}-${root}`,
    profile,
    scenarioId,
    scenarioBundle: {
      scenario: scenarioAuthority,
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
    findings: source.findings,
    outcome: source.outcome,
    ...overrides,
  };
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
    expect(validateCompletePathMeasurement({ ...source, findings })).toEqual(
      expect.objectContaining({ _tag: "Right" }),
    );
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
        acceptedCallVerdicts: { tag: "available", count: 1 },
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
      },
      elapsedMilliseconds: { tag: "comparable" },
      inputTokens: { tag: "comparable" },
    });
  });

  test("binds benchmark equivalence to an immutable scenario bundle and exposes profiles", () => {
    const baseline = benchmarkMeasurement("documentDeclarationSet");
    const candidate = benchmarkMeasurement("boundedCapabilityProjection", {
      pathId: "candidate-benchmark",
      scenarioBundle: baseline.scenarioBundle,
      stagePlan: baseline.stagePlan,
      findings: baseline.findings,
    });
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
      },
    });

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
    const baseline = validated(measurement());
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
    expect(parseJsonRecord(readFileSync(outputPath, "utf8"))).toMatchObject({
      schemaVersion: 2,
      identity: "equivalent-path",
      equivalence: { tag: "equivalent" },
    });

    const overwrite = writeCompletePathComparison({
      baseline,
      candidate,
      outputPath,
    });
    expect(overwrite).toMatchObject({ _tag: "Left" });
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
      elapsedMilliseconds: { tag: "incomparable" },
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
      pathId: "generated-battle-009",
      legacy: {
        schemaVersion: 1 as const,
        scenarioId: "generated-battle-009",
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
        acceptedCallVerdicts: { tag: "unavailable" },
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
        runIdentity: "e".repeat(64),
      },
    });
    expect(Either.isLeft(malformed)).toBe(true);
    if (Either.isRight(malformed)) return;
    expect(malformed.left).toContain("Findings authority");
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
      schemaVersion: 2,
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
    const findingsRun = {
      ...source.findings.run,
      transcriptSha256,
    };
    const findings = {
      ...source.findings,
      run: findingsRun,
      runIdentity: sha256Canonical(findingsRun),
      authorities,
    };
    const validation = validateCompletePathMeasurement({
      ...source,
      stagePlan,
      stagePlanAuthority,
      findings,
    });
    expect(Either.isRight(validation)).toBe(true);
  });
});
