import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Either, Schema } from "effect";

export const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  const entries = Object.entries(value)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`);
  return `{${entries.join(",")}}`;
}

export function sha256Canonical(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export interface GitCommandReader {
  readonly read: (args: readonly string[]) => string;
}

const liveGitCommandReader: GitCommandReader = {
  read: (args) =>
    execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }),
};

export function currentGitRevision(
  git: GitCommandReader = liveGitCommandReader,
): { readonly tag: "clean"; readonly sha: string } | { readonly tag: "dirty" } {
  const status = git.read(["status", "--porcelain"]);
  if (status.trim().length > 0) {
    return { tag: "dirty" };
  }
  return {
    tag: "clean",
    sha: git.read(["rev-parse", "HEAD"]).trim(),
  };
}

export const ScenarioIdSchema = Schema.String.pipe(
  Schema.pattern(/^[a-z0-9][a-z0-9-]*$/),
  Schema.brand("RawSwarmScenarioId"),
);
export type ScenarioId = Schema.Schema.Type<typeof ScenarioIdSchema>;

export function decodeScenarioId(
  value: unknown,
): Either.Either<ScenarioId, string> {
  return Schema.decodeUnknownEither(ScenarioIdSchema)(value).pipe(
    Either.mapLeft(
      () => "scenario id must be lowercase letters, digits, and hyphens",
    ),
  );
}
export const GitShaSchema = Schema.String.pipe(
  Schema.pattern(/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/),
  Schema.brand("RawSwarmGitSha"),
);
export const StartedAtSchema = Schema.String.pipe(
  Schema.filter(
    (value) => {
      const parsed = new Date(value);
      return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
    },
    { message: () => "startedAt must be a canonical ISO timestamp" },
  ),
  Schema.brand("RawSwarmStartedAt"),
);

const TranscriptHeaderSchema = Schema.Struct({
  type: Schema.Literal("header"),
  scenarioId: ScenarioIdSchema,
  gitSha: GitShaSchema,
  startedAt: StartedAtSchema,
});
type TranscriptHeader = Schema.Schema.Type<typeof TranscriptHeaderSchema>;

type McpToolExchange = {
  readonly seq: number;
  readonly tool: string;
  readonly args: unknown;
  readonly response: unknown;
  readonly responseSha256: string;
};

type ParsedMcpTranscriptStep = {
  readonly seq: number;
  readonly direction: "client->server" | "server->client";
  readonly message: unknown;
  readonly unparsed?: never;
  readonly raw?: never;
};

type UnparsedMcpTranscriptStep = {
  readonly seq: number;
  readonly direction: "client->server" | "server->client";
  readonly message?: never;
  readonly unparsed: true;
  readonly raw: string;
};

export type McpTranscriptStep =
  | ParsedMcpTranscriptStep
  | UnparsedMcpTranscriptStep;

type TranscriptParseResult<A> =
  | { readonly tag: "valid"; readonly value: A }
  | { readonly tag: "invalid"; readonly message: string };

export function isJsonRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isMcpTranscriptStep(line: unknown): line is McpTranscriptStep {
  if (!isJsonRecord(line)) return false;
  const directionIsValid =
    line.direction === "client->server" || line.direction === "server->client";
  const isParsed =
    "message" in line && !("unparsed" in line) && !("raw" in line);
  const isUnparsed =
    !("message" in line) &&
    line.unparsed === true &&
    typeof line.raw === "string";
  return (
    Number.isInteger(line.seq) && directionIsValid && (isParsed || isUnparsed)
  );
}

function validateTranscriptSequence(
  steps: readonly { readonly seq: number }[],
): TranscriptParseResult<readonly { readonly seq: number }[]> {
  let previousSeq = 0;
  for (const step of steps) {
    if (!Number.isInteger(step.seq) || step.seq <= previousSeq) {
      return {
        tag: "invalid",
        message: `Transcript seq ${step.seq} must be a positive integer greater than ${previousSeq}`,
      };
    }
    previousSeq = step.seq;
  }
  return { tag: "valid", value: steps };
}

export function parsePlayerTranscript(
  records: readonly unknown[],
): TranscriptParseResult<{
  readonly header: TranscriptHeader;
  readonly exchanges: readonly McpToolExchange[];
}> {
  const [headerInput, ...steps] = records;
  const decodedHeader = Schema.decodeUnknownEither(TranscriptHeaderSchema, {
    onExcessProperty: "error",
  })(headerInput);
  if (Either.isLeft(decodedHeader)) {
    return {
      tag: "invalid",
      message: "Player transcript requires one first header",
    };
  }
  const header = decodedHeader.right;
  if (!steps.every(isMcpTranscriptStep)) {
    return {
      tag: "invalid",
      message: "Player transcript contains an invalid MCP record",
    };
  }
  const exchanges = mcpToolExchanges(steps);
  return exchanges.tag === "valid"
    ? { tag: "valid", value: { header, exchanges: exchanges.exchanges } }
    : exchanges;
}

export function mcpToolExchanges(
  steps: readonly McpTranscriptStep[],
):
  | { readonly tag: "valid"; readonly exchanges: readonly McpToolExchange[] }
  | { readonly tag: "invalid"; readonly message: string } {
  const sequence = validateTranscriptSequence(steps);
  if (sequence.tag === "invalid") return sequence;
  const pending = new Map<
    string,
    { readonly seq: number; readonly tool: string; readonly args: unknown }
  >();
  const exchanges: McpToolExchange[] = [];

  for (const step of steps) {
    if (!isJsonRecord(step.message)) continue;
    const id = jsonRpcId(step.message.id);
    if (
      step.direction === "client->server" &&
      step.message.method === "tools/call"
    ) {
      if (id === undefined || !isJsonRecord(step.message.params)) {
        return {
          tag: "invalid",
          message: `Invalid tools/call at seq ${step.seq}`,
        };
      }
      const name = step.message.params.name;
      if (typeof name !== "string") {
        return {
          tag: "invalid",
          message: `Missing tool name at seq ${step.seq}`,
        };
      }
      if (pending.has(id)) {
        return {
          tag: "invalid",
          message: `Duplicate pending JSON-RPC id ${JSON.stringify(step.message.id)} at seq ${step.seq}`,
        };
      }
      pending.set(id, {
        seq: step.seq,
        tool: name,
        args:
          "arguments" in step.message.params
            ? step.message.params.arguments
            : {},
      });
      continue;
    }
    if (step.direction !== "server->client" || id === undefined) continue;
    const request = pending.get(id);
    if (request === undefined) continue;
    const hasResult = "result" in step.message;
    const hasError = "error" in step.message;
    if (hasResult === hasError) {
      return {
        tag: "invalid",
        message: `JSON-RPC response at seq ${step.seq} requires exactly one of result or error`,
      };
    }
    if (
      hasError &&
      (!isJsonRecord(step.message.error) ||
        !Number.isInteger(step.message.error.code) ||
        typeof step.message.error.message !== "string")
    ) {
      return {
        tag: "invalid",
        message: `JSON-RPC error at seq ${step.seq} requires integer code and string message`,
      };
    }
    const response = hasResult
      ? step.message.result
      : { error: step.message.error };
    exchanges.push({
      ...request,
      response,
      responseSha256: sha256Canonical(response),
    });
    pending.delete(id);
  }

  if (pending.size > 0) {
    return {
      tag: "invalid",
      message: `${pending.size} tool call(s) have no recorded response`,
    };
  }
  return { tag: "valid", exchanges };
}

function jsonRpcId(value: unknown): string | undefined {
  if (typeof value === "string") return `string:${value}`;
  if (typeof value === "number") return `number:${value}`;
  return undefined;
}
