import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { repoRoot } from "../transcript.ts";
import { buildScenarioSetupDistribution } from "./consumer-distribution.ts";
import {
  evaluateScenarioSetup,
  scenarioSetupStatBlocks,
} from "./scenario-setup-runtime.ts";

const TRACER_SCENARIO_ID = "tracer-001-goblin-warrior-vs-skeleton";

describe("scenario setup public-SDK boundary", () => {
  test("typechecks and evaluates an adjacent ordinary TypeScript setup", async () => {
    const destination = mkdtempSync(resolve(tmpdir(), "dnd-scenario-setup-"));
    const scenarioPath = resolve(
      repoRoot,
      `scripts/raw-swarm/sdk-player/scenarios/${TRACER_SCENARIO_ID}.md`,
    );
    try {
      const scenarioReviewPath = resolve(
        destination,
        "scenario-review-input.json",
      );
      writeFileSync(scenarioReviewPath, "{}\n");
      const statBlocks = scenarioSetupStatBlocks();
      if (statBlocks.tag === "invalid") throw new Error(statBlocks.message);
      buildScenarioSetupDistribution({
        destination,
        scenarioPath,
        scenarioReviewPath,
        statBlocks: statBlocks.statBlocks,
      });
      writeFileSync(
        resolve(destination, "setup.ts"),
        readFileSync(
          resolve(
            repoRoot,
            `scripts/raw-swarm/sdk-player/scenarios/${TRACER_SCENARIO_ID}.setup.ts`,
          ),
          "utf8",
        ),
      );

      execFileSync(
        process.execPath,
        [resolve(destination, "tooling/typescript/bin/tsc"), "--noEmit"],
        { cwd: destination, stdio: "pipe" },
      );
      const result = await evaluateScenarioSetup(
        resolve(destination, "setup.ts"),
      );

      expect(result).toMatchObject({
        tag: "ready",
        observation: {
          combatants: ["goblin-warrior", "skeleton"],
          initiatives: [15, 10],
        },
      });
    } finally {
      rmSync(destination, { recursive: true });
    }
  }, 120_000);

  test("retains an authored setup obstruction", async () => {
    const directory = mkdtempSync(
      resolve(tmpdir(), "dnd-scenario-obstruction-"),
    );
    try {
      const setupPath = resolve(directory, "setup.ts");
      writeFileSync(
        setupPath,
        `export const setupScenario = () => ({
  kind: "obstructed",
  obstruction: "The required character-build setup is not exposed.",
  observation: { missing: "character-build" },
});
`,
      );
      await expect(evaluateScenarioSetup(setupPath)).resolves.toEqual({
        tag: "obstructed",
        obstruction: "The required character-build setup is not exposed.",
        observation: { missing: "character-build" },
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  });

  test("rejects a non-JSON setup observation", async () => {
    const directory = mkdtempSync(
      resolve(tmpdir(), "dnd-scenario-observation-"),
    );
    try {
      const setupPath = resolve(directory, "setup.ts");
      writeFileSync(
        setupPath,
        `export const setupScenario = () => ({
  kind: "obstructed",
  obstruction: "Unavailable.",
  observation: new Map([["not", "json"]]),
});
`,
      );
      await expect(evaluateScenarioSetup(setupPath)).resolves.toEqual({
        tag: "invalid",
        message: "Scenario setup observation must be JSON data.",
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});
