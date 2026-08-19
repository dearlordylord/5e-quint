import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";

import { repoRoot } from "./transcript.ts";

const recorder = resolve(repoRoot, "scripts/raw-swarm/mcp-recording-shim.ts");
const launcher = resolve(repoRoot, "scripts/raw-swarm/run-freeplay.ts");
const reviewer = resolve(repoRoot, "scripts/raw-swarm/run-raw-review.sh");
const sdkPlayerLauncher = resolve(
  repoRoot,
  "scripts/raw-swarm/run-sdk-player.ts",
);

function run(script: string, args: readonly string[]): void {
  execFileSync("pnpm", ["exec", "tsx", script, ...args], {
    cwd: repoRoot,
    stdio: "pipe",
  });
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

    expect(script).toContain("--sandbox danger-full-access");
    expect(script).not.toContain("RAW_REVIEW_SANDBOX");
    expect(script).not.toContain("--iso-8601=milliseconds");
    expect(script).toContain("new Date().toISOString()");
    expect(script).toContain("sdk-review-packet-cli.ts");
    expect(script).toContain("review-output-validation.ts");
    expect(script).toContain("review-invocation-policy.ts");
    expect(script).toContain("git diff --quiet");
    expect(script).toContain("RAW_REVIEW_INVOCATION_GIT_SHA");
    expect(script).toContain("RAW_REVIEW_CONTEXT_SHA256=$(sha256sum");
    expect(script).toContain("Read the exact delivered review context at");
    expect(script).toContain("RAW_REVIEW_CONTEXT_CANDIDATE");
    expect(script).toContain("realpath --");
    expect(script).toContain(
      "RAW_REVIEW_CONTEXT_PATH escapes the repository root",
    );
    expect(script).not.toContain(
      'RAW_REVIEW_CAPABILITY_CONTEXT=$(<"$RAW_REVIEW_CONTEXT_PATH")',
    );
    expect(script).toContain("| codex exec");
  });

  test.each([
    ["invalid scenario", ["../repository"]],
    [
      "duplicate isolation fallback",
      [
        "tracer-001-goblin-warrior-vs-skeleton",
        "--instructional-isolation",
        "--instructional-isolation",
      ],
    ],
    [
      "unknown option",
      ["tracer-001-goblin-warrior-vs-skeleton", "--no-isolation"],
    ],
    [
      "lone unknown option",
      ["tracer-001-goblin-warrior-vs-skeleton", "--bogus"],
    ],
    [
      "missing evidence id",
      ["tracer-001-goblin-warrior-vs-skeleton", "--evidence-id"],
    ],
    [
      "invalid evidence id",
      ["tracer-001-goblin-warrior-vs-skeleton", "--evidence-id", "../outside"],
    ],
    [
      "duplicate evidence id",
      [
        "tracer-001-goblin-warrior-vs-skeleton",
        "--evidence-id",
        "first",
        "--evidence-id",
        "second",
      ],
    ],
    [
      "path flag used as value",
      [
        "tracer-001-goblin-warrior-vs-skeleton",
        "--scenario-path",
        "--setup-path",
        "scenario.setup.ts",
      ],
    ],
    [
      "path traversal outside the repository",
      [
        "tracer-001-goblin-warrior-vs-skeleton",
        "--scenario-path",
        "../outside/scenario.md",
      ],
    ],
    [
      "absolute output outside the repository",
      [
        "tracer-001-goblin-warrior-vs-skeleton",
        "--output-path",
        resolve(tmpdir(), "raw-swarm-outside"),
      ],
    ],
    [
      "benchmark context traversal outside the repository",
      [
        "tracer-001-goblin-warrior-vs-skeleton",
        "--benchmark-context-path",
        "../outside/context.md",
      ],
    ],
  ])(
    "rejects direct-SDK launcher %s",
    (_label, args) => {
      expect(() => run(sdkPlayerLauncher, args)).toThrow();
    },
    30_000,
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
          "tracer-001-goblin-warrior-vs-skeleton",
          "--scenario-path",
          escapedRead,
        ]),
      ).toThrow();
      expect(() =>
        run(sdkPlayerLauncher, [
          "tracer-001-goblin-warrior-vs-skeleton",
          "--output-path",
          escapedOutput,
        ]),
      ).toThrow();
    } finally {
      rmSync(boundaryRoot, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  }, 30_000);

  test("loads the direct-SDK launcher before rejecting invalid input", () => {
    expect(() => run(sdkPlayerLauncher, [])).toThrowError(
      /Usage: run-sdk-player\.ts/,
    );
  }, 30_000);
});
