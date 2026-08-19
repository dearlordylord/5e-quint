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
  parseCompletePathMeasurement,
  readCompletePathMeasurement,
  validateCompletePathMeasurement,
  writeCompletePathMeasurement,
  type CurrentCompletePathMeasurement,
  type CompletePathMeasurement,
  type ValidatedCompletePathMeasurement,
} from "./performance-comparison.ts";
import { capabilityContextSizeEstimate } from "./capability-context-size-estimate.ts";
import { planAdmittedScenarioStages } from "./scenario-stage-plan.ts";
import { rawSwarmTestOutputDirectory } from "./test-output.ts";
import {
  GitShaSchema,
  repoRoot,
  ScenarioIdSchema,
  sha256Canonical,
  sha256Text,
} from "./transcript.ts";

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

function findingsProjection(
  root: string,
  findings: readonly ReturnType<typeof finding>[],
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
    replaySupervisorSha256: "c".repeat(64),
    charactersSha256: "e".repeat(64),
    scenarioSha256: scenario.sha256,
    scenarioReviewSha256: scenarioReview.sha256,
    characterOutcome: "ready" as const,
    characterObservation: {},
    characterSheets,
    characterSheetsSha256,
    setupSha256: "f".repeat(64),
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
  const compositeReview = {
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
    findings: findingsProjection(root, [
      finding("accepted-call-verdict", 1),
      finding("successful-correction", 2),
    ]),
  } satisfies CurrentCompletePathMeasurement;
  return result;
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
        acceptedCalls: { tag: "available", count: 1 },
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
        acceptedCalls: { tag: "unavailable" },
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
    expect(scenarioReviewAuthority).toBeDefined();
    expect(transcriptAuthority).toBeDefined();
    expect(postPlayReviewAuthority).toBeDefined();
    if (
      scenarioReviewAuthority === undefined ||
      transcriptAuthority === undefined ||
      postPlayReviewAuthority === undefined
    )
      return;

    const priorGitSha = "b".repeat(40);
    const scenarioReviewPath = resolve(repoRoot, scenarioReviewAuthority.path);
    const reviewed = JSON.parse(readFileSync(scenarioReviewPath, "utf8")) as {
      readonly [key: string]: unknown;
    };
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
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    transcriptRecords[0] = {
      ...transcriptRecords[0],
      scenarioReviewSha256,
    };
    const transcriptBytes =
      transcriptRecords.map((record) => JSON.stringify(record)).join("\n") +
      "\n";
    writeFileSync(transcriptPath, transcriptBytes);
    const transcriptSha256 = sha256Text(transcriptBytes);

    const postPlayReviewPath = resolve(repoRoot, postPlayReviewAuthority.path);
    const postPlayReview = JSON.parse(
      readFileSync(postPlayReviewPath, "utf8"),
    ) as Record<string, unknown>;
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
