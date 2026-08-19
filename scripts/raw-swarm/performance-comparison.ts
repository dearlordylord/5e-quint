import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, ParseResult, Schema } from "effect";

import {
  artifactAuthority,
  ArtifactAuthoritySchema,
  readJsonLines,
  type ArtifactAuthority,
} from "./artifact-authority.ts";
import {
  MODEL_INVOCATION_PHASES,
  CurrentModelInvocationLedgerEntrySchema,
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
  type FindingsProjection,
} from "./findings.ts";
import { readReviewInvocationEvidenceManifest } from "./review-invocation-evidence.ts";
import {
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
  FinalScenarioReviewSchema,
} from "./scenario-campaign.ts";
export {
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
  FinalScenarioReviewSchema,
};
import { RetainedScenarioReviewInputSchema } from "./scenario-review-input.ts";
import { playerContinuationEvidence } from "./player-continuation-evidence.ts";
import { parseSdkTranscript } from "./sdk-player/sdk-transcript.ts";
import { ReviewOutputSchema } from "./review-contract.ts";
import {
  isJsonRecord,
  canonicalJson,
  repoRoot,
  ScenarioIdSchema,
  sha256Canonical,
} from "./transcript.ts";
import {
  ScenarioStagePlanSchema,
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

const PathOutcomeSchema = Schema.Union(
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
type PathOutcome = Schema.Schema.Type<typeof PathOutcomeSchema>;
type CurrentEvidenceWitness = Readonly<{
  readonly transcript: "retained" | "missing";
  readonly replay: "retained" | "missing";
  readonly findings: "retained" | "missing";
  readonly prePlayReview: "retained" | "missing";
  readonly postPlayReview: "retained" | "missing";
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

export type CompletePathSummary = Readonly<{
  readonly evidenceVersion: "current" | "historical";
  readonly outcome: PathOutcome | UnavailableEvidence;
  readonly acceptedCalls: EvidenceCount;
  readonly corrections: EvidenceCount;
  readonly failedStages: EvidenceCount;
  readonly failureReasons: EvidenceList;
  readonly elapsedMilliseconds: EvidenceCount;
  readonly usage: ModelUsage;
  readonly evidence: CompletePathEquivalenceWitness;
}>;

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
      | readonly ModelInvocationPhase[]
      | UnavailableEvidence;
    readonly candidatePhases:
      | readonly ModelInvocationPhase[]
      | UnavailableEvidence;
    readonly baselineModels: readonly string[] | UnavailableEvidence;
    readonly candidateModels: readonly string[] | UnavailableEvidence;
    readonly phaseSequenceChanged: boolean | UnavailableEvidence;
    readonly modelSequenceChanged: boolean | UnavailableEvidence;
  }>;
  readonly baseline: CompletePathSummary;
  readonly candidate: CompletePathSummary;
  readonly elapsedMilliseconds: Readonly<{
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
  invocations: readonly ModelInvocationLedgerEntry[],
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
    if (mapping.countPolicy === "exactlyOne" && count !== 1) {
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
    acceptedCalls: pathDimension(
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
    elapsedMilliseconds: pathDimension(
      measurement.invocations.reduce(
        (total, { elapsedMilliseconds }) => total + elapsedMilliseconds,
        0,
      ),
    ),
    usage: aggregatePathUsage(measurement.invocations),
    evidence: currentPathWitness(measurement),
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
    acceptedCalls: {
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
    elapsedMilliseconds: pathDimension(
      measurement.legacy.wholePathElapsedMilliseconds,
    ),
    usage: aggregatePathUsage(invocations),
    evidence: historicalPathWitness(measurement),
  };
}

function summary(measurement: CompletePathMeasurement): CompletePathSummary {
  return measurement.schemaVersion === 2
    ? currentSummary(measurement)
    : historicalSummary(measurement);
}

function sequenceChanged<A>(
  baseline: readonly A[],
  candidate: readonly A[],
): boolean {
  return canonicalJson(baseline) !== canonicalJson(candidate);
}

function implementationForPath(measurement: CompletePathMeasurement): {
  readonly phases: readonly ModelInvocationPhase[] | UnavailableEvidence;
  readonly models: readonly string[] | UnavailableEvidence;
} {
  if (measurement.schemaVersion === 1) {
    const unavailable: UnavailableEvidence = {
      tag: "unavailable",
      reason:
        "Historical evidence has no canonical per-invocation phase sequence.",
    };
    if (!Array.isArray(measurement.invocations)) {
      return { phases: unavailable, models: unavailable };
    }
    return {
      phases: measurement.invocations.map(({ phase }) => phase),
      models: measurement.invocations.map(({ model }) => model),
    };
  }
  return {
    phases: measurement.invocations.map(({ phase }) => phase),
    models: measurement.invocations.map(({ model }) => model),
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
): CompletePathComparison["elapsedMilliseconds"] {
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

function isPrePlayReviewSourceAuthorityRole(role: string): boolean {
  return namedReviewStageAuthorityRole(role, "prePlayReviewSourceInput");
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
  let scenarioReviewGitSha: string | undefined;
  for (const authority of scenarioReviewAuthorities) {
    const value = readAuthorityJson(authority);
    if (value.tag === "invalid") {
      issues.push(value.message);
      continue;
    }
    const decoded = Schema.decodeUnknownEither(FinalScenarioReviewSchema, {
      onExcessProperty: "error",
    })(value.value);
    if (Either.isLeft(decoded)) {
      issues.push(
        `Scenario-review authority ${authority.role} has an unsupported current schema.`,
      );
      continue;
    }
    scenarioReviewGitSha ??= decoded.right.gitSha;
    if (
      decoded.right.scenarioId !== findings.run.scenarioId ||
      decoded.right.scenarioSha256 !== expectedScenarioSha256 ||
      (scenarioIdentity.tag === "admitted" &&
        authority.sha256 !== scenarioIdentity.scenarioReviewSha256)
    ) {
      issues.push(
        `Scenario-review authority ${authority.role} is not bound to the exact scenario/review identity.`,
      );
    }
  }

  const prePlayReviewSourceAuthorities = findings.authorities.filter(
    ({ role }) => isPrePlayReviewSourceAuthorityRole(role),
  );
  if (
    prePlayReviewSourceAuthorities.length !== 0 &&
    prePlayReviewSourceAuthorities.length !== 2
  ) {
    issues.push(
      `Current path requires both pre-play source review authorities when one is retained, received ${String(prePlayReviewSourceAuthorities.length)}.`,
    );
  }
  const prePlaySourceStages = new Set<string>();
  for (const authority of prePlayReviewSourceAuthorities) {
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
        `Pre-play source authority ${authority.role} has an unsupported retained-review schema.`,
      );
      continue;
    }
    const source = decoded.right;
    const currentResult = Schema.decodeUnknownEither(
      CurrentScenarioCompositeReviewSchema,
      { onExcessProperty: "error" },
    )(source.result);
    const expectedOutputMatches =
      canonicalJson(source.outputJsonSchema) ===
      canonicalJson(expectedOutputJsonSchema);
    if (
      Either.isLeft(currentResult) ||
      source.scenarioId !== findings.run.scenarioId ||
      (scenarioReviewGitSha !== undefined &&
        source.sourceGitSha !== scenarioReviewGitSha) ||
      !expectedOutputMatches ||
      prePlaySourceStages.has(source.reviewStage)
    ) {
      issues.push(
        `Pre-play source authority ${authority.role} is not bound to the current scenario-review identity and current composite schema.`,
      );
    }
    prePlaySourceStages.add(source.reviewStage);
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
      (authority.role.startsWith("prePlayReviewSourceInput-") &&
        !isPrePlayReviewSourceAuthorityRole(authority.role)) ||
      (authority.role.startsWith("prePlayReviewReplayInput-") &&
        !isReplayAuthorityRole(authority.role))
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
      : [
          "The baseline is historical and lacks current stage-plan, findings, and v2 invocation authorities.",
        ]),
    ...(input.candidate.schemaVersion === 2
      ? currentSemanticIssues(input.candidate)
      : [
          "The candidate is historical and lacks current stage-plan, findings, and v2 invocation authorities.",
        ]),
  ];
  if (canonicalJson(baselineWitness) !== canonicalJson(candidateWitness)) {
    issues.push(
      "Scenario identity, required responsibilities, or retained evidence differs.",
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
    elapsedMilliseconds: metricComparison(
      baseline,
      candidate,
      identity,
      (value) => value.elapsedMilliseconds,
      "Elapsed milliseconds",
    ),
    inputTokens: inputComparison(baseline, candidate, identity),
  };
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
  fail("Expected assemble, summarize, compare, or compare-legacy command.");
}

if (process.argv[1]?.endsWith("performance-comparison.ts"))
  main(process.argv.slice(2));
