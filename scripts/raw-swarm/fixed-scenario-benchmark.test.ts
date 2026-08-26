import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { capabilityContextForRole } from "./capability-projection.ts";
import {
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
  HistoricalScenarioCompositeReviewSchema,
} from "./scenario-campaign.ts";
import {
  FIXED_BENCHMARK_SOURCE_REVIEW_PROMPTS,
  FIXED_SCENARIO_ID,
  benchmarkCommands,
  fixedBenchmarkContextForRole,
  fixedBenchmarkCodexArgs,
  fixedBenchmarkDocumentDeclarationContextForRole,
  fixedBenchmarkProfilePaths,
  fixedBenchmarkScratchInputManifestPrompt,
  fixedScenarioCanonicalBundle,
  initializeFixedBenchmarkProfileDirectory,
  parseFixedBenchmarkProfile,
  retainBenchmarkReviewReplayEvents,
  validateBenchmarkPreparationEventStream,
  validateBenchmarkReviewAuthority,
} from "./fixed-scenario-benchmark.ts";
import { evaluateScenarioCharacters } from "./sdk-player/scenario-character-runtime.ts";
import {
  decodeEvidenceSetId,
  decodeExecutionId,
} from "./raw-swarm-identities.ts";
import { GitShaSchema, repoRoot } from "./transcript.ts";

const fixedBenchmarkCli = resolve(
  repoRoot,
  "scripts/raw-swarm/fixed-scenario-benchmark.ts",
);

const historicalReview = {
  raw: {
    classification: "supported" as const,
    evidence: "The synthetic review finds no RAW contradiction.",
  },
  contentAvailability: {
    classification: "supplied" as const,
    evidence: "The tracked stat blocks are available.",
  },
  sdkCapability: {
    classification: "supported" as const,
    evidence: "The public SDK surface represents the scenario.",
  },
  artifactPolicy: {
    classification: "safe" as const,
    evidence: "The retained source uses publishable identity safely.",
  },
};

const currentReview = {
  ...historicalReview,
  scenarioQuality: {
    classification: "ready" as const,
    evidence: "The tracked setup is mechanically meaningful.",
  },
};

describe("fixed scenario benchmark boundary", () => {
  test("gives preparation calls an exact deterministic scratch input manifest", () => {
    const prompt = fixedBenchmarkScratchInputManifestPrompt({
      scratch: "/tmp/synthetic-scratch",
      readableFiles: ["SCENARIO.md", "BENCHMARK_CONTEXT.md", "SCENARIO.md"],
      taskPrompt: "Review the supplied scenario.",
    });

    expect(prompt).toContain(
      "The only readable scratch files are this exact manifest:\n- `BENCHMARK_CONTEXT.md`\n- `SCENARIO.md`",
    );
    expect(prompt).toContain(
      "Do not attempt to inspect, read, search, hash, count, or otherwise reference any other filename or path.",
    );
    expect(prompt).toContain("Review the supplied scenario.");
  });

  test("keeps source preparation instructions read-only", () => {
    for (const prompt of Object.values(FIXED_BENCHMARK_SOURCE_REVIEW_PROMPTS)) {
      expect(prompt).toContain(
        "Do not execute typecheck, Node, or client commands",
      );
      expect(prompt).toContain(
        "Use only the read commands listed by the scratch isolation instructions",
      );
      expect(prompt).not.toContain("run the documented typecheck");
    }
  });

  test("allows isolated benchmark consumers outside a Git checkout", () => {
    expect(
      fixedBenchmarkCodexArgs(
        "/tmp/synthetic-consumer",
        "gpt-5.6-sol",
        "medium",
        "Review the synthetic source.",
        undefined,
        "workspace-write",
      ),
    ).toContain("--skip-git-repo-check");
  });

  test("creates a profile beneath a missing run directory and refuses overwrite", () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), "dnd-fixed-profile-"));
    const profileRoot = resolve(temporaryRoot, "run", "profile");
    try {
      initializeFixedBenchmarkProfileDirectory(profileRoot);

      expect(existsSync(profileRoot)).toBe(true);
      expect(() =>
        initializeFixedBenchmarkProfileDirectory(profileRoot),
      ).toThrow();
    } finally {
      rmSync(temporaryRoot, { recursive: true });
    }
  });

  test("retains review events adjacent to their replay envelope", () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), "dnd-fixed-review-"));
    const eventPath = resolve(temporaryRoot, "invocation.events.jsonl");
    const replayPath = resolve(temporaryRoot, "milestone.input.json");
    try {
      writeFileSync(eventPath, '{"type":"thread.started"}\n');

      const retainedPath = retainBenchmarkReviewReplayEvents(
        eventPath,
        replayPath,
      );

      expect(retainedPath).toBe(
        resolve(temporaryRoot, "milestone.input.events.jsonl"),
      );
      expect(readFileSync(retainedPath, "utf8")).toBe(
        '{"type":"thread.started"}\n',
      );
      expect(() =>
        retainBenchmarkReviewReplayEvents(eventPath, replayPath),
      ).toThrow();
    } finally {
      rmSync(temporaryRoot, { recursive: true });
    }
  });

  test("retains a review replay raw sibling when the invocation failed", () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), "dnd-fixed-raw-"));
    const eventPath = resolve(temporaryRoot, "invocation.events.jsonl");
    const replayPath = resolve(temporaryRoot, "milestone.input.json");
    const rawPath = `${eventPath}.codex-raw`;
    const rawContents = Buffer.from("failed benchmark output\n", "utf8");
    try {
      writeFileSync(rawPath, rawContents);
      writeFileSync(
        eventPath,
        `${JSON.stringify({
          type: "raw-swarm.invocation.codex-raw-retained",
          source: "settledSidecar",
          reason: "failedInvocation",
          rawContentsSha256: createHash("sha256")
            .update(rawContents)
            .digest("hex"),
          rawContentsByteLength: rawContents.byteLength,
        })}\n`,
      );
      const retainedPath = retainBenchmarkReviewReplayEvents(
        eventPath,
        replayPath,
      );
      expect(readFileSync(`${retainedPath}.codex-raw`)).toEqual(rawContents);
    } finally {
      rmSync(temporaryRoot, { recursive: true });
    }
  });

  test("accepts captured direct-read commands confined to named scratch inputs", () => {
    const scratch = mkdtempSync(resolve(tmpdir(), "dnd-fixed-isolation-"));
    const eventPath = resolve(scratch, "events.jsonl");
    const contextPath = resolve(scratch, "BENCHMARK_CONTEXT.md");
    try {
      writeFileSync(contextPath, "synthetic context\n");
      writeFileSync(
        eventPath,
        JSON.stringify({
          type: "item.started",
          item: {
            id: "item_1",
            type: "command_execution",
            command: `/bin/bash -c "sed -n '1,20p' ${contextPath}"`,
          },
        }) +
          "\n" +
          JSON.stringify({
            type: "item.completed",
            item: {
              id: "item_1",
              type: "command_execution",
              command: `/bin/bash -lc "rg -n -o context ${contextPath}"`,
              aggregated_output: "",
              exit_code: 1,
              status: "failed",
            },
          }) +
          "\n" +
          JSON.stringify({
            type: "item.completed",
            item: {
              id: "item_2",
              type: "command_execution",
              command: `/bin/bash -lc "rg -n -C 6 context ${contextPath}"`,
              aggregated_output: "synthetic context\n",
              exit_code: 0,
              status: "completed",
            },
          }) +
          "\n" +
          JSON.stringify({
            type: "item.completed",
            item: {
              id: "item_3",
              type: "command_execution",
              command: "/bin/bash -c 'tail -n 200 BENCHMARK_CONTEXT.md'",
              aggregated_output: "synthetic context\n",
              exit_code: 0,
              status: "completed",
            },
          }) +
          "\n" +
          JSON.stringify({
            type: "item.completed",
            item: {
              id: "item_4",
              type: "command_execution",
              command: "/bin/bash -c 'head -n 20 BENCHMARK_CONTEXT.md'",
              aggregated_output: "synthetic context\n",
              exit_code: 0,
              status: "completed",
            },
          }) +
          "\n" +
          JSON.stringify({
            type: "item.completed",
            item: {
              id: "item_5",
              type: "command_execution",
              command: String.raw`/bin/bash -c "rg -n -i \"SCENARIO_REVIEW\\.json|CAPABILITY_CONTEXT\\.md\" BENCHMARK_CONTEXT.md"`,
              aggregated_output: "synthetic context\n",
              exit_code: 0,
              status: "completed",
            },
          }) +
          "\n" +
          JSON.stringify({
            type: "item.completed",
            item: {
              id: "item_6",
              type: "command_execution",
              command: String.raw`/bin/bash -c "rg -n 'SCENARIO_REVIEW\.json' BENCHMARK_CONTEXT.md"`,
              aggregated_output: "synthetic context\n",
              exit_code: 0,
              status: "completed",
            },
          }) +
          "\n" +
          JSON.stringify({
            type: "item.completed",
            item: {
              id: "item_7",
              type: "command_execution",
              command:
                "/bin/bash -c 'rg -n -m 120 \"^--- \" BENCHMARK_CONTEXT.md'",
              aggregated_output: "synthetic context\n",
              exit_code: 0,
              status: "completed",
            },
          }) +
          "\n" +
          JSON.stringify({
            type: "item.completed",
            item: {
              id: "item_8",
              type: "command_execution",
              command: "/bin/sh -c 'cat BENCHMARK_CONTEXT.md'",
              aggregated_output: "synthetic context\n",
              exit_code: 0,
              status: "completed",
            },
          }) +
          "\n" +
          JSON.stringify({
            type: "item.completed",
            item: {
              id: "item_9",
              type: "agent_message",
              text: `The model's prose may mention ${resolve("/outside")}.`,
            },
          }) +
          "\n",
      );

      expect(
        validateBenchmarkPreparationEventStream({
          eventPath,
          scratch,
          namedInputs: [contextPath],
        }),
      ).toEqual(Either.right(undefined));
    } finally {
      rmSync(scratch, { recursive: true });
    }
  });

  test("reports a first-party preparation failure without misclassifying its event type", () => {
    const scratch = mkdtempSync(resolve(tmpdir(), "dnd-fixed-isolation-"));
    const eventPath = resolve(scratch, "events.jsonl");
    const contextPath = resolve(scratch, "BENCHMARK_CONTEXT.md");
    try {
      writeFileSync(contextPath, "synthetic context\n");
      writeFileSync(
        eventPath,
        [
          {
            type: "error",
            message: "Synthetic wrapper failure.",
          },
          {
            type: "turn.failed",
            error: { message: "Synthetic service capacity is exhausted." },
          },
        ]
          .map((event) => JSON.stringify(event))
          .join("\n") + "\n",
      );

      expect(
        validateBenchmarkPreparationEventStream({
          eventPath,
          scratch,
          namedInputs: [contextPath],
        }),
      ).toEqual(
        Either.left(
          "Preparation model invocation failed: Synthetic service capacity is exhausted.",
        ),
      );
    } finally {
      rmSync(scratch, { recursive: true });
    }
  });

  test("rejects reading the generated output target as a preparation input", () => {
    const scratch = mkdtempSync(resolve(tmpdir(), "dnd-fixed-isolation-"));
    const eventPath = resolve(scratch, "events.jsonl");
    const contextPath = resolve(scratch, "BENCHMARK_CONTEXT.md");
    const outputPath = resolve(scratch, "output.json");
    try {
      writeFileSync(contextPath, "synthetic context\n");
      writeFileSync(outputPath, "{}\n");
      writeFileSync(
        eventPath,
        JSON.stringify({
          type: "item.completed",
          item: {
            id: "item_1",
            type: "command_execution",
            command: "/bin/bash -lc 'cat output.json'",
            aggregated_output: "{}\n",
            exit_code: 0,
            status: "completed",
          },
        }) + "\n",
      );

      expect(
        Either.isLeft(
          validateBenchmarkPreparationEventStream({
            eventPath,
            scratch,
            namedInputs: [contextPath],
          }),
        ),
      ).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true });
    }
  });

  test.each([
    [
      "a commandless stream",
      {
        type: "item.completed",
        item: { id: "item_1", type: "agent_message", text: "synthetic" },
      },
    ],
    [
      "a failed read",
      {
        type: "item.completed",
        item: {
          id: "item_1",
          type: "command_execution",
          command: "/bin/bash -lc 'cat BENCHMARK_CONTEXT.md'",
          aggregated_output: "blocked",
          exit_code: 1,
          status: "failed",
        },
      },
    ],
  ])("rejects preparation evidence with %s", (_label, event) => {
    const scratch = mkdtempSync(resolve(tmpdir(), "dnd-fixed-isolation-"));
    const eventPath = resolve(scratch, "events.jsonl");
    const contextPath = resolve(scratch, "BENCHMARK_CONTEXT.md");
    try {
      writeFileSync(contextPath, "synthetic context\n");
      writeFileSync(eventPath, JSON.stringify(event) + "\n");
      expect(
        Either.isLeft(
          validateBenchmarkPreparationEventStream({
            eventPath,
            scratch,
            namedInputs: [contextPath],
          }),
        ),
      ).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true });
    }
  });

  test.each([
    [
      "an absolute repository path",
      (scratch: string) =>
        `/bin/bash -lc "sed -n '1,20p' ${resolve(scratch, "../repository/SCENARIO.md")}"`,
    ],
    ["a parent traversal", () => "/bin/bash -lc 'cat ../SCENARIO.md'"],
    [
      "an unfiltered file enumeration",
      () => "/bin/bash -lc 'rg --files -g BENCHMARK_CONTEXT.md'",
    ],
    [
      "a directory search beyond named inputs",
      () => "/bin/bash -lc 'rg -n context .'",
    ],
    ["a directory listing", () => "/bin/bash -lc 'ls -la .'"],
    [
      "a nested shell wrapper",
      () => "/bin/bash -lc \"/bin/bash -lc 'cat BENCHMARK_CONTEXT.md'\"",
    ],
    [
      "an rg preprocessor",
      () =>
        "/bin/bash -lc \"rg --pre='cat /etc/passwd' context BENCHMARK_CONTEXT.md\"",
    ],
    [
      "an rg context option without a count",
      () => "/bin/bash -lc 'rg -C context BENCHMARK_CONTEXT.md'",
    ],
    [
      "an rg context option with a nonnumeric count",
      () => "/bin/bash -lc 'rg -C all context BENCHMARK_CONTEXT.md'",
    ],
    [
      "an rg context option after the pattern",
      () => "/bin/bash -lc 'rg context -C 6 BENCHMARK_CONTEXT.md'",
    ],
    [
      "an rg max-count option without a count",
      () => "/bin/bash -lc 'rg -m context BENCHMARK_CONTEXT.md'",
    ],
    [
      "an rg max-count option with a noncanonical count",
      () => "/bin/bash -lc 'rg -m 012 context BENCHMARK_CONTEXT.md'",
    ],
    [
      "an rg max-count option after the pattern",
      () => "/bin/bash -lc 'rg context -m 120 BENCHMARK_CONTEXT.md'",
    ],
    ["a tail line option without a count", () => "/bin/bash -c 'tail -n'"],
    [
      "a tail line option with a nonnumeric count",
      () => "/bin/bash -c 'tail -n all BENCHMARK_CONTEXT.md'",
    ],
    [
      "a tail line option after the file",
      () => "/bin/bash -c 'tail BENCHMARK_CONTEXT.md -n 200'",
    ],
    [
      "an unsupported tail byte option",
      () => "/bin/bash -c 'tail -c 200 BENCHMARK_CONTEXT.md'",
    ],
    [
      "an unsupported head byte option",
      () => "/bin/bash -c 'head -c 20 BENCHMARK_CONTEXT.md'",
    ],
  ])(
    "rejects preparation event streams that attempt %s",
    (_label, commandFactory) => {
      const scratch = mkdtempSync(resolve(tmpdir(), "dnd-fixed-isolation-"));
      const eventPath = resolve(scratch, "events.jsonl");
      const contextPath = resolve(scratch, "BENCHMARK_CONTEXT.md");
      try {
        writeFileSync(contextPath, "synthetic context\n");
        writeFileSync(
          eventPath,
          JSON.stringify({
            type: "item.started",
            item: {
              id: "item_1",
              type: "command_execution",
              command: commandFactory(scratch),
            },
          }) + "\n",
        );

        const validation = validateBenchmarkPreparationEventStream({
          eventPath,
          scratch,
          namedInputs: [contextPath],
        });
        expect(Either.isLeft(validation)).toBe(true);
      } finally {
        rmSync(scratch, { recursive: true });
      }
    },
  );

  test.each([
    [
      "an encoded Node path reader",
      (scratch: string) =>
        `/bin/bash -lc "node -e 'require(\"fs\").readFileSync(\"${scratch}/%2e%2e/AGENTS.md\")'"`,
    ],
    [
      "a path encoded as a shell expansion",
      (scratch: string) =>
        `/bin/bash -lc "cat \$(printf '%s' '${scratch}/BENCHMARK_CONTEXT.md')"`,
    ],
    [
      "a command substitution inside an inner double-quoted rg pattern",
      () => "/bin/bash -lc 'rg \"$(cat /etc/passwd)\" BENCHMARK_CONTEXT.md'",
    ],
    [
      "multiple commands separated by an embedded newline",
      () =>
        "/bin/bash -lc 'cat BENCHMARK_CONTEXT.md\ncat BENCHMARK_CONTEXT.md'",
    ],
    [
      "multiple commands separated by an embedded carriage return",
      () =>
        "/bin/bash -lc 'cat BENCHMARK_CONTEXT.md\rcat BENCHMARK_CONTEXT.md'",
    ],
    [
      "an embedded null byte",
      () => "/bin/bash -lc 'cat BENCHMARK_CONTEXT.md\0'",
    ],
    [
      "a backtick substitution inside double quotes",
      () => '/bin/bash -lc "rg `cat /etc/passwd` BENCHMARK_CONTEXT.md"',
    ],
    [
      "an unquoted backslash escape",
      () => "/bin/bash -lc 'cat BENCHMARK_CONTEXT\\.md'",
    ],
    [
      "a literal encoded parent traversal",
      (scratch: string) => `/bin/bash -lc "cat ${scratch}/%2e%2e/AGENTS.md"`,
    ],
    [
      "a Python path reader",
      (scratch: string) =>
        `/bin/bash -lc "python3 -c 'open(\"${scratch}/BENCHMARK_CONTEXT.md\").read()'"`,
    ],
  ])(
    "rejects encoded executable and path bypasses: %s",
    (_label, commandFactory) => {
      const scratch = mkdtempSync(resolve(tmpdir(), "dnd-fixed-isolation-"));
      const eventPath = resolve(scratch, "events.jsonl");
      const contextPath = resolve(scratch, "BENCHMARK_CONTEXT.md");
      try {
        writeFileSync(contextPath, "synthetic context\n");
        writeFileSync(
          eventPath,
          JSON.stringify({
            type: "item.completed",
            item: {
              id: "item_1",
              type: "command_execution",
              command: commandFactory(scratch),
            },
          }) + "\n",
        );
        expect(
          Either.isLeft(
            validateBenchmarkPreparationEventStream({
              eventPath,
              scratch,
              namedInputs: [contextPath],
            }),
          ),
        ).toBe(true);
      } finally {
        rmSync(scratch, { recursive: true });
      }
    },
  );

  test.each([
    [
      "an unknown tool item",
      {
        type: "item.completed",
        item: { id: "item_1", type: "mcp_tool_call", name: "search" },
      },
    ],
    ["an array event record", []],
    ["an unknown event type", { type: "tool.output", payload: {} }],
  ])("rejects %s rather than treating it as prose", (_label, event) => {
    const scratch = mkdtempSync(resolve(tmpdir(), "dnd-fixed-isolation-"));
    const eventPath = resolve(scratch, "events.jsonl");
    const contextPath = resolve(scratch, "BENCHMARK_CONTEXT.md");
    try {
      writeFileSync(contextPath, "synthetic context\n");
      writeFileSync(eventPath, JSON.stringify(event) + "\n");
      expect(
        Either.isLeft(
          validateBenchmarkPreparationEventStream({
            eventPath,
            scratch,
            namedInputs: [contextPath],
          }),
        ),
      ).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true });
    }
  });

  test("parses the CLI profile as a closed domain value", () => {
    expect(parseFixedBenchmarkProfile("documentDeclarationSet")).toEqual(
      Either.right("documentDeclarationSet"),
    );
    expect(parseFixedBenchmarkProfile("boundedCapabilityProjection")).toEqual(
      Either.right("boundedCapabilityProjection"),
    );
    expect(Either.isLeft(parseFixedBenchmarkProfile("node"))).toBe(true);
    expect(Either.isLeft(parseFixedBenchmarkProfile([]))).toBe(true);
  });

  test("rejects compare benchmark-id traversal before constructing measurement paths", () => {
    expect(() =>
      execFileSync(
        "pnpm",
        [
          "exec",
          "tsx",
          fixedBenchmarkCli,
          "compare",
          "../outside",
          "comparison.json",
        ],
        { cwd: repoRoot, stdio: "pipe" },
      ),
    ).toThrow(/benchmark id must be lowercase letters, digits, and hyphens/);
  }, 30_000);

  test("constructs direct paths and commands from an already decoded benchmark id", () => {
    const paths = fixedBenchmarkProfilePaths(
      "safe-run",
      "boundedCapabilityProjection",
    );
    const bundle = fixedScenarioCanonicalBundle();
    const executionId = decodeExecutionId("synthetic-execution");
    const evidenceSetId = decodeEvidenceSetId("synthetic-evidence");
    if (Either.isLeft(executionId) || Either.isLeft(evidenceSetId)) {
      throw new Error("Synthetic benchmark identities must decode.");
    }
    const commands = benchmarkCommands({
      benchmarkId: paths.benchmarkId,
      executionId: executionId.right,
      evidenceSetId: evidenceSetId.right,
      profile: "boundedCapabilityProjection",
      implementationGitSha: Schema.decodeUnknownSync(GitShaSchema)(
        "a".repeat(40),
      ),
      paths,
      bundle,
    });
    expect(commands.player).toContain("safe-run");
    expect(commands.player).toContain("synthetic-execution");
    expect(commands.player).toContain("synthetic-evidence");
    expect(commands.player).toContain(
      "RAW_SWARM_EXPECTED_GIT_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa pnpm raw-swarm:model:trial -- sdk-player",
    );
    expect(commands.player).not.toContain(
      "pnpm exec tsx scripts/raw-swarm/run-sdk-player.ts",
    );
    expect(commands.postPlayReview).toContain(
      "RAW_SWARM_EXPECTED_GIT_SHA=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(commands.postPlayReview).toContain(
      "pnpm raw-swarm:model:trial -- post-play-review",
    );
    expect(commands.postPlayReview).not.toContain(
      "scripts/raw-swarm/run-raw-review.sh",
    );
  });

  test("rejects structured reads and external tools while retaining prose-only results", () => {
    const scratch = mkdtempSync(resolve(tmpdir(), "dnd-fixed-isolation-"));
    const eventPath = resolve(scratch, "events.jsonl");
    const contextPath = resolve(scratch, "BENCHMARK_CONTEXT.md");
    try {
      writeFileSync(contextPath, "synthetic context\n");
      writeFileSync(
        eventPath,
        [
          {
            type: "item.completed",
            item: {
              id: "item_1",
              type: "file_read",
              path: "/workspace/typescript/dnd/AGENTS.md",
            },
          },
          {
            type: "item.completed",
            item: {
              id: "item_2",
              type: "agent_message",
              text: "The structured result is complete.",
            },
          },
        ]
          .map((event) => JSON.stringify(event))
          .join("\n") + "\n",
      );

      const validation = validateBenchmarkPreparationEventStream({
        eventPath,
        scratch,
        namedInputs: [contextPath],
      });
      expect(Either.isLeft(validation)).toBe(true);

      writeFileSync(
        eventPath,
        JSON.stringify({
          type: "item.completed",
          item: { id: "item_1", type: "mcp_tool_call", name: "search" },
        }) + "\n",
      );
      expect(
        Either.isLeft(
          validateBenchmarkPreparationEventStream({
            eventPath,
            scratch,
            namedInputs: [contextPath],
          }),
        ),
      ).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true });
    }
  });

  test("retains the exact tracked open-grid-wolf-skeleton-pursuit source bundle", () => {
    const bundle = fixedScenarioCanonicalBundle();

    expect(bundle.paths.scenario).toContain(`${FIXED_SCENARIO_ID}.md`);
    expect(bundle.paths.scenarioReview).toContain(
      `${FIXED_SCENARIO_ID}.md.scenario-review.json`,
    );
    expect(bundle.authorities.scenario.sha256).toBe(bundle.scenarioSha256);
    expect(bundle.authorities.scenarioReview.sha256).toBe(
      bundle.scenarioReviewSha256,
    );
    expect(readFileSync(bundle.paths.characters, "utf8")).toContain(
      "composeScenarioCharacters",
    );
    expect(readFileSync(bundle.paths.setup, "utf8")).toContain("setupScenario");
  });

  test("delivers bounded player context byte-identically from the canonical projection", () => {
    expect(
      fixedBenchmarkContextForRole("boundedCapabilityProjection", "player"),
    ).toBe(capabilityContextForRole("player"));
  });

  test("builds historical context from public documents and declarations", () => {
    const context =
      fixedBenchmarkDocumentDeclarationContextForRole("characterAuthoring");

    expect(context).toContain("SCENARIO_CHARACTERS.md");
    expect(context).toContain("CHARACTER_CREATION_SDK.md");
    expect(context).toContain("Full emitted public declaration bundle");
    expect(context).toContain("declare ");
    expect(context).not.toContain("generate-scenario.ts");
    expect(context).not.toContain("scenario-campaign.ts");
  }, 120_000);

  test("keeps baseline composites four-field and bounded composites five-field", () => {
    const historicalSchema = codexOutputJsonSchema(
      HistoricalScenarioCompositeReviewSchema,
    );
    const currentSchema = codexOutputJsonSchema(
      CurrentScenarioCompositeReviewSchema,
    );

    expect(
      Either.isRight(
        validateBenchmarkReviewAuthority({
          profile: "documentDeclarationSet",
          reviewStage: "final",
          schemaVersion: 2,
          result: historicalReview,
          outputJsonSchema: historicalSchema,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        validateBenchmarkReviewAuthority({
          profile: "documentDeclarationSet",
          reviewStage: "final",
          schemaVersion: 2,
          result: currentReview,
          outputJsonSchema: historicalSchema,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isRight(
        validateBenchmarkReviewAuthority({
          profile: "boundedCapabilityProjection",
          reviewStage: "final",
          schemaVersion: 3,
          result: currentReview,
          outputJsonSchema: currentSchema,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        validateBenchmarkReviewAuthority({
          profile: "boundedCapabilityProjection",
          reviewStage: "final",
          schemaVersion: 3,
          result: historicalReview,
          outputJsonSchema: currentSchema,
        }),
      ),
    ).toBe(true);
  });

  test("rejects a document-profile historical review carried in a v3 envelope", () => {
    const historicalSchema = codexOutputJsonSchema(
      HistoricalScenarioCompositeReviewSchema,
    );
    const mismatch = validateBenchmarkReviewAuthority({
      profile: "documentDeclarationSet",
      reviewStage: "final",
      schemaVersion: 3,
      result: historicalReview,
      outputJsonSchema: historicalSchema,
    });

    expect(Either.isLeft(mismatch)).toBe(true);
    if (Either.isRight(mismatch)) return;
    expect(mismatch.left).toContain("schema version 2");
  });

  test.each([
    [
      "unsupported RAW",
      {
        ...currentReview,
        raw: {
          classification: "unsupported",
          evidence: "Synthetic unsupported evidence.",
          critique: "Synthetic unsupported critique.",
        },
      },
      "RAW review did not classify",
    ],
    [
      "unavailable content",
      {
        ...currentReview,
        contentAvailability: {
          classification: "missingUnavailableProbe",
          evidence: "Synthetic unavailable evidence.",
          critique: "Synthetic unavailable critique.",
        },
      },
      "missing unavailable-content probe",
    ],
    [
      "unsupported SDK capability",
      {
        ...currentReview,
        sdkCapability: {
          classification: "unsupported",
          evidence: "Synthetic unsupported capability evidence.",
          critique: "Synthetic unsupported capability critique.",
        },
      },
      "SDK capability review did not classify",
    ],
    [
      "unsafe artifact policy",
      {
        ...currentReview,
        artifactPolicy: {
          classification: "violation",
          evidence: "Synthetic policy evidence.",
          critique: "Synthetic policy critique.",
        },
      },
      "Artifact-policy review",
    ],
    [
      "scenario needing revision",
      {
        ...currentReview,
        scenarioQuality: {
          classification: "needsRevision",
          evidence: "Synthetic quality evidence.",
          critique: "Synthetic quality critique.",
        },
      },
      "needing revision",
    ],
  ])(
    "rejects a structurally valid but non-admitted %s review",
    (_label, result, message) => {
      const rejected = validateBenchmarkReviewAuthority({
        profile: "boundedCapabilityProjection",
        reviewStage: "final",
        schemaVersion: 3,
        result,
        outputJsonSchema: codexOutputJsonSchema(
          CurrentScenarioCompositeReviewSchema,
        ),
      });

      expect(Either.isLeft(rejected)).toBe(true);
      if (Either.isRight(rejected)) return;
      expect(rejected.left).toContain(message);
    },
  );

  test("does not retain a bounded milestone review authority", () => {
    const currentSchema = codexOutputJsonSchema(
      CurrentScenarioCompositeReviewSchema,
    );
    const result = validateBenchmarkReviewAuthority({
      profile: "boundedCapabilityProjection",
      reviewStage: "milestone",
      schemaVersion: 3,
      result: currentReview,
      outputJsonSchema: currentSchema,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left).toContain("only its final composite review");
  });

  test("awaits the canonical zero-sheet character evaluation", async () => {
    const bundle = fixedScenarioCanonicalBundle();
    const result = await evaluateScenarioCharacters(bundle.paths.characters);

    expect(result.tag).toBe("ready");
    if (result.tag === "ready") expect(result.characterSheets).toHaveLength(0);
  });
});
