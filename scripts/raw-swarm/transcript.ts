import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

export function currentGitSha(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
}

export type ToolResultContent = {
  readonly content: readonly { readonly type: string; readonly text: string }[];
  readonly isError?: boolean;
};

export function toolResultPayload(result: ToolResultContent): unknown {
  const first = result.content[0];
  if (first === undefined) return null;
  try {
    return JSON.parse(first.text);
  } catch {
    return first.text;
  }
}

export type TranscriptHeader = {
  readonly type: "header";
  readonly scenarioId: string;
  readonly kind: "scripted-probe" | "freeplay";
  readonly rawCitations: readonly string[];
  readonly gitSha: string;
  readonly startedAt: string;
};

export type TranscriptStep = {
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

export type McpToolExchange = TranscriptStep;

type TranscriptParseResult<A> =
  | { readonly tag: "valid"; readonly value: A }
  | { readonly tag: "invalid"; readonly message: string };

export function isJsonRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isTranscriptHeader(line: unknown): line is TranscriptHeader {
  if (!isJsonRecord(line)) return false;
  return (
    line.type === "header" &&
    typeof line.scenarioId === "string" &&
    (line.kind === "scripted-probe" || line.kind === "freeplay") &&
    Array.isArray(line.rawCitations) &&
    line.rawCitations.every((citation) => typeof citation === "string") &&
    typeof line.gitSha === "string" &&
    typeof line.startedAt === "string"
  );
}

export function isTranscriptStep(line: unknown): line is TranscriptStep {
  if (!isJsonRecord(line)) return false;
  return (
    Number.isInteger(line.seq) &&
    typeof line.tool === "string" &&
    typeof line.responseSha256 === "string" &&
    "args" in line &&
    "response" in line
  );
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

export function validateTranscriptSequence(
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

export function parseScriptedTranscript(
  records: readonly unknown[],
): TranscriptParseResult<{
  readonly header: TranscriptHeader & { readonly kind: "scripted-probe" };
  readonly steps: readonly TranscriptStep[];
}> {
  const [header, ...steps] = records;
  if (!isTranscriptHeader(header) || header.kind !== "scripted-probe") {
    return {
      tag: "invalid",
      message: "Scripted transcript requires one first scripted-probe header",
    };
  }
  if (!steps.every(isTranscriptStep)) {
    return {
      tag: "invalid",
      message: "Scripted transcript contains an invalid step",
    };
  }
  const sequence = validateTranscriptSequence(steps);
  if (sequence.tag === "invalid") return sequence;
  if (
    steps.some((step) => step.responseSha256 !== sha256Canonical(step.response))
  ) {
    return {
      tag: "invalid",
      message: "Scripted transcript contains a response hash mismatch",
    };
  }
  return { tag: "valid", value: { header, steps } };
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
          message: `Duplicate pending JSON-RPC id ${id} at seq ${step.seq}`,
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
    const response =
      "result" in step.message
        ? step.message.result
        : { error: step.message.error ?? null };
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
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : undefined;
}
