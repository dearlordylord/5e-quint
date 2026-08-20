import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  openSync,
  readFileSync,
  writeSync,
} from "node:fs";

import { Either, Option, ParseResult, Schema } from "effect";

import {
  GitShaSchema,
  isJsonRecord,
  ScenarioIdSchema,
  type GitSha,
  type ScenarioId,
} from "./transcript.ts";

/** Current phase vocabulary. New v2 evidence cannot invent a readiness pass. */
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
 * A benchmark can retain historical auxiliary work without making that work
 * part of the production v2 stage vocabulary.  The benchmark parser below is
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
const ModelInvocationResultSchema = Schema.Union(
  Schema.Struct({ tag: Schema.Literal("succeeded") }),
  Schema.Struct({
    tag: Schema.Literal("failed"),
    reason: Schema.NonEmptyTrimmedString,
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

const ModelInvocationExitSchema = Schema.Union(
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

/** Identity fields shared by every retained model invocation envelope. */
export const ModelInvocationIdentityFields = {
  scenarioId: ScenarioIdSchema,
  invocationId: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  reasoningEffort: Schema.NonEmptyString,
} as const;

/** Historical records retain the pre-v2 protocol without invented dimensions. */
const ModelInvocationLedgerEntryV1Schema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  ...ModelInvocationIdentityFields,
  gitSha: GitShaSchema,
  eventsSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  phase: Schema.Literal(...HISTORICAL_MODEL_INVOCATION_PHASES),
  startedAt: Schema.NonEmptyString,
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: ModelInvocationExitSchema,
  usage: ModelUsageSchema,
});

/** Current v2 evidence written by the invocation runner. */
export const CurrentModelInvocationLedgerEntrySchema = Schema.Struct({
  schemaVersion: Schema.Literal(2),
  ...ModelInvocationIdentityFields,
  gitSha: GitShaSchema,
  eventsSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  phase: Schema.Literal(...MODEL_INVOCATION_PHASES),
  stagePlanReason: Schema.NonEmptyTrimmedString,
  startedAt: Schema.NonEmptyString,
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: ModelInvocationExitSchema,
  result: ModelInvocationResultSchema,
  usage: ModelUsageSchema,
}).pipe(
  Schema.filter(invocationResultMatchesExit, {
    message: () => "Invocation result must agree with its exit status.",
  }),
);

export const ModelInvocationLedgerEntrySchema = Schema.Union(
  ModelInvocationLedgerEntryV1Schema,
  CurrentModelInvocationLedgerEntrySchema,
);

export type TokenCount = Schema.Schema.Type<typeof TokenCountSchema>;
export type ModelUsage = Schema.Schema.Type<typeof ModelUsageSchema>;
type HistoricalModelInvocationLedgerEntry = Schema.Schema.Type<
  typeof ModelInvocationLedgerEntryV1Schema
>;
export type CurrentModelInvocationLedgerEntry = Schema.Schema.Type<
  typeof CurrentModelInvocationLedgerEntrySchema
>;
export type ModelInvocationLedgerEntry = Schema.Schema.Type<
  typeof ModelInvocationLedgerEntrySchema
>;
type CurrentModelInvocationLedgerEntryEncoded = Schema.Schema.Encoded<
  typeof CurrentModelInvocationLedgerEntrySchema
>;
type ModelInvocationEventEntry =
  | Omit<HistoricalModelInvocationLedgerEntry, "eventsSha256">
  | Omit<CurrentModelInvocationLedgerEntry, "eventsSha256">;

const ModelInvocationStartedEventV1Schema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.started"),
  schemaVersion: Schema.Literal(1),
  scenarioId: ScenarioIdSchema,
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
  scenarioId: ScenarioIdSchema,
  gitSha: GitShaSchema,
  phase: Schema.Literal(...MODEL_INVOCATION_PHASES),
  stagePlanReason: Schema.NonEmptyTrimmedString,
  fallbackInvocationId: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  reasoningEffort: Schema.NonEmptyString,
  startedAt: Schema.NonEmptyString,
});

export const ModelInvocationStartedEventSchema = Schema.Union(
  ModelInvocationStartedEventV1Schema,
  ModelInvocationStartedEventV2Schema,
);

const ModelInvocationCompletedEventV1Schema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.completed"),
  schemaVersion: Schema.Literal(1),
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: ModelInvocationExitSchema,
});

const ModelInvocationCompletedEventV2Schema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.completed"),
  schemaVersion: Schema.Literal(2),
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: ModelInvocationExitSchema,
  result: ModelInvocationResultSchema,
}).pipe(
  Schema.filter(invocationResultMatchesExit, {
    message: () => "Invocation result must agree with its exit status.",
  }),
);

export const ModelInvocationCompletedEventSchema = Schema.Union(
  ModelInvocationCompletedEventV1Schema,
  ModelInvocationCompletedEventV2Schema,
);

const BenchmarkAuxiliaryInvocationCommonFields = {
  schemaVersion: Schema.Literal(3),
  profile: Schema.Literal("documentDeclarationSet"),
  ...ModelInvocationIdentityFields,
  gitSha: GitShaSchema,
  eventsSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  stagePlanReason: Schema.NonEmptyTrimmedString,
  startedAt: Schema.NonEmptyString,
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: ModelInvocationExitSchema,
  result: ModelInvocationResultSchema,
  usage: ModelUsageSchema,
} as const;

/**
 * Benchmark-only rows preserve work that the current stage plan deliberately
 * omits.  The responsibility/phase pairing is closed so readiness cannot be
 * relabeled as composite review and character declarations cannot satisfy the
 * canonical Character Sheet stage.
 */
export const BenchmarkAuxiliaryModelInvocationLedgerEntrySchema = Schema.Union(
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
export type BenchmarkAuxiliaryModelInvocationLedgerEntry = Schema.Schema.Type<
  typeof BenchmarkAuxiliaryModelInvocationLedgerEntrySchema
>;

const BenchmarkAuxiliaryInvocationStartedEventCommonFields = {
  type: Schema.Literal("raw-swarm.invocation.started"),
  schemaVersion: Schema.Literal(3),
  profile: Schema.Literal("documentDeclarationSet"),
  scenarioId: ScenarioIdSchema,
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

const BenchmarkAuxiliaryInvocationCompletedEventSchema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.completed"),
  schemaVersion: Schema.Literal(3),
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: ModelInvocationExitSchema,
  result: ModelInvocationResultSchema,
}).pipe(
  Schema.filter(invocationResultMatchesExit, {
    message: () => "Invocation result must agree with its exit status.",
  }),
);

type BenchmarkAuxiliaryInvocationStartedEvent = Schema.Schema.Type<
  typeof BenchmarkAuxiliaryInvocationStartedEventSchema
>;
type BenchmarkAuxiliaryInvocationCompletedEvent = Schema.Schema.Type<
  typeof BenchmarkAuxiliaryInvocationCompletedEventSchema
>;

type ModelInvocationStartedEvent = Schema.Schema.Type<
  typeof ModelInvocationStartedEventSchema
>;
type ModelInvocationCompletedEvent = Schema.Schema.Type<
  typeof ModelInvocationCompletedEventSchema
>;

type ModelInvocationEventInput = {
  readonly scenarioId: unknown;
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
  exit: Schema.Schema.Type<typeof ModelInvocationExitSchema>,
): Schema.Schema.Type<typeof ModelInvocationResultSchema> {
  if (
    (exit.tag === "exited" || exit.tag === "shellStatus") &&
    exit.status === 0
  ) {
    return { tag: "succeeded" };
  }
  return {
    tag: "failed",
    reason:
      exit.tag === "exited"
        ? `Codex exited with status ${String(exit.status)}.`
        : exit.tag === "signaled"
          ? `Codex stopped by ${exit.signal}.`
          : exit.tag === "failedToStart"
            ? exit.message
            : `Invocation shell exited with status ${String(exit.status)}.`,
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
export function modelInvocationResultFromCodexEvents(
  exit: Schema.Schema.Type<typeof ModelInvocationExitSchema>,
  events: readonly unknown[],
): Either.Either<
  Schema.Schema.Type<typeof ModelInvocationResultSchema>,
  string
> {
  const failureReason = firstPartyCodexFailureReason(events);
  if (Either.isLeft(failureReason)) return failureReason;
  const processResult = resultFromExit(exit);
  if (processResult.tag === "succeeded" && Option.isSome(failureReason.right)) {
    return Either.left(
      "Codex emitted a terminal failure event but exited successfully.",
    );
  }
  return Either.right(
    Option.match(failureReason.right, {
      onNone: () => processResult,
      onSome: (reason) => ({ tag: "failed" as const, reason }),
    }),
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
    };

export function readCodexEvents(path: string): CodexEventReadResult {
  const contents = readFileSync(path, "utf8");
  const events: unknown[] = [];
  const lines = contents.split("\n");
  for (const [index, line] of lines.entries()) {
    if (line.trim().length === 0) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      return {
        tag: "invalid",
        line: index + 1,
        message: `Codex event line ${index + 1} is malformed JSON.`,
      };
    }
  }
  return { tag: "valid", events };
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
    BenchmarkAuxiliaryInvocationStartedEventSchema,
    "raw-swarm.invocation.started",
    events,
  );
  if (started.tag === "invalid") return started;
  const completed = decodedInvocationEvents(
    BenchmarkAuxiliaryInvocationCompletedEventSchema,
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
  return {
    tag: "valid",
    entry: {
      schemaVersion: 3,
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

export function modelInvocationStartedEvent(
  input: ModelInvocationEventInput,
): Either.Either<ModelInvocationStartedEvent, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(ModelInvocationStartedEventSchema, {
    onExcessProperty: "error",
  })({
    type: "raw-swarm.invocation.started",
    schemaVersion: 2,
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

export function modelInvocationCompletedEvent(input: {
  readonly elapsedMilliseconds: unknown;
  readonly exit: unknown;
  readonly result: unknown;
}): Either.Either<ModelInvocationCompletedEvent, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(ModelInvocationCompletedEventSchema, {
    onExcessProperty: "error",
  })({
    type: "raw-swarm.invocation.completed",
    schemaVersion: 2,
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

export function appendInvocationEvidenceEvents(input: {
  readonly path: string;
  readonly start: ModelInvocationStartedEvent;
  readonly completion: ModelInvocationCompletedEvent;
}): void {
  const rawEvents = readFileSync(input.path, "utf8");
  const separated =
    rawEvents.length === 0 || rawEvents.endsWith("\n") ? "" : "\n";
  const encoded = `${JSON.stringify(input.start)}\n${rawEvents}${separated}${JSON.stringify(input.completion)}\n`;
  const descriptor = openSync(input.path, "w");
  try {
    writeSync(descriptor, encoded);
  } finally {
    closeSync(descriptor);
  }
}

export function appendInvocationLedger(
  path: string,
  entry: CurrentModelInvocationLedgerEntryEncoded,
): void {
  appendFileSync(path, `${JSON.stringify(entry)}\n`);
}

export function invocationEventsSha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

type InvocationCompletionInput = {
  readonly elapsedMilliseconds: number;
  readonly exit: ModelInvocationLedgerEntry["exit"];
  readonly result: Schema.Schema.Type<typeof ModelInvocationResultSchema>;
};

function runCodexProcess(input: {
  readonly args: readonly [string, ...string[]];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly eventPath: string;
  readonly logPath: string;
  readonly startedEvent: object;
  readonly startedMilliseconds: number;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly metadataErrorMessage: string;
  readonly completionEvent: (
    input: InvocationCompletionInput,
  ) => Either.Either<object, ParseResult.ParseError>;
  readonly completionErrorPrefix: string;
}): SpawnSyncReturns<Buffer> {
  const codexArgs = codexJsonArgs(input.args);
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
    writeSync(eventFd, `${JSON.stringify(input.startedEvent)}\n`);
    const logFd = openSync(input.logPath, "wx");
    try {
      const spawned = spawnSync("codex", codexArgs, {
        cwd: input.cwd,
        env: input.env,
        stdio: ["ignore", eventFd, logFd],
      });
      const exit: ModelInvocationLedgerEntry["exit"] =
        spawned.error !== undefined
          ? { tag: "failedToStart", message: spawned.error.message }
          : spawned.signal !== null
            ? { tag: "signaled", signal: spawned.signal }
            : spawned.status !== null
              ? { tag: "exited", status: spawned.status }
              : {
                  tag: "failedToStart",
                  message: "Codex returned no process status.",
                };
      const retainedEvents = readCodexEvents(input.eventPath);
      const invocationResult = modelInvocationResultFromCodexEvents(
        exit,
        retainedEvents.tag === "valid" ? retainedEvents.events : [],
      );
      if (Either.isLeft(invocationResult)) {
        throw new Error(
          `Cannot derive Codex invocation result: ${invocationResult.left}`,
        );
      }
      const completedEvent = input.completionEvent({
        elapsedMilliseconds: Date.now() - input.startedMilliseconds,
        exit,
        result: invocationResult.right,
      });
      if (Either.isLeft(completedEvent)) {
        throw new Error(
          `${input.completionErrorPrefix}: ${completedEvent.left.message}`,
        );
      }
      writeSync(eventFd, `${JSON.stringify(completedEvent.right)}\n`);
      return spawned;
    } finally {
      closeSync(logFd);
    }
  } finally {
    closeSync(eventFd);
  }
}

function appendInvocationEvidenceLedger(input: {
  readonly eventPath: string;
  readonly ledgerPath: string;
  readonly entry: object;
}): void {
  appendFileSync(
    input.ledgerPath,
    `${JSON.stringify({
      ...input.entry,
      eventsSha256: invocationEventsSha256(input.eventPath),
    })}\n`,
  );
}

export function runCodexInvocation(input: {
  readonly args: readonly [string, ...string[]];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly eventPath: string;
  readonly logPath: string;
  readonly ledgerPath: string;
  readonly phase: ModelInvocationPhase;
  readonly stagePlanReason: string;
  readonly scenarioId: ScenarioId;
  readonly gitSha: GitSha;
  readonly fallbackInvocationId: string;
  readonly model: string;
  readonly reasoningEffort: string;
}): SpawnSyncReturns<Buffer> {
  const startedAt = new Date().toISOString();
  const startedMilliseconds = Date.now();
  const startedEvent = modelInvocationStartedEvent({
    scenarioId: input.scenarioId,
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
  const result = runCodexProcess({
    args: input.args,
    cwd: input.cwd,
    env: input.env,
    eventPath: input.eventPath,
    logPath: input.logPath,
    startedEvent: startedEvent.right,
    startedMilliseconds,
    model: input.model,
    reasoningEffort: input.reasoningEffort,
    metadataErrorMessage:
      "Invocation ledger model and reasoning effort must match the Codex arguments.",
    completionEvent: modelInvocationCompletedEvent,
    completionErrorPrefix: "Cannot create invocation completion event",
  });
  const parsedEvents = readCodexEvents(input.eventPath);
  if (parsedEvents.tag === "invalid") throw new Error(parsedEvents.message);
  const evidence = modelInvocationEvidenceFromEvents(parsedEvents.events);
  if (evidence.tag === "invalid") throw new Error(evidence.message);
  if (evidence.entry.schemaVersion !== 2) {
    throw new Error(
      "The current invocation runner must emit v2 model telemetry evidence.",
    );
  }
  appendInvocationEvidenceLedger({
    eventPath: input.eventPath,
    ledgerPath: input.ledgerPath,
    entry: evidence.entry,
  });
  return result;
}

/**
 * Run one benchmark-only auxiliary call through the same first-party event
 * and ledger boundary as the production invocation runner.  The historical
 * profile keeps these calls visible without widening the v2 stage vocabulary.
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

export function runBenchmarkAuxiliaryInvocation(input: {
  readonly args: readonly [string, ...string[]];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
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
}): Either.Either<SpawnSyncReturns<Buffer>, string> {
  try {
    const startedAt = new Date().toISOString();
    const startedMilliseconds = Date.now();
    const startedEvent = benchmarkModelInvocationStartedEvent({
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
    const result = runCodexProcess({
      args: input.args,
      cwd: input.cwd,
      env: input.env,
      eventPath: input.eventPath,
      logPath: input.logPath,
      startedEvent: startedEvent.right,
      startedMilliseconds,
      model: input.model,
      reasoningEffort: input.reasoningEffort,
      metadataErrorMessage:
        "Benchmark invocation ledger model and reasoning effort must match the Codex arguments.",
      completionEvent: benchmarkModelInvocationCompletedEvent,
      completionErrorPrefix:
        "Cannot create benchmark invocation completion event",
    });
    const parsedEvents = readCodexEvents(input.eventPath);
    if (parsedEvents.tag === "invalid") throw new Error(parsedEvents.message);
    const evidence = benchmarkModelInvocationEvidenceFromEvents(
      parsedEvents.events,
    );
    if (evidence.tag === "invalid") throw new Error(evidence.message);
    appendInvocationEvidenceLedger({
      eventPath: input.eventPath,
      ledgerPath: input.ledgerPath,
      entry: evidence.entry,
    });
    return Either.right(result);
  } catch (error: unknown) {
    return Either.left(
      error instanceof Error
        ? error.message
        : `Benchmark auxiliary invocation failed: ${String(error)}`,
    );
  }
}
