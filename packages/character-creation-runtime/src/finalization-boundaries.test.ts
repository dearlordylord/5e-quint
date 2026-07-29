import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { abilityScore } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { describe, expect, test } from "vitest";

import { classUnitId } from "./character-progression-types.ts";
import {
  isSupportedBackgroundAbilityScoreIncrease,
  selectedPreparedSpellsAreInSelectedSpellbook,
} from "./finalization.ts";
import type {
  AbilityScoreAssignment,
  FinalizedCharacterSelections,
} from "./types.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("The SRD Unit catalog finalization fixture must compose.");
}
const unitLibrary = catalogResult.catalog;

const baseScores = {
  str: abilityScore(10),
  dex: abilityScore(10),
  con: abilityScore(10),
  int: abilityScore(10),
  wis: abilityScore(10),
  cha: abilityScore(10),
} as const satisfies AbilityScoreAssignment;

function selectionsWithStartingClass(
  startingClass: ReturnType<typeof classUnitId>,
): FinalizedCharacterSelections {
  return {
    progression: { startingClass, advancements: [] },
    background: authoredUnitId("background_soldier"),
    abilityScoreGeneration: {
      method: "standardArray",
      assignedScores: baseScores,
    },
    backgroundAbilityScoreIncrease: { kind: "oneEach" },
    species: authoredUnitId("species_orc"),
    languages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "neutral", morality: "neutral" },
    choices: [],
    equipment: { selectedUnitIds: [] },
  };
}

describe("character finalization boundaries", () => {
  test("rejects unknown spellbook owners while accepting non-Wizard owners", () => {
    expect(
      selectedPreparedSpellsAreInSelectedSpellbook(
        selectionsWithStartingClass(
          classUnitId(authoredUnitId("synthetic_unknown_class")),
        ),
        unitLibrary,
      ),
    ).toBe(false);
    expect(
      selectedPreparedSpellsAreInSelectedSpellbook(
        selectionsWithStartingClass(
          classUnitId(authoredUnitId("class_fighter")),
        ),
        unitLibrary,
      ),
    ).toBe(true);
  });

  test("checks background score increases against readable installed facts", () => {
    expect(
      isSupportedBackgroundAbilityScoreIncrease(
        { kind: "oneEach" },
        unitLibrary,
        authoredUnitId("synthetic_unknown_background"),
        baseScores,
      ),
    ).toBe(false);
    expect(
      isSupportedBackgroundAbilityScoreIncrease(
        { kind: "oneEach" },
        unitLibrary,
        authoredUnitId("weapon_longsword"),
        baseScores,
      ),
    ).toBe(false);
    expect(
      isSupportedBackgroundAbilityScoreIncrease(
        { kind: "oneEach" },
        unitLibrary,
        authoredUnitId("background_soldier"),
        baseScores,
      ),
    ).toBe(true);
  });
});
