import { spawnSync } from "node:child_process";
import {
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const installerPath = join(
  repositoryRoot,
  "scripts",
  "ralph-install-worktree.sh",
);
const roots: Array<string> = [];

const run = (cwd: string, command: string, args: ReadonlyArray<string>) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, HUSKY: "0" },
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} failed`);
  }
};

const makeWorkspace = () => {
  const root = mkdtempSync(join(tmpdir(), "ralph-install-worktree-"));
  roots.push(root);
  mkdirSync(join(root, "packages", "a"), { recursive: true });
  mkdirSync(join(root, "packages", "b"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ private: true, packageManager: "pnpm@10.29.3" }),
  );
  writeFileSync(
    join(root, "pnpm-workspace.yaml"),
    'packages:\n  - "packages/*"\n',
  );
  writeFileSync(
    join(root, "packages", "a", "package.json"),
    JSON.stringify({ name: "@fixture/a", version: "0.0.0" }),
  );
  writeFileSync(
    join(root, "packages", "b", "package.json"),
    JSON.stringify({
      name: "@fixture/b",
      version: "0.0.0",
      dependencies: { "@fixture/a": "workspace:*" },
    }),
  );
  run(root, "pnpm", ["install", "--lockfile-only", "--ignore-scripts"]);
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Ralph worktree installs", () => {
  it("passes Bash syntax validation", () => {
    expect(spawnSync("bash", ["-n", installerPath]).status).toBe(0);
  });

  it("replaces shared install links and keeps workspace dependencies lane-local", () => {
    const first = makeWorkspace();
    run(first, "bash", [installerPath, first]);

    const second = mkdtempSync(join(tmpdir(), "ralph-install-worktree-copy-"));
    roots.push(second);
    cpSync(first, second, {
      recursive: true,
      filter: (source) => !source.endsWith("node_modules"),
    });
    symlinkSync(join(first, "node_modules"), join(second, "node_modules"));
    mkdirSync(join(second, "packages", "b"), { recursive: true });
    symlinkSync(
      join(first, "packages", "b", "node_modules"),
      join(second, "packages", "b", "node_modules"),
    );

    run(second, "bash", [installerPath, second]);

    expect(lstatSync(join(second, "node_modules")).isSymbolicLink()).toBe(
      false,
    );
    expect(
      lstatSync(join(second, "packages", "b", "node_modules")).isSymbolicLink(),
    ).toBe(false);
    expect(
      realpathSync(
        join(first, "packages", "b", "node_modules", "@fixture", "a"),
      ),
    ).toBe(join(first, "packages", "a"));
    expect(
      realpathSync(
        join(second, "packages", "b", "node_modules", "@fixture", "a"),
      ),
    ).toBe(join(second, "packages", "a"));
  });
});
