import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { Either } from "effect";

import { decodeScenarioId, repoRoot } from "./transcript.ts";
import { assertModelEntryPointGuard } from "./model-entrypoint-guard.ts";

function fail(message: string): never {
  throw new Error(message);
}

function main(args: readonly string[]): void {
  assertModelEntryPointGuard();
  const [scenarioIdInput, ...unexpected] = args;
  if (scenarioIdInput === undefined || unexpected.length > 0) {
    fail("Usage: run-freeplay.ts <scenario-id>");
  }
  const decodedScenarioId = decodeScenarioId(scenarioIdInput);
  if (Either.isLeft(decodedScenarioId)) fail(decodedScenarioId.left);
  const scenarioId = decodedScenarioId.right;
  const swarmDirectory = resolve(repoRoot, "scripts/raw-swarm");
  const promptPath = resolve(
    swarmDirectory,
    "freeplay",
    `${scenarioId}.prompt.txt`,
  );
  if (!existsSync(promptPath)) fail(`Missing player prompt: ${promptPath}`);

  const transcriptPath = resolve(
    repoRoot,
    `scripts/raw-swarm/out/${scenarioId}-transcript.jsonl`,
  );
  const agentLogPath = resolve(
    repoRoot,
    `scripts/raw-swarm/out/${scenarioId}-agent.log`,
  );
  mkdirSync(dirname(transcriptPath), { recursive: true });
  mkdirSync(dirname(agentLogPath), { recursive: true });

  const recorderArgs = [
    "exec",
    "tsx",
    resolve(swarmDirectory, "mcp-recording-shim.ts"),
    "--transcript",
    transcriptPath,
    "--scenario",
    scenarioId,
  ];
  const agentLog = openSync(agentLogPath, "w");
  const result = spawnSync(
    "codex",
    [
      "exec",
      "-C",
      repoRoot,
      "--sandbox",
      "read-only",
      "--disable",
      "tool_call_mcp_elicitation",
      "-m",
      "gpt-5.6-sol",
      "-c",
      'model_reasoning_effort="medium"',
      "-c",
      'mcp_servers.dnd.command="pnpm"',
      "-c",
      `mcp_servers.dnd.args=${JSON.stringify(recorderArgs)}`,
      "-c",
      'mcp_servers.dnd.default_tools_approval_mode="approve"',
      readFileSync(promptPath, "utf8"),
    ],
    { cwd: repoRoot, stdio: ["ignore", agentLog, agentLog] },
  );
  closeSync(agentLog);
  if (result.error !== undefined) fail(result.error.message);
  if (result.signal !== null) fail(`Player agent stopped by ${result.signal}`);
  if (result.status !== 0) fail(`Player agent exited ${String(result.status)}`);
}

main(process.argv.slice(2));
