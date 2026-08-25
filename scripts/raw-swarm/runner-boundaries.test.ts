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
const modelBackedRunner = resolve(
  repoRoot,
  "scripts/raw-swarm/run-model-backed.mjs",
);
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
});
const modelEntryPointTestEnvironment: NodeJS.ProcessEnv = {
  ...process.env,
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
    let owner: ReturnType<typeof spawn> | undefined;
    let wrapperPid: number | undefined;
    let childPid: number | undefined;
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
    try {
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
      owner = spawn(ownerScript, [process.execPath, "-e", childSource], {
        cwd: repoRoot,
        env: {
          ...modelLaneTestEnvironment(commandRoot, firstDeadline),
          RAW_SWARM_MODEL_LANE_LOCK: modelLaneLock,
          RAW_SWARM_WRAPPER_PID: wrapperPidPath,
          RAW_SWARM_CHILD_PID: childPidPath,
        },
        stdio: "ignore",
      });
      await waitForFile(wrapperPidPath);
      await waitForFile(childPidPath);
      wrapperPid = Number(readFileSync(wrapperPidPath, "utf8").trim());
      childPid = Number(readFileSync(childPidPath, "utf8").trim());
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
      if (owner !== undefined && owner.exitCode === null) {
        owner.kill("SIGKILL");
      }
      if (wrapperPid !== undefined && processIsLive(wrapperPid)) {
        process.kill(wrapperPid, "SIGTERM");
      }
      if (childPid !== undefined && processIsLive(childPid)) {
        process.kill(childPid, "SIGKILL");
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
    writeFileSync(
      fakeGit,
      String.raw`#!/bin/sh
set -eu
case "$*" in
  *show-toplevel*) printf '%s\n' '${repoRoot}' ;;
  *rev-parse\ HEAD*) printf '%s\n' '${currentGitSha}' ;;
  *status*) exit 0 ;;
  *) exit 0 ;;
esac
`,
    );
    chmodSync(fakeGit, 0o755);
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
        },
      );
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
