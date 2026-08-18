import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { appendFileSync, closeSync, openSync, readFileSync } from "node:fs";

import { Either, ParseResult, Schema } from "effect";

import { isJsonRecord } from "./transcript.ts";

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

export function appendInvocationLedger(
  path: string,
  entry: ModelInvocationLedgerEntry,
): void {
  appendFileSync(path, `${JSON.stringify(entry)}\n`);
}

export function runCodexInvocation(input: {
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly eventPath: string;
  readonly logPath: string;
  readonly ledgerPath: string;
  readonly phase: ModelInvocationPhase;
  readonly fallbackInvocationId: string;
  readonly model: string;
  readonly reasoningEffort: string;
}): SpawnSyncReturns<Buffer> {
  const eventFd = openSync(input.eventPath, "wx");
  const startedAt = new Date().toISOString();
  const startedMilliseconds = Date.now();
  const result = (() => {
    try {
      const logFd = openSync(input.logPath, "wx");
      try {
        return spawnSync("codex", input.args, {
          cwd: input.cwd,
          env: input.env,
          stdio: ["ignore", eventFd, logFd],
        });
      } finally {
        closeSync(logFd);
      }
    } finally {
      closeSync(eventFd);
    }
  })();
  const parsedEvents = readCodexEvents(input.eventPath);
  const events = parsedEvents.tag === "valid" ? parsedEvents.events : [];
  appendInvocationLedger(input.ledgerPath, {
    schemaVersion: 1,
    phase: input.phase,
    invocationId: invocationIdFromCodexEvents(
      events,
      input.fallbackInvocationId,
    ),
    model: input.model,
    reasoningEffort: input.reasoningEffort,
    startedAt,
    elapsedMilliseconds: Date.now() - startedMilliseconds,
    exit:
      result.signal === null
        ? { tag: "exited", status: result.status ?? 1 }
        : { tag: "signaled", signal: result.signal },
    usage:
      parsedEvents.tag === "valid"
        ? modelUsageFromCodexEvents(events)
        : { tag: "unavailable", reason: parsedEvents.message },
  });
  return result;
}
