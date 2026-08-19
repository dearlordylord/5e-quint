import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
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
const currentGitSha = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();

function run(
  script: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): void {
  execFileSync("pnpm", ["exec", "tsx", script, ...args], {
    cwd: repoRoot,
    env,
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
      "missing implementation revision",
      ["tracer-001-goblin-warrior-vs-skeleton", "--implementation-git-sha"],
    ],
    [
      "malformed implementation revision",
      [
        "tracer-001-goblin-warrior-vs-skeleton",
        "--implementation-git-sha",
        "not-a-git-sha",
      ],
    ],
    [
      "duplicate implementation revision",
      [
        "tracer-001-goblin-warrior-vs-skeleton",
        "--implementation-git-sha",
        currentGitSha,
        "--implementation-git-sha",
        currentGitSha,
      ],
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
    [
      "benchmark profile without context path",
      [
        "tracer-001-goblin-warrior-vs-skeleton",
        "--benchmark-profile",
        "boundedCapabilityProjection",
      ],
    ],
    [
      "benchmark context path without profile",
      [
        "tracer-001-goblin-warrior-vs-skeleton",
        "--benchmark-context-path",
        "scripts/raw-swarm/reviews/sdk-player.prompt.txt",
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
            "tracer-001-goblin-warrior-vs-skeleton",
            "--implementation-git-sha",
            mismatchedGitSha,
          ],
          {
            ...process.env,
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
    const transcriptPath = resolve(testRoot, "transcript.jsonl");
    const reviewPath = resolve(testRoot, "review.json");
    const logPath = resolve(testRoot, "review.log");
    const capturePath = resolve(testRoot, "codex-input.bin");
    const context = "exact context bytes α\nwith no pointer substitution";
    writeFileSync(contextPath, context);
    writeFileSync(promptPath, "Review the packet.\n");
    writeFileSync(transcriptPath, "synthetic transcript\n");
    const fakePnpm = resolve(commandRoot, "pnpm");
    const fakeCodex = resolve(commandRoot, "codex");
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
cat > "$RAW_REVIEW_CAPTURE"
printf '%s' '{}' > "$output"
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
          ...process.env,
          PATH: `${commandRoot}:${process.env.PATH ?? ""}`,
          RAW_REVIEW_CAPTURE: capturePath,
          RAW_REVIEW_CONTEXT_PATH: relative(repoRoot, contextPath),
          RAW_REVIEW_CONTEXT_PROFILE: "boundedCapabilityProjection",
          RAW_REVIEW_CONTEXT_ROLE: "postPlayReview",
          RAW_REVIEW_IMPLEMENTATION_GIT_SHA: currentGitSha,
        },
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
          ...process.env,
          PATH: `${commandRoot}:${process.env.PATH ?? ""}`,
          RAW_REVIEW_IMPLEMENTATION_GIT_SHA: "not-a-git-sha",
        },
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
            ...process.env,
            PATH: `${commandRoot}:${process.env.PATH ?? ""}`,
            RAW_REVIEW_IMPLEMENTATION_GIT_SHA: mismatchedGitSha,
          },
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
