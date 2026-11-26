import { combatantId, initiativeScore } from "@dnd/battle-runtime";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import { Result } from "effect";
import { describe, expect, test } from "vitest";
import type { CharacterSheet } from "@dnd/character-sheet-runtime";
import { characterSheetBattleInit } from "./index.ts";
import {
  characterSheet,
  levelFiveMartialBuild,
  unitLibrary,
} from "./sdk-integration.test-support.ts";

const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (statBlockCatalogResult.tag !== "ok") {
  throw new Error("SRD Stat Block catalog must build.");
}
const statBlockCatalog = statBlockCatalogResult.catalog;
const fighterCombatantId = combatantId("combatant:sheet-conditions-fighter");

function sheetWithConditions(
  conditions: CharacterSheet["conditions"],
): CharacterSheet {
  const fixture = characterSheet({
    characterIdText: "character:sheet-conditions-fighter",
    combatantId: fighterCombatantId,
    build: levelFiveMartialBuild({
      classUnitId: authoredUnitId("class_fighter"),
      weaponUnitId: authoredUnitId("weapon_longsword"),
    }),
    initiative: 20,
  });
  return { ...fixture.sheet, conditions };
}

function battleInitFromSheet(sheet: CharacterSheet) {
  return characterSheetBattleInit({
    sheet,
    unitLibrary,
    statBlockCatalog,
    combatantId: fighterCombatantId,
    displayName: "Fighter",
    initiative: initiativeScore(20),
    ammunitionStocks: [],
  });
}

describe("character sheet conditions at battle start", () => {
  test("carry the sheet's conditions into the battle's initial conditions", () => {
    const init = battleInitFromSheet(sheetWithConditions(["poisoned"]));

    expect(init).toMatchObject({
      _tag: "Success",
      success: { creatureInit: { conditions: ["poisoned"] } },
    });
  });

  test("reject a sheet's Grappled condition, which names no grappler or escape DC", () => {
    const init = battleInitFromSheet(
      sheetWithConditions(["poisoned", "grappled"]),
    );

    expect(Result.isFailure(init)).toBe(true);
    expect(init).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "battleCreatureInitIssue",
        reason: "characterBattleInitialConditions",
        constraint: "grappledNeedsInitialGrapple",
      },
    });
  });
});
