import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  ])(
    "rejects direct-SDK launcher %s",
    (_label, args) => {
      expect(() => run(sdkPlayerLauncher, args)).toThrow();
    },
    30_000,
  );

  test("loads the direct-SDK launcher before rejecting invalid input", () => {
    expect(() => run(sdkPlayerLauncher, [])).toThrowError(
      /Usage: run-sdk-player\.ts/,
    );
  }, 30_000);
});
