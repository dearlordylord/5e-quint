import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

import { describe, expect, test } from "vitest";

import { repoRoot } from "./transcript.ts";

const BATTLE_SLICE_SERVER = "scripts/raw-swarm/battle-slice-server.ts" as const;
const LIFECYCLE_TIMEOUT_MS = 30_000;

type ProcessExit = Readonly<{
  code: number | null;
  signal: NodeJS.Signals | null;
}>;

function waitForExit(
  child: ChildProcessWithoutNullStreams,
): Promise<ProcessExit> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

function waitForLine(
  child: ChildProcessWithoutNullStreams,
  output: { value: string },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Battle-slice server did not emit a response.")),
      LIFECYCLE_TIMEOUT_MS,
    );
    child.stdout.on("data", (chunk: Buffer) => {
      output.value += chunk.toString("utf8");
      const newlineAt = output.value.indexOf("\n");
      if (newlineAt < 0) return;
      clearTimeout(timeout);
      resolve(output.value.slice(0, newlineAt));
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      reject(
        new Error(
          `Battle-slice server exited before responding: ${String(code)}/${String(signal)}`,
        ),
      );
    });
  });
}

async function verifySignalLifecycle(signal: "SIGINT" | "SIGTERM") {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", BATTLE_SLICE_SERVER],
    { cwd: repoRoot, stdio: ["pipe", "pipe", "pipe"] },
  );
  const stdout = { value: "" };
  let stderr = "";
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf8");
  });
  const exited = waitForExit(child);
  try {
    const responseLine = waitForLine(child, stdout);
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

    const response = JSON.parse(await responseLine) as {
      readonly id?: unknown;
      readonly result?: { readonly serverInfo?: { readonly name?: unknown } };
    };
    expect(response).toMatchObject({
      id: 1,
      result: { serverInfo: { name: "dnd-surface-runtime" } },
    });
    expect(child.kill(signal)).toBe(true);

    const exit = await exited;
    expect(exit).toEqual({ code: 130, signal: null });
    expect(stdout.value).toBe(`${JSON.stringify(response)}\n`);
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
