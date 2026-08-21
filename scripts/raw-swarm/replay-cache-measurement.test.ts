import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { afterEach, expect, test } from "vitest";

import { measurePrefixReplay } from "./replay-cache-measurement.ts";
import { repoRoot } from "./transcript.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects an evidence-set authority outside the repository", () => {
  const outside = mkdtempSync(resolve(tmpdir(), "raw-swarm-cache-outside-"));
  directories.push(outside);
  expect(() => measurePrefixReplay({ evidenceSetDirectory: outside })).toThrow(
    /Replay authority is not repository-owned/,
  );
});

test("rejects an external cache output before replay execution", () => {
  const outside = mkdtempSync(resolve(tmpdir(), "raw-swarm-cache-output-"));
  directories.push(outside);
  const script = resolve(
    repoRoot,
    "scripts/raw-swarm/replay-cache-measurement.ts",
  );
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      script,
      "scripts/raw-swarm/out",
      resolve(outside, "measurement.json"),
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  expect(result.status).not.toBe(0);
  expect(`${result.stdout}${result.stderr}`).toContain(
    "Replay output is not repository-owned",
  );
});
