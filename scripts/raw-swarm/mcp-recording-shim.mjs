#!/usr/bin/env node
// MCP stdio recording proxy. Bridges stdin/stdout byte-for-byte to the real
// MCP server while recording each newline-delimited JSON-RPC message.

import { execFileSync, spawn } from "node:child_process";
import { createWriteStream, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function fail(message) {
  console.error(message);
  process.exit(2);
}

const flag = process.argv.indexOf("--transcript");
const transcriptPath = flag >= 0 ? process.argv[flag + 1] : undefined;
const scenarioFlag = process.argv.indexOf("--scenario");
const scenarioId =
  scenarioFlag >= 0 ? process.argv[scenarioFlag + 1] : undefined;
if (transcriptPath === undefined || scenarioId === undefined) {
  fail(
    "Usage: node mcp-recording-shim.mjs --transcript <out.jsonl> --scenario <scenario-id>",
  );
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
mkdirSync(dirname(transcriptPath), { recursive: true });
const transcript = createWriteStream(transcriptPath, { flags: "w" });

const gitSha = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();

transcript.write(
  JSON.stringify({
    type: "header",
    scenarioId,
    kind: "freeplay",
    rawCitations: [],
    gitSha,
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
const buffers = { "client->server": "", "server->client": "" };

function feed(direction, chunk) {
  buffers[direction] += chunk.toString("utf8");
  let newlineAt;
  while ((newlineAt = buffers[direction].indexOf("\n")) >= 0) {
    const line = buffers[direction].slice(0, newlineAt);
    buffers[direction] = buffers[direction].slice(newlineAt + 1);
    if (line.trim().length === 0) continue;
    seq += 1;
    let entry;
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

let shutdownTimer = null;

function terminateChild(signal) {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill(signal);
  }
}

function endChildStdin() {
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

child.on("error", (error) => fail(`Failed to spawn MCP server: ${error}`));

child.on("exit", (code, signal) => {
  for (const direction of Object.keys(buffers)) {
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
