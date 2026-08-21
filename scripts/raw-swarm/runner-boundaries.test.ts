import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
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
import { PLAYER_CONTINUATION_PROTOCOL_REMINDER } from "./sdk-player/continuation-contract.ts";

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
    const prompt = readFileSync(
      resolve(repoRoot, "scripts/raw-swarm/reviews/sdk-player.prompt.txt"),
      "utf8",
    );

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
    expect(script).not.toContain("RAW_REVIEW_CONTEXT_READ_PLAN");
    expect(script).not.toContain("Read every listed contiguous range");
    expect(script).toContain("client-truncated");
    expect(script).toContain("codex exec");
    expect(script).toContain(
      "boundedCapabilityProjection) RAW_REVIEW_REASONING_EFFORT=medium",
    );
    expect(script).toContain(
      'documentDeclarationSet|"") RAW_REVIEW_REASONING_EFFORT=max',
    );
    expect(script).toContain(
      '-c "model_reasoning_effort=\\"$RAW_REVIEW_REASONING_EFFORT\\""',
    );
    expect(script).toContain(
      '--reasoning-effort "$RAW_REVIEW_REASONING_EFFORT"',
    );
    expect(script.indexOf("model-telemetry-cli.ts")).toBeGreaterThan(
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
        "printf '%s\\n' \"$RAW_REVIEW_CONTEXT_READ_EVENT\"",
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
          ...process.env,
          PATH: `${commandRoot}:${process.env.PATH ?? ""}`,
          RAW_REVIEW_CAPTURE: capturePath,
          RAW_REVIEW_CONTEXT_PATH: relative(repoRoot, contextPath),
          RAW_REVIEW_CONTEXT_PROFILE: "documentDeclarationSet",
          RAW_REVIEW_CONTEXT_ROLE: "postPlayReview",
          RAW_REVIEW_CONTEXT_READ_EVENT: contextReadEvent,
          RAW_REVIEW_PNPM_CAPTURE: pnpmCapturePath,
          RAW_REVIEW_IMPLEMENTATION_GIT_SHA: currentGitSha,
        },
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
          ...process.env,
          PATH: `${commandRoot}:${process.env.PATH ?? ""}`,
          RAW_REVIEW_PNPM_CAPTURE: pnpmCapturePath,
          RAW_REVIEW_IMPLEMENTATION_GIT_SHA: currentGitSha,
        },
        encoding: "utf8",
      },
    );
    try {
      expect(result.status).toBe(1);
      const telemetryCommand = readFileSync(pnpmCapturePath, "utf8")
        .split("\n")
        .find((line) => line.includes("model-telemetry-cli.ts"));
      expect(telemetryCommand).toContain("--shell-status 1");
      const ledger = JSON.parse(readFileSync(ledgerPath, "utf8")) as {
        readonly exit: { readonly tag: string; readonly status?: number };
        readonly result: { readonly tag: string };
      };
      expect(ledger.exit).toEqual({ tag: "shellStatus", status: 1 });
      expect(ledger.result.tag).toBe("failed");
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
