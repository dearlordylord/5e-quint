import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import type { EventEmitter } from "node:events";
import {
  appendFileSync,
  closeSync,
  existsSync,
  ftruncateSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeSync,
} from "node:fs";

import { Either, Match, Option, ParseResult, Schema } from "effect";

import {
  canonicalJson,
  GitShaSchema,
  isJsonRecord,
  ScenarioIdSchema,
  StartedAtSchema,
  type GitSha,
  type ScenarioId,
} from "./transcript.ts";
import {
  BenchmarkIdSchema,
  EvidenceSetIdSchema,
  ExecutionIdSchema,
  HistoricalScenarioIdSchema,
  ScenarioCampaignIdSchema,
  ScenarioCandidateIdSchema,
  PlannedScenarioIdSchema,
  type BenchmarkId,
  type EvidenceSetId,
  type ExecutionId,
  type ScenarioCampaignId,
  type ScenarioCandidateId,
  type PlannedScenarioId,
  type HistoricalScenarioId,
} from "./raw-swarm-identities.ts";

/** Current phase vocabulary. New evidence cannot invent a readiness pass. */
export const MODEL_INVOCATION_PHASES = [
  "scenarioGeneration",
  "scenarioCompositeReview",
  "scenarioCharacterAuthoring",
  "scenarioSetupNeutralAuthoring",
  "scenarioSetupControllerAuthoring",
  "player",
  "postPlayReview",
] as const;
export type ModelInvocationPhase = (typeof MODEL_INVOCATION_PHASES)[number];

/**
 * A model child must not remain an unbounded process in an evidence-producing
 * workflow. Callers can use a shorter boundary in tests or for a narrower
 * protocol, but every invocation has an owned timeout by default.
 */
export const MODEL_INVOCATION_TIMEOUT_MILLISECONDS = 30 * 60 * 1_000;

/**
 * A benchmark can retain historical auxiliary work without making that work
 * part of the production stage vocabulary. The benchmark parser below is
 * the only boundary that accepts these additional phases.
 */
export const BENCHMARK_MODEL_INVOCATION_PHASES = [
  ...MODEL_INVOCATION_PHASES,
  "scenarioReadiness",
] as const;
export type BenchmarkModelInvocationPhase =
  (typeof BENCHMARK_MODEL_INVOCATION_PHASES)[number];

/** v1 retained evidence may still name the removed readiness invocation. */
export const HISTORICAL_MODEL_INVOCATION_PHASES = [
  "scenarioGeneration",
  "scenarioCompositeReview",
  "scenarioReadiness",
  "scenarioCharacterAuthoring",
  "scenarioSetupAuthoring",
  "player",
  "postPlayReview",
] as const;
export type HistoricalModelInvocationPhase =
  (typeof HISTORICAL_MODEL_INVOCATION_PHASES)[number];

const NonNegativeIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThanOrEqualTo(0),
);
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThan(0),
);
const TokenCountSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("available"),
    count: NonNegativeIntegerSchema,
  }),
  Schema.Struct({ tag: Schema.Literal("unavailable") }),
);
const ModelUsageSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("available"),
    input: TokenCountSchema,
    cachedInput: TokenCountSchema,
    cacheWriteInput: TokenCountSchema,
    output: TokenCountSchema,
    reasoningOutput: TokenCountSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("unavailable"),
    reason: Schema.NonEmptyString,
  }),
);
export const MODEL_INVOCATION_LAST_MESSAGE_FAILURE_KINDS = [
  "lastMessageMissing",
  "lastMessageUnreadable",
  "lastMessageEmpty",
  "lastMessageMalformed",
  "lastMessageSchemaInvalid",
] as const;
type ModelInvocationLastMessageFailureKind =
  (typeof MODEL_INVOCATION_LAST_MESSAGE_FAILURE_KINDS)[number];
const MODEL_INVOCATION_CODEX_FAILURE_KINDS = ["codexEvent"] as const;
type ModelInvocationFailureKind =
  | ModelInvocationLastMessageFailureKind
  | (typeof MODEL_INVOCATION_CODEX_FAILURE_KINDS)[number];
/**
 * Historical result envelopes are intentionally closed.  The output-failure
 * discriminator was introduced with v5 and must not be backfilled into v2-v4
 * or benchmark v3 records when they are decoded.
 */
const HistoricalModelInvocationResultSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("succeeded") }),
  Schema.Struct({
    tag: Schema.Literal("failed"),
    reason: Schema.NonEmptyTrimmedString,
  }),
);

/**
 * Current v5 output failures retain their operation in durable evidence.  A
 * last-message failure is meaningful only for an invocation that promised a
 * retained last message; keeping that fact in the record prevents a
 * no-output row from being interpreted as an output failure later.
 */
const CurrentModelInvocationResultSchema = Schema.Union(
  HistoricalModelInvocationResultSchema,
  Schema.Struct({
    tag: Schema.Literal("failed"),
    reason: Schema.NonEmptyTrimmedString,
    failureKind: Schema.Literal(...MODEL_INVOCATION_LAST_MESSAGE_FAILURE_KINDS),
    operation: Schema.Literal("expectedLastMessage"),
  }),
  Schema.Struct({
    tag: Schema.Literal("failed"),
    reason: Schema.NonEmptyTrimmedString,
    failureKind: Schema.Literal(...MODEL_INVOCATION_CODEX_FAILURE_KINDS),
  }),
);

function invocationResultMatchesExit(input: {
  readonly exit: { readonly tag: string; readonly status?: number };
  readonly result: { readonly tag: string };
}): boolean {
  const succeeded =
    (input.exit.tag === "exited" || input.exit.tag === "shellStatus") &&
    input.exit.status === 0;
  return succeeded
    ? input.result.tag === "succeeded"
    : input.result.tag === "failed";
}

function currentInvocationResultMatchesExit(input: {
  readonly exit: { readonly tag: string; readonly status?: number };
  readonly result: {
    readonly tag: string;
    readonly failureKind?: ModelInvocationFailureKind;
  };
}): boolean {
  const succeeded =
    (input.exit.tag === "exited" || input.exit.tag === "shellStatus") &&
    input.exit.status === 0;
  if (!succeeded) {
    return (
      input.result.tag === "failed" &&
      (input.result.failureKind === undefined ||
        input.result.failureKind === "codexEvent")
    );
  }
  return (
    input.result.tag === "succeeded" ||
    (input.result.tag === "failed" && input.result.failureKind !== undefined)
  );
}

const HistoricalModelInvocationExitSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("exited"),
    status: Schema.Number.pipe(Schema.int()),
  }),
  Schema.Struct({
    tag: Schema.Literal("signaled"),
    signal: Schema.NonEmptyString,
  }),
  Schema.Struct({
    tag: Schema.Literal("failedToStart"),
    message: Schema.NonEmptyString,
  }),
  Schema.Struct({
    tag: Schema.Literal("shellStatus"),
    status: Schema.Number.pipe(Schema.int()),
  }),
);

/** Signal delivery is distinct from the later process-settlement fact. */
const DeliveredModelInvocationSignalSchema = Schema.Struct({
  tag: Schema.Literal("confirmed"),
  signal: Schema.Literal("SIGTERM", "SIGKILL"),
});
const ModelInvocationSignalDeliverySchema = Schema.Union(
  DeliveredModelInvocationSignalSchema,
  Schema.Struct({
    tag: Schema.Literal("notDelivered"),
    signal: Schema.Literal("SIGTERM", "SIGKILL"),
    reason: Schema.NonEmptyTrimmedString,
  }),
);

/**
 * Timeout evidence records whether the child was actually reaped.  A
 * successful signal delivery alone is not process-settlement evidence.
 */
const ModelInvocationTimeoutTerminationSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("reaped"),
    signalDelivery: ModelInvocationSignalDeliverySchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("unreaped"),
    signalDelivery: ModelInvocationSignalDeliverySchema,
    reason: Schema.NonEmptyTrimmedString,
  }),
);

/**
 * Timeout telemetry was added after the retained v1-v4 envelopes.  Keep that
 * state out of their decoders; a timeout in a new run is a v5 record.
 */
const CurrentModelInvocationExitSchema = Schema.Union(
  HistoricalModelInvocationExitSchema,
  Schema.Struct({
    tag: Schema.Literal("timedOut"),
    timeoutMilliseconds: PositiveIntegerSchema,
    termination: ModelInvocationTimeoutTerminationSchema,
  }),
);

/** Identity fields shared by every retained model invocation envelope. */
const HistoricalModelInvocationIdentityFields = {
  scenarioId: HistoricalScenarioIdSchema,
  invocationId: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  reasoningEffort: Schema.NonEmptyString,
} as const;

export type CurrentModelInvocationSubject =
  | Readonly<{
      readonly tag: "scenarioCampaign";
      readonly campaignId: ScenarioCampaignId;
      readonly evidenceSetId: EvidenceSetId;
      readonly plannedScenarioId: PlannedScenarioId;
    }>
  | Readonly<{
      readonly tag: "scenarioCandidate";
      readonly campaignId: ScenarioCampaignId;
      readonly evidenceSetId: EvidenceSetId;
      readonly candidateId: ScenarioCandidateId;
      readonly candidateScenarioSha256: string;
      readonly plannedScenarioId: PlannedScenarioId;
    }>
  | Readonly<{ readonly tag: "scenario"; readonly scenarioId: ScenarioId }>
  | Readonly<{
      readonly tag: "execution";
      readonly executionId: ExecutionId;
      readonly evidenceSetId: EvidenceSetId;
      readonly scenarioId: ScenarioId;
    }>
  | Readonly<{
      readonly tag: "benchmark";
      readonly benchmarkId: BenchmarkId;
      readonly profile:
        | "documentDeclarationSet"
        | "boundedCapabilityProjection";
      readonly scenarioId: ScenarioId;
    }>;

const CurrentModelInvocationSubjectSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("scenarioCampaign"),
    campaignId: ScenarioCampaignIdSchema,
    evidenceSetId: EvidenceSetIdSchema,
    plannedScenarioId: PlannedScenarioIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("scenarioCandidate"),
    campaignId: ScenarioCampaignIdSchema,
    evidenceSetId: EvidenceSetIdSchema,
    candidateId: ScenarioCandidateIdSchema,
    candidateScenarioSha256: Schema.String.pipe(
      Schema.pattern(/^[0-9a-f]{64}$/),
    ),
    plannedScenarioId: PlannedScenarioIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("scenario"),
    scenarioId: ScenarioIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("execution"),
    executionId: ExecutionIdSchema,
    evidenceSetId: EvidenceSetIdSchema,
    scenarioId: ScenarioIdSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("benchmark"),
    benchmarkId: BenchmarkIdSchema,
    profile: Schema.Literal(
      "documentDeclarationSet",
      "boundedCapabilityProjection",
    ),
    scenarioId: ScenarioIdSchema,
  }),
);

function invocationSubjectMatchesPhase(input: {
  readonly subject: CurrentModelInvocationSubject;
  readonly phase: ModelInvocationPhase;
}): boolean {
  if (input.subject.tag === "benchmark") return true;
  return Match.value(input.phase).pipe(
    Match.when(
      "scenarioGeneration",
      () => input.subject.tag === "scenarioCampaign",
    ),
    Match.when(
      "scenarioCompositeReview",
      () =>
        input.subject.tag === "scenarioCandidate" ||
        input.subject.tag === "scenario",
    ),
    Match.when(
      "scenarioCharacterAuthoring",
      () => input.subject.tag === "scenario",
    ),
    Match.when(
      "scenarioSetupNeutralAuthoring",
      () => input.subject.tag === "scenario",
    ),
    Match.when(
      "scenarioSetupControllerAuthoring",
      () => input.subject.tag === "scenario",
    ),
    Match.when("player", () => input.subject.tag === "execution"),
    Match.when("postPlayReview", () => input.subject.tag === "execution"),
    Match.exhaustive,
  );
}

const ModelInvocationOperationFields = {
  invocationId: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  reasoningEffort: Schema.NonEmptyString,
} as const;

/** Historical records retain the pre-v2 protocol without invented dimensions. */
const ModelInvocationLedgerEntryV1Schema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  ...HistoricalModelInvocationIdentityFields,
  gitSha: GitShaSchema,
  eventsSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  phase: Schema.Literal(...HISTORICAL_MODEL_INVOCATION_PHASES),
  startedAt: Schema.NonEmptyString,
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: HistoricalModelInvocationExitSchema,
  usage: ModelUsageSchema,
});

/** Historical v2 evidence predating lifecycle-discriminated subjects. */
const ModelInvocationLedgerEntryV2Schema = Schema.Struct({
  schemaVersion: Schema.Literal(2),
  ...HistoricalModelInvocationIdentityFields,
  gitSha: GitShaSchema,
  eventsSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  phase: Schema.Literal(...MODEL_INVOCATION_PHASES),
  stagePlanReason: Schema.NonEmptyTrimmedString,
  startedAt: Schema.NonEmptyString,
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: HistoricalModelInvocationExitSchema,
  result: HistoricalModelInvocationResultSchema,
  usage: ModelUsageSchema,
}).pipe(
  Schema.filter(invocationResultMatchesExit, {
    message: () => "Invocation result must agree with its exit status.",
  }),
);

const CurrentModelInvocationLedgerEntryV4SchemaInternal = Schema.Struct({
  schemaVersion: Schema.Literal(4),
  subject: CurrentModelInvocationSubjectSchema,
  ...ModelInvocationOperationFields,
  gitSha: GitShaSchema,
  eventsSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  phase: Schema.Literal(...MODEL_INVOCATION_PHASES),
  stagePlanReason: Schema.NonEmptyTrimmedString,
  startedAt: StartedAtSchema,
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: HistoricalModelInvocationExitSchema,
  result: HistoricalModelInvocationResultSchema,
  usage: ModelUsageSchema,
}).pipe(
  Schema.filter(invocationSubjectMatchesPhase, {
    message: () => "Invocation subject must match its lifecycle phase.",
  }),
  Schema.filter(invocationResultMatchesExit, {
    message: () => "Invocation result must agree with its exit status.",
  }),
);

const CurrentModelInvocationLedgerEntryV5SchemaInternal = Schema.Struct({
  schemaVersion: Schema.Literal(5),
  subject: CurrentModelInvocationSubjectSchema,
  ...ModelInvocationOperationFields,
  gitSha: GitShaSchema,
  eventsSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  phase: Schema.Literal(...MODEL_INVOCATION_PHASES),
  stagePlanReason: Schema.NonEmptyTrimmedString,
  startedAt: StartedAtSchema,
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: CurrentModelInvocationExitSchema,
  result: CurrentModelInvocationResultSchema,
  usage: ModelUsageSchema,
}).pipe(
  Schema.filter(invocationSubjectMatchesPhase, {
    message: () => "Invocation subject must match its lifecycle phase.",
  }),
  Schema.filter(currentInvocationResultMatchesExit, {
    message: () => "Invocation result must agree with its exit status.",
  }),
);

/** Exact v4 decoder retained for historical/current evidence readers. */
export const CurrentModelInvocationLedgerEntryV4Schema =
  CurrentModelInvocationLedgerEntryV4SchemaInternal;

/** Current records include timeout escalation telemetry in schema v5. */
export const CurrentModelInvocationLedgerEntryV5Schema =
  CurrentModelInvocationLedgerEntryV5SchemaInternal;

/** Decoder for either exact current schema version. */
export const CurrentModelInvocationLedgerEntrySchema = Schema.Union(
  CurrentModelInvocationLedgerEntryV4Schema,
  CurrentModelInvocationLedgerEntryV5Schema,
);

export const ModelInvocationLedgerEntrySchema = Schema.Union(
  ModelInvocationLedgerEntryV1Schema,
  ModelInvocationLedgerEntryV2Schema,
  CurrentModelInvocationLedgerEntryV4Schema,
  CurrentModelInvocationLedgerEntryV5Schema,
);

export type TokenCount = Schema.Schema.Type<typeof TokenCountSchema>;
export type ModelUsage = Schema.Schema.Type<typeof ModelUsageSchema>;
type HistoricalModelInvocationLedgerEntry = Schema.Schema.Type<
  typeof ModelInvocationLedgerEntryV1Schema
>;
type HistoricalModelInvocationLedgerEntryV2 = Schema.Schema.Type<
  typeof ModelInvocationLedgerEntryV2Schema
>;
export type CurrentModelInvocationLedgerEntryV4 = Schema.Schema.Type<
  typeof CurrentModelInvocationLedgerEntryV4Schema
>;
export type CurrentModelInvocationLedgerEntryV5 = Schema.Schema.Type<
  typeof CurrentModelInvocationLedgerEntryV5Schema
>;
export type CurrentModelInvocationLedgerEntry =
  | CurrentModelInvocationLedgerEntryV4
  | CurrentModelInvocationLedgerEntryV5;
export type ModelInvocationLedgerEntry = Schema.Schema.Type<
  typeof ModelInvocationLedgerEntrySchema
>;
export type ModelInvocationResult = Schema.Schema.Type<
  typeof CurrentModelInvocationResultSchema
>;
type ModelInvocationEventEntry =
  | Omit<HistoricalModelInvocationLedgerEntry, "eventsSha256">
  | Omit<HistoricalModelInvocationLedgerEntryV2, "eventsSha256">
  | Omit<CurrentModelInvocationLedgerEntryV4, "eventsSha256">
  | Omit<CurrentModelInvocationLedgerEntryV5, "eventsSha256">;

const ModelInvocationStartedEventV1Schema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.started"),
  schemaVersion: Schema.Literal(1),
  scenarioId: HistoricalScenarioIdSchema,
  gitSha: GitShaSchema,
  phase: Schema.Literal(...HISTORICAL_MODEL_INVOCATION_PHASES),
  fallbackInvocationId: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  reasoningEffort: Schema.NonEmptyString,
  startedAt: Schema.NonEmptyString,
});

const ModelInvocationStartedEventV2Schema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.started"),
  schemaVersion: Schema.Literal(2),
  scenarioId: HistoricalScenarioIdSchema,
  gitSha: GitShaSchema,
  phase: Schema.Literal(...MODEL_INVOCATION_PHASES),
  stagePlanReason: Schema.NonEmptyTrimmedString,
  fallbackInvocationId: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  reasoningEffort: Schema.NonEmptyString,
  startedAt: Schema.NonEmptyString,
});

const CurrentModelInvocationStartedEventV4Schema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.started"),
  schemaVersion: Schema.Literal(4),
  subject: CurrentModelInvocationSubjectSchema,
  gitSha: GitShaSchema,
  phase: Schema.Literal(...MODEL_INVOCATION_PHASES),
  stagePlanReason: Schema.NonEmptyTrimmedString,
  fallbackInvocationId: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  reasoningEffort: Schema.NonEmptyString,
  startedAt: StartedAtSchema,
}).pipe(
  Schema.filter(invocationSubjectMatchesPhase, {
    message: () => "Invocation subject must match its lifecycle phase.",
  }),
);

const CurrentModelInvocationStartedEventV5Schema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.started"),
  schemaVersion: Schema.Literal(5),
  subject: CurrentModelInvocationSubjectSchema,
  gitSha: GitShaSchema,
  phase: Schema.Literal(...MODEL_INVOCATION_PHASES),
  stagePlanReason: Schema.NonEmptyTrimmedString,
  fallbackInvocationId: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  reasoningEffort: Schema.NonEmptyString,
  startedAt: StartedAtSchema,
}).pipe(
  Schema.filter(invocationSubjectMatchesPhase, {
    message: () => "Invocation subject must match its lifecycle phase.",
  }),
);

export const ModelInvocationStartedEventSchema = Schema.Union(
  ModelInvocationStartedEventV1Schema,
  ModelInvocationStartedEventV2Schema,
  CurrentModelInvocationStartedEventV4Schema,
  CurrentModelInvocationStartedEventV5Schema,
);

const ModelInvocationCompletedEventV1Schema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.completed"),
  schemaVersion: Schema.Literal(1),
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: HistoricalModelInvocationExitSchema,
});

const ModelInvocationCompletedEventV2Schema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.completed"),
  schemaVersion: Schema.Literal(2),
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: HistoricalModelInvocationExitSchema,
  result: HistoricalModelInvocationResultSchema,
}).pipe(
  Schema.filter(invocationResultMatchesExit, {
    message: () => "Invocation result must agree with its exit status.",
  }),
);

const CurrentModelInvocationCompletedEventV4Schema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.completed"),
  schemaVersion: Schema.Literal(4),
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: HistoricalModelInvocationExitSchema,
  result: HistoricalModelInvocationResultSchema,
}).pipe(
  Schema.filter(invocationResultMatchesExit, {
    message: () => "Invocation result must agree with its exit status.",
  }),
);

const CurrentModelInvocationCompletedEventV5Schema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.completed"),
  schemaVersion: Schema.Literal(5),
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: CurrentModelInvocationExitSchema,
  result: CurrentModelInvocationResultSchema,
}).pipe(
  Schema.filter(currentInvocationResultMatchesExit, {
    message: () => "Invocation result must agree with its exit status.",
  }),
);

export const ModelInvocationCompletedEventSchema = Schema.Union(
  ModelInvocationCompletedEventV1Schema,
  ModelInvocationCompletedEventV2Schema,
  CurrentModelInvocationCompletedEventV4Schema,
  CurrentModelInvocationCompletedEventV5Schema,
);

const BenchmarkAuxiliaryInvocationCommonFields = {
  schemaVersion: Schema.Literal(3),
  profile: Schema.Literal("documentDeclarationSet"),
  ...HistoricalModelInvocationIdentityFields,
  gitSha: GitShaSchema,
  eventsSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  stagePlanReason: Schema.NonEmptyTrimmedString,
  startedAt: Schema.NonEmptyString,
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: HistoricalModelInvocationExitSchema,
  result: HistoricalModelInvocationResultSchema,
  usage: ModelUsageSchema,
} as const;

const BenchmarkAuxiliaryInvocationCurrentCommonFields = {
  schemaVersion: Schema.Literal(5),
  profile: Schema.Literal("documentDeclarationSet"),
  ...HistoricalModelInvocationIdentityFields,
  gitSha: GitShaSchema,
  eventsSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  stagePlanReason: Schema.NonEmptyTrimmedString,
  startedAt: StartedAtSchema,
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: CurrentModelInvocationExitSchema,
  result: CurrentModelInvocationResultSchema,
  usage: ModelUsageSchema,
} as const;

/**
 * Benchmark-only rows preserve work that the current stage plan deliberately
 * omits.  The responsibility/phase pairing is closed so readiness cannot be
 * relabeled as composite review and character declarations cannot satisfy the
 * canonical Character Sheet stage.
 */
export const BenchmarkAuxiliaryModelInvocationLedgerEntryV3Schema =
  Schema.Union(
    Schema.Struct({
      ...BenchmarkAuxiliaryInvocationCommonFields,
      responsibility: Schema.Literal("scenarioQuality"),
      phase: Schema.Literal("scenarioReadiness"),
    }),
    Schema.Struct({
      ...BenchmarkAuxiliaryInvocationCommonFields,
      responsibility: Schema.Literal("redundantCharacterPreparation"),
      phase: Schema.Literal("scenarioCharacterAuthoring"),
    }),
  ).pipe(
    Schema.filter(invocationResultMatchesExit, {
      message: () => "Invocation result must agree with its exit status.",
    }),
  );

export const BenchmarkAuxiliaryModelInvocationLedgerEntryV5Schema =
  Schema.Union(
    Schema.Struct({
      ...BenchmarkAuxiliaryInvocationCurrentCommonFields,
      responsibility: Schema.Literal("scenarioQuality"),
      phase: Schema.Literal("scenarioReadiness"),
    }),
    Schema.Struct({
      ...BenchmarkAuxiliaryInvocationCurrentCommonFields,
      responsibility: Schema.Literal("redundantCharacterPreparation"),
      phase: Schema.Literal("scenarioCharacterAuthoring"),
    }),
  ).pipe(
    Schema.filter(currentInvocationResultMatchesExit, {
      message: () => "Invocation result must agree with its exit status.",
    }),
  );

export const BenchmarkAuxiliaryModelInvocationLedgerEntrySchema = Schema.Union(
  BenchmarkAuxiliaryModelInvocationLedgerEntryV3Schema,
  BenchmarkAuxiliaryModelInvocationLedgerEntryV5Schema,
);
export type BenchmarkAuxiliaryModelInvocationLedgerEntry = Schema.Schema.Type<
  typeof BenchmarkAuxiliaryModelInvocationLedgerEntrySchema
>;

const BenchmarkAuxiliaryInvocationStartedEventCommonFields = {
  type: Schema.Literal("raw-swarm.invocation.started"),
  schemaVersion: Schema.Literal(3),
  profile: Schema.Literal("documentDeclarationSet"),
  scenarioId: HistoricalScenarioIdSchema,
  gitSha: GitShaSchema,
  stagePlanReason: Schema.NonEmptyTrimmedString,
  fallbackInvocationId: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  reasoningEffort: Schema.NonEmptyString,
  startedAt: Schema.NonEmptyString,
} as const;

const BenchmarkAuxiliaryInvocationStartedEventSchema = Schema.Union(
  Schema.Struct({
    ...BenchmarkAuxiliaryInvocationStartedEventCommonFields,
    responsibility: Schema.Literal("scenarioQuality"),
    phase: Schema.Literal("scenarioReadiness"),
  }),
  Schema.Struct({
    ...BenchmarkAuxiliaryInvocationStartedEventCommonFields,
    responsibility: Schema.Literal("redundantCharacterPreparation"),
    phase: Schema.Literal("scenarioCharacterAuthoring"),
  }),
);

const BenchmarkAuxiliaryInvocationStartedEventV5Schema = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("raw-swarm.invocation.started"),
    schemaVersion: Schema.Literal(5),
    profile: Schema.Literal("documentDeclarationSet"),
    scenarioId: HistoricalScenarioIdSchema,
    gitSha: GitShaSchema,
    stagePlanReason: Schema.NonEmptyTrimmedString,
    fallbackInvocationId: Schema.NonEmptyString,
    model: Schema.NonEmptyString,
    reasoningEffort: Schema.NonEmptyString,
    startedAt: StartedAtSchema,
    responsibility: Schema.Literal("scenarioQuality"),
    phase: Schema.Literal("scenarioReadiness"),
  }),
  Schema.Struct({
    type: Schema.Literal("raw-swarm.invocation.started"),
    schemaVersion: Schema.Literal(5),
    profile: Schema.Literal("documentDeclarationSet"),
    scenarioId: HistoricalScenarioIdSchema,
    gitSha: GitShaSchema,
    stagePlanReason: Schema.NonEmptyTrimmedString,
    fallbackInvocationId: Schema.NonEmptyString,
    model: Schema.NonEmptyString,
    reasoningEffort: Schema.NonEmptyString,
    startedAt: StartedAtSchema,
    responsibility: Schema.Literal("redundantCharacterPreparation"),
    phase: Schema.Literal("scenarioCharacterAuthoring"),
  }),
);

const BenchmarkAuxiliaryInvocationCompletedEventSchema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.completed"),
  schemaVersion: Schema.Literal(3),
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: HistoricalModelInvocationExitSchema,
  result: HistoricalModelInvocationResultSchema,
}).pipe(
  Schema.filter(invocationResultMatchesExit, {
    message: () => "Invocation result must agree with its exit status.",
  }),
);

type BenchmarkAuxiliaryInvocationStartedEvent =
  | Schema.Schema.Type<typeof BenchmarkAuxiliaryInvocationStartedEventSchema>
  | Schema.Schema.Type<typeof BenchmarkAuxiliaryInvocationStartedEventV5Schema>;
type BenchmarkAuxiliaryInvocationCompletedEvent =
  | Schema.Schema.Type<typeof BenchmarkAuxiliaryInvocationCompletedEventSchema>
  | Schema.Schema.Type<
      typeof BenchmarkAuxiliaryInvocationCompletedEventV5Schema
    >;

type ModelInvocationStartedEvent = Schema.Schema.Type<
  typeof ModelInvocationStartedEventSchema
>;
type ModelInvocationCompletedEvent = Schema.Schema.Type<
  typeof ModelInvocationCompletedEventSchema
>;

type ModelInvocationEventInput = {
  readonly subject: unknown;
  readonly gitSha: unknown;
  readonly phase: unknown;
  readonly stagePlanReason: unknown;
  readonly fallbackInvocationId: unknown;
  readonly model: unknown;
  readonly reasoningEffort: unknown;
  readonly startedAt: unknown;
};

export type ModelInvocationEventEvidence =
  | {
      readonly tag: "valid";
      readonly entry: ModelInvocationEventEntry;
    }
  | { readonly tag: "invalid"; readonly message: string };

export function parseModelInvocationLedgerEntry(
  value: unknown,
): Either.Either<ModelInvocationLedgerEntry, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(ModelInvocationLedgerEntrySchema, {
    onExcessProperty: "error",
  })(value);
}

/** Scenario reference carried by historical and lifecycle-discriminated rows. */
export function modelInvocationScenarioReference(
  entry: ModelInvocationLedgerEntry,
): ScenarioId | HistoricalScenarioId | PlannedScenarioId {
  if (entry.schemaVersion === 1 || entry.schemaVersion === 2) {
    return entry.scenarioId;
  }
  return entry.subject.tag === "scenarioCampaign" ||
    entry.subject.tag === "scenarioCandidate"
    ? entry.subject.plannedScenarioId
    : entry.subject.scenarioId;
}

export function parseBenchmarkModelInvocationLedgerEntry(
  value: unknown,
): Either.Either<
  BenchmarkAuxiliaryModelInvocationLedgerEntry,
  ParseResult.ParseError
> {
  return Schema.decodeUnknownEither(
    BenchmarkAuxiliaryModelInvocationLedgerEntrySchema,
    { onExcessProperty: "error" },
  )(value);
}

function nonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

function resultFromExit(
  exit: Schema.Schema.Type<typeof CurrentModelInvocationExitSchema>,
): ModelInvocationResult {
  const succeeded = Match.value(exit).pipe(
    Match.when({ tag: "exited" }, ({ status }) => status === 0),
    Match.when({ tag: "shellStatus" }, ({ status }) => status === 0),
    Match.when({ tag: "signaled" }, () => false),
    Match.when({ tag: "failedToStart" }, () => false),
    Match.when({ tag: "timedOut" }, () => false),
    Match.exhaustive,
  );
  if (succeeded) {
    return { tag: "succeeded" };
  }
  const reason = Match.value(exit).pipe(
    Match.when(
      { tag: "exited" },
      ({ status }) => `Codex exited with status ${String(status)}.`,
    ),
    Match.when(
      { tag: "signaled" },
      ({ signal }) => `Codex stopped by ${signal}.`,
    ),
    Match.when({ tag: "failedToStart" }, ({ message }) => message),
    Match.when(
      { tag: "timedOut" },
      ({ timeoutMilliseconds }) =>
        `Codex invocation timed out after ${String(timeoutMilliseconds)} milliseconds.`,
    ),
    Match.when(
      { tag: "shellStatus" },
      ({ status }) => `Invocation shell exited with status ${String(status)}.`,
    ),
    Match.exhaustive,
  );
  return {
    tag: "failed",
    reason,
  };
}

function nonEmptyTrimmedString(value: unknown): Option.Option<string> {
  if (typeof value !== "string") return Option.none();
  const trimmed = value.trim();
  return trimmed.length === 0 ? Option.none() : Option.some(trimmed);
}

const FirstPartyCodexErrorEventSchema = Schema.Struct({
  type: Schema.Literal("error"),
  message: Schema.NonEmptyTrimmedString,
});

const BenchmarkAuxiliaryInvocationCompletedEventV5Schema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.completed"),
  schemaVersion: Schema.Literal(5),
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: CurrentModelInvocationExitSchema,
  result: CurrentModelInvocationResultSchema,
}).pipe(
  Schema.filter(currentInvocationResultMatchesExit, {
    message: () => "Invocation result must agree with its exit status.",
  }),
);
const FirstPartyCodexTurnFailedEventSchema = Schema.Struct({
  type: Schema.Literal("turn.failed"),
  error: Schema.Struct({ message: Schema.NonEmptyTrimmedString }),
});

/** Decode the most authoritative failure message emitted by Codex itself. */
export function firstPartyCodexFailureReason(
  events: readonly unknown[],
): Either.Either<Option.Option<string>, string> {
  let wrapperFailure = Option.none<string>();
  let terminalFailure = Option.none<string>();
  for (const [index, event] of events.entries()) {
    if (!isJsonRecord(event)) continue;
    if (event.type === "error") {
      const decoded = Schema.decodeUnknownEither(
        FirstPartyCodexErrorEventSchema,
      )(event);
      if (Either.isLeft(decoded)) {
        return Either.left(
          `First-party Codex event line ${String(index + 1)} has a malformed error event: ${decoded.left.message}`,
        );
      }
      wrapperFailure = nonEmptyTrimmedString(decoded.right.message);
    }
    if (event.type === "turn.failed") {
      const decoded = Schema.decodeUnknownEither(
        FirstPartyCodexTurnFailedEventSchema,
      )(event);
      if (Either.isLeft(decoded)) {
        return Either.left(
          `First-party Codex event line ${String(index + 1)} has a malformed turn.failed event: ${decoded.left.message}`,
        );
      }
      terminalFailure = nonEmptyTrimmedString(decoded.right.error.message);
    }
  }
  return Either.right(
    Option.isSome(terminalFailure) ? terminalFailure : wrapperFailure,
  );
}

/** Bind process outcome to first-party failure detail when Codex supplies it. */
type CodexEventAnalysis = Readonly<{
  readonly failureReason: Option.Option<string>;
  readonly result: ModelInvocationResult;
}>;

function hasCodexCompletedEvent(events: readonly unknown[]): boolean {
  return events.some(
    (event) => isJsonRecord(event) && event.type === "turn.completed",
  );
}

function analyzeCodexEvents(
  exit: Schema.Schema.Type<typeof CurrentModelInvocationExitSchema>,
  events: readonly unknown[],
): Either.Either<CodexEventAnalysis, string> {
  const failureReason = firstPartyCodexFailureReason(events);
  if (Either.isLeft(failureReason)) return Either.left(failureReason.left);
  const processResult = resultFromExit(exit);
  if (processResult.tag === "succeeded") {
    if (Option.isSome(failureReason.right)) {
      return Either.left(
        "Codex emitted a first-party failure event but exited successfully.",
      );
    }
    if (!hasCodexCompletedEvent(events)) {
      return Either.left(
        "Codex exited successfully without a first-party turn.completed event.",
      );
    }
  }
  return Either.right({
    failureReason: failureReason.right,
    result: Option.match(failureReason.right, {
      onNone: () => processResult,
      onSome: (reason) => ({ tag: "failed" as const, reason }),
    }),
  });
}

function codexEventDecodeFailure(message: string): CodexEventAnalysis {
  return {
    failureReason: Option.some(message),
    result: {
      tag: "failed",
      reason: message,
      failureKind: "codexEvent",
    },
  };
}

/** Bind process outcome to first-party failure detail when Codex supplies it. */
export function modelInvocationResultFromCodexEvents(
  exit: Schema.Schema.Type<typeof CurrentModelInvocationExitSchema>,
  events: readonly unknown[],
): Either.Either<ModelInvocationResult, string> {
  return analyzeCodexEvents(exit, events).pipe(
    Either.map(({ result }) => result),
  );
}

function summedCounter(
  usage: readonly Readonly<Record<string, unknown>>[],
  snake: string,
  camel: string,
): TokenCount {
  const counts = usage.map((entry) =>
    nonNegativeInteger(entry[snake] ?? entry[camel]),
  );
  if (!counts.every((count): count is number => count !== undefined)) {
    return { tag: "unavailable" };
  }
  return {
    tag: "available",
    count: counts.reduce((total, count) => total + count, 0),
  };
}

function usageObject(
  event: unknown,
): Readonly<Record<string, unknown>> | undefined {
  if (!isJsonRecord(event) || event.type !== "turn.completed") return undefined;
  return isJsonRecord(event.usage) ? event.usage : undefined;
}

export function modelUsageFromCodexEvents(
  events: readonly unknown[],
): ModelUsage {
  const usage = events.flatMap(
    (event): readonly Readonly<Record<string, unknown>>[] => {
      const value = usageObject(event);
      return value === undefined ? [] : [value];
    },
  );
  if (usage.length === 0) {
    return {
      tag: "unavailable",
      reason:
        "The first-party event stream exposed no turn.completed usage object.",
    };
  }
  return {
    tag: "available",
    input: summedCounter(usage, "input_tokens", "inputTokens"),
    cachedInput: summedCounter(
      usage,
      "cached_input_tokens",
      "cachedInputTokens",
    ),
    cacheWriteInput: summedCounter(
      usage,
      "cache_write_input_tokens",
      "cacheWriteInputTokens",
    ),
    output: summedCounter(usage, "output_tokens", "outputTokens"),
    reasoningOutput: summedCounter(
      usage,
      "reasoning_output_tokens",
      "reasoningOutputTokens",
    ),
  };
}

export function invocationIdFromCodexEvents(
  events: readonly unknown[],
  fallback: string,
): string {
  for (const event of events) {
    if (!isJsonRecord(event)) continue;
    const candidate = event.thread_id ?? event.threadId ?? event.id;
    if (event.type === "thread.started" && typeof candidate === "string") {
      return candidate;
    }
  }
  return fallback;
}

export type CodexEventReadResult =
  | { readonly tag: "valid"; readonly events: readonly unknown[] }
  | {
      readonly tag: "invalid";
      readonly line: number;
      readonly message: string;
      readonly rawLineBase64: string;
    };

type CodexEventDecodeFailure = Extract<
  CodexEventReadResult,
  { readonly tag: "invalid" }
>;

type CodexEventDecodeFailureEvent = Readonly<{
  readonly type: "raw-swarm.invocation.codex-event-failure";
  readonly line: number;
  readonly message: string;
  readonly rawLineBase64: string;
}>;

type CodexRawRetentionReason =
  | "malformedJsonl"
  | "failedInvocation"
  | "unreapedProcess";

type CodexRawRetentionEvent = Readonly<{
  readonly type: "raw-swarm.invocation.codex-raw-retained";
  readonly reason: CodexRawRetentionReason;
  readonly rawContentsSha256: string;
  readonly rawContentsByteLength: number;
}>;

function codexEventDecodeFailureEvent(
  input: CodexEventDecodeFailure,
): CodexEventDecodeFailureEvent {
  return {
    type: "raw-swarm.invocation.codex-event-failure",
    line: input.line,
    message: input.message,
    rawLineBase64: input.rawLineBase64,
  };
}

function codexRawRetentionEvent(input: {
  readonly rawContents: Uint8Array;
  readonly reason: CodexRawRetentionReason;
}): CodexRawRetentionEvent {
  return {
    type: "raw-swarm.invocation.codex-raw-retained",
    reason: input.reason,
    rawContentsSha256: sha256Bytes(input.rawContents),
    rawContentsByteLength: input.rawContents.byteLength,
  };
}

export type CodexEventReadResultWithSource =
  | {
      readonly tag: "valid";
      readonly events: readonly unknown[];
      readonly rawContents: Buffer;
    }
  | (Extract<CodexEventReadResult, { readonly tag: "invalid" }> & {
      /** Bytes and successfully decoded prefix retained for typed failure evidence. */
      readonly rawContents: Buffer;
      readonly events: readonly unknown[];
    });

export function readCodexEventsWithSource(
  path: string,
): CodexEventReadResultWithSource {
  const rawContents = readFileSync(path);
  const events: unknown[] = [];
  let lineStart = 0;
  let lineNumber = 0;
  for (let lineEnd = 0; lineEnd <= rawContents.length; lineEnd += 1) {
    if (lineEnd !== rawContents.length && rawContents[lineEnd] !== 0x0a) {
      continue;
    }
    lineNumber += 1;
    const rawLine = rawContents.subarray(lineStart, lineEnd);
    lineStart = lineEnd + 1;
    const line = rawLine.toString("utf8");
    if (line.trim().length === 0) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      return {
        tag: "invalid",
        line: lineNumber,
        message: `Codex event line ${lineNumber} is malformed JSON.`,
        rawLineBase64: rawLine.toString("base64"),
        rawContents,
        events,
      };
    }
  }
  return { tag: "valid", events, rawContents };
}

export function readCodexEvents(path: string): CodexEventReadResult {
  const result = readCodexEventsWithSource(path);
  return result.tag === "valid"
    ? { tag: "valid", events: result.events }
    : result;
}

type DecodedInvocationEvents<A> =
  | {
      readonly tag: "valid";
      readonly events: readonly { readonly index: number; readonly value: A }[];
    }
  | { readonly tag: "invalid"; readonly message: string };

/**
 * Runner-owned event records are authorities, so a recognized record that
 * fails its schema is evidence failure rather than an ignorable event. Other
 * Codex event kinds remain outside this boundary and are intentionally
 * ignored.
 */
function decodedInvocationEvents<A, I>(
  schema: Schema.Schema<A, I>,
  eventType: string,
  events: readonly unknown[],
): DecodedInvocationEvents<A> {
  const decoded: { readonly index: number; readonly value: A }[] = [];
  for (const [index, event] of events.entries()) {
    if (!isJsonRecord(event) || event.type !== eventType) continue;
    const parsed = Schema.decodeUnknownEither(schema, {
      onExcessProperty: "error",
    })(event);
    if (Either.isLeft(parsed)) {
      return {
        tag: "invalid",
        message: `Recognized ${eventType} event at line ${String(index + 1)} is malformed: ${parsed.left.message}`,
      };
    }
    decoded.push({ index, value: parsed.right });
  }
  return { tag: "valid", events: decoded };
}

export function modelInvocationEvidenceFromEvents(
  events: readonly unknown[],
): ModelInvocationEventEvidence {
  const started = decodedInvocationEvents(
    ModelInvocationStartedEventSchema,
    "raw-swarm.invocation.started",
    events,
  );
  if (started.tag === "invalid") return started;
  const completed = decodedInvocationEvents(
    ModelInvocationCompletedEventSchema,
    "raw-swarm.invocation.completed",
    events,
  );
  if (completed.tag === "invalid") return completed;
  if (
    started.events.length !== 1 ||
    completed.events.length !== 1 ||
    started.events[0]!.index >= completed.events[0]!.index
  ) {
    return {
      tag: "invalid",
      message:
        "Model invocation events require one ordered runner start and completion record.",
    };
  }
  const start: ModelInvocationStartedEvent = started.events[0]!.value;
  const completion: ModelInvocationCompletedEvent = completed.events[0]!.value;
  if (start.schemaVersion !== completion.schemaVersion) {
    return {
      tag: "invalid",
      message:
        "Model invocation start and completion records must use the same schema version.",
    };
  }
  if (!Number.isFinite(Date.parse(start.startedAt))) {
    return {
      tag: "invalid",
      message: "Model invocation start time is not an ISO timestamp.",
    };
  }
  if (start.schemaVersion === 1) {
    if (completion.schemaVersion !== 1) {
      return {
        tag: "invalid",
        message:
          "Model invocation start and completion records must use the same schema version.",
      };
    }
    return {
      tag: "valid",
      entry: {
        schemaVersion: 1,
        scenarioId: start.scenarioId,
        gitSha: start.gitSha,
        phase: start.phase,
        invocationId: invocationIdFromCodexEvents(
          events,
          start.fallbackInvocationId,
        ),
        model: start.model,
        reasoningEffort: start.reasoningEffort,
        startedAt: start.startedAt,
        elapsedMilliseconds: completion.elapsedMilliseconds,
        exit: completion.exit,
        usage: modelUsageFromCodexEvents(events),
      },
    };
  }
  if (start.schemaVersion === 2) {
    if (completion.schemaVersion !== 2) {
      return {
        tag: "invalid",
        message:
          "Model invocation start and completion records must use the same schema version.",
      };
    }
    return {
      tag: "valid",
      entry: {
        schemaVersion: 2,
        scenarioId: start.scenarioId,
        gitSha: start.gitSha,
        phase: start.phase,
        stagePlanReason: start.stagePlanReason,
        invocationId: invocationIdFromCodexEvents(
          events,
          start.fallbackInvocationId,
        ),
        model: start.model,
        reasoningEffort: start.reasoningEffort,
        startedAt: start.startedAt,
        elapsedMilliseconds: completion.elapsedMilliseconds,
        exit: completion.exit,
        result: completion.result,
        usage: modelUsageFromCodexEvents(events),
      },
    };
  }
  if (start.schemaVersion === 4) {
    if (completion.schemaVersion !== 4) {
      return {
        tag: "invalid",
        message:
          "Model invocation start and completion records must use the same schema version.",
      };
    }
    return {
      tag: "valid",
      entry: {
        schemaVersion: 4,
        subject: start.subject,
        gitSha: start.gitSha,
        phase: start.phase,
        stagePlanReason: start.stagePlanReason,
        invocationId: invocationIdFromCodexEvents(
          events,
          start.fallbackInvocationId,
        ),
        model: start.model,
        reasoningEffort: start.reasoningEffort,
        startedAt: start.startedAt,
        elapsedMilliseconds: completion.elapsedMilliseconds,
        exit: completion.exit,
        result: completion.result,
        usage: modelUsageFromCodexEvents(events),
      },
    };
  }
  if (completion.schemaVersion !== 5) {
    return {
      tag: "invalid",
      message:
        "Model invocation start and completion records must use the same schema version.",
    };
  }
  if (
    completion.result.tag === "succeeded" &&
    !hasCodexCompletedEvent(events)
  ) {
    return {
      tag: "invalid",
      message:
        "Successful v5 invocation evidence requires a first-party turn.completed event.",
    };
  }
  if (completion.result.tag === "succeeded") {
    const failureReason = firstPartyCodexFailureReason(events);
    if (Either.isLeft(failureReason)) {
      return { tag: "invalid", message: failureReason.left };
    }
    if (Option.isSome(failureReason.right)) {
      return {
        tag: "invalid",
        message:
          "Successful v5 invocation evidence cannot include a first-party failure event.",
      };
    }
  }
  return {
    tag: "valid",
    entry: {
      schemaVersion: 5,
      subject: start.subject,
      gitSha: start.gitSha,
      phase: start.phase,
      stagePlanReason: start.stagePlanReason,
      invocationId: invocationIdFromCodexEvents(
        events,
        start.fallbackInvocationId,
      ),
      model: start.model,
      reasoningEffort: start.reasoningEffort,
      startedAt: start.startedAt,
      elapsedMilliseconds: completion.elapsedMilliseconds,
      exit: completion.exit,
      result: completion.result,
      usage: modelUsageFromCodexEvents(events),
    },
  };
}

export function benchmarkModelInvocationEvidenceFromEvents(
  events: readonly unknown[],
):
  | {
      readonly tag: "valid";
      readonly entry: Omit<
        BenchmarkAuxiliaryModelInvocationLedgerEntry,
        "eventsSha256"
      >;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const started = decodedInvocationEvents(
    Schema.Union(
      BenchmarkAuxiliaryInvocationStartedEventSchema,
      BenchmarkAuxiliaryInvocationStartedEventV5Schema,
    ),
    "raw-swarm.invocation.started",
    events,
  );
  if (started.tag === "invalid") return started;
  const completed = decodedInvocationEvents(
    Schema.Union(
      BenchmarkAuxiliaryInvocationCompletedEventSchema,
      BenchmarkAuxiliaryInvocationCompletedEventV5Schema,
    ),
    "raw-swarm.invocation.completed",
    events,
  );
  if (completed.tag === "invalid") return completed;
  if (
    started.events.length !== 1 ||
    completed.events.length !== 1 ||
    started.events[0]!.index >= completed.events[0]!.index
  ) {
    return {
      tag: "invalid",
      message:
        "Benchmark invocation events require one ordered runner start and completion record.",
    };
  }
  const start: BenchmarkAuxiliaryInvocationStartedEvent =
    started.events[0]!.value;
  const completion: BenchmarkAuxiliaryInvocationCompletedEvent =
    completed.events[0]!.value;
  if (!Number.isFinite(Date.parse(start.startedAt))) {
    return {
      tag: "invalid",
      message: "Benchmark invocation start time is not an ISO timestamp.",
    };
  }
  if (start.schemaVersion !== completion.schemaVersion) {
    return {
      tag: "invalid",
      message:
        "Benchmark invocation start and completion records must use the same schema version.",
    };
  }
  if (completion.schemaVersion === 5 && completion.result.tag === "succeeded") {
    const failureReason = firstPartyCodexFailureReason(events);
    if (Either.isLeft(failureReason)) {
      return { tag: "invalid", message: failureReason.left };
    }
    if (Option.isSome(failureReason.right)) {
      return {
        tag: "invalid",
        message:
          "Successful v5 benchmark evidence cannot include a first-party failure event.",
      };
    }
    if (!hasCodexCompletedEvent(events)) {
      return {
        tag: "invalid",
        message:
          "Successful v5 benchmark evidence requires a first-party turn.completed event.",
      };
    }
  }
  return {
    tag: "valid",
    entry: {
      schemaVersion: start.schemaVersion,
      profile: start.profile,
      responsibility: start.responsibility,
      scenarioId: start.scenarioId,
      gitSha: start.gitSha,
      phase: start.phase,
      stagePlanReason: start.stagePlanReason,
      invocationId: invocationIdFromCodexEvents(
        events,
        start.fallbackInvocationId,
      ),
      model: start.model,
      reasoningEffort: start.reasoningEffort,
      startedAt: start.startedAt,
      elapsedMilliseconds: completion.elapsedMilliseconds,
      exit: completion.exit,
      result: completion.result,
      usage: modelUsageFromCodexEvents(events),
    },
  };
}

/** Construct the exact retained v4 event used by historical fixtures and CLI. */
export function modelInvocationStartedEvent(
  input: ModelInvocationEventInput,
): Either.Either<ModelInvocationStartedEvent, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(
    CurrentModelInvocationStartedEventV4Schema,
    {
      onExcessProperty: "error",
    },
  )({
    type: "raw-swarm.invocation.started",
    schemaVersion: 4,
    ...input,
  });
}

function currentModelInvocationStartedEvent(
  input: ModelInvocationEventInput,
): Either.Either<ModelInvocationStartedEvent, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(
    CurrentModelInvocationStartedEventV5Schema,
    {
      onExcessProperty: "error",
    },
  )({
    type: "raw-swarm.invocation.started",
    schemaVersion: 5,
    ...input,
  });
}

export function benchmarkModelInvocationStartedEvent(input: {
  readonly scenarioId: unknown;
  readonly gitSha: unknown;
  readonly profile: unknown;
  readonly responsibility: unknown;
  readonly phase: unknown;
  readonly stagePlanReason: unknown;
  readonly fallbackInvocationId: unknown;
  readonly model: unknown;
  readonly reasoningEffort: unknown;
  readonly startedAt: unknown;
}): Either.Either<
  BenchmarkAuxiliaryInvocationStartedEvent,
  ParseResult.ParseError
> {
  return Schema.decodeUnknownEither(
    BenchmarkAuxiliaryInvocationStartedEventSchema,
    { onExcessProperty: "error" },
  )({
    type: "raw-swarm.invocation.started",
    schemaVersion: 3,
    ...input,
  });
}

/** Construct the exact retained v4 completion event used by the CLI. */
export function modelInvocationCompletedEvent(input: {
  readonly elapsedMilliseconds: unknown;
  readonly exit: unknown;
  readonly result: unknown;
}): Either.Either<ModelInvocationCompletedEvent, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(
    CurrentModelInvocationCompletedEventV4Schema,
    {
      onExcessProperty: "error",
    },
  )({
    type: "raw-swarm.invocation.completed",
    schemaVersion: 4,
    ...input,
  });
}

function currentModelInvocationCompletedEvent(input: {
  readonly elapsedMilliseconds: unknown;
  readonly exit: unknown;
  readonly result: unknown;
}): Either.Either<ModelInvocationCompletedEvent, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(
    CurrentModelInvocationCompletedEventV5Schema,
    {
      onExcessProperty: "error",
    },
  )({
    type: "raw-swarm.invocation.completed",
    schemaVersion: 5,
    ...input,
  });
}

export function benchmarkModelInvocationCompletedEvent(input: {
  readonly elapsedMilliseconds: unknown;
  readonly exit: unknown;
  readonly result: unknown;
}): Either.Either<
  BenchmarkAuxiliaryInvocationCompletedEvent,
  ParseResult.ParseError
> {
  return Schema.decodeUnknownEither(
    BenchmarkAuxiliaryInvocationCompletedEventSchema,
    { onExcessProperty: "error" },
  )({
    type: "raw-swarm.invocation.completed",
    schemaVersion: 3,
    ...input,
  });
}

function currentBenchmarkModelInvocationStartedEvent(input: {
  readonly scenarioId: unknown;
  readonly gitSha: unknown;
  readonly profile: unknown;
  readonly responsibility: unknown;
  readonly phase: unknown;
  readonly stagePlanReason: unknown;
  readonly fallbackInvocationId: unknown;
  readonly model: unknown;
  readonly reasoningEffort: unknown;
  readonly startedAt: unknown;
}): Either.Either<
  BenchmarkAuxiliaryInvocationStartedEvent,
  ParseResult.ParseError
> {
  return Schema.decodeUnknownEither(
    BenchmarkAuxiliaryInvocationStartedEventV5Schema,
    { onExcessProperty: "error" },
  )({
    type: "raw-swarm.invocation.started",
    schemaVersion: 5,
    ...input,
  });
}

function currentBenchmarkModelInvocationCompletedEvent(input: {
  readonly elapsedMilliseconds: unknown;
  readonly exit: unknown;
  readonly result: unknown;
}): Either.Either<
  BenchmarkAuxiliaryInvocationCompletedEvent,
  ParseResult.ParseError
> {
  return Schema.decodeUnknownEither(
    BenchmarkAuxiliaryInvocationCompletedEventV5Schema,
    { onExcessProperty: "error" },
  )({
    type: "raw-swarm.invocation.completed",
    schemaVersion: 5,
    ...input,
  });
}

export function codexJsonArgs(
  args: readonly [string, ...string[]],
): readonly string[] {
  return args.includes("--json") ? args : [args[0], "--json", ...args.slice(1)];
}

function flagValues(args: readonly string[], flag: string): readonly string[] {
  return args.flatMap((argument, index) =>
    argument === flag && args[index + 1] !== undefined
      ? [args[index + 1]!]
      : [],
  );
}

function codexReasoningEffort(args: readonly string[]): string | undefined {
  const settings = flagValues(args, "-c").filter((argument) =>
    argument.startsWith("model_reasoning_effort="),
  );
  if (settings.length !== 1) return undefined;
  const setting = settings[0]!;
  const encoded = setting.slice("model_reasoning_effort=".length);
  try {
    const decoded: unknown = JSON.parse(encoded);
    return typeof decoded === "string" ? decoded : undefined;
  } catch {
    return encoded.length > 0 ? encoded : undefined;
  }
}

export function codexInvocationMetadataMatchesArgs(input: {
  readonly args: readonly string[];
  readonly model: string;
  readonly reasoningEffort: string;
}): boolean {
  const models = flagValues(input.args, "-m");
  return (
    models.length === 1 &&
    models[0] === input.model &&
    codexReasoningEffort(input.args) === input.reasoningEffort
  );
}

/**
 * Bind the retained-output contract to the actual Codex command.  Callers
 * provide the command body; this boundary owns the exact output path and
 * rejects a no-output operation that attempts to retain one.
 */
function codexInvocationArgsForOperation(
  args: readonly string[],
  operation: ModelInvocationOperation<unknown>,
): readonly string[] {
  if (args.length === 0) {
    throw new Error("Codex invocation requires a command argument.");
  }
  const outputPaths = flagValues(args, "--output-last-message");
  const outputFlagCount = args.filter(
    (argument) =>
      argument === "--output-last-message" ||
      argument.startsWith("--output-last-message="),
  ).length;
  if (operation.tag === "noOutput") {
    if (outputFlagCount > 0) {
      throw new Error(
        "A no-output invocation cannot include --output-last-message.",
      );
    }
    return codexJsonArgs([args[0]!, ...args.slice(1)]);
  }
  if (outputFlagCount > 0 || outputPaths.length > 0) {
    throw new Error(
      "The expected-last-message operation owns the Codex --output-last-message path.",
    );
  }
  return codexJsonArgs([
    args[0]!,
    ...args.slice(1),
    "--output-last-message",
    operation.expected.path,
  ]);
}

function sha256Bytes(contents: Uint8Array): string {
  return createHash("sha256").update(contents).digest("hex");
}

export function invocationEventsSha256(path: string): string {
  return sha256Bytes(readFileSync(path));
}

type SyncByteWriter = (
  descriptor: number,
  buffer: Uint8Array,
  offset: number,
  length: number,
  position: number | null,
) => number;

const defaultSyncByteWriter: SyncByteWriter = (
  descriptor,
  buffer,
  offset,
  length,
  position,
) => writeSync(descriptor, buffer, offset, length, position);

export function writeAllSync(
  descriptor: number,
  contents: Uint8Array,
  position: number | null = null,
  write: SyncByteWriter = defaultSyncByteWriter,
): void {
  let offset = 0;
  while (offset < contents.byteLength) {
    const remaining = contents.byteLength - offset;
    const written = write(
      descriptor,
      contents,
      offset,
      remaining,
      position === null ? null : position + offset,
    );
    if (!Number.isInteger(written) || written <= 0 || written > remaining) {
      throw new Error(
        `Synchronous write returned an invalid byte count: ${String(written)}.`,
      );
    }
    offset += written;
  }
}

type InvocationCompletionInput = {
  readonly elapsedMilliseconds: number;
  readonly exit: ModelInvocationLedgerEntry["exit"];
  readonly result: ModelInvocationResult;
};

export type ModelInvocationLastMessageDecodeFailure = Readonly<{
  readonly tag: "malformed" | "schemaInvalid";
  readonly message: string;
}>;

export type ModelInvocationLastMessageDecoder<A> = (
  contents: string,
) => Either.Either<A, ModelInvocationLastMessageDecodeFailure>;

function parseJsonLastMessage(
  contents: string,
): Either.Either<unknown, ModelInvocationLastMessageDecodeFailure> {
  try {
    const parsed: unknown = JSON.parse(contents);
    return Either.right(parsed);
  } catch (error: unknown) {
    return Either.left({
      tag: "malformed",
      message:
        error instanceof Error
          ? error.message
          : `Malformed JSON: ${String(error)}`,
    });
  }
}

export function jsonModelInvocationLastMessageDecoder<A, I>(
  schema: Schema.Schema<A, I>,
): ModelInvocationLastMessageDecoder<A> {
  return (contents) => {
    const parsed = parseJsonLastMessage(contents);
    if (Either.isLeft(parsed)) return Either.left(parsed.left);
    const decoded = Schema.decodeUnknownEither(schema, {
      onExcessProperty: "error",
    })(parsed.right);
    return Either.isLeft(decoded)
      ? Either.left({ tag: "schemaInvalid", message: decoded.left.message })
      : Either.right(decoded.right);
  };
}

export type ExpectedModelInvocationLastMessage<A> = Readonly<{
  readonly path: string;
  readonly decode: ModelInvocationLastMessageDecoder<A>;
}>;

type ExpectedModelInvocationOutputClaim = Readonly<{ readonly token: string }>;

function claimExpectedModelInvocationOutput(
  path: string,
): ExpectedModelInvocationOutputClaim | string {
  const token = `raw-swarm-expected-output-claim:${randomUUID()}`;
  try {
    const descriptor = openSync(path, "wx");
    try {
      writeAllSync(descriptor, Buffer.from(token, "utf8"));
    } finally {
      closeSync(descriptor);
    }
    return { token };
  } catch (error: unknown) {
    return `Expected Codex last-message output file could not be claimed exclusively before invocation: ${path}: ${error instanceof Error ? error.message : String(error)}.`;
  }
}

/**
 * Every invocation names whether it promises a retained final message.  A
 * structured-output caller cannot accidentally omit the decoder, while
 * authoring operations that edit files in place explicitly opt out.
 */
export type ModelInvocationOperation<A> =
  | Readonly<{ readonly tag: "noOutput" }>
  | Readonly<{
      readonly tag: "expectedLastMessage";
      readonly expected: ExpectedModelInvocationLastMessage<A>;
    }>;

type DecodedModelInvocationLastMessage<A> =
  | { readonly tag: "valid"; readonly value: A }
  | {
      readonly tag: "invalid";
      readonly reason: string;
      readonly failureKind: ModelInvocationLastMessageFailureKind;
    };

function decodeExpectedModelInvocationLastMessage<A>(input: {
  readonly expected: ExpectedModelInvocationLastMessage<A>;
  readonly claimToken?: string;
}): DecodedModelInvocationLastMessage<A> {
  if (!existsSync(input.expected.path)) {
    return {
      tag: "invalid",
      reason: `Expected Codex last-message output file does not exist: ${input.expected.path}.`,
      failureKind: "lastMessageMissing",
    };
  }
  const contents = (() => {
    try {
      return Either.right(readFileSync(input.expected.path, "utf8"));
    } catch (error: unknown) {
      return Either.left(error);
    }
  })();
  if (Either.isLeft(contents)) {
    const error = contents.left;
    return {
      tag: "invalid",
      reason: `Expected Codex last-message output file could not be read: ${error instanceof Error ? error.message : String(error)}.`,
      failureKind: "lastMessageUnreadable",
    };
  }
  if (input.claimToken !== undefined && contents.right === input.claimToken) {
    return {
      tag: "invalid",
      reason: `Expected Codex last-message output file does not exist as an invocation result: ${input.expected.path}.`,
      failureKind: "lastMessageMissing",
    };
  }
  if (contents.right.trim().length === 0) {
    return {
      tag: "invalid",
      reason: `Expected Codex last-message output file is empty: ${input.expected.path}.`,
      failureKind: "lastMessageEmpty",
    };
  }
  try {
    const decoded = input.expected.decode(contents.right);
    return Either.isLeft(decoded)
      ? {
          tag: "invalid",
          reason: `Expected Codex last-message output is ${decoded.left.tag}: ${decoded.left.message}.`,
          failureKind:
            decoded.left.tag === "malformed"
              ? "lastMessageMalformed"
              : "lastMessageSchemaInvalid",
        }
      : { tag: "valid", value: decoded.right };
  } catch (error: unknown) {
    return {
      tag: "invalid",
      reason: `Expected Codex last-message output is malformed: ${error instanceof Error ? error.message : String(error)}.`,
      failureKind: "lastMessageMalformed",
    };
  }
}

/** Process telemetry and retained current exit evidence share one state space. */
type CurrentModelInvocationExit = Schema.Schema.Type<
  typeof CurrentModelInvocationExitSchema
>;
export type ModelInvocationProcess = Exclude<
  CurrentModelInvocationExit,
  { readonly tag: "shellStatus" }
>;

/**
 * The runner only needs this small child-process surface.  Keeping the spawn
 * seam at this boundary makes deterministic lifecycle tests possible without
 * pretending an arbitrary object is Node's ChildProcess type.
 */
export type SpawnedCodexProcess = EventEmitter &
  Readonly<{
    readonly pid?: number | undefined;
    readonly exitCode?: number | null | undefined;
    readonly signalCode?: NodeJS.Signals | null | undefined;
    readonly kill: (signal: NodeJS.Signals) => boolean;
  }>;

export type SpawnOwnedCodexProcess = (input: {
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly stdinFd?: number | undefined;
  readonly eventFd: number;
  readonly logFd: number;
  readonly detached: boolean;
}) => SpawnedCodexProcess;

type SuccessfulModelInvocationProcess = Readonly<{
  readonly tag: "exited";
  readonly status: 0;
}>;
export const ModelInvocationNonZeroExitStatusSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.filter((status) => status !== 0),
  Schema.brand("NonZeroExitStatus"),
);
type NonZeroExitStatus = Schema.Schema.Type<
  typeof ModelInvocationNonZeroExitStatusSchema
>;
type UnsuccessfulModelInvocationProcess =
  Exclude<
    ModelInvocationProcess,
    SuccessfulModelInvocationProcess
  > extends infer Process
    ? Process extends { readonly tag: "exited" }
      ? Readonly<{ readonly tag: "exited"; readonly status: NonZeroExitStatus }>
      : Process
    : never;
export type ModelInvocationOperationTag =
  ModelInvocationOperation<unknown>["tag"];

function isSuccessfulModelInvocationProcess(
  process: ModelInvocationProcess,
): process is SuccessfulModelInvocationProcess {
  return process.tag === "exited" && process.status === 0;
}

function unsuccessfulModelInvocationProcess(
  process: ModelInvocationProcess,
): UnsuccessfulModelInvocationProcess {
  if (process.tag !== "exited") return process;
  const status = Schema.decodeUnknownEither(
    ModelInvocationNonZeroExitStatusSchema,
  )(process.status);
  if (Either.isLeft(status)) {
    throw new Error(
      "The process lifecycle marked an exited process unsuccessful without a nonzero status.",
    );
  }
  return { tag: "exited", status: status.right };
}

type ProcessFailureRun = Readonly<{
  readonly tag: "failed";
  readonly process: UnsuccessfulModelInvocationProcess;
  readonly cause:
    | Readonly<{ readonly tag: "process"; readonly reason: string }>
    | Readonly<{ readonly tag: "codex"; readonly reason: string }>;
}>;

type SuccessfulProcessFailureRun = Readonly<{
  readonly tag: "failed";
  readonly process: SuccessfulModelInvocationProcess;
  readonly cause: Readonly<{
    readonly tag: "lastMessage";
    readonly failureKind: ModelInvocationLastMessageFailureKind;
    readonly reason: string;
  }>;
}>;

type SuccessfulProcessCodexFailureRun = Readonly<{
  readonly tag: "failed";
  readonly process: SuccessfulModelInvocationProcess;
  readonly cause: Readonly<{ readonly tag: "codex"; readonly reason: string }>;
}>;

/**
 * The operation tag is carried through the lifecycle so a successful
 * no-output operation cannot be paired with decoded output (or vice versa).
 * Failure variants also keep process failures, successful-process output
 * failures, and first-party Codex failures in their valid combinations.
 */
export type ModelInvocationRun<
  A,
  K extends ModelInvocationOperationTag = ModelInvocationOperationTag,
> = K extends "noOutput"
  ?
      | Readonly<{
          readonly tag: "succeeded";
          readonly operation: "noOutput";
          readonly process: SuccessfulModelInvocationProcess;
          readonly output: Readonly<{ readonly tag: "notExpected" }>;
        }>
      | (ProcessFailureRun & Readonly<{ readonly operation: "noOutput" }>)
      | (SuccessfulProcessCodexFailureRun &
          Readonly<{ readonly operation: "noOutput" }>)
  : K extends "expectedLastMessage"
    ?
        | Readonly<{
            readonly tag: "succeeded";
            readonly operation: "expectedLastMessage";
            readonly process: SuccessfulModelInvocationProcess;
            readonly output: Readonly<{
              readonly tag: "decoded";
              readonly value: A;
            }>;
          }>
        | (ProcessFailureRun &
            Readonly<{ readonly operation: "expectedLastMessage" }>)
        | (SuccessfulProcessFailureRun &
            Readonly<{ readonly operation: "expectedLastMessage" }>)
        | (SuccessfulProcessCodexFailureRun &
            Readonly<{ readonly operation: "expectedLastMessage" }>)
    : never;

function modelInvocationFailureReason(process: ModelInvocationProcess): string {
  return Match.value(process).pipe(
    Match.when(
      { tag: "exited" },
      ({ status }) => `Codex exited with status ${String(status)}.`,
    ),
    Match.when(
      { tag: "signaled" },
      ({ signal }) => `Codex stopped by ${signal}.`,
    ),
    Match.when({ tag: "failedToStart" }, ({ message }) => message),
    Match.when({ tag: "timedOut" }, ({ timeoutMilliseconds, termination }) =>
      termination.tag === "reaped"
        ? `Codex invocation timed out after ${String(timeoutMilliseconds)} milliseconds; process reaped after ${termination.signalDelivery.signal}.`
        : `Codex invocation timed out after ${String(timeoutMilliseconds)} milliseconds; process was not reaped after ${termination.signalDelivery.signal}: ${termination.reason}`,
    ),
    Match.exhaustive,
  );
}

function invocationLifecycleFromProcess<A>(input: {
  readonly process: ModelInvocationProcess;
  readonly operation: ModelInvocationOperation<A>;
  readonly codexEventAnalysis: CodexEventAnalysis;
  readonly expectedOutputClaimToken?: string;
}): ModelInvocationRun<A> {
  if (!isSuccessfulModelInvocationProcess(input.process)) {
    const unsuccessfulProcess = unsuccessfulModelInvocationProcess(
      input.process,
    );
    const cause = Option.isNone(input.codexEventAnalysis.failureReason)
      ? {
          tag: "process" as const,
          reason:
            input.codexEventAnalysis.result.tag === "failed"
              ? input.codexEventAnalysis.result.reason
              : modelInvocationFailureReason(input.process),
        }
      : {
          tag: "codex" as const,
          reason: input.codexEventAnalysis.failureReason.value,
        };
    return input.operation.tag === "noOutput"
      ? {
          tag: "failed" as const,
          operation: "noOutput" as const,
          process: unsuccessfulProcess,
          cause,
        }
      : {
          tag: "failed" as const,
          operation: "expectedLastMessage" as const,
          process: unsuccessfulProcess,
          cause,
        };
  }
  if (input.codexEventAnalysis.result.tag === "failed") {
    const codexFailure = {
      tag: "codex" as const,
      reason: input.codexEventAnalysis.result.reason,
    };
    return input.operation.tag === "noOutput"
      ? {
          tag: "failed" as const,
          operation: "noOutput" as const,
          process: input.process,
          cause: codexFailure,
        }
      : {
          tag: "failed" as const,
          operation: "expectedLastMessage" as const,
          process: input.process,
          cause: codexFailure,
        };
  }
  if (input.operation.tag === "noOutput") {
    return {
      tag: "succeeded",
      operation: "noOutput",
      process: { tag: "exited", status: 0 as const },
      output: { tag: "notExpected" },
    };
  }
  const decoded = decodeExpectedModelInvocationLastMessage({
    expected: input.operation.expected,
    ...(input.expectedOutputClaimToken === undefined
      ? {}
      : { claimToken: input.expectedOutputClaimToken }),
  });
  return decoded.tag === "invalid"
    ? {
        tag: "failed",
        operation: "expectedLastMessage",
        process: input.process,
        cause: {
          tag: "lastMessage",
          failureKind: decoded.failureKind,
          reason: decoded.reason,
        },
      }
    : {
        tag: "succeeded",
        operation: "expectedLastMessage",
        process: { tag: "exited", status: 0 as const },
        output: { tag: "decoded", value: decoded.value },
      };
}

function modelInvocationResultFromLifecycle(
  lifecycle: ModelInvocationRun<unknown>,
  codexResult: ModelInvocationResult,
): ModelInvocationResult {
  if (lifecycle.tag === "succeeded") return codexResult;
  return lifecycle.cause.tag === "lastMessage"
    ? {
        tag: "failed",
        failureKind: lifecycle.cause.failureKind,
        operation: "expectedLastMessage",
        reason: lifecycle.cause.reason,
      }
    : codexResult.tag === "failed"
      ? { ...codexResult, reason: lifecycle.cause.reason }
      : { tag: "failed", reason: lifecycle.cause.reason };
}

function modelInvocationTimeoutMilliseconds(value: number | undefined): number {
  const decoded = Schema.decodeUnknownEither(PositiveIntegerSchema)(
    value === undefined ? MODEL_INVOCATION_TIMEOUT_MILLISECONDS : value,
  );
  if (Either.isLeft(decoded)) {
    throw new Error(
      `Model invocation timeout must be a positive integer: ${decoded.left.message}`,
    );
  }
  return decoded.right;
}

export const MODEL_INVOCATION_TERMINATION_GRACE_MILLISECONDS = 250;
export const MODEL_INVOCATION_TERMINATION_SETTLEMENT_GRACE_MILLISECONDS = 250;

export type ModelInvocationSignalDelivery = Schema.Schema.Type<
  typeof ModelInvocationSignalDeliverySchema
>;

type OwnedProcessSignalTarget = {
  readonly pid: number | undefined;
  readonly kill: (signal: NodeJS.Signals) => boolean;
  /** A process-group id is present only when the caller created a detached group. */
  readonly processGroupId?: number;
};

function signalDeliveryFailureReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function signalOwnedProcess(
  child: OwnedProcessSignalTarget,
  signal: "SIGTERM" | "SIGKILL",
): ModelInvocationSignalDelivery {
  if (
    child.processGroupId === undefined ||
    child.processGroupId <= 0 ||
    process.platform === "win32"
  ) {
    try {
      return child.kill(signal)
        ? { tag: "confirmed", signal }
        : {
            tag: "notDelivered",
            signal,
            reason: "ChildProcess.kill returned false.",
          };
    } catch (error: unknown) {
      return {
        tag: "notDelivered",
        signal,
        reason: `ChildProcess.kill threw: ${signalDeliveryFailureReason(error)}`,
      };
    }
  }
  try {
    process.kill(-child.processGroupId, signal);
    return { tag: "confirmed", signal };
  } catch (error: unknown) {
    return {
      tag: "notDelivered",
      signal,
      reason:
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ESRCH"
          ? "Owned process group no longer exists."
          : `Process-group signal threw: ${signalDeliveryFailureReason(error)}`,
    };
  }
}

type OwnedProcessGroupState =
  | "notTracked"
  | "present"
  | "gone"
  | "indeterminate";

function ownedProcessSignalTarget(
  child: SpawnedCodexProcess,
  detached: boolean,
): OwnedProcessSignalTarget {
  return {
    pid: child.pid,
    kill: (signal) => child.kill(signal),
    ...(process.platform === "win32" || !detached || child.pid === undefined
      ? {}
      : { processGroupId: child.pid }),
  };
}

function ownedProcessGroupState(
  target: OwnedProcessSignalTarget,
): OwnedProcessGroupState {
  if (target.processGroupId === undefined || process.platform === "win32") {
    return "notTracked";
  }
  try {
    process.kill(-target.processGroupId, 0);
    return "present";
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "ESRCH") return "gone";
      if (error.code === "EPERM") return "present";
    }
    return "indeterminate";
  }
}

function ownedProcessHasExited(child: SpawnedCodexProcess): boolean {
  return (
    (child.exitCode !== null && child.exitCode !== undefined) ||
    (child.signalCode !== null && child.signalCode !== undefined)
  );
}

function observedProcessOutcome(
  child: SpawnedCodexProcess,
): ModelInvocationProcess | undefined {
  if (child.signalCode !== null && child.signalCode !== undefined) {
    return { tag: "signaled", signal: child.signalCode };
  }
  if (child.exitCode !== null && child.exitCode !== undefined) {
    return { tag: "exited", status: child.exitCode };
  }
  return undefined;
}

async function waitForOwnedProcessSettlement(input: {
  readonly child: SpawnedCodexProcess;
  readonly target: OwnedProcessSignalTarget;
  readonly timeoutMilliseconds: number;
}): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const startedMilliseconds = Date.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    function finish(value: boolean): void {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      input.child.removeListener("exit", observe);
      input.child.removeListener("close", observe);
      resolve(value);
    }
    function observe(): void {
      if (settled) return;
      const groupState = ownedProcessGroupState(input.target);
      if (
        groupState === "gone" ||
        (groupState === "notTracked" && ownedProcessHasExited(input.child))
      ) {
        finish(true);
        return;
      }
      if (Date.now() - startedMilliseconds >= input.timeoutMilliseconds) {
        finish(false);
        return;
      }
      timer = setTimeout(observe, 10);
    }
    input.child.once("exit", observe);
    input.child.once("close", observe);
    observe();
  });
}

export type OwnedProcessTermination =
  | Readonly<{
      readonly tag: "reaped";
      readonly signalDelivery: ModelInvocationSignalDelivery;
    }>
  | Readonly<{
      readonly tag: "unreaped";
      readonly signalDelivery: ModelInvocationSignalDelivery;
      readonly reason: string;
    }>;

/**
 * Bound cleanup for a detached process group. The leader's exit is not enough
 * to settle cleanup: descendants keep the owned group alive until they are
 * observed gone or the bounded TERM-to-KILL window expires.
 */
export async function terminateOwnedProcess(
  child: SpawnedCodexProcess,
  options: Readonly<{ readonly detached: boolean }>,
): Promise<OwnedProcessTermination> {
  const target = ownedProcessSignalTarget(child, options.detached);
  const term = signalOwnedProcess(target, "SIGTERM");
  if (
    await waitForOwnedProcessSettlement({
      child,
      target,
      timeoutMilliseconds: MODEL_INVOCATION_TERMINATION_GRACE_MILLISECONDS,
    })
  ) {
    return { tag: "reaped", signalDelivery: term };
  }
  const kill = signalOwnedProcess(target, "SIGKILL");
  if (
    await waitForOwnedProcessSettlement({
      child,
      target,
      timeoutMilliseconds:
        MODEL_INVOCATION_TERMINATION_SETTLEMENT_GRACE_MILLISECONDS,
    })
  ) {
    return { tag: "reaped", signalDelivery: kill };
  }
  return {
    tag: "unreaped",
    signalDelivery: kill,
    reason:
      "The owned process group did not settle before the termination boundary expired.",
  };
}

async function spawnOwnedCodex(input: {
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly stdinFd?: number | undefined;
  readonly eventFd: number;
  readonly logFd: number;
  readonly timeoutMilliseconds: number;
  readonly spawnProcess?: SpawnOwnedCodexProcess | undefined;
}): Promise<ModelInvocationProcess> {
  return await new Promise<ModelInvocationProcess>((resolve, reject) => {
    let settled = false;
    const timers: { timeout: ReturnType<typeof setTimeout> | undefined } = {
      timeout: undefined,
    };
    let timeoutStarted = false;
    let normalCleanupStarted = false;
    let leaderOutcome: ModelInvocationProcess | undefined;
    const finish = (result: ModelInvocationProcess): void => {
      if (settled) return;
      settled = true;
      if (timers.timeout !== undefined) clearTimeout(timers.timeout);
      resolve(result);
    };
    const failCleanup = (boundary: string, reason: string): void => {
      if (settled) return;
      settled = true;
      if (timers.timeout !== undefined) clearTimeout(timers.timeout);
      reject(
        new Error(
          `Codex process-group cleanup did not settle ${boundary}: ${reason}`,
        ),
      );
    };
    let child: SpawnedCodexProcess;
    try {
      const detached = process.platform !== "win32";
      const spawnProcess =
        input.spawnProcess ??
        ((spawnInput) =>
          spawn("codex", [...spawnInput.args], {
            cwd: spawnInput.cwd,
            env: spawnInput.env,
            stdio: [
              spawnInput.stdinFd ?? "ignore",
              spawnInput.eventFd,
              spawnInput.logFd,
            ],
            detached: spawnInput.detached,
          }));
      child = spawnProcess({
        args: input.args,
        cwd: input.cwd,
        env: input.env,
        stdinFd: input.stdinFd,
        eventFd: input.eventFd,
        logFd: input.logFd,
        detached,
      });
    } catch (error: unknown) {
      finish({
        tag: "failedToStart",
        message: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    const signalTarget = ownedProcessSignalTarget(
      child,
      process.platform !== "win32",
    );
    const settleAfterNormalExit = (): void => {
      if (normalCleanupStarted || timeoutStarted || settled) return;
      normalCleanupStarted = true;
      void (async () => {
        if (
          await waitForOwnedProcessSettlement({
            child,
            target: signalTarget,
            timeoutMilliseconds:
              MODEL_INVOCATION_TERMINATION_GRACE_MILLISECONDS,
          })
        ) {
          finish(
            leaderOutcome ??
              observedProcessOutcome(child) ?? {
                tag: "failedToStart",
                message:
                  "Owned Codex process group disappeared before Node reported a process status.",
              },
          );
          return;
        }
        const termination = await terminateOwnedProcess(child, {
          detached: process.platform !== "win32",
        });
        if (termination.tag === "unreaped") {
          failCleanup("after the leader exited", termination.reason);
          return;
        }
        finish(
          leaderOutcome ??
            observedProcessOutcome(child) ?? {
              tag: "failedToStart",
              message:
                "Owned Codex process group settled before Node reported a process status.",
            },
        );
      })().catch((error: unknown) => {
        failCleanup(
          "after the leader exited",
          error instanceof Error ? error.message : String(error),
        );
      });
    };
    const processExited = (
      status: number | null,
      signal: NodeJS.Signals | null,
    ): void => {
      if (leaderOutcome !== undefined) return;
      if (signal !== null) {
        leaderOutcome = { tag: "signaled", signal };
      } else if (status !== null) {
        leaderOutcome = { tag: "exited", status };
      } else {
        leaderOutcome = {
          tag: "failedToStart",
          message: "Codex returned no process status.",
        };
      }
      if (!timeoutStarted) settleAfterNormalExit();
    };
    timers.timeout = setTimeout(() => {
      if (normalCleanupStarted) return;
      timeoutStarted = true;
      void (async () => {
        const term = signalOwnedProcess(signalTarget, "SIGTERM");
        if (
          await waitForOwnedProcessSettlement({
            child,
            target: signalTarget,
            timeoutMilliseconds:
              MODEL_INVOCATION_TERMINATION_GRACE_MILLISECONDS,
          })
        ) {
          finish({
            tag: "timedOut",
            timeoutMilliseconds: input.timeoutMilliseconds,
            termination: { tag: "reaped", signalDelivery: term },
          });
          return;
        }
        const kill = signalOwnedProcess(signalTarget, "SIGKILL");
        const reaped = await waitForOwnedProcessSettlement({
          child,
          target: signalTarget,
          timeoutMilliseconds:
            MODEL_INVOCATION_TERMINATION_SETTLEMENT_GRACE_MILLISECONDS,
        });
        finish({
          tag: "timedOut",
          timeoutMilliseconds: input.timeoutMilliseconds,
          termination: reaped
            ? { tag: "reaped", signalDelivery: kill }
            : {
                tag: "unreaped",
                signalDelivery: kill,
                reason:
                  "The owned Codex process group did not settle after the final timeout signal.",
              },
        });
      })().catch((error: unknown) => {
        failCleanup(
          "after timeout cleanup",
          error instanceof Error ? error.message : String(error),
        );
      });
    }, input.timeoutMilliseconds);
    child.once("error", (error: Error) => {
      if (timeoutStarted || normalCleanupStarted) return;
      finish({ tag: "failedToStart", message: error.message });
    });
    child.once("exit", processExited);
    child.once("close", processExited);
  });
}

type InvocationEvidenceFromEvents<E extends object> = (
  events: readonly unknown[],
) =>
  | { readonly tag: "valid"; readonly entry: E }
  | { readonly tag: "invalid"; readonly message: string };

type RunCodexProcessResult<A, E extends object> = Readonly<{
  readonly lifecycle: ModelInvocationRun<A>;
  /** Parsed once after the child settles; callers must use this evidence. */
  readonly evidence: E;
  /** Hash of the exact event bytes, including the runner completion record. */
  readonly eventsSha256: string;
}>;

async function runCodexProcess<A, E extends object>(input: {
  readonly args: readonly [string, ...string[]];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly stdinFd?: number | undefined;
  readonly eventPath: string;
  readonly logPath: string;
  readonly startedEvent: object;
  readonly startedMilliseconds: number;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly timeoutMilliseconds: number;
  readonly operation: ModelInvocationOperation<A>;
  readonly metadataErrorMessage: string;
  readonly completionEvent: (
    input: InvocationCompletionInput,
  ) => Either.Either<object, ParseResult.ParseError>;
  readonly completionErrorPrefix: string;
  readonly evidenceFromEvents: InvocationEvidenceFromEvents<E>;
  readonly spawnProcess?: SpawnOwnedCodexProcess | undefined;
}): Promise<RunCodexProcessResult<A, E>> {
  const codexArgs = codexInvocationArgsForOperation(
    input.args,
    input.operation,
  );
  if (
    !codexInvocationMetadataMatchesArgs({
      args: codexArgs,
      model: input.model,
      reasoningEffort: input.reasoningEffort,
    })
  ) {
    throw new Error(input.metadataErrorMessage);
  }
  const eventFd = openSync(input.eventPath, "wx");
  try {
    const rawEventPath = `${input.eventPath}.codex-raw`;
    const rawEventFd = openSync(rawEventPath, "wx");
    let rawEventFdOpen = true;
    const closeRawEvent = (): void => {
      if (!rawEventFdOpen) return;
      closeSync(rawEventFd);
      rawEventFdOpen = false;
    };
    try {
      const startedLine = `${JSON.stringify(input.startedEvent)}\n`;
      writeAllSync(eventFd, Buffer.from(startedLine, "utf8"));
      writeAllSync(rawEventFd, Buffer.from(startedLine, "utf8"));
      const logFd = openSync(input.logPath, "wx");
      try {
        const outputClaim =
          input.operation.tag === "expectedLastMessage"
            ? claimExpectedModelInvocationOutput(input.operation.expected.path)
            : undefined;
        const processOutcome =
          outputClaim === undefined || typeof outputClaim !== "string"
            ? await spawnOwnedCodex({
                args: codexArgs,
                cwd: input.cwd,
                env: input.env,
                stdinFd: input.stdinFd,
                eventFd: rawEventFd,
                logFd,
                timeoutMilliseconds: input.timeoutMilliseconds,
                spawnProcess: input.spawnProcess,
              })
            : ({
                tag: "failedToStart",
                message: outputClaim,
              } satisfies ModelInvocationProcess);
        const exit = processOutcome;
        const retainedEvents = readCodexEventsWithSource(rawEventPath);
        const events = retainedEvents.events;
        const codexEventAnalysis =
          retainedEvents.tag === "invalid"
            ? Either.right(codexEventDecodeFailure(retainedEvents.message))
            : analyzeCodexEvents(exit, events);
        const analysis = Either.isLeft(codexEventAnalysis)
          ? codexEventDecodeFailure(codexEventAnalysis.left)
          : codexEventAnalysis.right;
        const expectedOutputClaimToken =
          outputClaim === undefined || typeof outputClaim === "string"
            ? undefined
            : outputClaim.token;
        const completedForAnalysis = (
          codexEventAnalysis: CodexEventAnalysis,
        ) => {
          const lifecycle = invocationLifecycleFromProcess({
            process: processOutcome,
            codexEventAnalysis,
            operation: input.operation,
            ...(expectedOutputClaimToken === undefined
              ? {}
              : { expectedOutputClaimToken }),
          });
          const result = modelInvocationResultFromLifecycle(
            lifecycle,
            codexEventAnalysis.result,
          );
          const completedEvent = input.completionEvent({
            elapsedMilliseconds: Date.now() - input.startedMilliseconds,
            exit,
            result,
          });
          if (Either.isLeft(completedEvent)) {
            throw new Error(
              `${input.completionErrorPrefix}: ${completedEvent.left.message}`,
            );
          }
          return { lifecycle, completed: completedEvent.right };
        };
        const initialCompletion = completedForAnalysis(analysis);
        const finalized = (() => {
          const initialEvents = [...events, initialCompletion.completed];
          const evidence = input.evidenceFromEvents(initialEvents);
          if (evidence.tag === "valid") {
            return {
              ...initialCompletion,
              evidence: evidence.entry,
              authorityEvents: [
                ...events,
                ...(retainedEvents.tag === "invalid"
                  ? [codexEventDecodeFailureEvent(retainedEvents)]
                  : []),
              ],
            };
          }
          const fallbackCompletion = completedForAnalysis(
            codexEventDecodeFailure(evidence.message),
          );
          const fallbackEvents = [
            input.startedEvent,
            ...(retainedEvents.tag === "invalid"
              ? [codexEventDecodeFailureEvent(retainedEvents)]
              : []),
            fallbackCompletion.completed,
          ];
          const fallbackEvidence = input.evidenceFromEvents(fallbackEvents);
          if (fallbackEvidence.tag === "invalid") {
            throw new Error(fallbackEvidence.message);
          }
          return {
            ...fallbackCompletion,
            evidence: fallbackEvidence.entry,
            authorityEvents: fallbackEvents.slice(0, -1),
          };
        })();
        const rawRetentionReason =
          retainedEvents.tag === "invalid"
            ? ("malformedJsonl" as const)
            : finalized.lifecycle.tag === "succeeded"
              ? undefined
              : exit.tag === "timedOut" && exit.termination.tag === "unreaped"
                ? ("unreapedProcess" as const)
                : ("failedInvocation" as const);
        const rawRetention =
          rawRetentionReason === undefined
            ? undefined
            : codexRawRetentionEvent({
                rawContents: retainedEvents.rawContents,
                reason: rawRetentionReason,
              });
        const canonicalEvents = [
          ...finalized.authorityEvents,
          ...(rawRetention === undefined ? [] : [rawRetention]),
          finalized.completed,
        ];
        const canonicalContents = canonicalEvents
          .map((event) => `${JSON.stringify(event)}\n`)
          .join("");
        const canonicalBytes = Buffer.from(canonicalContents, "utf8");
        ftruncateSync(eventFd, 0);
        writeAllSync(eventFd, canonicalBytes, 0);
        const reread = readCodexEventsWithSource(input.eventPath);
        if (reread.tag === "invalid") {
          throw new Error(
            `Canonical invocation event authority is malformed after persistence: ${reread.message}`,
          );
        }
        const rereadEvidence = input.evidenceFromEvents(reread.events);
        if (rereadEvidence.tag === "invalid") {
          throw new Error(
            `Canonical invocation event authority could not rederive its ledger: ${rereadEvidence.message}`,
          );
        }
        if (
          canonicalJson(rereadEvidence.entry) !==
          canonicalJson(finalized.evidence)
        ) {
          throw new Error(
            "Canonical invocation event authority rederived a different ledger entry.",
          );
        }
        if (rawRetentionReason === undefined) {
          closeRawEvent();
          try {
            unlinkSync(rawEventPath);
          } catch {
            // A clean success may retain a diagnostic sidecar if the filesystem refuses removal.
          }
        }
        return {
          lifecycle: finalized.lifecycle,
          evidence: rereadEvidence.entry,
          eventsSha256: sha256Bytes(reread.rawContents),
        };
      } finally {
        closeSync(logFd);
      }
    } finally {
      closeRawEvent();
    }
  } finally {
    closeSync(eventFd);
  }
}

function appendInvocationEvidenceLedger(input: {
  readonly ledgerPath: string;
  readonly entry: object;
  readonly eventsSha256: string;
}): void {
  appendFileSync(
    input.ledgerPath,
    `${JSON.stringify({
      ...input.entry,
      eventsSha256: input.eventsSha256,
    })}\n`,
  );
}

type RunCodexInvocationInput<
  A,
  O extends ModelInvocationOperation<A> = ModelInvocationOperation<A>,
> = {
  readonly args: readonly [string, ...string[]];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly stdinFd?: number | undefined;
  readonly eventPath: string;
  readonly logPath: string;
  readonly ledgerPath: string;
  readonly phase: ModelInvocationPhase;
  readonly stagePlanReason: string;
  readonly subject: CurrentModelInvocationSubject;
  readonly gitSha: GitSha;
  readonly fallbackInvocationId: string;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly timeoutMilliseconds?: number;
  readonly operation: O;
  readonly spawnProcess?: SpawnOwnedCodexProcess | undefined;
};

type NoOutputOperation = Readonly<{ readonly tag: "noOutput" }>;
type ExpectedLastMessageOperation<A> = Extract<
  ModelInvocationOperation<A>,
  { readonly tag: "expectedLastMessage" }
>;

export function runCodexInvocation<A = unknown>(
  input: RunCodexInvocationInput<A, NoOutputOperation>,
): Promise<ModelInvocationRun<A, "noOutput">>;
export function runCodexInvocation<A>(
  input: RunCodexInvocationInput<A, ExpectedLastMessageOperation<A>>,
): Promise<ModelInvocationRun<A, "expectedLastMessage">>;
export async function runCodexInvocation<A = unknown>(
  input: RunCodexInvocationInput<A>,
): Promise<ModelInvocationRun<A>> {
  const startedAt = new Date().toISOString();
  const startedMilliseconds = Date.now();
  const startedEvent = currentModelInvocationStartedEvent({
    subject: input.subject,
    gitSha: input.gitSha,
    phase: input.phase,
    stagePlanReason: input.stagePlanReason,
    fallbackInvocationId: input.fallbackInvocationId,
    model: input.model,
    reasoningEffort: input.reasoningEffort,
    startedAt,
  });
  if (Either.isLeft(startedEvent)) {
    throw new Error(
      `Cannot create invocation start event: ${startedEvent.left.message}`,
    );
  }
  const processResult = await runCodexProcess({
    args: input.args,
    cwd: input.cwd,
    env: input.env,
    stdinFd: input.stdinFd,
    eventPath: input.eventPath,
    logPath: input.logPath,
    startedEvent: startedEvent.right,
    startedMilliseconds,
    model: input.model,
    reasoningEffort: input.reasoningEffort,
    timeoutMilliseconds: modelInvocationTimeoutMilliseconds(
      input.timeoutMilliseconds,
    ),
    operation: input.operation,
    metadataErrorMessage:
      "Invocation ledger model and reasoning effort must match the Codex arguments.",
    completionEvent: currentModelInvocationCompletedEvent,
    completionErrorPrefix: "Cannot create invocation completion event",
    evidenceFromEvents: modelInvocationEvidenceFromEvents,
    spawnProcess: input.spawnProcess,
  });
  if (processResult.evidence.schemaVersion !== 5) {
    throw new Error(
      "The current invocation runner must emit v5 model telemetry evidence.",
    );
  }
  appendInvocationEvidenceLedger({
    ledgerPath: input.ledgerPath,
    entry: processResult.evidence,
    eventsSha256: processResult.eventsSha256,
  });
  return processResult.lifecycle;
}

/**
 * Run one benchmark-only auxiliary call through the same first-party event
 * and ledger boundary as the production invocation runner.  The historical
 * profile keeps these calls visible without widening the current stage vocabulary.
 */
export type BenchmarkAuxiliaryInvocationKind =
  | {
      readonly responsibility: "scenarioQuality";
      readonly phase: "scenarioReadiness";
    }
  | {
      readonly responsibility: "redundantCharacterPreparation";
      readonly phase: "scenarioCharacterAuthoring";
    };

type RunBenchmarkAuxiliaryInvocationInput<
  A,
  O extends ModelInvocationOperation<A> = ModelInvocationOperation<A>,
> = {
  readonly args: readonly [string, ...string[]];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly stdinFd?: number | undefined;
  readonly eventPath: string;
  readonly logPath: string;
  readonly ledgerPath: string;
  readonly kind: BenchmarkAuxiliaryInvocationKind;
  readonly stagePlanReason: string;
  readonly scenarioId: ScenarioId;
  readonly gitSha: GitSha;
  readonly fallbackInvocationId: string;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly timeoutMilliseconds?: number;
  readonly operation: O;
  readonly spawnProcess?: SpawnOwnedCodexProcess | undefined;
};

export function runBenchmarkAuxiliaryInvocation<A = unknown>(
  input: RunBenchmarkAuxiliaryInvocationInput<A, NoOutputOperation>,
): Promise<Either.Either<ModelInvocationRun<A, "noOutput">, string>>;
export function runBenchmarkAuxiliaryInvocation<A>(
  input: RunBenchmarkAuxiliaryInvocationInput<
    A,
    ExpectedLastMessageOperation<A>
  >,
): Promise<Either.Either<ModelInvocationRun<A, "expectedLastMessage">, string>>;
export async function runBenchmarkAuxiliaryInvocation<A = unknown>(
  input: RunBenchmarkAuxiliaryInvocationInput<A>,
): Promise<Either.Either<ModelInvocationRun<A>, string>> {
  try {
    const startedAt = new Date().toISOString();
    const startedMilliseconds = Date.now();
    const startedEvent = currentBenchmarkModelInvocationStartedEvent({
      scenarioId: input.scenarioId,
      gitSha: input.gitSha,
      profile: "documentDeclarationSet",
      responsibility: input.kind.responsibility,
      phase: input.kind.phase,
      stagePlanReason: input.stagePlanReason,
      fallbackInvocationId: input.fallbackInvocationId,
      model: input.model,
      reasoningEffort: input.reasoningEffort,
      startedAt,
    });
    if (Either.isLeft(startedEvent)) {
      throw new Error(
        `Cannot create benchmark invocation start event: ${startedEvent.left.message}`,
      );
    }
    const processResult = await runCodexProcess({
      args: input.args,
      cwd: input.cwd,
      env: input.env,
      stdinFd: input.stdinFd,
      eventPath: input.eventPath,
      logPath: input.logPath,
      startedEvent: startedEvent.right,
      startedMilliseconds,
      model: input.model,
      reasoningEffort: input.reasoningEffort,
      timeoutMilliseconds: modelInvocationTimeoutMilliseconds(
        input.timeoutMilliseconds,
      ),
      operation: input.operation,
      metadataErrorMessage:
        "Benchmark invocation ledger model and reasoning effort must match the Codex arguments.",
      completionEvent: currentBenchmarkModelInvocationCompletedEvent,
      completionErrorPrefix:
        "Cannot create benchmark invocation completion event",
      evidenceFromEvents: benchmarkModelInvocationEvidenceFromEvents,
      spawnProcess: input.spawnProcess,
    });
    appendInvocationEvidenceLedger({
      ledgerPath: input.ledgerPath,
      entry: processResult.evidence,
      eventsSha256: processResult.eventsSha256,
    });
    return Either.right(processResult.lifecycle);
  } catch (error: unknown) {
    return Either.left(
      error instanceof Error
        ? error.message
        : `Benchmark auxiliary invocation failed: ${String(error)}`,
    );
  }
}
