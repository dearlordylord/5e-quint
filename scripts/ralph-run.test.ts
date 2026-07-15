import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  lstatSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const runnerPath = join(repositoryRoot, "scripts", "ralph-run.sh");
const broadLockPath = join(
  repositoryRoot,
  "scripts",
  "with-broad-workspace-lock.sh",
);
const mbtLockPath = join(repositoryRoot, "scripts", "with-mbt-lock.sh");
const resourceLockPath = join(
  repositoryRoot,
  "scripts",
  "with-resource-lock.sh",
);
const assertLockPath = join(
  repositoryRoot,
  "scripts",
  "assert-resource-lock.sh",
);
const packageJsonPath = join(repositoryRoot, "package.json");
const installerPath = join(
  repositoryRoot,
  "scripts",
  "ralph-install-worktree.sh",
);
const roots: Array<string> = [];
const independentLockEnvironment = { ...process.env };
delete independentLockEnvironment.DND_RESOURCE_LOCK_KIND;

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const waitUntil = async (
  predicate: () => boolean,
  timeoutMilliseconds = 3_000,
) => {
  const deadline = Date.now() + timeoutMilliseconds;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("timed out waiting for state");
    await delay(20);
  }
};

const hasExited = (child: ReturnType<typeof spawn>) =>
  child.exitCode !== null || child.signalCode !== null;

type OwnedProcess = {
  readonly pid: number;
  readonly processGroup: number;
};

const directChildren = (parentPid: number): ReadonlyArray<OwnedProcess> => {
  const result = spawnSync(
    "ps",
    ["--no-headers", "--ppid", String(parentPid), "-o", "pid=,pgid="],
    { encoding: "utf8" },
  );
  return result.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.trim().split(/\s+/).map(Number))
    .filter(
      (pair): pair is [number, number] =>
        pair.length === 2 &&
        pair.every((value) => Number.isInteger(value) && value > 1),
    )
    .map(([pid, processGroup]) => ({ pid, processGroup }));
};

const ownedDescendants = (
  child: ReturnType<typeof spawn>,
): ReadonlyArray<OwnedProcess> => {
  if (child.pid === undefined) return [];
  const descendants: Array<OwnedProcess> = [];
  const pending = [child.pid];
  while (pending.length > 0) {
    const parentPid = pending.shift()!;
    for (const descendant of directChildren(parentPid)) {
      descendants.push(descendant);
      pending.push(descendant.pid);
    }
  }
  return descendants;
};

const processExists = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const killOwnedDescendants = (descendants: ReadonlyArray<OwnedProcess>) => {
  for (const { pid, processGroup } of [...descendants].reverse()) {
    try {
      if (pid === processGroup) process.kill(-processGroup, "SIGKILL");
      else process.kill(pid, "SIGKILL");
    } catch {
      // The wrapper may have completed its own process-tree cleanup.
    }
  }
};

const terminateOwnedChild = async (child: ReturnType<typeof spawn>) => {
  if (hasExited(child)) return;
  const descendants = ownedDescendants(child);
  child.kill("SIGTERM");
  try {
    await waitUntil(() => hasExited(child), 3_000);
  } catch {
    killOwnedDescendants(descendants);
    child.kill("SIGKILL");
    await waitUntil(() => hasExited(child), 1_000);
  }
  const survivors = descendants.filter(({ pid }) => processExists(pid));
  killOwnedDescendants(survivors);
  if (survivors.length > 0)
    await waitUntil(
      () => survivors.every(({ pid }) => !processExists(pid)),
      1_000,
    );
};

const waitForExit = async (
  child: ReturnType<typeof spawn>,
  timeoutMilliseconds = 3_000,
) => {
  try {
    await waitUntil(() => hasExited(child), timeoutMilliseconds);
  } catch {
    await terminateOwnedChild(child);
    throw new Error("timed out waiting for child process");
  }
  if (child.signalCode !== null)
    throw new Error(`child exited from ${child.signalCode}`);
  return child.exitCode ?? 1;
};

const captureStderr = (child: ReturnType<typeof spawn>) => {
  let output = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk) => {
    output += String(chunk);
  });
  return () => output;
};

const processCommand = (pid: number) =>
  spawnSync("ps", ["--no-headers", "-p", String(pid), "-o", "comm="], {
    encoding: "utf8",
  }).stdout.trim();

const hasDirectFlockChild = (child: ReturnType<typeof spawn>) =>
  child.pid !== undefined &&
  directChildren(child.pid).some(({ pid }) => processCommand(pid) === "flock");

const git = (cwd: string, ...args: ReadonlyArray<string>) => {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  return result.stdout.trim();
};

const makeCleanRepository = () => {
  const root = mkdtempSync(join(tmpdir(), "ralph-runner-test-"));
  roots.push(root);
  mkdirSync(join(root, "scripts"), { recursive: true });
  cpSync(runnerPath, join(root, "scripts", "ralph-run.sh"));
  cpSync(broadLockPath, join(root, "scripts", "with-broad-workspace-lock.sh"));
  cpSync(mbtLockPath, join(root, "scripts", "with-mbt-lock.sh"));
  cpSync(resourceLockPath, join(root, "scripts", "with-resource-lock.sh"));
  cpSync(assertLockPath, join(root, "scripts", "assert-resource-lock.sh"));
  cpSync(installerPath, join(root, "scripts", "ralph-install-worktree.sh"));
  writeFileSync(join(root, "plan.md"), "test plan\n");
  writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  writeFileSync(join(root, "pnpm-workspace.yaml"), "packages: []\n");
  writeFileSync(
    join(root, ".gitignore"),
    ["/.ralph/", "/node_modules", "/packages/*/node_modules", ""].join("\n"),
  );
  git(root, "init", "--initial-branch=master");
  git(root, "config", "user.name", "Ralph Test");
  git(root, "config", "user.email", "ralph-test@example.invalid");
  git(root, "add", ".");
  git(root, "commit", "-m", "fixture");
  return root;
};

const addLockProbe = (root: string) => {
  const path = join(root, "scripts", "lock-probe.sh");
  writeFileSync(
    path,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'mode="$1"',
      'log="$2"',
      'release="${3:-}"',
      'if [[ "$mode" == holder ]]; then',
      '  echo A-start >>"$log"',
      '  while [[ ! -e "$release" ]]; do sleep 0.02; done',
      '  echo A-end >>"$log"',
      "else",
      '  echo B-start >>"$log"',
      "fi",
      "",
    ].join("\n"),
  );
  chmodSync(path, 0o755);
  git(root, "add", "scripts/lock-probe.sh");
  git(root, "commit", "-m", "add lock probe");
  return path;
};

const addOrphanProbe = (root: string) => {
  const path = join(root, "scripts", "orphan-probe.sh");
  writeFileSync(
    path,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'log="$1"',
      'pid_file="$2"',
      'echo A-start >>"$log"',
      "(",
      "  trap 'echo A-child-ended >>\"$log\"; sleep 0.2; exit 0' TERM",
      "  while :; do sleep 0.02; done",
      ") &",
      'child_pid="$!"',
      'echo "$$ $child_pid" >"$pid_file"',
      'wait "$child_pid"',
      "",
    ].join("\n"),
  );
  chmodSync(path, 0o755);
  git(root, "add", "scripts/orphan-probe.sh");
  git(root, "commit", "-m", "add orphan probe");
  return path;
};

const addStubbornProbe = (root: string) => {
  const path = join(root, "scripts", "stubborn-probe.sh");
  writeFileSync(
    path,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'log="$1"',
      'pid_file="$2"',
      "trap '' TERM",
      'echo A-start >>"$log"',
      'echo "$$" >"$pid_file"',
      "while :; do sleep 0.02; done",
      "",
    ].join("\n"),
  );
  chmodSync(path, 0o755);
  git(root, "add", "scripts/stubborn-probe.sh");
  git(root, "commit", "-m", "add stubborn probe");
  return path;
};

const runIdleMbtCleanup = (root: string, fakeBin: string) => {
  const runnerSource = readFileSync(
    join(root, "scripts", "ralph-run.sh"),
    "utf8",
  );
  const start = runnerSource.indexOf("kill_stray_mbt_processes() {");
  const endMarker = "\n}\n\nassert_clean_main_worktree()";
  const end = runnerSource.indexOf(endMarker, start);
  if (start < 0 || end < 0)
    throw new Error("Ralph cleanup functions not found");
  const cleanupFunctions = runnerSource.slice(start, end + 2);
  return spawnSync("bash", ["-s", "--", root], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ""}` },
    input: [
      "set -euo pipefail",
      cleanupFunctions,
      'repo_root="$1"',
      'git_common_dir="$(git rev-parse --path-format=absolute --git-common-dir)"',
      'heavy_verification_lock_file="$git_common_dir/ralph-heavy-verification.lock"',
      'legacy_broad_lock_file="$git_common_dir/ralph-broad-workspace-check.lock"',
      'legacy_mbt_lock_file="$git_common_dir/ralph-mbt.lock"',
      'log() { echo "$*" >&2; }',
      "cleanup_idle_mbt_state",
      "",
    ].join("\n"),
  });
};

const runResourceGuardBaseCheck = (root: string) => {
  const runnerSource = readFileSync(
    join(root, "scripts", "ralph-run.sh"),
    "utf8",
  );
  const start = runnerSource.indexOf("assert_resource_guarded_base() {");
  const end = runnerSource.indexOf(
    "\n}\n\n\nkill_stray_mbt_processes()",
    start,
  );
  if (start < 0 || end < 0)
    throw new Error("Ralph Base-SHA resource guard not found");
  const guardFunction = runnerSource.slice(start, end + 2);
  return spawnSync("bash", ["-s", "--"], {
    cwd: root,
    encoding: "utf8",
    input: [
      "set -euo pipefail",
      guardFunction,
      'assert_resource_guarded_base "$(git rev-parse HEAD)"',
      "",
    ].join("\n"),
  });
};

const parseDeciderDisposition = (report: string) => {
  const root = mkdtempSync(join(tmpdir(), "ralph-disposition-test-"));
  roots.push(root);
  const reportPath = join(root, "decider.md");
  writeFileSync(reportPath, report);

  const runnerSource = readFileSync(runnerPath, "utf8");
  const parserMatch = runnerSource.match(
    /parse_decider_disposition\(\) \{[\s\S]*?node - "\$report" <<'NODE'\n([\s\S]*?)\nNODE\n\}/,
  );
  if (!parserMatch) throw new Error("Ralph disposition parser not found");

  return spawnSync("node", ["-", reportPath], {
    encoding: "utf8",
    input: parserMatch[1],
  });
};

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("Ralph launcher boundaries", () => {
  it("parses the documented and concise decider disposition forms", () => {
    for (const disposition of [
      "done",
      "retry-same-task",
      "needs-more-research",
      "blocked-needs-design",
      "deferred",
    ] as const) {
      for (const report of [
        `- Task Disposition:\n  - Status: ${disposition}\n`,
        `Task Disposition: ${disposition} — disposition reason.\n`,
      ]) {
        const result = parseDeciderDisposition(report);
        expect(result.status, report).toBe(0);
        expect(result.stdout, report).toBe(disposition);
      }
    }

    for (const [report, expected] of [
      ["## Task Disposition\n- Status: done\n", "done"],
      ["- Task Disposition:\n  - Status: done\n", "done"],
      ["Task Disposition: `done`\n", "done"],
      ["Task Disposition: `done` — the reviewed commit is accepted.\n", "done"],
      [
        "Task Disposition: retry-same-task: one focused fix remains.\n",
        "retry-same-task",
      ],
    ] as const) {
      const result = parseDeciderDisposition(report);
      expect(result.status, report).toBe(0);
      expect(result.stdout, report).toBe(expected);
    }
  });

  it("rejects ambiguous or non-enumerated inline dispositions", () => {
    for (const report of [
      "Task Disposition: accepted\n",
      "Task Disposition: done retry-same-task\n",
      "Task Disposition: done-ish\n",
      "- Task Disposition: done-ish\n",
      "Implementation Status: done\n",
      "Status: done-ish\n",
      "Task Disposition: done\nTask Disposition: deferred\n",
      "Task Disposition: done — Task Disposition: retry-same-task\n",
    ]) {
      const result = parseDeciderDisposition(report);
      expect(result.status, report).not.toBe(0);
      expect(result.stderr, report).toContain(
        "missing Task Disposition status",
      );
    }
  });

  it("tolerates repeated identical explicit dispositions", () => {
    const result = parseDeciderDisposition(
      "Task Disposition: done\n## Task Disposition\n- Status: done\n",
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("done");
  });

  it("passes Bash syntax validation and keeps safety checks in front of mutation", () => {
    expect(spawnSync("bash", ["-n", runnerPath]).status).toBe(0);
    const source = readFileSync(runnerPath, "utf8");
    const runIdValidation = source.indexOf(
      '[[ "$run_id" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]]',
    );
    const firstStateDirectory = source.indexOf('mkdir -p "$repo_root/.ralph"');
    const globalLock = source.indexOf(
      'if [[ "${RALPH_LAUNCHER_LOCKED:-0}" != 1 ]]; then',
    );
    const livePlanValidation = source.indexOf(
      'ralph-issue-context.ts" validate-plan',
    );
    expect(runIdValidation).toBeGreaterThan(0);
    expect(runIdValidation).toBeLessThan(firstStateDirectory);
    expect(globalLock).toBeLessThan(livePlanValidation);
    expect(source).toContain("flock --exclusive --nonblock --close");
    expect(source).toContain("unset RALPH_LAUNCHER_LOCKED");
    const heavyVerificationLockAssignment = source.indexOf(
      'heavy_verification_lock_file="$git_common_dir/ralph-heavy-verification.lock"',
    );
    const legacyBroadLockAssignment = source.indexOf(
      'legacy_broad_lock_file="$git_common_dir/ralph-broad-workspace-check.lock"',
    );
    const legacyMbtLockAssignment = source.indexOf(
      'legacy_mbt_lock_file="$git_common_dir/ralph-mbt.lock"',
    );
    const idleMbtCleanupLock = source.indexOf(
      'exec 7>"$heavy_verification_lock_file"',
    );
    expect(heavyVerificationLockAssignment).toBeGreaterThan(0);
    expect(heavyVerificationLockAssignment).toBeLessThan(idleMbtCleanupLock);
    expect(legacyBroadLockAssignment).toBeGreaterThan(0);
    expect(legacyBroadLockAssignment).toBeLessThan(idleMbtCleanupLock);
    expect(legacyMbtLockAssignment).toBeGreaterThan(0);
    expect(legacyMbtLockAssignment).toBeLessThan(idleMbtCleanupLock);
    expect(source).toContain("scripts/with-mbt-lock.sh");
    expect(source).toContain("scripts/with-broad-workspace-lock.sh");
    expect(source).toContain("caps Turbo concurrency at one");
    expect(source).toContain("Treat SIGKILL or exit 137");
    expect(source).toContain(
      "compiler, Turbo/pnpm, test, proof, and evaluator",
    );
    expect(source).toContain("cleanup_idle_mbt_state");
    const resourceGuardCheck = source.indexOf(
      'assert_resource_guarded_base "$task_base_sha"',
    );
    const issueClaim = source.indexOf(
      'ralph-issue-context.ts" claim',
      resourceGuardCheck,
    );
    const taskWorktreeAdd = source.indexOf(
      'git worktree add -B "$implementation_branch"',
      resourceGuardCheck,
    );
    const taskInstall = source.indexOf(
      'bootstrap_worktree_install "$implementation_worktree"',
      taskWorktreeAdd,
    );
    expect(resourceGuardCheck).toBeGreaterThan(0);
    expect(issueClaim).toBeGreaterThan(resourceGuardCheck);
    expect(taskWorktreeAdd).toBeGreaterThan(0);
    expect(taskWorktreeAdd).toBeGreaterThan(issueClaim);
    expect(taskInstall).toBeGreaterThan(taskWorktreeAdd);
    expect(source).toContain("predates guarded verification");
    expect(source).toContain(
      "GitHub-backed integration runs require at least one explicit --task lane",
    );
    expect(source).toContain('if [[ "$github_issue_plan" == true ]]; then');
    expect(source).not.toContain(
      "if rg -q 'https://github\\.com/[^/[:space:]]+",
    );
  });

  it("serializes and caps resource-intensive root verification", () => {
    expect(spawnSync("bash", ["-n", broadLockPath]).status).toBe(0);
    expect(spawnSync("bash", ["-n", mbtLockPath]).status).toBe(0);
    expect(spawnSync("bash", ["-n", resourceLockPath]).status).toBe(0);
    expect(spawnSync("bash", ["-n", assertLockPath]).status).toBe(0);
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      readonly scripts: Readonly<Record<string, string>>;
    };
    for (const scriptName of ["quality", "typecheck", "test"] as const) {
      const script = packageJson.scripts[scriptName];
      expect(script).toContain("scripts/with-broad-workspace-lock.sh");
    }
    expect(packageJson.scripts["quality:body"]).toContain(
      "pnpm run typecheck:turbo",
    );
    expect(packageJson.scripts["quality:body"]).not.toContain("pnpm typecheck");
    expect(packageJson.scripts["typecheck:turbo"]).toContain("--concurrency=1");
    expect(packageJson.scripts["test:turbo"]).toContain("--concurrency=1");
    expect(packageJson.scripts["quality:body"]).not.toContain(
      "with-broad-workspace-lock",
    );
    expect(packageJson.scripts["proof:qnt"]).toContain("with-mbt-lock.sh");
    expect(packageJson.scripts["proof:qnt:body"]).toContain("test:qnt-proofs");
    expect(
      packageJson.scripts["check:surface-publication-self-test"],
    ).toContain("--maxWorkers=1");

    const packageJsonPaths = [
      "package.json",
      ...readdirSync(join(repositoryRoot, "packages"), {
        withFileTypes: true,
      })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join("packages", entry.name, "package.json"))
        .filter((relativePath) =>
          existsSync(join(repositoryRoot, relativePath)),
        ),
    ];
    for (const relativePath of packageJsonPaths) {
      const packageScripts = (
        JSON.parse(
          readFileSync(join(repositoryRoot, relativePath), "utf8"),
        ) as { readonly scripts: Readonly<Record<string, string>> }
      ).scripts;
      for (const [name, command] of Object.entries(packageScripts)) {
        const isResourceScript =
          name.startsWith("test:mbt") ||
          name.startsWith("test:qnt") ||
          name.startsWith("proof:");
        if (!isResourceScript) continue;
        if (name.endsWith(":body")) {
          expect(command, `${relativePath} ${name}`).toContain(
            "assert-resource-lock.sh mbt",
          );
        } else {
          expect(command, `${relativePath} ${name}`).toContain(
            "with-mbt-lock.sh",
          );
        }
      }
    }
  });

  it("rejects Base SHAs that only have the prior separate-lock guard", () => {
    const root = makeCleanRepository();
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        scripts: {
          quality: "scripts/with-broad-workspace-lock.sh true",
          typecheck: "scripts/with-broad-workspace-lock.sh true",
          test: "scripts/with-broad-workspace-lock.sh true",
        },
      }),
    );
    git(root, "add", "package.json");
    git(root, "commit", "-m", "add guarded package scripts");
    expect(runResourceGuardBaseCheck(root).status).toBe(0);

    const guardPath = join(root, "scripts", "with-resource-lock.sh");
    const currentGuard = readFileSync(guardPath, "utf8");
    writeFileSync(
      guardPath,
      currentGuard.replace(
        "ralph-heavy-verification.lock",
        "ralph-broad-workspace-check.lock",
      ),
    );
    git(root, "add", "scripts/with-resource-lock.sh");
    git(root, "commit", "-m", "simulate prior separate-lock guard");
    expect(runResourceGuardBaseCheck(root).status).not.toBe(0);

    writeFileSync(
      guardPath,
      currentGuard.replace(
        [
          'acquire_lock "$heavy_lock_fd"',
          'acquire_lock "$legacy_broad_lock_fd"',
        ].join("\n"),
        [
          'acquire_lock "$legacy_broad_lock_fd"',
          'acquire_lock "$heavy_lock_fd"',
        ].join("\n"),
      ),
    );
    git(root, "add", "scripts/with-resource-lock.sh");
    git(root, "commit", "-m", "simulate reordered guard acquisition");
    expect(runResourceGuardBaseCheck(root).status).not.toBe(0);
  });

  it("serializes every resource-lane pairing across linked worktrees", async () => {
    const root = makeCleanRepository();
    addLockProbe(root);
    const linked = mkdtempSync(join(tmpdir(), "ralph-lock-linked-"));
    roots.push(linked);
    rmSync(linked, { recursive: true });
    git(root, "worktree", "add", "-b", "lock-linked", linked, "master");

    for (const [holderWrapper, contenderWrapper] of [
      ["with-broad-workspace-lock.sh", "with-broad-workspace-lock.sh"],
      ["with-broad-workspace-lock.sh", "with-mbt-lock.sh"],
      ["with-mbt-lock.sh", "with-broad-workspace-lock.sh"],
      ["with-mbt-lock.sh", "with-mbt-lock.sh"],
    ] as const) {
      const pair = `${holderWrapper}-${contenderWrapper}`;
      const log = join(root, `${pair}.log`);
      const release = join(root, `${pair}.release`);
      const holder = spawn(
        join(root, "scripts", holderWrapper),
        [join(root, "scripts", "lock-probe.sh"), "holder", log, release],
        { cwd: root, env: independentLockEnvironment },
      );
      let contender: ReturnType<typeof spawn> | undefined;
      try {
        await waitUntil(() => existsSync(log));
        contender = spawn(
          join(linked, "scripts", contenderWrapper),
          [join(linked, "scripts", "lock-probe.sh"), "contender", log],
          { cwd: linked, env: independentLockEnvironment },
        );
        const contenderStderr = captureStderr(contender);
        await waitUntil(() => contenderStderr().includes("waiting:"));
        await waitUntil(
          () => contender !== undefined && hasDirectFlockChild(contender),
        );
        expect(readFileSync(log, "utf8").trim().split("\n")).toEqual([
          "A-start",
        ]);
        writeFileSync(release, "release\n");
        expect(await waitForExit(holder)).toBe(0);
        expect(await waitForExit(contender)).toBe(0);
        expect(readFileSync(log, "utf8").trim().split("\n")).toEqual([
          "A-start",
          "A-end",
          "B-start",
        ]);
      } finally {
        writeFileSync(release, "release\n");
        await terminateOwnedChild(holder);
        if (contender !== undefined) await terminateOwnedChild(contender);
      }
    }
  });

  it("rejects same-lock and cross-lock nesting without hanging", () => {
    const root = makeCleanRepository();
    const fixtureBroadLockPath = join(
      root,
      "scripts",
      "with-broad-workspace-lock.sh",
    );
    const fixtureMbtLockPath = join(root, "scripts", "with-mbt-lock.sh");
    for (const [outer, inner] of [
      [fixtureBroadLockPath, fixtureBroadLockPath],
      [fixtureBroadLockPath, fixtureMbtLockPath],
      [fixtureMbtLockPath, fixtureBroadLockPath],
      [fixtureMbtLockPath, fixtureMbtLockPath],
    ] as const) {
      const result = spawnSync(outer, [inner, "true"], {
        cwd: root,
        encoding: "utf8",
        env: independentLockEnvironment,
        timeout: 1_000,
      });
      expect(result.signal, `${outer} -> ${inner}`).toBeNull();
      expect(result.status, `${outer} -> ${inner}`).toBe(70);
      expect(result.stderr).toContain("refusing nested resource lock");
    }
  });

  it("cancels a lock waiter without leaving a flock child", async () => {
    const root = makeCleanRepository();
    const probe = addLockProbe(root);
    const holderLog = join(root, "waiter-holder.log");
    const release = join(root, "waiter-holder.release");
    const contenderLog = join(root, "waiter-contender.log");
    const holder = spawn(
      join(root, "scripts", "with-broad-workspace-lock.sh"),
      [probe, "holder", holderLog, release],
      { cwd: root, env: independentLockEnvironment },
    );
    let waiter: ReturnType<typeof spawn> | undefined;
    try {
      await waitUntil(() => existsSync(holderLog));
      waiter = spawn(
        join(root, "scripts", "with-broad-workspace-lock.sh"),
        [probe, "contender", contenderLog],
        { cwd: root, env: independentLockEnvironment },
      );
      await delay(120);
      expect(existsSync(contenderLog)).toBe(false);
      const acquisitionProcess = spawnSync(
        "ps",
        ["--no-headers", "--ppid", String(waiter.pid), "-o", "pid=,comm="],
        { encoding: "utf8" },
      ).stdout.trim();
      const [acquisitionPidText, acquisitionCommand] =
        acquisitionProcess.split(/\s+/);
      expect(acquisitionCommand).toBe("flock");
      const acquisitionPid = Number(acquisitionPidText);
      waiter.kill("SIGTERM");
      expect(await waitForExit(waiter)).toBe(143);
      expect(() => process.kill(acquisitionPid, 0)).toThrow();
      writeFileSync(release, "release\n");
      expect(await waitForExit(holder)).toBe(0);
      await delay(80);
      expect(existsSync(contenderLog)).toBe(false);
    } finally {
      writeFileSync(release, "release\n");
      await terminateOwnedChild(holder);
      if (waiter !== undefined) await terminateOwnedChild(waiter);
    }
  });

  it("rejects internal bodies when their lock is not held", () => {
    for (const [cwd, script] of [
      [repositoryRoot, "typecheck:turbo"],
      [repositoryRoot, "proof:qnt:body"],
      [
        join(repositoryRoot, "packages", "battle-runtime"),
        "test:qnt-proofs:body",
      ],
    ] as const) {
      const result = spawnSync("pnpm", ["run", script], {
        cwd,
        encoding: "utf8",
        env: { ...process.env, DND_RESOURCE_LOCK_KIND: "" },
      });
      expect(result.status, script).toBe(70);
      expect(result.stderr).toContain("resource-lock body requires");
    }
  });

  it("holds the lock while cleaning descendants after direct-child death", async () => {
    const root = makeCleanRepository();
    addLockProbe(root);
    const orphanProbe = addOrphanProbe(root);
    const log = join(root, "orphan-order.log");
    const pidFile = join(root, "orphan-pids");
    const holder = spawn(
      join(root, "scripts", "with-broad-workspace-lock.sh"),
      [orphanProbe, log, pidFile],
      { cwd: root, env: independentLockEnvironment },
    );
    let contender: ReturnType<typeof spawn> | undefined;
    try {
      await waitUntil(() => existsSync(pidFile));
      const [directPidText, grandchildPidText] = readFileSync(pidFile, "utf8")
        .trim()
        .split(" ");
      const directPid = Number(directPidText);
      const grandchildPid = Number(grandchildPidText);
      contender = spawn(
        join(root, "scripts", "with-broad-workspace-lock.sh"),
        [join(root, "scripts", "lock-probe.sh"), "contender", log],
        { cwd: root, env: independentLockEnvironment },
      );
      await delay(120);
      expect(readFileSync(log, "utf8").trim().split("\n")).toEqual(["A-start"]);
      process.kill(directPid, "SIGTERM");
      expect(await waitForExit(holder)).toBe(143);
      expect(await waitForExit(contender)).toBe(0);
      expect(readFileSync(log, "utf8").trim().split("\n")).toEqual([
        "A-start",
        "A-child-ended",
        "B-start",
      ]);
      expect(() => process.kill(grandchildPid, 0)).toThrow();
    } finally {
      await terminateOwnedChild(holder);
      if (contender !== undefined) await terminateOwnedChild(contender);
    }
  });

  it("keeps cleanup supervised when the wrapper receives repeated signals", async () => {
    const root = makeCleanRepository();
    const orphanProbe = addOrphanProbe(root);
    const log = join(root, "wrapper-signal.log");
    const pidFile = join(root, "wrapper-signal-pids");
    const holder = spawn(
      join(root, "scripts", "with-broad-workspace-lock.sh"),
      [orphanProbe, log, pidFile],
      { cwd: root, env: independentLockEnvironment },
    );
    try {
      await waitUntil(() => existsSync(pidFile));
      const grandchildPid = Number(
        readFileSync(pidFile, "utf8").trim().split(" ")[1],
      );
      holder.kill("SIGTERM");
      await delay(20);
      if (holder.exitCode === null) holder.kill("SIGHUP");
      expect(await waitForExit(holder)).toBe(143);
      expect(readFileSync(log, "utf8")).toContain("A-child-ended");
      expect(() => process.kill(grandchildPid, 0)).toThrow();

      const successor = spawn(
        join(root, "scripts", "with-broad-workspace-lock.sh"),
        ["true"],
        { cwd: root, env: independentLockEnvironment },
      );
      expect(await waitForExit(successor)).toBe(0);
    } finally {
      await terminateOwnedChild(holder);
    }
  });

  it("returns emergency status when mocked cleanup escalates to SIGKILL", () => {
    const root = makeCleanRepository();
    const fakeKillLauncher = join(root, "scripts", "fake-kill-launcher.sh");
    const escalationMarker = join(root, "mock-sigkill-escalation");
    writeFileSync(
      fakeKillLauncher,
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        'export DND_FAKE_KILL_STATE="$1"',
        "shift",
        "kill() {",
        '  if [[ "${1:-}" == -0 ]]; then [[ ! -e "$DND_FAKE_KILL_STATE" ]]; return; fi',
        '  if [[ "${1:-}" == -KILL ]]; then : >"$DND_FAKE_KILL_STATE"; fi',
        "  return 0",
        "}",
        "export -f kill",
        'exec "$@"',
        "",
      ].join("\n"),
    );
    chmodSync(fakeKillLauncher, 0o755);
    const result = spawnSync(
      fakeKillLauncher,
      [
        escalationMarker,
        join(root, "scripts", "with-broad-workspace-lock.sh"),
        "true",
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: independentLockEnvironment,
        timeout: 5_000,
      },
    );
    expect(result.signal).toBeNull();
    expect(result.status).toBe(137);
    expect(result.stderr).toContain("EMERGENCY");
    expect(existsSync(escalationMarker)).toBe(true);
  });

  it("SIGKILLs a real stubborn command before releasing the lock", async () => {
    const root = makeCleanRepository();
    addLockProbe(root);
    const stubbornProbe = addStubbornProbe(root);
    const log = join(root, "stubborn-order.log");
    const pidFile = join(root, "stubborn-pid");
    const holder = spawn(
      join(root, "scripts", "with-broad-workspace-lock.sh"),
      [stubbornProbe, log, pidFile],
      { cwd: root, env: independentLockEnvironment },
    );
    const holderStderr = captureStderr(holder);
    let contender: ReturnType<typeof spawn> | undefined;
    try {
      await waitUntil(() => existsSync(pidFile));
      const stubbornPid = Number(readFileSync(pidFile, "utf8").trim());
      contender = spawn(
        join(root, "scripts", "with-mbt-lock.sh"),
        [join(root, "scripts", "lock-probe.sh"), "contender", log],
        { cwd: root, env: independentLockEnvironment },
      );
      const contenderStderr = captureStderr(contender);
      await waitUntil(() => contenderStderr().includes("waiting:"));
      holder.kill("SIGTERM");
      expect(await waitForExit(holder, 5_000)).toBe(137);
      expect(holderStderr()).toContain("EMERGENCY");
      expect(() => process.kill(stubbornPid, 0)).toThrow();
      expect(await waitForExit(contender)).toBe(0);
      expect(readFileSync(log, "utf8").trim().split("\n")).toEqual([
        "A-start",
        "B-start",
      ]);
    } finally {
      await terminateOwnedChild(holder);
      if (contender !== undefined) await terminateOwnedChild(contender);
    }
  });

  it("does not launch a command after cancellation at the acquired event", () => {
    const root = makeCleanRepository();
    const signalLauncher = join(root, "scripts", "acquired-signal-launcher.sh");
    const forbiddenSideEffect = join(root, "command-must-not-start");
    writeFileSync(
      signalLauncher,
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "echo() {",
        '  builtin echo "$@"',
        '  if [[ "$*" == *"] acquired:"* ]]; then builtin kill -TERM "$$"; fi',
        "}",
        "export -f echo",
        'exec "$@"',
        "",
      ].join("\n"),
    );
    chmodSync(signalLauncher, 0o755);
    const result = spawnSync(
      signalLauncher,
      [
        join(root, "scripts", "with-broad-workspace-lock.sh"),
        "touch",
        forbiddenSideEffect,
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: independentLockEnvironment,
        timeout: 2_000,
      },
    );
    expect(result.signal).toBeNull();
    expect(result.status).toBe(143);
    expect(existsSync(forbiddenSideEffect)).toBe(false);
  });

  it("serializes new wrappers against both legacy lock generations", async () => {
    const root = makeCleanRepository();
    const probe = addLockProbe(root);
    const linked = mkdtempSync(join(tmpdir(), "ralph-legacy-lock-linked-"));
    roots.push(linked);
    rmSync(linked, { recursive: true });
    git(root, "worktree", "add", "-b", "legacy-lock-linked", linked, "master");
    const commonDir = git(
      root,
      "rev-parse",
      "--path-format=absolute",
      "--git-common-dir",
    );

    for (const [legacyName, newWrapper] of [
      ["ralph-mbt.lock", "with-broad-workspace-lock.sh"],
      ["ralph-broad-workspace-check.lock", "with-mbt-lock.sh"],
    ] as const) {
      const log = join(root, `${legacyName}.compat.log`);
      const release = join(root, `${legacyName}.compat.release`);
      const legacyHolder = spawn(
        "flock",
        [
          "--exclusive",
          join(commonDir, legacyName),
          probe,
          "holder",
          log,
          release,
        ],
        { cwd: root, env: independentLockEnvironment },
      );
      let newContender: ReturnType<typeof spawn> | undefined;
      try {
        await waitUntil(() => existsSync(log));
        newContender = spawn(
          join(linked, "scripts", newWrapper),
          [join(linked, "scripts", "lock-probe.sh"), "contender", log],
          { cwd: linked, env: independentLockEnvironment },
        );
        const contenderStderr = captureStderr(newContender);
        await waitUntil(() => contenderStderr().includes("waiting:"));
        await waitUntil(
          () => newContender !== undefined && hasDirectFlockChild(newContender),
        );
        expect(readFileSync(log, "utf8").trim().split("\n")).toEqual([
          "A-start",
        ]);
        writeFileSync(release, "release\n");
        expect(await waitForExit(legacyHolder)).toBe(0);
        expect(await waitForExit(newContender)).toBe(0);
        expect(readFileSync(log, "utf8").trim().split("\n")).toEqual([
          "A-start",
          "A-end",
          "B-start",
        ]);
      } finally {
        writeFileSync(release, "release\n");
        await terminateOwnedChild(legacyHolder);
        if (newContender !== undefined) await terminateOwnedChild(newContender);
      }

      const reverseLog = join(root, `${legacyName}.reverse.log`);
      const reverseRelease = join(root, `${legacyName}.reverse.release`);
      const waitingMarker = join(root, `${legacyName}.reverse.waiting`);
      const newHolder = spawn(
        join(root, "scripts", newWrapper),
        [probe, "holder", reverseLog, reverseRelease],
        { cwd: root, env: independentLockEnvironment },
      );
      let legacyContender: ReturnType<typeof spawn> | undefined;
      try {
        await waitUntil(() => existsSync(reverseLog));
        legacyContender = spawn(
          "bash",
          [
            "-c",
            'echo waiting >"$1"; exec flock --exclusive "$2" "$3" contender "$4"',
            "legacy-contender",
            waitingMarker,
            join(commonDir, legacyName),
            join(linked, "scripts", "lock-probe.sh"),
            reverseLog,
          ],
          { cwd: linked, env: independentLockEnvironment },
        );
        await waitUntil(() => existsSync(waitingMarker));
        await waitUntil(
          () =>
            legacyContender?.pid !== undefined &&
            processCommand(legacyContender.pid) === "flock",
        );
        expect(readFileSync(reverseLog, "utf8").trim().split("\n")).toEqual([
          "A-start",
        ]);
        writeFileSync(reverseRelease, "release\n");
        expect(await waitForExit(newHolder)).toBe(0);
        expect(await waitForExit(legacyContender)).toBe(0);
        expect(readFileSync(reverseLog, "utf8").trim().split("\n")).toEqual([
          "A-start",
          "A-end",
          "B-start",
        ]);
      } finally {
        writeFileSync(reverseRelease, "release\n");
        await terminateOwnedChild(newHolder);
        if (legacyContender !== undefined)
          await terminateOwnedChild(legacyContender);
      }
    }
  });

  it("runs destructive idle cleanup only when new and legacy locks are idle", async () => {
    const root = makeCleanRepository();
    const probe = addLockProbe(root);
    const commonDir = git(
      root,
      "rev-parse",
      "--path-format=absolute",
      "--git-common-dir",
    );
    const fakeBin = join(root, "fake-bin");
    const killallMarker = join(root, "killall-called");
    const artifact = join(root, "packages", "mbt-fuzz.log");
    mkdirSync(fakeBin);
    mkdirSync(join(root, "packages"), { recursive: true });
    writeFileSync(
      join(fakeBin, "killall"),
      ["#!/usr/bin/env bash", ': >"$CLEANUP_KILLALL_MARKER"', ""].join("\n"),
    );
    writeFileSync(
      join(fakeBin, "pgrep"),
      ["#!/usr/bin/env bash", "exit 1", ""].join("\n"),
    );
    chmodSync(join(fakeBin, "killall"), 0o755);
    chmodSync(join(fakeBin, "pgrep"), 0o755);

    for (const [name, command, args] of [
      ["new", join(root, "scripts", "with-broad-workspace-lock.sh"), [probe]],
      [
        "legacy-broad",
        "flock",
        [
          "--exclusive",
          join(commonDir, "ralph-broad-workspace-check.lock"),
          probe,
        ],
      ],
      [
        "legacy-mbt",
        "flock",
        ["--exclusive", join(commonDir, "ralph-mbt.lock"), probe],
      ],
    ] as const) {
      const log = join(root, `${name}-cleanup.log`);
      const release = join(root, `${name}-cleanup.release`);
      writeFileSync(artifact, "must survive while locked\n");
      rmSync(killallMarker, { force: true });
      const holder = spawn(command, [...args, "holder", log, release], {
        cwd: root,
        env: independentLockEnvironment,
      });
      try {
        await waitUntil(() => existsSync(log));
        const cleanup = runIdleMbtCleanup(root, fakeBin);
        expect(cleanup.status).toBe(0);
        expect(cleanup.stderr).toContain("heavy verification is active");
        expect(existsSync(artifact)).toBe(true);
        expect(existsSync(killallMarker)).toBe(false);
      } finally {
        writeFileSync(release, "release\n");
        await terminateOwnedChild(holder);
      }
    }

    process.env.CLEANUP_KILLALL_MARKER = killallMarker;
    try {
      const idleCleanup = runIdleMbtCleanup(root, fakeBin);
      expect(idleCleanup.status).toBe(0);
      expect(existsSync(artifact)).toBe(false);
      expect(existsSync(killallMarker)).toBe(true);
    } finally {
      delete process.env.CLEANUP_KILLALL_MARKER;
    }
  });

  it("rejects traversal in a run ID before creating runner state", () => {
    const unique = `escape-${process.pid}-${Date.now()}`;
    const escapedPath = join(repositoryRoot, ".ralph", unique);
    expect(existsSync(escapedPath)).toBe(false);
    const result = spawnSync(
      "bash",
      [runnerPath, "package.json", "--run-id", `../${unique}`],
      { cwd: repositoryRoot, encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--run-id must be a 1-128 character slug");
    expect(existsSync(escapedPath)).toBe(false);
  });

  it("rejects malformed task and branch arguments before launch", () => {
    for (const args of [
      ["--task", "0"],
      ["--task", "not-a-number"],
      ["--smoke-task", "0"],
      ["--output-branch", "@{-1}"],
      ["--output-branch", "-dangerous"],
      ["--output-branch", "ralph/claims/issue-41"],
    ]) {
      const result = spawnSync("bash", [runnerPath, "package.json", ...args], {
        cwd: repositoryRoot,
        encoding: "utf8",
      });
      expect(result.status, args.join(" ")).toBe(1);
    }
  });

  it("rejects an untracked file before creating runner state", () => {
    const root = makeCleanRepository();
    writeFileSync(join(root, "local-only.txt"), "not in the declared base\n");
    const result = spawnSync(
      "bash",
      ["scripts/ralph-run.sh", "plan.md", "--run-id", "untracked-run"],
      { cwd: root, encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "main worktree has tracked or untracked changes",
    );
    expect(existsSync(join(root, ".ralph"))).toBe(false);
  });

  it("bootstraps or repairs an isolated launcher install before validate-plan", () => {
    const root = makeCleanRepository();
    const launcher = mkdtempSync(join(tmpdir(), "ralph-linked-launcher-"));
    roots.push(launcher);
    rmSync(launcher, { recursive: true });
    const fakeBin = join(root, "fake-bin");
    const fakePnpm = join(fakeBin, "pnpm");
    writeFileSync(
      join(root, "plan.md"),
      "<!-- ralph-github-issues: required -->\n",
    );
    git(root, "add", "plan.md");
    git(root, "commit", "-m", "github plan");
    mkdirSync(join(root, "node_modules"), { recursive: true });
    mkdirSync(join(root, "packages", "mcp", "node_modules"), {
      recursive: true,
    });
    git(root, "worktree", "add", "-b", "launcher/test", launcher, "master");
    symlinkSync(join(root, "removed-install"), join(launcher, "node_modules"));
    mkdirSync(fakeBin, { recursive: true });
    writeFileSync(
      fakePnpm,
      [
        "#!/usr/bin/env bash",
        'if [[ "${1:-}" == "install" ]]; then',
        "  mkdir -p node_modules packages/mcp/node_modules",
        "  exit 0",
        "fi",
        "exit 42",
        "",
      ].join("\n"),
    );
    chmodSync(fakePnpm, 0o755);

    const result = spawnSync(
      "bash",
      ["scripts/ralph-run.sh", "plan.md", "--base", "master", "--task", "1"],
      {
        cwd: launcher,
        encoding: "utf8",
        env: { ...process.env, PATH: `${fakeBin}:${process.env.PATH ?? ""}` },
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("GitHub issue plan validation failed");
    expect(lstatSync(join(launcher, "node_modules")).isSymbolicLink()).toBe(
      false,
    );
    expect(
      lstatSync(
        join(launcher, "packages", "mcp", "node_modules"),
      ).isSymbolicLink(),
    ).toBe(false);
  });

  it("serializes different run IDs through the launcher-worktree lock", async () => {
    const root = makeCleanRepository();
    const lock = join(root, ".ralph", "runner.lock");
    mkdirSync(dirname(lock), { recursive: true });
    const holder = spawn("flock", ["-x", lock, "-c", "echo ready; sleep 10"]);
    await new Promise<void>((resolve, reject) => {
      holder.once("error", reject);
      holder.stdout.once("data", () => resolve());
    });
    try {
      const result = spawnSync(
        "bash",
        ["scripts/ralph-run.sh", "plan.md", "--run-id", "second-run"],
        { cwd: root, encoding: "utf8" },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "another Ralph runner is already using this launcher worktree",
      );
      expect(git(root, "branch", "--show-current")).toBe("master");
    } finally {
      await terminateOwnedChild(holder);
    }
  });
});
