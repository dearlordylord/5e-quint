import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { Either, Match } from "effect";

import {
  parseStrictReadCommand,
  type StrictReadExecutable,
} from "./review-read-validation.ts";

type ReviewInvocationPolicyResult =
  | { readonly tag: "valid" }
  | { readonly tag: "invalid"; readonly message: string };

export type ReviewInvocationPolicyContext =
  | { readonly profile: "boundedCapabilityProjection" }
  | {
      readonly profile: "documentDeclarationSet";
      readonly contextPath: string;
      readonly contextByteLength: number;
      readonly contextSha256: string;
    };

type JsonRecord = Record<string, unknown>;

type ParseResult<A> =
  | { readonly tag: "valid"; readonly value: A }
  | { readonly tag: "invalid"; readonly message: string };

type ContextRead = { readonly executable: StrictReadExecutable };

const SAFE_ITEM_TYPES = new Set([
  "agent_message",
  "reasoning",
  "status",
  "todo_list",
]);

const ITEM_KEYS = new Set([
  "aggregated_output",
  "command",
  "cwd",
  "exit_code",
  "id",
  "status",
  "type",
]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): ParseResult<never> {
  return { tag: "invalid", message };
}

function canonicalUnsignedDecimal(value: string | undefined): value is string {
  return value !== undefined && /^(?:0|[1-9]\d*)$/.test(value);
}

function oneDeclaredPath(
  args: readonly string[],
  contextPath: string,
  options: { readonly allowDoubleDash: boolean },
): boolean {
  const operands =
    options.allowDoubleDash && args[0] === "--" ? args.slice(1) : args;
  return operands.length === 1 && operands[0] === contextPath;
}

function parseContextRead(
  command: string,
  contextPath: string,
): ParseResult<ContextRead> {
  const parsed = parseStrictReadCommand(command);
  if (Either.isLeft(parsed)) return invalid(parsed.left);
  const { executable, args } = parsed.right;
  const valid = (): ParseResult<ContextRead> => ({
    tag: "valid",
    value: { executable },
  });
  const declaredPath = (allowDoubleDash: boolean, message: string) =>
    oneDeclaredPath(args, contextPath, { allowDoubleDash })
      ? valid()
      : invalid(message);
  return Match.value(executable).pipe(
    Match.when("cat", () =>
      declaredPath(
        true,
        "context read must name only the declared context authority",
      ),
    ),
    Match.when("sha256sum", () =>
      declaredPath(
        false,
        "context hash must name only the declared context authority",
      ),
    ),
    Match.when("wc", () => {
      const files = args.filter((value) => !value.startsWith("-"));
      const options = args.filter((value) => value.startsWith("-"));
      return files.length === 1 &&
        files[0] === contextPath &&
        options.every((value) => ["-c", "-l", "-m", "-w"].includes(value))
        ? valid()
        : invalid(
            "context count must name only the declared context authority",
          );
    }),
    Match.when("head", () => parseHeadOrTail()),
    Match.when("tail", () => parseHeadOrTail()),
    Match.when("od", () => {
      const files = args.filter((value) => !value.startsWith("-"));
      const options = args.filter((value) => value.startsWith("-"));
      return files.length === 1 &&
        files[0] === contextPath &&
        options.every((value) => /^(?:-An|-tx[0-9]+|-N\d+|-j\d+)$/.test(value))
        ? valid()
        : invalid(
            "context byte read must name only the declared context authority",
          );
    }),
    Match.when("rg", () => {
      let operandIndex = 0;
      while (operandIndex < args.length) {
        const argument = args[operandIndex] ?? "";
        if (argument === "--") {
          operandIndex += 1;
          break;
        }
        if (argument === "-C" || argument === "-m") {
          if (!canonicalUnsignedDecimal(args[operandIndex + 1])) {
            return invalid("context search uses unsupported arguments");
          }
          operandIndex += 2;
          continue;
        }
        if (["-F", "-i", "-n", "-o"].includes(argument)) {
          operandIndex += 1;
          continue;
        }
        if (argument.startsWith("-")) {
          return invalid("context search uses unsupported arguments");
        }
        break;
      }
      const operands = args.slice(operandIndex);
      return operands.length === 2 && operands[1] === contextPath
        ? valid()
        : invalid(
            "context search must name only the declared context authority",
          );
    }),
    Match.when("sed", () => {
      const [option, range, ...files] = args;
      const match =
        range === undefined ? null : /^(\d+)(?:,(\d+))?p$/.exec(range);
      return option === "-n" &&
        match !== null &&
        canonicalUnsignedDecimal(match[1]) &&
        canonicalUnsignedDecimal(match[2] ?? match[1]) &&
        files.length === 1 &&
        files[0] === contextPath &&
        Number.isSafeInteger(Number(match[1])) &&
        Number.isSafeInteger(Number(match[2] ?? match[1]))
        ? valid()
        : invalid(
            "context sed must use a numeric range and the declared context authority",
          );
    }),
    Match.exhaustive,
  );

  function parseHeadOrTail(): ParseResult<ContextRead> {
    const files =
      args[0] === "-n"
        ? canonicalUnsignedDecimal(args[1])
          ? args.slice(2)
          : []
        : args;
    return files.length === 1 &&
      files[0] === contextPath &&
      files.every((value) => !value.startsWith("-"))
      ? valid()
      : invalid("context read must name only the declared context authority");
  }
}

function contextPolicyFailure(
  events: readonly unknown[],
  context: Extract<
    ReviewInvocationPolicyContext,
    { readonly profile: "documentDeclarationSet" }
  >,
): string | undefined {
  if (
    !Number.isSafeInteger(context.contextByteLength) ||
    context.contextByteLength < 0
  ) {
    return "Document review context byte length is invalid.";
  }
  if (!/^[0-9a-f]{64}$/.test(context.contextSha256)) {
    return "Document review context SHA-256 is invalid.";
  }
  let bytes: Buffer;
  try {
    bytes = readFileSync(context.contextPath);
  } catch {
    return "Document review context authority is unreadable.";
  }
  if (bytes.length !== context.contextByteLength) {
    return "Document review context authority changed byte length.";
  }
  if (
    createHash("sha256").update(bytes).digest("hex") !== context.contextSha256
  ) {
    return "Document review context authority changed SHA-256.";
  }
  let completedReadCount = 0;
  for (const event of events) {
    if (
      !isRecord(event) ||
      (event.type !== "item.started" && event.type !== "item.completed")
    )
      continue;
    if (!isRecord(event.item)) {
      return "Reviewer invocation has a malformed tool item.";
    }
    const item = event.item;
    if (SAFE_ITEM_TYPES.has(typeof item.type === "string" ? item.type : "")) {
      continue;
    }
    if (item.type !== "command_execution" || typeof item.command !== "string") {
      return "Legacy reviewer used a tool other than a direct context read.";
    }
    for (const key of Object.keys(item)) {
      if (!ITEM_KEYS.has(key)) {
        return `Legacy reviewer command has an unsupported field: ${key}`;
      }
    }
    const read = parseContextRead(item.command, context.contextPath);
    if (read.tag === "invalid") return read.message;
    if (event.type === "item.started") continue;
    if (item.status !== "completed" || item.exit_code !== 0) {
      const noRipgrepMatches =
        read.value.executable === "rg" &&
        item.status === "failed" &&
        item.exit_code === 1;
      if (!noRipgrepMatches) {
        return "Legacy reviewer context read did not complete successfully.";
      }
    }
    completedReadCount += 1;
  }
  return completedReadCount === 0
    ? "Legacy reviewer did not read the declared context authority."
    : undefined;
}

function boundedPolicyFailure(events: readonly unknown[]): string | undefined {
  const toolItem = events.find((event) => {
    if (
      !isRecord(event) ||
      (event.type !== "item.started" && event.type !== "item.completed")
    )
      return false;
    const item = event.item;
    return (
      isRecord(item) &&
      typeof item.type === "string" &&
      !SAFE_ITEM_TYPES.has(item.type)
    );
  });
  return toolItem === undefined
    ? undefined
    : "Reviewer invocation used a tool instead of the evidence packet.";
}

const REVIEW_POLICY_USAGE =
  "Usage: review-invocation-policy.ts <events.jsonl> [--profile <profile> --context-path <path> --context-byte-length <bytes> --context-sha256 <sha256>]";
const REVIEW_POLICY_OPTIONS = new Set([
  "--profile",
  "--context-path",
  "--context-byte-length",
  "--context-sha256",
]);

export type ReviewInvocationPolicyCliArguments = Readonly<{
  readonly eventsPath: string;
  readonly context: ReviewInvocationPolicyContext;
}>;

/** Parse the public CLI without silently accepting duplicate or unknown flags. */
export function parseReviewInvocationPolicyArgs(
  args: readonly string[],
): Either.Either<ReviewInvocationPolicyCliArguments, string> {
  const eventsPath = args[0];
  if (eventsPath === undefined || eventsPath.startsWith("--")) {
    return Either.left(REVIEW_POLICY_USAGE);
  }
  const values = new Map<string, string>();
  for (let index = 1; index < args.length; index += 1) {
    const option = args[index];
    if (option === undefined || !REVIEW_POLICY_OPTIONS.has(option)) {
      return Either.left(
        `Unknown review policy option: ${option ?? "<missing>"}`,
      );
    }
    if (values.has(option)) {
      return Either.left(`Duplicate review policy option: ${option}`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      return Either.left(`Missing value for review policy option: ${option}`);
    }
    values.set(option, value);
    index += 1;
  }
  const profile = values.get("--profile") ?? "boundedCapabilityProjection";
  const contextOptions = [
    "--context-path",
    "--context-byte-length",
    "--context-sha256",
  ] as const;
  const hasContextOptions = contextOptions.some((option) => values.has(option));
  if (profile === "boundedCapabilityProjection") {
    return hasContextOptions
      ? Either.left(
          "Context options require the documentDeclarationSet profile.",
        )
      : Either.right({
          eventsPath,
          context: { profile: "boundedCapabilityProjection" },
        });
  }
  if (profile !== "documentDeclarationSet") {
    return Either.left(`Unsupported review invocation profile: ${profile}`);
  }
  const contextPath = values.get("--context-path");
  const contextByteLengthText = values.get("--context-byte-length");
  const contextSha256 = values.get("--context-sha256");
  if (
    contextPath === undefined ||
    contextByteLengthText === undefined ||
    contextSha256 === undefined
  ) {
    return Either.left(
      "The documentDeclarationSet profile requires all context options.",
    );
  }
  if (!canonicalUnsignedDecimal(contextByteLengthText)) {
    return Either.left("Context byte length must be a canonical decimal.");
  }
  const contextByteLength = Number(contextByteLengthText);
  if (!Number.isSafeInteger(contextByteLength)) {
    return Either.left(
      "Context byte length is outside the safe integer range.",
    );
  }
  return Either.right({
    eventsPath,
    context: {
      profile: "documentDeclarationSet",
      contextPath,
      contextByteLength,
      contextSha256,
    },
  });
}

export function reviewInvocationPolicy(
  events: readonly unknown[],
  context: ReviewInvocationPolicyContext = {
    profile: "boundedCapabilityProjection",
  },
): ReviewInvocationPolicyResult {
  const failure =
    context.profile === "documentDeclarationSet"
      ? contextPolicyFailure(events, context)
      : boundedPolicyFailure(events);
  return failure === undefined
    ? { tag: "valid" }
    : { tag: "invalid", message: failure };
}

function fail(message: string): never {
  throw new Error(message);
}

function main(args: readonly string[]): void {
  const parsed = parseReviewInvocationPolicyArgs(args);
  if (Either.isLeft(parsed)) fail(parsed.left);
  const eventsPath = parsed.right.eventsPath;
  const events = readFileSync(eventsPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line));
  const result = reviewInvocationPolicy(events, parsed.right.context);
  if (result.tag === "invalid") fail(result.message);
  console.log(JSON.stringify(result));
}

if (process.argv[1]?.endsWith("review-invocation-policy.ts")) {
  main(process.argv.slice(2));
}
