import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  lstatSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const runnerPath = join(repositoryRoot, "scripts", "ralph-run.sh");
const installerPath = join(
  repositoryRoot,
  "scripts",
  "ralph-install-worktree.sh",
);
const roots: Array<string> = [];

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

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("Ralph launcher boundaries", () => {
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
    expect(source).toContain('mbt_lock_file="$git_common_dir/ralph-mbt.lock"');
    expect(source).toContain("cleanup_idle_mbt_state");
    expect(source).toContain(
      "GitHub-backed integration runs require at least one explicit --task lane",
    );
    expect(source).toContain('if [[ "$github_issue_plan" == true ]]; then');
    expect(source).not.toContain(
      "if rg -q 'https://github\\.com/[^/[:space:]]+",
    );
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
      holder.kill("SIGKILL");
    }
  });
});
