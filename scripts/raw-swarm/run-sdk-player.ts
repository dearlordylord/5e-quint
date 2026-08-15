import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  consumerPermissionProfileAvailable,
  createConsumerCodexHome,
} from "./sdk-player/consumer-codex-profile.ts";
import { buildConsumerDistribution } from "./sdk-player/consumer-distribution.ts";
import { admittedScenarioIdentity } from "./scenario-admission.ts";
import {
  currentGitRevision,
  decodeScenarioId,
  repoRoot,
} from "./transcript.ts";
import { Either } from "effect";
import {
  appendInvocationLedger,
  invocationIdFromCodexEvents,
  modelUsageFromCodexEvents,
  readCodexEvents,
} from "./model-telemetry.ts";

function fail(message: string): never {
  throw new Error(message);
}

function runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
): void {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null) fail(`${command} stopped by ${result.signal}.`);
  if (result.status !== 0) {
    fail(`${command} exited with status ${String(result.status)}.`);
  }
}

function retainRun(player: string, trusted: string, output: string): void {
  mkdirSync(output, { recursive: true });
  const retained = [
    "SCENARIO.md",
    "SCENARIO_REVIEW.json",
    "OBSERVATION.json",
    "agent-final.txt",
    "agent.log",
    "attempt.ts",
  ];
  for (const name of retained) {
    const source = resolve(player, name);
    if (existsSync(source)) copyFileSync(source, resolve(output, name));
  }
  const evidence = resolve(trusted, "evidence");
  if (existsSync(evidence)) {
    cpSync(evidence, resolve(output, "evidence"), { recursive: true });
  }
}

async function main(args: readonly string[]): Promise<void> {
  const [scenarioId, ...options] = args;
  const decodedScenarioId = decodeScenarioId(scenarioId);
  const instructionalFallback = options.includes("--instructional-isolation");
  const evidenceIdFlagIndex = options.indexOf("--evidence-id");
  const evidenceIdInput =
    evidenceIdFlagIndex === -1 ? scenarioId : options[evidenceIdFlagIndex + 1];
  const decodedEvidenceId = decodeScenarioId(evidenceIdInput);
  const evidenceIdOptionIndexes =
    evidenceIdFlagIndex === -1
      ? new Set<number>()
      : new Set([evidenceIdFlagIndex, evidenceIdFlagIndex + 1]);
  const acceptedOptions = options.filter(
    (_option, index) => !evidenceIdOptionIndexes.has(index),
  );
  if (
    Either.isLeft(decodedScenarioId) ||
    Either.isLeft(decodedEvidenceId) ||
    acceptedOptions.some((option) => option !== "--instructional-isolation") ||
    options.filter((option) => option === "--instructional-isolation").length >
      1 ||
    options.filter((option) => option === "--evidence-id").length > 1 ||
    (evidenceIdFlagIndex !== -1 && evidenceIdFlagIndex + 1 >= options.length)
  ) {
    fail(
      "Usage: run-sdk-player.ts <scenario-id> [--evidence-id <evidence-id>] [--instructional-isolation]",
    );
  }
  const acceptedScenarioId = decodedScenarioId.right;
  const acceptedEvidenceId = decodedEvidenceId.right;
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail("SDK player recording requires a clean Git worktree.");
  }
  const output = resolve(
    repoRoot,
    `scripts/raw-swarm/out/${acceptedEvidenceId}-sdk-player`,
  );
  if (existsSync(output)) {
    fail(`Refusing to overwrite SDK player evidence: ${output}`);
  }
  const scenarioPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.md`,
  );
  const setupPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.setup.ts`,
  );
  const charactersPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.characters.ts`,
  );
  const scenarioReviewPath = `${scenarioPath}.scenario-review.json`;
  if (
    !existsSync(scenarioPath) ||
    !existsSync(scenarioReviewPath) ||
    !existsSync(charactersPath)
  ) {
    fail(
      `Scenario requires adjacent .md, .scenario-review.json, and .characters.ts files; ready characters additionally require .setup.ts: ${acceptedScenarioId}`,
    );
  }
  const admission = admittedScenarioIdentity({
    scenarioId: acceptedScenarioId,
    scenarioPath,
    reviewPath: scenarioReviewPath,
  });
  if (Either.isLeft(admission)) fail(admission.left);
  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-sdk-player-"));
  const trusted = mkdtempSync(resolve(tmpdir(), "dnd-sdk-supervisor-"));
  const codexHome = createConsumerCodexHome();
  let supervisorProcess: ReturnType<typeof spawn> | undefined;
  let supervisorLog: number | undefined;
  try {
    buildConsumerDistribution({
      destination: scratch,
      trustedDestination: trusted,
      scenarioPath,
    });
    copyFileSync(scenarioReviewPath, resolve(scratch, "SCENARIO_REVIEW.json"));
    mkdirSync(resolve(trusted, "evidence"));
    copyFileSync(charactersPath, resolve(trusted, "evidence/characters.ts"));
    if (existsSync(setupPath)) {
      copyFileSync(setupPath, resolve(trusted, "evidence/setup.ts"));
    }
    mkdirSync(resolve(scratch, ".requests"));
    mkdirSync(resolve(scratch, ".responses"));
    const profileAvailable = consumerPermissionProfileAvailable(
      codexHome,
      scratch,
    );
    if (!profileAvailable && !instructionalFallback) {
      fail(
        "Codex filesystem isolation is unavailable. Install/configure bubblewrap, or explicitly record the weaker --instructional-isolation fallback.",
      );
    }
    const consumerIsolation = profileAvailable
      ? "permissionProfile"
      : "instructionalFallback";
    runCommand(
      process.execPath,
      [
        "supervisor.mjs",
        "init",
        acceptedScenarioId,
        revision.sha,
        consumerIsolation,
        createHash("sha256")
          .update(readFileSync(resolve(trusted, "supervisor.mjs")))
          .digest("hex"),
        admission.right.scenarioSha256,
        admission.right.scenarioReviewSha256,
      ],
      trusted,
    );
    if (!existsSync(resolve(trusted, "evidence/frozen-prefix.json"))) {
      console.log(
        `Scenario preparation recorded an obstruction; player execution was not started: ${acceptedScenarioId}`,
      );
      return;
    }

    supervisorLog = openSync(resolve(trusted, "supervisor.log"), "w");
    supervisorProcess = spawn(
      process.execPath,
      [
        resolve(trusted, "supervisor.mjs"),
        "serve",
        resolve(scratch, ".requests"),
        resolve(scratch, ".responses"),
      ],
      {
        cwd: trusted,
        env: { ...process.env, RAW_SWARM_PLAYER_ROOT: scratch },
        stdio: ["ignore", supervisorLog, supervisorLog],
      },
    );

    const agentLogPath = resolve(trusted, "agent.log");
    const agentEventsPath = resolve(trusted, "evidence/player-events.jsonl");
    const agentLog = openSync(agentLogPath, "w");
    const agentEvents = openSync(agentEventsPath, "w");
    const permissionArgs = profileAvailable
      ? ([] as const)
      : (["--dangerously-bypass-approvals-and-sandbox"] as const);
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fallbackInvocationId = randomUUID();
    const result = spawnSync(
      "codex",
      [
        "exec",
        "-C",
        scratch,
        ...permissionArgs,
        "--skip-git-repo-check",
        "--ephemeral",
        "--json",
        "--disable",
        "tool_call_mcp_elicitation",
        "-m",
        "gpt-5.6-sol",
        "-c",
        'model_reasoning_effort="medium"',
        "--output-last-message",
        resolve(scratch, "agent-final.txt"),
        [
          "Read PLAYER.md, SCENARIO.md, and PUBLIC_SDK.md.",
          "Act as the player described there and continue until the SDK supervisor accepts a playerConcluded outcome.",
          "Edit only attempt.ts. Run `node player-client.mjs attempt.ts`, inspect OBSERVATION.json, and append the next tactical decision by replacing only the editable attempt body.",
          "Do not inspect any path outside this scratch consumer, repository source, internal tests, or prior implementation knowledge.",
          "Do not edit evidence files. If the SDK blocks the scenario, preserve and report that obstruction instead of fabricating support.",
        ].join(" "),
      ],
      {
        cwd: scratch,
        env: { ...process.env, CODEX_HOME: codexHome },
        stdio: ["ignore", agentEvents, agentLog],
      },
    );
    closeSync(agentLog);
    closeSync(agentEvents);
    const parsedEvents = readCodexEvents(agentEventsPath);
    const events = parsedEvents.tag === "valid" ? parsedEvents.events : [];
    appendInvocationLedger(resolve(trusted, "evidence/invocations.jsonl"), {
      schemaVersion: 1,
      phase: "player",
      invocationId: invocationIdFromCodexEvents(events, fallbackInvocationId),
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      startedAt,
      elapsedMilliseconds: Math.round(performance.now() - started),
      exit:
        result.signal === null
          ? { tag: "exited", status: result.status ?? -1 }
          : { tag: "signaled", signal: result.signal },
      usage:
        parsedEvents.tag === "valid"
          ? modelUsageFromCodexEvents(events)
          : { tag: "unavailable", reason: parsedEvents.message },
    });
    if (result.error !== undefined) throw result.error;
    if (result.signal !== null)
      fail(`Player agent stopped by ${result.signal}.`);
    if (result.status !== 0) {
      fail(`Player agent exited with status ${String(result.status)}.`);
    }
    if (!existsSync(resolve(trusted, "evidence/final.json"))) {
      fail("Player agent exited without a recorded player conclusion.");
    }
  } finally {
    if (supervisorProcess !== undefined) {
      const runningSupervisor = supervisorProcess;
      const stopped = new Promise<void>((resolveStopped) => {
        if (runningSupervisor.exitCode !== null) {
          resolveStopped();
          return;
        }
        runningSupervisor.once("exit", () => resolveStopped());
      });
      runningSupervisor.kill("SIGTERM");
      await stopped;
    }
    if (supervisorLog !== undefined) closeSync(supervisorLog);
    if (existsSync(resolve(trusted, "evidence/sdk-calls.jsonl"))) {
      const agentLogPath = resolve(trusted, "agent.log");
      if (existsSync(agentLogPath)) {
        copyFileSync(agentLogPath, resolve(scratch, "agent.log"));
      }
      retainRun(scratch, trusted, output);
      copyFileSync(
        resolve(trusted, "supervisor.mjs"),
        resolve(output, "replay-supervisor.mjs"),
      );
    }
    rmSync(scratch, { recursive: true });
    rmSync(trusted, { recursive: true });
    rmSync(codexHome, { recursive: true });
  }
  console.log(`SDK player evidence: ${output}`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
