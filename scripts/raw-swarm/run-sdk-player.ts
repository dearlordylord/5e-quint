import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { buildConsumerDistribution } from "./sdk-player/consumer-distribution.ts";
import { TRACER_SCENARIO_ID } from "./sdk-player/fixed-scenario.ts";
import { currentGitRevision, repoRoot } from "./transcript.ts";

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

function permissionProfileHome(): string {
  const home = mkdtempSync(resolve(tmpdir(), "dnd-sdk-player-codex-"));
  writeFileSync(
    resolve(home, "config.toml"),
    [
      'default_permissions = "player"',
      "",
      "[permissions.player.filesystem]",
      '":minimal" = "read"',
      "",
      '[permissions.player.filesystem.":workspace_roots"]',
      '"." = "write"',
      "",
    ].join("\n"),
  );
  const configuredHome =
    process.env.CODEX_HOME ?? resolve(process.env.HOME ?? "", ".codex");
  symlinkSync(resolve(configuredHome, "auth.json"), resolve(home, "auth.json"));
  return home;
}

function permissionProfileAvailable(
  codexHome: string,
  scratch: string,
): boolean {
  const writableProbe = resolve(scratch, ".isolation-write-probe");
  const result = spawnSync(
    "codex",
    [
      "sandbox",
      "-C",
      scratch,
      "-P",
      "player",
      "--",
      "sh",
      "-c",
      'printf isolated > "$1" && ! cat "$2" >/dev/null 2>&1',
      "--",
      writableProbe,
      resolve(repoRoot, "package.json"),
    ],
    {
      cwd: scratch,
      env: { ...process.env, CODEX_HOME: codexHome },
      stdio: "ignore",
    },
  );
  const available =
    result.status === 0 &&
    existsSync(writableProbe) &&
    readFileSync(writableProbe, "utf8") === "isolated";
  rmSync(writableProbe, { force: true });
  return available;
}

function retainRun(player: string, trusted: string, output: string): void {
  mkdirSync(output, { recursive: true });
  const retained = [
    "SCENARIO.md",
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
  const instructionalFallback = options.includes("--instructional-isolation");
  if (
    scenarioId !== TRACER_SCENARIO_ID ||
    options.some((option) => option !== "--instructional-isolation") ||
    options.filter((option) => option === "--instructional-isolation").length >
      1
  ) {
    fail(
      `Usage: run-sdk-player.ts ${TRACER_SCENARIO_ID} [--instructional-isolation]`,
    );
  }
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail("SDK player recording requires a clean Git worktree.");
  }
  const output = resolve(
    repoRoot,
    `scripts/raw-swarm/out/${scenarioId}-sdk-player`,
  );
  if (existsSync(output)) {
    fail(`Refusing to overwrite SDK player evidence: ${output}`);
  }
  const scenarioPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${scenarioId}.md`,
  );
  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-sdk-player-"));
  const trusted = mkdtempSync(resolve(tmpdir(), "dnd-sdk-supervisor-"));
  const codexHome = permissionProfileHome();
  let supervisorProcess: ReturnType<typeof spawn> | undefined;
  let supervisorLog: number | undefined;
  try {
    buildConsumerDistribution({
      destination: scratch,
      trustedDestination: trusted,
      scenarioPath,
    });
    mkdirSync(resolve(scratch, ".requests"));
    mkdirSync(resolve(scratch, ".responses"));
    const profileAvailable = permissionProfileAvailable(codexHome, scratch);
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
        scenarioId,
        revision.sha,
        consumerIsolation,
        createHash("sha256")
          .update(readFileSync(resolve(trusted, "supervisor.mjs")))
          .digest("hex"),
      ],
      trusted,
    );

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
    const agentLog = openSync(agentLogPath, "w");
    const permissionArgs = profileAvailable
      ? ([] as const)
      : (["--dangerously-bypass-approvals-and-sandbox"] as const);
    const result = spawnSync(
      "codex",
      [
        "exec",
        "-C",
        scratch,
        ...permissionArgs,
        "--skip-git-repo-check",
        "--ephemeral",
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
        stdio: ["ignore", agentLog, agentLog],
      },
    );
    closeSync(agentLog);
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
