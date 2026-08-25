import { execFileSync, spawn, spawnSync } from "node:child_process";
import {
  closeSync,
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, test } from "vitest";
import { Either, Schema } from "effect";

import { ExecutionStartRecordSchema } from "./evidence-manifests.ts";
import { repoRoot } from "./transcript.ts";
import { PLAYER_CONTINUATION_PROTOCOL_REMINDER } from "./sdk-player/continuation-contract.ts";
import { SdkPlayerTranscriptHeaderSchema } from "./sdk-player/sdk-transcript.ts";
import { compileTrustedCSource } from "./deterministic-toolchain.cjs";
import { installDeterministicCleanup } from "./deterministic-cleanup.cjs";
import {
  CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS,
  CONSUMER_DISTRIBUTION_RUNTIME_ENTRYPOINTS,
  SUPPORTED_VITEST_SOURCE_FILE_EXTENSIONS,
  SUPPORTED_VITEST_TEST_FILE_SUFFIXES,
} from "./lane-classification.cjs";

const recorder = resolve(repoRoot, "scripts/raw-swarm/mcp-recording-shim.ts");
const launcher = resolve(repoRoot, "scripts/raw-swarm/run-freeplay.ts");
const reviewer = resolve(repoRoot, "scripts/raw-swarm/run-raw-review.sh");
const sdkPlayerLauncher = resolve(
  repoRoot,
  "scripts/raw-swarm/run-sdk-player.ts",
);
const modelLaneLock = resolve(
  repoRoot,
  "scripts/raw-swarm/with-model-lane-lock.sh",
);
const modelLaneCapability = resolve(
  repoRoot,
  "scripts/raw-swarm/model-lane-capability.cjs",
);
const processSupervision = resolve(
  repoRoot,
  "scripts",
  "process-supervision.sh",
);
const modelBackedRunner = resolve(
  repoRoot,
  "scripts/raw-swarm/run-model-backed.mjs",
);
const laneHygieneChecker = resolve(
  repoRoot,
  "scripts/raw-swarm/check-lane-hygiene.cjs",
);
const testRequire = createRequire(import.meta.url);
const deterministicCapabilityGuard = resolve(
  repoRoot,
  "scripts/raw-swarm/deterministic-capability-guard.cjs",
);
const deterministicRunnerModule = resolve(
  repoRoot,
  "scripts/raw-swarm/deterministic-runner.cjs",
);
const deterministicCleanupModule = resolve(
  repoRoot,
  "scripts/raw-swarm/deterministic-cleanup.cjs",
);
const processSupervisorSource = resolve(
  repoRoot,
  "scripts/raw-swarm/process-supervisor.c",
);
const processSupervisorBuild = mkdtempSync(
  resolve(tmpdir(), "dnd-process-supervisor-test-"),
);
const cleanupProcessSupervisorBuild = installDeterministicCleanup({
  cleanup: () =>
    rmSync(processSupervisorBuild, {
      recursive: true,
      force: true,
    }),
  onSignal: ({ cleanup, exitStatus }) => {
    cleanup();
    process.exit(exitStatus);
  },
});
const processSupervisor = resolve(processSupervisorBuild, "process-supervisor");
const processSupervisorCompilation = compileTrustedCSource(
  processSupervisorSource,
  processSupervisor,
);
if (!processSupervisorCompilation.ok) {
  cleanupProcessSupervisorBuild();
  throw new Error(
    `The Linux native process supervisor could not be compiled: ${processSupervisorCompilation.message}`,
  );
}
const rawSwarmOutputDirectory = resolve(repoRoot, "scripts/raw-swarm/out");
mkdirSync(rawSwarmOutputDirectory, { recursive: true });
const currentGitSha = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();
const modelLaneLockDirectory = mkdtempSync(
  resolve(tmpdir(), "dnd-runner-model-lane-"),
);
const modelLaneLockPath = resolve(
  modelLaneLockDirectory,
  "raw-swarm-model-lane-1.lock",
);
const modelLaneGit = resolve(modelLaneLockDirectory, "git");
const realGit = execFileSync("which", ["git"], { encoding: "utf8" }).trim();
writeFileSync(
  modelLaneGit,
  `#!/bin/sh
set -eu
case "$*" in
  *--git-common-dir*) printf '%s\\n' '${modelLaneLockDirectory}' ;;
  *) exec '${realGit}' "$@" ;;
esac
`,
);
chmodSync(modelLaneGit, 0o755);
const modelLaneLockFd = openSync(modelLaneLockPath, "a+");
const modelLaneLockAcquisition = spawnSync(
  "flock",
  ["--exclusive", "--nonblock", "3"],
  { stdio: ["ignore", "ignore", "ignore", modelLaneLockFd] },
);
if (modelLaneLockAcquisition.status !== 0) {
  throw new Error("The runner-boundary test could not acquire its model lane.");
}
const modelLaneLockProbeFd = openSync(modelLaneLockPath, "a+");
const modelLaneLockProbe = spawnSync(
  "flock",
  ["--exclusive", "--nonblock", "3"],
  { stdio: ["ignore", "ignore", "ignore", modelLaneLockProbeFd] },
);
closeSync(modelLaneLockProbeFd);
if (modelLaneLockProbe.status !== 1) {
  throw new Error("The runner-boundary test did not retain its model lane.");
}
afterAll(() => {
  closeSync(modelLaneLockFd);
  rmSync(modelLaneLockDirectory, { recursive: true, force: true });
  cleanupProcessSupervisorBuild();
});
const modelEntryPointTestEnvironment: NodeJS.ProcessEnv = {
  ...process.env,
  RAW_SWARM_EXECUTION_LANE: "model",
  PATH: `${modelLaneLockDirectory}:${process.env.PATH ?? ""}`,
  RAW_SWARM_EXPECTED_GIT_SHA: currentGitSha,
  DND_RAW_SWARM_MODEL_ENTRYPOINT_GUARD: `v1:${currentGitSha}`,
  DND_RAW_SWARM_MODEL_LANE: "1",
  DND_RAW_SWARM_MODEL_LANE_GUARD: "v1",
  DND_RAW_SWARM_MODEL_LANE_LOCK_PATH: modelLaneLockPath,
  DND_RAW_SWARM_MODEL_LANE_FD: String(modelLaneLockFd),
  DND_RAW_SWARM_MODEL_LANE_OWNER_PID: String(process.pid),
  DND_RAW_SWARM_MODEL_LANE_OWNER_START_TIME: processStartTime(process.pid),
};

function guardedModelEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return {
    ...env,
    PATH:
      env.PATH === process.env.PATH
        ? `${modelLaneLockDirectory}:${env.PATH ?? ""}`
        : env.PATH,
    RAW_SWARM_EXPECTED_GIT_SHA: currentGitSha,
    DND_RAW_SWARM_MODEL_ENTRYPOINT_GUARD: `v1:${currentGitSha}`,
    DND_RAW_SWARM_MODEL_LANE: "1",
    DND_RAW_SWARM_MODEL_LANE_GUARD: "v1",
    DND_RAW_SWARM_MODEL_LANE_LOCK_PATH: modelLaneLockPath,
    DND_RAW_SWARM_MODEL_LANE_FD: String(modelLaneLockFd),
    DND_RAW_SWARM_MODEL_LANE_OWNER_PID: String(process.pid),
    DND_RAW_SWARM_MODEL_LANE_OWNER_START_TIME: processStartTime(process.pid),
  };
}

function inheritedModelLaneStdio(): Array<"ignore" | "pipe" | number> {
  const stdio: Array<"ignore" | "pipe" | number> = Array.from(
    { length: modelLaneLockFd + 1 },
    () => "ignore",
  );
  stdio[1] = "pipe";
  stdio[2] = "pipe";
  stdio[modelLaneLockFd] = modelLaneLockFd;
  return stdio;
}

function reviewTranscriptPath(testRoot: string): string {
  const evidenceDirectory = resolve(testRoot, "evidence");
  mkdirSync(evidenceDirectory);
  writeFileSync(
    resolve(testRoot, "execution.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      executionId: "synthetic-review-execution",
      evidenceSetId: "synthetic-review-evidence",
      scenarioId: "synthetic-review",
    })}\n`,
  );
  return resolve(evidenceDirectory, "transcript.jsonl");
}

function run(
  script: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): void {
  const result = spawnSync("pnpm", ["exec", "tsx", script, ...args], {
    cwd: repoRoot,
    env: guardedModelEnvironment(env),
    encoding: "utf8",
    stdio: inheritedModelLaneStdio(),
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${result.stdout ?? ""}${result.stderr ?? ""}`);
  }
}

function runAsync(
  script: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn("pnpm", ["exec", "tsx", script, ...args], {
      cwd: repoRoot,
      env: guardedModelEnvironment(env),
      stdio: inheritedModelLaneStdio(),
    });
    const stderr: Buffer[] = [];
    child.stdout?.resume();
    child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.once("error", rejectRun);
    child.once("close", (status, signal) => {
      if (status === 0) resolveRun();
      else {
        rejectRun(
          new Error(
            `${Buffer.concat(stderr).toString("utf8")}Process stopped with ${signal ?? String(status)}.`,
          ),
        );
      }
    });
  });
}

function processStartTime(pid: number): string {
  const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
  const fields = stat
    .slice(stat.lastIndexOf(")") + 2)
    .trim()
    .split(/\s+/);
  const startTime = fields[19];
  if (startTime === undefined) throw new Error("Missing process start time.");
  return startTime;
}

function processIsLive(pid: number): boolean {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const state = stat
      .slice(stat.lastIndexOf(")") + 2)
      .trim()
      .split(/\s+/)[0];
    return state !== undefined && state !== "Z" && state !== "X";
  } catch {
    return false;
  }
}

async function waitForFile(path: string, timeoutMilliseconds = 2_000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (!existsSync(path) && Date.now() < deadline) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }
  if (!existsSync(path)) {
    throw new Error(`Timed out waiting for ${path}.`);
  }
}

async function waitForProcessExit(
  pid: number,
  timeoutMilliseconds = 3_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMilliseconds;
  while (processIsLive(pid) && Date.now() < deadline) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }
  if (processIsLive(pid)) {
    throw new Error(`Timed out waiting for process ${pid} to exit.`);
  }
}

function runCapabilityGuardFixture(source: string) {
  const fixtureRoot = mkdtempSync(
    resolve(tmpdir(), "dnd-deterministic-capability-"),
  );
  const sourcePath = resolve(fixtureRoot, "fixture.cjs");
  writeFileSync(sourcePath, source);
  try {
    return spawnSync(
      process.execPath,
      ["--require", deterministicCapabilityGuard, sourcePath],
      {
        env: {
          ...process.env,
          RAW_SWARM_EXECUTION_LANE: "deterministic",
        },
        encoding: "utf8",
      },
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function runKernelBoundaryFixture(source: string) {
  const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-process-supervisor-"));
  const sourcePath = resolve(fixtureRoot, "fixture.cjs");
  writeFileSync(sourcePath, source);
  try {
    return spawnSync(
      "env",
      [
        "-i",
        processSupervisor,
        "--owner-pid",
        String(process.pid),
        process.execPath,
        sourcePath,
      ],
      { encoding: "utf8", stdio: "ignore" },
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function compileKernelBoundaryProbe(name: string, source: string): string {
  const sourcePath = resolve(processSupervisorBuild, `${name}.c`);
  const binaryPath = resolve(processSupervisorBuild, name);
  writeFileSync(sourcePath, source);
  const compilation = compileTrustedCSource(sourcePath, binaryPath);
  if (!compilation.ok) {
    throw new Error(
      `The kernel boundary probe could not be compiled: ${compilation.message}`,
    );
  }
  return binaryPath;
}

function compileProcessSupervisorTestHook(name: string): string {
  const sourcePath = resolve(processSupervisorBuild, `${name}.c`);
  const binaryPath = resolve(processSupervisorBuild, name);
  writeFileSync(
    sourcePath,
    `#define DND_SUPERVISOR_TEST_HOOKS\n${readFileSync(processSupervisorSource, "utf8")}`,
  );
  const compilation = compileTrustedCSource(sourcePath, binaryPath);
  if (!compilation.ok) {
    throw new Error(
      `The process-supervisor failure-injection fixture could not be compiled: ${compilation.message}`,
    );
  }
  return binaryPath;
}

function runKernelBoundaryProbe(binaryPath: string) {
  return spawnSync(
    "env",
    ["-i", processSupervisor, "--owner-pid", String(process.pid), binaryPath],
    {
      encoding: "utf8",
      stdio: "ignore",
    },
  );
}

function modelLaneTestEnvironment(
  commandRoot: string,
  deadline: string,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${commandRoot}:${process.env.PATH ?? ""}`,
    DND_RESOURCE_LOCK_OWNER_PID: String(process.pid),
    DND_RESOURCE_LOCK_OWNER_START_TIME: processStartTime(process.pid),
    RAW_SWARM_OPERATION_ID: "synthetic-campaign",
    RAW_SWARM_OPERATION_DEADLINE_UTC: deadline,
  };
  delete environment.DND_RESOURCE_LOCK_KIND;
  delete environment.DND_RAW_SWARM_MODEL_LANE;
  delete environment.DND_RAW_SWARM_MODEL_LANE_GUARD;
  delete environment.DND_RAW_SWARM_MODEL_ENTRYPOINT_GUARD;
  delete environment.DND_RAW_SWARM_MODEL_LANE_LOCK_PATH;
  delete environment.DND_RAW_SWARM_MODEL_LANE_FD;
  delete environment.DND_RAW_SWARM_MODEL_LANE_OWNER_PID;
  delete environment.DND_RAW_SWARM_MODEL_LANE_OWNER_START_TIME;
  return environment;
}

describe("RAW swarm runner boundaries", () => {
  test.each([
    ["SIGHUP", 129],
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ] as const)(
    "deterministic cleanup runs before a handled %s signal",
    (signal, expectedStatus) => {
      const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-signal-cleanup-"));
      const marker = resolve(fixtureRoot, "cleaned");
      const cleanup = resolve(
        repoRoot,
        "scripts/raw-swarm/deterministic-cleanup.cjs",
      );
      const checked = spawnSync(
        process.execPath,
        [
          "-e",
          `const { writeFileSync } = require("node:fs"); const { installDeterministicCleanup } = require(${JSON.stringify(cleanup)}); installDeterministicCleanup({ cleanup: () => writeFileSync(${JSON.stringify(marker)}, "cleaned"), onSignal: ({ cleanup, exitStatus }) => { cleanup(); process.exit(exitStatus); } }); process.kill(process.pid, ${JSON.stringify(signal)}); setTimeout(() => {}, 1000);`,
        ],
        { stdio: "ignore" },
      );
      try {
        expect(checked.status).toBe(expectedStatus);
        expect(existsSync(marker)).toBe(true);
      } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    },
  );

  test.each([
    ["SIGHUP", 129],
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ] as const)(
    "deterministic runner settles a blocking child group before cleanup on %s",
    async (signal, expectedStatus) => {
      const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-runner-signal-"));
      const buildDirectory = resolve(fixtureRoot, "build");
      const childPidPath = resolve(fixtureRoot, "child.pid");
      const detachedPidPath = resolve(fixtureRoot, "detached.pid");
      const helperStderrPath = resolve(fixtureRoot, "helper.stderr");
      const helperPath = resolve(fixtureRoot, "runner-helper.cjs");
      mkdirSync(buildDirectory);
      writeFileSync(
        helperPath,
        `const { rmSync, writeFileSync } = require("node:fs"); const { spawn } = require("node:child_process"); const { createDeterministicRunner } = require(${JSON.stringify(deterministicRunnerModule)}); const { installDeterministicCleanup } = require(${JSON.stringify(deterministicCleanupModule)}); const runner = createDeterministicRunner({ boundary: ${JSON.stringify(processSupervisor)}, environment: { ...process.env, NODE_OPTIONS: "", RAW_SWARM_EXECUTION_LANE: "deterministic" } }); installDeterministicCleanup({ cleanup: () => rmSync(${JSON.stringify(buildDirectory)}, { recursive: true, force: true }), onSignal: async ({ cleanup, exitStatus, signal }) => { try { await runner.terminateActive(signal); } catch {} finally { cleanup(); } process.exit(exitStatus); } }); void runner.run(process.execPath, ["-e", ${JSON.stringify(`const { writeFileSync } = require("node:fs"); const { spawn } = require("node:child_process"); process.stdout.write("blocking-output"); process.stderr.write("blocking-error"); writeFileSync(${JSON.stringify(childPidPath)}, String(process.pid)); const detached = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { detached: true, stdio: "ignore" }); writeFileSync(${JSON.stringify(detachedPidPath)}, String(detached.pid)); detached.on("error", () => {}); process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);`)}]).then((result) => { process.exitCode = result.status ?? 1; }).catch(() => { process.exitCode = 1; });`,
      );
      const helperStderrFd = openSync(helperStderrPath, "w");
      const helper = spawn(process.execPath, [helperPath], {
        env: { ...process.env, NODE_OPTIONS: "" },
        stdio: ["ignore", "ignore", helperStderrFd],
      });
      closeSync(helperStderrFd);
      let childPid: number | undefined;
      try {
        try {
          await waitForFile(childPidPath);
        } catch (error) {
          throw new Error(
            `${error instanceof Error ? error.message : String(error)} ${readFileSync(helperStderrPath, "utf8")}`,
          );
        }
        childPid = Number(readFileSync(childPidPath, "utf8").trim());
        expect(Number.isSafeInteger(childPid)).toBe(true);
        expect(processIsLive(childPid)).toBe(true);
        await waitForFile(detachedPidPath);
        const detachedPid = Number(
          readFileSync(detachedPidPath, "utf8").trim(),
        );
        expect(Number.isSafeInteger(detachedPid)).toBe(true);
        expect(processIsLive(detachedPid)).toBe(true);
        const terminationStarted = Date.now();
        const result = await new Promise<number>(
          (resolveResult, rejectResult) => {
            helper.once("error", rejectResult);
            helper.once("close", (status, signal) => {
              if (signal !== null) {
                rejectResult(
                  new Error(`Runner helper stopped with ${signal}.`),
                );
              } else {
                resolveResult(status ?? 1);
              }
            });
            helper.kill(signal);
          },
        );
        expect(result).toBe(expectedStatus);
        expect(Date.now() - terminationStarted).toBeLessThan(5_000);
        await waitForProcessExit(childPid);
        expect(processIsLive(detachedPid)).toBe(false);
        expect(existsSync(buildDirectory)).toBe(false);
      } finally {
        if (helper.exitCode === null) helper.kill("SIGKILL");
        if (childPid !== undefined && processIsLive(childPid)) {
          process.kill(childPid, "SIGKILL");
        }
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    },
    10_000,
  );

  test("deterministic runner inherits both streams and reaches the next phase", async () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-runner-output-"));
    const buildDirectory = resolve(fixtureRoot, "build");
    const stdoutPath = resolve(fixtureRoot, "helper.stdout");
    const stderrPath = resolve(fixtureRoot, "helper.stderr");
    const helperPath = resolve(fixtureRoot, "runner-output-helper.cjs");
    mkdirSync(buildDirectory);
    writeFileSync(
      helperPath,
      `const { rmSync } = require("node:fs"); const { createDeterministicRunner } = require(${JSON.stringify(deterministicRunnerModule)}); const runner = createDeterministicRunner({ boundary: ${JSON.stringify(processSupervisor)}, environment: { ...process.env, NODE_OPTIONS: "", RAW_SWARM_EXECUTION_LANE: "deterministic" } }); void (async () => { const first = await runner.run(process.execPath, ["-e", "process.stdout.write('first-out'); process.stderr.write('first-err')"]); if (first.status !== 0 || first.signal !== null) process.exit(1); const second = await runner.run(process.execPath, ["-e", "process.stdout.write('second-out'); process.stderr.write('second-err')"]); if (second.status !== 0 || second.signal !== null) process.exit(2); })().catch((error) => { process.stderr.write(String(error)); process.exit(3); }).finally(() => rmSync(${JSON.stringify(buildDirectory)}, { recursive: true, force: true }));`,
    );
    const stdoutFd = openSync(stdoutPath, "w");
    const stderrFd = openSync(stderrPath, "w");
    const checked = spawn(process.execPath, [helperPath], {
      env: { ...process.env, NODE_OPTIONS: "" },
      stdio: ["ignore", stdoutFd, stderrFd],
    });
    closeSync(stdoutFd);
    closeSync(stderrFd);
    const result = await new Promise<number>((resolveResult, rejectResult) => {
      checked.once("error", rejectResult);
      checked.once("close", (status, signal) => {
        if (signal !== null) {
          rejectResult(new Error(`Output helper stopped with ${signal}.`));
        } else {
          resolveResult(status ?? 1);
        }
      });
    });
    try {
      expect(result).toBe(0);
      expect(readFileSync(stdoutPath, "utf8")).toContain("first-outsecond-out");
      expect(readFileSync(stderrPath, "utf8")).toContain("first-errsecond-err");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 10_000);

  test("deterministic runner rejects a normal phase with a surviving descendant", async () => {
    const fixtureRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-runner-descendant-"),
    );
    const buildDirectory = resolve(fixtureRoot, "build");
    const descendantPidPath = resolve(fixtureRoot, "descendant.pid");
    const findingPath = resolve(fixtureRoot, "finding");
    const helperStderrPath = resolve(fixtureRoot, "helper.stderr");
    const helperPath = resolve(fixtureRoot, "descendant-helper.cjs");
    mkdirSync(buildDirectory);
    writeFileSync(
      helperPath,
      `const { rmSync, writeFileSync } = require("node:fs"); const { createDeterministicRunner } = require(${JSON.stringify(deterministicRunnerModule)}); const runner = createDeterministicRunner({ boundary: ${JSON.stringify(processSupervisor)}, environment: { ...process.env, NODE_OPTIONS: "", RAW_SWARM_EXECUTION_LANE: "deterministic" } }); void runner.run(process.execPath, ["-e", ${JSON.stringify(`const { spawn } = require("node:child_process"); const { writeFileSync } = require("node:fs"); const descendant = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" }); descendant.unref(); writeFileSync(${JSON.stringify(descendantPidPath)}, String(descendant.pid));`)}]).then((result) => { writeFileSync(${JSON.stringify(findingPath)}, JSON.stringify(result)); process.exitCode = result.status === 70 && result.signal === null ? 0 : 1; }).catch((error) => { writeFileSync(${JSON.stringify(findingPath)}, String(error)); process.exitCode = 2; }).finally(() => rmSync(${JSON.stringify(buildDirectory)}, { recursive: true, force: true }));`,
    );
    const helperStderrFd = openSync(helperStderrPath, "w");
    const checked = spawn(process.execPath, [helperPath], {
      env: { ...process.env, NODE_OPTIONS: "" },
      stdio: ["ignore", "ignore", helperStderrFd],
    });
    closeSync(helperStderrFd);
    try {
      const result = await new Promise<number>(
        (resolveResult, rejectResult) => {
          checked.once("error", rejectResult);
          checked.once("close", (status, signal) => {
            if (signal !== null) {
              rejectResult(
                new Error(`Descendant helper stopped with ${signal}.`),
              );
            } else {
              resolveResult(status ?? 1);
            }
          });
        },
      );
      expect(result).toBe(0);
      expect(JSON.parse(readFileSync(findingPath, "utf8"))).toMatchObject({
        status: 70,
        signal: null,
      });
      expect(readFileSync(helperStderrPath, "utf8")).toContain(
        "terminated descendant processes",
      );
      const descendantPid = Number(
        readFileSync(descendantPidPath, "utf8").trim(),
      );
      expect(Number.isSafeInteger(descendantPid)).toBe(true);
      expect(processIsLive(descendantPid)).toBe(false);
      expect(existsSync(buildDirectory)).toBe(false);
    } finally {
      if (checked.exitCode === null) checked.kill("SIGKILL");
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 10_000);

  test("deterministic runner joins leader-exit descendant cleanup on signal", async () => {
    const fixtureRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-runner-leader-race-"),
    );
    const buildDirectory = resolve(fixtureRoot, "build");
    const leaderExitPath = resolve(fixtureRoot, "leader-exited");
    const descendantPidPath = resolve(fixtureRoot, "descendant.pid");
    const helperPath = resolve(fixtureRoot, "leader-race-helper.cjs");
    mkdirSync(buildDirectory);
    writeFileSync(
      helperPath,
      `const { rmSync, writeFileSync } = require("node:fs"); const { spawn } = require("node:child_process"); const { createDeterministicRunner } = require(${JSON.stringify(deterministicRunnerModule)}); const { installDeterministicCleanup } = require(${JSON.stringify(deterministicCleanupModule)}); const runner = createDeterministicRunner({ boundary: ${JSON.stringify(processSupervisor)}, environment: { ...process.env, NODE_OPTIONS: "", RAW_SWARM_EXECUTION_LANE: "deterministic" } }); installDeterministicCleanup({ cleanup: () => rmSync(${JSON.stringify(buildDirectory)}, { recursive: true, force: true }), onSignal: async ({ cleanup, exitStatus, signal }) => { try { await runner.terminateActive(signal); } catch {} finally { cleanup(); } process.exit(exitStatus); } }); void runner.run(process.execPath, ["-e", ${JSON.stringify(`const { spawn } = require("node:child_process"); const { writeFileSync } = require("node:fs"); const descendant = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" }); descendant.unref(); writeFileSync(${JSON.stringify(descendantPidPath)}, String(descendant.pid)); writeFileSync(${JSON.stringify(leaderExitPath)}, "exited");`)}]).then((result) => { process.exitCode = result.status ?? 1; }).catch(() => { process.exitCode = 1; });`,
    );
    const helper = spawn(process.execPath, [helperPath], {
      env: { ...process.env, NODE_OPTIONS: "" },
      stdio: "ignore",
    });
    try {
      await waitForFile(leaderExitPath);
      await waitForFile(descendantPidPath);
      const descendantPid = Number(
        readFileSync(descendantPidPath, "utf8").trim(),
      );
      expect(Number.isSafeInteger(descendantPid)).toBe(true);
      expect(processIsLive(descendantPid)).toBe(true);
      const result = await new Promise<number>(
        (resolveResult, rejectResult) => {
          helper.once("error", rejectResult);
          helper.once("close", (status, signal) => {
            if (signal !== null) {
              rejectResult(
                new Error(`Leader-race helper stopped with ${signal}.`),
              );
            } else {
              resolveResult(status ?? 1);
            }
          });
          helper.kill("SIGTERM");
        },
      );
      expect(result).toBe(143);
      await waitForProcessExit(descendantPid);
      expect(processIsLive(descendantPid)).toBe(false);
      expect(existsSync(buildDirectory)).toBe(false);
    } finally {
      if (helper.exitCode === null) helper.kill("SIGKILL");
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 10_000);

  test("deterministic runner settles rapid descendant churn without live PIDs", async () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-runner-churn-"));
    const buildDirectory = resolve(fixtureRoot, "build");
    const descendantPidsPath = resolve(fixtureRoot, "descendants.json");
    const helperPath = resolve(fixtureRoot, "churn-helper.cjs");
    mkdirSync(buildDirectory);
    writeFileSync(
      helperPath,
      `const { rmSync, writeFileSync } = require("node:fs"); const { createDeterministicRunner } = require(${JSON.stringify(deterministicRunnerModule)}); const runner = createDeterministicRunner({ boundary: ${JSON.stringify(processSupervisor)}, environment: { ...process.env, NODE_OPTIONS: "", RAW_SWARM_EXECUTION_LANE: "deterministic" } }); void runner.run(process.execPath, ["-e", ${JSON.stringify(`const { spawn } = require("node:child_process"); const { writeFileSync } = require("node:fs"); const pids = []; for (let index = 0; index < 64; index += 1) { const descendant = spawn(process.execPath, ["-e", "setTimeout(() => {}, 5)"], { stdio: "ignore" }); descendant.unref(); pids.push(descendant.pid); } writeFileSync(${JSON.stringify(descendantPidsPath)}, JSON.stringify(pids)); setTimeout(() => {}, 100);`)}]).then((result) => { process.exitCode = result.status === 0 && result.signal === null ? 0 : 1; }).catch(() => { process.exitCode = 1; }).finally(() => rmSync(${JSON.stringify(buildDirectory)}, { recursive: true, force: true }));`,
    );
    const helper = spawn(process.execPath, [helperPath], {
      env: { ...process.env, NODE_OPTIONS: "" },
      stdio: "ignore",
    });
    try {
      const result = await new Promise<number>(
        (resolveResult, rejectResult) => {
          helper.once("error", rejectResult);
          helper.once("close", (status, signal) => {
            if (signal !== null) {
              rejectResult(new Error(`Churn helper stopped with ${signal}.`));
            } else {
              resolveResult(status ?? 1);
            }
          });
        },
      );
      expect(result).toBe(0);
      const descendantPids = JSON.parse(
        readFileSync(descendantPidsPath, "utf8"),
      ) as number[];
      expect(descendantPids).toHaveLength(64);
      expect(descendantPids.every((pid) => !processIsLive(pid))).toBe(true);
      expect(existsSync(buildDirectory)).toBe(false);
    } finally {
      if (helper.exitCode === null) helper.kill("SIGKILL");
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 15_000);

  test("trusted boundary compilation ignores hostile PATH and CC", () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-hostile-cc-"));
    const fakeCompiler = resolve(fixtureRoot, "cc");
    const marker = resolve(fixtureRoot, "used");
    const sourcePath = resolve(fixtureRoot, "probe.c");
    const binaryPath = resolve(fixtureRoot, "probe");
    writeFileSync(
      fakeCompiler,
      `#!/bin/sh\nprintf '%s' used > ${JSON.stringify(marker)}\nexit 99\n`,
    );
    chmodSync(fakeCompiler, 0o755);
    writeFileSync(sourcePath, "int main(void) { return 0; }\n");
    const toolchain = resolve(
      repoRoot,
      "scripts/raw-swarm/deterministic-toolchain.cjs",
    );
    const checked = spawnSync(
      process.execPath,
      [
        "-e",
        `const { compileTrustedCSource } = require(${JSON.stringify(toolchain)}); const result = compileTrustedCSource(${JSON.stringify(sourcePath)}, ${JSON.stringify(binaryPath)}); process.exit(result.ok ? 0 : 1);`,
      ],
      {
        env: {
          ...process.env,
          PATH: fixtureRoot,
          CC: fakeCompiler,
        },
        encoding: "utf8",
      },
    );
    try {
      expect(checked.status).toBe(0);
      expect(existsSync(marker)).toBe(false);
      expect(existsSync(binaryPath)).toBe(true);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test("rejects network and alternate coding-agent capabilities in deterministic source", () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-lane-capability-"));
    const sourcePath = resolve(fixtureRoot, "forbidden.ts");
    const networkModule = ["node", "http"].join(":");
    const http2Module = ["node", "http2"].join(":");
    const dgramModule = ["node", "dgram"].join(":");
    const websocketModule = ["isomorphic", "-ws"].join("");
    const undiciModule = ["un", "dici"].join("");
    const globalFetch = ["globalThis", "fetch"].join(".");
    const websocketGlobal = ["Web", "Socket"].join("");
    const agentExecutable = ["co", "dex"].join("");
    writeFileSync(
      sourcePath,
      [
        `import ${JSON.stringify(networkModule)};`,
        `require(${JSON.stringify(http2Module)});`,
        `require(${JSON.stringify(dgramModule)});`,
        `import(${JSON.stringify("ws")});`,
        `import(${JSON.stringify("websocket")});`,
        `import(${JSON.stringify(websocketModule)});`,
        `void ${undiciModule}.request("https://example.invalid");`,
        `void ${globalFetch}("https://example.invalid");`,
        `new ${websocketGlobal}("wss://example.invalid");`,
        `const agent = ${JSON.stringify(`/opt/tools/${agentExecutable}`)};`,
        `spawn(agent);`,
        `spawn(${JSON.stringify(agentExecutable)});`,
      ].join("\n"),
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--source", sourcePath],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        "forbidden capabilities",
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test.each([["node", "dgram"].join(":"), "ws", "websocket", "isomorphic-ws"])(
    "static checker rejects the catalog network module %s",
    (networkModule) => {
      const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-lane-module-"));
      const sourcePath = resolve(fixtureRoot, "forbidden.ts");
      writeFileSync(sourcePath, `import(${JSON.stringify(networkModule)});\n`);
      try {
        const checked = spawnSync(
          process.execPath,
          [laneHygieneChecker, "--source", sourcePath],
          { encoding: "utf8" },
        );
        expect(checked.status).not.toBe(0);
        expect(`${checked.stdout}${checked.stderr}`).toContain(
          "forbidden capabilities",
        );
      } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    },
  );

  test.each([
    ["AF_INET", "udp4", "127.0.0.1"],
    ["AF_INET6", "udp6", "::1"],
  ])(
    "Linux kernel boundary denies %s socket creation",
    (_label, type, address) => {
      const dgramModule = ["node", "dgram"].join(":");
      const createSocket = ["create", "Socket"].join("");
      const checked = runKernelBoundaryFixture(
        `const socket = require(${JSON.stringify(dgramModule)})[${JSON.stringify(createSocket)}](${JSON.stringify(type)});\nsocket.once("error", (error) => process.exit(error.code === "EPERM" ? 0 : 2));\nsocket.bind(0, ${JSON.stringify(address)});\nsetTimeout(() => process.exit(1), 500);\n`,
      );
      expect(checked.status).toBe(0);
    },
  );

  test("Linux kernel boundary denies AF_NETLINK and generic non-Unix families", () => {
    const probe = compileKernelBoundaryProbe(
      "socket-family-probe",
      `#include <errno.h>\n#include <sys/socket.h>\n#include <unistd.h>\nstatic int denied_socket(int domain) { errno = 0; int fd = socket(domain, SOCK_DGRAM, 0); if (fd >= 0) { close(fd); return 1; } return errno == EPERM ? 0 : 2; }\nstatic int denied_socketpair(int domain) { int pair[2]; errno = 0; int result = socketpair(domain, SOCK_STREAM, 0, pair); if (result == 0) { close(pair[0]); close(pair[1]); return 1; } return errno == EPERM ? 0 : 2; }\nint main(void) { if (denied_socket(AF_NETLINK) != 0) return 1; if (denied_socket(AF_PACKET) != 0) return 2; if (denied_socket(AF_UNSPEC) != 0) return 3; if (denied_socketpair(AF_INET) != 0) return 4; if (denied_socketpair(AF_NETLINK) != 0) return 5; if (denied_socketpair(AF_UNSPEC) != 0) return 6; return 0; }\n`,
    );
    const checked = runKernelBoundaryProbe(probe);
    expect(checked.status).toBe(0);
  });

  test("Linux kernel boundary preserves AF_UNIX sockets", () => {
    const netModule = ["node", "net"].join(":");
    const createServer = ["create", "Server"].join("");
    const socketPath = resolve(
      tmpdir(),
      `dnd-deterministic-af-unix-${process.pid}.sock`,
    );
    const checked = runKernelBoundaryFixture(
      `const server = require(${JSON.stringify(netModule)})[${JSON.stringify(createServer)}]();\nserver.once("error", () => process.exit(2));\nserver.listen(${JSON.stringify(socketPath)}, () => server.close(() => { require("node:fs").rmSync(${JSON.stringify(socketPath)}, { force: true }); process.exit(0); }));\nsetTimeout(() => process.exit(1), 500);\n`,
    );
    expect(checked.status).toBe(0);
  });

  test("Linux kernel boundary closes inherited network descriptors before exec", () => {
    const launcher = compileKernelBoundaryProbe(
      "preopened-network-launcher",
      `#define _GNU_SOURCE\n#include <stdio.h>\n#include <sys/socket.h>\n#include <unistd.h>\nint main(int argc, char **argv) { if (argc < 3) return 64; int fd = socket(AF_INET, SOCK_DGRAM, 0); if (fd < 0) return 1; if (fd != 3 && dup2(fd, 3) < 0) return 2; if (fd != 3) close(fd); char owner[32]; snprintf(owner, sizeof(owner), "%ld", (long)getppid()); char *boundary_argv[] = { argv[1], "--owner-pid", owner, argv[2], NULL }; execv(argv[1], boundary_argv); return 127; }\n`,
    );
    const probe = compileKernelBoundaryProbe(
      "preopened-network-check",
      `#include <errno.h>\n#include <sys/socket.h>\nint main(void) { struct sockaddr_storage address; socklen_t length = sizeof(address); errno = 0; return getsockname(3, (struct sockaddr *)&address, &length) == -1 && (errno == EBADF || errno == ENOTSOCK) ? 0 : 1; }\n`,
    );
    const checked = spawnSync(launcher, [processSupervisor, probe], {
      encoding: "utf8",
      stdio: "ignore",
    });
    expect(checked.status).toBe(0);
  });

  test("Linux kernel boundary rejects an inherited AF_UNIX standard descriptor", () => {
    const launcher = compileKernelBoundaryProbe(
      "unix-standard-stdio-launcher",
      `#include <stdio.h>\n#include <sys/socket.h>\n#include <unistd.h>\nint main(int argc, char **argv) { if (argc < 3) return 64; int fd = socket(AF_UNIX, SOCK_STREAM, 0); if (fd < 0) return 1; if (fd != 0 && dup2(fd, 0) < 0) return 2; if (fd != 0) close(fd); char owner[32]; snprintf(owner, sizeof(owner), "%ld", (long)getppid()); char *boundary_argv[] = { argv[1], "--owner-pid", owner, argv[2], NULL }; execv(argv[1], boundary_argv); return 127; }\n`,
    );
    const checked = spawnSync(launcher, [processSupervisor, "/bin/true"], {
      encoding: "utf8",
    });
    expect(checked.status).toBe(78);
    expect(checked.stderr).toContain("standard descriptor 0");
  });

  test("Linux kernel boundary rejects an inherited anon-inode standard descriptor", () => {
    const launcher = compileKernelBoundaryProbe(
      "anon-inode-standard-stdio-launcher",
      `#include <stdio.h>\n#include <sys/eventfd.h>\n#include <unistd.h>\nint main(int argc, char **argv) { if (argc < 3) return 64; int fd = eventfd(0, 0); if (fd < 0) return 1; if (fd != 0 && dup2(fd, 0) < 0) return 2; if (fd != 0) close(fd); char owner[32]; snprintf(owner, sizeof(owner), "%ld", (long)getppid()); char *boundary_argv[] = { argv[1], "--owner-pid", owner, argv[2], NULL }; execv(argv[1], boundary_argv); return 127; }\n`,
    );
    const checked = spawnSync(launcher, [processSupervisor, "/bin/true"], {
      encoding: "utf8",
    });
    expect(checked.status).toBe(78);
    expect(checked.stderr).toContain("standard descriptor 0");
  });

  test("Linux kernel boundary rejects an inherited non-tty character descriptor", () => {
    const launcher = compileKernelBoundaryProbe(
      "non-tty-character-standard-stdio-launcher",
      `#include <fcntl.h>\n#include <stdio.h>\n#include <unistd.h>\nint main(int argc, char **argv) { if (argc < 3) return 64; int fd = open("/dev/zero", O_RDONLY); if (fd < 0) return 1; if (fd != 0 && dup2(fd, 0) < 0) return 2; if (fd != 0) close(fd); char owner[32]; snprintf(owner, sizeof(owner), "%ld", (long)getppid()); char *boundary_argv[] = { argv[1], "--owner-pid", owner, argv[2], NULL }; execv(argv[1], boundary_argv); return 127; }\n`,
    );
    const checked = spawnSync(launcher, [processSupervisor, "/bin/true"], {
      encoding: "utf8",
    });
    expect(checked.status).toBe(78);
    expect(checked.stderr).toContain("standard descriptor 0");
  });

  test("Linux kernel boundary blocks Unix proxy connection and descriptor transfer", () => {
    const probe = compileKernelBoundaryProbe(
      "unix-proxy-probe",
      `#define _GNU_SOURCE\n#include <errno.h>\n#include <fcntl.h>\n#include <string.h>\n#include <sys/socket.h>\n#include <sys/syscall.h>\n#include <sys/un.h>\n#include <unistd.h>\n#ifndef SYS_sendmmsg\n#error "sendmmsg is required for the Unix proxy probe"\n#endif\n#ifndef SYS_recvmmsg\n#error "recvmmsg is required for the Unix proxy probe"\n#endif\nstatic int denied(int result) { return result == -1 && errno == EPERM ? 0 : 1; }\nint main(void) { int pair[2]; if (socketpair(AF_UNIX, SOCK_STREAM, 0, pair) != 0) return 1; int proxy = socket(AF_UNIX, SOCK_STREAM, 0); if (proxy < 0) return 2; struct sockaddr_un address = { .sun_family = AF_UNIX }; memcpy(address.sun_path, "dnd-proxy", 10); if (denied(connect(proxy, (struct sockaddr *)&address, sizeof(address))) != 0) return 3; char byte = 'x'; struct iovec iov = { .iov_base = &byte, .iov_len = 1 }; char control[CMSG_SPACE(sizeof(int))] = { 0 }; struct msghdr message = { .msg_iov = &iov, .msg_iovlen = 1, .msg_control = control, .msg_controllen = sizeof(control) }; struct cmsghdr *header = CMSG_FIRSTHDR(&message); header->cmsg_level = SOL_SOCKET; header->cmsg_type = SCM_RIGHTS; header->cmsg_len = CMSG_LEN(sizeof(int)); memcpy(CMSG_DATA(header), &pair[1], sizeof(pair[1])); errno = 0; if (denied(sendmsg(pair[0], &message, 0)) != 0) return 4; errno = 0; if (denied(recvmsg(pair[1], &message, 0)) != 0) return 5; errno = 0; if (denied(sendto(pair[0], &byte, 1, 0, 0, 0)) != 0) return 6; errno = 0; if (syscall(SYS_sendmmsg, pair[0], 0, 0, 0) != -1 || errno != EPERM) return 7; errno = 0; if (syscall(SYS_recvmmsg, pair[1], 0, 0, 0, 0) != -1 || errno != EPERM) return 8; return 0; }\n`,
    );
    const checked = runKernelBoundaryProbe(probe);
    expect(checked.status).toBe(0);
  });

  test("Linux kernel boundary denies io_uring setup", () => {
    const probe = compileKernelBoundaryProbe(
      "io-uring-probe",
      `#define _GNU_SOURCE\n#include <errno.h>\n#include <sys/syscall.h>\n#include <unistd.h>\n#ifndef SYS_io_uring_setup\n#error "io_uring setup is required for the boundary probe"\n#endif\n#ifndef SYS_io_uring_enter\n#error "io_uring enter is required for the boundary probe"\n#endif\n#ifndef SYS_io_uring_register\n#error "io_uring register is required for the boundary probe"\n#endif\nstatic int denied(long result) { return result == -1 && errno == EPERM ? 0 : 1; }\nint main(void) { errno = 0; if (denied(syscall(SYS_io_uring_setup, 1, 0)) != 0) return 1; errno = 0; if (denied(syscall(SYS_io_uring_enter, -1, 0, 0, 0, 0, 0)) != 0) return 2; errno = 0; if (denied(syscall(SYS_io_uring_register, -1, 0, 0, 0)) != 0) return 3; return 0; }\n`,
    );
    const checked = runKernelBoundaryProbe(probe);
    expect(checked.status).toBe(0);
  });

  test("Linux kernel boundary denies process-group and namespace escape syscalls", () => {
    const probe = compileKernelBoundaryProbe(
      "namespace-escape-probe",
      `#define _GNU_SOURCE\n#include <errno.h>\n#include <sched.h>\n#include <signal.h>\n#include <sys/prctl.h>\n#include <sys/syscall.h>\n#include <unistd.h>\n#ifndef SYS_clone\n#error "clone is required for the namespace probe"\n#endif\n#ifndef SYS_clone3\n#error "clone3 is required for the namespace probe"\n#endif\n#ifndef SYS_setns\n#error "setns is required for the namespace probe"\n#endif\n#ifndef SYS_setpgid\n#error "setpgid is required for the namespace probe"\n#endif\n#ifndef SYS_setsid\n#error "setsid is required for the namespace probe"\n#endif\n#ifndef SYS_unshare\n#error "unshare is required for the namespace probe"\n#endif\n#ifndef SYS_prctl\n#error "prctl is required for the namespace probe"\n#endif\nstatic int denied(long result) { return result == -1 && errno == EPERM ? 0 : 1; }\nint main(void) { errno = 0; if (denied(syscall(SYS_setsid)) != 0) return 1; errno = 0; if (denied(syscall(SYS_setpgid, 0, 0)) != 0) return 2; errno = 0; if (denied(syscall(SYS_setns, -1, 0)) != 0) return 3; errno = 0; if (denied(syscall(SYS_unshare, CLONE_NEWNS)) != 0) return 4; errno = 0; if (denied(syscall(SYS_clone, CLONE_NEWPID | SIGCHLD, 0, 0, 0, 0)) != 0) return 5; errno = 0; if (denied(syscall(SYS_clone3, 0, 0)) != 0) return 6; errno = 0; if (denied(syscall(SYS_prctl, PR_SET_CHILD_SUBREAPER, 1, 0, 0, 0)) != 0) return 7; return 0; }\n`,
    );
    const checked = runKernelBoundaryProbe(probe);
    expect(checked.status).toBe(0);
  });

  test("Linux kernel boundary denies TUN/TAP setup", () => {
    const probe = compileKernelBoundaryProbe(
      "tun-ioctl-probe",
      `#define _GNU_SOURCE\n#include <errno.h>\n#include <fcntl.h>\n#include <linux/if_tun.h>\n#include <net/if.h>\n#include <sys/ioctl.h>\n#include <unistd.h>\nint main(void) { int fd = open("/dev/null", O_RDWR); if (fd < 0) return 1; struct ifreq request = { 0 }; request.ifr_flags = IFF_TUN; errno = 0; int result = ioctl(fd, TUNSETIFF, &request); close(fd); return result == -1 && errno == EPERM ? 0 : 2; }\n`,
    );
    const checked = runKernelBoundaryProbe(probe);
    expect(checked.status).toBe(0);
  });

  test("Linux kernel boundary denies pidfd descriptor acquisition", () => {
    const probe = compileKernelBoundaryProbe(
      "pidfd-probe",
      `#define _GNU_SOURCE\n#include <errno.h>\n#include <sys/syscall.h>\n#include <unistd.h>\n#ifndef SYS_pidfd_open\n#error "pidfd open is required for the boundary probe"\n#endif\n#ifndef SYS_pidfd_getfd\n#error "pidfd getfd is required for the boundary probe"\n#endif\nstatic int denied(long result) { return result == -1 && errno == EPERM ? 0 : 1; }\nint main(void) { errno = 0; if (denied(syscall(SYS_pidfd_open, getpid(), 0)) != 0) return 1; errno = 0; if (denied(syscall(SYS_pidfd_getfd, -1, 0, 0)) != 0) return 2; return 0; }\n`,
    );
    const checked = runKernelBoundaryProbe(probe);
    expect(checked.status).toBe(0);
  });

  test("Linux x86_64 boundary kills an x32 syscall ABI attempt", () => {
    const source = readFileSync(processSupervisorSource, "utf8");
    expect(source).toContain("DND_X32_SYSCALL_BIT");
    expect(source).toContain("BPF_JSET");
    if (process.arch !== "x64") return;
    const probe = compileKernelBoundaryProbe(
      "x32-syscall-probe",
      `#define _GNU_SOURCE\n#include <sys/syscall.h>\n#include <unistd.h>\n#define DND_X32_SYSCALL_BIT 0x40000000U\nint main(void) { syscall(DND_X32_SYSCALL_BIT | SYS_getpid); return 1; }\n`,
    );
    const checked = runKernelBoundaryProbe(probe);
    expect(checked.status).toBeNull();
    expect(checked.signal).toBe("SIGSYS");
  });

  test("kernel source kills an unexpected syscall architecture instead of weakening", () => {
    const source = readFileSync(processSupervisorSource, "utf8");
    expect(source).toContain("DND_AUDIT_ARCH");
    expect(source).toContain("SECCOMP_RET_KILL_PROCESS");
    expect(source).toContain("DND_X32_SYSCALL_BIT");
    expect(source).toContain("SYS_close_range");
    expect(source).toContain("SYS_pidfd_getfd");
    expect(source).toContain("S_ISREG");
    expect(source).toContain("S_ISCHR");
    expect(source).toContain("S_ISFIFO");
    expect(source).toContain("isatty");
    expect(source).toContain('stat("/dev/null"');
    expect(source).toContain("st_rdev");
    expect(source).toContain("SYS_setsid");
    expect(source).toContain("SYS_setpgid");
    expect(source).toContain("SYS_setns");
    expect(source).toContain("SYS_unshare");
    expect(source).toContain("SYS_clone");
    expect(source).toContain("SYS_clone3");
    expect(source).toContain("SYS_prctl");
    expect(source).toContain("PR_SET_CHILD_SUBREAPER");
    expect(source).toContain("DND_OWNER_PID_OPTION");
    expect(source).toContain("parse_owner_pid");
    expect(source).toContain("sigprocmask");
    expect(source).toContain("SIG_UNBLOCK");
    expect(source).toContain("unblock_supervisor_signals");
    expect(source).toContain("SYS_ioctl");
    expect(source).toContain("TUNSETIFF");
    expect(source).toContain("CAP_NET_ADMIN");
    expect(source).toContain("CapEff:");
    expect(source).toContain("/dev/net/tun");
  });

  test("native boundary owns process-tree lifecycle outside the child filter", () => {
    const source = readFileSync(processSupervisorSource, "utf8");
    expect(source).toContain("PR_SET_CHILD_SUBREAPER");
    expect(source).toContain("PR_SET_PDEATHSIG");
    expect(source).toContain("waitpid(-1");
    expect(source).toContain("fork()");
    expect(source).toContain("SIGKILL");
    expect(source).toContain("DND_SUPERVISOR_SETTLEMENT_TIMEOUT_MILLISECONDS");
    expect(source).toContain("signal_owned_descendants");
    expect(source).not.toContain("signal_owned_group");
    expect(source).not.toContain("signal_owned_tree");
    expect(source).toContain("status_for_signal_cleanup");
    expect(source).toContain("getppid()");
    expect(source).toContain("waitpid(-1, &status, WNOHANG)");
    expect(source).toContain("could not poll ");
    expect(source).toContain("before leader wait");
    expect(source).not.toContain("waitpid(-1, &status, 0)");
    expect(source).toContain('opendir("/proc")');
    expect(source).toContain("process_is_descendant");
    expect(source).not.toContain("DND_PROCESS_SUPERVISION_MARKER");
  });

  test.each([
    ["inventory", "DND_SUPERVISOR_TEST_INVENTORY_FAILURES"],
    ["proof", "DND_SUPERVISOR_TEST_PROOF_FAILURES"],
    ["clock", "DND_SUPERVISOR_TEST_CLOCK_FAILURES"],
    ["cyclic parent", "DND_SUPERVISOR_TEST_CYCLIC_PARENT"],
  ])(
    "retains the native owner after a post-launch %s observation failure",
    async (failureKind, failureVariable) => {
      const fixtureRoot = mkdtempSync(
        resolve(tmpdir(), `dnd-supervisor-${failureKind}-failure-`),
      );
      const launchedPath = resolve(fixtureRoot, "launched");
      const testSupervisor = compileProcessSupervisorTestHook(
        `process-supervisor-${failureKind}-failure`,
      );
      const leaderSource = `const { writeFileSync } = require("node:fs"); writeFileSync(${JSON.stringify(launchedPath)}, "launched");`;
      const helper = spawn(
        testSupervisor,
        [
          "--owner-pid",
          String(process.pid),
          process.execPath,
          "-e",
          leaderSource,
        ],
        {
          env: {
            ...process.env,
            NODE_OPTIONS: "",
            [failureVariable]: "always",
          },
          stdio: "ignore",
        },
      );
      try {
        await waitForFile(launchedPath);
        await new Promise((resolveWait) => setTimeout(resolveWait, 500));
        expect(processIsLive(helper.pid ?? -1)).toBe(true);
      } finally {
        if (helper.exitCode === null) {
          helper.kill("SIGKILL");
          await new Promise<void>((resolveClosed) => {
            helper.once("close", () => resolveClosed());
          });
        }
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    },
    15_000,
  );

  test("rejects an ownership preflight failure before launching the command", async () => {
    const fixtureRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-supervisor-preflight-failure-"),
    );
    const launchedPath = resolve(fixtureRoot, "launched");
    const testSupervisor = compileProcessSupervisorTestHook(
      "process-supervisor-preflight-failure",
    );
    const commandSource = `const { writeFileSync } = require("node:fs"); writeFileSync(${JSON.stringify(launchedPath)}, "launched");`;
    const helper = spawn(
      testSupervisor,
      [
        "--owner-pid",
        String(process.pid),
        process.execPath,
        "-e",
        commandSource,
      ],
      {
        env: {
          ...process.env,
          NODE_OPTIONS: "",
          DND_SUPERVISOR_TEST_PREFLIGHT_FAILURES: "always",
        },
        stdio: "ignore",
      },
    );
    try {
      const result = await new Promise<{
        status: number | null;
        signal: NodeJS.Signals | null;
      }>((resolveResult, rejectResult) => {
        helper.once("error", rejectResult);
        helper.once("close", (status, signal) =>
          resolveResult({ status, signal }),
        );
      });
      expect(result).toEqual({ status: 78, signal: null });
      expect(existsSync(launchedPath)).toBe(false);
    } finally {
      if (helper.exitCode === null) {
        helper.kill("SIGKILL");
        await new Promise<void>((resolveClosed) => {
          helper.once("close", () => resolveClosed());
        });
      }
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 10_000);

  test("native supervisor parent-death signal terminates its command", async () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-parent-death-"));
    const childPidPath = resolve(fixtureRoot, "child.pid");
    const helperStderrPath = resolve(fixtureRoot, "helper.stderr");
    const helperStderrFd = openSync(helperStderrPath, "w");
    const helper = spawn(
      processSupervisor,
      [
        "--owner-pid",
        String(process.pid),
        process.execPath,
        "-e",
        `const { writeFileSync } = require("node:fs"); writeFileSync(${JSON.stringify(childPidPath)}, String(process.pid)); setInterval(() => {}, 1000);`,
      ],
      {
        env: { ...process.env, NODE_OPTIONS: "" },
        stdio: ["ignore", "ignore", helperStderrFd],
      },
    );
    closeSync(helperStderrFd);
    let childPid: number | undefined;
    try {
      await waitForFile(childPidPath);
      childPid = Number(readFileSync(childPidPath, "utf8").trim());
      expect(Number.isSafeInteger(childPid)).toBe(true);
      expect(processIsLive(childPid)).toBe(true);
      const result = await new Promise<{ signal: NodeJS.Signals | null }>(
        (resolveResult, rejectResult) => {
          helper.once("error", rejectResult);
          helper.once("close", (_status, signal) => resolveResult({ signal }));
          helper.kill("SIGKILL");
        },
      );
      expect(result.signal).toBe("SIGKILL");
      await waitForProcessExit(childPid);
      expect(processIsLive(childPid)).toBe(false);
    } finally {
      if (helper.exitCode === null) helper.kill("SIGKILL");
      if (childPid !== undefined && processIsLive(childPid)) {
        process.kill(childPid, "SIGKILL");
      }
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 10_000);

  test("native supervisor handles rapid signals without losing cleanup", async () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-rapid-signals-"));
    const leaderPidPath = resolve(fixtureRoot, "leader.pid");
    const helper = spawn(
      processSupervisor,
      [
        "--owner-pid",
        String(process.pid),
        process.execPath,
        "-e",
        `const { writeFileSync } = require("node:fs"); writeFileSync(${JSON.stringify(leaderPidPath)}, String(process.pid)); for (const signal of ["SIGHUP", "SIGINT", "SIGTERM"]) process.on(signal, () => {}); setInterval(() => {}, 1000);`,
      ],
      {
        env: { ...process.env, NODE_OPTIONS: "" },
        stdio: "ignore",
      },
    );
    let leaderPid: number | undefined;
    try {
      await waitForFile(leaderPidPath);
      leaderPid = Number(readFileSync(leaderPidPath, "utf8").trim());
      expect(Number.isSafeInteger(leaderPid)).toBe(true);
      for (let index = 0; index < 256; index += 1) {
        helper.kill("SIGTERM");
      }
      const result = await new Promise<{
        status: number | null;
        signal: NodeJS.Signals | null;
      }>((resolveResult, rejectResult) => {
        helper.once("error", rejectResult);
        helper.once("close", (status, signal) =>
          resolveResult({ status, signal }),
        );
      });
      expect(result).toEqual({ status: 143, signal: null });
      await waitForProcessExit(leaderPid);
      expect(processIsLive(leaderPid)).toBe(false);
    } finally {
      if (helper.exitCode === null) helper.kill("SIGKILL");
      if (leaderPid !== undefined && processIsLive(leaderPid)) {
        process.kill(leaderPid, "SIGKILL");
      }
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 10_000);

  test("native supervisor reports a later handled signal during cleanup", async () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-second-signal-"));
    const leaderPidPath = resolve(fixtureRoot, "leader.pid");
    const helper = spawn(
      processSupervisor,
      [
        "--owner-pid",
        String(process.pid),
        process.execPath,
        "-e",
        `const { writeFileSync } = require("node:fs"); writeFileSync(${JSON.stringify(leaderPidPath)}, String(process.pid)); for (const signal of ["SIGHUP", "SIGINT", "SIGTERM"]) process.on(signal, () => {}); setInterval(() => {}, 1000);`,
      ],
      {
        env: { ...process.env, NODE_OPTIONS: "" },
        stdio: "ignore",
      },
    );
    let leaderPid: number | undefined;
    let secondSignal: NodeJS.Timeout | undefined;
    try {
      await waitForFile(leaderPidPath);
      leaderPid = Number(readFileSync(leaderPidPath, "utf8").trim());
      expect(Number.isSafeInteger(leaderPid)).toBe(true);
      const resultPromise = new Promise<{
        status: number | null;
        signal: NodeJS.Signals | null;
      }>((resolveResult, rejectResult) => {
        helper.once("error", rejectResult);
        helper.once("close", (status, signal) =>
          resolveResult({ status, signal }),
        );
      });
      helper.kill("SIGTERM");
      secondSignal = setTimeout(() => helper.kill("SIGINT"), 200);
      const result = await resultPromise;
      expect(result).toEqual({ status: 130, signal: null });
      await waitForProcessExit(leaderPid);
      expect(processIsLive(leaderPid)).toBe(false);
    } finally {
      if (secondSignal !== undefined) clearTimeout(secondSignal);
      if (helper.exitCode === null) helper.kill("SIGKILL");
      if (leaderPid !== undefined && processIsLive(leaderPid)) {
        process.kill(leaderPid, "SIGKILL");
      }
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 10_000);

  test("native supervisor polls before leader wait across repeated termination windows", async () => {
    const fixtureRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-prewait-termination-"),
    );
    try {
      for (let index = 0; index < 128; index += 1) {
        const leaderPidPath = resolve(fixtureRoot, `leader-${index}.pid`);
        const helper = spawn(
          processSupervisor,
          [
            "--owner-pid",
            String(process.pid),
            process.execPath,
            "-e",
            `const { writeFileSync } = require("node:fs"); writeFileSync(${JSON.stringify(leaderPidPath)}, String(process.pid)); setInterval(() => {}, 1000);`,
          ],
          {
            env: { ...process.env, NODE_OPTIONS: "" },
            stdio: "ignore",
          },
        );
        let leaderPid: number | undefined;
        try {
          await waitForFile(leaderPidPath);
          leaderPid = Number(readFileSync(leaderPidPath, "utf8").trim());
          expect(Number.isSafeInteger(leaderPid)).toBe(true);
          const result = await new Promise<{
            status: number | null;
            signal: NodeJS.Signals | null;
          }>((resolveResult, rejectResult) => {
            const timeout = setTimeout(
              () =>
                rejectResult(
                  new Error("Timed out waiting for pre-wait termination."),
                ),
              2_000,
            );
            helper.once("error", (error) => {
              clearTimeout(timeout);
              rejectResult(error);
            });
            helper.once("close", (status, signal) => {
              clearTimeout(timeout);
              resolveResult({ status, signal });
            });
            helper.kill("SIGTERM");
          });
          expect(result).toEqual({ status: 143, signal: null });
          expect(processIsLive(leaderPid)).toBe(false);
        } finally {
          if (helper.exitCode === null) helper.kill("SIGKILL");
          if (leaderPid !== undefined && processIsLive(leaderPid)) {
            process.kill(leaderPid, "SIGKILL");
          }
        }
      }
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 120_000);

  test("native supervisor unblocks inherited signals for termination and owner death", async () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-blocked-signals-"));
    const launcher = compileKernelBoundaryProbe(
      "blocked-signal-launcher",
      `#define _GNU_SOURCE\n#include <signal.h>\n#include <stdio.h>\n#include <unistd.h>\nint main(int argc, char **argv) { if (argc < 3) return 64; sigset_t blocked; sigemptyset(&blocked); sigaddset(&blocked, SIGHUP); sigaddset(&blocked, SIGINT); sigaddset(&blocked, SIGTERM); if (sigprocmask(SIG_BLOCK, &blocked, NULL) != 0) return 65; char owner[32]; snprintf(owner, sizeof(owner), "%ld", (long)getppid()); char *boundary_argv[argc + 2]; boundary_argv[0] = argv[1]; boundary_argv[1] = "--owner-pid"; boundary_argv[2] = owner; for (int index = 2; index < argc; index += 1) boundary_argv[index + 1] = argv[index]; boundary_argv[argc + 1] = NULL; execv(argv[1], boundary_argv); return 127; }\n`,
    );
    const explicitLeaderPidPath = resolve(fixtureRoot, "explicit-leader.pid");
    const explicitCommand = `const { writeFileSync } = require("node:fs"); writeFileSync(${JSON.stringify(explicitLeaderPidPath)}, String(process.pid)); setInterval(() => {}, 1000);`;
    const explicitHelper = spawn(
      launcher,
      [processSupervisor, process.execPath, "-e", explicitCommand],
      { env: { ...process.env, NODE_OPTIONS: "" }, stdio: "ignore" },
    );
    let explicitLeaderPid: number | undefined;
    let ownerProcess: ReturnType<typeof spawn> | undefined;
    let ownerHelperPid: number | undefined;
    try {
      await waitForFile(explicitLeaderPidPath);
      explicitLeaderPid = Number(
        readFileSync(explicitLeaderPidPath, "utf8").trim(),
      );
      expect(Number.isSafeInteger(explicitLeaderPid)).toBe(true);
      const explicitResult = await new Promise<{
        status: number | null;
        signal: NodeJS.Signals | null;
      }>((resolveResult, rejectResult) => {
        explicitHelper.once("error", rejectResult);
        explicitHelper.once("close", (status, signal) =>
          resolveResult({ status, signal }),
        );
        explicitHelper.kill("SIGTERM");
      });
      expect(explicitResult).toEqual({ status: 143, signal: null });
      await waitForProcessExit(explicitLeaderPid);
      expect(processIsLive(explicitLeaderPid)).toBe(false);

      const ownerScriptPath = resolve(fixtureRoot, "blocked-owner.cjs");
      const ownerHelperPidPath = resolve(fixtureRoot, "owner-helper.pid");
      const ownerLeaderPidPath = resolve(fixtureRoot, "owner-leader.pid");
      const ownerCommand = `const { writeFileSync } = require("node:fs"); writeFileSync(process.env.DND_LEADER_PID_PATH, String(process.pid)); setInterval(() => {}, 1000);`;
      writeFileSync(
        ownerScriptPath,
        `const { existsSync, writeFileSync } = require("node:fs"); const { spawn } = require("node:child_process"); const [launcherPath, boundaryPath, helperPidPath, leaderPidPath] = process.argv.slice(2); const helper = spawn(launcherPath, [boundaryPath, process.execPath, "-e", ${JSON.stringify(ownerCommand)}], { env: { ...process.env, NODE_OPTIONS: "", DND_LEADER_PID_PATH: leaderPidPath }, stdio: "ignore" }); writeFileSync(helperPidPath, String(helper.pid)); const deadline = Date.now() + 2000; const waitForLeader = () => { if (existsSync(leaderPidPath)) { process.exit(0); } if (Date.now() >= deadline) { process.exit(2); } setTimeout(waitForLeader, 5); }; waitForLeader();`,
      );
      ownerProcess = spawn(
        process.execPath,
        [
          ownerScriptPath,
          launcher,
          processSupervisor,
          ownerHelperPidPath,
          ownerLeaderPidPath,
        ],
        { env: { ...process.env, NODE_OPTIONS: "" }, stdio: "ignore" },
      );
      const ownerStatus = await new Promise<number>(
        (resolveResult, rejectResult) => {
          ownerProcess?.once("error", rejectResult);
          ownerProcess?.once("close", (status, signal) => {
            if (signal !== null) {
              rejectResult(
                new Error(`Blocked-signal owner stopped with ${signal}.`),
              );
            } else {
              resolveResult(status ?? 1);
            }
          });
        },
      );
      expect(ownerStatus).toBe(0);
      await waitForFile(ownerHelperPidPath);
      ownerHelperPid = Number(readFileSync(ownerHelperPidPath, "utf8").trim());
      expect(Number.isSafeInteger(ownerHelperPid)).toBe(true);
      await waitForProcessExit(ownerHelperPid, 2_000);
      expect(processIsLive(ownerHelperPid)).toBe(false);
      if (existsSync(ownerLeaderPidPath)) {
        const ownerLeaderPid = Number(
          readFileSync(ownerLeaderPidPath, "utf8").trim(),
        );
        expect(Number.isSafeInteger(ownerLeaderPid)).toBe(true);
        await waitForProcessExit(ownerLeaderPid, 2_000);
        expect(processIsLive(ownerLeaderPid)).toBe(false);
      }
    } finally {
      if (explicitHelper.exitCode === null) explicitHelper.kill("SIGKILL");
      if (ownerProcess?.exitCode === null) ownerProcess.kill("SIGKILL");
      if (ownerHelperPid !== undefined && processIsLive(ownerHelperPid)) {
        process.kill(ownerHelperPid, "SIGKILL");
      }
      if (explicitLeaderPid !== undefined && processIsLive(explicitLeaderPid)) {
        process.kill(explicitLeaderPid, "SIGKILL");
      }
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 15_000);

  test("native supervisor does not leak across owner death near leader wait", async () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-owner-death-"));
    const ownerScriptPath = resolve(fixtureRoot, "owner.cjs");
    writeFileSync(
      ownerScriptPath,
      `const { spawn } = require("node:child_process"); const { existsSync, writeFileSync } = require("node:fs"); const [boundaryPath, helperPidPath, leaderPidPath] = process.argv.slice(2); const helper = spawn(boundaryPath, ["--owner-pid", String(process.pid), process.execPath, "-e", "const { writeFileSync } = require('node:fs'); writeFileSync(process.env.DND_LEADER_PID_PATH, String(process.pid)); setInterval(() => {}, 1000);"], { env: { ...process.env, NODE_OPTIONS: "", DND_LEADER_PID_PATH: leaderPidPath }, stdio: "ignore" }); writeFileSync(helperPidPath, String(helper.pid)); const deadline = Date.now() + 2000; const waitForLeader = () => { if (existsSync(leaderPidPath)) { process.exit(0); } if (Date.now() >= deadline) { process.exit(2); } setTimeout(waitForLeader, 5); }; waitForLeader();`,
    );
    try {
      for (let index = 0; index < 64; index += 1) {
        const helperPidPath = resolve(fixtureRoot, `helper-${index}.pid`);
        const leaderPidPath = resolve(fixtureRoot, `leader-${index}.pid`);
        const owner = spawn(
          process.execPath,
          [ownerScriptPath, processSupervisor, helperPidPath, leaderPidPath],
          { env: { ...process.env, NODE_OPTIONS: "" }, stdio: "ignore" },
        );
        const ownerStatus = await new Promise<number>(
          (resolveResult, rejectResult) => {
            owner.once("error", rejectResult);
            owner.once("close", (status, signal) => {
              if (signal !== null)
                rejectResult(new Error(`Owner stopped with ${signal}.`));
              else resolveResult(status ?? 1);
            });
          },
        );
        expect(ownerStatus).toBe(0);
        await waitForFile(helperPidPath);
        const helperPid = Number(readFileSync(helperPidPath, "utf8").trim());
        expect(Number.isSafeInteger(helperPid)).toBe(true);
        await waitForProcessExit(helperPid, 2_000);
        expect(processIsLive(helperPid)).toBe(false);
        if (existsSync(leaderPidPath)) {
          const leaderPid = Number(readFileSync(leaderPidPath, "utf8").trim());
          expect(Number.isSafeInteger(leaderPid)).toBe(true);
          await waitForProcessExit(leaderPid, 2_000);
          expect(processIsLive(leaderPid)).toBe(false);
        }
      }
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 90_000);

  test("runner reports a helper cleanup failure during signal termination", async () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-runner-failure-"));
    const boundaryPath = resolve(fixtureRoot, "fake-boundary.sh");
    const findingPath = resolve(fixtureRoot, "finding");
    const helperPath = resolve(fixtureRoot, "failure-helper.cjs");
    writeFileSync(
      boundaryPath,
      "#!/bin/sh\ntrap 'exit 1' TERM INT HUP\nwhile :; do sleep 0.01; done\n",
    );
    chmodSync(boundaryPath, 0o755);
    writeFileSync(
      helperPath,
      `const { writeFileSync } = require("node:fs"); const { createDeterministicRunner } = require(${JSON.stringify(deterministicRunnerModule)}); const runner = createDeterministicRunner({ boundary: ${JSON.stringify(boundaryPath)}, environment: { ...process.env, NODE_OPTIONS: "" } }); const running = runner.run("ignored", []); setTimeout(async () => { let finding; try { await runner.terminateActive("SIGTERM"); finding = "unexpected success"; } catch (error) { finding = String(error); } writeFileSync(${JSON.stringify(findingPath)}, finding); await running; process.exit(finding.includes("cleanup") ? 0 : 1); }, 50);`,
    );
    const checked = spawn(process.execPath, [helperPath], {
      env: { ...process.env, NODE_OPTIONS: "" },
      stdio: "ignore",
    });
    try {
      const result = await new Promise<number>(
        (resolveResult, rejectResult) => {
          checked.once("error", rejectResult);
          checked.once("close", (status, signal) => {
            if (signal !== null) {
              rejectResult(new Error(`Failure helper stopped with ${signal}.`));
            } else {
              resolveResult(status ?? 1);
            }
          });
        },
      );
      expect(result).toBe(0);
      expect(readFileSync(findingPath, "utf8")).toContain("cleanup");
    } finally {
      if (checked.exitCode === null) checked.kill("SIGKILL");
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 10_000);

  test("runner accepts a different handled signal status during cleanup", async () => {
    const fixtureRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-runner-signal-status-"),
    );
    const boundaryPath = resolve(fixtureRoot, "handled-signal-boundary.sh");
    const findingPath = resolve(fixtureRoot, "finding");
    const helperPath = resolve(fixtureRoot, "handled-signal-helper.cjs");
    writeFileSync(
      boundaryPath,
      "#!/bin/sh\ntrap 'exit 130' TERM\nwhile :; do sleep 0.01; done\n",
    );
    chmodSync(boundaryPath, 0o755);
    writeFileSync(
      helperPath,
      `const { writeFileSync } = require("node:fs"); const { createDeterministicRunner } = require(${JSON.stringify(deterministicRunnerModule)}); const runner = createDeterministicRunner({ boundary: ${JSON.stringify(boundaryPath)}, environment: { ...process.env, NODE_OPTIONS: "" } }); const running = runner.run("ignored", []); setTimeout(async () => { let finding; try { await runner.terminateActive("SIGTERM"); finding = "accepted"; } catch (error) { finding = String(error); } writeFileSync(${JSON.stringify(findingPath)}, finding); await running; process.exit(finding === "accepted" ? 0 : 1); }, 50);`,
    );
    const checked = spawn(process.execPath, [helperPath], {
      env: { ...process.env, NODE_OPTIONS: "" },
      stdio: "ignore",
    });
    try {
      const result = await new Promise<number>(
        (resolveResult, rejectResult) => {
          checked.once("error", rejectResult);
          checked.once("close", (status, signal) => {
            if (signal !== null) {
              rejectResult(
                new Error(`Handled-signal helper stopped with ${signal}.`),
              );
            } else {
              resolveResult(status ?? 1);
            }
          });
        },
      );
      expect(result).toBe(0);
      expect(readFileSync(findingPath, "utf8")).toBe("accepted");
    } finally {
      if (checked.exitCode === null) checked.kill("SIGKILL");
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 10_000);

  test("kernel boundary remains after an ESM dynamic import", () => {
    const dgramModule = ["node", "dgram"].join(":");
    const checked = runKernelBoundaryFixture(
      `import(${JSON.stringify(dgramModule)}).then(({ createSocket }) => { const socket = createSocket("udp4"); socket.once("error", (error) => process.exit(error.code === "EPERM" ? 0 : 2)); socket.bind(0, "127.0.0.1"); }).catch(() => process.exit(3));\nsetTimeout(() => process.exit(1), 500);\n`,
    );
    expect(checked.status).toBe(0);
  });

  test("rejects newly surfaced network and dynamic agent forms in deterministic source", () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-lane-capability-"));
    const sourcePath = resolve(fixtureRoot, "new-forbidden.ts");
    const networkModule = ["node", "http2"].join(":");
    const websocketGlobal = ["Web", "Socket"].join("");
    const agentExecutable = ["co", "dex"].join("");
    writeFileSync(
      sourcePath,
      [
        `require(${JSON.stringify(networkModule)});`,
        `new ${websocketGlobal}("wss://example.invalid");`,
        `const agent = ${JSON.stringify(`/opt/tools/${agentExecutable}`)};`,
        "spawn(agent);",
      ].join("\n"),
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--source", sourcePath],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        "forbidden capabilities",
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test("runtime capability guard rejects indirect WebSocket access", () => {
    const websocketGlobal = ["Web", "Socket"].join("");
    const checked = runCapabilityGuardFixture(
      [
        `const globalName = ${JSON.stringify(websocketGlobal)};`,
        "void globalThis[globalName];",
      ].join("\n"),
    );
    expect(checked.status).not.toBe(0);
    expect(`${checked.stdout}${checked.stderr}`).toContain(
      "network capability",
    );
  });

  test("runtime capability guard rejects an indirect absolute coding agent", () => {
    const agentPath = ["/opt/tools/", ["co", "dex"].join("")].join("");
    const checked = runCapabilityGuardFixture(
      [
        'const { spawnSync } = require("node:child_process");',
        `const agent = ${JSON.stringify(agentPath)};`,
        'const result = spawnSync(agent, [], { stdio: "ignore" });',
        'if (result.error?.code === "ENOENT") process.exit(0);',
      ].join("\n"),
    );
    expect(checked.status).not.toBe(0);
    expect(`${checked.stdout}${checked.stderr}`).toContain(
      "coding-agent capability",
    );
  });

  test("runtime capability guard rejects an indirect shell network command", () => {
    const networkCli = ["cu", "rl"].join("");
    const checked = runCapabilityGuardFixture(
      [
        'const { spawnSync } = require("node:child_process");',
        `const command = ${JSON.stringify(networkCli)};`,
        'spawnSync("sh", ["-c", `printf \'%s\' ${command}`]);',
      ].join("\n"),
    );
    expect(checked.status).not.toBe(0);
    expect(`${checked.stdout}${checked.stderr}`).toContain("network CLI");
  });

  test("runtime capability guard rejects a network executable supplied as shell", () => {
    const networkCli = ["cu", "rl"].join("");
    const checked = runCapabilityGuardFixture(
      [
        'const { spawnSync } = require("node:child_process");',
        "try {",
        `  spawnSync(process.execPath, ["-e", "process.exit(0)"], { shell: ${JSON.stringify(networkCli)} });`,
        "  process.exit(1);",
        '} catch (error) { process.exit(String(error).includes("network CLI") ? 0 : 2); }',
      ].join("\n"),
    );
    expect(checked.status).toBe(0);
  });

  test("runtime capability guard rejects a dynamic network shell for execFile", () => {
    const checked = runCapabilityGuardFixture(
      [
        'const { execFileSync } = require("node:child_process");',
        'const shell = ["cu", "rl"].join("");',
        "try {",
        '  execFileSync(process.execPath, ["-e", "process.exit(0)"], { shell });',
        "  process.exit(1);",
        '} catch (error) { process.exit(String(error).includes("network CLI") ? 0 : 2); }',
      ].join("\n"),
    );
    expect(checked.status).toBe(0);
  });

  test("worker threads retain the kernel boundary after clearing execArgv and NODE_OPTIONS", () => {
    const dgramModule = ["node", "dgram"].join(":");
    const createSocket = ["create", "Socket"].join("");
    const workerSource = `const { parentPort } = require("node:worker_threads"); const socket = require(${JSON.stringify(dgramModule)})[${JSON.stringify(createSocket)}]("udp4"); socket.once("error", (error) => parentPort.postMessage(error.code === "EPERM" ? "blocked" : "wrong")); socket.bind(0, "127.0.0.1");`;
    const checked = runKernelBoundaryFixture(
      `const { Worker } = require("node:worker_threads"); const worker = new Worker(${JSON.stringify(workerSource)}, { eval: true, execArgv: [], env: { NODE_OPTIONS: "" } }); worker.once("message", (message) => process.exit(message === "blocked" ? 0 : 1)); worker.once("error", () => process.exit(2)); setTimeout(() => process.exit(3), 500);`,
    );
    expect(checked.status).toBe(0);
  });

  test.each(["curl", "codex"])(
    "runtime capability guard rejects fork custom executable %s",
    (executable) => {
      const checked = runCapabilityGuardFixture(
        [
          'const { fork } = require("node:child_process");',
          "try {",
          `  fork(process.execPath, [], { execPath: ${JSON.stringify(executable)}, silent: true });`,
          "  process.exit(1);",
          "} catch (error) { process.exit(String(error).match(/capability|network CLI/) ? 0 : 2); }",
        ].join("\n"),
      );
      expect(checked.status).toBe(0);
    },
  );

  test("kernel boundary survives env, shell, and fork descendants after NODE_OPTIONS removal", () => {
    const dgramModule = ["node", "dgram"].join(":");
    const createSocket = ["create", "Socket"].join("");
    const networkAttempt = `const socket = require(${JSON.stringify(dgramModule)})[${JSON.stringify(createSocket)}]("udp4"); socket.once("error", (error) => process.exit(error.code === "EPERM" ? 0 : 2)); socket.bind(0, "127.0.0.1"); setTimeout(() => process.exit(1), 500);`;
    const checked = runKernelBoundaryFixture(
      `const { spawnSync, fork } = require("node:child_process");\nif (process.argv[2] === "fork-child") { ${networkAttempt} } else { const envChild = spawnSync("env", ["-i", process.execPath, "-e", ${JSON.stringify(networkAttempt)}]); if (envChild.status !== 0) process.exit(1); const shellChild = spawnSync("sh", ["-c", ${JSON.stringify(`unset NODE_OPTIONS; exec ${process.execPath} -e '${networkAttempt}'`)}]); if (shellChild.status !== 0) process.exit(2); const forkChild = fork(__filename, ["fork-child"], { env: { NODE_OPTIONS: "" }, silent: true }); forkChild.once("exit", (status) => process.exit(status === 0 ? 0 : 3)); setTimeout(() => process.exit(4), 1000); }\n`,
    );
    expect(checked.status).toBe(0);
  });

  test("kernel route denies network from an aliased coding-agent executable", () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-agent-alias-"));
    const aliasPath = resolve(fixtureRoot, "assistant-alias");
    const dgramModule = ["node", "dgram"].join(":");
    const createSocket = ["create", "Socket"].join("");
    const networkAttempt = `const socket = require(${JSON.stringify(dgramModule)})[${JSON.stringify(createSocket)}]("udp4"); socket.once("error", (error) => process.exit(error.code === "EPERM" ? 0 : 2)); socket.bind(0, "127.0.0.1"); setTimeout(() => process.exit(1), 500);`;
    writeFileSync(
      aliasPath,
      `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} -e ${JSON.stringify(networkAttempt)}\n`,
    );
    chmodSync(aliasPath, 0o755);
    try {
      const checked = spawnSync(
        "env",
        [
          "-i",
          `PATH=${fixtureRoot}:/usr/bin:/bin`,
          processSupervisor,
          "--owner-pid",
          String(process.pid),
          aliasPath,
        ],
        { encoding: "utf8", stdio: "ignore" },
      );
      expect(checked.status).toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test("kernel boundary ignores forged Module._load parents and fake node_modules origins", () => {
    const dgramModule = ["node", "dgram"].join(":");
    const createSocket = ["create", "Socket"].join("");
    const checked = runKernelBoundaryFixture(
      `const { createRequire, _load } = require("node:module");\nconst bind = (dgram) => new Promise((resolve) => { const socket = dgram[${JSON.stringify(createSocket)}]("udp4"); socket.once("error", (error) => resolve(error.code === "EPERM")); socket.bind(0, "127.0.0.1"); });\nPromise.all([bind(_load(${JSON.stringify(dgramModule)}, { filename: "/tmp/node_modules/trusted.cjs" }, false)), bind(createRequire("/tmp/node_modules/forged.cjs")(${JSON.stringify(dgramModule)}))]).then((blocked) => process.exit(blocked.every(Boolean) ? 0 : 1));\nsetTimeout(() => process.exit(2), 500);\n`,
    );
    expect(checked.status).toBe(0);
  });

  test("reinjects the deterministic guard when a Node child clears NODE_OPTIONS", () => {
    const fetchExpression = ["globalThis", "fetch"].join(".");
    const childSource = `void ${fetchExpression}("https://example.invalid"); process.exit(0);`;
    const checked = runCapabilityGuardFixture(
      [
        'const { spawnSync } = require("node:child_process");',
        `const child = spawnSync(process.execPath, ["-e", ${JSON.stringify(childSource)}], {`,
        '  env: { ...process.env, NODE_OPTIONS: "" },',
        "});",
        'if (child.status === 0 || !String(child.stderr).includes("network capability")) process.exit(1);',
      ].join("\n"),
    );
    expect(checked.status).toBe(0);
  });

  test("reinjects the deterministic guard through nested Node descendants", () => {
    const fetchExpression = ["globalThis", "fetch"].join(".");
    const grandchildSource = `void ${fetchExpression}("https://example.invalid"); process.exit(0);`;
    const childSource = [
      'const { spawnSync } = require("node:child_process");',
      `const grandchild = spawnSync(process.execPath, ["-e", ${JSON.stringify(grandchildSource)}], {`,
      '  env: { ...process.env, NODE_OPTIONS: "" },',
      "});",
      'if (grandchild.status === 0 || !String(grandchild.stderr).includes("network capability")) process.exit(1);',
      "process.exit(0);",
    ].join("\n");
    const checked = runCapabilityGuardFixture(
      [
        'const { spawnSync } = require("node:child_process");',
        `const child = spawnSync(process.execPath, ["-e", ${JSON.stringify(childSource)}], {`,
        '  env: { ...process.env, NODE_OPTIONS: "" },',
        "});",
        "process.exit(child.status === 0 ? 0 : 1);",
      ].join("\n"),
    );
    expect(checked.status).toBe(0);
  });

  test("rejects a known coding-agent executable under an arbitrary temporary root", () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-lane-agent-"));
    const agentPath = resolve(fixtureRoot, "codex");
    writeFileSync(agentPath, "#!/bin/sh\nexit 0\n");
    chmodSync(agentPath, 0o755);
    try {
      const checked = runCapabilityGuardFixture(
        [
          'const { spawnSync } = require("node:child_process");',
          "try {",
          `  const result = spawnSync(${JSON.stringify(["co", "dex"].join(""))}, [], { env: { ...process.env, PATH: ${JSON.stringify(`${fixtureRoot}:`)} + (process.env.PATH ?? "") }, stdio: "ignore" });`,
          "  process.exit(result.status === 0 ? 1 : 2);",
          '} catch (error) { process.exit(String(error).includes("coding-agent capability") ? 0 : 3); }',
        ].join("\n"),
      );
      expect(checked.status).toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test("rejects a temporary-root symlink to a coding-agent executable", () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-lane-agent-link-"));
    const agentPath = resolve(fixtureRoot, "codex");
    symlinkSync(process.execPath, agentPath);
    try {
      const checked = runCapabilityGuardFixture(
        [
          'const { spawnSync } = require("node:child_process");',
          "try {",
          `  const result = spawnSync(${JSON.stringify(["co", "dex"].join(""))}, ["-e", "process.exit(0)"], { env: { ...process.env, PATH: ${JSON.stringify(`${fixtureRoot}:`)} + (process.env.PATH ?? "") }, stdio: "ignore" });`,
          "  process.exit(result.status === 0 ? 1 : 2);",
          '} catch (error) { process.exit(String(error).includes("coding-agent capability") ? 0 : 3); }',
        ].join("\n"),
      );
      expect(checked.status).toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test("rejects a forged coding-agent fixture marker", () => {
    const fixtureRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-lane-agent-fixture-"),
    );
    const agentPath = resolve(fixtureRoot, "codex");
    writeFileSync(
      agentPath,
      "#!/bin/sh\n# dnd.raw-swarm.deterministic-fixture:codex\nexit 0\n",
    );
    chmodSync(agentPath, 0o755);
    try {
      const checked = runCapabilityGuardFixture(
        [
          'const { spawnSync } = require("node:child_process");',
          `spawnSync(${JSON.stringify(agentPath)}, [], { stdio: "ignore" });`,
          "process.exit(1);",
        ].join("\n"),
      );
      expect(checked.status).toBe(1);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        "coding-agent capability",
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test("blocks a known coding-agent executable categorically", () => {
    const codingAgent = ["co", "dex"].join("");
    const checked = runCapabilityGuardFixture(
      [
        'const { spawnSync } = require("node:child_process");',
        `try { spawnSync(${JSON.stringify(codingAgent)}, [], { stdio: "ignore" }); process.exit(1); }`,
        'catch (error) { process.exit(String(error).includes("coding-agent capability") ? 0 : 2); }',
      ].join("\n"),
    );
    expect(checked.status).toBe(0);
  });

  test("allows deterministic child-process boundary sources", () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-lane-capability-"));
    const sourcePath = resolve(fixtureRoot, "allowed.ts");
    const childProcessModule = ["node", "child_process"].join(":");
    writeFileSync(
      sourcePath,
      [
        `import { spawn } from ${JSON.stringify(childProcessModule)};`,
        `spawn(process.execPath, ["-e", "process.exit(0)"]);`,
      ].join("\n"),
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--source", sourcePath],
        { encoding: "utf8" },
      );
      expect(checked.status).toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test("fails safely for absent or non-file standalone sources", () => {
    const fixtureRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-lane-source-shape-"),
    );
    const absentPath = resolve(fixtureRoot, "absent.ts");
    try {
      for (const sourcePath of [fixtureRoot, absentPath]) {
        const checked = spawnSync(
          process.execPath,
          [laneHygieneChecker, "--source", sourcePath],
          { encoding: "utf8" },
        );
        expect(checked.status).not.toBe(0);
        expect(`${checked.stdout}${checked.stderr}`).toContain("regular file");
      }
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test("rejects direct and symlinked --test paths outside the repository", () => {
    const outsideRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-lane-test-outside-"),
    );
    const outsideTestPath = resolve(outsideRoot, "outside.test.ts");
    const linkedTestPath = resolve(
      rawSwarmOutputDirectory,
      "outside-test-link.test.ts",
    );
    writeFileSync(outsideTestPath, "export const harmless = true;\n");
    symlinkSync(outsideTestPath, linkedTestPath, "file");
    try {
      const directChecked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", outsideTestPath],
        { encoding: "utf8" },
      );
      expect(directChecked.status).not.toBe(0);
      expect(`${directChecked.stdout}${directChecked.stderr}`).toContain(
        "outside the repository",
      );

      const symlinkChecked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, linkedTestPath)],
        { encoding: "utf8" },
      );
      expect(symlinkChecked.status).not.toBe(0);
      expect(`${symlinkChecked.stdout}${symlinkChecked.stderr}`).toContain(
        "resolves outside the repository",
      );
    } finally {
      rmSync(linkedTestPath, { force: true });
      rmSync(outsideRoot, { recursive: true, force: true });
    }
  });

  test.each([
    ["fork custom network executable", "fork", "curl", "execPath"],
    ["fork custom coding-agent executable", "fork", "codex", "execPath"],
    ["spawn network shell", "spawn", "curl", "shell"],
    ["execFile network shell", "execFile", "wget", "shell"],
  ])("static checker rejects %s", (_label, call, executable, option) => {
    const source = `${call}("module.cjs", [], { ${option}: ${JSON.stringify(executable)} });`;
    const fixtureRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-lane-child-options-"),
    );
    const sourcePath = resolve(fixtureRoot, "forbidden.ts");
    writeFileSync(sourcePath, source);
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--source", sourcePath],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        "forbidden capabilities",
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test("rejects network CLI process and shell forms in deterministic source", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "lane-cli-"),
    );
    const sourcePath = resolve(fixtureRoot, "forbidden-cli.ts");
    const curlExecutable = ["cu", "rl"].join("");
    const wgetExecutable = ["w", "get"].join("");
    const execFileSyncCall = ["execFileSync", "("].join("");
    const spawnSyncCall = ["spawnSync", "("].join("");
    const execSyncCall = ["execSync", "("].join("");
    const spawnCall = ["spawn", "("].join("");
    writeFileSync(
      sourcePath,
      [
        `${execFileSyncCall}${JSON.stringify(curlExecutable)}, ["https://example.invalid"]);`,
        `${spawnSyncCall}${JSON.stringify(wgetExecutable)}, ["https://example.invalid"]);`,
        `${execSyncCall}${JSON.stringify(`${curlExecutable} https://example.invalid`)});`,
        `${spawnCall}${JSON.stringify("sh")}, ["-c", ${JSON.stringify(`${wgetExecutable} https://example.invalid`)}]);`,
      ].join("\n"),
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--source", sourcePath],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        "forbidden capabilities",
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  test("rejects forbidden capability reached through a workspace alias", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "lane-alias-"),
    );
    const fixtureName = relative(rawSwarmOutputDirectory, fixtureRoot);
    const packageDirectory = resolve(
      repoRoot,
      "packages",
      `.raw-swarm-alias-${fixtureName}`,
    );
    const packageName = `@dnd/raw-swarm-alias-${fixtureName}`;
    const packageSourceDirectory = resolve(packageDirectory, "src");
    const entryPath = resolve(fixtureRoot, "alias-entry.ts");
    const tsconfigAliasEntryPath = resolve(
      repoRoot,
      "scripts/raw-swarm/sdk-player/.raw-swarm-alias-entry.ts",
    );
    const packageSourcePath = resolve(packageSourceDirectory, "index.ts");
    const curlExecutable = ["cu", "rl"].join("");
    const execFileSyncCall = ["execFileSync", "("].join("");
    mkdirSync(packageSourceDirectory, { recursive: true });
    writeFileSync(
      resolve(packageDirectory, "package.json"),
      `${JSON.stringify(
        {
          name: packageName,
          private: true,
          exports: { ".": "./src/index.ts" },
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(entryPath, `import ${JSON.stringify(packageName)};\n`);
    writeFileSync(
      tsconfigAliasEntryPath,
      'import type { ScenarioSetupSdk } from "@dnd/scenario-setup-sdk";\nvoid (undefined as unknown as ScenarioSetupSdk);\n',
    );
    writeFileSync(
      packageSourcePath,
      `const childProcessCall = ${JSON.stringify(execFileSyncCall)};\nconst networkCli = ${JSON.stringify(curlExecutable)};\nvoid childProcessCall;\nvoid networkCli;\n${execFileSyncCall}${JSON.stringify(curlExecutable)}, ["https://example.invalid"]);\n`,
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, entryPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain("raw-swarm-alias");
      const tsconfigAliasChecked = spawnSync(
        process.execPath,
        [
          laneHygieneChecker,
          "--test",
          relative(repoRoot, tsconfigAliasEntryPath),
        ],
        { encoding: "utf8" },
      );
      expect(tsconfigAliasChecked.status).toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
      rmSync(packageDirectory, { recursive: true, force: true });
      rmSync(tsconfigAliasEntryPath, { force: true });
    }
  }, 30_000);

  test("follows a workspace package manifest entry field", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "lane-workspace-package-entry-"),
    );
    const fixtureName = relative(rawSwarmOutputDirectory, fixtureRoot);
    const packageDirectory = resolve(
      repoRoot,
      "packages",
      `.raw-swarm-workspace-package-entry-${fixtureName}`,
    );
    const packageName = `@dnd/raw-swarm-workspace-package-entry-${fixtureName}`;
    const exportsPackageDirectory = resolve(
      repoRoot,
      "packages",
      `.raw-swarm-workspace-package-exports-${fixtureName}`,
    );
    const exportsPackageName = `@dnd/raw-swarm-workspace-package-exports-${fixtureName}`;
    const packageEntryPath = resolve(packageDirectory, "src", "runtime.ts");
    const deepEntryPath = resolve(packageDirectory, "src", "deep.ts");
    const exportsDeepEntryPath = resolve(
      exportsPackageDirectory,
      "src",
      "deep.ts",
    );
    const entryPath = resolve(fixtureRoot, "package-entry.ts");
    const deepTestPath = resolve(fixtureRoot, "package-deep-entry.ts");
    const exportsEntryPath = resolve(fixtureRoot, "exports-entry.ts");
    const forbiddenModule = ["node:", "http"].join("");
    mkdirSync(resolve(packageDirectory, "src"), { recursive: true });
    writeFileSync(
      resolve(packageDirectory, "package.json"),
      `${JSON.stringify(
        { name: packageName, private: true, main: "./src/runtime.ts" },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      packageEntryPath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    writeFileSync(
      deepEntryPath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    mkdirSync(resolve(exportsPackageDirectory, "src"), { recursive: true });
    writeFileSync(
      resolve(exportsPackageDirectory, "package.json"),
      `${JSON.stringify(
        {
          name: exportsPackageName,
          private: true,
          exports: { ".": "./src/runtime.ts" },
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      resolve(exportsPackageDirectory, "src", "runtime.ts"),
      "export const runtime = true;\n",
    );
    writeFileSync(
      exportsDeepEntryPath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    writeFileSync(entryPath, `import ${JSON.stringify(packageName)};\n`);
    writeFileSync(
      deepTestPath,
      `import ${JSON.stringify(`${packageName}/src/deep`)};\n`,
    );
    writeFileSync(
      exportsEntryPath,
      `import ${JSON.stringify(`${exportsPackageName}/src/deep`)};\n`,
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, entryPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      const output = `${checked.stdout}${checked.stderr}`;
      expect(output).toContain(relative(repoRoot, packageEntryPath));

      const deepChecked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, deepTestPath)],
        { encoding: "utf8" },
      );
      expect(deepChecked.status).not.toBe(0);
      expect(`${deepChecked.stdout}${deepChecked.stderr}`).toContain(
        relative(repoRoot, deepEntryPath),
      );

      const exportsChecked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, exportsEntryPath)],
        { encoding: "utf8" },
      );
      expect(exportsChecked.status).toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
      rmSync(packageDirectory, { recursive: true, force: true });
      rmSync(exportsPackageDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  test("inventories dynamically built consumer-distribution child entries", () => {
    const consumerDistributionTest = relative(
      repoRoot,
      resolve(
        repoRoot,
        "scripts/raw-swarm/sdk-player/consumer-distribution.test.ts",
      ),
    );
    const checked = spawnSync(
      process.execPath,
      [laneHygieneChecker, "--list-test-sources", consumerDistributionTest],
      { encoding: "utf8" },
    );
    expect(checked.status).toBe(0);
    for (const relativeEntryPath of [
      ...Object.values(CONSUMER_DISTRIBUTION_RUNTIME_ENTRYPOINTS),
      ...Object.values(CONSUMER_DISTRIBUTION_BUILD_ENTRYPOINTS),
    ]) {
      expect(checked.stdout).toContain(relativeEntryPath);
    }
  }, 30_000);

  test("lists the scenario catalogue identity and catalogue modules", () => {
    const scenarioCatalogueTest = relative(
      repoRoot,
      resolve(repoRoot, "scripts/raw-swarm/scenario-catalogue.test.ts"),
    );
    const checked = spawnSync(
      process.execPath,
      [laneHygieneChecker, "--list-test-sources", scenarioCatalogueTest],
      { encoding: "utf8" },
    );
    expect(checked.status).toBe(0);
    expect(checked.stdout.split("\n")).toEqual(
      expect.arrayContaining([
        "scripts/raw-swarm/raw-swarm-identities.ts",
        "scripts/raw-swarm/scenario-catalogue.ts",
      ]),
    );
  }, 30_000);

  test("keeps non-code Vite assets as leaf dependencies", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-vite-asset-"),
    );
    const entryPath = resolve(fixtureRoot, "asset-entry.test.ts");
    const assetPath = resolve(fixtureRoot, "styles.css");
    writeFileSync(entryPath, 'import "./styles.css?inline";\n');
    writeFileSync(assetPath, "body { color: red; }\n");
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, entryPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).toBe(0);

      const listed = spawnSync(
        process.execPath,
        [
          laneHygieneChecker,
          "--list-test-sources",
          relative(repoRoot, entryPath),
        ],
        { encoding: "utf8" },
      );
      expect(listed.status).toBe(0);
      expect(listed.stdout.split("\n")).toContain(
        relative(repoRoot, assetPath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("follows multiline imports and exports without reading comments or strings", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-multiline-module-"),
    );
    const commentOnlyPath = resolve(fixtureRoot, "comment-only.test.ts");
    const entryPath = resolve(fixtureRoot, "multiline-entry.ts");
    const reexportPath = resolve(fixtureRoot, "multiline-reexport.ts");
    const forbiddenPath = resolve(fixtureRoot, "multiline-forbidden.ts");
    const commentedPath = resolve(fixtureRoot, "commented-target.ts");
    const forbiddenModule = ["node:", "http"].join("");
    writeFileSync(
      commentedPath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    writeFileSync(
      commentOnlyPath,
      [
        `const comment = ${JSON.stringify('import "./commented-target.ts";')};`,
        '/* export { value } from "./commented-target.ts"; */',
        'const template = `require("./commented-target.ts")`;',
        "void comment; void template;",
      ].join("\n"),
    );
    writeFileSync(
      entryPath,
      [
        "import {",
        "  value,",
        '} from "./multiline-reexport.ts";',
        "export { value };",
      ].join("\n"),
    );
    writeFileSync(
      reexportPath,
      ["export {", "  value,", '} from "./multiline-forbidden.ts";'].join("\n"),
    );
    writeFileSync(
      forbiddenPath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    try {
      const commentChecked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, commentOnlyPath)],
        { encoding: "utf8" },
      );
      expect(commentChecked.status).toBe(0);

      const multilineChecked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, entryPath)],
        { encoding: "utf8" },
      );
      expect(multilineChecked.status).not.toBe(0);
      expect(`${multilineChecked.stdout}${multilineChecked.stderr}`).toContain(
        relative(repoRoot, forbiddenPath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("collects AST module forms and ignores non-module syntax", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-ast-module-"),
    );
    const forbiddenModule = ["node:", "http"].join("");
    const forbiddenSource = (path: string) =>
      writeFileSync(path, `require(${JSON.stringify(forbiddenModule)});\n`);
    const check = (entryPath: string) =>
      spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, entryPath)],
        { encoding: "utf8" },
      );
    const typeExportEntry = resolve(fixtureRoot, "type-export-entry.ts");
    const typeExportTarget = resolve(fixtureRoot, "type-export-target.ts");
    const importEqualsEntry = resolve(fixtureRoot, "import-equals-entry.ts");
    const importEqualsTarget = resolve(fixtureRoot, "import-equals-target.ts");
    const importTypeEntry = resolve(fixtureRoot, "import-type-entry.ts");
    const importTypeTarget = resolve(fixtureRoot, "import-type-target.ts");
    const templateEntry = resolve(fixtureRoot, "template-entry.ts");
    const templateTarget = resolve(fixtureRoot, "template-target.ts");
    const safeEntry = resolve(fixtureRoot, "safe-forms-entry.ts");
    const regexTarget = resolve(fixtureRoot, "regex-target.ts");
    const memberTarget = resolve(fixtureRoot, "member-target.ts");
    const nonliteralTarget = resolve(fixtureRoot, "nonliteral-target.ts");
    writeFileSync(
      typeExportEntry,
      'export type { value } from "./type-export-target.ts";\n',
    );
    forbiddenSource(typeExportTarget);
    writeFileSync(
      importEqualsEntry,
      'import imported = require("./import-equals-target.ts");\nvoid imported;\n',
    );
    forbiddenSource(importEqualsTarget);
    writeFileSync(
      importTypeEntry,
      'type Imported = import("./import-type-target.ts").Value;\nvoid (undefined as unknown as Imported);\n',
    );
    forbiddenSource(importTypeTarget);
    writeFileSync(
      templateEntry,
      [
        "void import(`./template-target.ts`);",
        "void require(`./template-target.ts`);",
      ].join("\n"),
    );
    forbiddenSource(templateTarget);
    writeFileSync(
      safeEntry,
      [
        'if (true) /require\\("\\.\\\\/regex-target\\.ts"\\)/;',
        "const member = { require: (value: string) => value, import: (value: string) => value };",
        'member.require("./member-target.ts");',
        'member.import("./member-target.ts");',
        'const specifier = "./nonliteral-target.ts";',
        "require(specifier);",
        "void import(specifier);",
      ].join("\n"),
    );
    forbiddenSource(regexTarget);
    forbiddenSource(memberTarget);
    forbiddenSource(nonliteralTarget);
    try {
      for (const [entryPath, targetPath] of [
        [typeExportEntry, typeExportTarget],
        [importEqualsEntry, importEqualsTarget],
        [importTypeEntry, importTypeTarget],
        [templateEntry, templateTarget],
      ] as const) {
        const checked = check(entryPath);
        expect(checked.status).not.toBe(0);
        expect(`${checked.stdout}${checked.stderr}`).toContain(
          relative(repoRoot, targetPath),
        );
      }
      expect(check(safeEntry).status).toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("fails closed on malformed module source", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-malformed-module-"),
    );
    const testPath = resolve(fixtureRoot, "malformed.test.ts");
    writeFileSync(
      testPath,
      'import { value } from "./missing.ts";\n/* unterminated',
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      const output = `${checked.stdout}${checked.stderr}`;
      expect(output).toContain(`${relative(repoRoot, testPath)}:2:16`);
      expect(output).toContain("'*/' expected.");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("scans every package export sibling instead of choosing one by order", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "lane-package-collision-"),
    );
    const fixtureName = relative(rawSwarmOutputDirectory, fixtureRoot);
    const packageDirectory = resolve(
      repoRoot,
      "packages",
      `.raw-swarm-package-collision-${fixtureName}`,
    );
    const packageName = `@dnd/raw-swarm-package-collision-${fixtureName}`;
    const packageSourceDirectory = resolve(packageDirectory, "src");
    const entryPath = resolve(fixtureRoot, "package-entry.ts");
    const forbiddenSourcePath = resolve(packageSourceDirectory, "index.ts");
    const forbiddenModule = ["node:", "http"].join("");
    mkdirSync(packageSourceDirectory, { recursive: true });
    writeFileSync(
      resolve(packageDirectory, "package.json"),
      `${JSON.stringify(
        {
          name: packageName,
          private: true,
          exports: { ".": "./src/index" },
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(entryPath, `import ${JSON.stringify(packageName)};\n`);
    writeFileSync(
      resolve(packageSourceDirectory, "index.js"),
      "export const harmless = true;\n",
    );
    writeFileSync(
      forbiddenSourcePath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, entryPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        relative(repoRoot, forbiddenSourcePath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
      rmSync(packageDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  test("scans every tsconfig alias sibling instead of choosing one by order", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "lane-tsconfig-collision-"),
    );
    const fixtureName = relative(rawSwarmOutputDirectory, fixtureRoot);
    const packageDirectory = resolve(
      repoRoot,
      "packages",
      `.raw-swarm-tsconfig-collision-${fixtureName}`,
    );
    const packageName = `@dnd/raw-swarm-tsconfig-collision-${fixtureName}`;
    const packageSourceDirectory = resolve(packageDirectory, "src");
    const entryPath = resolve(packageSourceDirectory, "entry.test.ts");
    const forbiddenSourcePath = resolve(packageSourceDirectory, "index.ts");
    const alias = `${packageName}/*`;
    const forbiddenModule = ["node:", "http"].join("");
    mkdirSync(packageSourceDirectory, { recursive: true });
    writeFileSync(
      resolve(packageDirectory, "package.json"),
      `${JSON.stringify({ name: packageName, private: true }, null, 2)}\n`,
    );
    writeFileSync(
      resolve(packageDirectory, "tsconfig.json"),
      `${JSON.stringify(
        { compilerOptions: { paths: { [alias]: ["src/*"] } } },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      entryPath,
      `import ${JSON.stringify(`${packageName}/index`)};\n`,
    );
    writeFileSync(
      resolve(packageSourceDirectory, "index.js"),
      "export const harmless = true;\n",
    );
    writeFileSync(
      forbiddenSourcePath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, entryPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        relative(repoRoot, forbiddenSourcePath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
      rmSync(packageDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  test("scans a package export directory ending in a supported extension", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "lane-package-extension-directory-"),
    );
    const fixtureName = relative(rawSwarmOutputDirectory, fixtureRoot);
    const packageDirectory = resolve(
      repoRoot,
      "packages",
      `.raw-swarm-package-extension-directory-${fixtureName}`,
    );
    const packageName = `@dnd/raw-swarm-package-extension-directory-${fixtureName}`;
    const extensionDirectory = resolve(packageDirectory, "src", "dir.js");
    const forbiddenSourcePath = resolve(extensionDirectory, "index.ts");
    const entryPath = resolve(fixtureRoot, "package-entry.ts");
    const forbiddenModule = ["node:", "http"].join("");
    mkdirSync(extensionDirectory, { recursive: true });
    writeFileSync(
      resolve(packageDirectory, "package.json"),
      `${JSON.stringify(
        {
          name: packageName,
          private: true,
          exports: { ".": "./src/dir.js" },
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(entryPath, `import ${JSON.stringify(packageName)};\n`);
    writeFileSync(
      forbiddenSourcePath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, entryPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        relative(repoRoot, forbiddenSourcePath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
      rmSync(packageDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  test("scans a tsconfig alias directory ending in a supported extension", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "lane-tsconfig-extension-directory-"),
    );
    const fixtureName = relative(rawSwarmOutputDirectory, fixtureRoot);
    const packageDirectory = resolve(
      repoRoot,
      "packages",
      `.raw-swarm-tsconfig-extension-directory-${fixtureName}`,
    );
    const packageName = `@dnd/raw-swarm-tsconfig-extension-directory-${fixtureName}`;
    const extensionDirectory = resolve(packageDirectory, "src", "dir.js");
    const forbiddenSourcePath = resolve(extensionDirectory, "index.ts");
    const entryPath = resolve(packageDirectory, "src", "entry.test.ts");
    const forbiddenModule = ["node:", "http"].join("");
    mkdirSync(extensionDirectory, { recursive: true });
    writeFileSync(
      resolve(packageDirectory, "package.json"),
      `${JSON.stringify({ name: packageName, private: true }, null, 2)}\n`,
    );
    writeFileSync(
      resolve(packageDirectory, "tsconfig.json"),
      `${JSON.stringify(
        { compilerOptions: { paths: { [packageName]: ["src/dir.js"] } } },
        null,
        2,
      )}\n`,
    );
    writeFileSync(entryPath, `import ${JSON.stringify(packageName)};\n`);
    writeFileSync(
      forbiddenSourcePath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, entryPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        relative(repoRoot, forbiddenSourcePath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
      rmSync(packageDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  test.each(SUPPORTED_VITEST_TEST_FILE_SUFFIXES)(
    "rejects an unclassified supported Vitest test filename %s",
    (suffix) => {
      const fixturePath = resolve(
        rawSwarmOutputDirectory,
        `unclassified-lane${suffix}`,
      );
      writeFileSync(fixturePath, "void 0;\n");
      try {
        const checked = spawnSync(process.execPath, [laneHygieneChecker], {
          encoding: "utf8",
        });
        expect(checked.status).not.toBe(0);
        expect(`${checked.stdout}${checked.stderr}`).toContain(
          "Every Raw Swarm test must be classified",
        );
      } finally {
        rmSync(fixturePath, { force: true });
      }
    },
    30_000,
  );

  test.each(SUPPORTED_VITEST_SOURCE_FILE_EXTENSIONS)(
    "transitively scans an imported Vitest-supported source extension %s",
    (extension) => {
      const fixtureRoot = mkdtempSync(
        resolve(rawSwarmOutputDirectory, "transitive-source-"),
      );
      const testPath = resolve(fixtureRoot, "fixture.test.ts");
      const importedSourcePath = resolve(fixtureRoot, `fixture${extension}`);
      const forbiddenModule = ["node:", "http"].join("");
      writeFileSync(testPath, 'import "./fixture";\n');
      writeFileSync(
        importedSourcePath,
        `require(${JSON.stringify(forbiddenModule)});\n`,
      );
      try {
        const checked = spawnSync(
          process.execPath,
          [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
          { encoding: "utf8" },
        );
        expect(checked.status).not.toBe(0);
        expect(`${checked.stdout}${checked.stderr}`).toContain(
          "forbidden capabilities",
        );
      } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    },
    30_000,
  );

  test.each([
    [".js", ".ts"],
    [".js", ".tsx"],
    [".jsx", ".tsx"],
    [".mjs", ".mts"],
    [".cjs", ".cts"],
  ] as const)(
    "scans Vite replacement source extension %s as %s",
    (importExtension, replacementExtension) => {
      const fixtureRoot = mkdtempSync(
        resolve(rawSwarmOutputDirectory, "transitive-replacement-source-"),
      );
      const testPath = resolve(fixtureRoot, "fixture.test.ts");
      const forbiddenSourcePath = resolve(
        fixtureRoot,
        `fixture${replacementExtension}`,
      );
      const forbiddenModule = ["node:", "http"].join("");
      writeFileSync(testPath, `import "./fixture${importExtension}";\n`);
      writeFileSync(
        forbiddenSourcePath,
        `require(${JSON.stringify(forbiddenModule)});\n`,
      );
      try {
        const checked = spawnSync(
          process.execPath,
          [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
          { encoding: "utf8" },
        );
        expect(checked.status).not.toBe(0);
        expect(`${checked.stdout}${checked.stderr}`).toContain(
          relative(repoRoot, forbiddenSourcePath),
        );
      } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    },
    30_000,
  );

  test.each([
    [".js", ".cjs"],
    [".mjsx", ".mtsx"],
    [".cjsx", ".ctsx"],
  ] as const)(
    "does not invent a Vite replacement from %s to %s",
    (importExtension, unselectedExtension) => {
      const fixtureRoot = mkdtempSync(
        resolve(rawSwarmOutputDirectory, "transitive-unselected-replacement-"),
      );
      const testPath = resolve(fixtureRoot, "fixture.test.ts");
      const unselectedSourcePath = resolve(
        fixtureRoot,
        `fixture${unselectedExtension}`,
      );
      const forbiddenModule = ["node:", "http"].join("");
      writeFileSync(testPath, `import "./fixture${importExtension}";\n`);
      writeFileSync(
        unselectedSourcePath,
        `require(${JSON.stringify(forbiddenModule)});\n`,
      );
      try {
        const checked = spawnSync(
          process.execPath,
          [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
          { encoding: "utf8" },
        );
        expect(checked.status).toBe(0);
      } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    },
    30_000,
  );

  test("keeps an existing exact source file authoritative", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-exact-source-file-"),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const exactSourcePath = resolve(fixtureRoot, "fixture.js");
    const replacementSourcePath = resolve(fixtureRoot, "fixture.ts");
    const forbiddenModule = ["node:", "http"].join("");
    writeFileSync(testPath, 'import "./fixture.js";\n');
    writeFileSync(exactSourcePath, "export const harmless = true;\n");
    writeFileSync(
      replacementSourcePath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test.each(["package", "tsconfig"] as const)(
    "scans replacement sources through the %s owner",
    (owner) => {
      const fixtureRoot = mkdtempSync(
        resolve(rawSwarmOutputDirectory, `transitive-${owner}-replacement-`),
      );
      const fixtureName = relative(rawSwarmOutputDirectory, fixtureRoot);
      const packageDirectory = resolve(
        repoRoot,
        "packages",
        `.raw-swarm-${owner}-replacement-${fixtureName}`,
      );
      const packageName = `@dnd/raw-swarm-${owner}-replacement-${fixtureName}`;
      const packageSourcePath = resolve(packageDirectory, "src", "fixture.ts");
      const entryPath =
        owner === "package"
          ? resolve(fixtureRoot, "package-entry.ts")
          : resolve(packageDirectory, "src", "entry.test.ts");
      const forbiddenModule = ["node:", "http"].join("");
      mkdirSync(resolve(packageDirectory, "src"), { recursive: true });
      writeFileSync(
        resolve(packageDirectory, "package.json"),
        `${JSON.stringify(
          owner === "package"
            ? {
                name: packageName,
                private: true,
                exports: { ".": "./src/fixture.js" },
              }
            : { name: packageName, private: true },
          null,
          2,
        )}\n`,
      );
      if (owner === "tsconfig") {
        writeFileSync(
          resolve(packageDirectory, "tsconfig.json"),
          `${JSON.stringify(
            {
              compilerOptions: { paths: { [packageName]: ["src/fixture.js"] } },
            },
            null,
            2,
          )}\n`,
        );
      }
      writeFileSync(entryPath, `import ${JSON.stringify(packageName)};\n`);
      writeFileSync(
        packageSourcePath,
        `require(${JSON.stringify(forbiddenModule)});\n`,
      );
      try {
        const checked = spawnSync(
          process.execPath,
          [laneHygieneChecker, "--test", relative(repoRoot, entryPath)],
          { encoding: "utf8" },
        );
        expect(checked.status).not.toBe(0);
        expect(`${checked.stdout}${checked.stderr}`).toContain(
          relative(repoRoot, packageSourcePath),
        );
      } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
        rmSync(packageDirectory, { recursive: true, force: true });
      }
    },
    30_000,
  );

  test("confirms Vitest resolves JS-family imports to TS-family siblings", () => {
    const fixtureRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-vite-replacement-confirmation-"),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const sourceModules = [
      ["js", ".js", ".ts"],
      ["jsTsx", ".js", ".tsx"],
      ["jsx", ".jsx", ".tsx"],
      ["mjs", ".mjs", ".mts"],
      ["cjs", ".cjs", ".cts"],
    ] as const;
    for (const [name, , sourceExtension] of sourceModules) {
      writeFileSync(
        resolve(fixtureRoot, `${name}${sourceExtension}`),
        `export const value = ${JSON.stringify(name)};\n`,
      );
    }
    writeFileSync(
      testPath,
      `${sourceModules
        .map(
          ([name, importExtension]) =>
            `import { value as ${name} } from "./${name}${importExtension}";`,
        )
        .join(
          "\n",
        )}\nimport { expect, test } from "vitest";\ntest("replacement imports", () => expect([${sourceModules.map(([name]) => name).join(", ")}]).toEqual(${JSON.stringify(sourceModules.map(([name]) => name))}));\n`,
    );
    try {
      const checked = spawnSync(
        "pnpm",
        [
          "exec",
          "vitest",
          "run",
          "--root",
          fixtureRoot,
          "--config",
          resolve(repoRoot, "vitest.config.ts"),
          testPath,
          "--pool=threads",
          "--maxWorkers=1",
        ],
        {
          cwd: repoRoot,
          env: { ...process.env, NODE_OPTIONS: "" },
          encoding: "utf8",
        },
      );
      expect(checked.status).toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("confirms Vitest resolves a JS-family directory import to a TS sibling", () => {
    const fixtureRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-vite-directory-replacement-confirmation-"),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const candidateDirectory = resolve(fixtureRoot, "dir.js");
    mkdirSync(candidateDirectory);
    writeFileSync(
      resolve(candidateDirectory, "index.ts"),
      'export const value = "directory-index";\n',
    );
    writeFileSync(
      resolve(fixtureRoot, "dir.ts"),
      'export const value = "replacement-sibling";\n',
    );
    writeFileSync(
      testPath,
      'import { expect, test } from "vitest";\nimport { value } from "./dir.js";\ntest("directory replacement import", () => expect(value).toBe("replacement-sibling"));\n',
    );
    try {
      const checked = spawnSync(
        "pnpm",
        [
          "exec",
          "vitest",
          "run",
          "--root",
          fixtureRoot,
          "--config",
          resolve(repoRoot, "vitest.config.ts"),
          testPath,
          "--pool=threads",
          "--maxWorkers=1",
        ],
        {
          cwd: repoRoot,
          env: { ...process.env, NODE_OPTIONS: "" },
          encoding: "utf8",
        },
      );
      expect(checked.status).toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("follows a relative directory package main before its index", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-package-main-resolution-"),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const packageDirectory = resolve(fixtureRoot, "dir");
    const packageEntryPath = resolve(packageDirectory, "entry.ts");
    const packageIndexPath = resolve(packageDirectory, "index.ts");
    const forbiddenModule = ["node:", "http"].join("");
    mkdirSync(packageDirectory, { recursive: true });
    writeFileSync(
      resolve(packageDirectory, "package.json"),
      `\uFEFF${JSON.stringify({ main: "./entry.ts" }, null, 2)}\n`,
    );
    writeFileSync(
      packageEntryPath,
      `export const value = "package-main";\nrequire(${JSON.stringify(forbiddenModule)});\n`,
    );
    writeFileSync(packageIndexPath, 'export const value = "index";\n');
    writeFileSync(
      testPath,
      'import { expect, test } from "vitest";\nimport { value } from "./dir";\ntest("package main wins over index", () => expect(value).toBe("package-main"));\n',
    );
    try {
      const runtime = spawnSync(
        "pnpm",
        [
          "exec",
          "vitest",
          "run",
          "--root",
          fixtureRoot,
          "--config",
          resolve(repoRoot, "vitest.config.ts"),
          testPath,
          "--pool=threads",
          "--maxWorkers=1",
        ],
        {
          cwd: repoRoot,
          env: { ...process.env, NODE_OPTIONS: "" },
          encoding: "utf8",
        },
      );
      expect(runtime.status).toBe(0);

      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        relative(repoRoot, packageEntryPath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test.each(["?setup=cache-buster", "#scenario-fragment"] as const)(
    "strips the Vite %s postfix before relative resolution",
    (postfix) => {
      const fixtureRoot = mkdtempSync(
        resolve(rawSwarmOutputDirectory, "transitive-vite-postfix-"),
      );
      const testPath = resolve(fixtureRoot, "fixture.test.ts");
      const forbiddenSourcePath = resolve(fixtureRoot, "fixture.ts");
      const forbiddenModule = ["node:", "http"].join("");
      writeFileSync(testPath, `import \"./fixture${postfix}\";\n`);
      writeFileSync(
        forbiddenSourcePath,
        `require(${JSON.stringify(forbiddenModule)});\n`,
      );
      try {
        const checked = spawnSync(
          process.execPath,
          [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
          { encoding: "utf8" },
        );
        expect(checked.status).not.toBe(0);
        expect(`${checked.stdout}${checked.stderr}`).toContain(
          relative(repoRoot, forbiddenSourcePath),
        );
      } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
      }
    },
    30_000,
  );

  test("matches Vite client package-entry fields and conditional branches", async () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-package-entry-forms-"),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const forbiddenModule = ["node:", "http"].join("");
    const packageCases = [
      {
        name: "exports",
        manifest: {
          exports: {
            ".": {
              browser: "./browser.ts",
              import: "./import.ts",
              default: "./default.ts",
            },
          },
        },
        selected: "browser.ts",
        runtimeSelected: "import.ts",
        candidates: ["browser.ts", "import.ts", "default.ts"],
      },
      {
        name: "browser",
        manifest: {
          browser: "./browser.ts",
          module: "./module.ts",
          "jsnext:main": "./jsnext-main.ts",
          jsnext: "./jsnext.ts",
          main: "./main.ts",
        },
        selected: "browser.ts",
        runtimeSelected: "main.ts",
        candidates: [
          "browser.ts",
          "module.ts",
          "jsnext-main.ts",
          "jsnext.ts",
          "main.ts",
        ],
      },
      {
        name: "browser-map",
        manifest: {
          browser: { "./src.ts": "./browser.ts" },
          main: "./src.ts",
        },
        selected: "browser.ts",
        runtimeSelected: "src.ts",
        candidates: ["browser.ts", "src.ts"],
      },
      {
        name: "module",
        manifest: {
          module: "./module.ts",
          "jsnext:main": "./jsnext-main.ts",
          jsnext: "./jsnext.ts",
          main: "./main.ts",
        },
        selected: "module.ts",
        runtimeSelected: "main.ts",
        candidates: ["module.ts", "jsnext-main.ts", "jsnext.ts", "main.ts"],
      },
      {
        name: "jsnext-main",
        manifest: {
          "jsnext:main": "./jsnext-main.ts",
          jsnext: "./jsnext.ts",
          main: "./main.ts",
        },
        selected: "jsnext-main.ts",
        runtimeSelected: "main.ts",
        candidates: ["jsnext-main.ts", "jsnext.ts", "main.ts"],
      },
      {
        name: "jsnext",
        manifest: { jsnext: "./jsnext.ts", main: "./main.ts" },
        selected: "jsnext.ts",
        runtimeSelected: "main.ts",
        candidates: ["jsnext.ts", "main.ts"],
      },
      {
        name: "main",
        manifest: { main: "./main.ts" },
        selected: "main.ts",
        runtimeSelected: "main.ts",
        candidates: ["main.ts"],
      },
      {
        name: "index",
        manifest: {},
        selected: "index.ts",
        runtimeSelected: "index.ts",
        candidates: ["index.ts"],
      },
    ] as const;
    for (const packageCase of packageCases) {
      const packageDirectory = resolve(fixtureRoot, packageCase.name);
      mkdirSync(packageDirectory, { recursive: true });
      writeFileSync(
        resolve(packageDirectory, "package.json"),
        `${JSON.stringify(packageCase.manifest, null, 2)}\n`,
      );
      for (const candidate of packageCase.candidates) {
        writeFileSync(
          resolve(packageDirectory, candidate),
          `export const value = ${JSON.stringify(packageCase.runtimeSelected === candidate ? packageCase.name : `unused-${candidate}`)};\n`,
        );
      }
    }
    writeFileSync(
      testPath,
      `${packageCases
        .map(
          ({ name }) =>
            `import { value as ${name.replaceAll("-", "_")} } from "./${name}";`,
        )
        .join(
          "\n",
        )}\nimport { expect, test } from "vitest";\ntest("package entry forms", () => expect([${packageCases.map(({ name }) => name.replaceAll("-", "_")).join(", ")}]).toEqual(${JSON.stringify(packageCases.map(({ name }) => name))}));\n`,
    );
    try {
      const runtime = spawnSync(
        "pnpm",
        [
          "exec",
          "vitest",
          "run",
          "--root",
          fixtureRoot,
          "--config",
          resolve(repoRoot, "vitest.config.ts"),
          testPath,
          "--pool=threads",
          "--maxWorkers=1",
        ],
        {
          cwd: repoRoot,
          env: { ...process.env, NODE_OPTIONS: "" },
          encoding: "utf8",
        },
      );
      expect(runtime.status).toBe(0);

      const vitestPath = testRequire.resolve("vitest");
      const vitePackageJsonPath = testRequire.resolve("vite/package.json", {
        paths: [resolve(vitestPath, "..")],
      });
      const vite = await import(
        pathToFileURL(resolve(vitePackageJsonPath, "../dist/node/index.js"))
          .href
      );
      const server = await vite.createServer({
        root: fixtureRoot,
        configFile: false,
        logLevel: "silent",
        resolve: {
          mainFields: ["browser", "module", "jsnext:main", "jsnext"],
        },
      });
      try {
        for (const packageCase of packageCases) {
          const resolved = await server.pluginContainer.resolveId(
            `./${packageCase.name}`,
            testPath,
          );
          expect(resolved?.id).toBe(
            resolve(fixtureRoot, packageCase.name, packageCase.selected),
          );
        }
      } finally {
        await server.close();
      }

      for (const packageCase of packageCases) {
        const selectedPath = resolve(
          fixtureRoot,
          packageCase.name,
          packageCase.selected,
        );
        writeFileSync(
          selectedPath,
          `require(${JSON.stringify(forbiddenModule)});\n`,
        );
        try {
          const checked = spawnSync(
            process.execPath,
            [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
            { encoding: "utf8" },
          );
          expect(checked.status).not.toBe(0);
          expect(`${checked.stdout}${checked.stderr}`).toContain(
            relative(repoRoot, selectedPath),
          );
        } finally {
          writeFileSync(
            selectedPath,
            `export const value = ${JSON.stringify(packageCase.name)};\n`,
          );
        }
      }
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("follows nested package entries and terminates package-entry cycles", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-nested-package-entry-"),
    );
    const nestedEntryTestPath = resolve(fixtureRoot, "nested.test.ts");
    const nestedPackageDirectory = resolve(fixtureRoot, "nested");
    const nestedDirectory = resolve(nestedPackageDirectory, "child");
    const nestedEntryPath = resolve(nestedDirectory, "entry.ts");
    const cycleTestPath = resolve(fixtureRoot, "cycle.test.ts");
    const cyclePackageDirectory = resolve(fixtureRoot, "cycle");
    const cycleChildDirectory = resolve(cyclePackageDirectory, "child");
    mkdirSync(nestedDirectory, { recursive: true });
    mkdirSync(cycleChildDirectory, { recursive: true });
    writeFileSync(
      resolve(nestedPackageDirectory, "package.json"),
      `${JSON.stringify({ main: "./child" }, null, 2)}\n`,
    );
    writeFileSync(
      resolve(nestedDirectory, "package.json"),
      `${JSON.stringify({ main: "./entry.ts" }, null, 2)}\n`,
    );
    writeFileSync(
      nestedEntryPath,
      `require(${JSON.stringify(["node:", "http"].join(""))});\n`,
    );
    writeFileSync(nestedEntryTestPath, 'import "./nested";\n');
    writeFileSync(
      resolve(cyclePackageDirectory, "package.json"),
      `${JSON.stringify({ main: "./child" }, null, 2)}\n`,
    );
    writeFileSync(
      resolve(cycleChildDirectory, "package.json"),
      `${JSON.stringify({ main: ".." }, null, 2)}\n`,
    );
    writeFileSync(cycleTestPath, 'import "./cycle";\n');
    try {
      const nestedChecked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, nestedEntryTestPath)],
        { encoding: "utf8" },
      );
      expect(nestedChecked.status).not.toBe(0);
      expect(`${nestedChecked.stdout}${nestedChecked.stderr}`).toContain(
        relative(repoRoot, nestedEntryPath),
      );

      const cycleChecked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, cycleTestPath)],
        { encoding: "utf8" },
      );
      expect(cycleChecked.status).toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("follows package imports conditions, arrays, and patterns", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-package-imports-"),
    );
    const fixtureName = relative(rawSwarmOutputDirectory, fixtureRoot);
    const packageDirectory = resolve(
      repoRoot,
      "packages",
      `.raw-swarm-package-imports-${fixtureName}`,
    );
    const packageSourceDirectory = resolve(
      packageDirectory,
      "src",
      "components",
    );
    const entryPath = resolve(packageDirectory, "src", "imports.test.ts");
    const importSpecifier = "#/components/forbidden";
    const forbiddenModule = ["node:", "http"].join("");
    const candidatePaths = [
      resolve(packageSourceDirectory, "forbidden-development.ts"),
      resolve(packageSourceDirectory, "forbidden-default.ts"),
      resolve(packageSourceDirectory, "forbidden-fallback.ts"),
    ];
    mkdirSync(packageSourceDirectory, { recursive: true });
    writeFileSync(
      resolve(packageDirectory, "package.json"),
      `${JSON.stringify(
        {
          name: `raw-swarm-package-imports-${fixtureName}`,
          private: true,
          type: "module",
          imports: {
            "#/*": [
              {
                development: "./src/*-development.ts",
                default: "./src/*-default.ts",
              },
              "./src/*-fallback.ts",
            ],
          },
        },
        null,
        2,
      )}\n`,
    );
    for (const candidatePath of candidatePaths) {
      writeFileSync(candidatePath, 'export const value = "development";\n');
    }
    writeFileSync(
      entryPath,
      `import { expect, test } from "vitest";
import { value } from ${JSON.stringify(importSpecifier)};
test("package imports", () => expect(value).toBe("development"));
`,
    );
    try {
      const runtime = spawnSync(
        "pnpm",
        [
          "exec",
          "vitest",
          "run",
          "--root",
          packageDirectory,
          "--config",
          resolve(repoRoot, "vitest.config.ts"),
          entryPath,
          "--pool=threads",
          "--maxWorkers=1",
        ],
        {
          cwd: repoRoot,
          env: { ...process.env, NODE_OPTIONS: "" },
          encoding: "utf8",
        },
      );
      expect(runtime.status).toBe(0);

      for (const candidatePath of candidatePaths) {
        writeFileSync(
          candidatePath,
          `require(${JSON.stringify(forbiddenModule)});\n`,
        );
        try {
          const checked = spawnSync(
            process.execPath,
            [laneHygieneChecker, "--test", relative(repoRoot, entryPath)],
            { encoding: "utf8" },
          );
          expect(checked.status).not.toBe(0);
          expect(`${checked.stdout}${checked.stderr}`).toContain(
            relative(repoRoot, candidatePath),
          );
        } finally {
          writeFileSync(candidatePath, 'export const value = "development";\n');
        }
      }
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
      rmSync(packageDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  test("fails closed on malformed package imports targets", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-invalid-package-imports-"),
    );
    const fixtureName = relative(rawSwarmOutputDirectory, fixtureRoot);
    const packageDirectory = resolve(
      repoRoot,
      "packages",
      `.raw-swarm-invalid-package-imports-${fixtureName}`,
    );
    const entryPath = resolve(packageDirectory, "src", "imports.test.ts");
    mkdirSync(resolve(packageDirectory, "src"), { recursive: true });
    writeFileSync(
      resolve(packageDirectory, "package.json"),
      `${JSON.stringify(
        {
          name: `raw-swarm-invalid-package-imports-${fixtureName}`,
          private: true,
          imports: { "#/*": 42 },
        },
        null,
        2,
      )}\n`,
    );
    writeFileSync(entryPath, 'import "#/components/invalid";\n');
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, entryPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        "Could not resolve deterministic package imports",
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
      rmSync(packageDirectory, { recursive: true, force: true });
    }
  }, 30_000);

  test.each(["setup", "characters"] as const)(
    "scans tracked scenario %s modules loaded by the runtime owner",
    (kind) => {
      const fixtureRoot = mkdtempSync(
        resolve(rawSwarmOutputDirectory, "transitive-scenario-runtime-"),
      );
      const runtimePath = resolve(
        repoRoot,
        "scripts/raw-swarm/sdk-player",
        kind === "setup"
          ? "scenario-setup-runtime.ts"
          : "scenario-character-runtime.ts",
      );
      const scenarioRoot = resolve(
        repoRoot,
        "scripts/raw-swarm/sdk-player/scenarios",
      );
      const syntheticScenarioPath = resolve(
        scenarioRoot,
        `raw-swarm-hygiene-${process.pid}-${Date.now()}.${kind}.ts`,
      );
      const testPath = resolve(fixtureRoot, "runtime.test.ts");
      const forbiddenModule = ["node:", "http"].join("");
      writeFileSync(
        testPath,
        `import ${JSON.stringify(relative(fixtureRoot, runtimePath))};\n`,
      );
      writeFileSync(
        syntheticScenarioPath,
        `require(${JSON.stringify(forbiddenModule)});\n`,
      );
      try {
        const checked = spawnSync(
          process.execPath,
          [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
          { encoding: "utf8" },
        );
        expect(checked.status).not.toBe(0);
        expect(`${checked.stdout}${checked.stderr}`).toContain(
          relative(repoRoot, syntheticScenarioPath),
        );
      } finally {
        rmSync(fixtureRoot, { recursive: true, force: true });
        rmSync(syntheticScenarioPath, { force: true });
      }
    },
    30_000,
  );

  test("fails closed on malformed or non-file package manifests", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-invalid-package-manifest-"),
    );
    const malformedTestPath = resolve(fixtureRoot, "malformed.test.ts");
    const malformedDirectory = resolve(fixtureRoot, "malformed");
    const nonFileTestPath = resolve(fixtureRoot, "non-file.test.ts");
    const nonFileDirectory = resolve(fixtureRoot, "non-file");
    mkdirSync(malformedDirectory, { recursive: true });
    mkdirSync(nonFileDirectory, { recursive: true });
    writeFileSync(resolve(malformedDirectory, "package.json"), "{\n");
    mkdirSync(resolve(nonFileDirectory, "package.json"));
    writeFileSync(malformedTestPath, 'import "./malformed";\n');
    writeFileSync(nonFileTestPath, 'import "./non-file";\n');
    try {
      const malformedChecked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, malformedTestPath)],
        { encoding: "utf8" },
      );
      expect(malformedChecked.status).not.toBe(0);
      expect(`${malformedChecked.stdout}${malformedChecked.stderr}`).toContain(
        "Could not read deterministic package manifest",
      );

      const nonFileChecked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, nonFileTestPath)],
        { encoding: "utf8" },
      );
      expect(nonFileChecked.status).not.toBe(0);
      expect(`${nonFileChecked.stdout}${nonFileChecked.stderr}`).toContain(
        "Could not read deterministic package manifest",
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("fails closed on a package entry outside the repository", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-outside-package-entry-"),
    );
    const outsideRoot = mkdtempSync(resolve(tmpdir(), "dnd-outside-entry-"));
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const symlinkTestPath = resolve(fixtureRoot, "symlink.test.ts");
    const symlinkSuffixTestPath = resolve(
      fixtureRoot,
      "symlink-suffix.test.ts",
    );
    const packageDirectory = resolve(fixtureRoot, "dir");
    const symlinkPath = resolve(fixtureRoot, "linked-dir");
    const outsideSourcePath = resolve(outsideRoot, "entry.ts");
    mkdirSync(packageDirectory, { recursive: true });
    writeFileSync(
      resolve(packageDirectory, "package.json"),
      `${JSON.stringify(
        { main: relative(packageDirectory, outsideSourcePath) },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      outsideSourcePath,
      `require(${JSON.stringify(["node:", "http"].join(""))});\n`,
    );
    writeFileSync(testPath, 'import "./dir";\n');
    symlinkSync(outsideRoot, symlinkPath, "dir");
    writeFileSync(symlinkTestPath, 'import "./linked-dir";\n');
    writeFileSync(
      symlinkSuffixTestPath,
      'import "./linked-dir/missing-source";\n',
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        "escapes the repository",
      );

      const symlinkChecked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, symlinkTestPath)],
        { encoding: "utf8" },
      );
      expect(symlinkChecked.status).not.toBe(0);
      expect(`${symlinkChecked.stdout}${symlinkChecked.stderr}`).toContain(
        "resolves outside the repository",
      );

      const symlinkSuffixChecked = spawnSync(
        process.execPath,
        [
          laneHygieneChecker,
          "--test",
          relative(repoRoot, symlinkSuffixTestPath),
        ],
        { encoding: "utf8" },
      );
      expect(symlinkSuffixChecked.status).not.toBe(0);
      expect(
        `${symlinkSuffixChecked.stdout}${symlinkSuffixChecked.stderr}`,
      ).toContain("resolves outside the repository");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
      rmSync(outsideRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("does not treat a non-relative package export as a file path", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-invalid-package-export-"),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const packageDirectory = resolve(fixtureRoot, "dir");
    const invalidTargetPath = resolve(packageDirectory, "invalid.ts");
    mkdirSync(packageDirectory, { recursive: true });
    writeFileSync(
      resolve(packageDirectory, "package.json"),
      `${JSON.stringify(
        { exports: { ".": "invalid.ts" }, main: "./safe.ts" },
        null,
        2,
      )}\n`,
    );
    writeFileSync(
      invalidTargetPath,
      `require(${JSON.stringify(["node:", "http"].join(""))});\n`,
    );
    writeFileSync(
      resolve(packageDirectory, "safe.ts"),
      "export const safe = true;\n",
    );
    writeFileSync(testPath, 'import "./dir";\n');
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("uses the canonical directory for an in-repository package symlink", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-symlink-package-entry-"),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const realContainer = resolve(fixtureRoot, "real");
    const realPackageDirectory = resolve(realContainer, "package");
    const linkedContainer = resolve(fixtureRoot, "linked");
    const linkedPackageDirectory = resolve(linkedContainer, "package");
    const canonicalEntryPath = resolve(realContainer, "entry.ts");
    mkdirSync(realPackageDirectory, { recursive: true });
    mkdirSync(linkedContainer, { recursive: true });
    writeFileSync(
      resolve(realPackageDirectory, "package.json"),
      `${JSON.stringify({ main: "../entry.ts" }, null, 2)}\n`,
    );
    writeFileSync(
      canonicalEntryPath,
      `require(${JSON.stringify(["node:", "http"].join(""))});\n`,
    );
    writeFileSync(
      resolve(linkedContainer, "entry.ts"),
      "export const safe = true;\n",
    );
    symlinkSync(realPackageDirectory, linkedPackageDirectory, "dir");
    writeFileSync(testPath, 'import "./linked/package";\n');
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        relative(repoRoot, canonicalEntryPath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("keeps directory replacement candidates file-only for runtime and hygiene", () => {
    const fixtureRoot = mkdtempSync(
      resolve(
        rawSwarmOutputDirectory,
        "transitive-vite-directory-replacement-directory-",
      ),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const candidateDirectory = resolve(fixtureRoot, "dir.js");
    const replacementDirectory = resolve(fixtureRoot, "dir.ts");
    const forbiddenModule = ["node:", "http"].join("");
    mkdirSync(candidateDirectory);
    mkdirSync(replacementDirectory);
    writeFileSync(
      resolve(candidateDirectory, "index.ts"),
      'export const value = "directory-index";\n',
    );
    writeFileSync(
      resolve(replacementDirectory, "index.ts"),
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    writeFileSync(
      testPath,
      'import { expect, test } from "vitest";\nimport { value } from "./dir.js";\ntest("directory index wins over a directory replacement", () => expect(value).toBe("directory-index"));\n',
    );
    try {
      const runtime = spawnSync(
        "pnpm",
        [
          "exec",
          "vitest",
          "run",
          "--root",
          fixtureRoot,
          "--config",
          resolve(repoRoot, "vitest.config.ts"),
          testPath,
          "--pool=threads",
          "--maxWorkers=1",
        ],
        {
          cwd: repoRoot,
          env: { ...process.env, NODE_OPTIONS: "" },
          encoding: "utf8",
        },
      );
      expect(runtime.status).toBe(0);

      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).toBe(0);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("scans every extensionless sibling instead of choosing one by order", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-sibling-collision-"),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const harmlessSiblingPath = resolve(fixtureRoot, "fixture.ts");
    const forbiddenSiblingPath = resolve(fixtureRoot, "fixture.js");
    const forbiddenModule = ["node:", "http"].join("");
    writeFileSync(testPath, 'import "./fixture";\n');
    writeFileSync(harmlessSiblingPath, "export const harmless = true;\n");
    writeFileSync(
      forbiddenSiblingPath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        relative(repoRoot, forbiddenSiblingPath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("scans extensionless siblings alongside a bare directory index", () => {
    const fixtureRoot = mkdtempSync(
      resolve(
        rawSwarmOutputDirectory,
        "transitive-directory-sibling-collision-",
      ),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const directoryPath = resolve(fixtureRoot, "fixture");
    const harmlessIndexPath = resolve(directoryPath, "index.ts");
    const forbiddenSiblingPath = resolve(fixtureRoot, "fixture.ts");
    const forbiddenModule = ["node:", "http"].join("");
    mkdirSync(directoryPath, { recursive: true });
    writeFileSync(testPath, 'import "./fixture";\n');
    writeFileSync(harmlessIndexPath, "export const harmless = true;\n");
    writeFileSync(
      forbiddenSiblingPath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        relative(repoRoot, forbiddenSiblingPath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("scans a dotted directory index for extensionless imports", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-dotted-directory-"),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const dottedDirectory = resolve(fixtureRoot, "dir.v2");
    const forbiddenIndexPath = resolve(dottedDirectory, "index.ts");
    const forbiddenModule = ["node:", "http"].join("");
    mkdirSync(dottedDirectory, { recursive: true });
    writeFileSync(testPath, 'import "./dir.v2";\n');
    writeFileSync(
      forbiddenIndexPath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        relative(repoRoot, forbiddenIndexPath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("scans a supported-extension directory index for extensionless imports", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-extension-directory-"),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const extensionDirectory = resolve(fixtureRoot, "dir.js");
    const forbiddenIndexPath = resolve(extensionDirectory, "index.ts");
    const forbiddenModule = ["node:", "http"].join("");
    mkdirSync(extensionDirectory, { recursive: true });
    writeFileSync(testPath, 'import "./dir.js";\n');
    writeFileSync(
      forbiddenIndexPath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        relative(repoRoot, forbiddenIndexPath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("scans supported siblings alongside a supported-extension directory index", () => {
    const fixtureRoot = mkdtempSync(
      resolve(
        rawSwarmOutputDirectory,
        "transitive-extension-directory-collision-",
      ),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const extensionDirectory = resolve(fixtureRoot, "dir.js");
    const harmlessIndexPath = resolve(extensionDirectory, "index.ts");
    const forbiddenSiblingPath = resolve(fixtureRoot, "dir.js.ts");
    const forbiddenModule = ["node:", "http"].join("");
    mkdirSync(extensionDirectory, { recursive: true });
    writeFileSync(testPath, 'import "./dir.js";\n');
    writeFileSync(harmlessIndexPath, "export const harmless = true;\n");
    writeFileSync(
      forbiddenSiblingPath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        relative(repoRoot, forbiddenSiblingPath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("scans the Vite JS-to-TS replacement beside a JS-family directory", () => {
    const fixtureRoot = mkdtempSync(
      resolve(
        rawSwarmOutputDirectory,
        "transitive-vite-directory-replacement-collision-",
      ),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const extensionDirectory = resolve(fixtureRoot, "dir.js");
    const harmlessIndexPath = resolve(extensionDirectory, "index.ts");
    const forbiddenSiblingPath = resolve(fixtureRoot, "dir.ts");
    const forbiddenModule = ["node:", "http"].join("");
    mkdirSync(extensionDirectory, { recursive: true });
    writeFileSync(testPath, 'import "./dir.js";\n');
    writeFileSync(harmlessIndexPath, "export const harmless = true;\n");
    writeFileSync(
      forbiddenSiblingPath,
      `require(${JSON.stringify(forbiddenModule)});\n`,
    );
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      expect(`${checked.stdout}${checked.stderr}`).toContain(
        relative(repoRoot, forbiddenSiblingPath),
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("fails precisely when a source candidate cannot be inspected", () => {
    const fixtureRoot = mkdtempSync(
      resolve(rawSwarmOutputDirectory, "transitive-unreadable-candidate-"),
    );
    const testPath = resolve(fixtureRoot, "fixture.test.ts");
    const blockedDirectory = resolve(fixtureRoot, "blocked");
    mkdirSync(blockedDirectory);
    writeFileSync(testPath, 'import "./blocked";\n');
    chmodSync(blockedDirectory, 0o000);
    try {
      const checked = spawnSync(
        process.execPath,
        [laneHygieneChecker, "--test", relative(repoRoot, testPath)],
        { encoding: "utf8" },
      );
      expect(checked.status).not.toBe(0);
      const output = `${checked.stdout}${checked.stderr}`;
      expect(output).toContain(
        "Could not inspect deterministic source candidate",
      );
      expect(output).toContain("EACCES");
    } finally {
      chmodSync(blockedDirectory, 0o700);
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test.each([
    ["missing value", ["--transcript", "--scenario", "example"]],
    [
      "duplicate flag",
      ["--transcript", "one", "--transcript", "two", "--scenario", "example"],
    ],
    ["unknown flag", ["--transcript", "one", "--unknown", "example"]],
  ])(
    "rejects recorder %s",
    (_label, args) => {
      expect(() => run(recorder, args)).toThrow();
    },
    30_000,
  );

  test("rejects a launcher scenario id before path or config construction", () => {
    expect(() => run(launcher, ['bad-id"],mcp_servers.evil={}'])).toThrow();
  });

  test("runs the instructionally read-only reviewer without nested sandboxing", () => {
    const script = readFileSync(reviewer, "utf8");
    const telemetryCli = readFileSync(
      resolve(repoRoot, "scripts/raw-swarm/model-telemetry-cli.ts"),
      "utf8",
    );
    const prompt = readFileSync(
      resolve(repoRoot, "scripts/raw-swarm/reviews/sdk-player.prompt.txt"),
      "utf8",
    );

    expect(telemetryCli).toContain("--sandbox");
    expect(telemetryCli).toContain("danger-full-access");
    expect(script).not.toContain("RAW_REVIEW_SANDBOX");
    expect(script).not.toContain("--iso-8601=milliseconds");
    expect(script).not.toContain("new Date().toISOString()");
    expect(script).toContain("sdk-review-packet-cli.ts");
    expect(script).toContain("review-output-validation.ts");
    expect(script).toContain("review-invocation-policy.ts");
    expect(script).toContain("git diff --quiet");
    expect(script).toContain("RAW_REVIEW_INVOCATION_GIT_SHA");
    expect(script).toContain("RAW_REVIEW_IMPLEMENTATION_GIT_SHA");
    expect(script).toContain("RAW_REVIEW_CURRENT_GIT_SHA");
    expect(script).toContain("RAW_REVIEW_CONTEXT_SHA256=$(sha256sum");
    expect(script).toContain('cat "$RAW_REVIEW_CONTEXT_PATH"');
    expect(script).toContain('path="%s" bytes="%s" sha256="%s"');
    expect(script).toContain("RAW_REVIEW_CONTEXT_CANDIDATE");
    expect(script).toContain("realpath --");
    expect(script).toContain(
      "RAW_REVIEW_CONTEXT_PATH escapes the repository root",
    );
    expect(script).not.toContain(
      'RAW_REVIEW_CAPABILITY_CONTEXT=$(<"$RAW_REVIEW_CONTEXT_PATH")',
    );
    expect(script).not.toContain("RAW_REVIEW_CONTEXT_READ_PLAN");
    expect(script).not.toContain("Read every listed contiguous range");
    expect(script).toContain("client-truncated");
    expect(script).toContain("model-telemetry-cli.ts");
    expect(script).not.toContain("\ncodex exec");
    expect(script).toContain(
      "boundedCapabilityProjection) RAW_REVIEW_REASONING_EFFORT=medium",
    );
    expect(script).toContain(
      'documentDeclarationSet|"") RAW_REVIEW_REASONING_EFFORT=max',
    );
    expect(script).toContain(
      '--reasoning-effort "$RAW_REVIEW_REASONING_EFFORT"',
    );
    expect(script.indexOf("model-telemetry-cli.ts")).toBeLessThan(
      script.indexOf("review-invocation-policy.ts"),
    );
    expect(prompt).toContain("{{POST_PLAY_REVIEW_ACCESS_POLICY}}");
    expect(prompt).toContain("{{POST_PLAY_REVIEW_CONTEXT_DESCRIPTION}}");
    expect(prompt).toContain(
      "SCENARIO_REVIEW.json.gitSha` is the source revision",
    );
    expect(prompt.replaceAll(/\s+/g, " ")).toContain(
      "do not classify a difference from the scenario-review source revision as a defect",
    );
    expect(prompt).not.toContain("without commands or tools");
  });

  test("gives the SDK player the surfaced protocol facts needed before its first call", () => {
    const script = readFileSync(sdkPlayerLauncher, "utf8");

    expect(script).toContain("PLAYER_CONTINUATION_PROTOCOL_REMINDER.join");
    expect(PLAYER_CONTINUATION_PROTOCOL_REMINDER.join(" ")).toContain(
      'resolveScenarioMovement({ kind: "route", session, subject, route, speedKind, fills })',
    );
    expect(PLAYER_CONTINUATION_PROTOCOL_REMINDER.join(" ")).toContain(
      "Every continue and playerConcluded outcome must include a tacticalNote string",
    );
  });

  test.each([
    ["invalid scenario", ["../repository"]],
    [
      "duplicate isolation fallback",
      [
        "goblin-warrior-skeleton-tracer",
        "--instructional-isolation",
        "--instructional-isolation",
      ],
    ],
    ["unknown option", ["goblin-warrior-skeleton-tracer", "--no-isolation"]],
    ["lone unknown option", ["goblin-warrior-skeleton-tracer", "--bogus"]],
    [
      "missing execution id",
      ["goblin-warrior-skeleton-tracer", "--execution-id"],
    ],
    [
      "missing implementation revision",
      ["goblin-warrior-skeleton-tracer", "--implementation-git-sha"],
    ],
    [
      "malformed implementation revision",
      [
        "goblin-warrior-skeleton-tracer",
        "--implementation-git-sha",
        "not-a-git-sha",
      ],
    ],
    [
      "duplicate implementation revision",
      [
        "goblin-warrior-skeleton-tracer",
        "--implementation-git-sha",
        currentGitSha,
        "--implementation-git-sha",
        currentGitSha,
      ],
    ],
    [
      "invalid evidence-set id",
      ["goblin-warrior-skeleton-tracer", "--evidence-set-id", "../outside"],
    ],
    [
      "duplicate evidence-set id",
      [
        "goblin-warrior-skeleton-tracer",
        "--evidence-set-id",
        "first",
        "--evidence-set-id",
        "second",
      ],
    ],
    [
      "path flag used as value",
      [
        "goblin-warrior-skeleton-tracer",
        "--scenario-path",
        "--setup-path",
        "scenario.setup.ts",
      ],
    ],
    [
      "path traversal outside the repository",
      [
        "goblin-warrior-skeleton-tracer",
        "--scenario-path",
        "../outside/scenario.md",
      ],
    ],
    [
      "absolute output outside the repository",
      [
        "goblin-warrior-skeleton-tracer",
        "--output-path",
        resolve(tmpdir(), "raw-swarm-outside"),
      ],
    ],
    [
      "benchmark context traversal outside the repository",
      [
        "goblin-warrior-skeleton-tracer",
        "--benchmark-context-path",
        "../outside/context.md",
      ],
    ],
    [
      "benchmark profile without context path",
      [
        "goblin-warrior-skeleton-tracer",
        "--benchmark-profile",
        "boundedCapabilityProjection",
      ],
    ],
    [
      "benchmark context path without profile",
      [
        "goblin-warrior-skeleton-tracer",
        "--benchmark-context-path",
        "scripts/raw-swarm/reviews/sdk-player.prompt.txt",
      ],
    ],
  ])(
    "rejects direct-SDK launcher %s",
    (_label, args) => {
      expect(() => run(sdkPlayerLauncher, args)).toThrow();
    },
    60_000,
  );

  test("rejects read and prospective output paths through an escaping symlink", () => {
    const boundaryRoot = mkdtempSync(
      resolve(repoRoot, "scripts/raw-swarm/out/runner-boundary-"),
    );
    const outside = mkdtempSync(resolve(tmpdir(), "dnd-runner-outside-"));
    const escape = resolve(boundaryRoot, "escape");
    symlinkSync(outside, escape, "dir");
    const escapedRead = `${relative(repoRoot, escape)}${sep}scenario.md`;
    const escapedOutput = `${relative(repoRoot, escape)}${sep}new-run`;
    try {
      expect(() =>
        run(sdkPlayerLauncher, [
          "goblin-warrior-skeleton-tracer",
          "--scenario-path",
          escapedRead,
        ]),
      ).toThrow();
      expect(() =>
        run(sdkPlayerLauncher, [
          "goblin-warrior-skeleton-tracer",
          "--output-path",
          escapedOutput,
        ]),
      ).toThrow();
    } finally {
      rmSync(boundaryRoot, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  }, 30_000);

  test("validates paired stage-plan flags before publishing an execution authority", () => {
    const outputRoot = mkdtempSync(
      resolve(repoRoot, "scripts/raw-swarm/out/runner-stage-plan-pair-"),
    );
    const output = resolve(outputRoot, "execution");
    try {
      expect(() =>
        run(sdkPlayerLauncher, [
          "goblin-warrior-skeleton-tracer",
          "--execution-id",
          "stage-plan-pair-execution",
          "--evidence-set-id",
          "stage-plan-pair-evidence",
          "--output-path",
          relative(repoRoot, output),
          "--stage-plan-path",
          "scripts/raw-swarm/README.md",
        ]),
      ).toThrow(/stage-plan-path and --stage-plan-findings-path/);
      expect(existsSync(output)).toBe(false);
      expect(existsSync(resolve(output, "execution.json"))).toBe(false);
    } finally {
      rmSync(outputRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("loads the direct-SDK launcher before rejecting invalid input", () => {
    expect(() => run(sdkPlayerLauncher, [])).toThrowError(
      /Usage: run-sdk-player\.ts/,
    );
  }, 30_000);

  test("rejects a direct model entrypoint without the public wrapper guard", () => {
    const environment = { ...process.env };
    delete environment.DND_RAW_SWARM_MODEL_ENTRYPOINT_GUARD;
    delete environment.DND_RAW_SWARM_MODEL_LANE;
    const result = spawnSync("pnpm", ["exec", "tsx", sdkPlayerLauncher], {
      cwd: repoRoot,
      env: environment,
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain(
      "must be launched through the public model wrapper",
    );
  }, 30_000);

  test("rejects forged wrapper environment without a held canonical lane lock", () => {
    const environment: NodeJS.ProcessEnv = {
      ...modelEntryPointTestEnvironment,
    };
    delete environment.DND_RAW_SWARM_MODEL_LANE_FD;
    delete environment.DND_RAW_SWARM_MODEL_LANE_OWNER_PID;
    delete environment.DND_RAW_SWARM_MODEL_LANE_OWNER_START_TIME;
    const result = spawnSync("pnpm", ["exec", "tsx", sdkPlayerLauncher], {
      cwd: repoRoot,
      env: environment,
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain(
      "must be launched through the public model wrapper",
    );
  }, 30_000);

  test("rejects a same-name lane lock outside the Git common directory", () => {
    const forgedRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-forged-model-lane-lock-"),
    );
    const forgedLockPath = resolve(forgedRoot, "raw-swarm-model-lane-1.lock");
    try {
      const result = spawnSync(
        "bash",
        [
          "-c",
          [
            "set -euo pipefail",
            'exec 3>"$1"',
            "flock --exclusive --nonblock 3",
            "owner_pid=$$",
            "owner_start_time=$(sed 's/^.*) //' \"/proc/$owner_pid/stat\" | awk '{ print $20 }')",
            'export DND_RAW_SWARM_MODEL_LANE="1"',
            'export DND_RAW_SWARM_MODEL_LANE_GUARD="v1"',
            'export DND_RAW_SWARM_MODEL_LANE_LOCK_PATH="$1"',
            'export DND_RAW_SWARM_MODEL_LANE_FD="3"',
            'export DND_RAW_SWARM_MODEL_LANE_OWNER_PID="$owner_pid"',
            'export DND_RAW_SWARM_MODEL_LANE_OWNER_START_TIME="$owner_start_time"',
            'exec "$2" "$3" --assert',
          ].join("\n"),
          "forged-model-lane",
          forgedLockPath,
          process.execPath,
          modelLaneCapability,
        ],
        {
          cwd: repoRoot,
          env: process.env,
          encoding: "utf8",
        },
      );
      expect(result.status).toBe(64);
      expect(`${result.stdout}${result.stderr}`).toContain(
        "canonical model-lane lock",
      );
    } finally {
      rmSync(forgedRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("rejects stale supervision identities before signal decisions", () => {
    const result = spawnSync(
      "bash",
      [
        "-c",
        [
          "set -euo pipefail",
          'source "$1"',
          "supervision_helper_pid=$$",
          "supervision_helper_start_time=0",
          "signal_called=false",
          "kill() { signal_called=true; return 0; }",
          "supervision_signal_helper TERM",
          'if [[ "$signal_called" == true ]]; then exit 10; fi',
          "exit 0",
        ].join("\n"),
        "stale-supervision-identity",
        processSupervision,
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );
    expect(result.status).toBe(0);
  });

  test("public wrapper supplies the locked lane capability", () => {
    const commandRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-model-wrapper-git-"),
    );
    const commonRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-model-wrapper-common-"),
    );
    const fakeGit = resolve(commandRoot, "git");
    writeFileSync(
      fakeGit,
      String.raw`#!/bin/sh
set -eu
case "$*" in
  *--git-common-dir*) printf '%s\n' '${commonRoot}' ;;
  *) exit 1 ;;
esac
`,
    );
    chmodSync(fakeGit, 0o755);
    try {
      const result = spawnSync(
        modelLaneLock,
        ["trial", process.execPath, modelLaneCapability, "--assert"],
        {
          cwd: repoRoot,
          env: modelLaneTestEnvironment(
            commandRoot,
            new Date(Date.now() + 60_000).toISOString(),
          ),
          encoding: "utf8",
        },
      );
      expect(result.status).toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain("acquired lane");
    } finally {
      rmSync(commandRoot, { recursive: true, force: true });
      rmSync(commonRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("public wrapper preserves the lane capability through the model runner", () => {
    const commandRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-model-runner-command-"),
    );
    const commonRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-model-runner-common-"),
    );
    const fakeGit = resolve(commandRoot, "git");
    const fakeCodex = resolve(commandRoot, "codex");
    writeFileSync(
      fakeGit,
      String.raw`#!/bin/sh
set -eu
case "$*" in
  *--git-common-dir*) printf '%s\n' '${commonRoot}' ;;
  *status*) exit 0 ;;
  *rev-parse\ HEAD*) printf '%s\n' '${currentGitSha}' ;;
  *) exit 1 ;;
esac
`,
    );
    writeFileSync(fakeCodex, "#!/bin/sh\nexit 0\n");
    chmodSync(fakeGit, 0o755);
    chmodSync(fakeCodex, 0o755);
    try {
      const result = spawnSync(
        modelLaneLock,
        ["trial", process.execPath, modelBackedRunner, "trial", "freeplay"],
        {
          cwd: repoRoot,
          env: {
            ...modelLaneTestEnvironment(
              commandRoot,
              new Date(Date.now() + 60_000).toISOString(),
            ),
            RAW_SWARM_EXPECTED_GIT_SHA: currentGitSha,
          },
          encoding: "utf8",
        },
      );
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}${result.stderr}`).toContain(
        "Usage: run-freeplay.ts",
      );
      expect(`${result.stdout}${result.stderr}`).not.toContain(
        "must be launched through the public model wrapper",
      );
    } finally {
      rmSync(commandRoot, { recursive: true, force: true });
      rmSync(commonRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("accepts a held canonical lane lock before direct-entrypoint validation", () => {
    const result = spawnSync("pnpm", ["exec", "tsx", sdkPlayerLauncher], {
      cwd: repoRoot,
      env: modelEntryPointTestEnvironment,
      stdio: inheritedModelLaneStdio(),
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain(
      "Usage: run-sdk-player.ts",
    );
    expect(`${result.stdout}${result.stderr}`).not.toContain(
      "must be launched through the public model wrapper",
    );
  }, 30_000);

  test("routes freeplay through the canonical model invocation owner", () => {
    const script = readFileSync(launcher, "utf8");
    expect(script).toContain("runCodexInvocation");
    expect(script).toContain('operation: { tag: "noOutput" }');
    expect(script).toContain("invocationEventsPath");
    expect(script).toContain("invocationLedgerPath");
    expect(script).not.toMatch(/spawnSync\(\s*["']codex["']/);
  });

  test("bounds model-lane acquisition by the campaign deadline", async () => {
    const commandRoot = mkdtempSync(resolve(tmpdir(), "dnd-model-lane-git-"));
    const commonRoot = mkdtempSync(resolve(tmpdir(), "dnd-model-lane-common-"));
    const fakeGit = resolve(commandRoot, "git");
    writeFileSync(
      fakeGit,
      `#!/bin/sh
set -eu
case "$*" in
  *--git-common-dir*) printf '%s\\n' '${commonRoot}' ;;
  *) exit 1 ;;
esac
`,
    );
    chmodSync(fakeGit, 0o755);
    const holders = [1, 2, 3].map((lane) =>
      spawn(
        "flock",
        [
          "--exclusive",
          resolve(commonRoot, `raw-swarm-model-lane-${lane}.lock`),
          "sleep",
          "5",
        ],
        { stdio: "ignore" },
      ),
    );
    try {
      await new Promise((resolveReady) => setTimeout(resolveReady, 100));
      const result = spawnSync(modelLaneLock, ["campaign", "true"], {
        cwd: repoRoot,
        env: modelLaneTestEnvironment(
          commandRoot,
          new Date(Date.now() + 1_200).toISOString(),
        ),
        encoding: "utf8",
      });
      expect(result.status).toBe(124);
      expect(`${result.stdout}${result.stderr}`).toContain(
        "while acquiring a lane",
      );
    } finally {
      await Promise.all(
        holders.map(
          (holder) =>
            new Promise<void>((resolveExited) => {
              if (holder.exitCode !== null) {
                resolveExited();
                return;
              }
              holder.once("exit", () => resolveExited());
              holder.kill("SIGTERM");
            }),
        ),
      );
      rmSync(commandRoot, { recursive: true, force: true });
      rmSync(commonRoot, { recursive: true, force: true });
    }
  }, 15_000);

  test("keeps the model lane held while a setsid child with cleared environment settles", async () => {
    const commandRoot = mkdtempSync(resolve(tmpdir(), "dnd-model-setsid-git-"));
    const commonRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-model-setsid-common-"),
    );
    const fakeGit = resolve(commandRoot, "git");
    const childPidPath = resolve(commandRoot, "detached-child.pid");
    const termPath = resolve(commandRoot, "detached-child.term");
    const exitPath = resolve(commandRoot, "detached-child.exit");
    const acquiredPath = resolve(commandRoot, "contender.acquired");
    const lanePath = resolve(commonRoot, "raw-swarm-model-lane-1.lock");
    writeFileSync(
      fakeGit,
      `#!/bin/sh
set -eu
case "$*" in
  *--git-common-dir*) printf '%s\\n' '${commonRoot}' ;;
  *) exit 1 ;;
esac
`,
    );
    chmodSync(fakeGit, 0o755);
    const detachedChildSource = [
      'const fs = require("node:fs");',
      `fs.writeFileSync(${JSON.stringify(childPidPath)}, String(process.pid));`,
      `process.on("SIGTERM", () => { fs.writeFileSync(${JSON.stringify(termPath)}, "term"); setTimeout(() => { fs.writeFileSync(${JSON.stringify(exitPath)}, "exit"); process.exit(0); }, 1000); });`,
      "setInterval(() => {}, 1000);",
    ].join(" ");
    const commandSource = [
      'const { spawn } = require("node:child_process");',
      `const detached = spawn(process.execPath, ["-e", ${JSON.stringify(detachedChildSource)}], { detached: true, env: {}, stdio: "ignore" });`,
      "detached.unref();",
      "setInterval(() => {}, 1000);",
    ].join(" ");
    let contender: ReturnType<typeof spawn> | undefined;
    const wrapper = spawn(
      modelLaneLock,
      ["campaign", process.execPath, "-e", commandSource],
      {
        cwd: repoRoot,
        env: {
          ...modelLaneTestEnvironment(
            commandRoot,
            new Date(Date.now() + 1_200).toISOString(),
          ),
        },
        stdio: "ignore",
      },
    );
    try {
      await waitForFile(childPidPath);
      const childPid = Number(readFileSync(childPidPath, "utf8").trim());
      expect(Number.isSafeInteger(childPid)).toBe(true);
      expect(processIsLive(childPid)).toBe(true);

      contender = spawn(
        "bash",
        [
          "-c",
          'set -euo pipefail; exec 9>"$1"; while ! flock --exclusive --nonblock 9; do sleep 0.01; done; printf acquired > "$2"',
          "lane-contender",
          lanePath,
          acquiredPath,
        ],
        { stdio: "ignore" },
      );

      await waitForFile(termPath);
      expect(processIsLive(childPid)).toBe(true);
      expect(existsSync(acquiredPath)).toBe(false);

      await waitForFile(exitPath, 3_000);
      await waitForProcessExit(childPid, 3_000);
      await waitForFile(acquiredPath, 3_000);
      await waitForProcessExit(contender.pid, 3_000);
      await waitForProcessExit(wrapper.pid, 3_000);
      expect(wrapper.exitCode).not.toBe(0);
    } finally {
      if (wrapper.exitCode === null) wrapper.kill("SIGKILL");
      if (contender !== undefined && contender.exitCode === null) {
        contender.kill("SIGKILL");
      }
      if (existsSync(childPidPath)) {
        const childPid = Number(readFileSync(childPidPath, "utf8").trim());
        if (Number.isSafeInteger(childPid) && processIsLive(childPid)) {
          process.kill(childPid, "SIGKILL");
        }
      }
      rmSync(commandRoot, { recursive: true, force: true });
      rmSync(commonRoot, { recursive: true, force: true });
    }
  }, 20_000);

  test("settles a detached model child before lane reacquisition at the campaign deadline", async () => {
    const commandRoot = mkdtempSync(resolve(tmpdir(), "dnd-model-lane-git-"));
    const commonRoot = mkdtempSync(resolve(tmpdir(), "dnd-model-lane-common-"));
    const fakeGit = resolve(commandRoot, "git");
    const childPidPath = resolve(commandRoot, "detached-child.pid");
    writeFileSync(
      fakeGit,
      `#!/bin/sh
set -eu
case "$*" in
  *--git-common-dir*) printf '%s\\n' '${commonRoot}' ;;
  *) exit 1 ;;
esac
`,
    );
    chmodSync(fakeGit, 0o755);
    const detachedChildSource = [
      'const fs = require("node:fs");',
      "fs.writeFileSync(process.env.RAW_SWARM_CHILD_PID, String(process.pid));",
      'process.on("SIGTERM", () => {});',
      "setInterval(() => {}, 1000);",
    ].join(" ");
    const commandSource = [
      'const { spawn } = require("node:child_process");',
      `const detached = spawn(process.execPath, ["-e", ${JSON.stringify(detachedChildSource)}], { detached: true, stdio: "ignore" });`,
      "detached.unref();",
      "setInterval(() => {}, 1000);",
    ].join(" ");
    const wrapper = spawn(
      modelLaneLock,
      ["campaign", process.execPath, "-e", commandSource],
      {
        cwd: repoRoot,
        env: {
          ...modelLaneTestEnvironment(
            commandRoot,
            new Date(Date.now() + 1_200).toISOString(),
          ),
          RAW_SWARM_CHILD_PID: childPidPath,
        },
        stdio: "ignore",
      },
    );
    try {
      await waitForFile(childPidPath);
      const childPid = Number(readFileSync(childPidPath, "utf8").trim());
      expect(Number.isSafeInteger(childPid)).toBe(true);
      expect(processIsLive(childPid)).toBe(true);

      const result = await new Promise<number>(
        (resolveResult, rejectResult) => {
          wrapper?.once("error", rejectResult);
          wrapper?.once("close", (status, signal) => {
            if (signal !== null) {
              rejectResult(new Error(`Wrapper stopped with ${signal}.`));
              return;
            }
            resolveResult(status ?? 1);
          });
        },
      );
      expect(result).toBe(137);
      await waitForProcessExit(childPid);

      const reacquired = spawnSync(
        modelLaneLock,
        ["campaign", process.execPath, modelLaneCapability, "--assert"],
        {
          cwd: repoRoot,
          env: modelLaneTestEnvironment(
            commandRoot,
            new Date(Date.now() + 1_500).toISOString(),
          ),
          encoding: "utf8",
        },
      );
      expect(reacquired.status).toBe(0);
      expect(`${reacquired.stdout}${reacquired.stderr}`).toContain(
        "acquired lane",
      );
    } finally {
      if (wrapper.exitCode === null) {
        wrapper.kill("SIGKILL");
      }
      const childPidForCleanup = existsSync(childPidPath)
        ? Number(readFileSync(childPidPath, "utf8").trim())
        : undefined;
      if (
        childPidForCleanup !== undefined &&
        processIsLive(childPidForCleanup)
      ) {
        process.kill(childPidForCleanup, "SIGKILL");
      }
      rmSync(commandRoot, { recursive: true, force: true });
      rmSync(commonRoot, { recursive: true, force: true });
    }
  }, 20_000);

  test("terminates a detached model child before lane reacquisition when its owner dies", async () => {
    const commandRoot = mkdtempSync(resolve(tmpdir(), "dnd-model-owner-git-"));
    const commonRoot = mkdtempSync(
      resolve(tmpdir(), "dnd-model-owner-common-"),
    );
    const fakeGit = resolve(commandRoot, "git");
    const ownerScript = resolve(commandRoot, "owner.sh");
    const wrapperPidPath = resolve(commandRoot, "wrapper.pid");
    const childPidPath = resolve(commandRoot, "detached-child.pid");
    const firstDeadline = new Date(Date.now() + 3_000).toISOString();
    writeFileSync(
      fakeGit,
      `#!/bin/sh
set -eu
case "$*" in
  *--git-common-dir*) printf '%s\\n' '${commonRoot}' ;;
  *) exit 1 ;;
esac
`,
    );
    writeFileSync(
      ownerScript,
      `#!/usr/bin/env bash
set -euo pipefail
owner_pid=$$
owner_start_time=$(sed 's/^.*) //' "/proc/$owner_pid/stat" | awk '{ print $20 }')
export DND_RESOURCE_LOCK_OWNER_PID="$owner_pid"
export DND_RESOURCE_LOCK_OWNER_START_TIME="$owner_start_time"
"$RAW_SWARM_MODEL_LANE_LOCK" campaign "$@" &
wrapper_pid=$!
printf '%s\\n' "$wrapper_pid" > "$RAW_SWARM_WRAPPER_PID"
wait "$wrapper_pid"
`,
    );
    chmodSync(fakeGit, 0o755);
    chmodSync(ownerScript, 0o755);
    const detachedChildSource = [
      'const fs = require("node:fs");',
      "fs.writeFileSync(process.env.RAW_SWARM_CHILD_PID, String(process.pid));",
      'process.on("SIGTERM", () => {});',
      "setInterval(() => {}, 1000);",
    ].join(" ");
    const childSource = [
      'const { spawn } = require("node:child_process");',
      `const detached = spawn(process.execPath, ["-e", ${JSON.stringify(detachedChildSource)}], { detached: true, stdio: "ignore" });`,
      "detached.unref();",
      "setInterval(() => {}, 1000);",
    ].join(" ");
    const owner = spawn(ownerScript, [process.execPath, "-e", childSource], {
      cwd: repoRoot,
      env: {
        ...modelLaneTestEnvironment(commandRoot, firstDeadline),
        RAW_SWARM_MODEL_LANE_LOCK: modelLaneLock,
        RAW_SWARM_WRAPPER_PID: wrapperPidPath,
        RAW_SWARM_CHILD_PID: childPidPath,
      },
      stdio: "ignore",
    });
    try {
      await waitForFile(wrapperPidPath);
      await waitForFile(childPidPath);
      const wrapperPid = Number(readFileSync(wrapperPidPath, "utf8").trim());
      const childPid = Number(readFileSync(childPidPath, "utf8").trim());
      expect(Number.isSafeInteger(wrapperPid)).toBe(true);
      expect(Number.isSafeInteger(childPid)).toBe(true);
      expect(processIsLive(wrapperPid)).toBe(true);
      expect(processIsLive(childPid)).toBe(true);

      owner.kill("SIGKILL");
      await waitForProcessExit(wrapperPid);
      await waitForProcessExit(childPid);

      const reacquired = spawnSync(
        modelLaneLock,
        ["campaign", process.execPath, modelLaneCapability, "--assert"],
        {
          cwd: repoRoot,
          env: modelLaneTestEnvironment(
            commandRoot,
            new Date(Date.now() + 1_500).toISOString(),
          ),
          encoding: "utf8",
        },
      );
      expect(reacquired.status).toBe(0);
      expect(`${reacquired.stdout}${reacquired.stderr}`).toContain(
        "acquired lane",
      );
    } finally {
      if (owner.exitCode === null) {
        owner.kill("SIGKILL");
      }
      const wrapperPidForCleanup = existsSync(wrapperPidPath)
        ? Number(readFileSync(wrapperPidPath, "utf8").trim())
        : undefined;
      if (
        wrapperPidForCleanup !== undefined &&
        processIsLive(wrapperPidForCleanup)
      ) {
        process.kill(wrapperPidForCleanup, "SIGTERM");
      }
      const childPidForCleanup = existsSync(childPidPath)
        ? Number(readFileSync(childPidPath, "utf8").trim())
        : undefined;
      if (
        childPidForCleanup !== undefined &&
        processIsLive(childPidForCleanup)
      ) {
        process.kill(childPidForCleanup, "SIGKILL");
      }
      rmSync(commandRoot, { recursive: true, force: true });
      rmSync(commonRoot, { recursive: true, force: true });
    }
  }, 15_000);

  test("settles a detached model child before lane reacquisition on wrapper TERM", async () => {
    const commandRoot = mkdtempSync(resolve(tmpdir(), "dnd-model-term-git-"));
    const commonRoot = mkdtempSync(resolve(tmpdir(), "dnd-model-term-common-"));
    const fakeGit = resolve(commandRoot, "git");
    const childPidPath = resolve(commandRoot, "detached-child.pid");
    writeFileSync(
      fakeGit,
      `#!/bin/sh
set -eu
case "$*" in
  *--git-common-dir*) printf '%s\\n' '${commonRoot}' ;;
      *) exit 1 ;;
esac
`,
    );
    chmodSync(fakeGit, 0o755);
    const detachedChildSource = [
      'const fs = require("node:fs");',
      "fs.writeFileSync(process.env.RAW_SWARM_CHILD_PID, String(process.pid));",
      'process.on("SIGTERM", () => {});',
      "setInterval(() => {}, 1000);",
    ].join(" ");
    const commandSource = [
      'const { spawn } = require("node:child_process");',
      `const detached = spawn(process.execPath, ["-e", ${JSON.stringify(detachedChildSource)}], { detached: true, stdio: "ignore" });`,
      "detached.unref();",
      "setInterval(() => {}, 1000);",
    ].join(" ");
    const wrapper = spawn(
      modelLaneLock,
      ["campaign", process.execPath, "-e", commandSource],
      {
        cwd: repoRoot,
        env: {
          ...modelLaneTestEnvironment(
            commandRoot,
            new Date(Date.now() + 60_000).toISOString(),
          ),
          RAW_SWARM_CHILD_PID: childPidPath,
        },
        stdio: "ignore",
      },
    );
    try {
      await waitForFile(childPidPath);
      const childPid = Number(readFileSync(childPidPath, "utf8").trim());
      expect(Number.isSafeInteger(childPid)).toBe(true);
      expect(processIsLive(childPid)).toBe(true);

      expect(wrapper.kill("SIGTERM")).toBe(true);
      await new Promise<void>((resolveClosed, rejectClosed) => {
        wrapper.once("error", rejectClosed);
        wrapper.once("close", () => resolveClosed());
      });
      await waitForProcessExit(childPid);

      const reacquired = spawnSync(
        modelLaneLock,
        ["campaign", process.execPath, modelLaneCapability, "--assert"],
        {
          cwd: repoRoot,
          env: modelLaneTestEnvironment(
            commandRoot,
            new Date(Date.now() + 1_500).toISOString(),
          ),
          encoding: "utf8",
        },
      );
      expect(reacquired.status).toBe(0);
      expect(`${reacquired.stdout}${reacquired.stderr}`).toContain(
        "acquired lane",
      );
    } finally {
      if (wrapper.exitCode === null) {
        wrapper.kill("SIGKILL");
      }
      const childPidForCleanup = existsSync(childPidPath)
        ? Number(readFileSync(childPidPath, "utf8").trim())
        : undefined;
      if (
        childPidForCleanup !== undefined &&
        processIsLive(childPidForCleanup)
      ) {
        process.kill(childPidForCleanup, "SIGKILL");
      }
      rmSync(commandRoot, { recursive: true, force: true });
      rmSync(commonRoot, { recursive: true, force: true });
    }
  }, 15_000);

  test("retains one runner-owned startedAt across execution and supervisor handoff", async () => {
    const outputRoot = mkdtempSync(
      resolve(repoRoot, "scripts/raw-swarm/out/runner-started-at-"),
    );
    const output = resolve(outputRoot, "execution");
    const commandRoot = mkdtempSync(resolve(tmpdir(), "dnd-runner-git-"));
    const fakeGit = resolve(commandRoot, "git");
    const fakeCodex = resolve(commandRoot, "codex");
    writeFileSync(
      fakeGit,
      String.raw`#!/bin/sh
set -eu
case "$*" in
  *--git-common-dir*) printf '%s\n' '${modelLaneLockDirectory}' ;;
  *show-toplevel*) printf '%s\n' '${repoRoot}' ;;
  *rev-parse\ HEAD*) printf '%s\n' '${currentGitSha}' ;;
  *status*) exit 0 ;;
  *) exit 0 ;;
esac
`,
    );
    chmodSync(fakeGit, 0o755);
    writeFileSync(
      fakeCodex,
      String.raw`#!/bin/sh
set -eu
printf '%s\n' "$$" > "$FAKE_CODEX_PID_PATH"
if [ "$#" -gt 0 ] && [ "$1" = "sandbox" ]; then
  shift
  while [ "$#" -gt 0 ] && [ "$1" != "--" ]; do shift; done
  if [ "$#" -gt 0 ]; then shift; fi
  exec "$@"
fi
cat > attempt.ts <<'EOF'
import type { PlayerContinuation } from "@dnd/player-sdk";

export const continueBattle: PlayerContinuation = async (context) => {
  context.sdk.discoverBattleActs(context.session);
  return {
    kind: "playerConcluded",
    session: context.session,
    tacticalNote: "Synthetic deterministic boundary continuation.",
    conclusion: "Synthetic deterministic boundary conclusion.",
  };
};
EOF
node player-client.mjs attempt.ts >/dev/null
printf '%s\n' '{"type":"thread.started","thread_id":"synthetic-deterministic-thread"}'
printf '%s\n' '{"type":"turn.completed"}'
printf '%s\n' 'Synthetic deterministic player evidence.' > evidence/agent-final.txt
`,
    );
    chmodSync(fakeCodex, 0o755);
    const canonicalStagePlanPath = resolve(
      rawSwarmOutputDirectory,
      "mounted-dispatch-through-flooded-orchard-stage-plan.json",
    );
    const canonicalStagePlanFindingsPath = resolve(
      rawSwarmOutputDirectory,
      "mounted-dispatch-through-flooded-orchard-stage-plan-findings.json",
    );
    try {
      await runAsync(
        sdkPlayerLauncher,
        [
          "mounted-dispatch-through-flooded-orchard",
          "--execution-id",
          "runner-started-at-execution",
          "--evidence-set-id",
          "runner-started-at-evidence",
          "--output-path",
          relative(repoRoot, output),
          "--instructional-isolation",
        ],
        {
          ...modelEntryPointTestEnvironment,
          PATH: `${commandRoot}:${process.env.PATH ?? ""}`,
          FAKE_CODEX_PID_PATH: resolve(outputRoot, "fake-codex.pid"),
        },
      );
      const fakeCodexPid = Number(
        readFileSync(resolve(outputRoot, "fake-codex.pid"), "utf8").trim(),
      );
      expect(Number.isInteger(fakeCodexPid)).toBe(true);
      expect(processIsLive(fakeCodexPid)).toBe(false);
      const executionStartInput: unknown = JSON.parse(
        readFileSync(resolve(output, "evidence/execution-start.json"), "utf8"),
      );
      const executionStart = Schema.decodeUnknownEither(
        ExecutionStartRecordSchema,
        { onExcessProperty: "error" },
      )(executionStartInput);
      expect(Either.isRight(executionStart)).toBe(true);
      if (Either.isLeft(executionStart)) {
        throw new Error(
          `Invalid execution-start evidence: ${executionStart.left.message}`,
        );
      }
      const transcriptHeaderInput: unknown = JSON.parse(
        readFileSync(resolve(output, "evidence/sdk-calls.jsonl"), "utf8")
          .trim()
          .split("\n")[0]!,
      );
      const transcriptHeader = Schema.decodeUnknownEither(
        SdkPlayerTranscriptHeaderSchema,
        { onExcessProperty: "error" },
      )(transcriptHeaderInput);
      expect(Either.isRight(transcriptHeader)).toBe(true);
      if (Either.isLeft(transcriptHeader)) {
        throw new Error(
          `Invalid SDK transcript header: ${transcriptHeader.left.message}`,
        );
      }
      expect(transcriptHeader.right.startedAt).toBe(
        executionStart.right.startedAt,
      );
      expect(existsSync(resolve(output, "replay-supervisor.mjs"))).toBe(true);
      expect(
        existsSync(resolve(output, "evidence/findings-checkpoint.json")),
      ).toBe(true);
      const invalidStartedAt = spawnSync(
        process.execPath,
        [
          resolve(output, "replay-supervisor.mjs"),
          "init",
          "mounted-dispatch-through-flooded-orchard",
          "a".repeat(40),
          "instructionalFallback",
          "not-a-canonical-timestamp",
          "b".repeat(64),
          "c".repeat(64),
          "d".repeat(64),
        ],
        { cwd: output, encoding: "utf8" },
      );
      expect(invalidStartedAt.status).toBe(1);
      expect(`${invalidStartedAt.stdout}${invalidStartedAt.stderr}`).toContain(
        "Invalid started-at authority",
      );
    } finally {
      rmSync(outputRoot, { recursive: true, force: true });
      rmSync(commandRoot, { recursive: true, force: true });
      rmSync(canonicalStagePlanPath, { force: true });
      rmSync(canonicalStagePlanFindingsPath, { force: true });
    }
  }, 300_000);

  test("rejects an implementation revision that is not the current clean revision", () => {
    const mismatchedGitSha = `${currentGitSha[0] === "a" ? "b" : "a"}${currentGitSha.slice(1)}`;
    const commandRoot = mkdtempSync(resolve(tmpdir(), "dnd-player-command-"));
    const fakeGit = resolve(commandRoot, "git");
    writeFileSync(
      fakeGit,
      String.raw`#!/bin/sh
set -eu
case "$*" in
  *--git-common-dir*) printf '%s\n' '${modelLaneLockDirectory}' ;;
  *status*) exit 0 ;;
  *rev-parse\ HEAD*) printf '%s\n' '${currentGitSha}' ;;
  *) exit 0 ;;
esac
`,
    );
    chmodSync(fakeGit, 0o755);
    try {
      expect(() =>
        run(
          sdkPlayerLauncher,
          [
            "goblin-warrior-skeleton-tracer",
            "--execution-id",
            "synthetic-revision-check-execution",
            "--evidence-set-id",
            "synthetic-revision-check-evidence",
            "--implementation-git-sha",
            mismatchedGitSha,
          ],
          {
            ...modelEntryPointTestEnvironment,
            PATH: `${commandRoot}:${process.env.PATH ?? ""}`,
          },
        ),
      ).toThrow(/does not match the current clean Git revision/);
    } finally {
      rmSync(commandRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("delivers a context authority inline while retaining its path and byte hash", () => {
    const testRoot = mkdtempSync(resolve(repoRoot, "scripts/raw-swarm/out/"));
    const commandRoot = mkdtempSync(resolve(tmpdir(), "dnd-review-command-"));
    const contextPath = resolve(testRoot, "review-context.md");
    const promptPath = resolve(testRoot, "prompt.txt");
    const transcriptPath = reviewTranscriptPath(testRoot);
    const reviewPath = resolve(testRoot, "review.json");
    const logPath = resolve(testRoot, "review.log");
    const capturePath = resolve(testRoot, "codex-input.bin");
    const context = "exact context bytes α\nwith no pointer substitution";
    writeFileSync(contextPath, context);
    writeFileSync(
      promptPath,
      "Review the packet.\n{{POST_PLAY_REVIEW_ACCESS_POLICY}}\n{{POST_PLAY_REVIEW_CONTEXT_DESCRIPTION}}\n",
    );
    writeFileSync(transcriptPath, "synthetic transcript\n");
    const fakePnpm = resolve(commandRoot, "pnpm");
    const fakeCodex = resolve(commandRoot, "codex");
    const fakeGit = resolve(commandRoot, "git");
    const realPnpm = execFileSync("which", ["pnpm"], {
      encoding: "utf8",
    }).trim();
    writeFileSync(
      fakeGit,
      String.raw`#!/bin/sh
set -eu
case "$*" in
  *--git-common-dir*) printf '%s\n' '${modelLaneLockDirectory}' ;;
  *show-toplevel*) printf '%s\n' '${repoRoot}' ;;
  *rev-parse\ HEAD*) printf '%s\n' '${currentGitSha}' ;;
  *) exit 0 ;;
esac
`,
    );
    writeFileSync(
      fakePnpm,
      String.raw`#!/bin/sh
set -eu
last=""
for arg do last="$arg"; done
case "$*" in
  *sdk-audit-cli.ts\ build*) printf '%s\n' '{"scenarioId":"synthetic-review"}' > "$last" ;;
  *sdk-review-packet-cli.ts*) printf '%s\n' '{}' > "$last" ;;
  *review-schema.ts*) printf '%s\n' '{}' > "$last" ;;
  *model-telemetry-cli.ts*) exec '${realPnpm}' "$@" ;;
  *) ;;
esac
`,
    );
    writeFileSync(
      fakeCodex,
      String.raw`#!/bin/sh
set -eu
output=""
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--output-last-message" ]; then
    output="$2"
    shift 2
  else
    shift
  fi
done
printf '%s\n' '{"type":"turn.completed"}'
cat > "$RAW_REVIEW_CAPTURE"
printf '%s' '{"scenarioId":"synthetic-review","gitSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","transcriptSha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","reviewer":"synthetic-reviewer","verdicts":[{"class":"pass","claim":"Synthetic review output is valid.","evidence":"Synthetic review evidence is retained."}]}' > "$output"
`,
    );
    chmodSync(fakeGit, 0o755);
    chmodSync(fakePnpm, 0o755);
    chmodSync(fakeCodex, 0o755);
    const result = spawnSync(
      reviewer,
      [promptPath, transcriptPath, reviewPath, logPath],
      {
        cwd: repoRoot,
        env: {
          ...modelEntryPointTestEnvironment,
          PATH: `${commandRoot}:${process.env.PATH ?? ""}`,
          RAW_REVIEW_CAPTURE: capturePath,
          RAW_REVIEW_CONTEXT_PATH: relative(repoRoot, contextPath),
          RAW_REVIEW_CONTEXT_PROFILE: "boundedCapabilityProjection",
          RAW_REVIEW_CONTEXT_ROLE: "postPlayReview",
          RAW_REVIEW_IMPLEMENTATION_GIT_SHA: currentGitSha,
        },
        stdio: inheritedModelLaneStdio(),
        encoding: "utf8",
      },
    );
    try {
      expect(result.status).toBe(0);
      const captured = readFileSync(capturePath);
      expect(captured.includes(Buffer.from(context))).toBe(true);
      const capturedText = captured.toString("utf8");
      expect(capturedText).toContain(
        `<RAW_SWARM_CAPABILITY_CONTEXT role="postPlayReview" profile="boundedCapabilityProjection" path="${resolve(contextPath)}" bytes="${Buffer.byteLength(context)}"`,
      );
      const contextSha = execFileSync("sha256sum", [contextPath], {
        encoding: "utf8",
      })
        .split(" ")[0]
        ?.trim();
      expect(contextSha).toBeDefined();
      expect(capturedText).toContain(`sha256="${contextSha}"`);
      expect(capturedText).toContain(
        "This is the bounded capability-projection profile.",
      );
      expect(capturedText).toContain(
        "Do not read files or use commands or tools",
      );
      expect(capturedText).toContain(
        "one bounded, versioned Raw Swarm capability projection",
      );
      const deliveryPath = `${reviewPath.slice(0, -".json".length)}.context-delivery.json`;
      expect(JSON.parse(readFileSync(deliveryPath, "utf8"))).toEqual({
        schemaVersion: 1,
        profile: "boundedCapabilityProjection",
        role: "postPlayReview",
        path: relative(repoRoot, resolve(contextPath)),
        byteLength: Buffer.byteLength(context),
        sha256: contextSha,
      });
    } finally {
      rmSync(testRoot, { recursive: true, force: true });
      rmSync(commandRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("keeps the legacy document authority out of initial input and records command-read policy", () => {
    const testRoot = mkdtempSync(resolve(repoRoot, "scripts/raw-swarm/out/"));
    const commandRoot = mkdtempSync(resolve(tmpdir(), "dnd-review-command-"));
    const contextPath = resolve(testRoot, "review context;with spaces.md");
    const promptPath = resolve(testRoot, "prompt.txt");
    const transcriptPath = reviewTranscriptPath(testRoot);
    const reviewPath = resolve(testRoot, "review.json");
    const logPath = resolve(testRoot, "review.log");
    const capturePath = resolve(testRoot, "codex-input.bin");
    const pnpmCapturePath = resolve(testRoot, "pnpm-commands.log");
    const context = "LEGACY_CONTEXT_BYTES_MUST_NOT_BE_INLINE\nsecond line\n";
    writeFileSync(contextPath, context);
    writeFileSync(
      promptPath,
      "Review the packet.\n{{POST_PLAY_REVIEW_ACCESS_POLICY}}\n{{POST_PLAY_REVIEW_CONTEXT_DESCRIPTION}}\n",
    );
    writeFileSync(transcriptPath, "synthetic transcript\n");
    const fakeGit = resolve(commandRoot, "git");
    const fakePnpm = resolve(commandRoot, "pnpm");
    const fakeCodex = resolve(commandRoot, "codex");
    const realPnpm = execFileSync("which", ["pnpm"], {
      encoding: "utf8",
    }).trim();
    const contextSha = execFileSync("sha256sum", [contextPath], {
      encoding: "utf8",
    })
      .split(" ")[0]
      ?.trim();
    expect(contextSha).toBeDefined();
    const shellQuote = (value: string): string =>
      `'${value.replaceAll("'", "'\"'\"'")}'`;
    const contextReadEvent = JSON.stringify({
      type: "item.completed",
      item: {
        type: "command_execution",
        command: `/bin/bash -lc ${JSON.stringify(`cat ${shellQuote(resolve(contextPath))}`)}`,
        aggregated_output:
          "LEGACY_CONTEXT_BYTES_MUST_NOT_BE_INLINE\n[client truncated]",
        exit_code: 0,
        status: "completed",
      },
    });
    writeFileSync(
      fakeGit,
      [
        "#!/bin/sh",
        "set -eu",
        'case "$*" in',
        `  *--git-common-dir*) printf '%s\\n' '${modelLaneLockDirectory}' ;;`,
        `  *show-toplevel*) printf '%s\\n' '${repoRoot}' ;;`,
        `  *rev-parse\\ HEAD*) printf '%s\\n' '${currentGitSha}' ;;`,
        "  *) exit 0 ;;",
        "esac",
        "",
      ].join("\n"),
    );
    writeFileSync(
      fakePnpm,
      [
        "#!/bin/sh",
        "set -eu",
        'printf \'%s\\n\' "$*" >> "$RAW_REVIEW_PNPM_CAPTURE"',
        'last=""',
        'for arg do last="$arg"; done',
        'case "$*" in',
        '  *sdk-audit-cli.ts\\ build*) printf \'%s\\n\' \'{"scenarioId":"synthetic-review"}\' > "$last" ;;',
        "  *sdk-review-packet-cli.ts*) printf '%s\\n' '{}' > \"$last\" ;;",
        "  *review-schema.ts*) printf '%s\\n' '{}' > \"$last\" ;;",
        `  *model-telemetry-cli.ts*) exec '${realPnpm}' "$@" ;;`,
        "  *) ;;",
        "esac",
        "",
      ].join("\n"),
    );
    writeFileSync(
      fakeCodex,
      [
        "#!/bin/sh",
        "set -eu",
        'output=""',
        'while [ "$#" -gt 0 ]; do',
        '  if [ "$1" = "--output-last-message" ]; then',
        '    output="$2"',
        "    shift 2",
        "  else",
        "    shift",
        "  fi",
        "done",
        'cat > "$RAW_REVIEW_CAPTURE"',
        "printf '%s\\n' '{\"type\":\"turn.completed\"}'",
        "printf '%s\\n' \"$RAW_REVIEW_CONTEXT_READ_EVENT\"",
        'printf \'%s\' \'{"scenarioId":"synthetic-review","gitSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","transcriptSha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","reviewer":"synthetic-reviewer","verdicts":[{"class":"pass","claim":"Synthetic review output is valid.","evidence":"Synthetic review evidence is retained."}]}\' > "$output"',
        "",
      ].join("\n"),
    );
    chmodSync(fakeGit, 0o755);
    chmodSync(fakePnpm, 0o755);
    chmodSync(fakeCodex, 0o755);
    const result = spawnSync(
      reviewer,
      [promptPath, transcriptPath, reviewPath, logPath],
      {
        cwd: repoRoot,
        env: {
          ...modelEntryPointTestEnvironment,
          PATH: `${commandRoot}:${process.env.PATH ?? ""}`,
          RAW_REVIEW_CAPTURE: capturePath,
          RAW_REVIEW_CONTEXT_PATH: relative(repoRoot, contextPath),
          RAW_REVIEW_CONTEXT_PROFILE: "documentDeclarationSet",
          RAW_REVIEW_CONTEXT_ROLE: "postPlayReview",
          RAW_REVIEW_CONTEXT_READ_EVENT: contextReadEvent,
          RAW_REVIEW_PNPM_CAPTURE: pnpmCapturePath,
          RAW_REVIEW_IMPLEMENTATION_GIT_SHA: currentGitSha,
        },
        stdio: inheritedModelLaneStdio(),
        encoding: "utf8",
      },
    );
    try {
      expect(result.status).toBe(0);
      const capturedText = readFileSync(capturePath, "utf8");
      expect(capturedText).not.toContain(context);
      expect(capturedText).toContain(
        `<RAW_SWARM_CAPABILITY_CONTEXT role="postPlayReview" profile="documentDeclarationSet" delivery="commandRead" path="${resolve(contextPath)}" bytes="${Buffer.byteLength(context)}"`,
      );
      expect(capturedText).toContain("client-truncated");
      expect(capturedText).not.toContain("contiguous range");
      expect(capturedText).toContain(
        "This is the historical documentDeclarationSet profile.",
      );
      expect(capturedText).toContain(
        "exact immutable document-declaration authority",
      );
      expect(capturedText).not.toContain(
        "one bounded, versioned Raw Swarm capability projection",
      );
      expect(capturedText).toContain(
        "do not claim complete authority ingestion",
      );
      expect(capturedText).not.toContain(
        "This is the bounded capability-projection profile.",
      );
      expect(capturedText).not.toContain(
        "any command or tool call invalidates the controlled measurement",
      );
      const pnpmCommands = readFileSync(pnpmCapturePath, "utf8");
      expect(pnpmCommands).toContain(
        `--profile documentDeclarationSet --context-path ${resolve(contextPath)} --context-byte-length ${Buffer.byteLength(context)} --context-sha256 ${contextSha}`,
      );
      const deliveryPath = `${reviewPath.slice(0, -".json".length)}.context-delivery.json`;
      expect(JSON.parse(readFileSync(deliveryPath, "utf8"))).toEqual({
        schemaVersion: 1,
        profile: "documentDeclarationSet",
        role: "postPlayReview",
        path: relative(repoRoot, resolve(contextPath)),
        byteLength: Buffer.byteLength(context),
        sha256: contextSha,
      });
    } finally {
      rmSync(testRoot, { recursive: true, force: true });
      rmSync(commandRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("retains a policy-invalid post-play phase as failed telemetry", () => {
    const testRoot = mkdtempSync(resolve(repoRoot, "scripts/raw-swarm/out/"));
    const commandRoot = mkdtempSync(resolve(tmpdir(), "dnd-review-command-"));
    const promptPath = resolve(testRoot, "prompt.txt");
    const transcriptPath = reviewTranscriptPath(testRoot);
    const reviewPath = resolve(testRoot, "review.json");
    const logPath = resolve(testRoot, "review.log");
    const ledgerPath = `${reviewPath.slice(0, -".json".length)}.invocations.jsonl`;
    const pnpmCapturePath = resolve(testRoot, "pnpm-commands.log");
    const fakePnpm = resolve(commandRoot, "pnpm");
    const fakeCodex = resolve(commandRoot, "codex");
    const fakeGit = resolve(commandRoot, "git");
    const realPnpm = execFileSync("which", ["pnpm"], {
      encoding: "utf8",
    }).trim();
    writeFileSync(promptPath, "Review the packet.\n");
    writeFileSync(transcriptPath, "synthetic transcript\n");
    writeFileSync(
      fakeGit,
      String.raw`#!/bin/sh
set -eu
case "$*" in
  *--git-common-dir*) printf '%s\n' '${modelLaneLockDirectory}' ;;
  *show-toplevel*) printf '%s\n' '${repoRoot}' ;;
  *rev-parse\ HEAD*) printf '%s\n' '${currentGitSha}' ;;
  *) exit 0 ;;
esac
`,
    );
    writeFileSync(
      fakePnpm,
      [
        "#!/bin/sh",
        "set -eu",
        `printf '%s\\n' \"$*\" >> '${pnpmCapturePath}'`,
        'last=""',
        'for arg do last="$arg"; done',
        'case "$*" in',
        `  *model-telemetry-cli.ts*) exec '${realPnpm}' "$@" ;;`,
        "  *review-invocation-policy.ts*) exit 1 ;;",
        '  *sdk-audit-cli.ts\\ build*) printf \'%s\\n\' \'{"scenarioId":"synthetic-review"}\' > "$last" ;;',
        "  *sdk-review-packet-cli.ts*) printf '%s\\n' '{}' > \"$last\" ;;",
        "  *review-schema.ts*) printf '%s\\n' '{}' > \"$last\" ;;",
        "  *) ;;",
        "esac",
        "",
      ].join("\n"),
    );
    writeFileSync(
      fakeCodex,
      [
        "#!/bin/sh",
        "set -eu",
        'output=""',
        'while [ "$#" -gt 0 ]; do',
        '  if [ "$1" = "--output-last-message" ]; then',
        '    output="$2"',
        "    shift 2",
        "  else",
        "    shift",
        "  fi",
        "done",
        "printf '%s\\n' '{\"type\":\"turn.completed\"}'",
        'printf \'%s\\n\' \'{"type":"item.completed","item":{"type":"command_execution","command":"cat unrelated.txt","aggregated_output":"","exit_code":0,"status":"completed"}}\'',
        "printf '%s' '{}' > \"$output\"",
        "",
      ].join("\n"),
    );
    chmodSync(fakeGit, 0o755);
    chmodSync(fakePnpm, 0o755);
    chmodSync(fakeCodex, 0o755);
    const result = spawnSync(
      reviewer,
      [promptPath, transcriptPath, reviewPath, logPath],
      {
        cwd: repoRoot,
        env: {
          ...modelEntryPointTestEnvironment,
          PATH: `${commandRoot}:${process.env.PATH ?? ""}`,
          RAW_REVIEW_PNPM_CAPTURE: pnpmCapturePath,
          RAW_REVIEW_IMPLEMENTATION_GIT_SHA: currentGitSha,
        },
        stdio: inheritedModelLaneStdio(),
        encoding: "utf8",
      },
    );
    try {
      expect(result.status).toBe(1);
      const pnpmCommands = readFileSync(pnpmCapturePath, "utf8");
      expect(pnpmCommands).not.toContain("model-telemetry-cli.ts");
      const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
        readonly exit: { readonly tag: string; readonly status?: number };
        readonly result: { readonly tag: string };
      };
      expect(ledger.exit).toEqual({ tag: "exited", status: 0 });
      expect(ledger.result).toMatchObject({
        tag: "failed",
        failureKind: "lastMessageSchemaInvalid",
      });
    } finally {
      rmSync(testRoot, { recursive: true, force: true });
      rmSync(commandRoot, { recursive: true, force: true });
    }
  }, 30_000);

  test("rejects malformed review implementation revision before invoking review tools", () => {
    const commandRoot = mkdtempSync(resolve(tmpdir(), "dnd-review-command-"));
    const fakeGit = resolve(commandRoot, "git");
    writeFileSync(
      fakeGit,
      String.raw`#!/bin/sh
set -eu
case "$*" in
  *--git-common-dir*) printf '%s\n' '${modelLaneLockDirectory}' ;;
  *show-toplevel*) printf '%s\n' '${repoRoot}' ;;
  *rev-parse\ HEAD*) printf '%s\n' '${currentGitSha}' ;;
  *) exit 0 ;;
esac
`,
    );
    chmodSync(fakeGit, 0o755);
    const result = spawnSync(
      reviewer,
      [
        "missing-prompt.txt",
        "missing-transcript.jsonl",
        "review.json",
        "review.log",
      ],
      {
        cwd: repoRoot,
        env: {
          ...modelEntryPointTestEnvironment,
          PATH: `${commandRoot}:${process.env.PATH ?? ""}`,
          RAW_REVIEW_IMPLEMENTATION_GIT_SHA: "not-a-git-sha",
        },
        stdio: inheritedModelLaneStdio(),
        encoding: "utf8",
      },
    );
    try {
      expect(result.status).not.toBe(0);
      expect(`${result.stdout ?? ""}${result.stderr ?? ""}`).toContain(
        "must be a lowercase 40- or 64-character Git SHA",
      );

      const mismatchedGitSha = `${currentGitSha[0] === "a" ? "b" : "a"}${currentGitSha.slice(1)}`;
      const mismatch = spawnSync(
        reviewer,
        [
          "missing-prompt.txt",
          "missing-transcript.jsonl",
          "review.json",
          "review.log",
        ],
        {
          cwd: repoRoot,
          env: {
            ...modelEntryPointTestEnvironment,
            PATH: `${commandRoot}:${process.env.PATH ?? ""}`,
            RAW_REVIEW_IMPLEMENTATION_GIT_SHA: mismatchedGitSha,
          },
          stdio: inheritedModelLaneStdio(),
          encoding: "utf8",
        },
      );
      expect(mismatch.status).not.toBe(0);
      expect(`${mismatch.stdout ?? ""}${mismatch.stderr ?? ""}`).toContain(
        "does not match the current clean Git revision",
      );
    } finally {
      rmSync(commandRoot, { recursive: true, force: true });
    }
  }, 30_000);
});
