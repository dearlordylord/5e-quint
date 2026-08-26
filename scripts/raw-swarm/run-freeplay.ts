import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Either, Schema } from "effect";

import {
  currentGitRevision,
  decodeScenarioId,
  GitShaSchema,
  repoRoot,
} from "./transcript.ts";
import { assertModelEntryPointGuard } from "./model-entrypoint-guard.ts";
import { runCodexInvocation } from "./model-telemetry.ts";

function fail(message: string): never {
  throw new Error(message);
}

async function main(args: readonly string[]): Promise<void> {
  assertModelEntryPointGuard();
  const [scenarioIdInput, ...unexpected] = args;
  if (scenarioIdInput === undefined || unexpected.length > 0) {
    fail("Usage: run-freeplay.ts <scenario-id>");
  }
  const decodedScenarioId = decodeScenarioId(scenarioIdInput);
  if (Either.isLeft(decodedScenarioId)) fail(decodedScenarioId.left);
  const scenarioId = decodedScenarioId.right;
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail(
      "Player recording requires a clean Git worktree so its SHA identifies the tested code.",
    );
  }
  const gitSha = Schema.decodeUnknownEither(GitShaSchema)(revision.sha);
  if (Either.isLeft(gitSha)) fail(gitSha.left.message);
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
  const invocationEventsPath = `${transcriptPath}.events.jsonl`;
  const invocationLedgerPath = `${transcriptPath}.invocations.jsonl`;
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
  const result = await runCodexInvocation({
    args: [
      "exec",
      "-C",
      repoRoot,
      "--json",
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
    cwd: repoRoot,
    env: process.env,
    eventPath: invocationEventsPath,
    logPath: agentLogPath,
    ledgerPath: invocationLedgerPath,
    phase: "player",
    stagePlanReason:
      "The freeplay MCP prototype owns one bounded player invocation.",
    subject: { tag: "scenario", scenarioId },
    gitSha: gitSha.right,
    fallbackInvocationId: `${scenarioId}-freeplay-player`,
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
    operation: { tag: "noOutput" },
  });
  if (result.tag === "failed") {
    fail(`Player agent invocation failed: ${result.cause.reason}`);
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
