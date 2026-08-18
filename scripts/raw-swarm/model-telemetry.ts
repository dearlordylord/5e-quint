import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  openSync,
  readFileSync,
  writeSync,
} from "node:fs";

import { Either, ParseResult, Schema } from "effect";

import {
  GitShaSchema,
  isJsonRecord,
  ScenarioIdSchema,
  type GitSha,
  type ScenarioId,
} from "./transcript.ts";

export const MODEL_INVOCATION_PHASES = [
  "scenarioGeneration",
  "scenarioCompositeReview",
  "scenarioReadiness",
  "scenarioCharacterAuthoring",
  "scenarioSetupAuthoring",
  "player",
  "postPlayReview",
] as const;
export type ModelInvocationPhase = (typeof MODEL_INVOCATION_PHASES)[number];

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

export const ModelInvocationLedgerEntrySchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  scenarioId: ScenarioIdSchema,
  gitSha: GitShaSchema,
  eventsSha256: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/)),
  phase: Schema.Literal(...MODEL_INVOCATION_PHASES),
  invocationId: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  reasoningEffort: Schema.NonEmptyString,
  startedAt: Schema.NonEmptyString,
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: Schema.Union(
    Schema.Struct({
      tag: Schema.Literal("exited"),
      status: Schema.Number.pipe(Schema.int()),
    }),
    Schema.Struct({
      tag: Schema.Literal("signaled"),
      signal: Schema.NonEmptyString,
    }),
  ),
  usage: ModelUsageSchema,
});

export type TokenCount = Schema.Schema.Type<typeof TokenCountSchema>;
export type ModelUsage = Schema.Schema.Type<typeof ModelUsageSchema>;
export type ModelInvocationLedgerEntry = Schema.Schema.Type<
  typeof ModelInvocationLedgerEntrySchema
>;
type ModelInvocationLedgerEntryEncoded = Schema.Schema.Encoded<
  typeof ModelInvocationLedgerEntrySchema
>;

export const ModelInvocationStartedEventSchema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.started"),
  schemaVersion: Schema.Literal(1),
  scenarioId: ScenarioIdSchema,
  gitSha: GitShaSchema,
  phase: Schema.Literal(...MODEL_INVOCATION_PHASES),
  fallbackInvocationId: Schema.NonEmptyString,
  model: Schema.NonEmptyString,
  reasoningEffort: Schema.NonEmptyString,
  startedAt: Schema.NonEmptyString,
});

export const ModelInvocationCompletedEventSchema = Schema.Struct({
  type: Schema.Literal("raw-swarm.invocation.completed"),
  schemaVersion: Schema.Literal(1),
  elapsedMilliseconds: NonNegativeIntegerSchema,
  exit: ModelInvocationLedgerEntrySchema.fields.exit,
});

type ModelInvocationStartedEvent = Schema.Schema.Type<
  typeof ModelInvocationStartedEventSchema
>;
type ModelInvocationCompletedEvent = Schema.Schema.Type<
  typeof ModelInvocationCompletedEventSchema
>;

export type ModelInvocationEventEvidence =
  | {
      readonly tag: "valid";
      readonly entry: Omit<ModelInvocationLedgerEntry, "eventsSha256">;
    }
  | { readonly tag: "invalid"; readonly message: string };

export function parseModelInvocationLedgerEntry(
  value: unknown,
): Either.Either<ModelInvocationLedgerEntry, ParseResult.ParseError> {
  return Schema.decodeUnknownEither(ModelInvocationLedgerEntrySchema, {
    onExcessProperty: "error",
  })(value);
}

function nonNegativeInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
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

function decodedEvents<A, I>(
  schema: Schema.Schema<A, I>,
  events: readonly unknown[],
): readonly { readonly index: number; readonly value: A }[] {
  return events.flatMap((event, index) => {
    const decoded = Schema.decodeUnknownEither(schema, {
      onExcessProperty: "error",
    })(event);
    return Either.isRight(decoded) ? [{ index, value: decoded.right }] : [];
  });
}

export function modelInvocationEvidenceFromEvents(
  events: readonly unknown[],
): ModelInvocationEventEvidence {
  const started = decodedEvents(ModelInvocationStartedEventSchema, events);
  const completed = decodedEvents(ModelInvocationCompletedEventSchema, events);
  if (
    started.length !== 1 ||
    completed.length !== 1 ||
    started[0]!.index >= completed[0]!.index
  ) {
    return {
      tag: "invalid",
      message:
        "Model invocation events require one ordered runner start and completion record.",
    };
  }
  const start: ModelInvocationStartedEvent = started[0]!.value;
  const completion: ModelInvocationCompletedEvent = completed[0]!.value;
  if (!Number.isFinite(Date.parse(start.startedAt))) {
    return {
      tag: "invalid",
      message: "Model invocation start time is not an ISO timestamp.",
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

export function modelInvocationStartedEvent(input: {
  readonly scenarioId: ScenarioId;
  readonly gitSha: GitSha;
  readonly phase: ModelInvocationPhase;
  readonly fallbackInvocationId: string;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly startedAt: string;
}): ModelInvocationStartedEvent {
  return Schema.decodeUnknownSync(ModelInvocationStartedEventSchema, {
    onExcessProperty: "error",
  })({
    type: "raw-swarm.invocation.started",
    schemaVersion: 1,
    ...input,
  });
}

export function modelInvocationCompletedEvent(input: {
  readonly elapsedMilliseconds: number;
  readonly exit: ModelInvocationLedgerEntry["exit"];
}): ModelInvocationCompletedEvent {
  return Schema.decodeUnknownSync(ModelInvocationCompletedEventSchema, {
    onExcessProperty: "error",
  })({
    type: "raw-swarm.invocation.completed",
    schemaVersion: 1,
    ...input,
  });
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
  entry: ModelInvocationLedgerEntryEncoded,
): void {
  appendFileSync(path, `${JSON.stringify(entry)}\n`);
}

export function invocationEventsSha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function runCodexInvocation(input: {
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly eventPath: string;
  readonly logPath: string;
  readonly ledgerPath: string;
  readonly phase: ModelInvocationPhase;
  readonly scenarioId: ScenarioId;
  readonly gitSha: GitSha;
  readonly fallbackInvocationId: string;
  readonly model: string;
  readonly reasoningEffort: string;
}): SpawnSyncReturns<Buffer> {
  const eventFd = openSync(input.eventPath, "wx");
  const startedAt = new Date().toISOString();
  const startedMilliseconds = Date.now();
  const startedEvent = modelInvocationStartedEvent({
    scenarioId: input.scenarioId,
    gitSha: input.gitSha,
    phase: input.phase,
    fallbackInvocationId: input.fallbackInvocationId,
    model: input.model,
    reasoningEffort: input.reasoningEffort,
    startedAt,
  });
  const result = (() => {
    try {
      writeSync(eventFd, `${JSON.stringify(startedEvent)}\n`);
      const logFd = openSync(input.logPath, "wx");
      try {
        const spawned = spawnSync("codex", input.args, {
          cwd: input.cwd,
          env: input.env,
          stdio: ["ignore", eventFd, logFd],
        });
        const exit: ModelInvocationLedgerEntry["exit"] =
          spawned.signal === null
            ? { tag: "exited", status: spawned.status ?? 1 }
            : { tag: "signaled", signal: spawned.signal };
        writeSync(
          eventFd,
          `${JSON.stringify(
            modelInvocationCompletedEvent({
              elapsedMilliseconds: Date.now() - startedMilliseconds,
              exit,
            }),
          )}\n`,
        );
        return spawned;
      } finally {
        closeSync(logFd);
      }
    } finally {
      closeSync(eventFd);
    }
  })();
  const parsedEvents = readCodexEvents(input.eventPath);
  if (parsedEvents.tag === "invalid") throw new Error(parsedEvents.message);
  const evidence = modelInvocationEvidenceFromEvents(parsedEvents.events);
  if (evidence.tag === "invalid") throw new Error(evidence.message);
  appendInvocationLedger(input.ledgerPath, {
    ...evidence.entry,
    eventsSha256: invocationEventsSha256(input.eventPath),
  });
  return result;
}
