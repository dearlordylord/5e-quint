import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, Schema } from "effect";

import {
  artifactAuthority,
  ArtifactAuthoritySchema,
  readJsonLines,
  type ArtifactAuthority,
} from "./artifact-authority.ts";
import {
  MODEL_INVOCATION_PHASES,
  parseModelInvocationLedgerEntry,
  type ModelInvocationLedgerEntry,
  type ModelInvocationPhase,
} from "./model-telemetry.ts";
import { readReviewInvocationEvidenceManifest } from "./review-invocation-evidence.ts";
import { parseSdkTranscript } from "./sdk-player/sdk-transcript.ts";
import { isJsonRecord, repoRoot, ScenarioIdSchema } from "./transcript.ts";

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));
const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);

const RunDescriptorSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  reviewInvocationEvidencePath: Schema.NonEmptyTrimmedString,
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

const LegacyRunEvidenceSchema = Schema.Struct({
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
type LegacyRunEvidence = Schema.Schema.Type<typeof LegacyRunEvidenceSchema>;

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
  const continuations = [
    ...new Set(transcript.value.calls.map(({ continuation }) => continuation)),
  ].sort((left, right) => left - right);
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
    new Set(timedContinuations).size !== timedContinuations.length ||
    JSON.stringify(timedContinuations) !== JSON.stringify(continuations)
  )
    fail(
      "Supervisor timings must cover every authoritative transcript continuation exactly once.",
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
  "scenarioSetupAuthoring",
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
    supervisorTimingPath: run.sources.supervisorTimings.path,
    reportingTimingPath: run.sources.reportingTiming.path,
    reportingManifestPath: run.sources.reportingManifest.path,
  });
  if (JSON.stringify(recomputed) !== JSON.stringify(run)) {
    fail(`Controlled performance evidence ${path} changed from its sources.`);
  }
  return run;
}

function main(args: readonly string[]): void {
  const [command, ...rest] = args;
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
  fail("Expected summarize, compare, or compare-legacy command.");
}

if (process.argv[1]?.endsWith("performance-comparison.ts"))
  main(process.argv.slice(2));
