import { randomBytes, timingSafeEqual } from "node:crypto";

import { Schema } from "effect";

import { PLAY_SESSION_NEXT_OPERATION_NAMES } from "./play-session-tool-names.ts";

export const PUBLIC_MCP_SERVICE_NAME = "dnd-srd-oracle";

export const PUBLIC_MCP_DEPLOYMENT_ENVIRONMENTS = [
  "development",
  "staging",
  "production",
] as const;
export type PublicMcpDeploymentEnvironment =
  (typeof PUBLIC_MCP_DEPLOYMENT_ENVIRONMENTS)[number];

export const PublicMcpPublisherNameSchema = Schema.Trimmed.check(
  Schema.isNonEmpty(),
).pipe(Schema.brand("PublicMcpPublisherName"));
export type PublicMcpPublisherName = typeof PublicMcpPublisherNameSchema.Type;
export const DEFAULT_PUBLIC_MCP_PUBLISHER_NAME = Schema.decodeUnknownSync(
  PublicMcpPublisherNameSchema,
)("5e Quint developers");

export type PublicMcpServiceOperations = {
  readonly environment: PublicMcpDeploymentEnvironment;
  readonly release: string;
  readonly publisherName: PublicMcpPublisherName;
  readonly openAiAppsChallenge?: string;
  readonly metricsBearerToken?: string;
};

export type PublicMcpRequestOutcome =
  | "accepted"
  | "rejected"
  | "limited"
  | "failed";

export const PUBLIC_MCP_HTTP_METHODS = ["GET", "POST", "OTHER"] as const;
export type PublicMcpHttpMethod = (typeof PUBLIC_MCP_HTTP_METHODS)[number];

export type PublicMcpDiagnostic = {
  readonly code: PublicMcpDiagnosticCode;
  readonly reason: PublicMcpDiagnosticReason;
};

export const PUBLIC_MCP_DIAGNOSTIC_CODES = [
  "AUTHENTICATION_REQUIRED",
  "INVALID_ARGUMENTS",
  "PLAY_SESSION_CREATION_FAILED",
  "PLAY_SESSION_LIMIT_EXCEEDED",
  "PLAY_SESSION_STORAGE_FAILURE",
  "PLAY_SESSION_UNAVAILABLE",
  "TOOL_REJECTED",
] as const;
export type PublicMcpDiagnosticCode =
  (typeof PUBLIC_MCP_DIAGNOSTIC_CODES)[number];

export const PUBLIC_MCP_DIAGNOSTIC_REASONS = [
  "closed",
  "concurrentWriteConflict",
  "guestCapacityExceeded",
  "invalidStoredRecord",
  "requestRateExceeded",
  "retainedCommandQuotaExceeded",
  "savedSessionQuotaExceeded",
  "storageUnavailable",
  "unspecified",
] as const;
export type PublicMcpDiagnosticReason =
  (typeof PUBLIC_MCP_DIAGNOSTIC_REASONS)[number];

export type PublicMcpRequestObservation = {
  readonly environment: PublicMcpDeploymentEnvironment;
  readonly release: string;
  readonly traceId: string;
  readonly spanId: string;
  readonly method: PublicMcpHttpMethod;
  readonly route: string;
  readonly status: number;
  readonly durationMilliseconds: number;
  readonly outcome: PublicMcpRequestOutcome;
  readonly toolName?: string;
  readonly diagnostic?: PublicMcpDiagnostic;
};

const knownToolNames = new Set<string>(PLAY_SESSION_NEXT_OPERATION_NAMES);
const requestCounts = new Map<string, number>();
let requestCount = 0;
let requestDurationMilliseconds = 0;

export function publicMcpTraceContext(): {
  readonly traceId: string;
  readonly spanId: string;
} {
  return {
    traceId: randomBytes(16).toString("hex"),
    spanId: randomBytes(8).toString("hex"),
  };
}

export function observePublicMcpRequest(
  input: PublicMcpRequestObservation,
): void {
  const key = publicMcpRequestMetricKey(input);
  requestCounts.set(key, (requestCounts.get(key) ?? 0) + 1);
  requestCount += 1;
  requestDurationMilliseconds += input.durationMilliseconds;
  process.stderr.write(`${JSON.stringify(publicMcpRequestLog(input))}\n`);
}

function publicMcpRequestMetricKey(input: {
  readonly route: string;
  readonly method: PublicMcpHttpMethod;
  readonly status: number;
  readonly outcome: PublicMcpRequestOutcome;
  readonly toolName?: string;
  readonly diagnostic?: PublicMcpDiagnostic;
}): string {
  return [
    input.route,
    input.method,
    String(input.status),
    input.outcome,
    input.toolName ?? "none",
    input.diagnostic?.code ?? "none",
    input.diagnostic?.reason ?? "none",
  ].join("|");
}

function publicMcpRequestLog(
  input: PublicMcpRequestObservation,
): Record<string, unknown> {
  return {
    timestamp: new Date().toISOString(),
    severity: input.outcome === "failed" ? "error" : "info",
    event: "public_mcp_request",
    service: PUBLIC_MCP_SERVICE_NAME,
    environment: input.environment,
    release: input.release,
    traceId: input.traceId,
    spanId: input.spanId,
    method: input.method,
    route: input.route,
    status: input.status,
    outcome: input.outcome,
    durationMilliseconds: input.durationMilliseconds,
    ...(input.toolName === undefined ? {} : { toolName: input.toolName }),
    ...(input.diagnostic === undefined ? {} : { diagnostic: input.diagnostic }),
  };
}

export function publicMcpMetrics(): string {
  const lines = [
    "# HELP dnd_mcp_requests_total Public MCP requests by bounded route and outcome.",
    "# TYPE dnd_mcp_requests_total counter",
  ];
  for (const [key, count] of [...requestCounts.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const [route, method, status, outcome, tool, code, reason] = key.split("|");
    lines.push(
      `dnd_mcp_requests_total{route="${route}",method="${method}",status="${status}",outcome="${outcome}",tool="${tool}",code="${code}",reason="${reason}"} ${count}`,
    );
  }
  lines.push(
    "# HELP dnd_mcp_requests_observed_total Total public MCP HTTP requests.",
    "# TYPE dnd_mcp_requests_observed_total counter",
    `dnd_mcp_requests_observed_total ${requestCount}`,
    "# HELP dnd_mcp_request_duration_milliseconds_sum Total observed request duration.",
    "# TYPE dnd_mcp_request_duration_milliseconds_sum counter",
    `dnd_mcp_request_duration_milliseconds_sum ${requestDurationMilliseconds}`,
    "# HELP dnd_mcp_process_resident_memory_bytes Resident memory reported by Node.",
    "# TYPE dnd_mcp_process_resident_memory_bytes gauge",
    `dnd_mcp_process_resident_memory_bytes ${process.memoryUsage().rss}`,
    "# HELP dnd_mcp_process_cpu_seconds_total Process user and system CPU time.",
    "# TYPE dnd_mcp_process_cpu_seconds_total counter",
    `dnd_mcp_process_cpu_seconds_total ${(process.cpuUsage().user + process.cpuUsage().system) / 1_000_000}`,
    "# HELP dnd_mcp_process_uptime_seconds Process uptime.",
    "# TYPE dnd_mcp_process_uptime_seconds gauge",
    `dnd_mcp_process_uptime_seconds ${process.uptime()}`,
  );
  return `${lines.join("\n")}\n`;
}

export async function publicMcpToolName(
  request: Request,
): Promise<string | undefined> {
  try {
    const body: unknown = await request.clone().json();
    if (
      !isObject(body) ||
      body.method !== "tools/call" ||
      !isObject(body.params)
    ) {
      return undefined;
    }
    const name = body.params.name;
    return typeof name === "string" && knownToolNames.has(name)
      ? name
      : undefined;
  } catch {
    return undefined;
  }
}

export async function publicMcpOutcome(response: Response): Promise<{
  readonly outcome: PublicMcpRequestOutcome;
  readonly diagnostic?: PublicMcpDiagnostic;
}> {
  if (response.status >= 500) return { outcome: "failed" };
  if (response.status >= 400) return { outcome: "rejected" };
  const body = await response.clone().text();
  const parsed = parseJson(body);
  const errorResult = mcpErrorResult(parsed);
  const diagnostic =
    errorResult === undefined ? undefined : responseDiagnostic(errorResult);
  const outcome =
    diagnostic?.code === "PLAY_SESSION_LIMIT_EXCEEDED"
      ? "limited"
      : errorResult !== undefined
        ? "rejected"
        : "accepted";
  return { outcome, ...(diagnostic === undefined ? {} : { diagnostic }) };
}

export function publicMcpHttpMethod(
  method: string | undefined,
): PublicMcpHttpMethod {
  return method === "GET" || method === "POST" ? method : "OTHER";
}

export function writePublicMcpInitializationFailure(
  phase:
    | "configuration"
    | "authorization"
    | "oauth"
    | "storage"
    | "listen"
    | "shutdown",
): void {
  process.stderr.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      severity: "error",
      event: "public_mcp_initialization_failed",
      service: PUBLIC_MCP_SERVICE_NAME,
      phase,
    })}\n`,
  );
}

export function authorizedForMetrics(
  authorization: string | null,
  expectedToken: string | undefined,
): boolean {
  if (expectedToken === undefined || authorization === null) return false;
  const prefix = "Bearer ";
  if (!authorization.startsWith(prefix)) return false;
  const actual = Buffer.from(authorization.slice(prefix.length));
  const expected = Buffer.from(expectedToken);
  return (
    actual.byteLength === expected.byteLength &&
    timingSafeEqual(actual, expected)
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

function mcpErrorResult(value: unknown): Record<string, unknown> | undefined {
  if (
    !isObject(value) ||
    !isObject(value.result) ||
    value.result.isError !== true
  ) {
    return undefined;
  }
  return value.result;
}

function responseDiagnostic(
  result: Record<string, unknown>,
): PublicMcpDiagnostic {
  const structured = result.structuredContent;
  const details = isObject(structured) ? structured.details : undefined;
  const code = isObject(details) ? details.code : undefined;
  const reason = isObject(details) ? details.reason : undefined;
  return {
    code: isPublicMcpDiagnosticCode(code) ? code : "TOOL_REJECTED",
    reason: isPublicMcpDiagnosticReason(reason) ? reason : "unspecified",
  };
}

function isPublicMcpDiagnosticCode(
  value: unknown,
): value is PublicMcpDiagnosticCode {
  return PUBLIC_MCP_DIAGNOSTIC_CODES.some((code) => code === value);
}

function isPublicMcpDiagnosticReason(
  value: unknown,
): value is PublicMcpDiagnosticReason {
  return PUBLIC_MCP_DIAGNOSTIC_REASONS.some((reason) => reason === value);
}
