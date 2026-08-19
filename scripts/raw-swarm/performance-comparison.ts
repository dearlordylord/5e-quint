import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Either, ParseResult, Schema } from "effect";

import {
  artifactAuthority,
  ArtifactAuthoritySchema,
  readJsonLines,
  type ArtifactAuthority,
} from "./artifact-authority.ts";
import {
  BenchmarkAuxiliaryModelInvocationLedgerEntrySchema,
  benchmarkModelInvocationEvidenceFromEvents,
  parseBenchmarkModelInvocationLedgerEntry,
  type BenchmarkModelInvocationPhase,
  MODEL_INVOCATION_PHASES,
  CurrentModelInvocationLedgerEntrySchema,
  ModelInvocationIdentityFields,
  ModelInvocationLedgerEntrySchema,
  modelInvocationEvidenceFromEvents,
  parseModelInvocationLedgerEntry,
  readCodexEvents,
  type ModelInvocationLedgerEntry,
  type CurrentModelInvocationLedgerEntry,
  type ModelInvocationPhase,
  type ModelUsage,
  type TokenCount,
} from "./model-telemetry.ts";
import {
  FindingsProjectionSchema,
  validateFindingsProjection,
  type Finding,
  type FindingsProjection,
} from "./findings.ts";
import {
  BENCHMARK_CONTEXT_ROLES,
  BenchmarkContextDeliveryEvidenceSchema,
  benchmarkContextForRole,
  type BenchmarkContextRole,
} from "./benchmark-context.ts";
import { readReviewInvocationEvidenceManifest } from "./review-invocation-evidence.ts";
import {
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
  FinalScenarioReviewSchema,
  HistoricalScenarioCompositeReviewSchema,
  ScenarioQualityReviewSchema,
} from "./scenario-campaign.ts";
export {
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
  FinalScenarioReviewSchema,
  HistoricalScenarioCompositeReviewSchema,
};
import { RetainedScenarioReviewInputSchema } from "./scenario-review-input.ts";
import {
  finalAgentMessage,
  validateRetainedScenarioReviewInvocation,
} from "./review-invocation-binding.ts";
import {
  playerContinuationEvidence,
  PlayerRunStateSchema,
} from "./player-continuation-evidence.ts";
import { parseSdkTranscript } from "./sdk-player/sdk-transcript.ts";
import { reprojectSdkTranscriptTurns } from "./sdk-player/player-turn-projection.ts";
import { SdkReplayResultEvidenceSchema } from "./sdk-player/sdk-replay-result.ts";
import { ReviewOutputSchema } from "./review-contract.ts";
import {
  isJsonRecord,
  canonicalJson,
  GitShaSchema,
  repoRoot,
  ScenarioIdSchema,
  sha256Canonical,
  sha256Text,
  type GitSha,
} from "./transcript.ts";
import {
  ScenarioStagePlanSchema,
  ScenarioStageFactsSchema,
  type ScenarioStagePlan,
} from "./scenario-stage-plan.ts";

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));
const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);

const RunDescriptorSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  reviewInvocationEvidencePath: Schema.NonEmptyTrimmedString,
  continuationObservationPath: Schema.NonEmptyTrimmedString,
  supervisorTimingPath: Schema.NonEmptyTrimmedString,
  reportingTimingPath: Schema.NonEmptyTrimmedString,
  reportingManifestPath: Schema.NonEmptyTrimmedString,
});

const ReportingTimingSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  operations: Schema.Tuple(
    Schema.Literal("ingest"),
    Schema.Literal("review"),
    Schema.Literal("portableExport"),
  ),
  runId: Schema.Number.pipe(Schema.int(), Schema.positive()),
  transcriptSha256: HashSchema,
  reviewSha256: HashSchema,
  indexSha256: HashSchema,
  elapsedMilliseconds: NonNegativeIntegerSchema,
});

export const LegacyRunEvidenceSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  scenarioId: ScenarioIdSchema,
  scenarioSha256: HashSchema,
  scenarioReviewSha256: HashSchema,
  charactersSha256: HashSchema,
  setupSha256: HashSchema,
  calls: Schema.Number.pipe(Schema.int(), Schema.positive()),
  continuations: Schema.Number.pipe(Schema.int(), Schema.positive()),
  player: Schema.Struct({
    model: Schema.NonEmptyTrimmedString,
    reasoningEffort: Schema.NonEmptyTrimmedString,
    footerTokens: NonNegativeIntegerSchema,
    elapsedMilliseconds: NonNegativeIntegerSchema,
  }),
  postPlayReview: Schema.Struct({
    model: Schema.NonEmptyTrimmedString,
    reasoningEffort: Schema.NonEmptyTrimmedString,
    footerTokens: NonNegativeIntegerSchema,
    elapsedMilliseconds: NonNegativeIntegerSchema,
  }),
  wholePathElapsedMilliseconds: NonNegativeIntegerSchema,
});

type RunDescriptor = Schema.Schema.Type<typeof RunDescriptorSchema>;
export type LegacyRunEvidence = Schema.Schema.Type<
  typeof LegacyRunEvidenceSchema
>;

const UsageTotalsSchema = Schema.Struct({
  input: NonNegativeIntegerSchema,
  cachedInput: NonNegativeIntegerSchema,
  cacheWriteInput: NonNegativeIntegerSchema,
  output: NonNegativeIntegerSchema,
  reasoningOutput: NonNegativeIntegerSchema,
  inputPlusOutput: NonNegativeIntegerSchema,
});
type UsageTotals = Schema.Schema.Type<typeof UsageTotalsSchema>;

const PhaseSummarySchema = Schema.Struct({
  invocationCount: NonNegativeIntegerSchema,
  elapsedMilliseconds: NonNegativeIntegerSchema,
  models: Schema.Array(Schema.NonEmptyTrimmedString),
  reasoningEfforts: Schema.Array(Schema.NonEmptyTrimmedString),
  usage: Schema.Union(
    Schema.Struct({
      tag: Schema.Literal("available"),
      totals: UsageTotalsSchema,
    }),
    Schema.Struct({
      tag: Schema.Literal("unavailable"),
      reasons: Schema.Array(Schema.NonEmptyTrimmedString),
    }),
  ),
});
type PhaseSummary = Schema.Schema.Type<typeof PhaseSummarySchema>;

const NormalizedTokensSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("available"),
    perInvocation: Schema.Number.pipe(Schema.nonNegative()),
    perContinuation: Schema.Number.pipe(Schema.nonNegative()),
    perCall: Schema.Number.pipe(Schema.nonNegative()),
  }),
  Schema.Struct({ tag: Schema.Literal("unavailable") }),
);
type NormalizedTokens = Schema.Schema.Type<typeof NormalizedTokensSchema>;

const PhaseRecordSchema = Schema.Record({
  key: Schema.Literal(...MODEL_INVOCATION_PHASES),
  value: PhaseSummarySchema,
});
const SupervisorTimingSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  transcriptHeaderSha256: HashSchema,
  continuation: Schema.Number.pipe(Schema.int()),
  phases: Schema.Struct({
    continuationTypecheckMilliseconds: NonNegativeIntegerSchema,
    priorCallVerificationReplayMilliseconds: NonNegativeIntegerSchema,
    newSdkExecutionMilliseconds: NonNegativeIntegerSchema,
    evidenceWritingMilliseconds: NonNegativeIntegerSchema,
  }),
});
type SupervisorTiming = Schema.Schema.Type<typeof SupervisorTimingSchema>;

const ControlledRunPerformanceSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  telemetryAuthority: Schema.Literal("codex-json-events"),
  scenarioId: ScenarioIdSchema,
  scenarioSha256: HashSchema,
  scenarioReviewSha256: HashSchema,
  charactersSha256: HashSchema,
  setupSha256: HashSchema,
  calls: Schema.Number.pipe(Schema.int(), Schema.positive()),
  continuations: Schema.Number.pipe(Schema.int(), Schema.positive()),
  phases: PhaseRecordSchema,
  supervisor: Schema.Struct({
    continuationCount: Schema.Number.pipe(Schema.int(), Schema.positive()),
    typecheckMilliseconds: NonNegativeIntegerSchema,
    replayMilliseconds: NonNegativeIntegerSchema,
    sdkExecutionMilliseconds: NonNegativeIntegerSchema,
    evidenceWritingMilliseconds: NonNegativeIntegerSchema,
    nonModelMilliseconds: NonNegativeIntegerSchema,
    perContinuationMilliseconds: Schema.Number.pipe(Schema.nonNegative()),
    perCallMilliseconds: Schema.Number.pipe(Schema.nonNegative()),
    replayCacheDecision: Schema.Struct({
      cumulativeReplayMilliseconds: NonNegativeIntegerSchema,
      shareOfNonModelSupervisor: Schema.Number.pipe(Schema.between(0, 1)),
      admitted: Schema.Boolean,
    }),
  }),
  reportingElapsedMilliseconds: NonNegativeIntegerSchema,
  wholePathElapsedMilliseconds: NonNegativeIntegerSchema,
  comparablePathElapsedMilliseconds: NonNegativeIntegerSchema,
  unchangedControlElapsedMilliseconds: NonNegativeIntegerSchema,
  normalizedTokens: Schema.Struct({
    player: NormalizedTokensSchema,
    postPlayReview: NormalizedTokensSchema,
  }),
  sources: Schema.Struct({
    prePlayReviews: Schema.Tuple(
      Schema.Struct({
        reviewStage: Schema.Literal("milestone"),
        sourceInput: ArtifactAuthoritySchema,
        replayInput: ArtifactAuthoritySchema,
      }),
      Schema.Struct({
        reviewStage: Schema.Literal("final"),
        sourceInput: ArtifactAuthoritySchema,
        replayInput: ArtifactAuthoritySchema,
      }),
    ),
    reviewInvocationEvidence: ArtifactAuthoritySchema,
    transcript: ArtifactAuthoritySchema,
    review: ArtifactAuthoritySchema,
    invocationLedgers: Schema.Tuple(ArtifactAuthoritySchema),
    invocationEvents: Schema.NonEmptyArray(ArtifactAuthoritySchema),
    continuationObservations: ArtifactAuthoritySchema,
    supervisorTimings: ArtifactAuthoritySchema,
    reportingTiming: ArtifactAuthoritySchema,
    reportingManifest: ArtifactAuthoritySchema,
  }),
});

export type ControlledRunPerformance = Schema.Schema.Type<
  typeof ControlledRunPerformanceSchema
>;

function fail(message: string): never {
  throw new Error(message);
}

function ledgerEntry(value: unknown): ModelInvocationLedgerEntry {
  const parsed = parseModelInvocationLedgerEntry(value);
  return Either.isRight(parsed)
    ? parsed.right
    : fail("Invocation ledger entry is invalid.");
}

function phaseSummary(
  entries: readonly ModelInvocationLedgerEntry[],
  phase: ModelInvocationPhase,
): PhaseSummary {
  const selected = entries.filter((entry) => entry.phase === phase);
  const reasons = selected.flatMap(({ usage }) =>
    usage.tag === "unavailable" ? [usage.reason] : [],
  );
  const counters = selected.flatMap(({ usage }) => {
    if (usage.tag === "unavailable") return [];
    if (
      usage.input.tag === "unavailable" ||
      usage.cachedInput.tag === "unavailable" ||
      usage.cacheWriteInput.tag === "unavailable" ||
      usage.output.tag === "unavailable" ||
      usage.reasoningOutput.tag === "unavailable"
    )
      return [];
    return [
      {
        input: usage.input.count,
        cachedInput: usage.cachedInput.count,
        cacheWriteInput: usage.cacheWriteInput.count,
        output: usage.output.count,
        reasoningOutput: usage.reasoningOutput.count,
      },
    ];
  });
  const usage: PhaseSummary["usage"] =
    selected.length > 0 &&
    counters.length === selected.length &&
    reasons.length === 0
      ? {
          tag: "available",
          totals: counters.reduce<UsageTotals>(
            (total, value) => ({
              input: total.input + value.input,
              cachedInput: total.cachedInput + value.cachedInput,
              cacheWriteInput: total.cacheWriteInput + value.cacheWriteInput,
              output: total.output + value.output,
              reasoningOutput: total.reasoningOutput + value.reasoningOutput,
              inputPlusOutput:
                total.inputPlusOutput + value.input + value.output,
            }),
            {
              input: 0,
              cachedInput: 0,
              cacheWriteInput: 0,
              output: 0,
              reasoningOutput: 0,
              inputPlusOutput: 0,
            },
          ),
        }
      : {
          tag: "unavailable",
          reasons: [
            ...reasons,
            ...(selected.length === 0
              ? ["No invocation was recorded for this phase."]
              : []),
            ...(counters.length < selected.length && reasons.length === 0
              ? ["At least one token counter was unavailable."]
              : []),
          ],
        };
  return {
    invocationCount: selected.length,
    elapsedMilliseconds: selected.reduce(
      (total, entry) => total + entry.elapsedMilliseconds,
      0,
    ),
    models: [...new Set(selected.map(({ model }) => model))].sort(),
    reasoningEfforts: [
      ...new Set(selected.map(({ reasoningEffort }) => reasoningEffort)),
    ].sort(),
    usage,
  };
}

export function summarizeControlledRun(
  input: RunDescriptor,
): ControlledRunPerformance {
  const reviewInvocationEvidence = readReviewInvocationEvidenceManifest(
    input.reviewInvocationEvidencePath,
  );
  const transcriptPath = reviewInvocationEvidence.transcript.path;
  const reviewPath = reviewInvocationEvidence.review.path;
  const invocationLedgerPath =
    reviewInvocationEvidence.invocationLedgers[0].path;
  const transcript = parseSdkTranscript(readJsonLines(transcriptPath));
  if (transcript.tag === "invalid") fail(transcript.message);
  if (transcript.value.calls.length === 0)
    fail("Controlled performance requires a runnable SDK transcript.");
  const header = transcript.value.header;
  if (header.characterOutcome !== "ready" || header.setupOutcome !== "ready") {
    fail("Controlled performance requires a ready scenario setup artifact.");
  }
  const scenarioId = header.scenarioId;
  const scenarioSha256 = header.scenarioSha256;
  const scenarioReviewSha256 = header.scenarioReviewSha256;
  const charactersSha256 = header.charactersSha256;
  const setupSha256 = header.setupSha256;
  const calls = transcript.value.calls.length;
  const continuationEvidence = playerContinuationEvidence({
    transcriptHeaderSha256: sha256Canonical(transcript.value.header),
    observations: readJsonLines(input.continuationObservationPath),
    callContinuations: transcript.value.calls.map(
      ({ continuation }) => continuation,
    ),
  });
  if (continuationEvidence.tag === "invalid") {
    fail(continuationEvidence.message);
  }
  const continuations = Array.from(
    { length: continuationEvidence.recordedContinuations },
    (_value, index) => index + 1,
  );
  const entries = readJsonLines(invocationLedgerPath).map(ledgerEntry);
  const reportingTiming = decode(
    ReportingTimingSchema,
    input.reportingTimingPath,
  );
  const transcriptAuthority = artifactAuthority(transcriptPath);
  const reviewAuthority = artifactAuthority(reviewPath);
  const reviewInvocationEvidenceAuthority = artifactAuthority(
    input.reviewInvocationEvidencePath,
  );
  const reportingTimingAuthority = artifactAuthority(input.reportingTimingPath);
  const reportingManifestAuthority = artifactAuthority(
    input.reportingManifestPath,
  );
  const reportingManifest: unknown = JSON.parse(
    readFileSync(resolve(repoRoot, input.reportingManifestPath), "utf8"),
  );
  if (
    reportingTiming.transcriptSha256 !== transcriptAuthority.sha256 ||
    reportingTiming.reviewSha256 !== reviewAuthority.sha256 ||
    !isJsonRecord(reportingManifest) ||
    !isJsonRecord(reportingManifest.index) ||
    reportingManifest.index.sha256 !== reportingTiming.indexSha256 ||
    !Array.isArray(reportingManifest.artifacts) ||
    !reportingManifest.artifacts.some(
      (artifact) =>
        isJsonRecord(artifact) &&
        artifact.sha256 === reportingTimingAuthority.sha256 &&
        artifact.byteLength === reportingTimingAuthority.byteLength,
    )
  ) {
    fail("Controlled reporting timing does not match its run artifacts.");
  }
  const timingRows = readJsonLines(input.supervisorTimingPath);
  const timing = timingRows.map((value) => {
    const decoded = Schema.decodeUnknownEither(SupervisorTimingSchema, {
      onExcessProperty: "error",
    })(value);
    if (Either.isRight(decoded)) return decoded.right;
    return fail(
      isJsonRecord(value) && isJsonRecord(value.phases)
        ? "Supervisor timing row has invalid phase durations."
        : "Supervisor timing row is invalid.",
    );
  });
  const timedContinuations = timing
    .map(({ continuation }) => continuation)
    .sort((left, right) => left - right);
  if (
    timing.some(
      ({ transcriptHeaderSha256 }) =>
        transcriptHeaderSha256 !== sha256Canonical(transcript.value.header),
    ) ||
    new Set(timedContinuations).size !== timedContinuations.length ||
    JSON.stringify(timedContinuations) !== JSON.stringify(continuations)
  )
    fail(
      "Supervisor timings must cover every authoritative continuation observation exactly once.",
    );
  const sums: SupervisorTiming["phases"] = timing.reduce(
    (total, row) => ({
      continuationTypecheckMilliseconds:
        total.continuationTypecheckMilliseconds +
        row.phases.continuationTypecheckMilliseconds,
      priorCallVerificationReplayMilliseconds:
        total.priorCallVerificationReplayMilliseconds +
        row.phases.priorCallVerificationReplayMilliseconds,
      newSdkExecutionMilliseconds:
        total.newSdkExecutionMilliseconds +
        row.phases.newSdkExecutionMilliseconds,
      evidenceWritingMilliseconds:
        total.evidenceWritingMilliseconds +
        row.phases.evidenceWritingMilliseconds,
    }),
    {
      continuationTypecheckMilliseconds: 0,
      priorCallVerificationReplayMilliseconds: 0,
      newSdkExecutionMilliseconds: 0,
      evidenceWritingMilliseconds: 0,
    },
  );
  const phaseRecord = Schema.decodeUnknownEither(PhaseRecordSchema, {
    onExcessProperty: "error",
  })(
    Object.fromEntries(
      MODEL_INVOCATION_PHASES.map((phase) => [
        phase,
        phaseSummary(entries, phase),
      ]),
    ),
  );
  const phases = Either.isRight(phaseRecord)
    ? phaseRecord.right
    : fail(`Unable to construct model invocation phases: ${phaseRecord.left}`);
  if (continuations.length > 0 && phases.player.invocationCount === 0) {
    fail(
      "Recorded player continuations require at least one player invocation.",
    );
  }
  const modelElapsed = MODEL_INVOCATION_PHASES.reduce(
    (total, phase) => total + phases[phase].elapsedMilliseconds,
    0,
  );
  const unchangedControlElapsedMilliseconds = UNCHANGED_CONTROL_PHASES.reduce(
    (total, phase) => total + phases[phase].elapsedMilliseconds,
    0,
  );
  const comparableModelElapsedMilliseconds = COMPARABLE_PHASES.reduce(
    (total, phase) => total + phases[phase].elapsedMilliseconds,
    0,
  );
  const nonModelMilliseconds = Object.values(sums).reduce(
    (total, value) => total + value,
    0,
  );
  const normalized = (phase: PhaseSummary): NormalizedTokens =>
    phase.usage.tag === "available" && phase.invocationCount > 0
      ? {
          tag: "available",
          perInvocation:
            phase.usage.totals.inputPlusOutput / phase.invocationCount,
          perContinuation:
            phase.usage.totals.inputPlusOutput / continuations.length,
          perCall: phase.usage.totals.inputPlusOutput / calls,
        }
      : { tag: "unavailable" };
  return {
    schemaVersion: 1,
    telemetryAuthority: "codex-json-events",
    scenarioId,
    scenarioSha256,
    scenarioReviewSha256,
    charactersSha256,
    setupSha256,
    calls,
    continuations: continuations.length,
    phases,
    supervisor: {
      continuationCount: timing.length,
      typecheckMilliseconds: sums.continuationTypecheckMilliseconds,
      replayMilliseconds: sums.priorCallVerificationReplayMilliseconds,
      sdkExecutionMilliseconds: sums.newSdkExecutionMilliseconds,
      evidenceWritingMilliseconds: sums.evidenceWritingMilliseconds,
      nonModelMilliseconds,
      perContinuationMilliseconds: nonModelMilliseconds / continuations.length,
      perCallMilliseconds: nonModelMilliseconds / calls,
      replayCacheDecision: {
        cumulativeReplayMilliseconds:
          sums.priorCallVerificationReplayMilliseconds,
        shareOfNonModelSupervisor:
          nonModelMilliseconds === 0
            ? 0
            : sums.priorCallVerificationReplayMilliseconds /
              nonModelMilliseconds,
        admitted:
          sums.priorCallVerificationReplayMilliseconds >= 60_000 &&
          nonModelMilliseconds > 0 &&
          sums.priorCallVerificationReplayMilliseconds / nonModelMilliseconds >=
            0.1,
      },
    },
    reportingElapsedMilliseconds: reportingTiming.elapsedMilliseconds,
    wholePathElapsedMilliseconds:
      modelElapsed + nonModelMilliseconds + reportingTiming.elapsedMilliseconds,
    comparablePathElapsedMilliseconds:
      comparableModelElapsedMilliseconds +
      nonModelMilliseconds +
      reportingTiming.elapsedMilliseconds,
    unchangedControlElapsedMilliseconds,
    normalizedTokens: {
      player: normalized(phases.player),
      postPlayReview: normalized(phases.postPlayReview),
    },
    sources: {
      prePlayReviews: reviewInvocationEvidence.prePlayReviews,
      reviewInvocationEvidence: reviewInvocationEvidenceAuthority,
      transcript: transcriptAuthority,
      review: reviewAuthority,
      invocationLedgers: [artifactAuthority(invocationLedgerPath)],
      invocationEvents: reviewInvocationEvidence.invocationEvents,
      continuationObservations: artifactAuthority(
        input.continuationObservationPath,
      ),
      supervisorTimings: artifactAuthority(input.supervisorTimingPath),
      reportingTiming: reportingTimingAuthority,
      reportingManifest: reportingManifestAuthority,
    },
  };
}

export type PerformanceComparison = {
  readonly schemaVersion: 1;
  readonly identity: "same-scenario" | "different-scenario";
  readonly sample: {
    readonly baseline: {
      readonly calls: number;
      readonly continuations: number;
    };
    readonly fresh: { readonly calls: number; readonly continuations: number };
  };
  readonly reportedTokenTotals: {
    readonly baseline: {
      readonly authority: "codex-json-events" | "legacy-footer";
      readonly player: number | null;
      readonly postPlayReview: number | null;
      readonly comparablePath: number | null;
    };
    readonly fresh: {
      readonly authority: "codex-json-events";
      readonly player: number | null;
      readonly postPlayReview: number | null;
      readonly comparablePath: number | null;
    };
  };
  readonly reportedNormalizedTokens: {
    readonly baseline: {
      readonly player:
        | ControlledRunPerformance["normalizedTokens"]["player"]
        | null;
      readonly postPlayReview:
        | ControlledRunPerformance["normalizedTokens"]["postPlayReview"]
        | null;
      readonly comparablePath: NormalizedTokenValues | null;
    };
    readonly fresh: {
      readonly player: ControlledRunPerformance["normalizedTokens"]["player"];
      readonly postPlayReview: ControlledRunPerformance["normalizedTokens"]["postPlayReview"];
      readonly comparablePath: NormalizedTokenValues | null;
    };
  };
  readonly packetBasedPostPlayTokens:
    | {
        readonly tag: "comparable";
        readonly reduction: number;
        readonly passes: boolean;
      }
    | { readonly tag: "incomparable"; readonly reason: string };
  readonly packetBasedPostPlayWall:
    | {
        readonly tag: "comparable";
        readonly reduction: number;
        readonly passes: boolean;
      }
    | { readonly tag: "incomparable"; readonly reason: string };
  readonly comparablePathTokens:
    | {
        readonly tag: "comparable";
        readonly reduction: number;
        readonly passes: boolean;
      }
    | { readonly tag: "incomparable"; readonly reason: string };
  readonly comparablePathWall:
    | {
        readonly tag: "comparable";
        readonly reduction: number;
        readonly passes: boolean;
      }
    | { readonly tag: "incomparable"; readonly reason: string };
  readonly playerNormalizedTokens:
    | {
        readonly tag: "comparable";
        readonly perContinuationReduction: number;
        readonly perCallReduction: number;
        readonly passes: boolean;
      }
    | { readonly tag: "incomparable"; readonly reason: string };
};

type NormalizedTokenValues = Omit<
  Extract<NormalizedTokens, { readonly tag: "available" }>,
  "tag"
>;

function reduction(baseline: number, fresh: number): number {
  return baseline === 0 ? 0 : (baseline - fresh) / baseline;
}

function matchingPhase(
  baseline: PhaseSummary,
  fresh: PhaseSummary,
  requiredReduction: number,
): PerformanceComparison["packetBasedPostPlayTokens"] {
  if (
    baseline.usage.tag === "unavailable" ||
    fresh.usage.tag === "unavailable" ||
    JSON.stringify(baseline.models) !== JSON.stringify(fresh.models) ||
    JSON.stringify(baseline.reasoningEfforts) !==
      JSON.stringify(fresh.reasoningEfforts) ||
    baseline.invocationCount === 0 ||
    baseline.invocationCount !== fresh.invocationCount
  )
    return {
      tag: "incomparable",
      reason:
        "Token authority, model, reasoning effort, or invocation count differs.",
    };
  const value = reduction(
    baseline.usage.totals.inputPlusOutput,
    fresh.usage.totals.inputPlusOutput,
  );
  return {
    tag: "comparable",
    reduction: value,
    passes: value >= requiredReduction,
  };
}

const UNCHANGED_CONTROL_PHASES = [
  "scenarioGeneration",
  "scenarioCharacterAuthoring",
  "scenarioSetupNeutralAuthoring",
  "scenarioSetupControllerAuthoring",
] as const satisfies readonly ModelInvocationPhase[];

const COMPARABLE_PHASES = [
  "scenarioCompositeReview",
  "player",
  "postPlayReview",
] as const satisfies readonly ModelInvocationPhase[];

function comparablePhaseIdentityMatches(
  baseline: ControlledRunPerformance,
  fresh: ControlledRunPerformance,
): boolean {
  return COMPARABLE_PHASES.every(
    (phase) =>
      JSON.stringify(baseline.phases[phase].models) ===
        JSON.stringify(fresh.phases[phase].models) &&
      JSON.stringify(baseline.phases[phase].reasoningEfforts) ===
        JSON.stringify(fresh.phases[phase].reasoningEfforts) &&
      baseline.phases[phase].invocationCount > 0 &&
      fresh.phases[phase].invocationCount > 0,
  );
}

export function compareControlledRuns(
  baseline: ControlledRunPerformance | LegacyRunEvidence,
  fresh: ControlledRunPerformance,
): PerformanceComparison {
  const sameScenario =
    baseline.scenarioId === fresh.scenarioId &&
    baseline.scenarioSha256 === fresh.scenarioSha256 &&
    baseline.scenarioReviewSha256 === fresh.scenarioReviewSha256 &&
    baseline.charactersSha256 === fresh.charactersSha256 &&
    baseline.setupSha256 === fresh.setupSha256;
  const phaseTokens = (phase: PhaseSummary): number | null =>
    phase.usage.tag === "available" ? phase.usage.totals.inputPlusOutput : null;
  const controlledComparableTokens = (
    run: ControlledRunPerformance,
  ): number | null => {
    const values = COMPARABLE_PHASES.map((phase) =>
      phaseTokens(run.phases[phase]),
    );
    return values.some((value) => value === null)
      ? null
      : values.reduce<number>((total, value) => total + (value ?? 0), 0);
  };
  const controlledComparableNormalized = (
    run: ControlledRunPerformance,
  ): NormalizedTokenValues | null => {
    const total = controlledComparableTokens(run);
    const invocations = COMPARABLE_PHASES.reduce(
      (count, phase) => count + run.phases[phase].invocationCount,
      0,
    );
    return total === null || invocations === 0
      ? null
      : {
          perInvocation: total / invocations,
          perContinuation: total / run.continuations,
          perCall: total / run.calls,
        };
  };
  const sample = {
    baseline: { calls: baseline.calls, continuations: baseline.continuations },
    fresh: { calls: fresh.calls, continuations: fresh.continuations },
  };
  const freshTokenTotals = {
    authority: "codex-json-events",
    player: phaseTokens(fresh.phases.player),
    postPlayReview: phaseTokens(fresh.phases.postPlayReview),
    comparablePath: controlledComparableTokens(fresh),
  } satisfies PerformanceComparison["reportedTokenTotals"]["fresh"];
  if (!("telemetryAuthority" in baseline)) {
    const postPlayIdentityMatches =
      baseline.postPlayReview.model === fresh.phases.postPlayReview.models[0] &&
      fresh.phases.postPlayReview.models.length === 1 &&
      baseline.postPlayReview.reasoningEffort ===
        fresh.phases.postPlayReview.reasoningEfforts[0] &&
      fresh.phases.postPlayReview.reasoningEfforts.length === 1;
    const packetWallReduction = reduction(
      baseline.postPlayReview.elapsedMilliseconds,
      fresh.phases.postPlayReview.elapsedMilliseconds,
    );
    return {
      schemaVersion: 1,
      identity: sameScenario ? "same-scenario" : "different-scenario",
      sample,
      reportedTokenTotals: {
        baseline: {
          authority: "legacy-footer",
          player: baseline.player.footerTokens,
          postPlayReview: baseline.postPlayReview.footerTokens,
          comparablePath: null,
        },
        fresh: freshTokenTotals,
      },
      reportedNormalizedTokens: {
        baseline: {
          player: null,
          postPlayReview: null,
          comparablePath: null,
        },
        fresh: {
          player: fresh.normalizedTokens.player,
          postPlayReview: fresh.normalizedTokens.postPlayReview,
          comparablePath: controlledComparableNormalized(fresh),
        },
      },
      packetBasedPostPlayTokens: {
        tag: "incomparable",
        reason:
          "Legacy footer tokens are not first-party per-invocation JSON usage.",
      },
      packetBasedPostPlayWall:
        sameScenario && postPlayIdentityMatches
          ? {
              tag: "comparable",
              reduction: packetWallReduction,
              passes: packetWallReduction >= 0.5,
            }
          : {
              tag: "incomparable",
              reason: sameScenario
                ? "Post-play review model or reasoning effort differs."
                : "Scenario identity differs.",
            },
      comparablePathTokens: {
        tag: "incomparable",
        reason:
          "Legacy footer tokens are not first-party per-phase JSON usage.",
      },
      comparablePathWall: {
        tag: "incomparable",
        reason:
          "Legacy whole-path timing has no per-phase model identity or invocation-count authority.",
      },
      playerNormalizedTokens: {
        tag: "incomparable",
        reason:
          "Legacy footer tokens have no per-continuation or per-call authority.",
      },
    };
  }
  const phaseIdentityMatches = comparablePhaseIdentityMatches(baseline, fresh);
  const aggregateTokens = (
    run: ControlledRunPerformance,
  ): number | undefined => {
    const usage = COMPARABLE_PHASES.map((phase) => run.phases[phase].usage);
    return usage.some((entry) => entry.tag === "unavailable")
      ? undefined
      : usage.reduce(
          (total, entry) =>
            total +
            (entry.tag === "available" ? entry.totals.inputPlusOutput : 0),
          0,
        );
  };
  const baselinePathTokens = aggregateTokens(baseline);
  const freshPathTokens = aggregateTokens(fresh);
  const baselineNormalized = baseline.normalizedTokens.player;
  const freshNormalized = fresh.normalizedTokens.player;
  const postPlayIdentityMatches =
    baseline.phases.postPlayReview.invocationCount > 0 &&
    baseline.phases.postPlayReview.invocationCount ===
      fresh.phases.postPlayReview.invocationCount &&
    JSON.stringify(baseline.phases.postPlayReview.models) ===
      JSON.stringify(fresh.phases.postPlayReview.models) &&
    JSON.stringify(baseline.phases.postPlayReview.reasoningEfforts) ===
      JSON.stringify(fresh.phases.postPlayReview.reasoningEfforts);
  const playerIdentityMatches =
    baseline.phases.player.invocationCount > 0 &&
    fresh.phases.player.invocationCount > 0 &&
    JSON.stringify(baseline.phases.player.models) ===
      JSON.stringify(fresh.phases.player.models) &&
    JSON.stringify(baseline.phases.player.reasoningEfforts) ===
      JSON.stringify(fresh.phases.player.reasoningEfforts);
  return {
    schemaVersion: 1,
    identity: sameScenario ? "same-scenario" : "different-scenario",
    sample,
    reportedTokenTotals: {
      baseline: {
        authority: "codex-json-events",
        player: phaseTokens(baseline.phases.player),
        postPlayReview: phaseTokens(baseline.phases.postPlayReview),
        comparablePath: controlledComparableTokens(baseline),
      },
      fresh: freshTokenTotals,
    },
    reportedNormalizedTokens: {
      baseline: {
        player: baseline.normalizedTokens.player,
        postPlayReview: baseline.normalizedTokens.postPlayReview,
        comparablePath: controlledComparableNormalized(baseline),
      },
      fresh: {
        player: fresh.normalizedTokens.player,
        postPlayReview: fresh.normalizedTokens.postPlayReview,
        comparablePath: controlledComparableNormalized(fresh),
      },
    },
    packetBasedPostPlayTokens: sameScenario
      ? matchingPhase(
          baseline.phases.postPlayReview,
          fresh.phases.postPlayReview,
          0.5,
        )
      : { tag: "incomparable", reason: "Scenario identity differs." },
    packetBasedPostPlayWall:
      sameScenario && postPlayIdentityMatches
        ? {
            tag: "comparable",
            reduction: reduction(
              baseline.phases.postPlayReview.elapsedMilliseconds,
              fresh.phases.postPlayReview.elapsedMilliseconds,
            ),
            passes:
              reduction(
                baseline.phases.postPlayReview.elapsedMilliseconds,
                fresh.phases.postPlayReview.elapsedMilliseconds,
              ) >= 0.5,
          }
        : {
            tag: "incomparable",
            reason: sameScenario
              ? "Post-play review model, reasoning effort, or invocation count differs."
              : "Scenario identity differs.",
          },
    comparablePathTokens:
      sameScenario &&
      phaseIdentityMatches &&
      baselinePathTokens !== undefined &&
      freshPathTokens !== undefined
        ? {
            tag: "comparable",
            reduction: reduction(baselinePathTokens, freshPathTokens),
            passes: reduction(baselinePathTokens, freshPathTokens) >= 0.4,
          }
        : {
            tag: "incomparable",
            reason:
              sameScenario && phaseIdentityMatches
                ? "At least one comparable phase has unavailable token usage."
                : sameScenario
                  ? "Comparable phase model or reasoning effort differs."
                  : "Scenario identity differs.",
          },
    comparablePathWall:
      sameScenario && phaseIdentityMatches
        ? {
            tag: "comparable",
            reduction: reduction(
              baseline.comparablePathElapsedMilliseconds,
              fresh.comparablePathElapsedMilliseconds,
            ),
            passes:
              reduction(
                baseline.comparablePathElapsedMilliseconds,
                fresh.comparablePathElapsedMilliseconds,
              ) >= 0.4,
          }
        : {
            tag: "incomparable",
            reason: sameScenario
              ? "Comparable phase model or reasoning effort differs."
              : "Scenario identity differs.",
          },
    playerNormalizedTokens:
      sameScenario &&
      playerIdentityMatches &&
      baselineNormalized.tag === "available" &&
      freshNormalized.tag === "available"
        ? {
            tag: "comparable",
            perContinuationReduction: reduction(
              baselineNormalized.perContinuation,
              freshNormalized.perContinuation,
            ),
            perCallReduction: reduction(
              baselineNormalized.perCall,
              freshNormalized.perCall,
            ),
            passes:
              reduction(
                baselineNormalized.perContinuation,
                freshNormalized.perContinuation,
              ) >= 0.4 &&
              reduction(baselineNormalized.perCall, freshNormalized.perCall) >=
                0.4,
          }
        : {
            tag: "incomparable",
            reason: sameScenario
              ? "Player token normalization or invocation identity is unavailable."
              : "Scenario identity differs.",
          },
  };
}

function decode<A, I>(schema: Schema.Schema<A, I>, path: string): A {
  const decoded = Schema.decodeUnknownEither(schema, {
    onExcessProperty: "error",
  })(JSON.parse(readFileSync(resolve(repoRoot, path), "utf8")));
  return Either.isRight(decoded) ? decoded.right : fail(decoded.left.message);
}

export function readControlledPerformance(
  path: string,
): ControlledRunPerformance {
  const decoded = decode(ControlledRunPerformanceSchema, path);
  if (
    Object.keys(decoded.phases).length !== MODEL_INVOCATION_PHASES.length ||
    MODEL_INVOCATION_PHASES.some((phase) => decoded.phases[phase] === undefined)
  )
    fail(`Controlled performance evidence ${path} has incomplete phases.`);
  const run = decoded;
  if (run.continuations > 0 && run.phases.player.invocationCount === 0) {
    fail(
      "Recorded player continuations require at least one player invocation.",
    );
  }
  const sourceMatches = (source: ArtifactAuthority): boolean => {
    try {
      return (
        JSON.stringify(artifactAuthority(source.path)) ===
        JSON.stringify(source)
      );
    } catch {
      return false;
    }
  };
  const equal = (left: number, right: number) => Math.abs(left - right) < 1e-9;
  const phaseElapsed = MODEL_INVOCATION_PHASES.reduce(
    (total, phase) => total + run.phases[phase].elapsedMilliseconds,
    0,
  );
  const comparableElapsed = COMPARABLE_PHASES.reduce(
    (total, phase) => total + run.phases[phase].elapsedMilliseconds,
    run.supervisor.nonModelMilliseconds + run.reportingElapsedMilliseconds,
  );
  const controlElapsed = UNCHANGED_CONTROL_PHASES.reduce(
    (total, phase) => total + run.phases[phase].elapsedMilliseconds,
    0,
  );
  const normalizedMatches = (
    phase: PhaseSummary,
    value: ControlledRunPerformance["normalizedTokens"]["player"],
  ) =>
    phase.usage.tag === "unavailable" || phase.invocationCount === 0
      ? value.tag === "unavailable"
      : value.tag === "available" &&
        equal(
          value.perInvocation,
          phase.usage.totals.inputPlusOutput / phase.invocationCount,
        ) &&
        equal(
          value.perContinuation,
          phase.usage.totals.inputPlusOutput / run.continuations,
        ) &&
        equal(value.perCall, phase.usage.totals.inputPlusOutput / run.calls);
  if (
    run.sources.prePlayReviews.some(
      ({ sourceInput, replayInput }) =>
        !sourceMatches(sourceInput) || !sourceMatches(replayInput),
    ) ||
    !sourceMatches(run.sources.reviewInvocationEvidence) ||
    !sourceMatches(run.sources.transcript) ||
    !sourceMatches(run.sources.review) ||
    run.sources.invocationLedgers.some((source) => !sourceMatches(source)) ||
    run.sources.invocationEvents.length === 0 ||
    run.sources.invocationEvents.some((source) => !sourceMatches(source)) ||
    !sourceMatches(run.sources.continuationObservations) ||
    !sourceMatches(run.sources.supervisorTimings) ||
    !sourceMatches(run.sources.reportingTiming) ||
    !sourceMatches(run.sources.reportingManifest) ||
    MODEL_INVOCATION_PHASES.some((phase) => {
      const summary = run.phases[phase];
      return (
        (summary.invocationCount === 0 &&
          (summary.models.length !== 0 ||
            summary.reasoningEfforts.length !== 0)) ||
        (summary.invocationCount > 0 &&
          (summary.models.length === 0 ||
            summary.reasoningEfforts.length === 0)) ||
        (summary.usage.tag === "available" &&
          summary.usage.totals.inputPlusOutput !==
            summary.usage.totals.input + summary.usage.totals.output)
      );
    }) ||
    run.supervisor.continuationCount !== run.continuations ||
    !equal(
      run.supervisor.perContinuationMilliseconds,
      run.supervisor.nonModelMilliseconds / run.continuations,
    ) ||
    !equal(
      run.supervisor.perCallMilliseconds,
      run.supervisor.nonModelMilliseconds / run.calls,
    ) ||
    !equal(
      run.wholePathElapsedMilliseconds,
      phaseElapsed +
        run.supervisor.nonModelMilliseconds +
        run.reportingElapsedMilliseconds,
    ) ||
    !equal(run.comparablePathElapsedMilliseconds, comparableElapsed) ||
    !equal(run.unchangedControlElapsedMilliseconds, controlElapsed) ||
    !equal(
      run.supervisor.replayCacheDecision.shareOfNonModelSupervisor,
      run.supervisor.nonModelMilliseconds === 0
        ? 0
        : run.supervisor.replayMilliseconds /
            run.supervisor.nonModelMilliseconds,
    ) ||
    run.supervisor.replayCacheDecision.cumulativeReplayMilliseconds !==
      run.supervisor.replayMilliseconds ||
    run.supervisor.replayCacheDecision.admitted !==
      (run.supervisor.replayMilliseconds >= 60_000 &&
        run.supervisor.nonModelMilliseconds > 0 &&
        run.supervisor.replayMilliseconds /
          run.supervisor.nonModelMilliseconds >=
          0.1) ||
    !normalizedMatches(run.phases.player, run.normalizedTokens.player) ||
    !normalizedMatches(
      run.phases.postPlayReview,
      run.normalizedTokens.postPlayReview,
    )
  )
    fail(
      `Controlled performance evidence ${path} has inconsistent derivations.`,
    );
  const recomputed = summarizeControlledRun({
    schemaVersion: 1,
    reviewInvocationEvidencePath: run.sources.reviewInvocationEvidence.path,
    continuationObservationPath: run.sources.continuationObservations.path,
    supervisorTimingPath: run.sources.supervisorTimings.path,
    reportingTimingPath: run.sources.reportingTiming.path,
    reportingManifestPath: run.sources.reportingManifest.path,
  });
  if (JSON.stringify(recomputed) !== JSON.stringify(run)) {
    fail(`Controlled performance evidence ${path} changed from its sources.`);
  }
  return run;
}

export const PathOutcomeSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("completed") }),
  Schema.Struct({
    tag: Schema.Literal("failed"),
    reason: Schema.NonEmptyTrimmedString,
  }),
);
const UnavailableEvidenceSchema = Schema.Struct({
  tag: Schema.Literal("unavailable"),
  reason: Schema.NonEmptyTrimmedString,
});
export const COMPLETE_PATH_PHASE_STAGE = [
  {
    phases: ["scenarioGeneration"],
    stage: "scenarioGeneration",
    countPolicy: "oneOrMore",
    orderGroup: "prePlayAdmission",
  },
  {
    phases: ["scenarioCompositeReview"],
    stage: "scenarioCompositeReview",
    countPolicy: "exactlyTwo",
    orderGroup: "prePlayAdmission",
  },
  {
    phases: ["scenarioCharacterAuthoring"],
    stage: "scenarioCharacterAuthoring",
    countPolicy: "exactlyOne",
    orderGroup: "characterAuthoring",
  },
  {
    phases: [
      "scenarioSetupNeutralAuthoring",
      "scenarioSetupControllerAuthoring",
    ],
    stage: "scenarioSetupAuthoring",
    countPolicy: "exactlyTwo",
    orderGroup: "setupAuthoring",
  },
  {
    phases: ["player"],
    stage: "player",
    countPolicy: "exactlyOne",
    orderGroup: "player",
  },
  {
    phases: ["postPlayReview"],
    stage: "postPlayReview",
    countPolicy: "exactlyOne",
    orderGroup: "postPlayReview",
  },
] as const;
type CompletePathPhaseStage = (typeof COMPLETE_PATH_PHASE_STAGE)[number];
type CompletePathStageName = CompletePathPhaseStage["stage"];
type CompletePathPhase = CompletePathPhaseStage["phases"][number];
export const COMPLETE_PATH_ORDER_GROUPS = [
  "prePlayAdmission",
  "characterAuthoring",
  "setupAuthoring",
  "player",
  "postPlayReview",
] as const;
type CompletePathOrderGroup = (typeof COMPLETE_PATH_ORDER_GROUPS)[number];
const COMPLETE_PATH_EXACTLY_TWO_DESCRIPTIONS = {
  scenarioCompositeReview: "one milestone and one final",
  scenarioSetupAuthoring: "one neutral and one controller",
} as const satisfies Partial<Record<CompletePathStageName, string>>;

function completePathOrderForPhase(phase: CompletePathPhase): number {
  const mapping = COMPLETE_PATH_PHASE_STAGE.find(({ phases }) =>
    phases.some((candidate) => candidate === phase),
  );
  if (mapping === undefined) {
    return fail(`Complete-path phase has no order group: ${phase}`);
  }
  const group: CompletePathOrderGroup = mapping.orderGroup;
  const order = COMPLETE_PATH_ORDER_GROUPS.indexOf(group);
  if (order < 0) {
    return fail(`Complete-path order group is not canonical: ${group}`);
  }
  return order;
}

/**
 * Current complete-path evidence composes canonical authorities. It does not
 * introduce another per-invocation phase, result, elapsed-time, or usage
 * schema.
 */
const CurrentCompletePathMeasurementSchema = Schema.Struct({
  schemaVersion: Schema.Literal(2),
  pathId: Schema.NonEmptyTrimmedString,
  stagePlan: ScenarioStagePlanSchema,
  stagePlanAuthority: ArtifactAuthoritySchema,
  invocationLedgers: Schema.NonEmptyArray(ArtifactAuthoritySchema),
  invocations: Schema.Array(CurrentModelInvocationLedgerEntrySchema),
  invocationEvents: Schema.NonEmptyArray(ArtifactAuthoritySchema),
  findings: FindingsProjectionSchema,
  outcome: PathOutcomeSchema,
});

export const BENCHMARK_IMPLEMENTATION_PROFILES = [
  "documentDeclarationSet",
  "boundedCapabilityProjection",
] as const;
export type BenchmarkImplementationProfile =
  (typeof BENCHMARK_IMPLEMENTATION_PROFILES)[number];
const BenchmarkImplementationProfileSchema = Schema.Literal(
  ...BENCHMARK_IMPLEMENTATION_PROFILES,
);
const ImplementationGitShaSchema = GitShaSchema;

export const BENCHMARK_READINESS_AUTHORITY_ROLES = {
  source: "prePlayReviewReadinessSource",
  result: "prePlayReviewReadinessResult",
  events: "prePlayReviewReadinessEvents",
} as const;

export const BenchmarkReadinessInputSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  profile: Schema.Literal("documentDeclarationSet"),
  ...ModelInvocationIdentityFields,
  model: Schema.Literal("gpt-5.6-luna"),
  reasoningEffort: Schema.Literal("max"),
  responsibility: Schema.Literal("scenarioQuality"),
  phase: Schema.Literal("scenarioReadiness"),
  sourceGitSha: GitShaSchema,
  prompt: Schema.NonEmptyString,
  outputJsonSchema: Schema.Unknown,
  result: ScenarioQualityReviewSchema,
});
export type BenchmarkReadinessInput = Schema.Schema.Type<
  typeof BenchmarkReadinessInputSchema
>;

export const BenchmarkScenarioBundleSchema = Schema.Struct({
  scenario: ArtifactAuthoritySchema,
  scenarioReview: ArtifactAuthoritySchema,
  stageFacts: ArtifactAuthoritySchema,
  stagePlan: ArtifactAuthoritySchema,
  characters: ArtifactAuthoritySchema,
  setup: ArtifactAuthoritySchema,
});
export type BenchmarkScenarioBundle = Schema.Schema.Type<
  typeof BenchmarkScenarioBundleSchema
>;

/** Retained preparation identity used to bind every later benchmark artifact. */
export const BenchmarkRunDescriptorSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  runId: Schema.NonEmptyTrimmedString,
  profile: BenchmarkImplementationProfileSchema,
  scenarioId: ScenarioIdSchema,
  implementationGitSha: ImplementationGitShaSchema,
  scenarioBundle: BenchmarkScenarioBundleSchema,
  contextManifest: ArtifactAuthoritySchema,
});
export type BenchmarkRunDescriptor = Schema.Schema.Type<
  typeof BenchmarkRunDescriptorSchema
>;

const BENCHMARK_CONTEXT_SOURCE_ROLES = BENCHMARK_CONTEXT_ROLES;
type BenchmarkContextSourceKind = "declarationSet" | "capabilityProjection";
type BenchmarkContextDeliveryMode = "document" | "roleProjection";

function benchmarkContextSourceManifestEntrySchema<
  Role extends BenchmarkContextRole,
  SourceKind extends BenchmarkContextSourceKind,
  DeliveryMode extends BenchmarkContextDeliveryMode,
>(role: Role, sourceKind: SourceKind, deliveryMode: DeliveryMode) {
  return Schema.Struct({
    role: Schema.Literal(role),
    sourceKind: Schema.Literal(sourceKind),
    deliveryMode: Schema.Literal(deliveryMode),
    authority: ArtifactAuthoritySchema,
  });
}

function benchmarkContextSourceManifestSourcesSchema<
  SourceKind extends BenchmarkContextSourceKind,
  DeliveryMode extends BenchmarkContextDeliveryMode,
>(sourceKind: SourceKind, deliveryMode: DeliveryMode) {
  return Schema.Tuple(
    benchmarkContextSourceManifestEntrySchema(
      BENCHMARK_CONTEXT_SOURCE_ROLES[0],
      sourceKind,
      deliveryMode,
    ),
    benchmarkContextSourceManifestEntrySchema(
      BENCHMARK_CONTEXT_SOURCE_ROLES[1],
      sourceKind,
      deliveryMode,
    ),
    benchmarkContextSourceManifestEntrySchema(
      BENCHMARK_CONTEXT_SOURCE_ROLES[2],
      sourceKind,
      deliveryMode,
    ),
    benchmarkContextSourceManifestEntrySchema(
      BENCHMARK_CONTEXT_SOURCE_ROLES[3],
      sourceKind,
      deliveryMode,
    ),
    benchmarkContextSourceManifestEntrySchema(
      BENCHMARK_CONTEXT_SOURCE_ROLES[4],
      sourceKind,
      deliveryMode,
    ),
    benchmarkContextSourceManifestEntrySchema(
      BENCHMARK_CONTEXT_SOURCE_ROLES[5],
      sourceKind,
      deliveryMode,
    ),
  );
}

const BenchmarkContextSourceManifestCommonFields = {
  schemaVersion: Schema.Literal(1),
  scenarioId: ScenarioIdSchema,
} as const;

const BenchmarkDocumentDeclarationSetSourceManifestSchema = Schema.Struct({
  ...BenchmarkContextSourceManifestCommonFields,
  profile: Schema.Literal("documentDeclarationSet"),
  sources: benchmarkContextSourceManifestSourcesSchema(
    "declarationSet",
    "document",
  ),
});

const BenchmarkBoundedCapabilityProjectionSourceManifestSchema = Schema.Struct({
  ...BenchmarkContextSourceManifestCommonFields,
  profile: Schema.Literal("boundedCapabilityProjection"),
  sources: benchmarkContextSourceManifestSourcesSchema(
    "capabilityProjection",
    "roleProjection",
  ),
});

export const BenchmarkContextSourceManifestDocumentSchema = Schema.Union(
  BenchmarkDocumentDeclarationSetSourceManifestSchema,
  BenchmarkBoundedCapabilityProjectionSourceManifestSchema,
);
export type BenchmarkContextSourceManifestDocument = Schema.Schema.Type<
  typeof BenchmarkContextSourceManifestDocumentSchema
>;

export const BenchmarkInvocationSchema = Schema.Union(
  CurrentModelInvocationLedgerEntrySchema,
  BenchmarkAuxiliaryModelInvocationLedgerEntrySchema,
);
export type BenchmarkInvocation = Schema.Schema.Type<
  typeof BenchmarkInvocationSchema
>;

const BenchmarkMeasurementCommonFields = {
  schemaVersion: Schema.Literal(3),
  pathId: Schema.NonEmptyTrimmedString,
  scenarioId: ScenarioIdSchema,
  implementationGitSha: ImplementationGitShaSchema,
  scenarioBundle: BenchmarkScenarioBundleSchema,
  contextSourceManifest: ArtifactAuthoritySchema,
  stagePlan: ScenarioStagePlanSchema,
  invocationLedgers: Schema.NonEmptyArray(ArtifactAuthoritySchema),
  invocationEvents: Schema.NonEmptyArray(ArtifactAuthoritySchema),
  findings: FindingsProjectionSchema,
  outcome: PathOutcomeSchema,
} as const;

const BaselineBenchmarkMeasurementSchema = Schema.Struct({
  ...BenchmarkMeasurementCommonFields,
  profile: Schema.Literal("documentDeclarationSet"),
  invocations: Schema.NonEmptyArray(
    Schema.Union(
      CurrentModelInvocationLedgerEntrySchema,
      BenchmarkAuxiliaryModelInvocationLedgerEntrySchema,
    ),
  ),
});

const BoundedBenchmarkMeasurementSchema = Schema.Struct({
  ...BenchmarkMeasurementCommonFields,
  profile: Schema.Literal("boundedCapabilityProjection"),
  invocations: Schema.NonEmptyArray(CurrentModelInvocationLedgerEntrySchema),
});

/**
 * A benchmark envelope binds two implementation profiles to the same
 * immutable scenario bundle while allowing the baseline's historical
 * auxiliary invocations to remain visible as separate telemetry rows.
 */
export const CurrentBenchmarkMeasurementSchema = Schema.Union(
  BaselineBenchmarkMeasurementSchema,
  BoundedBenchmarkMeasurementSchema,
);
export type CurrentBenchmarkMeasurement = Schema.Schema.Type<
  typeof CurrentBenchmarkMeasurementSchema
>;

/**
 * Paths are assembled from retained authority files, not copied ledger rows
 * supplied by a caller. The assembler hashes and decodes each named source,
 * composes the canonical entries, and then passes the result through the same
 * validator used by comparison.
 */
export const CompletePathAssemblyDescriptorSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  pathId: Schema.NonEmptyTrimmedString,
  stagePlanPath: Schema.NonEmptyTrimmedString,
  findingsPath: Schema.NonEmptyTrimmedString,
  invocationLedgerPaths: Schema.NonEmptyArray(Schema.NonEmptyTrimmedString),
  invocationEventPaths: Schema.NonEmptyArray(Schema.NonEmptyTrimmedString),
  outcome: PathOutcomeSchema,
});
export type CompletePathAssemblyDescriptor = Schema.Schema.Type<
  typeof CompletePathAssemblyDescriptorSchema
>;

/**
 * Historical runs, including generated-battle-009, predate the current stage
 * plan and v2 ledger. Their absent authorities are represented explicitly;
 * no v2 stage plan, reason, result, or finding is fabricated for comparison.
 */
const HistoricalCompletePathMeasurementSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  pathId: Schema.NonEmptyTrimmedString,
  legacy: LegacyRunEvidenceSchema,
  stagePlan: UnavailableEvidenceSchema,
  invocations: Schema.Union(
    UnavailableEvidenceSchema,
    // Historical v1 entries remain parseable through the canonical versioned
    // ledger union. No second telemetry declaration is maintained here.
    Schema.Array(ModelInvocationLedgerEntrySchema),
  ),
  findings: UnavailableEvidenceSchema,
  outcome: UnavailableEvidenceSchema,
});

export const CompletePathMeasurementSchema = Schema.Union(
  HistoricalCompletePathMeasurementSchema,
  CurrentCompletePathMeasurementSchema,
  CurrentBenchmarkMeasurementSchema,
);
export type CompletePathMeasurement = Schema.Schema.Type<
  typeof CompletePathMeasurementSchema
>;
const completePathMeasurementValidated: unique symbol = Symbol(
  "completePathMeasurementValidated",
);
export type ValidatedCompletePathMeasurement = CompletePathMeasurement & {
  readonly [completePathMeasurementValidated]: true;
};
export type CurrentCompletePathMeasurement = Schema.Schema.Type<
  typeof CurrentCompletePathMeasurementSchema
>;
type HistoricalCompletePathMeasurement = Schema.Schema.Type<
  typeof HistoricalCompletePathMeasurementSchema
>;
type UnavailableEvidence = Schema.Schema.Type<typeof UnavailableEvidenceSchema>;
type EvidenceCount =
  | { readonly tag: "available"; readonly count: number }
  | UnavailableEvidence;
type EvidenceList =
  | { readonly tag: "available"; readonly values: readonly string[] }
  | UnavailableEvidence;
export type PathOutcome = Schema.Schema.Type<typeof PathOutcomeSchema>;

/**
 * The frozen-prefix authority is written by the SDK supervisor after every
 * accepted continuation. Keep this boundary identical to the production
 * authority; decoding only its nested `run` would allow a forged terminal
 * state to ignore the frozen program bytes and continuation count.
 */
const BenchmarkFrozenPrefixSchema = Schema.Struct({
  frozenByteLength: NonNegativeIntegerSchema,
  frozenSha256: HashSchema,
  continuationCount: NonNegativeIntegerSchema,
  run: PlayerRunStateSchema,
});

const BenchmarkFinalArtifactSchema = Schema.Struct({
  transcriptHeaderSha256: HashSchema,
  continuation: Schema.Number.pipe(Schema.int(), Schema.greaterThan(0)),
  kind: Schema.Literal("playerConcluded"),
  projection: Schema.Unknown,
  tacticalNote: Schema.String,
  conclusion: Schema.NonEmptyTrimmedString,
});

/**
 * Derive the player path outcome from the two retained execution authorities.
 * A terminal state without a call, or without its final artifact, is retained
 * as a failed path rather than being promoted to a completed measurement.
 */
export function deriveBenchmarkPathOutcome(input: {
  readonly transcriptPath: string;
  readonly frozenPrefixPath: string;
  readonly continuationObservationPath: string;
  readonly finalArtifactPath?: string;
}): Either.Either<PathOutcome, string> {
  try {
    const transcript = parseSdkTranscript(readJsonLines(input.transcriptPath));
    if (transcript.tag === "invalid") {
      return Either.left(
        `Benchmark player transcript is invalid: ${transcript.message}`,
      );
    }
    const frozenPrefix = Schema.decodeUnknownEither(
      BenchmarkFrozenPrefixSchema,
      { onExcessProperty: "error" },
    )(
      JSON.parse(
        readFileSync(resolve(repoRoot, input.frozenPrefixPath), "utf8"),
      ),
    );
    if (Either.isLeft(frozenPrefix)) {
      return Either.left(
        `Benchmark frozen-prefix evidence is invalid: ${frozenPrefix.left.message}`,
      );
    }
    const prefix = frozenPrefix.right;
    const observations = readJsonLines(input.continuationObservationPath);
    const continuationEvidence = playerContinuationEvidence({
      transcriptHeaderSha256: sha256Canonical(transcript.value.header),
      observations,
      callContinuations: transcript.value.calls.map(
        ({ continuation }) => continuation,
      ),
    });
    if (continuationEvidence.tag === "invalid") {
      return Either.left(
        `Benchmark player continuation evidence is invalid: ${continuationEvidence.message}`,
      );
    }
    const programPath = resolve(
      dirname(resolve(repoRoot, input.frozenPrefixPath)),
      "program.ts",
    );
    if (!existsSync(programPath)) {
      return Either.left(
        "Benchmark frozen-prefix evidence has no retained program authority.",
      );
    }
    const program = readFileSync(programPath);
    if (
      program.byteLength !== prefix.frozenByteLength ||
      sha256Text(program.toString("utf8")) !== prefix.frozenSha256
    ) {
      return Either.left(
        "Benchmark frozen-prefix evidence is not bound to the retained program authority.",
      );
    }

    const finalArtifactExists =
      input.finalArtifactPath !== undefined &&
      existsSync(resolve(repoRoot, input.finalArtifactPath));
    const concluded = prefix.run.kind === "playerConcluded";
    if (concluded !== finalArtifactExists) {
      return Either.left("Player terminal state and final artifact disagree.");
    }

    const greatestContinuation = transcript.value.calls.reduce(
      (greatest, call) => Math.max(greatest, call.continuation),
      0,
    );
    if (
      continuationEvidence.recordedContinuations !== prefix.continuationCount ||
      continuationEvidence.lastContinuation !==
        (prefix.continuationCount === 0 ? undefined : prefix.continuationCount)
    ) {
      return Either.left(
        "Benchmark player continuation evidence must cover every contiguous continuation through the frozen-prefix count.",
      );
    }
    const expectedContinuations = Array.from(
      { length: prefix.continuationCount },
      (_, index) => index + 1,
    );
    const recordedCallContinuations = new Set(
      transcript.value.calls.map(({ continuation }) => continuation),
    );
    if (
      transcript.value.calls.length > 0 &&
      (greatestContinuation !== prefix.continuationCount ||
        expectedContinuations.some(
          (continuation) => !recordedCallContinuations.has(continuation),
        ))
    ) {
      return Either.left(
        "Benchmark failed player evidence must retain exact continuation coverage for its transcript.",
      );
    }
    if (prefix.run.kind === "playerObstructed") {
      return Either.right({
        tag: "failed",
        reason: prefix.run.obstruction.message,
      });
    }
    if (prefix.run.kind === "active") {
      return Either.right({
        tag: "failed",
        reason:
          "Player execution ended without a playerConcluded terminal state.",
      });
    }
    if (transcript.value.calls.length === 0) {
      return Either.right({
        tag: "failed",
        reason:
          "Player terminal evidence claims playerConcluded without an SDK call.",
      });
    }
    const finalObservation = observations.at(-1);
    if (
      !isJsonRecord(finalObservation) ||
      typeof finalObservation.continuation !== "number" ||
      !Number.isInteger(finalObservation.continuation) ||
      typeof finalObservation.kind !== "string"
    ) {
      return Either.left(
        "Benchmark player continuation evidence has no valid terminal observation.",
      );
    }
    if (
      finalObservation.continuation !== prefix.continuationCount ||
      finalObservation.kind !== "playerConcluded"
    ) {
      return Either.left(
        "Benchmark terminal observation is not bound to the last contiguous continuation.",
      );
    }
    if (input.finalArtifactPath === undefined) {
      return Either.left(
        "Player terminal evidence claims playerConcluded without a final artifact.",
      );
    }

    const finalArtifact = Schema.decodeUnknownEither(
      BenchmarkFinalArtifactSchema,
      { onExcessProperty: "error" },
    )(
      JSON.parse(
        readFileSync(resolve(repoRoot, input.finalArtifactPath), "utf8"),
      ),
    );
    if (Either.isLeft(finalArtifact)) {
      return Either.left(
        `Benchmark final player artifact is invalid: ${finalArtifact.left.message}`,
      );
    }
    const final = finalArtifact.right;
    const transcriptHeaderSha256 = sha256Canonical(transcript.value.header);
    if (final.transcriptHeaderSha256 !== transcriptHeaderSha256) {
      return Either.left(
        "Benchmark final player artifact is not bound to the retained transcript header.",
      );
    }
    if (
      final.continuation !== prefix.continuationCount ||
      final.continuation !== greatestContinuation ||
      final.conclusion !== prefix.run.conclusion ||
      finalObservation.kind !== "playerConcluded" ||
      finalObservation.transcriptHeaderSha256 !== transcriptHeaderSha256 ||
      finalObservation.tacticalNote !== final.tacticalNote ||
      canonicalJson(finalObservation.projection) !==
        canonicalJson(final.projection) ||
      finalObservation.conclusion !== final.conclusion
    ) {
      return Either.left(
        "Benchmark final player artifact is not bound to the terminal state or transcript continuation.",
      );
    }
    const projected = reprojectSdkTranscriptTurns({
      calls: transcript.value.calls,
      holeEvidenceSource: { kind: "recordedCurrentRuntime" },
    });
    if (projected.tag === "invalid") {
      return Either.left(
        `Benchmark player transcript cannot produce the canonical terminal projection: ${projected.message}`,
      );
    }
    const terminalProjection = projected.projections.at(-1);
    if (
      terminalProjection === undefined ||
      canonicalJson(final.projection) !== canonicalJson(terminalProjection)
    ) {
      return Either.left(
        "Benchmark final player artifact projection does not match the retained transcript.",
      );
    }
    return Either.right({ tag: "completed" });
  } catch (error: unknown) {
    return Either.left(
      error instanceof Error
        ? error.message
        : `Unable to read benchmark player evidence: ${String(error)}`,
    );
  }
}
type CurrentEvidenceWitness = Readonly<{
  readonly transcript: "retained" | "missing";
  readonly replay: "retained" | "missing";
  readonly findings: "retained" | "missing";
  readonly prePlayReview: "retained" | "missing";
  readonly postPlayReview: "retained" | "missing";
}>;
type ImplementationPhase =
  | ModelInvocationPhase
  | BenchmarkModelInvocationPhase
  | "scenarioSetupAuthoring";
type ImplementationProfile = "production" | BenchmarkImplementationProfile;
type HistoricalBenchmarkReview = Schema.Schema.Type<
  typeof HistoricalScenarioCompositeReviewSchema
>;
type ScenarioQualityReview = Schema.Schema.Type<
  typeof ScenarioQualityReviewSchema
>;
type ReviewVerdictClass = Schema.Schema.Type<
  typeof ReviewOutputSchema
>["verdicts"][number]["class"];
type BenchmarkReviewClassifications = Readonly<{
  readonly raw: HistoricalBenchmarkReview["raw"]["classification"];
  readonly contentAvailability: HistoricalBenchmarkReview["contentAvailability"]["classification"];
  readonly sdkCapability: HistoricalBenchmarkReview["sdkCapability"]["classification"];
  readonly artifactPolicy: HistoricalBenchmarkReview["artifactPolicy"]["classification"];
  readonly scenarioQuality: ScenarioQualityReview["classification"];
}>;
type BenchmarkPostPlayReviewIdentity = Readonly<{
  readonly verdictClasses: readonly ReviewVerdictClass[];
}>;
type BenchmarkFindingIdentity = Pick<
  Finding,
  "stage" | "category" | "kind" | "pointer" | "fingerprint"
>;
type BenchmarkReviewIdentity =
  | Readonly<{
      readonly profile: "documentDeclarationSet";
      readonly prePlay: Readonly<{
        readonly milestone: BenchmarkReviewClassifications;
        readonly final: BenchmarkReviewClassifications;
      }>;
      readonly postPlay: BenchmarkPostPlayReviewIdentity;
      readonly findings: readonly BenchmarkFindingIdentity[];
    }>
  | Readonly<{
      readonly profile: "boundedCapabilityProjection";
      readonly prePlay: Readonly<{
        readonly final: BenchmarkReviewClassifications;
      }>;
      readonly postPlay: BenchmarkPostPlayReviewIdentity;
      readonly findings: readonly BenchmarkFindingIdentity[];
    }>;
export type CompletePathEquivalenceWitness =
  | Readonly<{
      readonly tag: "current";
      readonly scenario:
        | Readonly<{
            readonly tag: "admitted";
            readonly scenarioId: string;
            readonly scenarioSha256: string;
            readonly scenarioReviewSha256: string;
          }>
        | Readonly<{
            readonly tag: "candidate";
            readonly scenarioId: string;
            readonly candidateScenarioSha256: string;
          }>;
      readonly admissionOutcome: ScenarioStagePlan["outcome"]["tag"];
      readonly outcome: PathOutcome;
      readonly evidence: CurrentEvidenceWitness;
    }>
  | Readonly<{
      readonly tag: "benchmark";
      readonly profile: BenchmarkImplementationProfile;
      readonly scenario: Readonly<{
        readonly scenarioId: string;
        readonly scenarioSha256: string;
        readonly scenarioReviewSha256: string;
      }>;
      readonly scenarioBundle: Readonly<{
        readonly scenarioSha256: string;
        readonly scenarioReviewSha256: string;
        readonly stageFactsSha256: string;
        readonly stagePlanSha256: string;
        readonly charactersSha256: string;
        readonly setupSha256: string;
      }>;
      readonly context: Readonly<{
        readonly profile: BenchmarkImplementationProfile;
        readonly roles: readonly BenchmarkContextRole[];
      }>;
      readonly reviews: BenchmarkReviewIdentity;
      readonly admissionOutcome: ScenarioStagePlan["outcome"]["tag"];
      readonly outcome: PathOutcome;
      readonly evidence: CurrentEvidenceWitness;
    }>
  | Readonly<{
      readonly tag: "historical";
      readonly scenario: Readonly<{
        readonly scenarioId: string;
        readonly scenarioSha256: string;
        readonly scenarioReviewSha256: string;
      }>;
      readonly admissionOutcome: UnavailableEvidence;
      readonly outcome: UnavailableEvidence;
      readonly evidence: UnavailableEvidence;
    }>;

type CompletePathSummaryCommon = Readonly<{
  readonly outcome: PathOutcome | UnavailableEvidence;
  readonly acceptedCallVerdicts: EvidenceCount;
  readonly corrections: EvidenceCount;
  readonly failedStages: EvidenceCount;
  readonly failureReasons: EvidenceList;
  readonly usage: ModelUsage;
  readonly evidence: CompletePathEquivalenceWitness;
}>;

export type CompletePathSummary =
  | (CompletePathSummaryCommon &
      Readonly<{
        readonly evidenceVersion: "current";
        /**
         * Sum of the retained model invocation durations. This is not
         * whole-path wall time because invocations and non-model work may
         * overlap or be omitted from the retained invocation ledger.
         */
        readonly modelInvocationElapsedMilliseconds: EvidenceCount;
      }>)
  | (CompletePathSummaryCommon &
      Readonly<{
        readonly evidenceVersion: "historical";
        /** Retained historical authority, whose name explicitly claims wall time. */
        readonly wholePathElapsedMilliseconds: EvidenceCount;
        /** Historical evidence has no comparable model-invocation elapsed sum. */
        readonly modelInvocationElapsedMilliseconds: UnavailableEvidence;
      }>);

export type CompletePathComparison = Readonly<{
  readonly schemaVersion: 2;
  readonly identity: "equivalent-path" | "different-path";
  readonly equivalence: Readonly<{
    readonly tag: "equivalent" | "incomparable";
    readonly baseline: CompletePathEquivalenceWitness;
    readonly candidate: CompletePathEquivalenceWitness;
    readonly reason?: string;
  }>;
  readonly implementation: Readonly<{
    readonly baselinePhases:
      | readonly ImplementationPhase[]
      | UnavailableEvidence;
    readonly candidatePhases:
      | readonly ImplementationPhase[]
      | UnavailableEvidence;
    readonly baselineModels: readonly string[] | UnavailableEvidence;
    readonly candidateModels: readonly string[] | UnavailableEvidence;
    readonly baselineProfile: ImplementationProfile | UnavailableEvidence;
    readonly candidateProfile: ImplementationProfile | UnavailableEvidence;
    readonly phaseSequenceChanged: boolean | UnavailableEvidence;
    readonly modelSequenceChanged: boolean | UnavailableEvidence;
  }>;
  readonly baseline: CompletePathSummary;
  readonly candidate: CompletePathSummary;
  readonly modelInvocationElapsedMilliseconds: Readonly<{
    readonly tag: "comparable" | "incomparable";
    readonly reduction?: number;
    readonly reason?: string;
  }>;
  readonly inputTokens: Readonly<{
    readonly tag: "comparable" | "incomparable";
    readonly reduction?: number;
    readonly reason?: string;
  }>;
}>;

export const COMPLETE_PATH_MIN_REDUCTION = 0.4;

function pathDimension(value: number): EvidenceCount {
  return { tag: "available", count: value };
}

function dimensionTotal(dimensions: readonly TokenCount[]): TokenCount {
  return dimensions.every((dimension) => dimension.tag === "available")
    ? {
        tag: "available",
        count: dimensions.reduce(
          (total, dimension) =>
            total + (dimension.tag === "available" ? dimension.count : 0),
          0,
        ),
      }
    : { tag: "unavailable" };
}

function aggregatePathUsage(
  invocations: readonly (ModelInvocationLedgerEntry | BenchmarkInvocation)[],
): ModelUsage {
  if (invocations.length === 0) {
    return {
      tag: "unavailable",
      reason: "No first-party invocation usage was retained for this path.",
    };
  }
  const unavailableReasons = invocations.flatMap(({ usage }) =>
    usage.tag === "unavailable" ? [usage.reason] : [],
  );
  if (unavailableReasons.length > 0) {
    return {
      tag: "unavailable",
      reason: [...new Set(unavailableReasons)].join("; "),
    };
  }
  const available = invocations.flatMap(({ usage }) =>
    usage.tag === "available" ? [usage] : [],
  );
  return {
    tag: "available",
    input: dimensionTotal(available.map(({ input }) => input)),
    cachedInput: dimensionTotal(
      available.map(({ cachedInput }) => cachedInput),
    ),
    cacheWriteInput: dimensionTotal(
      available.map(({ cacheWriteInput }) => cacheWriteInput),
    ),
    output: dimensionTotal(available.map(({ output }) => output)),
    reasoningOutput: dimensionTotal(
      available.map(({ reasoningOutput }) => reasoningOutput),
    ),
  };
}

function currentEvidenceWitness(
  findings: FindingsProjection,
): CurrentEvidenceWitness {
  const roles = findings.authorities.map(({ role }) => role);
  const prePlayReview = roles.some(isScenarioReviewAuthorityRole);
  const postPlayReview = roles.some(isPostPlayReviewAuthorityRole);
  return {
    transcript:
      findings.run.transcriptSha256 !== undefined &&
      roles.includes("transcript")
        ? "retained"
        : "missing",
    replay: roles.some(isReplayAuthorityRole) ? "retained" : "missing",
    findings: "retained",
    prePlayReview: prePlayReview ? "retained" : "missing",
    postPlayReview: postPlayReview ? "retained" : "missing",
  };
}

function currentPathWitness(
  measurement: CurrentCompletePathMeasurement,
): CompletePathEquivalenceWitness {
  const identity = measurement.stagePlan.identity;
  const scenario =
    identity.tag === "admitted"
      ? {
          tag: "admitted" as const,
          scenarioId: identity.scenarioId,
          scenarioSha256: identity.scenarioSha256,
          scenarioReviewSha256: identity.scenarioReviewSha256,
        }
      : {
          tag: "candidate" as const,
          scenarioId: identity.scenarioId,
          candidateScenarioSha256: identity.candidateScenarioSha256,
        };
  return {
    tag: "current",
    scenario,
    admissionOutcome: measurement.stagePlan.outcome.tag,
    outcome: measurement.outcome,
    evidence: currentEvidenceWitness(measurement.findings),
  };
}

function benchmarkReviewResult(
  value: unknown,
  profile: BenchmarkImplementationProfile,
  readiness: Schema.Schema.Type<typeof ScenarioQualityReviewSchema> | undefined,
): BenchmarkReviewClassifications {
  const envelope = Schema.decodeUnknownEither(
    RetainedScenarioReviewInputSchema,
    {
      onExcessProperty: "error",
    },
  )(value);
  if (Either.isLeft(envelope)) {
    return fail(
      "Validated retained benchmark review envelope became unreadable.",
    );
  }
  const decoded =
    profile === "documentDeclarationSet"
      ? Schema.decodeUnknownEither(HistoricalScenarioCompositeReviewSchema, {
          onExcessProperty: "error",
        })(envelope.right.result)
      : Schema.decodeUnknownEither(CurrentScenarioCompositeReviewSchema, {
          onExcessProperty: "error",
        })(envelope.right.result);
  if (Either.isLeft(decoded)) {
    return fail("Validated benchmark review authority became unreadable.");
  }
  const result = decoded.right;
  const scenarioQuality =
    profile === "documentDeclarationSet"
      ? readiness?.classification
      : "scenarioQuality" in result
        ? (() => {
            const quality = Schema.decodeUnknownEither(
              ScenarioQualityReviewSchema,
              { onExcessProperty: "error" },
            )(result.scenarioQuality);
            return Either.isRight(quality)
              ? quality.right.classification
              : undefined;
          })()
        : undefined;
  if (scenarioQuality === undefined) {
    return fail(
      "Validated historical benchmark review has no readiness classification.",
    );
  }
  return {
    raw: result.raw.classification,
    contentAvailability: result.contentAvailability.classification,
    sdkCapability: result.sdkCapability.classification,
    artifactPolicy: result.artifactPolicy.classification,
    scenarioQuality,
  };
}

function benchmarkReviewIdentity(
  measurement: CurrentBenchmarkMeasurement,
): BenchmarkReviewIdentity {
  const authorityForRole = (role: string): FindingAuthority => {
    const authority = measurement.findings.authorities.find(
      (candidate) => candidate.role === role,
    );
    if (authority === undefined) {
      return fail("Validated benchmark review authority is missing: " + role);
    }
    return authority;
  };
  const jsonFor = (role: string): unknown => {
    const value = readAuthorityJson(authorityForRole(role));
    return value.tag === "valid"
      ? value.value
      : fail("Validated benchmark authority is unreadable: " + role);
  };
  const readiness =
    measurement.profile === "documentDeclarationSet"
      ? (() => {
          const decoded = Schema.decodeUnknownEither(
            ScenarioQualityReviewSchema,
            { onExcessProperty: "error" },
          )(jsonFor("prePlayReviewReadinessResult"));
          return Either.isRight(decoded)
            ? decoded.right
            : fail("Validated readiness authority became unreadable.");
        })()
      : undefined;
  const reviewFor = (
    stage: "milestone" | "final",
  ): BenchmarkReviewClassifications =>
    benchmarkReviewResult(
      jsonFor(stage === "milestone" ? "replay-milestone" : "replay-final"),
      measurement.profile,
      readiness,
    );
  const postPlay = (() => {
    const postPlayAuthority = measurement.findings.authorities.find(
      ({ role }) => isPostPlayReviewAuthorityRole(role),
    );
    if (postPlayAuthority === undefined) {
      return fail("Validated benchmark post-play review authority is missing.");
    }
    const authorityValue = readAuthorityJson(postPlayAuthority);
    const decoded = Schema.decodeUnknownEither(ReviewOutputSchema, {
      onExcessProperty: "error",
    })(
      authorityValue.tag === "valid"
        ? authorityValue.value
        : fail("Validated benchmark post-play review authority is unreadable."),
    );
    if (Either.isLeft(decoded)) {
      return fail("Validated post-play review authority became unreadable.");
    }
    return {
      verdictClasses: [
        ...decoded.right.verdicts.map(
          ({ class: verdictClass }) => verdictClass,
        ),
      ].sort(),
    };
  })();
  const findings = measurement.findings.findings
    .map(({ stage, category, kind, pointer, fingerprint }) => ({
      stage,
      category,
      kind,
      pointer,
      ...(fingerprint === undefined ? {} : { fingerprint }),
    }))
    .sort((left, right) =>
      canonicalJson(left).localeCompare(canonicalJson(right)),
    );
  return measurement.profile === "documentDeclarationSet"
    ? {
        profile: measurement.profile,
        prePlay: {
          milestone: reviewFor("milestone"),
          final: reviewFor("final"),
        },
        postPlay,
        findings,
      }
    : {
        profile: measurement.profile,
        prePlay: { final: reviewFor("final") },
        postPlay,
        findings,
      };
}

function benchmarkContextIdentity(
  measurement: CurrentBenchmarkMeasurement,
): Readonly<{
  readonly profile: BenchmarkImplementationProfile;
  readonly roles: readonly BenchmarkContextRole[];
}> {
  const value = benchmarkAuthorityJson(
    measurement.contextSourceManifest,
    "context-source manifest",
    [],
  );
  const decoded = Schema.decodeUnknownEither(
    BenchmarkContextSourceManifestDocumentSchema,
    { onExcessProperty: "error" },
  )(value);
  if (Either.isLeft(decoded)) {
    return fail("Validated benchmark context manifest became unreadable.");
  }
  return {
    profile: decoded.right.profile,
    roles: [...decoded.right.sources.map(({ role }) => role)].sort(),
  };
}

function benchmarkPathWitness(
  measurement: CurrentBenchmarkMeasurement,
): CompletePathEquivalenceWitness {
  const identity = measurement.stagePlan.identity;
  if (identity.tag !== "admitted") {
    return {
      tag: "benchmark",
      profile: measurement.profile,
      scenario: {
        scenarioId: identity.scenarioId,
        scenarioSha256: identity.candidateScenarioSha256,
        scenarioReviewSha256: measurement.scenarioBundle.scenarioReview.sha256,
      },
      scenarioBundle: {
        scenarioSha256: measurement.scenarioBundle.scenario.sha256,
        scenarioReviewSha256: measurement.scenarioBundle.scenarioReview.sha256,
        stageFactsSha256: measurement.scenarioBundle.stageFacts.sha256,
        stagePlanSha256: measurement.scenarioBundle.stagePlan.sha256,
        charactersSha256: measurement.scenarioBundle.characters.sha256,
        setupSha256: measurement.scenarioBundle.setup.sha256,
      },
      context: benchmarkContextIdentity(measurement),
      reviews: benchmarkReviewIdentity(measurement),
      admissionOutcome: measurement.stagePlan.outcome.tag,
      outcome: measurement.outcome,
      evidence: currentEvidenceWitness(measurement.findings),
    };
  }
  return {
    tag: "benchmark",
    profile: measurement.profile,
    scenario: {
      scenarioId: identity.scenarioId,
      scenarioSha256: identity.scenarioSha256,
      scenarioReviewSha256: identity.scenarioReviewSha256,
    },
    scenarioBundle: {
      scenarioSha256: measurement.scenarioBundle.scenario.sha256,
      scenarioReviewSha256: measurement.scenarioBundle.scenarioReview.sha256,
      stageFactsSha256: measurement.scenarioBundle.stageFacts.sha256,
      stagePlanSha256: measurement.scenarioBundle.stagePlan.sha256,
      charactersSha256: measurement.scenarioBundle.characters.sha256,
      setupSha256: measurement.scenarioBundle.setup.sha256,
    },
    context: benchmarkContextIdentity(measurement),
    reviews: benchmarkReviewIdentity(measurement),
    admissionOutcome: measurement.stagePlan.outcome.tag,
    outcome: measurement.outcome,
    evidence: currentEvidenceWitness(measurement.findings),
  };
}

function historicalPathWitness(
  measurement: HistoricalCompletePathMeasurement,
): CompletePathEquivalenceWitness {
  return {
    tag: "historical",
    scenario: {
      scenarioId: measurement.legacy.scenarioId,
      scenarioSha256: measurement.legacy.scenarioSha256,
      scenarioReviewSha256: measurement.legacy.scenarioReviewSha256,
    },
    admissionOutcome: {
      tag: "unavailable",
      reason: "The historical run predates the retained scenario stage plan.",
    },
    outcome: {
      tag: "unavailable",
      reason: "The historical run predates typed complete-path outcomes.",
    },
    evidence: {
      tag: "unavailable",
      reason:
        "The historical run has no hash-linked transcript/replay/findings/review witness in this envelope.",
    },
  };
}

function currentStagePlanBindingIssues(
  measurement: CurrentCompletePathMeasurement,
): readonly string[] {
  const issues: string[] = [];
  const planByStage = new Map(
    measurement.stagePlan.stages.map((entry) => [entry.stage, entry]),
  );
  const mappingByPhase = new Map(
    COMPLETE_PATH_PHASE_STAGE.flatMap((mapping) =>
      mapping.phases.map((phase) => [phase, mapping] as const),
    ),
  );
  let previousPhaseOrder = -1;
  for (const invocation of measurement.invocations) {
    const mapping = mappingByPhase.get(invocation.phase);
    if (mapping === undefined) {
      issues.push(
        `Invocation phase ${invocation.phase} has no stage-plan explanation.`,
      );
      continue;
    }
    const currentPhaseOrder = completePathOrderForPhase(invocation.phase);
    if (currentPhaseOrder < previousPhaseOrder) {
      issues.push(
        `Invocation phase ${invocation.phase} is out of order in the complete-path ledger.`,
      );
    } else {
      previousPhaseOrder = currentPhaseOrder;
    }
    const stage = planByStage.get(mapping.stage);
    if (stage !== undefined && invocation.stagePlanReason !== stage.reason) {
      issues.push(
        `Invocation ${invocation.invocationId} stage-plan reason does not match the retained ${mapping.stage} authority.`,
      );
    }
  }
  return issues;
}

function currentSemanticIssues(
  measurement: CurrentCompletePathMeasurement,
  options: Readonly<{
    readonly compositeReviewCount?: number;
    readonly requirePlayerInvocation?: boolean;
  }> = {},
): readonly string[] {
  const issues: string[] = [];
  if (measurement.stagePlan.identity.tag !== "admitted") {
    issues.push(
      "The current stage plan is a candidate and is not admitted for execution.",
    );
  }
  const scenarioId = measurement.stagePlan.identity.scenarioId;
  if (measurement.findings.run.scenarioId !== scenarioId) {
    issues.push("The findings projection belongs to a different scenario.");
  }
  if (
    measurement.invocations.some(
      ({ scenarioId: invocationScenarioId }) =>
        invocationScenarioId !== scenarioId,
    )
  ) {
    issues.push("An invocation ledger entry belongs to a different scenario.");
  }
  const failedInvocations = measurement.invocations.filter(
    ({ result }) => result.tag === "failed",
  );
  if (measurement.outcome.tag === "completed" && failedInvocations.length > 0) {
    issues.push(
      "A completed complete path cannot retain a failed model invocation.",
    );
  }
  const planByStage = new Map(
    measurement.stagePlan.stages.map((entry) => [entry.stage, entry]),
  );
  const mappingByPhase = new Map(
    COMPLETE_PATH_PHASE_STAGE.flatMap((mapping) =>
      mapping.phases.map((phase) => [phase, mapping] as const),
    ),
  );
  const counts = new Map<CompletePathStageName, number>();
  const invocationIds = new Set<string>();
  let previousPhaseOrder = -1;
  for (const invocation of measurement.invocations) {
    if (invocationIds.has(invocation.invocationId)) {
      issues.push(
        `Invocation ${invocation.invocationId} appears more than once in the complete-path ledger.`,
      );
    }
    invocationIds.add(invocation.invocationId);
    const mapping = mappingByPhase.get(invocation.phase);
    if (mapping === undefined) {
      issues.push(
        `Invocation phase ${invocation.phase} has no stage-plan explanation.`,
      );
      continue;
    }
    const currentPhaseOrder = completePathOrderForPhase(invocation.phase);
    if (currentPhaseOrder < previousPhaseOrder) {
      issues.push(
        `Invocation phase ${invocation.phase} is out of order in the complete-path ledger.`,
      );
    } else {
      previousPhaseOrder = currentPhaseOrder;
    }
    counts.set(mapping.stage, (counts.get(mapping.stage) ?? 0) + 1);
    const stage = planByStage.get(mapping.stage);
    if (stage === undefined) {
      issues.push(
        `Invocation phase ${invocation.phase} has no retained stage-plan entry.`,
      );
      continue;
    }
    if (invocation.stagePlanReason !== stage.reason) {
      issues.push(
        `Invocation ${invocation.invocationId} stage-plan reason does not match the retained ${mapping.stage} authority.`,
      );
    }
    if (stage.decision === "skipped" || stage.decision === "rejected") {
      issues.push(
        `Invocation phase ${invocation.phase} is recorded for a skipped/rejected stage.`,
      );
    }
  }
  for (const mapping of COMPLETE_PATH_PHASE_STAGE) {
    const stage = planByStage.get(mapping.stage);
    if (stage === undefined) {
      issues.push(`Stage ${mapping.stage} is absent from the stage plan.`);
      continue;
    }
    const count = counts.get(mapping.stage) ?? 0;
    if (stage.decision === "skipped" || stage.decision === "rejected") {
      if (count !== 0) {
        issues.push(
          `Stage ${mapping.stage} is skipped/rejected or none but has ${String(count)} invocation(s).`,
        );
      }
      continue;
    }
    if (
      mapping.stage === "scenarioCompositeReview" &&
      options.compositeReviewCount !== undefined
    ) {
      if (count !== options.compositeReviewCount) {
        issues.push(
          `Stage ${mapping.stage} requires exactly ${String(options.compositeReviewCount)} invocation(s), received ${String(count)}.`,
        );
      }
    } else if (
      mapping.stage === "player" &&
      options.requirePlayerInvocation === false &&
      count === 0
    ) {
      continue;
    } else if (mapping.countPolicy === "exactlyOne" && count !== 1) {
      issues.push(
        `Stage ${mapping.stage} requires exactly one invocation, received ${String(count)}.`,
      );
    } else if (mapping.countPolicy === "exactlyTwo" && count !== 2) {
      issues.push(
        `Stage ${mapping.stage} requires exactly two invocations (${COMPLETE_PATH_EXACTLY_TWO_DESCRIPTIONS[mapping.stage]}), received ${String(count)}.`,
      );
    } else if (mapping.countPolicy === "oneOrMore" && count < 1) {
      issues.push(
        `Stage ${mapping.stage} requires at least one invocation, received none.`,
      );
    }
  }
  return issues;
}

function currentSummary(
  measurement: CurrentCompletePathMeasurement,
): CompletePathSummary {
  const failureReasons = measurement.invocations.flatMap(({ result }) =>
    result.tag === "failed" ? [result.reason] : [],
  );
  return {
    evidenceVersion: "current",
    outcome: measurement.outcome,
    acceptedCallVerdicts: pathDimension(
      measurement.findings.findings.filter(
        ({ kind }) => kind === "accepted-call-verdict",
      ).length,
    ),
    corrections: pathDimension(
      measurement.findings.findings.filter(
        ({ kind }) => kind === "successful-correction",
      ).length,
    ),
    failedStages: pathDimension(
      measurement.invocations.filter(({ result }) => result.tag === "failed")
        .length,
    ),
    failureReasons: {
      tag: "available",
      values: [...new Set(failureReasons)],
    },
    modelInvocationElapsedMilliseconds: pathDimension(
      measurement.invocations.reduce(
        (total, { elapsedMilliseconds }) => total + elapsedMilliseconds,
        0,
      ),
    ),
    usage: aggregatePathUsage(measurement.invocations),
    evidence: currentPathWitness(measurement),
  };
}

function benchmarkSummary(
  measurement: CurrentBenchmarkMeasurement,
): CompletePathSummary {
  const failureReasons = measurement.invocations.flatMap(({ result }) =>
    result.tag === "failed" ? [result.reason] : [],
  );
  return {
    evidenceVersion: "current",
    outcome: measurement.outcome,
    acceptedCallVerdicts: pathDimension(
      measurement.findings.findings.filter(
        ({ kind }) => kind === "accepted-call-verdict",
      ).length,
    ),
    corrections: pathDimension(
      measurement.findings.findings.filter(
        ({ kind }) => kind === "successful-correction",
      ).length,
    ),
    failedStages: pathDimension(
      measurement.invocations.filter(({ result }) => result.tag === "failed")
        .length,
    ),
    failureReasons: {
      tag: "available",
      values: [...new Set(failureReasons)],
    },
    modelInvocationElapsedMilliseconds: pathDimension(
      measurement.invocations.reduce(
        (total, { elapsedMilliseconds }) => total + elapsedMilliseconds,
        0,
      ),
    ),
    usage: aggregatePathUsage(measurement.invocations),
    evidence: benchmarkPathWitness(measurement),
  };
}

function historicalSummary(
  measurement: HistoricalCompletePathMeasurement,
): CompletePathSummary {
  const invocations = Array.isArray(measurement.invocations)
    ? measurement.invocations
    : [];
  return {
    evidenceVersion: "historical",
    outcome: measurement.outcome,
    acceptedCallVerdicts: {
      tag: "unavailable",
      reason: "Historical findings were not retained in this envelope.",
    },
    corrections: {
      tag: "unavailable",
      reason:
        "Historical correction findings were not retained in this envelope.",
    },
    failedStages: {
      tag: "unavailable",
      reason:
        "Historical per-stage results were not retained in this envelope.",
    },
    failureReasons: {
      tag: "unavailable",
      reason:
        "Historical invocation result reasons were not retained in this envelope.",
    },
    wholePathElapsedMilliseconds: pathDimension(
      measurement.legacy.wholePathElapsedMilliseconds,
    ),
    modelInvocationElapsedMilliseconds: {
      tag: "unavailable",
      reason:
        "Historical invocation durations are not retained as a comparable model-invocation elapsed sum.",
    },
    usage: aggregatePathUsage(invocations),
    evidence: historicalPathWitness(measurement),
  };
}

function summary(measurement: CompletePathMeasurement): CompletePathSummary {
  if (measurement.schemaVersion === 2) return currentSummary(measurement);
  if (measurement.schemaVersion === 3) return benchmarkSummary(measurement);
  return historicalSummary(measurement);
}

function sequenceChanged<A>(
  baseline: readonly A[],
  candidate: readonly A[],
): boolean {
  return canonicalJson(baseline) !== canonicalJson(candidate);
}

function equivalenceWitnessIdentity(
  witness: CompletePathEquivalenceWitness,
): unknown {
  if (witness.tag !== "benchmark") return witness;
  const { profile: _profile, context, reviews, ...identity } = witness;
  return {
    ...identity,
    context: { roles: context.roles },
    reviews: {
      prePlay: { final: reviews.prePlay.final },
      postPlay: reviews.postPlay,
      findings: reviews.findings,
    },
  };
}

function implementationForPath(measurement: CompletePathMeasurement): {
  readonly phases: readonly ImplementationPhase[] | UnavailableEvidence;
  readonly models: readonly string[] | UnavailableEvidence;
  readonly profile: ImplementationProfile | UnavailableEvidence;
} {
  if (measurement.schemaVersion === 1) {
    const unavailable: UnavailableEvidence = {
      tag: "unavailable",
      reason:
        "Historical evidence has no canonical per-invocation phase sequence.",
    };
    if (!Array.isArray(measurement.invocations)) {
      return { phases: unavailable, models: unavailable, profile: unavailable };
    }
    return {
      phases: measurement.invocations.map(({ phase }) => phase),
      models: measurement.invocations.map(({ model }) => model),
      profile: unavailable,
    };
  }
  if (measurement.schemaVersion === 3) {
    return {
      phases: measurement.invocations.map(({ phase }) => phase),
      models: measurement.invocations.map(({ model }) => model),
      profile: measurement.profile,
    };
  }
  return {
    phases: measurement.invocations.map(({ phase }) => phase),
    models: measurement.invocations.map(({ model }) => model),
    profile: "production",
  };
}

function availableMetric(
  baseline: EvidenceCount,
  candidate: EvidenceCount,
): { readonly baseline: number; readonly candidate: number } | undefined {
  return baseline.tag === "available" && candidate.tag === "available"
    ? { baseline: baseline.count, candidate: candidate.count }
    : undefined;
}

function compareSequences<A>(
  baseline: readonly A[] | UnavailableEvidence,
  candidate: readonly A[] | UnavailableEvidence,
): boolean | UnavailableEvidence {
  if (!Array.isArray(baseline) || !Array.isArray(candidate)) {
    return {
      tag: "unavailable",
      reason:
        "At least one path has unavailable implementation sequence evidence.",
    };
  }
  return sequenceChanged(baseline, candidate);
}

function metricComparison(
  baseline: CompletePathSummary,
  candidate: CompletePathSummary,
  identity: CompletePathComparison["identity"],
  select: (summary: CompletePathSummary) => EvidenceCount,
  label: string,
): CompletePathComparison["modelInvocationElapsedMilliseconds"] {
  if (identity !== "equivalent-path") {
    return {
      tag: "incomparable",
      reason:
        "Scenario outcome or retained evidence semantics differ; historical and current authorities are not interchangeable.",
    };
  }
  const values = availableMetric(select(baseline), select(candidate));
  if (values === undefined) {
    return {
      tag: "incomparable",
      reason: `${label} is unavailable in at least one path; unavailable is not zero.`,
    };
  }
  return {
    tag: "comparable",
    reduction: reduction(values.baseline, values.candidate),
  };
}

function inputComparison(
  baseline: CompletePathSummary,
  candidate: CompletePathSummary,
  identity: CompletePathComparison["identity"],
): CompletePathComparison["inputTokens"] {
  if (identity !== "equivalent-path") {
    return {
      tag: "incomparable",
      reason:
        "Scenario outcome or retained evidence semantics differ; input usage cannot be compared.",
    };
  }
  const baselineValue =
    baseline.usage.tag === "available" &&
    baseline.usage.input.tag === "available"
      ? baseline.usage.input.count
      : undefined;
  const candidateValue =
    candidate.usage.tag === "available" &&
    candidate.usage.input.tag === "available"
      ? candidate.usage.input.count
      : undefined;
  if (baselineValue !== undefined && candidateValue !== undefined) {
    return {
      tag: "comparable",
      reduction: reduction(baselineValue, candidateValue),
    };
  }
  return {
    tag: "incomparable",
    reason:
      "Input-token usage is unavailable in at least one path; unavailable is not zero.",
  };
}

export function parseCompletePathMeasurement(
  value: unknown,
): Either.Either<CompletePathMeasurement, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(CompletePathMeasurementSchema, {
    onExcessProperty: "error",
  })(value);
}

export function parseBenchmarkMeasurement(
  value: unknown,
): Either.Either<CurrentBenchmarkMeasurement, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(CurrentBenchmarkMeasurementSchema, {
    onExcessProperty: "error",
  })(value);
}

function readJsonAuthority(path: string): unknown {
  return JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
}

function currentInvocationEntriesFromLedger(
  path: string,
): readonly CurrentModelInvocationLedgerEntry[] {
  const values = readJsonLines(path);
  if (values.length === 0) {
    fail("Complete-path invocation ledger is empty: " + path);
  }
  return values.map((value) => {
    const parsed = parseModelInvocationLedgerEntry(value);
    if (Either.isLeft(parsed)) {
      fail(
        "Invalid invocation ledger entry in " +
          path +
          ": " +
          parsed.left.message,
      );
    }
    if (parsed.right.schemaVersion !== 2) {
      fail(
        "Current complete-path assembly cannot use v1 ledger evidence: " + path,
      );
    }
    return parsed.right;
  });
}

function mapNonEmpty<A, B>(
  values: readonly [A, ...A[]],
  map: (value: A) => B,
): readonly [B, ...B[]] {
  const [first, ...rest] = values;
  return [map(first), ...rest.map(map)];
}

/**
 * Assemble a current measurement from the retained stage plan, findings,
 * ledger, and raw event authorities. Every row is decoded from its source;
 * callers cannot provide a parallel in-memory phase or usage record.
 */
export function assembleCompletePathMeasurement(
  value: unknown,
): Either.Either<ValidatedCompletePathMeasurement, string> {
  const descriptor = Schema.decodeUnknownEither(
    CompletePathAssemblyDescriptorSchema,
    { onExcessProperty: "error" },
  )(value);
  if (Either.isLeft(descriptor)) return Either.left(descriptor.left.message);
  try {
    const stagePlanAuthority = artifactAuthority(
      descriptor.right.stagePlanPath,
    );
    const stagePlanDecoded = Schema.decodeUnknownEither(
      ScenarioStagePlanSchema,
      { onExcessProperty: "error" },
    )(readJsonAuthority(stagePlanAuthority.path));
    if (Either.isLeft(stagePlanDecoded)) {
      return Either.left(
        "Invalid complete-path stage plan: " + stagePlanDecoded.left.message,
      );
    }
    const findingsAuthority = artifactAuthority(descriptor.right.findingsPath);
    const findingsDecoded = Schema.decodeUnknownEither(
      FindingsProjectionSchema,
      { onExcessProperty: "error" },
    )(readJsonAuthority(findingsAuthority.path));
    if (Either.isLeft(findingsDecoded)) {
      return Either.left(
        "Invalid complete-path findings projection: " +
          findingsDecoded.left.message,
      );
    }
    const findingsValidation = validateFindingsProjection(
      findingsDecoded.right,
    );
    if (findingsValidation.tag === "invalid") {
      return Either.left(
        "Invalid complete-path findings projection: " +
          findingsValidation.message,
      );
    }
    const ledgerAuthorities = mapNonEmpty(
      descriptor.right.invocationLedgerPaths,
      artifactAuthority,
    );
    const ledgerPaths = new Set(ledgerAuthorities.map(({ path }) => path));
    if (ledgerPaths.size !== ledgerAuthorities.length) {
      return Either.left(
        "Complete-path invocation ledger authorities must have distinct paths.",
      );
    }
    const invocations = ledgerAuthorities.flatMap(({ path }) =>
      currentInvocationEntriesFromLedger(path),
    );
    const eventAuthorities = mapNonEmpty(
      descriptor.right.invocationEventPaths,
      artifactAuthority,
    );
    const eventPaths = new Set(eventAuthorities.map(({ path }) => path));
    if (eventPaths.size !== eventAuthorities.length) {
      return Either.left(
        "Complete-path invocation event authorities must have distinct paths.",
      );
    }
    const measurement: CurrentCompletePathMeasurement = {
      schemaVersion: 2,
      pathId: descriptor.right.pathId,
      stagePlan: stagePlanDecoded.right,
      stagePlanAuthority,
      invocationLedgers: ledgerAuthorities,
      invocations,
      invocationEvents: eventAuthorities,
      findings: findingsValidation.projection,
      outcome: descriptor.right.outcome,
    };
    return validateCompletePathMeasurement(measurement);
  } catch (error: unknown) {
    return Either.left(
      error instanceof Error
        ? error.message
        : "Unable to assemble complete-path measurement: " + String(error),
    );
  }
}

export function writeCompletePathMeasurement(input: {
  readonly descriptor: unknown;
  readonly outputPath: string;
}): Either.Either<ValidatedCompletePathMeasurement, string> {
  const assembled = assembleCompletePathMeasurement(input.descriptor);
  if (Either.isLeft(assembled)) return assembled;
  try {
    writeFileSync(
      resolve(repoRoot, input.outputPath),
      JSON.stringify(assembled.right, null, 2) + "\n",
      { flag: "wx" },
    );
    return assembled;
  } catch (error: unknown) {
    return Either.left(
      error instanceof Error
        ? error.message
        : "Unable to write complete-path measurement: " + String(error),
    );
  }
}

type FindingAuthority = FindingsProjection["authorities"][number];

function numberedAuthorityRole(role: string, prefix: string): boolean {
  if (role === prefix) return true;
  const suffix = role.slice(prefix.length + 1);
  return role.startsWith(`${prefix}-`) && /^[1-9][0-9]*$/.test(suffix);
}

function namedReviewStageAuthorityRole(role: string, prefix: string): boolean {
  const normalizedPrefix = prefix.endsWith("-") ? prefix.slice(0, -1) : prefix;
  return (
    role === `${normalizedPrefix}-milestone` ||
    role === `${normalizedPrefix}-final` ||
    role === `${normalizedPrefix}milestone` ||
    role === `${normalizedPrefix}final`
  );
}

function isScenarioReviewAuthorityRole(role: string): boolean {
  return numberedAuthorityRole(role, "scenarioReview");
}

function isPostPlayReviewAuthorityRole(role: string): boolean {
  return numberedAuthorityRole(role, "review");
}

function isReplayAuthorityRole(role: string): boolean {
  return (
    numberedAuthorityRole(role, "replay") ||
    namedReviewStageAuthorityRole(role, "replay") ||
    namedReviewStageAuthorityRole(role, "prePlayReviewReplayInput")
  );
}

function isPrePlayReviewEventsAuthorityRole(role: string): boolean {
  return namedReviewStageAuthorityRole(role, "prePlayReviewReplayEvents");
}

function isRetiredPrePlayReviewSourceAuthorityRole(role: string): boolean {
  const prefix = "prePlayReviewSourceInput";
  return role.startsWith(prefix);
}

function benchmarkReadinessAuthority(
  authorities: readonly FindingAuthority[],
  role: (typeof BENCHMARK_READINESS_AUTHORITY_ROLES)[keyof typeof BENCHMARK_READINESS_AUTHORITY_ROLES],
): readonly FindingAuthority[] {
  return authorities.filter((authority) => authority.role === role);
}

function isBenchmarkReadinessAuthorityRole(role: string): boolean {
  return Object.values(BENCHMARK_READINESS_AUTHORITY_ROLES).some(
    (candidate) => candidate === role,
  );
}

function reviewStageForAuthorityRole(
  role: string,
  prefix: string,
): "milestone" | "final" | undefined {
  const normalizedPrefix = prefix.endsWith("-") ? prefix.slice(0, -1) : prefix;
  if (
    role === `${normalizedPrefix}-milestone` ||
    role === `${normalizedPrefix}milestone`
  ) {
    return "milestone";
  }
  if (
    role === `${normalizedPrefix}-final` ||
    role === `${normalizedPrefix}final`
  ) {
    return "final";
  }
  return undefined;
}

function readAuthorityJson(authority: FindingAuthority):
  | { readonly tag: "valid"; readonly value: unknown }
  | {
      readonly tag: "invalid";
      readonly message: string;
    } {
  try {
    return {
      tag: "valid",
      value: JSON.parse(
        readFileSync(resolve(repoRoot, authority.path), "utf8"),
      ),
    };
  } catch {
    return {
      tag: "invalid",
      message: `Authority ${authority.role} is not valid JSON.`,
    };
  }
}

function readAuthorityJsonLines(
  authority: FindingAuthority | ArtifactAuthority,
):
  | { readonly tag: "valid"; readonly value: readonly unknown[] }
  | {
      readonly tag: "invalid";
      readonly message: string;
    } {
  try {
    return { tag: "valid", value: readJsonLines(authority.path) };
  } catch {
    return {
      tag: "invalid",
      message: `Authority ${"role" in authority ? authority.role : authority.path} is not valid JSONL.`,
    };
  }
}

function currentAuthorityContentIssues(
  measurement: CurrentCompletePathMeasurement,
  findings: FindingsProjection,
): readonly string[] {
  const issues: string[] = [];
  const scenarioIdentity = measurement.stagePlan.identity;
  const expectedScenarioSha256 =
    scenarioIdentity.tag === "admitted"
      ? scenarioIdentity.scenarioSha256
      : scenarioIdentity.candidateScenarioSha256;
  const expectedOutputJsonSchema = codexOutputJsonSchema(
    CurrentScenarioCompositeReviewSchema,
  );
  const transcriptAuthority = findings.authorities.find(
    ({ role }) => role === "transcript",
  );
  type ParsedTranscriptHeader = Extract<
    ReturnType<typeof parseSdkTranscript>,
    { readonly tag: "valid" }
  >["value"]["header"];
  let transcriptHeader: ParsedTranscriptHeader | undefined;
  if (transcriptAuthority === undefined) {
    issues.push("Current path has no canonical transcript authority.");
  } else {
    const records = readAuthorityJsonLines(transcriptAuthority);
    if (records.tag === "invalid") {
      issues.push(records.message);
    } else {
      const parsed = parseSdkTranscript(records.value);
      if (parsed.tag === "invalid") {
        issues.push(`Transcript authority is invalid: ${parsed.message}`);
      } else {
        transcriptHeader = parsed.value.header;
        if (transcriptHeader.scenarioId !== findings.run.scenarioId) {
          issues.push("Transcript authority belongs to a different scenario.");
        }
        if (transcriptHeader.gitSha !== findings.run.gitSha) {
          issues.push("Transcript authority belongs to a different revision.");
        }
        if (transcriptHeader.startedAt !== findings.run.startedAt) {
          issues.push("Transcript start time does not match the findings run.");
        }
        if (transcriptHeader.scenarioSha256 !== expectedScenarioSha256) {
          issues.push(
            "Transcript scenario hash does not match the stage plan.",
          );
        }
        if (
          scenarioIdentity.tag === "admitted" &&
          transcriptHeader.scenarioReviewSha256 !==
            scenarioIdentity.scenarioReviewSha256
        ) {
          issues.push(
            "Transcript scenario-review hash does not match the admitted stage plan.",
          );
        }
        if (parsed.value.calls.length !== findings.run.callCount) {
          issues.push("Transcript call count does not match the findings run.");
        }
      }
    }
  }

  const scenarioReviewAuthorities = findings.authorities.filter(({ role }) =>
    isScenarioReviewAuthorityRole(role),
  );
  const decodedScenarioReviews = scenarioReviewAuthorities.flatMap(
    (authority) => {
      const value = readAuthorityJson(authority);
      if (value.tag === "invalid") {
        issues.push(value.message);
        return [];
      }
      const decoded = Schema.decodeUnknownEither(FinalScenarioReviewSchema, {
        onExcessProperty: "error",
      })(value.value);
      if (Either.isLeft(decoded)) {
        issues.push(
          `Scenario-review authority ${authority.role} has an unsupported current schema.`,
        );
        return [];
      }
      return [{ authority, review: decoded.right }];
    },
  );
  const scenarioReviewGitSha: GitSha | undefined =
    decodedScenarioReviews[0]?.review.gitSha;
  for (const { authority, review } of decodedScenarioReviews) {
    if (
      review.scenarioId !== findings.run.scenarioId ||
      review.scenarioSha256 !== expectedScenarioSha256 ||
      (scenarioIdentity.tag === "admitted" &&
        authority.sha256 !== scenarioIdentity.scenarioReviewSha256)
    ) {
      issues.push(
        `Scenario-review authority ${authority.role} is not bound to the exact scenario/review identity.`,
      );
    }
  }

  const postPlayReviewAuthorities = findings.authorities.filter(({ role }) =>
    isPostPlayReviewAuthorityRole(role),
  );
  if (postPlayReviewAuthorities.length !== 1) {
    issues.push(
      `Current path requires exactly one post-play review authority, received ${String(postPlayReviewAuthorities.length)}.`,
    );
  }
  for (const authority of postPlayReviewAuthorities) {
    const value = readAuthorityJson(authority);
    if (value.tag === "invalid") {
      issues.push(value.message);
      continue;
    }
    const decoded = Schema.decodeUnknownEither(ReviewOutputSchema, {
      onExcessProperty: "error",
    })(value.value);
    if (Either.isLeft(decoded)) {
      issues.push(
        `Post-play review authority ${authority.role} has an unsupported schema.`,
      );
      continue;
    }
    if (
      decoded.right.scenarioId !== findings.run.scenarioId ||
      decoded.right.gitSha !== findings.run.gitSha ||
      decoded.right.transcriptSha256 !== findings.run.transcriptSha256
    ) {
      issues.push(
        `Post-play review authority ${authority.role} is not bound to the transcript run.`,
      );
    }
  }

  const replayAuthorities = findings.authorities.filter(({ role }) =>
    isReplayAuthorityRole(role),
  );
  if (replayAuthorities.length !== 2) {
    issues.push(
      `Current path requires one retained milestone and one final replay authority, received ${String(replayAuthorities.length)}.`,
    );
  }
  const replayStages = new Map<string, string>();
  const replayAuthoritiesByStage = new Map<string, FindingAuthority>();
  const replayInvocationsByStage = new Map<
    string,
    CurrentModelInvocationLedgerEntry
  >();
  for (const authority of replayAuthorities) {
    const value = readAuthorityJson(authority);
    if (value.tag === "invalid") {
      issues.push(value.message);
      continue;
    }
    const decoded = Schema.decodeUnknownEither(
      RetainedScenarioReviewInputSchema,
      { onExcessProperty: "error" },
    )(value.value);
    if (Either.isLeft(decoded)) {
      issues.push(
        `Replay authority ${authority.role} has an unsupported retained-review schema.`,
      );
      continue;
    }
    const replay = decoded.right;
    const currentResult = Schema.decodeUnknownEither(
      CurrentScenarioCompositeReviewSchema,
      { onExcessProperty: "error" },
    )(replay.result);
    if (
      replay.scenarioId !== findings.run.scenarioId ||
      canonicalJson(replay.outputJsonSchema) !==
        canonicalJson(expectedOutputJsonSchema) ||
      Either.isLeft(currentResult)
    ) {
      issues.push(
        `Replay authority ${authority.role} is not bound to the current scenario review schema and identity.`,
      );
    }
    const invocation = measurement.invocations.find(
      ({ invocationId }) => invocationId === replay.invocationId,
    );
    if (
      invocation === undefined ||
      invocation.phase !== "scenarioCompositeReview" ||
      replay.sourceGitSha !== invocation.gitSha ||
      invocation.model !== replay.model ||
      invocation.reasoningEffort !== replay.reasoningEffort
    ) {
      issues.push(
        `Replay authority ${authority.role} does not identify a matching composite-review invocation.`,
      );
    }
    if (replayStages.has(replay.reviewStage)) {
      issues.push(
        `Replay authorities contain duplicate ${replay.reviewStage} review stages.`,
      );
    }
    replayStages.set(replay.reviewStage, replay.invocationId);
    replayAuthoritiesByStage.set(replay.reviewStage, authority);
    if (invocation !== undefined) {
      replayInvocationsByStage.set(replay.reviewStage, invocation);
    }
  }
  if (!replayStages.has("milestone"))
    issues.push(
      "Current path is missing a retained milestone review authority.",
    );
  if (!replayStages.has("final"))
    issues.push("Current path is missing a retained final review authority.");
  const milestoneInvocationId = replayStages.get("milestone");
  const finalInvocationId = replayStages.get("final");
  if (milestoneInvocationId !== undefined && finalInvocationId !== undefined) {
    const milestoneIndex = measurement.invocations.findIndex(
      ({ invocationId }) => invocationId === milestoneInvocationId,
    );
    const finalIndex = measurement.invocations.findIndex(
      ({ invocationId }) => invocationId === finalInvocationId,
    );
    if (milestoneIndex < 0 || finalIndex < 0 || milestoneIndex >= finalIndex) {
      issues.push(
        "Composite-review invocations must retain milestone before final order.",
      );
    } else if (
      measurement.invocations
        .slice(finalIndex + 1)
        .some(
          ({ phase }) =>
            phase === "scenarioGeneration" ||
            phase === "scenarioCompositeReview",
        )
    ) {
      issues.push(
        "No generation or composite-review invocation may follow the retained final review.",
      );
    }
  }

  const replayEventAuthorities = findings.authorities.filter(({ role }) =>
    isPrePlayReviewEventsAuthorityRole(role),
  );
  if (replayEventAuthorities.length !== 2) {
    issues.push(
      `Current path requires one retained milestone and one final replay event authority, received ${String(replayEventAuthorities.length)}.`,
    );
  }
  const replayEventStages = new Set<string>();
  for (const authority of replayEventAuthorities) {
    const reviewStage = reviewStageForAuthorityRole(
      authority.role,
      "prePlayReviewReplayEvents",
    );
    if (reviewStage === undefined) {
      issues.push(
        `Replay event authority role is not stage-specific: ${authority.role}.`,
      );
      continue;
    }
    if (replayEventStages.has(reviewStage)) {
      issues.push(
        `Replay event authorities contain duplicate ${reviewStage} review stages.`,
      );
      continue;
    }
    replayEventStages.add(reviewStage);
    const replayAuthority = replayAuthoritiesByStage.get(reviewStage);
    const invocation = replayInvocationsByStage.get(reviewStage);
    if (replayAuthority === undefined || invocation === undefined) {
      issues.push(
        `Replay event authority ${authority.role} has no matching retained ${reviewStage} envelope and invocation.`,
      );
      continue;
    }
    const invocationEvent = measurement.invocationEvents.find(
      ({ path }) => path === authority.path,
    );
    if (invocationEvent === undefined) {
      issues.push(
        `Replay event authority ${authority.role} is not included in the complete-path invocation event authorities.`,
      );
    } else if (
      invocationEvent.sha256 !== authority.sha256 ||
      invocationEvent.sha256 !== invocation.eventsSha256
    ) {
      issues.push(
        `Replay event authority ${authority.role} does not match its retained invocation event hash.`,
      );
    }
    try {
      validateRetainedScenarioReviewInvocation({
        retainedInputPath: replayAuthority.path,
        eventPath: authority.path,
        eventSha256: authority.sha256,
        reviewStage,
        ledgerEntry: invocation,
      });
    } catch (error: unknown) {
      issues.push(
        error instanceof Error
          ? error.message
          : `Replay event authority ${authority.role} is not bound to its retained invocation.`,
      );
    }
  }
  if (!replayEventStages.has("milestone")) {
    issues.push(
      "Current path is missing a retained milestone replay event authority.",
    );
  }
  if (!replayEventStages.has("final")) {
    issues.push(
      "Current path is missing a retained final replay event authority.",
    );
  }

  const replaySupervisorAuthorities = findings.authorities.filter(
    ({ role }) => role === "replaySupervisor",
  );
  if (replaySupervisorAuthorities.length !== 1) {
    issues.push(
      `Current path requires exactly one replay supervisor authority, received ${String(replaySupervisorAuthorities.length)}.`,
    );
  }
  const replaySupervisorAuthority = replaySupervisorAuthorities[0];
  const replayResultAuthorities = findings.authorities.filter(
    ({ role }) => role === "replayResult",
  );
  if (replayResultAuthorities.length !== 1) {
    issues.push(
      `Current path requires exactly one replay-result authority, received ${String(replayResultAuthorities.length)}.`,
    );
  }
  const replayResultAuthority = replayResultAuthorities[0];
  if (replayResultAuthority !== undefined) {
    const value = readAuthorityJson(replayResultAuthority);
    if (value.tag === "invalid") {
      issues.push(value.message);
    } else {
      const decoded = Schema.decodeUnknownEither(
        SdkReplayResultEvidenceSchema,
        { onExcessProperty: "error" },
      )(value.value);
      if (Either.isLeft(decoded)) {
        issues.push(
          `Replay-result authority ${replayResultAuthority.role} has an unsupported schema: ${decoded.left.message}`,
        );
      } else if (replaySupervisorAuthority === undefined) {
        issues.push(
          "Replay-result authority cannot be bound without the replay supervisor authority.",
        );
      } else if (
        decoded.right.scenarioId !== findings.run.scenarioId ||
        decoded.right.transcriptSha256 !== findings.run.transcriptSha256 ||
        decoded.right.replaySupervisorSha256 !==
          replaySupervisorAuthority.sha256 ||
        decoded.right.matchedCallCount !== findings.run.callCount
      ) {
        issues.push(
          "Replay-result authority is not bound to the retained transcript, replay supervisor, or exact SDK call count.",
        );
      }
    }
  }
  if (transcriptHeader !== undefined && scenarioReviewGitSha === undefined) {
    issues.push(
      "Current path has no identity-bearing scenario-review authority.",
    );
  }
  for (const authority of findings.authorities) {
    if (
      (authority.role.startsWith("scenarioReview-") &&
        !isScenarioReviewAuthorityRole(authority.role)) ||
      (authority.role.startsWith("review-") &&
        !isPostPlayReviewAuthorityRole(authority.role)) ||
      (authority.role.startsWith("replay-") &&
        !isReplayAuthorityRole(authority.role)) ||
      (authority.role.startsWith("prePlayReviewReplayInput-") &&
        !isReplayAuthorityRole(authority.role)) ||
      (authority.role.startsWith("prePlayReviewReplayEvents-") &&
        !isPrePlayReviewEventsAuthorityRole(authority.role))
    ) {
      issues.push(`Finding authority role is not closed: ${authority.role}.`);
    }
  }
  return issues;
}

function currentAuthorityIssues(
  measurement: CurrentCompletePathMeasurement,
): readonly string[] {
  const issues: string[] = [];
  const findingsValidation = validateFindingsProjection(measurement.findings);
  if (findingsValidation.tag === "invalid") {
    issues.push(`Findings authority is invalid: ${findingsValidation.message}`);
    return issues;
  }
  const findings = findingsValidation.projection;
  const evidence = currentEvidenceWitness(findings);
  for (const [responsibility, status] of Object.entries(evidence)) {
    if (status === "missing") {
      issues.push(
        `Current path is missing retained ${responsibility} evidence.`,
      );
    }
  }
  const scenarioIdentity = measurement.stagePlan.identity;
  if (scenarioIdentity.scenarioId !== findings.run.scenarioId) {
    issues.push(
      "Stage-plan scenario identity does not match the findings run.",
    );
  }
  const expectedScenarioAuthority = findings.authorities.find(
    ({ role }) => role === "scenario",
  );
  const expectedScenarioReviewAuthority = findings.authorities.find(
    ({ role }) => role === "scenarioReview",
  );
  if (
    scenarioIdentity.tag === "admitted" &&
    (expectedScenarioAuthority?.sha256 !== scenarioIdentity.scenarioSha256 ||
      expectedScenarioReviewAuthority?.sha256 !==
        scenarioIdentity.scenarioReviewSha256)
  ) {
    issues.push(
      "Admitted stage-plan scenario and review hashes are not bound to findings authorities.",
    );
  }
  if (
    scenarioIdentity.tag === "candidate" &&
    expectedScenarioAuthority?.sha256 !==
      scenarioIdentity.candidateScenarioSha256
  ) {
    issues.push(
      "Candidate stage-plan scenario hash is not bound to the findings scenario authority.",
    );
  }
  const invocationScenarioIds = new Set(
    measurement.invocations.map(({ scenarioId }) => String(scenarioId)),
  );
  if (
    invocationScenarioIds.size !== 1 ||
    !invocationScenarioIds.has(String(findings.run.scenarioId))
  ) {
    issues.push(
      "Invocation ledger scenario identity does not match the findings run authority.",
    );
  }
  const ledgerAuthorities = new Map(
    measurement.invocationLedgers.map((authority) => [
      authority.sha256,
      authority,
    ]),
  );
  if (ledgerAuthorities.size !== measurement.invocationLedgers.length) {
    issues.push("Invocation ledger authorities must have distinct hashes.");
  }
  const ledgerEntries = measurement.invocationLedgers.flatMap((authority) => {
    try {
      const canonicalAuthority = artifactAuthority(authority.path);
      if (
        canonicalAuthority.sha256 !== authority.sha256 ||
        canonicalAuthority.byteLength !== authority.byteLength
      ) {
        issues.push(
          `Invocation ledger authority hash is not canonical: ${authority.path}.`,
        );
        return [];
      }
    } catch {
      issues.push(
        `Invocation ledger authority is unreadable: ${authority.path}.`,
      );
      return [];
    }
    const parsed = readAuthorityJsonLines(authority);
    if (parsed.tag === "invalid") {
      issues.push(parsed.message);
      return [];
    }
    return parsed.value.flatMap((value) => {
      const decoded = parseModelInvocationLedgerEntry(value);
      if (Either.isLeft(decoded)) {
        issues.push(
          `Invocation ledger authority ${authority.path} has an invalid entry: ${decoded.left.message}`,
        );
        return [];
      }
      return [decoded.right];
    });
  });
  if (canonicalJson(ledgerEntries) !== canonicalJson(measurement.invocations)) {
    issues.push(
      "Composed invocation entries do not match the retained ledger authorities.",
    );
  }
  if (measurement.invocationEvents.length !== measurement.invocations.length) {
    issues.push(
      "Each current invocation must have exactly one retained event authority.",
    );
    return issues;
  }
  const eventAuthorities = new Map(
    measurement.invocationEvents.map((authority) => [
      authority.sha256,
      authority,
    ]),
  );
  if (eventAuthorities.size !== measurement.invocationEvents.length) {
    issues.push("Invocation event authorities must have distinct hashes.");
  }
  const invocationEventHashes = new Set(
    measurement.invocations.map(({ eventsSha256 }) => eventsSha256),
  );
  if (invocationEventHashes.size !== measurement.invocations.length) {
    issues.push("Each invocation must reference a distinct event authority.");
  }
  if (
    [...eventAuthorities.keys()].some(
      (sha256) => !invocationEventHashes.has(sha256),
    )
  ) {
    issues.push("Every invocation event authority must be referenced once.");
  }
  for (const invocation of measurement.invocations) {
    const authority = eventAuthorities.get(invocation.eventsSha256);
    if (authority === undefined) {
      issues.push(
        `Invocation ${invocation.invocationId} has no event authority matching its hash.`,
      );
      continue;
    }
    let canonicalAuthority: ArtifactAuthority;
    try {
      canonicalAuthority = artifactAuthority(authority.path);
    } catch {
      issues.push(
        `Invocation ${invocation.invocationId} event authority is unreadable.`,
      );
      continue;
    }
    if (
      canonicalAuthority.path !== authority.path ||
      canonicalAuthority.byteLength !== authority.byteLength ||
      canonicalAuthority.sha256 !== authority.sha256
    ) {
      issues.push(
        `Invocation ${invocation.invocationId} event authority hash is not canonical.`,
      );
      continue;
    }
    const events = readCodexEvents(resolve(repoRoot, canonicalAuthority.path));
    if (events.tag === "invalid") {
      issues.push(events.message);
      continue;
    }
    const evidence = modelInvocationEvidenceFromEvents(events.events);
    if (evidence.tag === "invalid" || evidence.entry.schemaVersion !== 2) {
      issues.push(
        `Invocation ${invocation.invocationId} does not have valid current v2 event evidence.`,
      );
      continue;
    }
    const withoutEventsHash = Object.fromEntries(
      Object.entries(invocation).filter(([key]) => key !== "eventsSha256"),
    );
    if (canonicalJson(evidence.entry) !== canonicalJson(withoutEventsHash)) {
      issues.push(
        `Invocation ${invocation.invocationId} does not match its retained event evidence.`,
      );
    }
  }
  try {
    const stagePlanHash = artifactAuthority(
      measurement.stagePlanAuthority.path,
    );
    const stagePlanBytes = readFileSync(resolve(repoRoot, stagePlanHash.path));
    if (
      stagePlanHash.sha256 !== measurement.stagePlanAuthority.sha256 ||
      stagePlanHash.byteLength !== measurement.stagePlanAuthority.byteLength ||
      canonicalJson(JSON.parse(stagePlanBytes.toString("utf8"))) !==
        canonicalJson(measurement.stagePlan)
    ) {
      issues.push(
        "Retained stage-plan authority does not match the stage plan.",
      );
    }
  } catch {
    issues.push("Retained stage-plan authority is unreadable.");
  }
  issues.push(...currentStagePlanBindingIssues(measurement));
  if (
    measurement.outcome.tag === "completed" &&
    measurement.invocations.some(({ result }) => result.tag === "failed")
  ) {
    issues.push(
      "A completed complete path cannot retain a failed model invocation.",
    );
  }
  issues.push(...currentAuthorityContentIssues(measurement, findings));
  return issues;
}

function benchmarkAuthorityMatches(
  expected: ArtifactAuthority,
  label: string,
): readonly string[] {
  try {
    const actual = artifactAuthority(expected.path);
    return actual.sha256 === expected.sha256 &&
      actual.byteLength === expected.byteLength
      ? []
      : [`Benchmark ${label} authority hash is not canonical.`];
  } catch {
    return [`Benchmark ${label} authority is unreadable.`];
  }
}

function benchmarkAuthorityBytes(
  authority: ArtifactAuthority,
): Buffer | undefined {
  try {
    return readFileSync(resolve(repoRoot, authority.path));
  } catch {
    return undefined;
  }
}

function benchmarkAuthorityJson(
  authority: ArtifactAuthority,
  label: string,
  issues: string[],
): unknown {
  const bytes = benchmarkAuthorityBytes(authority);
  if (bytes === undefined) {
    issues.push(`Benchmark ${label} authority is unreadable.`);
    return undefined;
  }
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    issues.push(`Benchmark ${label} authority is not valid JSON.`);
    return undefined;
  }
}

function benchmarkContextAuthorityIssues(input: {
  readonly profile: BenchmarkImplementationProfile;
  readonly role: BenchmarkContextRole;
  readonly authority: ArtifactAuthority;
}): readonly string[] {
  const bytes = benchmarkAuthorityBytes(input.authority);
  if (bytes === undefined) {
    return [`Benchmark context ${input.role} authority is unreadable.`];
  }
  const expected = (() => {
    try {
      return {
        tag: "available" as const,
        value: benchmarkContextForRole(input.profile, input.role),
      };
    } catch (error: unknown) {
      return {
        tag: "unavailable" as const,
        message: `Benchmark context ${input.role} canonical projection could not be constructed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  })();
  if (expected.tag === "unavailable") return [expected.message];
  return bytes.toString("utf8") === expected.value
    ? []
    : [
        `Benchmark context ${input.role} authority bytes do not equal the canonical ${input.profile} role projection.`,
      ];
}

function benchmarkContextDeliveryAuthorityIssues(input: {
  readonly profile: BenchmarkImplementationProfile;
  readonly role: "player" | "postPlayReview";
  readonly authority: FindingAuthority | undefined;
  readonly manifest: BenchmarkContextSourceManifestDocument;
  readonly outcome: PathOutcome;
  readonly postPlayRan: boolean;
}): readonly string[] {
  if (input.authority === undefined) {
    if (input.role === "player") {
      return [
        "Benchmark findings have no retained player context-delivery authority.",
      ];
    }
    if (!input.postPlayRan && input.outcome.tag !== "completed") {
      return [];
    }
    return [
      `Benchmark findings have no retained ${input.role} context-delivery authority.`,
    ];
  }
  const issues = benchmarkAuthorityMatches(
    input.authority,
    `${input.role} context delivery`,
  ).slice();
  const value = benchmarkAuthorityJson(
    input.authority,
    `${input.role} context delivery`,
    issues,
  );
  const decoded = Schema.decodeUnknownEither(
    BenchmarkContextDeliveryEvidenceSchema,
    { onExcessProperty: "error" },
  )(value);
  if (Either.isLeft(decoded)) {
    issues.push(
      `Benchmark ${input.role} context-delivery authority is invalid: ${decoded.left.message}`,
    );
    return issues;
  }
  const source = input.manifest.sources.find(({ role }) => role === input.role);
  if (source === undefined) {
    issues.push(`Benchmark context manifest has no ${input.role} authority.`);
    return issues;
  }
  const evidence = decoded.right;
  if (
    evidence.profile !== input.profile ||
    evidence.role !== input.role ||
    evidence.path !== source.authority.path ||
    evidence.byteLength !== source.authority.byteLength ||
    evidence.sha256 !== source.authority.sha256
  ) {
    issues.push(
      `Benchmark ${input.role} context delivery does not match its profile, role, or manifest authority.`,
    );
  }
  return issues;
}

function benchmarkInvocationEntriesFromAuthorities(
  authorities: readonly ArtifactAuthority[],
  issues: string[],
): readonly BenchmarkInvocation[] {
  const entries: BenchmarkInvocation[] = [];
  for (const authority of authorities) {
    const parsed = readAuthorityJsonLines(authority);
    if (parsed.tag === "invalid") {
      issues.push(parsed.message);
      continue;
    }
    for (const value of parsed.value) {
      const current = parseModelInvocationLedgerEntry(value);
      if (Either.isRight(current)) {
        if (current.right.schemaVersion === 1) {
          issues.push(
            `Benchmark invocation ledger ${authority.path} cannot use historical v1 evidence.`,
          );
        } else {
          entries.push(current.right);
        }
        continue;
      }
      const auxiliary = parseBenchmarkModelInvocationLedgerEntry(value);
      if (Either.isLeft(auxiliary)) {
        issues.push(
          `Benchmark invocation ledger ${authority.path} has an invalid entry: ${auxiliary.left.message}`,
        );
      } else {
        entries.push(auxiliary.right);
      }
    }
  }
  return entries;
}

function canonicalBenchmarkInvocations(
  invocations: readonly BenchmarkInvocation[],
): readonly CurrentModelInvocationLedgerEntry[] {
  return invocations.flatMap((invocation) =>
    invocation.schemaVersion === 2 ? [invocation] : [],
  );
}

function benchmarkReplayReviewStage(
  role: string,
): "milestone" | "final" | undefined {
  return (
    reviewStageForAuthorityRole(role, "replay") ??
    reviewStageForAuthorityRole(role, "prePlayReviewReplayInput")
  );
}

function benchmarkReviewStages(
  profile: BenchmarkImplementationProfile,
): readonly ("milestone" | "final")[] {
  return profile === "documentDeclarationSet"
    ? (["milestone", "final"] as const)
    : (["final"] as const);
}

function benchmarkReviewAuthorityByStage(
  authorities: readonly FindingAuthority[],
  stageForRole: (role: string) => "milestone" | "final" | undefined,
  label: string,
  expectedStages: readonly ("milestone" | "final")[],
  issues: string[],
): ReadonlyMap<"milestone" | "final", FindingAuthority> {
  const byStage = new Map<"milestone" | "final", FindingAuthority>();
  for (const authority of authorities) {
    const stage = stageForRole(authority.role);
    if (stage === undefined) continue;
    if (!expectedStages.includes(stage)) {
      issues.push(
        `Benchmark ${label} authorities retain unexpected ${stage} review stage for this profile.`,
      );
      continue;
    }
    if (byStage.has(stage)) {
      issues.push(
        `Benchmark ${label} authorities contain duplicate ${stage} review stages.`,
      );
      continue;
    }
    byStage.set(stage, authority);
  }
  for (const stage of expectedStages) {
    if (!byStage.has(stage)) {
      issues.push(
        `Benchmark ${label} authorities require exactly one ${stage} authority for this profile.`,
      );
    }
  }
  return byStage;
}

function benchmarkReadinessResultEventIssue(input: {
  readonly authority: FindingAuthority;
  readonly expected: BenchmarkReadinessInput;
}): string | undefined {
  const parsedEvents = readCodexEvents(resolve(repoRoot, input.authority.path));
  if (parsedEvents.tag === "invalid") {
    return `Benchmark readiness event authority is invalid: ${parsedEvents.message}`;
  }
  try {
    const output = Schema.decodeUnknownEither(
      Schema.Struct({ result: ScenarioQualityReviewSchema }),
      { onExcessProperty: "error" },
    )(finalAgentMessage(parsedEvents.events));
    if (
      Either.isLeft(output) ||
      canonicalJson(output.right.result) !==
        canonicalJson(input.expected.result)
    ) {
      return "Benchmark readiness result does not match its invocation event output.";
    }
    return undefined;
  } catch (error: unknown) {
    return `Benchmark readiness event output is invalid: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

function benchmarkRetainedPrePlayReviewIssues(input: {
  readonly measurement: CurrentBenchmarkMeasurement;
  readonly findings: FindingsProjection;
  readonly expectedReviewSchema:
    | typeof HistoricalScenarioCompositeReviewSchema
    | typeof CurrentScenarioCompositeReviewSchema;
}): readonly string[] {
  const { measurement, findings, expectedReviewSchema } = input;
  const issues: string[] = [];
  const expectedOutputJsonSchema =
    expectedReviewSchema === HistoricalScenarioCompositeReviewSchema
      ? codexOutputJsonSchema(HistoricalScenarioCompositeReviewSchema)
      : codexOutputJsonSchema(CurrentScenarioCompositeReviewSchema);
  const replayAuthorities = findings.authorities.filter(({ role }) =>
    isReplayAuthorityRole(role),
  );
  const replayEventAuthorities = findings.authorities.filter(({ role }) =>
    isPrePlayReviewEventsAuthorityRole(role),
  );
  const expectedStages = benchmarkReviewStages(measurement.profile);
  for (const authority of findings.authorities) {
    if (isRetiredPrePlayReviewSourceAuthorityRole(authority.role)) {
      issues.push(
        `Benchmark finding authority role is retired and not permitted: ${authority.role}.`,
      );
    } else if (
      (authority.role.startsWith("replay-") &&
        !isReplayAuthorityRole(authority.role)) ||
      (authority.role.startsWith("prePlayReviewReplayInput-") &&
        !isReplayAuthorityRole(authority.role)) ||
      (authority.role.startsWith("prePlayReviewReplayEvents-") &&
        !isPrePlayReviewEventsAuthorityRole(authority.role)) ||
      (authority.role.startsWith("prePlayReviewReadiness") &&
        !isBenchmarkReadinessAuthorityRole(authority.role))
    ) {
      issues.push(
        `Benchmark finding authority role is not closed: ${authority.role}.`,
      );
    }
  }
  const retainedReviewEnvelopeSchema = Schema.Struct({
    schemaVersion: Schema.Literal(2),
    phase: Schema.Literal("scenarioCompositeReview"),
    reviewStage: Schema.Literal("milestone", "final"),
    scenarioId: ScenarioIdSchema,
    sourceGitSha: GitShaSchema,
    invocationId: Schema.NonEmptyString,
    model: Schema.Literal("gpt-5.6-luna"),
    reasoningEffort: Schema.Literal("max"),
    prompt: Schema.NonEmptyString,
    outputJsonSchema: Schema.Unknown,
    result: expectedReviewSchema,
  });
  if (replayAuthorities.length !== expectedStages.length) {
    issues.push(
      `Benchmark ${measurement.profile} profile requires ${String(expectedStages.length)} retained pre-play replay authorities, received ${String(replayAuthorities.length)}.`,
    );
  }
  if (replayEventAuthorities.length !== expectedStages.length) {
    issues.push(
      `Benchmark ${measurement.profile} profile requires ${String(expectedStages.length)} retained pre-play replay event authorities, received ${String(replayEventAuthorities.length)}.`,
    );
  }
  const replayByStage = benchmarkReviewAuthorityByStage(
    replayAuthorities,
    benchmarkReplayReviewStage,
    "pre-play replay",
    expectedStages,
    issues,
  );
  const replayEventsByStage = benchmarkReviewAuthorityByStage(
    replayEventAuthorities,
    (role) => reviewStageForAuthorityRole(role, "prePlayReviewReplayEvents"),
    "pre-play replay event",
    expectedStages,
    issues,
  );

  const invocationById = new Map(
    measurement.invocations.map((invocation) => [
      invocation.invocationId,
      invocation,
    ]),
  );
  const eventAuthoritiesByPath = new Map(
    measurement.invocationEvents.map((authority) => [
      authority.path,
      authority,
    ]),
  );
  for (const reviewStage of expectedStages) {
    const replayAuthority = replayByStage.get(reviewStage);
    const replayEventsAuthority = replayEventsByStage.get(reviewStage);
    if (replayAuthority === undefined || replayEventsAuthority === undefined) {
      continue;
    }
    const replayValue = readAuthorityJson(replayAuthority);
    if (replayValue.tag === "invalid") {
      issues.push(replayValue.message);
      continue;
    }
    const replay = Schema.decodeUnknownEither(retainedReviewEnvelopeSchema, {
      onExcessProperty: "error",
    })(replayValue.value);
    if (Either.isLeft(replay)) {
      issues.push(
        `Benchmark ${reviewStage} pre-play review authority is not a retained review envelope.`,
      );
      continue;
    }
    const replayIdentityValid =
      replay.right.reviewStage === reviewStage &&
      replay.right.scenarioId === measurement.scenarioId &&
      replay.right.sourceGitSha === measurement.implementationGitSha &&
      canonicalJson(replay.right.outputJsonSchema) ===
        canonicalJson(expectedOutputJsonSchema);
    if (!replayIdentityValid) {
      issues.push(
        `Benchmark ${reviewStage} pre-play review authority is not bound to the ${measurement.profile} composite-review schema, scenario identity, implementation revision, and Git authority.`,
      );
      continue;
    }
    const invocation = invocationById.get(replay.right.invocationId);
    const eventAuthority = eventAuthoritiesByPath.get(
      replayEventsAuthority.path,
    );
    if (
      invocation === undefined ||
      invocation.schemaVersion !== 2 ||
      invocation.phase !== "scenarioCompositeReview" ||
      invocation.gitSha !== replay.right.sourceGitSha ||
      invocation.model !== replay.right.model ||
      invocation.reasoningEffort !== replay.right.reasoningEffort ||
      eventAuthority === undefined ||
      eventAuthority.sha256 !== replayEventsAuthority.sha256 ||
      eventAuthority.sha256 !== invocation.eventsSha256
    ) {
      issues.push(
        `Benchmark ${reviewStage} pre-play replay event authority does not match its retained composite-review invocation.`,
      );
    } else if (invocation.schemaVersion === 2) {
      try {
        validateRetainedScenarioReviewInvocation({
          retainedInputPath: replayAuthority.path,
          eventPath: replayEventsAuthority.path,
          eventSha256: replayEventsAuthority.sha256,
          reviewStage,
          ledgerEntry: invocation,
        });
      } catch (error: unknown) {
        issues.push(
          error instanceof Error
            ? error.message
            : `Benchmark ${reviewStage} pre-play replay result is not bound to its invocation event output.`,
        );
      }
    }
  }

  const readinessAuthorities = {
    source: benchmarkReadinessAuthority(
      findings.authorities,
      BENCHMARK_READINESS_AUTHORITY_ROLES.source,
    ),
    result: benchmarkReadinessAuthority(
      findings.authorities,
      BENCHMARK_READINESS_AUTHORITY_ROLES.result,
    ),
    events: benchmarkReadinessAuthority(
      findings.authorities,
      BENCHMARK_READINESS_AUTHORITY_ROLES.events,
    ),
  } as const;
  const retainedReadinessAuthorities = [
    ...readinessAuthorities.source,
    ...readinessAuthorities.result,
    ...readinessAuthorities.events,
  ];
  if (measurement.profile === "documentDeclarationSet") {
    for (const [kind, authorities] of Object.entries(readinessAuthorities)) {
      if (authorities.length !== 1) {
        issues.push(
          `The document-declaration benchmark profile requires exactly one retained readiness ${kind} authority, received ${String(authorities.length)}.`,
        );
      }
    }
    if (
      new Set(retainedReadinessAuthorities.map(({ path }) => path)).size !==
      retainedReadinessAuthorities.length
    ) {
      issues.push(
        "The document-declaration benchmark profile requires distinct readiness source, result, and event authorities.",
      );
    }
    const readinessInvocations = measurement.invocations.filter(
      (invocation) =>
        invocation.schemaVersion === 3 &&
        invocation.responsibility === "scenarioQuality",
    );
    if (readinessInvocations.length !== 1) {
      issues.push(
        `The document-declaration benchmark profile requires exactly one retained readiness invocation, received ${String(readinessInvocations.length)}.`,
      );
    }
    const readinessInvocation = readinessInvocations[0];
    const readinessSourceAuthority = readinessAuthorities.source[0];
    const readinessResultAuthority = readinessAuthorities.result[0];
    const readinessEventsAuthority = readinessAuthorities.events[0];
    const readinessInput: BenchmarkReadinessInput | undefined =
      readinessSourceAuthority === undefined
        ? undefined
        : (() => {
            const readinessSource = benchmarkAuthorityJson(
              readinessSourceAuthority,
              "readiness source",
              issues,
            );
            const decoded = Schema.decodeUnknownEither(
              BenchmarkReadinessInputSchema,
              { onExcessProperty: "error" },
            )(readinessSource);
            if (Either.isLeft(decoded)) {
              issues.push(
                `Benchmark readiness source authority is not a retained readiness envelope: ${decoded.left.message}`,
              );
              return undefined;
            }
            const input = decoded.right;
            if (
              input.scenarioId !== measurement.scenarioId ||
              input.sourceGitSha !== measurement.implementationGitSha ||
              canonicalJson(input.outputJsonSchema) !==
                canonicalJson(
                  codexOutputJsonSchema(ScenarioQualityReviewSchema),
                )
            ) {
              issues.push(
                "Benchmark readiness input authority is not bound to the implementation revision and readiness schema.",
              );
            }
            if (
              readinessInvocation !== undefined &&
              (input.invocationId !== readinessInvocation.invocationId ||
                input.model !== readinessInvocation.model ||
                input.reasoningEffort !== readinessInvocation.reasoningEffort)
            ) {
              issues.push(
                "Benchmark readiness input authority does not identify its retained readiness invocation.",
              );
            }
            return input;
          })();
    if (readinessResultAuthority !== undefined) {
      const readinessResult = benchmarkAuthorityJson(
        readinessResultAuthority,
        "readiness result",
        issues,
      );
      const decoded = Schema.decodeUnknownEither(ScenarioQualityReviewSchema, {
        onExcessProperty: "error",
      })(readinessResult);
      if (Either.isLeft(decoded)) {
        issues.push(
          `Benchmark readiness result authority is not a scenario-quality result: ${decoded.left.message}`,
        );
      } else if (
        readinessInput !== undefined &&
        canonicalJson(decoded.right) !== canonicalJson(readinessInput.result)
      ) {
        issues.push(
          "Benchmark readiness result authority does not match its retained readiness source.",
        );
      }
    }
    const readinessEventAuthority =
      readinessEventsAuthority === undefined
        ? undefined
        : eventAuthoritiesByPath.get(readinessEventsAuthority.path);
    if (
      readinessInvocation === undefined ||
      readinessEventsAuthority === undefined ||
      readinessEventsAuthority.sha256 !== readinessInvocation.eventsSha256 ||
      readinessEventAuthority === undefined ||
      readinessEventAuthority.sha256 !== readinessEventsAuthority.sha256
    ) {
      issues.push(
        "The document-declaration benchmark readiness events authority is not bound to its retained readiness invocation.",
      );
    } else if (readinessInput !== undefined) {
      const outputIssue = benchmarkReadinessResultEventIssue({
        authority: readinessEventsAuthority,
        expected: readinessInput,
      });
      if (outputIssue !== undefined) issues.push(outputIssue);
    }
  } else if (retainedReadinessAuthorities.length !== 0) {
    issues.push(
      "The bounded capability-projection benchmark profile retains no readiness source, result, or event authority.",
    );
  }
  return issues;
}

function benchmarkPlayerEvidenceIssues(input: {
  readonly measurement: CurrentBenchmarkMeasurement;
  readonly findings: FindingsProjection;
}): readonly string[] {
  const { measurement, findings } = input;
  const issues: string[] = [];
  const transcript = findings.authorities.find(
    ({ role }) => role === "transcript",
  );
  const frozenPrefix = findings.authorities.find(
    ({ role }) => role === "frozenPrefix",
  );
  const observations = findings.authorities.find(
    ({ role }) => role === "observations",
  );
  const finalArtifact = findings.authorities.find(
    ({ role }) => role === "final",
  );
  if (transcript === undefined) {
    issues.push("Benchmark player evidence has no transcript authority.");
  }
  if (frozenPrefix === undefined) {
    issues.push("Benchmark player evidence has no frozen-prefix authority.");
  }
  if (observations === undefined) {
    issues.push("Benchmark player evidence has no observations authority.");
  }
  if (
    transcript !== undefined &&
    frozenPrefix !== undefined &&
    observations !== undefined
  ) {
    const derived = deriveBenchmarkPathOutcome({
      transcriptPath: transcript.path,
      frozenPrefixPath: frozenPrefix.path,
      continuationObservationPath: observations.path,
      ...(finalArtifact === undefined
        ? {}
        : { finalArtifactPath: finalArtifact.path }),
    });
    if (Either.isLeft(derived)) {
      issues.push(derived.left);
    } else if (
      canonicalJson(derived.right) !== canonicalJson(measurement.outcome)
    ) {
      issues.push(
        "Benchmark measurement outcome does not match the retained player terminal evidence.",
      );
    }
  }
  if (measurement.outcome.tag === "completed") {
    if (findings.run.callCount < 1) {
      issues.push(
        "A completed benchmark path requires at least one accepted SDK call.",
      );
    }
    if (
      !findings.findings.some(({ kind }) => kind === "accepted-call-verdict")
    ) {
      issues.push(
        "A completed benchmark path requires an accepted SDK-call finding.",
      );
    }
  }
  return issues;
}

function benchmarkCompleteEvidenceIssues(input: {
  readonly measurement: CurrentBenchmarkMeasurement;
  readonly findings: FindingsProjection;
}): readonly string[] {
  const { measurement, findings } = input;
  const issues: string[] = [];
  issues.push(...benchmarkPlayerEvidenceIssues(input));
  const postPlayAuthorities = findings.authorities.filter(({ role }) =>
    isPostPlayReviewAuthorityRole(role),
  );
  if (
    measurement.outcome.tag === "completed" &&
    postPlayAuthorities.length !== 1
  ) {
    issues.push(
      `Benchmark ${measurement.profile} profile requires exactly one post-play review authority, received ${String(postPlayAuthorities.length)}.`,
    );
  }
  for (const authority of postPlayAuthorities) {
    const value = readAuthorityJson(authority);
    if (value.tag === "invalid") {
      issues.push(value.message);
      continue;
    }
    const decoded = Schema.decodeUnknownEither(ReviewOutputSchema, {
      onExcessProperty: "error",
    })(value.value);
    if (Either.isLeft(decoded)) {
      issues.push(
        `Benchmark post-play review authority ${authority.role} has an unsupported schema: ${decoded.left.message}`,
      );
      continue;
    }
    if (
      decoded.right.scenarioId !== measurement.scenarioId ||
      decoded.right.gitSha !== measurement.implementationGitSha ||
      decoded.right.transcriptSha256 !== findings.run.transcriptSha256
    ) {
      issues.push(
        `Benchmark post-play review authority ${authority.role} is not bound to the implementation revision and transcript run.`,
      );
    }
  }

  const supervisorAuthorities = findings.authorities.filter(
    ({ role }) => role === "replaySupervisor",
  );
  const replayResultAuthorities = findings.authorities.filter(
    ({ role }) => role === "replayResult",
  );
  if (
    measurement.outcome.tag === "completed" &&
    supervisorAuthorities.length !== 1
  ) {
    issues.push(
      `Benchmark ${measurement.profile} profile requires exactly one replay supervisor authority, received ${String(supervisorAuthorities.length)}.`,
    );
  }
  if (
    measurement.outcome.tag === "completed" &&
    replayResultAuthorities.length !== 1
  ) {
    issues.push(
      `Benchmark ${measurement.profile} profile requires exactly one replay-result authority, received ${String(replayResultAuthorities.length)}.`,
    );
  }
  const supervisor = supervisorAuthorities[0];
  for (const authority of replayResultAuthorities) {
    const value = readAuthorityJson(authority);
    if (value.tag === "invalid") {
      issues.push(value.message);
      continue;
    }
    const decoded = Schema.decodeUnknownEither(SdkReplayResultEvidenceSchema, {
      onExcessProperty: "error",
    })(value.value);
    if (Either.isLeft(decoded)) {
      issues.push(
        `Benchmark replay-result authority ${authority.role} has an unsupported schema: ${decoded.left.message}`,
      );
      continue;
    }
    if (supervisor === undefined) {
      issues.push(
        "Benchmark replay-result authority cannot be bound without a replay supervisor authority.",
      );
      continue;
    }
    if (
      decoded.right.scenarioId !== measurement.scenarioId ||
      decoded.right.transcriptSha256 !== findings.run.transcriptSha256 ||
      decoded.right.replaySupervisorSha256 !== supervisor.sha256 ||
      decoded.right.matchedCallCount !== findings.run.callCount
    ) {
      issues.push(
        "Benchmark replay-result authority is not bound to the retained transcript, replay supervisor, or exact SDK call count.",
      );
    }
  }
  return issues;
}

function benchmarkAuthorityIssues(
  measurement: CurrentBenchmarkMeasurement,
): readonly string[] {
  const issues: string[] = [];
  const bundle = measurement.scenarioBundle;
  const bundleEntries = [
    ["scenario", bundle.scenario],
    ["scenario review", bundle.scenarioReview],
    ["stage facts", bundle.stageFacts],
    ["stage plan", bundle.stagePlan],
    ["characters", bundle.characters],
    ["setup", bundle.setup],
  ] as const;
  for (const [label, authority] of bundleEntries) {
    issues.push(...benchmarkAuthorityMatches(authority, label));
  }

  const manifestValue = benchmarkAuthorityJson(
    measurement.contextSourceManifest,
    "context-source manifest",
    issues,
  );
  const manifest = Schema.decodeUnknownEither(
    BenchmarkContextSourceManifestDocumentSchema,
    { onExcessProperty: "error" },
  )(manifestValue);
  if (Either.isLeft(manifest)) {
    issues.push(
      `Benchmark context-source manifest is invalid: ${manifest.left.message}`,
    );
  } else {
    if (
      manifest.right.profile !== measurement.profile ||
      manifest.right.scenarioId !== measurement.scenarioId
    ) {
      issues.push(
        "Benchmark context-source manifest is not bound to the benchmark profile and scenario.",
      );
    }
    const roles = new Set<string>();
    for (const source of manifest.right.sources) {
      if (roles.has(source.role)) {
        issues.push(
          `Benchmark context-source manifest repeats role ${source.role}.`,
        );
      }
      roles.add(source.role);
      issues.push(
        ...benchmarkAuthorityMatches(
          source.authority,
          `context ${source.role}`,
        ),
      );
      issues.push(
        ...benchmarkContextAuthorityIssues({
          profile: measurement.profile,
          role: source.role,
          authority: source.authority,
        }),
      );
    }
    const expectedSourceKind =
      measurement.profile === "documentDeclarationSet"
        ? "declarationSet"
        : "capabilityProjection";
    for (const role of BENCHMARK_CONTEXT_SOURCE_ROLES) {
      const source = manifest.right.sources.find(
        (candidate) => candidate.role === role,
      );
      if (source === undefined) {
        issues.push(
          `Benchmark context-source manifest does not retain the ${role} role.`,
        );
      } else if (source.sourceKind !== expectedSourceKind) {
        issues.push(
          `Benchmark context-source manifest does not retain a ${expectedSourceKind} delivery for the ${role} role.`,
        );
      }
    }
    for (const role of ["player", "postPlayReview"] as const) {
      issues.push(
        ...benchmarkContextDeliveryAuthorityIssues({
          profile: measurement.profile,
          role,
          authority: measurement.findings.authorities.find(
            (candidate) =>
              candidate.role ===
              (role === "player"
                ? "playerContextDelivery"
                : "postPlayReviewContextDelivery"),
          ),
          manifest: manifest.right,
          outcome: measurement.outcome,
          postPlayRan:
            measurement.invocations.some(
              ({ phase }) => phase === "postPlayReview",
            ) ||
            measurement.findings.authorities.some(({ role: authorityRole }) =>
              isPostPlayReviewAuthorityRole(authorityRole),
            ),
        }),
      );
    }
  }

  const factsValue = benchmarkAuthorityJson(
    bundle.stageFacts,
    "stage-facts",
    issues,
  );
  const facts = Schema.decodeUnknownEither(ScenarioStageFactsSchema, {
    onExcessProperty: "error",
  })(factsValue);
  if (Either.isLeft(facts)) {
    issues.push(
      `Benchmark stage-facts authority is invalid: ${facts.left.message}`,
    );
  } else if (
    canonicalJson(facts.right) !== canonicalJson(measurement.stagePlan.facts)
  ) {
    issues.push(
      "Benchmark stage-facts authority does not match the stage plan.",
    );
  }

  const stagePlanValue = benchmarkAuthorityJson(
    bundle.stagePlan,
    "stage-plan",
    issues,
  );
  const decodedStagePlan = Schema.decodeUnknownEither(ScenarioStagePlanSchema, {
    onExcessProperty: "error",
  })(stagePlanValue);
  if (Either.isLeft(decodedStagePlan)) {
    issues.push(
      `Benchmark stage-plan authority is invalid: ${decodedStagePlan.left.message}`,
    );
  } else if (
    canonicalJson(decodedStagePlan.right) !==
    canonicalJson(measurement.stagePlan)
  ) {
    issues.push(
      "Benchmark stage-plan authority does not match the measurement.",
    );
  }

  const scenarioReviewValue = benchmarkAuthorityJson(
    bundle.scenarioReview,
    "scenario review",
    issues,
  );
  const decodedScenarioReview = Schema.decodeUnknownEither(
    FinalScenarioReviewSchema,
    { onExcessProperty: "error" },
  )(scenarioReviewValue);
  if (Either.isLeft(decodedScenarioReview)) {
    issues.push(
      `Benchmark scenario-review authority is invalid: ${decodedScenarioReview.left.message}`,
    );
  } else {
    if (
      decodedScenarioReview.right.scenarioId !== measurement.scenarioId ||
      decodedScenarioReview.right.scenarioSha256 !== bundle.scenario.sha256
    ) {
      issues.push(
        "Benchmark scenario-review authority is not bound to the scenario bundle identity.",
      );
    }
  }
  const stagePlanIdentity = measurement.stagePlan.identity;
  if (stagePlanIdentity.tag === "admitted") {
    if (stagePlanIdentity.scenarioId !== measurement.scenarioId) {
      issues.push(
        "Admitted benchmark stage-plan scenario identity does not match the benchmark scenario.",
      );
    }
    if (stagePlanIdentity.scenarioSha256 !== bundle.scenario.sha256) {
      issues.push(
        "Admitted benchmark stage-plan scenario hash is not bound to the scenario bundle.",
      );
    }
    if (
      stagePlanIdentity.scenarioReviewSha256 !== bundle.scenarioReview.sha256
    ) {
      issues.push(
        "Admitted benchmark stage-plan scenario-review hash is not bound to the scenario bundle.",
      );
    }
  }

  const findingsValidation = validateFindingsProjection(measurement.findings);
  if (findingsValidation.tag === "invalid") {
    issues.push(`Findings authority is invalid: ${findingsValidation.message}`);
  } else {
    const findings = findingsValidation.projection;
    if (findings.run.scenarioId !== measurement.scenarioId) {
      issues.push("Benchmark findings belong to a different scenario.");
    }
    if (findings.run.gitSha !== measurement.implementationGitSha) {
      issues.push(
        "Benchmark findings run identity does not match the retained implementation revision.",
      );
    }
    const scenarioAuthority = findings.authorities.find(
      ({ role }) => role === "scenario",
    );
    const scenarioReviewAuthority = findings.authorities.find(
      ({ role }) => role === "scenarioReview",
    );
    if (
      scenarioAuthority?.sha256 !== bundle.scenario.sha256 ||
      scenarioReviewAuthority?.sha256 !== bundle.scenarioReview.sha256
    ) {
      issues.push(
        "Benchmark scenario and scenario-review authorities are not bound to findings.",
      );
    }
    const transcriptAuthority = findings.authorities.find(
      ({ role }) => role === "transcript",
    );
    if (transcriptAuthority === undefined) {
      issues.push("Benchmark findings have no transcript authority.");
    } else {
      const transcript = readAuthorityJsonLines(transcriptAuthority);
      if (transcript.tag === "invalid") {
        issues.push(transcript.message);
      } else {
        const parsedTranscript = parseSdkTranscript(transcript.value);
        if (parsedTranscript.tag === "invalid") {
          issues.push(
            `Benchmark transcript is invalid: ${parsedTranscript.message}`,
          );
        } else {
          const header = parsedTranscript.value.header;
          if (
            header.scenarioId !== measurement.scenarioId ||
            header.gitSha !== measurement.implementationGitSha ||
            header.scenarioSha256 !== bundle.scenario.sha256 ||
            header.scenarioReviewSha256 !== bundle.scenarioReview.sha256
          ) {
            issues.push(
              "Benchmark transcript is not bound to the immutable scenario identity.",
            );
          } else if (
            measurement.outcome.tag === "completed" &&
            (header.characterOutcome !== "ready" ||
              header.setupOutcome !== "ready" ||
              header.charactersSha256 !== bundle.characters.sha256 ||
              header.setupSha256 !== bundle.setup.sha256)
          ) {
            issues.push(
              "A completed benchmark transcript must retain ready character and setup bundle authorities.",
            );
          } else if (
            header.characterOutcome === "ready" &&
            header.setupOutcome === "ready" &&
            (header.charactersSha256 !== bundle.characters.sha256 ||
              header.setupSha256 !== bundle.setup.sha256)
          ) {
            issues.push(
              "Benchmark transcript is not bound to every immutable scenario-bundle authority.",
            );
          }
        }
      }
    }
    issues.push(
      ...benchmarkRetainedPrePlayReviewIssues({
        measurement,
        findings,
        expectedReviewSchema:
          measurement.profile === "documentDeclarationSet"
            ? HistoricalScenarioCompositeReviewSchema
            : CurrentScenarioCompositeReviewSchema,
      }),
    );
    issues.push(...benchmarkCompleteEvidenceIssues({ measurement, findings }));
  }

  const ledgerAuthorities = measurement.invocationLedgers;
  const ledgerHashes = new Set(ledgerAuthorities.map(({ sha256 }) => sha256));
  if (ledgerHashes.size !== ledgerAuthorities.length) {
    issues.push(
      "Benchmark invocation ledger authorities must have distinct hashes.",
    );
  }
  for (const authority of ledgerAuthorities) {
    issues.push(...benchmarkAuthorityMatches(authority, "invocation ledger"));
  }
  const composed = benchmarkInvocationEntriesFromAuthorities(
    ledgerAuthorities,
    issues,
  );
  if (canonicalJson(composed) !== canonicalJson(measurement.invocations)) {
    issues.push(
      "Benchmark invocation entries do not match the retained ledger authorities.",
    );
  }
  const invocationIds = new Set<string>();
  for (const invocation of measurement.invocations) {
    if (invocationIds.has(invocation.invocationId)) {
      issues.push(
        `Benchmark invocation ${invocation.invocationId} appears more than once.`,
      );
    }
    invocationIds.add(invocation.invocationId);
    if (invocation.scenarioId !== measurement.scenarioId) {
      issues.push(
        `Benchmark invocation ${invocation.invocationId} belongs to a different scenario.`,
      );
    }
    if (invocation.gitSha !== measurement.implementationGitSha) {
      issues.push(
        `Benchmark invocation ${invocation.invocationId} belongs to a different implementation revision.`,
      );
    }
    if (
      invocation.schemaVersion === 3 &&
      measurement.profile !== "documentDeclarationSet"
    ) {
      issues.push(
        "Only the document-declaration benchmark profile may retain auxiliary invocations.",
      );
    }
  }

  if (measurement.invocationEvents.length !== measurement.invocations.length) {
    issues.push(
      "Each benchmark invocation must have exactly one retained event authority.",
    );
  }
  const eventAuthorities = new Map(
    measurement.invocationEvents.map((authority) => [
      authority.sha256,
      authority,
    ]),
  );
  if (eventAuthorities.size !== measurement.invocationEvents.length) {
    issues.push(
      "Benchmark invocation event authorities must have distinct hashes.",
    );
  }
  const invocationEventHashes = measurement.invocations.map(
    ({ eventsSha256 }) => eventsSha256,
  );
  if (new Set(invocationEventHashes).size !== invocationEventHashes.length) {
    issues.push(
      "Benchmark invocations must reference distinct event authority hashes.",
    );
  }
  if (
    eventAuthorities.size !== invocationEventHashes.length ||
    [...eventAuthorities.keys()].some(
      (sha256) => !invocationEventHashes.includes(sha256),
    ) ||
    invocationEventHashes.some((sha256) => !eventAuthorities.has(sha256))
  ) {
    issues.push(
      "Benchmark invocation event authorities must form an exact bijection with invocation eventsSha256 values.",
    );
  }
  for (const authority of measurement.invocationEvents) {
    issues.push(...benchmarkAuthorityMatches(authority, "invocation event"));
  }
  for (const invocation of measurement.invocations) {
    const authority = eventAuthorities.get(invocation.eventsSha256);
    if (authority === undefined) {
      issues.push(
        `Benchmark invocation ${invocation.invocationId} has no matching event authority.`,
      );
      continue;
    }
    const events = readCodexEvents(resolve(repoRoot, authority.path));
    if (events.tag === "invalid") {
      issues.push(events.message);
      continue;
    }
    if (invocation.schemaVersion === 2) {
      const evidence = modelInvocationEvidenceFromEvents(events.events);
      if (evidence.tag === "invalid" || evidence.entry.schemaVersion !== 2) {
        issues.push(
          `Benchmark invocation ${invocation.invocationId} does not have valid v2 event evidence.`,
        );
        continue;
      }
      const withoutEventsHash = Object.fromEntries(
        Object.entries(invocation).filter(([key]) => key !== "eventsSha256"),
      );
      if (canonicalJson(evidence.entry) !== canonicalJson(withoutEventsHash)) {
        issues.push(
          `Benchmark invocation ${invocation.invocationId} does not match its v2 event evidence.`,
        );
      }
    } else {
      const evidence = benchmarkModelInvocationEvidenceFromEvents(
        events.events,
      );
      if (evidence.tag === "invalid") {
        issues.push(
          `Benchmark invocation ${invocation.invocationId} does not have valid auxiliary event evidence.`,
        );
        continue;
      }
      const withoutEventsHash = Object.fromEntries(
        Object.entries(invocation).filter(([key]) => key !== "eventsSha256"),
      );
      if (canonicalJson(evidence.entry) !== canonicalJson(withoutEventsHash)) {
        issues.push(
          `Benchmark invocation ${invocation.invocationId} does not match its auxiliary event evidence.`,
        );
      }
    }
  }

  if (measurement.stagePlan.identity.tag !== "admitted") {
    issues.push(
      "Benchmark measurements require an admitted scenario stage plan.",
    );
  }
  const canonicalInvocations = canonicalBenchmarkInvocations(
    measurement.invocations,
  );
  const canonicalMeasurement: CurrentCompletePathMeasurement = {
    schemaVersion: 2,
    pathId: measurement.pathId,
    stagePlan: measurement.stagePlan,
    stagePlanAuthority: bundle.stagePlan,
    invocationLedgers: measurement.invocationLedgers,
    invocations: canonicalInvocations,
    invocationEvents: measurement.invocationEvents,
    findings: measurement.findings,
    outcome: measurement.outcome,
  };
  issues.push(
    ...currentSemanticIssues(canonicalMeasurement, {
      compositeReviewCount: benchmarkReviewStages(measurement.profile).length,
      requirePlayerInvocation: measurement.outcome.tag === "completed",
    }),
  );
  if (
    measurement.outcome.tag === "completed" &&
    measurement.invocations.some(({ result }) => result.tag === "failed")
  ) {
    issues.push(
      "A completed benchmark path cannot retain a failed invocation.",
    );
  }
  issues.push(...benchmarkSemanticIssues(measurement));
  return issues;
}

function benchmarkSemanticIssues(
  measurement: CurrentBenchmarkMeasurement,
): readonly string[] {
  const canonicalInvocations = canonicalBenchmarkInvocations(
    measurement.invocations,
  );
  const canonicalMeasurement: CurrentCompletePathMeasurement = {
    schemaVersion: 2,
    pathId: measurement.pathId,
    stagePlan: measurement.stagePlan,
    stagePlanAuthority: measurement.scenarioBundle.stagePlan,
    invocationLedgers: measurement.invocationLedgers,
    invocations: canonicalInvocations,
    invocationEvents: measurement.invocationEvents,
    findings: measurement.findings,
    outcome: measurement.outcome,
  };
  const issues = [
    ...currentSemanticIssues(canonicalMeasurement, {
      compositeReviewCount: benchmarkReviewStages(measurement.profile).length,
      requirePlayerInvocation: measurement.outcome.tag === "completed",
    }),
  ];
  const readiness = measurement.invocations.filter(
    (invocation) =>
      invocation.schemaVersion === 3 &&
      invocation.responsibility === "scenarioQuality",
  );
  const redundantCharacters = measurement.invocations.filter(
    (invocation) =>
      invocation.schemaVersion === 3 &&
      invocation.responsibility === "redundantCharacterPreparation",
  );
  const compositeReviewStages = benchmarkReviewStages(measurement.profile);
  const compositeReviewInvocations = measurement.invocations.filter(
    (invocation) =>
      invocation.schemaVersion === 2 &&
      invocation.phase === "scenarioCompositeReview",
  );
  if (compositeReviewInvocations.length !== compositeReviewStages.length) {
    issues.push(
      `The ${measurement.profile} benchmark profile requires exactly ${String(compositeReviewStages.length)} composite review invocation(s), received ${String(compositeReviewInvocations.length)}.`,
    );
  }
  if (measurement.profile === "documentDeclarationSet") {
    if (readiness.length !== 1) {
      issues.push(
        `The document-declaration benchmark profile requires exactly one auxiliary scenario-quality invocation, received ${String(readiness.length)}.`,
      );
    }
    if (redundantCharacters.length !== 2) {
      issues.push(
        `The document-declaration benchmark profile requires exactly two redundant character-preparation invocations, received ${String(redundantCharacters.length)}.`,
      );
    }
    const compositeIndexes = measurement.invocations.flatMap(
      (invocation, index) =>
        invocation.schemaVersion === 2 &&
        invocation.phase === "scenarioCompositeReview"
          ? [index]
          : [],
    );
    const firstComposite = compositeIndexes[0];
    const lastComposite = compositeIndexes.at(-1);
    if (firstComposite !== undefined && lastComposite !== undefined) {
      if (
        readiness.some((invocation) => {
          const readinessIndex = measurement.invocations.indexOf(invocation);
          return (
            readinessIndex <= firstComposite || readinessIndex >= lastComposite
          );
        })
      ) {
        issues.push(
          "The auxiliary scenario-quality invocation must follow milestone review and precede final review.",
        );
      }
      if (
        redundantCharacters.some(
          (invocation) =>
            lastComposite !== undefined &&
            measurement.invocations.indexOf(invocation) <= lastComposite,
        )
      ) {
        issues.push(
          "Redundant character-preparation invocations must follow composite review.",
        );
      }
    }
  } else if (readiness.length !== 0 || redundantCharacters.length !== 0) {
    issues.push(
      "The bounded capability-projection benchmark profile retains no auxiliary invocations.",
    );
  }
  return issues;
}

/**
 * Read current evidence only after every source has passed its canonical
 * authority validator. Structural parsing remains available for historical
 * envelopes and pure schema tests; comparison inputs should come from this
 * validated boundary.
 */
export function validateCompletePathMeasurement(
  value: unknown,
): Either.Either<ValidatedCompletePathMeasurement, string> {
  const parsed = parseCompletePathMeasurement(value);
  if (Either.isLeft(parsed)) return Either.left(parsed.left.message);
  if (parsed.right.schemaVersion === 2) {
    const issues = currentAuthorityIssues(parsed.right);
    if (issues.length > 0) return Either.left([...new Set(issues)].join(" "));
  }
  if (parsed.right.schemaVersion === 3) {
    const issues = benchmarkAuthorityIssues(parsed.right);
    if (issues.length > 0) return Either.left([...new Set(issues)].join(" "));
  }
  return Either.right({
    ...parsed.right,
    [completePathMeasurementValidated]: true,
  } as ValidatedCompletePathMeasurement);
}

export function readCompletePathMeasurement(
  path: string,
): ValidatedCompletePathMeasurement {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
  } catch {
    fail(`Complete-path measurement ${path} is unreadable JSON.`);
  }
  const validated = validateCompletePathMeasurement(value);
  return Either.isRight(validated)
    ? validated.right
    : fail(`Invalid complete-path measurement: ${validated.left}`);
}

export function compareCompleteEquivalentPaths(input: {
  readonly baseline: ValidatedCompletePathMeasurement;
  readonly candidate: ValidatedCompletePathMeasurement;
}): CompletePathComparison {
  const baseline = summary(input.baseline);
  const candidate = summary(input.candidate);
  const baselineWitness = baseline.evidence;
  const candidateWitness = candidate.evidence;
  const issues = [
    ...(input.baseline.schemaVersion === 2
      ? currentSemanticIssues(input.baseline)
      : input.baseline.schemaVersion === 3
        ? benchmarkSemanticIssues(input.baseline)
        : [
            "The baseline is historical and lacks current stage-plan, findings, and v2 invocation authorities.",
          ]),
    ...(input.candidate.schemaVersion === 2
      ? currentSemanticIssues(input.candidate)
      : input.candidate.schemaVersion === 3
        ? benchmarkSemanticIssues(input.candidate)
        : [
            "The candidate is historical and lacks current stage-plan, findings, and v2 invocation authorities.",
          ]),
  ];
  for (const [label, measurement, pathSummary] of [
    ["baseline", input.baseline, baseline] as const,
    ["candidate", input.candidate, candidate] as const,
  ]) {
    if (measurement.schemaVersion !== 3) continue;
    if (measurement.outcome.tag !== "completed") {
      issues.push(
        `The ${label} benchmark path is ${measurement.outcome.tag} and cannot pass equivalent-path comparison.`,
      );
    }
    if (
      pathSummary.acceptedCallVerdicts.tag !== "available" ||
      pathSummary.acceptedCallVerdicts.count < 1
    ) {
      issues.push(
        `The ${label} benchmark path has no accepted SDK-call finding and cannot pass equivalent-path comparison.`,
      );
    }
  }
  if (
    input.baseline.schemaVersion === 3 &&
    input.candidate.schemaVersion === 3 &&
    input.baseline.implementationGitSha !== input.candidate.implementationGitSha
  ) {
    issues.push(
      "Benchmark implementation revisions differ; equivalent-path comparison requires one implementation Git revision.",
    );
  }
  if (
    canonicalJson(equivalenceWitnessIdentity(baselineWitness)) !==
    canonicalJson(equivalenceWitnessIdentity(candidateWitness))
  ) {
    issues.push(
      "Scenario identity, immutable bundle, required responsibilities, or retained evidence differs.",
    );
  }
  const identity = issues.length === 0 ? "equivalent-path" : "different-path";
  const implementationBaseline = implementationForPath(input.baseline);
  const implementationCandidate = implementationForPath(input.candidate);
  const implementation = {
    baselinePhases: implementationBaseline.phases,
    candidatePhases: implementationCandidate.phases,
    baselineModels: implementationBaseline.models,
    candidateModels: implementationCandidate.models,
    baselineProfile: implementationBaseline.profile,
    candidateProfile: implementationCandidate.profile,
    phaseSequenceChanged: compareSequences(
      implementationBaseline.phases,
      implementationCandidate.phases,
    ),
    modelSequenceChanged: compareSequences(
      implementationBaseline.models,
      implementationCandidate.models,
    ),
  };
  return {
    schemaVersion: 2,
    identity,
    equivalence: {
      tag: identity === "equivalent-path" ? "equivalent" : "incomparable",
      baseline: baselineWitness,
      candidate: candidateWitness,
      ...(issues.length === 0
        ? {}
        : { reason: [...new Set(issues)].join(" ") }),
    },
    implementation,
    baseline,
    candidate,
    modelInvocationElapsedMilliseconds: metricComparison(
      baseline,
      candidate,
      identity,
      (value) => value.modelInvocationElapsedMilliseconds,
      "Model-invocation elapsed milliseconds",
    ),
    inputTokens: inputComparison(baseline, candidate, identity),
  };
}

export function writeCompletePathComparison(input: {
  readonly baseline: ValidatedCompletePathMeasurement;
  readonly candidate: ValidatedCompletePathMeasurement;
  readonly outputPath: string;
}): Either.Either<CompletePathComparison, string> {
  const comparison = compareCompleteEquivalentPaths(input);
  const gateFailure = (
    label: string,
    metric:
      | CompletePathComparison["modelInvocationElapsedMilliseconds"]
      | CompletePathComparison["inputTokens"],
  ): readonly string[] => {
    if (metric.tag === "incomparable") {
      return [
        `Complete-path ${label} is incomparable and cannot pass the ${String(COMPLETE_PATH_MIN_REDUCTION)} reduction gate: ${metric.reason}`,
      ];
    }
    if (metric.reduction === undefined) {
      return [
        `Complete-path ${label} has no reduction value and cannot pass the ${String(COMPLETE_PATH_MIN_REDUCTION)} gate.`,
      ];
    }
    return metric.reduction < COMPLETE_PATH_MIN_REDUCTION
      ? [
          `Complete-path ${label} reduction ${String(metric.reduction)} is below the required ${String(COMPLETE_PATH_MIN_REDUCTION)} gate.`,
        ]
      : [];
  };
  const gateFailures = [
    ...gateFailure(
      "model-invocation elapsed milliseconds",
      comparison.modelInvocationElapsedMilliseconds,
    ),
    ...gateFailure("input tokens", comparison.inputTokens),
  ];
  if (gateFailures.length > 0) return Either.left(gateFailures.join(" "));
  try {
    writeFileSync(
      resolve(repoRoot, input.outputPath),
      JSON.stringify(comparison, null, 2) + "\n",
      { flag: "wx" },
    );
    return Either.right(comparison);
  } catch (error: unknown) {
    return Either.left(
      error instanceof Error
        ? error.message
        : "Unable to write complete-path comparison: " + String(error),
    );
  }
}

function main(args: readonly string[]): void {
  const [command, ...rest] = args;
  if (command === "assemble") {
    const [descriptorPath, outputPath, ...unexpected] = rest;
    if (
      descriptorPath === undefined ||
      outputPath === undefined ||
      unexpected.length > 0
    ) {
      fail(
        "Usage: performance-comparison.ts assemble <descriptor.json> <output.json>",
      );
    }
    let descriptor: unknown;
    try {
      descriptor = JSON.parse(
        readFileSync(resolve(repoRoot, descriptorPath), "utf8"),
      );
    } catch {
      fail("Complete-path assembly descriptor is unreadable JSON.");
    }
    const assembled = writeCompletePathMeasurement({
      descriptor,
      outputPath,
    });
    if (Either.isLeft(assembled)) {
      fail("Unable to assemble complete-path measurement: " + assembled.left);
    }
    return;
  }
  if (command === "summarize") {
    const [descriptorPath, outputPath, ...unexpected] = rest;
    if (
      descriptorPath === undefined ||
      outputPath === undefined ||
      unexpected.length > 0
    )
      fail(
        "Usage: performance-comparison.ts summarize <descriptor.json> <output.json>",
      );
    const summary = summarizeControlledRun(
      decode(RunDescriptorSchema, descriptorPath),
    );
    writeFileSync(
      resolve(repoRoot, outputPath),
      `${JSON.stringify(summary, null, 2)}\n`,
      { flag: "wx" },
    );
    return;
  }
  if (command === "compare-legacy") {
    const [legacyPath, freshPath, outputPath, ...unexpected] = rest;
    if (
      legacyPath === undefined ||
      freshPath === undefined ||
      outputPath === undefined ||
      unexpected.length > 0
    )
      fail(
        "Usage: performance-comparison.ts compare-legacy <legacy.json> <fresh.json> <output.json>",
      );
    const comparison = compareControlledRuns(
      decode(LegacyRunEvidenceSchema, legacyPath),
      readControlledPerformance(freshPath),
    );
    writeFileSync(
      resolve(repoRoot, outputPath),
      `${JSON.stringify(comparison, null, 2)}\n`,
      { flag: "wx" },
    );
    return;
  }
  if (command === "compare") {
    const [baselinePath, freshPath, outputPath, ...unexpected] = rest;
    if (
      baselinePath === undefined ||
      freshPath === undefined ||
      outputPath === undefined ||
      unexpected.length > 0
    )
      fail(
        "Usage: performance-comparison.ts compare <baseline.json> <fresh.json> <output.json>",
      );
    const comparison = compareControlledRuns(
      readControlledPerformance(baselinePath),
      readControlledPerformance(freshPath),
    );
    writeFileSync(
      resolve(repoRoot, outputPath),
      `${JSON.stringify(comparison, null, 2)}\n`,
      { flag: "wx" },
    );
    return;
  }
  if (command === "compare-complete") {
    const [baselinePath, candidatePath, outputPath, ...unexpected] = rest;
    if (
      baselinePath === undefined ||
      candidatePath === undefined ||
      outputPath === undefined ||
      unexpected.length > 0
    )
      fail(
        "Usage: performance-comparison.ts compare-complete <baseline.json> <candidate.json> <output.json>",
      );
    const written = writeCompletePathComparison({
      baseline: readCompletePathMeasurement(baselinePath),
      candidate: readCompletePathMeasurement(candidatePath),
      outputPath,
    });
    if (Either.isLeft(written))
      fail("Unable to retain complete-path comparison: " + written.left);
    return;
  }
  fail(
    "Expected assemble, summarize, compare, compare-complete, or compare-legacy command.",
  );
}

if (process.argv[1]?.endsWith("performance-comparison.ts"))
  main(process.argv.slice(2));
