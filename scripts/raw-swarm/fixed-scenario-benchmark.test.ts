import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { capabilityContextForRole } from "./capability-projection.ts";
import {
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
  HistoricalScenarioCompositeReviewSchema,
} from "./scenario-campaign.ts";
import {
  FIXED_SCENARIO_ID,
  fixedBenchmarkContextForRole,
  fixedBenchmarkCodexArgs,
  fixedBenchmarkDocumentDeclarationContextForRole,
  fixedScenarioCanonicalBundle,
  initializeFixedBenchmarkProfileDirectory,
  retainBenchmarkReviewReplayEvents,
  validateBenchmarkPreparationEventStream,
  validateBenchmarkReviewAuthority,
} from "./fixed-scenario-benchmark.ts";
import { evaluateScenarioCharacters } from "./sdk-player/scenario-character-runtime.ts";

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
  test("allows isolated benchmark consumers outside a Git checkout", () => {
    expect(
      fixedBenchmarkCodexArgs(
        "/tmp/synthetic-consumer",
        "gpt-5.6-sol",
        "medium",
        "Review the synthetic source.",
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

  test("accepts structured preparation commands confined to named scratch inputs", () => {
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
            command: `/bin/bash -lc "sed -n '1,20p' ${contextPath}"`,
          },
        }) +
          "\n" +
          JSON.stringify({
            type: "item.completed",
            item: {
              id: "item_1",
              type: "command_execution",
              command: `/bin/bash -lc "sha256sum ${contextPath}"`,
              aggregated_output: "",
            },
          }) +
          "\n" +
          JSON.stringify({
            type: "item.completed",
            item: {
              id: "item_2",
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

  test("retains the exact tracked generated-battle-009 source bundle", () => {
    const bundle = fixedScenarioCanonicalBundle();

    expect(bundle.paths.scenario).toContain(`${FIXED_SCENARIO_ID}.md`);
    expect(bundle.paths.scenarioReview).toContain(
      `${FIXED_SCENARIO_ID}.md.scenario-review.json`,
    );
    expect(bundle.authorities.scenario.sha256).toBe(bundle.scenarioSha256);
    expect(bundle.authorities.scenarioReview.sha256).toBe(
      bundle.scenarioReviewSha256,
    );
    expect(bundle.scenarioReviewGitSha).toMatch(/^[0-9a-f]{40}$/);
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
  }, 60_000);

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
          result: historicalReview,
          outputJsonSchema: currentSchema,
        }),
      ),
    ).toBe(true);
  });

  test("awaits the canonical zero-sheet character evaluation", async () => {
    const bundle = fixedScenarioCanonicalBundle();
    const result = await evaluateScenarioCharacters(bundle.paths.characters);

    expect(result.tag).toBe("ready");
    if (result.tag === "ready") expect(result.characterSheets).toHaveLength(0);
  });
});
