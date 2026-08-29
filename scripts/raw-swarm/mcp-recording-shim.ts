#!/usr/bin/env node
// MCP stdio recording proxy. Bridges stdin/stdout byte-for-byte to the real
// MCP server while recording each newline-delimited JSON-RPC message.

import { spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Result } from "effect";

import {
  currentGitRevision,
  decodeScenarioId,
  repoRoot,
  type ScenarioId,
} from "./transcript.ts";

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

function parseArgs(args: readonly string[]): {
  readonly transcriptPath: string;
  readonly scenarioId: ScenarioId;
} {
  const transcriptFlag = args.indexOf("--transcript");
  const scenarioFlag = args.indexOf("--scenario");
  const transcriptPath =
    transcriptFlag >= 0 ? args[transcriptFlag + 1] : undefined;
  const scenarioIdInput =
    scenarioFlag >= 0 ? args[scenarioFlag + 1] : undefined;
  if (
    args.length !== 4 ||
    args.filter((argument) => argument === "--transcript").length !== 1 ||
    args.filter((argument) => argument === "--scenario").length !== 1 ||
    transcriptPath === undefined ||
    transcriptPath.startsWith("--") ||
    scenarioIdInput === undefined ||
    scenarioIdInput.startsWith("--")
  ) {
    fail(
      "Usage: pnpm exec tsx mcp-recording-shim.ts --transcript <out.jsonl> --scenario <scenario-id>",
    );
  }
  const decodedScenarioId = decodeScenarioId(scenarioIdInput);
  if (Result.isFailure(decodedScenarioId)) fail(decodedScenarioId.failure);
  return { transcriptPath, scenarioId: decodedScenarioId.success };
}

const { transcriptPath, scenarioId } = parseArgs(process.argv.slice(2));

const revision = currentGitRevision();
if (revision.tag === "dirty") {
  fail(
    "Player recording requires a clean Git worktree so its SHA identifies the tested code.",
  );
}
mkdirSync(dirname(transcriptPath), { recursive: true });
const transcript = createWriteStream(transcriptPath, { flags: "w" });

transcript.write(
  JSON.stringify({
    type: "header",
    scenarioId,
    gitSha: revision.sha,
    startedAt: new Date().toISOString(),
  }) + "\n",
);

const child = spawn(
  "pnpm",
  ["exec", "tsx", "scripts/raw-swarm/battle-slice-server.ts"],
  {
    cwd: repoRoot,
    stdio: ["pipe", "pipe", "inherit"],
  },
);

let seq = 0;
type Direction = "client->server" | "server->client";
const buffers: Record<Direction, string> = {
  "client->server": "",
  "server->client": "",
};

function feed(direction: Direction, chunk: Buffer): void {
  buffers[direction] += chunk.toString("utf8");
  let newlineAt: number;
  while ((newlineAt = buffers[direction].indexOf("\n")) >= 0) {
    const line = buffers[direction].slice(0, newlineAt);
    buffers[direction] = buffers[direction].slice(newlineAt + 1);
    if (line.trim().length === 0) continue;
    seq += 1;
    let entry: unknown;
    try {
      entry = { seq, direction, message: JSON.parse(line) };
    } catch {
      entry = { seq, direction, unparsed: true, raw: line };
    }
    transcript.write(JSON.stringify(entry) + "\n");
  }
}

process.stdin.on("data", (chunk) => {
  child.stdin.write(chunk);
  feed("client->server", chunk);
});

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  feed("server->client", chunk);
});

let shutdownTimer: NodeJS.Timeout | null = null;

function terminateChild(signal: NodeJS.Signals): void {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill(signal);
  }
}

function endChildStdin(): void {
  child.stdin.end();
  // The MCP server runs forever by design; once the client disconnects,
  // allow in-flight responses to flush, then stop the server.
  if (shutdownTimer === null) {
    shutdownTimer = setTimeout(() => terminateChild("SIGTERM"), 15000);
    shutdownTimer.unref();
  }
}

process.stdin.on("end", endChildStdin);
process.stdin.on("error", endChildStdin);

process.on("SIGINT", () => terminateChild("SIGINT"));
process.on("SIGTERM", () => terminateChild("SIGTERM"));

child.on("error", (error: Error) =>
  fail(`Failed to spawn MCP server: ${error.message}`),
);

child.on("exit", (code, signal) => {
  for (const direction of Object.keys(buffers) as Direction[]) {
    const rest = buffers[direction].trim();
    if (rest.length > 0) {
      seq += 1;
      transcript.write(
        JSON.stringify({ seq, direction, unparsed: true, raw: rest }) + "\n",
      );
    }
  }
  transcript.end(() => {
    if (signal !== null) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
});
