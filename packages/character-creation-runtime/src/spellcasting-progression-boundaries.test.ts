import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type {
  ClassSpellcastingCreation,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import { classSpellcastingCreationAtLevel } from "./class-spellcasting.ts";

const catalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (catalogResult.tag !== "ok") {
  throw new Error("The SRD Unit catalog spellcasting fixture must compose.");
}
const unitLibrary = catalogResult.catalog;

function spellcastingForClass(
  classUnitId: UnitRecord["id"],
): ClassSpellcastingCreation {
  const facts = readClassCreationFacts(unitLibrary.requireUnit(classUnitId));
  if (facts.tag !== "readable" || facts.value.spellcasting === undefined) {
    throw new Error(
      `The ${classUnitId} fixture must expose readable spellcasting facts.`,
    );
  }
  return facts.value.spellcasting;
}

describe("class spellcasting progression boundaries", () => {
  test.each([
    ["class_wizard", "wizard_spellcasting_creation"],
    ["class_cleric", "list_prepared_spellcasting_progression_creation"],
    ["class_warlock", "pact_magic_spellcasting_creation"],
  ] as const)(
    "rejects an unsupported class level for %s",
    (classUnitId, expectedKind) => {
      const spellcasting = spellcastingForClass(authoredUnitId(classUnitId));
      expect(spellcasting.kind).toBe(expectedKind);
      expect(
        classSpellcastingCreationAtLevel(spellcasting, 21),
      ).toBeUndefined();
    },
  );
});
