import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { Either } from "effect";

import { FIGHTER_EXAMPLE_DRAFT } from "../../../packages/app/src/components/character-creation/characterCreationPresets.ts";
import { finalizeCharacterDraft } from "../../../packages/character-creation-runtime/src/index.ts";
import {
  characterSheetId,
  createFreshCharacterSheet,
} from "../../../packages/character-sheet-runtime/src/index.ts";
import { Hp } from "../../../packages/shared/src/types.ts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "../../../packages/surface/src/surface/unit-catalog.ts";
import { repoRoot } from "../transcript.ts";
import { evaluateScenarioCharacters } from "./scenario-character-runtime.ts";
import {
  evaluateScenarioSetup,
  scenarioSetupStatBlocks,
} from "./scenario-setup-runtime.ts";

const TRACER_SCENARIO_ID = "tracer-001-goblin-warrior-vs-skeleton";

describe("scenario setup public-SDK boundary", () => {
  test("passes controller-authored Character Sheets into neutral setup", async () => {
    const directory = mkdtempSync(
      resolve(tmpdir(), "dnd-scenario-characters-"),
    );
    try {
      const unitCatalog = buildUnitCatalog({
        collections: [srdUnitCollection],
      });
      expect(unitCatalog.tag).toBe("ok");
      if (unitCatalog.tag === "invalid") return;
      const finalized = finalizeCharacterDraft({
        draft: FIGHTER_EXAMPLE_DRAFT,
        unitLibrary: unitCatalog.catalog,
      });
      expect(finalized.tag).toBe("ready");
      if (finalized.tag !== "ready") return;
      const createdSheet = createFreshCharacterSheet({
        characterId: characterSheetId("raw-swarm:test:external-fighter"),
        build: finalized.build,
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        unitLibrary: unitCatalog.catalog,
      });
      expect(Either.isRight(createdSheet)).toBe(true);
      if (Either.isLeft(createdSheet)) return;
      const charactersPath = resolve(directory, "characters.ts");
      const invalidCharactersPath = resolve(directory, "invalid-characters.ts");
      writeFileSync(
        invalidCharactersPath,
        `export const composeScenarioCharacters = () => ({
  kind: "ready",
  characterSheets: ${JSON.stringify([createdSheet.right, {}, createdSheet.right])},
  observation: { attempted: 3 },
});
`,
      );
      await expect(
        evaluateScenarioCharacters(invalidCharactersPath),
      ).resolves.toEqual({
        tag: "invalid",
        message:
          "Character Sheet 2 is invalid. Scenario characters returned duplicate Character Sheet ids.",
      });
      writeFileSync(
        charactersPath,
        `export const composeScenarioCharacters = () => ({
  kind: "ready",
  characterSheets: ${JSON.stringify([createdSheet.right])},
  observation: { characterIds: [${JSON.stringify(createdSheet.right.characterId)}] },
});
`,
      );
      const setupPath = resolve(directory, "setup.ts");
      writeFileSync(
        setupPath,
        readFileSync(
          resolve(
            repoRoot,
            "scripts/raw-swarm/sdk-player/test-fixtures/ready-mixed.setup.ts",
          ),
          "utf8",
        ),
      );

      const characters = await evaluateScenarioCharacters(charactersPath);
      expect(characters).toMatchObject({
        tag: "ready",
        characterSheets: [{ characterId: createdSheet.right.characterId }],
      });
      if (characters.tag !== "ready") return;

      await expect(
        evaluateScenarioSetup(setupPath, characters.characterSheets),
      ).resolves.toMatchObject({
        tag: "ready",
        observation: { combatants: 2 },
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  });

  test("evaluates an adjacent ordinary TypeScript setup", async () => {
    const result = await evaluateScenarioSetup(
      resolve(
        repoRoot,
        `scripts/raw-swarm/sdk-player/scenarios/${TRACER_SCENARIO_ID}.setup.ts`,
      ),
      [],
    );

    expect(result).toMatchObject({
      tag: "ready",
      observation: {
        combatants: ["goblin-warrior", "skeleton"],
        initiatives: [15, 10],
      },
    });
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
      await expect(evaluateScenarioSetup(setupPath, [])).resolves.toEqual({
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
      await expect(evaluateScenarioSetup(setupPath, [])).resolves.toEqual({
        tag: "invalid",
        message: "Scenario setup observation must be JSON data.",
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});
