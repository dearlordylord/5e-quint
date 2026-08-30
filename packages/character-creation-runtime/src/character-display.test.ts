import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { abilityScore } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Result } from "effect";
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
    expect(characterBuildDisplayName(unitLibrary, baseBuild)).toEqual(
      Result.succeed("Orc Soldier Fighter"),
    );
  });

  test("reports every missing display record without exposing ids as labels", () => {
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

    expect(displayName).toEqual(
      Result.fail(
        expect.arrayContaining([
          {
            tag: "characterBuildDisplayUnitMissing",
            role: "species",
            unitId: "species_synthetic_missing",
          },
          {
            tag: "characterBuildDisplayUnitMissing",
            role: "background",
            unitId: "background_synthetic_missing",
          },
          {
            tag: "characterBuildDisplayUnitMissing",
            role: "class",
            unitId: "class_synthetic_missing",
          },
        ]),
      ),
    );
  });

  test("reports records whose catalog kind cannot fill the display role", () => {
    const displayName = characterBuildDisplayName(unitLibrary, {
      ...baseBuild,
      species: authoredUnitId("background_soldier"),
      background: authoredUnitId("species_orc"),
      progression: {
        startingClass: classUnitId(authoredUnitId("species_orc")),
        advancements: [],
      },
    });

    expect(displayName).toEqual(
      Result.fail(
        expect.arrayContaining([
          expect.objectContaining({
            tag: "characterBuildDisplayUnitKindMismatch",
            role: "species",
            actualKind: "background",
          }),
          expect.objectContaining({
            tag: "characterBuildDisplayUnitKindMismatch",
            role: "background",
            actualKind: "species",
          }),
          expect.objectContaining({
            tag: "characterBuildDisplayUnitKindMismatch",
            role: "class",
            actualKind: "species",
          }),
        ]),
      ),
    );
  });
});
