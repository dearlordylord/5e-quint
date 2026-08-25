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
import { relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, describe, expect, test } from "vitest";
import { Either, Schema } from "effect";

import { ExecutionStartRecordSchema } from "./evidence-manifests.ts";
import { repoRoot } from "./transcript.ts";
import { PLAYER_CONTINUATION_PROTOCOL_REMINDER } from "./sdk-player/continuation-contract.ts";
import { SdkPlayerTranscriptHeaderSchema } from "./sdk-player/sdk-transcript.ts";
import { compileTrustedCSource } from "./deterministic-toolchain.cjs";
import { installDeterministicCleanup } from "./deterministic-cleanup.cjs";

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
const deterministicNetworkBoundarySource = resolve(
  repoRoot,
  "scripts/raw-swarm/deterministic-network-boundary.c",
);
const deterministicNetworkBoundaryBuild = mkdtempSync(
  resolve(tmpdir(), "dnd-network-boundary-test-"),
);
const cleanupDeterministicNetworkBoundaryBuild = installDeterministicCleanup({
  cleanup: () =>
    rmSync(deterministicNetworkBoundaryBuild, {
      recursive: true,
      force: true,
    }),
  onSignal: ({ cleanup, exitStatus }) => {
    cleanup();
    process.exit(exitStatus);
  },
});
const deterministicNetworkBoundary = resolve(
  deterministicNetworkBoundaryBuild,
  "deterministic-network-boundary",
);
const deterministicNetworkBoundaryCompilation = compileTrustedCSource(
  deterministicNetworkBoundarySource,
  deterministicNetworkBoundary,
);
if (!deterministicNetworkBoundaryCompilation.ok) {
  cleanupDeterministicNetworkBoundaryBuild();
  throw new Error(
    `The Linux deterministic network boundary could not be compiled: ${deterministicNetworkBoundaryCompilation.message}`,
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
  cleanupDeterministicNetworkBoundaryBuild();
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
  const fixtureRoot = mkdtempSync(
    resolve(tmpdir(), "dnd-deterministic-network-boundary-"),
  );
  const sourcePath = resolve(fixtureRoot, "fixture.cjs");
  writeFileSync(sourcePath, source);
  try {
    return spawnSync(
      "env",
      ["-i", deterministicNetworkBoundary, process.execPath, sourcePath],
      { encoding: "utf8", stdio: "ignore" },
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function compileKernelBoundaryProbe(name: string, source: string): string {
  const sourcePath = resolve(deterministicNetworkBoundaryBuild, `${name}.c`);
  const binaryPath = resolve(deterministicNetworkBoundaryBuild, name);
  writeFileSync(sourcePath, source);
  const compilation = compileTrustedCSource(sourcePath, binaryPath);
  if (!compilation.ok) {
    throw new Error(
      `The kernel boundary probe could not be compiled: ${compilation.message}`,
    );
  }
  return binaryPath;
}

function runKernelBoundaryProbe(binaryPath: string) {
  return spawnSync("env", ["-i", deterministicNetworkBoundary, binaryPath], {
    encoding: "utf8",
    stdio: "ignore",
  });
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

  test("deterministic runner settles a blocking child group before cleanup", async () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-runner-signal-"));
    const buildDirectory = resolve(fixtureRoot, "build");
    const childPidPath = resolve(fixtureRoot, "child.pid");
    const detachedPidPath = resolve(fixtureRoot, "detached.pid");
    const helperPath = resolve(fixtureRoot, "runner-helper.cjs");
    mkdirSync(buildDirectory);
    writeFileSync(
      helperPath,
      `const { rmSync, writeFileSync } = require("node:fs"); const { spawn } = require("node:child_process"); const { createDeterministicRunner } = require(${JSON.stringify(deterministicRunnerModule)}); const { installDeterministicCleanup } = require(${JSON.stringify(deterministicCleanupModule)}); const runner = createDeterministicRunner({ boundary: ${JSON.stringify(deterministicNetworkBoundary)}, buildDirectory: ${JSON.stringify(buildDirectory)}, environment: { ...process.env, NODE_OPTIONS: "", RAW_SWARM_EXECUTION_LANE: "deterministic" } }); process.stdout.write = () => false; process.stderr.write = () => false; installDeterministicCleanup({ cleanup: () => rmSync(${JSON.stringify(buildDirectory)}, { recursive: true, force: true }), onSignal: async ({ cleanup, exitStatus, signal }) => { try { await runner.terminateActive(signal); } catch {} finally { cleanup(); } process.exit(exitStatus); } }); void runner.run(process.execPath, ["-e", ${JSON.stringify(`const { writeFileSync } = require("node:fs"); const { spawn } = require("node:child_process"); process.stdout.write("blocking-output"); process.stderr.write("blocking-error"); writeFileSync(${JSON.stringify(childPidPath)}, String(process.pid)); const detached = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { detached: true, stdio: "ignore" }); writeFileSync(${JSON.stringify(detachedPidPath)}, String(detached.pid)); detached.on("error", () => {}); process.on("SIGTERM", () => {}); setInterval(() => {}, 1000);`)}]).then((result) => { process.exitCode = result.status ?? 1; }).catch(() => { process.exitCode = 1; });`,
    );
    const helper = spawn(process.execPath, [helperPath], {
      env: { ...process.env, NODE_OPTIONS: "" },
      stdio: ["ignore", "ignore", "pipe"],
    });
    const helperErrors: Buffer[] = [];
    helper.stderr?.on("data", (chunk: Buffer) => helperErrors.push(chunk));
    let childPid: number | undefined;
    try {
      try {
        await waitForFile(childPidPath);
      } catch (error) {
        throw new Error(
          `${error instanceof Error ? error.message : String(error)} ${Buffer.concat(helperErrors).toString("utf8")}`,
        );
      }
      childPid = Number(readFileSync(childPidPath, "utf8").trim());
      expect(Number.isSafeInteger(childPid)).toBe(true);
      expect(processIsLive(childPid)).toBe(true);
      await waitForFile(detachedPidPath);
      const detachedPid = Number(readFileSync(detachedPidPath, "utf8").trim());
      expect(Number.isSafeInteger(detachedPid)).toBe(true);
      expect(processIsLive(detachedPid)).toBe(true);
      const terminationStarted = Date.now();
      const result = await new Promise<number>(
        (resolveResult, rejectResult) => {
          helper.once("error", rejectResult);
          helper.once("close", (status, signal) => {
            if (signal !== null) {
              rejectResult(new Error(`Runner helper stopped with ${signal}.`));
            } else {
              resolveResult(status ?? 1);
            }
          });
          helper.kill("SIGTERM");
        },
      );
      expect(result).toBe(143);
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
  }, 10_000);

  test("deterministic runner flushes both streams and reaches the next phase", async () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), "dnd-runner-output-"));
    const buildDirectory = resolve(fixtureRoot, "build");
    const helperPath = resolve(fixtureRoot, "runner-output-helper.cjs");
    mkdirSync(buildDirectory);
    writeFileSync(
      helperPath,
      `const { rmSync } = require("node:fs"); const { createDeterministicRunner } = require(${JSON.stringify(deterministicRunnerModule)}); const runner = createDeterministicRunner({ boundary: ${JSON.stringify(deterministicNetworkBoundary)}, buildDirectory: ${JSON.stringify(buildDirectory)}, environment: { ...process.env, NODE_OPTIONS: "", RAW_SWARM_EXECUTION_LANE: "deterministic" } }); for (const stream of [process.stdout, process.stderr]) { const write = stream.write.bind(stream); stream.write = (chunk, callback) => write(chunk, typeof callback === "function" ? () => callback(null) : callback); } void (async () => { const first = await runner.run(process.execPath, ["-e", "process.stdout.write('first-out'); process.stderr.write('first-err')"]); if (first.status !== 0 || first.signal !== null) process.exit(1); const second = await runner.run(process.execPath, ["-e", "process.stdout.write('second-out'); process.stderr.write('second-err')"]); if (second.status !== 0 || second.signal !== null) process.exit(2); })().catch((error) => { process.stderr.write(String(error)); process.exit(3); }).finally(() => rmSync(${JSON.stringify(buildDirectory)}, { recursive: true, force: true }));`,
    );
    const checked = spawn(process.execPath, [helperPath], {
      env: { ...process.env, NODE_OPTIONS: "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    checked.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
    checked.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
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
      expect(Buffer.concat(stdout).toString("utf8")).toContain(
        "first-outsecond-out",
      );
      expect(Buffer.concat(stderr).toString("utf8")).toContain(
        "first-errsecond-err",
      );
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
    const helperPath = resolve(fixtureRoot, "descendant-helper.cjs");
    mkdirSync(buildDirectory);
    writeFileSync(
      helperPath,
      `const { rmSync, writeFileSync } = require("node:fs"); const { createDeterministicRunner } = require(${JSON.stringify(deterministicRunnerModule)}); const runner = createDeterministicRunner({ boundary: ${JSON.stringify(deterministicNetworkBoundary)}, buildDirectory: ${JSON.stringify(buildDirectory)}, environment: { ...process.env, NODE_OPTIONS: "", RAW_SWARM_EXECUTION_LANE: "deterministic" } }); void runner.run(process.execPath, ["-e", ${JSON.stringify(`const { spawn } = require("node:child_process"); const { writeFileSync } = require("node:fs"); const descendant = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" }); descendant.unref(); writeFileSync(${JSON.stringify(descendantPidPath)}, String(descendant.pid));`)}]).then(() => { process.exitCode = 1; }).catch((error) => { writeFileSync(${JSON.stringify(findingPath)}, String(error)); process.exitCode = String(error).includes("descendant processes remained") ? 0 : 2; }).finally(() => rmSync(${JSON.stringify(buildDirectory)}, { recursive: true, force: true }));`,
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
                new Error(`Descendant helper stopped with ${signal}.`),
              );
            } else {
              resolveResult(status ?? 1);
            }
          });
        },
      );
      expect(result).toBe(0);
      expect(readFileSync(findingPath, "utf8")).toContain(
        "descendant processes remained",
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
      `#define _GNU_SOURCE\n#include <sys/socket.h>\n#include <unistd.h>\nint main(int argc, char **argv) { if (argc < 2) return 64; int fd = socket(AF_INET, SOCK_DGRAM, 0); if (fd < 0) return 1; if (fd != 3 && dup2(fd, 3) < 0) return 2; if (fd != 3) close(fd); execv(argv[1], &argv[1]); return 127; }\n`,
    );
    const probe = compileKernelBoundaryProbe(
      "preopened-network-check",
      `#include <errno.h>\n#include <sys/socket.h>\nint main(void) { struct sockaddr_storage address; socklen_t length = sizeof(address); errno = 0; return getsockname(3, (struct sockaddr *)&address, &length) == -1 && (errno == EBADF || errno == ENOTSOCK) ? 0 : 1; }\n`,
    );
    const checked = spawnSync(launcher, [deterministicNetworkBoundary, probe], {
      encoding: "utf8",
      stdio: "ignore",
    });
    expect(checked.status).toBe(0);
  });

  test("Linux kernel boundary rejects an inherited AF_UNIX standard descriptor", () => {
    const launcher = compileKernelBoundaryProbe(
      "unix-standard-stdio-launcher",
      `#include <sys/socket.h>\n#include <unistd.h>\nint main(int argc, char **argv) { if (argc < 2) return 64; int fd = socket(AF_UNIX, SOCK_STREAM, 0); if (fd < 0) return 1; if (fd != 0 && dup2(fd, 0) < 0) return 2; if (fd != 0) close(fd); execv(argv[1], &argv[1]); return 127; }\n`,
    );
    const checked = spawnSync(
      launcher,
      [deterministicNetworkBoundary, "/bin/true"],
      {
        encoding: "utf8",
      },
    );
    expect(checked.status).toBe(78);
    expect(checked.stderr).toContain("standard descriptor 0");
  });

  test("Linux kernel boundary rejects an inherited anon-inode standard descriptor", () => {
    const launcher = compileKernelBoundaryProbe(
      "anon-inode-standard-stdio-launcher",
      `#include <sys/eventfd.h>\n#include <unistd.h>\nint main(int argc, char **argv) { if (argc < 2) return 64; int fd = eventfd(0, 0); if (fd < 0) return 1; if (fd != 0 && dup2(fd, 0) < 0) return 2; if (fd != 0) close(fd); execv(argv[1], &argv[1]); return 127; }\n`,
    );
    const checked = spawnSync(
      launcher,
      [deterministicNetworkBoundary, "/bin/true"],
      {
        encoding: "utf8",
      },
    );
    expect(checked.status).toBe(78);
    expect(checked.stderr).toContain("standard descriptor 0");
  });

  test("Linux kernel boundary rejects an inherited non-tty character descriptor", () => {
    const launcher = compileKernelBoundaryProbe(
      "non-tty-character-standard-stdio-launcher",
      `#include <fcntl.h>\n#include <unistd.h>\nint main(int argc, char **argv) { if (argc < 2) return 64; int fd = open("/dev/zero", O_RDONLY); if (fd < 0) return 1; if (fd != 0 && dup2(fd, 0) < 0) return 2; if (fd != 0) close(fd); execv(argv[1], &argv[1]); return 127; }\n`,
    );
    const checked = spawnSync(
      launcher,
      [deterministicNetworkBoundary, "/bin/true"],
      {
        encoding: "utf8",
      },
    );
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
      `#define _GNU_SOURCE\n#include <errno.h>\n#include <sched.h>\n#include <signal.h>\n#include <sys/syscall.h>\n#include <unistd.h>\n#ifndef SYS_clone\n#error "clone is required for the namespace probe"\n#endif\n#ifndef SYS_clone3\n#error "clone3 is required for the namespace probe"\n#endif\n#ifndef SYS_setns\n#error "setns is required for the namespace probe"\n#endif\n#ifndef SYS_setpgid\n#error "setpgid is required for the namespace probe"\n#endif\n#ifndef SYS_setsid\n#error "setsid is required for the namespace probe"\n#endif\n#ifndef SYS_unshare\n#error "unshare is required for the namespace probe"\n#endif\nstatic int denied(long result) { return result == -1 && errno == EPERM ? 0 : 1; }\nint main(void) { errno = 0; if (denied(syscall(SYS_setsid)) != 0) return 1; errno = 0; if (denied(syscall(SYS_setpgid, 0, 0)) != 0) return 2; errno = 0; if (denied(syscall(SYS_setns, -1, 0)) != 0) return 3; errno = 0; if (denied(syscall(SYS_unshare, CLONE_NEWNS)) != 0) return 4; errno = 0; if (denied(syscall(SYS_clone, CLONE_NEWPID | SIGCHLD, 0, 0, 0, 0)) != 0) return 5; errno = 0; if (denied(syscall(SYS_clone3, 0, 0)) != 0) return 6; return 0; }\n`,
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
    const source = readFileSync(deterministicNetworkBoundarySource, "utf8");
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
    const source = readFileSync(deterministicNetworkBoundarySource, "utf8");
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
    expect(source).toContain("SYS_ioctl");
    expect(source).toContain("TUNSETIFF");
    expect(source).toContain("CAP_NET_ADMIN");
    expect(source).toContain("CapEff:");
    expect(source).toContain("/dev/net/tun");
  });

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
          deterministicNetworkBoundary,
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
  });

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
          "supervision_command_pid=$$",
          "supervision_command_start_time=0",
          'supervision_marker_pids_snapshot="$$ 0"',
          "signal_called=false",
          "kill() { signal_called=true; return 0; }",
          "if supervision_command_group_is_owned; then exit 10; fi",
          "if supervision_marker_snapshot_exists; then exit 11; fi",
          "supervision_signal_owned_processes TERM",
          'if [[ "$signal_called" == true ]]; then exit 12; fi',
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
