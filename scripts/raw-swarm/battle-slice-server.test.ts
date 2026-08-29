import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

import { describe, expect, test } from "vitest";

import { repoRoot } from "./transcript.ts";

const BATTLE_SLICE_SERVER = "scripts/raw-swarm/battle-slice-server.ts" as const;
const LIFECYCLE_TIMEOUT_MS = 30_000;

type ProcessExit = Readonly<{
  code: number | null;
  signal: NodeJS.Signals | null;
}>;

type ProcessOutput = { value: Buffer };

function waitForExit(
  child: ChildProcessWithoutNullStreams,
): Promise<ProcessExit> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

function waitForLineAfter(
  child: ChildProcessWithoutNullStreams,
  output: ProcessOutput,
  startOffset: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      child.stdout.off("data", onData);
      child.off("exit", onExit);
    };
    const resolveIfComplete = () => {
      const newlineAt = output.value.indexOf(0x0a, startOffset);
      if (newlineAt < 0) return;
      cleanup();
      resolve(output.value.subarray(startOffset, newlineAt).toString("utf8"));
    };
    const onData = () => resolveIfComplete();
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      reject(
        new Error(
          `Battle-slice server exited before responding: ${String(code)}/${String(signal)}`,
        ),
      );
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Battle-slice server did not emit a response."));
    }, LIFECYCLE_TIMEOUT_MS);
    child.stdout.on("data", onData);
    child.once("exit", onExit);
    resolveIfComplete();
  });
}

function waitForOutputAfter(
  child: ChildProcessWithoutNullStreams,
  output: ProcessOutput,
  startOffset: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      child.stdout.off("data", onData);
      child.off("exit", onExit);
    };
    const resolveIfStarted = () => {
      if (output.value.byteLength <= startOffset) return;
      cleanup();
      resolve();
    };
    const onData = () => resolveIfStarted();
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      reject(
        new Error(
          `Battle-slice server exited before starting its response: ${String(code)}/${String(signal)}`,
        ),
      );
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Battle-slice server did not start its response."));
    }, LIFECYCLE_TIMEOUT_MS);
    child.stdout.on("data", onData);
    child.once("exit", onExit);
    resolveIfStarted();
  });
}

async function verifySignalLifecycle(signal: "SIGINT" | "SIGTERM") {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", BATTLE_SLICE_SERVER],
    { cwd: repoRoot, stdio: ["pipe", "pipe", "pipe"] },
  );
  const stdout: ProcessOutput = { value: Buffer.alloc(0) };
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => {
    stdout.value = Buffer.concat([stdout.value, chunk]);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });
  const exited = waitForExit(child);
  try {
    const initializeLine = waitForLineAfter(child, stdout, 0);
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "battle-slice-lifecycle-test", version: "1" },
        },
      })}\n`,
    );

    const initializeResponseText = await initializeLine;
    const initializeResponse = JSON.parse(initializeResponseText) as {
      readonly id?: unknown;
      readonly result?: { readonly serverInfo?: { readonly name?: unknown } };
    };
    expect(initializeResponse).toMatchObject({
      id: 1,
      result: { serverInfo: { name: "dnd-surface-runtime" } },
    });

    const toolResponseOffset = stdout.value.byteLength;
    const toolResponseStarted = waitForOutputAfter(
      child,
      stdout,
      toolResponseOffset,
    );
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      })}\n${JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      })}\n`,
    );
    await toolResponseStarted;
    expect(stdout.value.indexOf(0x0a, toolResponseOffset)).toBe(-1);

    const toolResponseLine = waitForLineAfter(
      child,
      stdout,
      toolResponseOffset,
    );
    expect(child.kill(signal)).toBe(true);

    const toolResponseText = await toolResponseLine;
    const toolResponse = JSON.parse(toolResponseText) as {
      readonly id?: unknown;
      readonly result?: { readonly tools?: readonly unknown[] };
    };
    expect(toolResponse).toMatchObject({
      id: 2,
      result: { tools: expect.any(Array) },
    });
    expect(toolResponse.result?.tools?.length).toBeGreaterThan(0);
    const exit = await exited;
    expect(exit).toEqual({ code: 130, signal: null });
    expect(stdout.value).toEqual(
      Buffer.from(`${initializeResponseText}\n${toolResponseText}\n`),
    );
    expect(stderr).toBe("");
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await exited;
    }
  }
}

describe("battle-slice server Effect runtime lifecycle", () => {
  test.each(["SIGINT", "SIGTERM"] as const)(
    "starts, drains its response, and cleans up after %s interruption",
    async (signal) => verifySignalLifecycle(signal),
    LIFECYCLE_TIMEOUT_MS,
  );
});
