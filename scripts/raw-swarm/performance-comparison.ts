import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, Schema } from "effect";

import {
  MODEL_INVOCATION_PHASES,
  type ModelInvocationLedgerEntry,
  type ModelInvocationPhase,
} from "./model-telemetry.ts";
import { parseSdkTranscript } from "./sdk-player/sdk-transcript.ts";
import { isJsonRecord, repoRoot } from "./transcript.ts";

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));
const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);

const RunDescriptorSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  transcriptPath: Schema.NonEmptyTrimmedString,
  reviewPath: Schema.NonEmptyTrimmedString,
  invocationLedgerPaths: Schema.Array(Schema.NonEmptyTrimmedString),
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
  scenarioId: Schema.NonEmptyTrimmedString,
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

type UsageTotals = {
  readonly input: number;
  readonly cachedInput: number;
  readonly cacheWriteInput: number;
  readonly output: number;
  readonly reasoningOutput: number;
  readonly inputPlusOutput: number;
};

type PhaseSummary = {
  readonly invocationCount: number;
  readonly elapsedMilliseconds: number;
  readonly models: readonly string[];
  readonly reasoningEfforts: readonly string[];
  readonly usage:
    | { readonly tag: "available"; readonly totals: UsageTotals }
    | { readonly tag: "unavailable"; readonly reasons: readonly string[] };
};

const UsageTotalsSchema = Schema.Struct({
  input: NonNegativeIntegerSchema,
  cachedInput: NonNegativeIntegerSchema,
  cacheWriteInput: NonNegativeIntegerSchema,
  output: NonNegativeIntegerSchema,
  reasoningOutput: NonNegativeIntegerSchema,
  inputPlusOutput: NonNegativeIntegerSchema,
});
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
const NormalizedTokensSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("available"),
    perInvocation: Schema.Number.pipe(Schema.nonNegative()),
    perContinuation: Schema.Number.pipe(Schema.nonNegative()),
    perCall: Schema.Number.pipe(Schema.nonNegative()),
  }),
  Schema.Struct({ tag: Schema.Literal("unavailable") }),
);
const ArtifactAuthoritySchema = Schema.Struct({
  path: Schema.NonEmptyTrimmedString,
  byteLength: NonNegativeIntegerSchema,
  sha256: HashSchema,
});
const ControlledRunPerformanceSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  telemetryAuthority: Schema.Literal("codex-json-events"),
  scenarioId: Schema.NonEmptyTrimmedString,
  scenarioSha256: HashSchema,
  scenarioReviewSha256: HashSchema,
  charactersSha256: HashSchema,
  setupSha256: HashSchema,
  calls: Schema.Number.pipe(Schema.int(), Schema.positive()),
  continuations: Schema.Number.pipe(Schema.int(), Schema.positive()),
  phases: Schema.Record({
    key: Schema.Literal(...MODEL_INVOCATION_PHASES),
    value: PhaseSummarySchema,
  }),
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
    transcript: ArtifactAuthoritySchema,
    review: ArtifactAuthoritySchema,
    invocationLedgers: Schema.Array(ArtifactAuthoritySchema),
    supervisorTimings: ArtifactAuthoritySchema,
    reportingTiming: ArtifactAuthoritySchema,
    reportingManifest: ArtifactAuthoritySchema,
  }),
});

export type ControlledRunPerformance = {
  readonly schemaVersion: 1;
  readonly telemetryAuthority: "codex-json-events";
  readonly scenarioId: string;
  readonly scenarioSha256: string;
  readonly scenarioReviewSha256: string;
  readonly charactersSha256: string;
  readonly setupSha256: string;
  readonly calls: number;
  readonly continuations: number;
  readonly phases: Readonly<Record<ModelInvocationPhase, PhaseSummary>>;
  readonly supervisor: {
    readonly continuationCount: number;
    readonly typecheckMilliseconds: number;
    readonly replayMilliseconds: number;
    readonly sdkExecutionMilliseconds: number;
    readonly evidenceWritingMilliseconds: number;
    readonly nonModelMilliseconds: number;
    readonly perContinuationMilliseconds: number;
    readonly perCallMilliseconds: number;
    readonly replayCacheDecision: {
      readonly cumulativeReplayMilliseconds: number;
      readonly shareOfNonModelSupervisor: number;
      readonly admitted: boolean;
    };
  };
  readonly reportingElapsedMilliseconds: number;
  readonly wholePathElapsedMilliseconds: number;
  readonly comparablePathElapsedMilliseconds: number;
  readonly unchangedControlElapsedMilliseconds: number;
  readonly normalizedTokens: {
    readonly player:
      | {
          readonly tag: "available";
          readonly perInvocation: number;
          readonly perContinuation: number;
          readonly perCall: number;
        }
      | { readonly tag: "unavailable" };
    readonly postPlayReview:
      | {
          readonly tag: "available";
          readonly perInvocation: number;
          readonly perContinuation: number;
          readonly perCall: number;
        }
      | { readonly tag: "unavailable" };
  };
  readonly sources: {
    readonly transcript: ArtifactAuthority;
    readonly review: ArtifactAuthority;
    readonly invocationLedgers: readonly ArtifactAuthority[];
    readonly supervisorTimings: ArtifactAuthority;
    readonly reportingTiming: ArtifactAuthority;
    readonly reportingManifest: ArtifactAuthority;
  };
};

type ArtifactAuthority = {
  readonly path: string;
  readonly byteLength: number;
  readonly sha256: string;
};

function fail(message: string): never {
  throw new Error(message);
}

function jsonLines(path: string): readonly unknown[] {
  return readFileSync(resolve(repoRoot, path), "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        return fail(`${path}:${index + 1} is malformed JSONL.`);
      }
    });
}

function artifactAuthority(path: string): ArtifactAuthority {
  const bytes = readFileSync(resolve(repoRoot, path));
  return {
    path,
    byteLength: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function availableCount(value: unknown): number | undefined {
  return isJsonRecord(value) &&
    value.tag === "available" &&
    typeof value.count === "number" &&
    Number.isInteger(value.count) &&
    value.count >= 0
    ? value.count
    : undefined;
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}

function ledgerEntry(value: unknown): ModelInvocationLedgerEntry {
  if (
    !isJsonRecord(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "phase",
      "invocationId",
      "model",
      "reasoningEffort",
      "startedAt",
      "elapsedMilliseconds",
      "exit",
      "usage",
    ]) ||
    value.schemaVersion !== 1 ||
    !MODEL_INVOCATION_PHASES.includes(value.phase as ModelInvocationPhase) ||
    typeof value.invocationId !== "string" ||
    value.invocationId.length === 0 ||
    typeof value.model !== "string" ||
    value.model.length === 0 ||
    typeof value.reasoningEffort !== "string" ||
    value.reasoningEffort.length === 0 ||
    typeof value.startedAt !== "string" ||
    value.startedAt.length === 0 ||
    typeof value.elapsedMilliseconds !== "number" ||
    !Number.isInteger(value.elapsedMilliseconds) ||
    value.elapsedMilliseconds < 0 ||
    !isJsonRecord(value.exit) ||
    !isJsonRecord(value.usage)
  )
    fail("Invocation ledger entry is invalid.");
  const exitValid =
    (value.exit.tag === "exited" &&
      hasExactKeys(value.exit, ["tag", "status"]) &&
      typeof value.exit.status === "number" &&
      Number.isInteger(value.exit.status)) ||
    (value.exit.tag === "signaled" &&
      hasExactKeys(value.exit, ["tag", "signal"]) &&
      typeof value.exit.signal === "string" &&
      value.exit.signal.length > 0);
  const usageValid =
    (value.usage.tag === "unavailable" &&
      hasExactKeys(value.usage, ["tag", "reason"]) &&
      typeof value.usage.reason === "string" &&
      value.usage.reason.length > 0) ||
    (value.usage.tag === "available" &&
      hasExactKeys(value.usage, [
        "tag",
        "input",
        "cachedInput",
        "cacheWriteInput",
        "output",
        "reasoningOutput",
      ]) &&
      [
        value.usage.input,
        value.usage.cachedInput,
        value.usage.cacheWriteInput,
        value.usage.output,
        value.usage.reasoningOutput,
      ].every(
        (counter) =>
          isJsonRecord(counter) &&
          ((counter.tag === "unavailable" && hasExactKeys(counter, ["tag"])) ||
            (counter.tag === "available" &&
              hasExactKeys(counter, ["tag", "count"]) &&
              availableCount(counter) !== undefined)),
      ));
  if (!exitValid || !usageValid) fail("Invocation ledger entry is invalid.");
  return value as ModelInvocationLedgerEntry;
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
    const input = availableCount(usage.input);
    const cachedInput = availableCount(usage.cachedInput);
    const cacheWriteInput = availableCount(usage.cacheWriteInput);
    const output = availableCount(usage.output);
    const reasoningOutput = availableCount(usage.reasoningOutput);
    return input === undefined ||
      cachedInput === undefined ||
      cacheWriteInput === undefined ||
      output === undefined ||
      reasoningOutput === undefined
      ? []
      : [{ input, cachedInput, cacheWriteInput, output, reasoningOutput }];
  });
  const usage =
    selected.length > 0 &&
    counters.length === selected.length &&
    reasons.length === 0
      ? {
          tag: "available" as const,
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
          tag: "unavailable" as const,
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
  const transcript = parseSdkTranscript(jsonLines(input.transcriptPath));
  if (transcript.tag === "invalid") fail(transcript.message);
  if (transcript.value.calls.length === 0)
    fail("Controlled performance requires a runnable SDK transcript.");
  const scenarioId = transcript.value.header.scenarioId;
  const scenarioSha256 = transcript.value.header.scenarioSha256;
  const scenarioReviewSha256 = transcript.value.header.scenarioReviewSha256;
  const charactersSha256 = transcript.value.header.charactersSha256;
  const setupSha256 =
    transcript.value.header.setupSha256 ??
    fail("Controlled performance requires a ready scenario setup artifact.");
  const calls = transcript.value.calls.length;
  const continuations = [
    ...new Set(transcript.value.calls.map(({ continuation }) => continuation)),
  ].sort((left, right) => left - right);
  const entries = input.invocationLedgerPaths.flatMap((path) =>
    jsonLines(path).map(ledgerEntry),
  );
  const reportingTiming = decode(
    ReportingTimingSchema,
    input.reportingTimingPath,
  );
  const transcriptAuthority = artifactAuthority(input.transcriptPath);
  const reviewAuthority = artifactAuthority(input.reviewPath);
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
  const timingRows = jsonLines(input.supervisorTimingPath);
  const timing = timingRows.map((value) => {
    if (
      !isJsonRecord(value) ||
      value.schemaVersion !== 1 ||
      typeof value.continuation !== "number" ||
      !Number.isInteger(value.continuation) ||
      !isJsonRecord(value.phases)
    )
      return fail("Supervisor timing row is invalid.");
    const phase = value.phases;
    const numbers = [
      phase.continuationTypecheckMilliseconds,
      phase.priorCallVerificationReplayMilliseconds,
      phase.newSdkExecutionMilliseconds,
      phase.evidenceWritingMilliseconds,
    ];
    if (
      numbers.some(
        (entry) =>
          typeof entry !== "number" || !Number.isInteger(entry) || entry < 0,
      )
    )
      return fail("Supervisor timing row has invalid phase durations.");
    return {
      continuation: value.continuation,
      phases: numbers as readonly [number, number, number, number],
    };
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
  const sums = timing.reduce(
    (total, row) =>
      total.map((value, index) => value + row.phases[index]!) as [
        number,
        number,
        number,
        number,
      ],
    [0, 0, 0, 0] as [number, number, number, number],
  );
  const phases = Object.fromEntries(
    MODEL_INVOCATION_PHASES.map((phase) => [
      phase,
      phaseSummary(entries, phase),
    ]),
  ) as Readonly<Record<ModelInvocationPhase, PhaseSummary>>;
  const modelElapsed = MODEL_INVOCATION_PHASES.reduce(
    (total, phase) => total + phases[phase].elapsedMilliseconds,
    0,
  );
  const unchangedControlElapsedMilliseconds = [
    "scenarioGeneration",
    "scenarioCharacterAuthoring",
    "scenarioSetupAuthoring",
  ].reduce(
    (total, phase) =>
      total + phases[phase as ModelInvocationPhase].elapsedMilliseconds,
    0,
  );
  const comparableModelElapsedMilliseconds = [
    "scenarioCompositeReview",
    "player",
    "postPlayReview",
  ].reduce(
    (total, phase) =>
      total + phases[phase as ModelInvocationPhase].elapsedMilliseconds,
    0,
  );
  const nonModelMilliseconds = sums.reduce((total, value) => total + value, 0);
  const normalized = (phase: PhaseSummary) =>
    phase.usage.tag === "available" && phase.invocationCount > 0
      ? {
          tag: "available" as const,
          perInvocation:
            phase.usage.totals.inputPlusOutput / phase.invocationCount,
          perContinuation:
            phase.usage.totals.inputPlusOutput / continuations.length,
          perCall: phase.usage.totals.inputPlusOutput / calls,
        }
      : { tag: "unavailable" as const };
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
      typecheckMilliseconds: sums[0],
      replayMilliseconds: sums[1],
      sdkExecutionMilliseconds: sums[2],
      evidenceWritingMilliseconds: sums[3],
      nonModelMilliseconds,
      perContinuationMilliseconds: nonModelMilliseconds / continuations.length,
      perCallMilliseconds: nonModelMilliseconds / calls,
      replayCacheDecision: {
        cumulativeReplayMilliseconds: sums[1],
        shareOfNonModelSupervisor:
          nonModelMilliseconds === 0 ? 0 : sums[1] / nonModelMilliseconds,
        admitted:
          sums[1] >= 60_000 &&
          nonModelMilliseconds > 0 &&
          sums[1] / nonModelMilliseconds >= 0.1,
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
      transcript: transcriptAuthority,
      review: reviewAuthority,
      invocationLedgers: input.invocationLedgerPaths.map(artifactAuthority),
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
  readonly compactPostPlayTokens:
    | {
        readonly tag: "comparable";
        readonly reduction: number;
        readonly passes: boolean;
      }
    | { readonly tag: "incomparable"; readonly reason: string };
  readonly compactPostPlayWall:
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

type NormalizedTokenValues = {
  readonly perInvocation: number;
  readonly perContinuation: number;
  readonly perCall: number;
};

function reduction(baseline: number, fresh: number): number {
  return baseline === 0 ? 0 : (baseline - fresh) / baseline;
}

function matchingPhase(
  baseline: PhaseSummary,
  fresh: PhaseSummary,
  requiredReduction: number,
): PerformanceComparison["compactPostPlayTokens"] {
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
      baseline.phases[phase].invocationCount ===
        fresh.phases[phase].invocationCount,
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
    authority: "codex-json-events" as const,
    player: phaseTokens(fresh.phases.player),
    postPlayReview: phaseTokens(fresh.phases.postPlayReview),
    comparablePath: controlledComparableTokens(fresh),
  };
  if (!("telemetryAuthority" in baseline)) {
    const postPlayIdentityMatches =
      baseline.postPlayReview.model === fresh.phases.postPlayReview.models[0] &&
      fresh.phases.postPlayReview.models.length === 1 &&
      baseline.postPlayReview.reasoningEffort ===
        fresh.phases.postPlayReview.reasoningEfforts[0] &&
      fresh.phases.postPlayReview.reasoningEfforts.length === 1;
    const compactWallReduction = reduction(
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
      compactPostPlayTokens: {
        tag: "incomparable",
        reason:
          "Legacy footer tokens are not first-party per-invocation JSON usage.",
      },
      compactPostPlayWall:
        sameScenario && postPlayIdentityMatches
          ? {
              tag: "comparable",
              reduction: compactWallReduction,
              passes: compactWallReduction >= 0.5,
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
    baseline.phases.player.invocationCount ===
      fresh.phases.player.invocationCount &&
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
    compactPostPlayTokens: sameScenario
      ? matchingPhase(
          baseline.phases.postPlayReview,
          fresh.phases.postPlayReview,
          0.5,
        )
      : { tag: "incomparable", reason: "Scenario identity differs." },
    compactPostPlayWall:
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

function decode<A>(schema: Schema.Schema<A>, path: string): A {
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
  const run = decoded as ControlledRunPerformance;
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
  const controlElapsed = [
    "scenarioGeneration",
    "scenarioCharacterAuthoring",
    "scenarioSetupAuthoring",
  ].reduce(
    (total, phase) =>
      total + run.phases[phase as ModelInvocationPhase].elapsedMilliseconds,
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
    !sourceMatches(run.sources.transcript) ||
    !sourceMatches(run.sources.review) ||
    run.sources.invocationLedgers.length === 0 ||
    run.sources.invocationLedgers.some((source) => !sourceMatches(source)) ||
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
    transcriptPath: run.sources.transcript.path,
    reviewPath: run.sources.review.path,
    invocationLedgerPaths: run.sources.invocationLedgers.map(
      (source) => source.path,
    ),
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
