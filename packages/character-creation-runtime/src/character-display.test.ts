import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { abilityScore } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { describe, expect, test } from "vitest";

import {
  characterBuildDisplayName,
  classUnitId,
  copperPieceAmount,
  type CharacterBuild,
} from "./index.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("The SRD character display fixture must compose.");
}
const unitLibrary = catalogResult.catalog;

const baseBuild: CharacterBuild = {
  progression: {
    startingClass: classUnitId(authoredUnitId("class_fighter")),
    advancements: [],
  },
  background: authoredUnitId("background_soldier"),
  species: authoredUnitId("species_orc"),
  originLanguages: ["Common", "Dwarvish", "Goblin"],
  classFeatureLanguages: [],
  alignment: { order: "neutral", morality: "neutral" },
  abilityScores: {
    str: abilityScore(10),
    dex: abilityScore(10),
    con: abilityScore(10),
    int: abilityScore(10),
    wis: abilityScore(10),
    cha: abilityScore(10),
  },
  proficiencyChoices: [],
  features: [],
  magicInitiateSpellAccesses: [],
  equipment: {
    startingEquipmentCurrencyRemainderCp: copperPieceAmount(0),
    owned: [],
    loadout: {},
  },
};

describe("character build display projection", () => {
  test("uses authored species, background, and level-one class names", () => {
    expect(characterBuildDisplayName(unitLibrary, baseBuild)).toBe(
      "Orc Soldier Fighter",
    );
  });

  test("falls back to ids and labels multiclass levels", () => {
    const displayName = characterBuildDisplayName(unitLibrary, {
      ...baseBuild,
      species: authoredUnitId("species_synthetic_missing"),
      background: authoredUnitId("background_synthetic_missing"),
      progression: {
        startingClass: classUnitId(authoredUnitId("class_synthetic_missing")),
        advancements: [
          {
            classUnitId: classUnitId(authoredUnitId("class_wizard")),
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        ],
      },
    });

    expect(displayName).toBe(
      "species_synthetic_missing background_synthetic_missing class_synthetic_missing 1 / Wizard 1",
    );
  });
});
