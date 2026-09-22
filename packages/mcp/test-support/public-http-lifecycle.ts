import { spawn, type ChildProcess } from "node:child_process";
import { request as requestHttp } from "node:http";
import { tmpdir } from "node:os";
import { createServer as createTcpServer } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
type JsonValue =
  | null
  | string
  | number
  | boolean
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };
function canonicalJson(value: unknown): string {
  const normalize = (entry: unknown): JsonValue => {
    if (
      entry === null ||
      typeof entry === "string" ||
      typeof entry === "boolean"
    )
      return entry;
    if (typeof entry === "number") {
      if (!Number.isFinite(entry))
        throw new TypeError("Lifecycle values must be finite.");
      return entry;
    }
    if (Array.isArray(entry)) return entry.map(normalize);
    if (typeof entry === "object") {
      return Object.fromEntries(
        Object.keys(entry)
          .sort()
          .map((key) => [key, normalize(Reflect.get(entry, key))]),
      );
    }
    throw new TypeError("Lifecycle values must be JSON-compatible.");
  };
  return JSON.stringify(normalize(value), null, 2) + "\n";
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const REPRESENTATIVE_MCP_CALLS = [
  { key: "describeMcpWorkflow", name: "describe_mcp_workflow" },
  { key: "listCatalogUnits", name: "list_catalog_units" },
] as const;

type McpClientCapture = {
  readonly tools: readonly unknown[];
  readonly calls: Readonly<Record<string, unknown>>;
};

async function captureMcpClient(client: Client): Promise<McpClientCapture> {
  const listed = await client.listTools();
  const calls: Record<string, unknown> = {};
  for (const representativeCall of REPRESENTATIVE_MCP_CALLS) {
    calls[representativeCall.key] = await client.callTool({
      name: representativeCall.name,
      arguments: {},
    });
  }
  return { tools: listed.tools, calls };
}

async function reserveHttpPort(): Promise<number> {
  const server = createTcpServer();
  return new Promise((resolvePort, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a local HTTP port."));
        return;
      }
      server.close((error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }
        resolvePort(address.port);
      });
    });
  });
}

async function waitForHttpHealth(
  healthUrl: URL,
  child: ChildProcess,
  stderr: () => string,
): Promise<void> {
  const deadline = Date.now() + 120_000;
  let childFailure: Error | undefined;
  const recordExit = (code: number | null, signal: NodeJS.Signals | null) => {
    childFailure = new Error(
      `Shipped HTTP MCP entrypoint exited before health readiness: ${
        signal ?? code ?? "unknown"
      }${stderr() === "" ? "" : `; stderr: ${stderr()}`}`,
    );
  };
  const recordError = (error: Error) => {
    childFailure = new Error(
      `Shipped HTTP MCP entrypoint failed to start: ${error.message}${
        stderr() === "" ? "" : `; stderr: ${stderr()}`
      }`,
    );
  };
  child.once("exit", recordExit);
  child.once("error", recordError);
  try {
    while (Date.now() < deadline) {
      if (childFailure !== undefined) throw childFailure;
      if (child.exitCode !== null || child.signalCode !== null) {
        recordExit(child.exitCode, child.signalCode);
        throw childFailure;
      }
      try {
        const response = await fetch(healthUrl, {
          signal: AbortSignal.timeout(2_000),
        });
        if (response.status === 200) {
          await response.body?.cancel();
          return;
        }
        await response.body?.cancel();
      } catch {
        // The shipped entrypoint may still be loading its schemas.
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
    }
    throw new Error(
      `Shipped HTTP MCP entrypoint did not become healthy within 120 seconds.${
        stderr() === "" ? "" : ` stderr: ${stderr()}`
      }`,
    );
  } finally {
    child.off("exit", recordExit);
    child.off("error", recordError);
  }
}

async function stopChildProcess(
  child: ChildProcess,
  stderr: () => string,
  signal: "SIGINT" | "SIGTERM",
): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    if (child.exitCode !== 0 || child.signalCode !== null) {
      throw new Error(
        `Shipped HTTP MCP entrypoint exited ${
          child.signalCode ?? child.exitCode ?? "unknown"
        }.${stderr() === "" ? "" : ` stderr: ${stderr()}`}`,
      );
    }
    return;
  }
  await new Promise<void>((resolveStop, reject) => {
    let settled = false;
    const finish = (code: number | null, signal: NodeJS.Signals | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(forceKillTimer);
      if (code === 0 && signal === null) {
        resolveStop();
      } else {
        reject(
          new Error(
            `Shipped HTTP MCP entrypoint did not shut down cleanly: ${
              signal ?? code ?? "unknown"
            }.`,
          ),
        );
      }
    };
    const forceKillTimer = setTimeout(() => {
      child.kill("SIGKILL");
    }, 5_000);
    child.once("exit", finish);
    child.kill(signal);
  });
}

const SHIPPED_HTTP_TOOLS_LIST_BODY =
  '{"jsonrpc":"2.0","id":99,"method":"tools/list"}';

function canonicalShippedHttpToolsResponse(input: {
  readonly body: string;
  readonly context: string;
  readonly statusCode: number | undefined;
}): string {
  if (input.statusCode !== 200) {
    throw new Error(
      `${input.context} returned status ${input.statusCode ?? "unknown"}.`,
    );
  }
  const payload: unknown = JSON.parse(input.body);
  if (
    !isPlainRecord(payload) ||
    payload.jsonrpc !== "2.0" ||
    payload.id !== 99 ||
    !isPlainRecord(payload.result) ||
    !Array.isArray(payload.result.tools)
  ) {
    throw new Error(`${input.context} was not a complete tools/list response.`);
  }
  return canonicalJson(payload);
}

async function verifyShippedHttpResponseDrain(
  port: number,
  child: ChildProcess,
  stderr: () => string,
  signal: "SIGINT" | "SIGTERM",
): Promise<string> {
  let resolveResponse!: (response: {
    readonly body: string;
    readonly statusCode: number | undefined;
  }) => void;
  let rejectResponse!: (error: unknown) => void;
  let resolveResponseStarted!: () => void;
  let rejectResponseStarted!: (error: unknown) => void;
  const responseStarted = new Promise<void>((resolve, reject) => {
    resolveResponseStarted = resolve;
    rejectResponseStarted = reject;
  });
  let shutdown: Promise<void> | undefined;
  let receivedBytes = 0;
  let bytesAtShutdown: number | undefined;
  const response = new Promise<{
    readonly body: string;
    readonly statusCode: number | undefined;
  }>((resolve, reject) => {
    resolveResponse = resolve;
    rejectResponse = reject;
  });
  const request = requestHttp({
    host: "127.0.0.1",
    port,
    path: "/mcp",
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      connection: "close",
      "content-length": Buffer.byteLength(SHIPPED_HTTP_TOOLS_LIST_BODY),
      "content-type": "application/json",
    },
  });
  request.once("response", (incoming) => {
    const chunks: Buffer[] = [];
    incoming.on("data", (chunk: Buffer | string) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      chunks.push(bytes);
      receivedBytes += bytes.byteLength;
      if (shutdown !== undefined) return;
      incoming.pause();
      bytesAtShutdown = receivedBytes;
      shutdown = stopChildProcess(child, stderr, signal);
      resolveResponseStarted();
      setImmediate(() => incoming.resume());
    });
    incoming.once("end", () => {
      if (bytesAtShutdown === undefined) {
        const error = new Error(
          "Shipped HTTP response ended before shutdown could be coordinated from response bytes.",
        );
        rejectResponseStarted(error);
        rejectResponse(error);
        return;
      }
      if (receivedBytes <= bytesAtShutdown) {
        rejectResponse(
          new Error(
            "Shipped HTTP response delivered no bytes after shutdown began.",
          ),
        );
        return;
      }
      resolveResponse({
        body: Buffer.concat(chunks).toString("utf8"),
        statusCode: incoming.statusCode,
      });
    });
    incoming.once("error", (error) => {
      rejectResponse(error);
      rejectResponseStarted(error);
    });
  });
  request.once("error", (error) => {
    rejectResponse(error);
    rejectResponseStarted(error);
  });
  request.setTimeout(30_000, () =>
    request.destroy(new Error("Shipped HTTP response drain timed out.")),
  );
  try {
    request.end(SHIPPED_HTTP_TOOLS_LIST_BODY);
    await responseStarted;
    if (shutdown === undefined) {
      throw new Error("Shipped HTTP response did not start shutdown.");
    }
    const [completedResponse, processExit] = await Promise.allSettled([
      response,
      shutdown,
    ]);
    const failures = [completedResponse, processExit].flatMap((result) =>
      result.status === "rejected" ? [result.reason] : [],
    );
    if (failures.length > 0) {
      throw new AggregateError(failures, "Shipped HTTP response drain failed.");
    }
    if (completedResponse.status !== "fulfilled") {
      throw new Error("Shipped HTTP response drain produced no response.");
    }
    return canonicalShippedHttpToolsResponse({
      ...completedResponse.value,
      context: "Shipped HTTP shutdown",
    });
  } finally {
    request.destroy();
  }
}

async function captureShippedHttpToolsResponse(port: number): Promise<string> {
  const response = await new Promise<{
    readonly body: string;
    readonly statusCode: number | undefined;
  }>((resolveResponse, rejectResponse) => {
    const request = requestHttp({
      host: "127.0.0.1",
      port,
      path: "/mcp",
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        connection: "close",
        "content-length": Buffer.byteLength(SHIPPED_HTTP_TOOLS_LIST_BODY),
        "content-type": "application/json",
      },
    });
    request.once("response", (incoming) => {
      const chunks: Buffer[] = [];
      incoming.on("data", (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      incoming.once("end", () => {
        resolveResponse({
          body: Buffer.concat(chunks).toString("utf8"),
          statusCode: incoming.statusCode,
        });
      });
      incoming.once("error", rejectResponse);
    });
    request.once("error", rejectResponse);
    request.setTimeout(30_000, () =>
      request.destroy(new Error("Shipped HTTP tools/list capture timed out.")),
    );
    request.end(SHIPPED_HTTP_TOOLS_LIST_BODY);
  });
  return canonicalShippedHttpToolsResponse({
    ...response,
    context: "Shipped HTTP tools/list capture",
  });
}

export type ShippedHttpMcpEntrypoint = {
  readonly cwd: string;
  readonly entrypoint: string;
  readonly release: string;
};

async function captureShippedHttpMcpEntrypointForSignal(
  input: ShippedHttpMcpEntrypoint,
  signal: "SIGINT" | "SIGTERM",
): Promise<McpClientCapture> {
  const directory = mkdtempSync(
    join(tmpdir(), "dnd-deployment-lifecycle-http-"),
  );
  const port = await reserveHttpPort();
  const endpointOrigin = `http://127.0.0.1:${port}`;
  const configuredPublicOrigin = `https://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["--import", "tsx", input.entrypoint], {
    cwd: input.cwd,
    env: {
      ...process.env,
      DND_MCP_HOST: "127.0.0.1",
      PORT: String(port),
      DND_MCP_ENVIRONMENT: "development",
      DND_MCP_RELEASE: input.release,
      DND_MCP_PUBLISHER_NAME: "deployment lifecycle",
      DND_MCP_PUBLIC_ORIGIN: configuredPublicOrigin,
      DND_MCP_HOSTING_RECIPIENTS: "deployment lifecycle host",
      DND_MCP_STDERR_RETENTION: "process lifetime",
      DND_MCP_INGRESS_ACCESS_LOG_RETENTION: "not enabled for lifecycle probe",
      DND_MCP_BUDGET_MONITORING: "disabled",
      DND_PLAY_SESSION_DATABASE_PATH: join(directory, "sessions.sqlite"),
      DND_SAVED_SESSION_AUTHORIZATION_DATABASE_PATH: join(
        directory,
        "authorization.sqlite",
      ),
      DND_SAVED_SESSION_AUTHORIZATION_SECRET:
        "deployment-lifecycle-secret-at-least-32-characters",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let childStderr = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: string) => {
    childStderr = `${childStderr}${chunk}`.slice(-8_192);
  });
  const client = new Client({
    name: "deployment-lifecycle-http",
    version: "0.1.0",
  });
  let clientCloseAttempted = false;
  const closeClientOnce = async () => {
    if (clientCloseAttempted) return;
    clientCloseAttempted = true;
    await client.close();
  };
  try {
    const endpoint = new URL("/mcp", endpointOrigin);
    await waitForHttpHealth(new URL("/health", endpointOrigin), child, () =>
      childStderr.trim(),
    );
    const transport = new StreamableHTTPClientTransport(endpoint, {
      requestInit: {
        headers: { connection: "close" },
        signal: AbortSignal.timeout(30_000),
      },
    });
    // The SDK transport class supplies the protocol Transport contract at runtime;
    // its declaration is narrower than Client.connect's shared transport type.
    await client.connect(transport as Transport);
    const capture = await captureMcpClient(client);
    await closeClientOnce();
    const ordinaryTools = await captureShippedHttpToolsResponse(port);
    const drainedTools = await verifyShippedHttpResponseDrain(
      port,
      child,
      () => childStderr.trim(),
      signal,
    );
    if (drainedTools !== ordinaryTools) {
      throw new Error(
        `Shipped HTTP ${signal} shutdown changed or truncated the tools/list response.`,
      );
    }
    return capture;
  } finally {
    const cleanupFailures: unknown[] = [];
    const protocolCleanup = await Promise.allSettled([closeClientOnce()]);
    cleanupFailures.push(
      ...protocolCleanup.flatMap((result) =>
        result.status === "rejected" ? [result.reason] : [],
      ),
    );
    try {
      await stopChildProcess(child, () => childStderr.trim(), signal);
    } catch (error) {
      cleanupFailures.push(error);
    }
    try {
      rmSync(directory, { recursive: true, force: true });
    } catch (error) {
      cleanupFailures.push(error);
    }
    if (cleanupFailures.length > 0) {
      throw new AggregateError(
        cleanupFailures,
        "Shipped HTTP MCP entrypoint cleanup failed.",
      );
    }
  }
}

export async function captureShippedHttpMcpEntrypoint(
  input: ShippedHttpMcpEntrypoint,
): Promise<McpClientCapture> {
  const sigintCapture = await captureShippedHttpMcpEntrypointForSignal(
    input,
    "SIGINT",
  );
  const sigtermCapture = await captureShippedHttpMcpEntrypointForSignal(
    input,
    "SIGTERM",
  );
  if (canonicalJson(sigintCapture) !== canonicalJson(sigtermCapture)) {
    throw new Error(
      "Shipped HTTP MCP captures differ between SIGINT and SIGTERM lifecycle probes.",
    );
  }
  return sigintCapture;
}
