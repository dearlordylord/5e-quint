// KERNEL-COVERAGE: parity-witness CREATION.MAGIC_INITIATE.CHOICE_FINALIZATION
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { parseCharacterBuildMagicInitiateSpellAccesses } from "./magic-initiate-spell-access.ts";

const unitLibrary = (() => {
  const result = buildUnitCatalog({ collections: [srdUnitCollection] });
  if (result.tag !== "ok") {
    throw new Error("Expected the SRD Unit catalog fixture to build.");
  }
  return result.catalog;
})();

const wizardAccess = {
  featUnitId: authoredUnitId("feat_magic_initiate_wizard"),
  spellcastingAbility: "int" as const,
  cantrips: [authoredUnitId("fire_bolt"), authoredUnitId("light")] as const,
  levelOneSpell: authoredUnitId("mage_armor"),
};

const clericAccess = {
  featUnitId: authoredUnitId("feat_magic_initiate_cleric"),
  spellcastingAbility: "wis" as const,
  cantrips: [
    authoredUnitId("guidance"),
    authoredUnitId("sacred_flame"),
  ] as const,
  levelOneSpell: authoredUnitId("bless"),
};

const humanOriginFeat = {
  kind: "selectedClassChoice" as const,
  selectedFromUnitId: authoredUnitId("species_human_versatile"),
  unitId: authoredUnitId("feat_magic_initiate_wizard"),
};

const humanClericOriginFeat = {
  ...humanOriginFeat,
  unitId: authoredUnitId("feat_magic_initiate_cleric"),
};

describe("creation-owned Magic Initiate Spell Access parsing", () => {
  test("rejects background and Human grants of the same spell list", () => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [wizardAccess],
      build: {
        background: authoredUnitId("background_sage"),
        species: authoredUnitId("species_human"),
        features: [humanOriginFeat],
      },
      unitLibrary,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.map((issue) => issue.message)).toContain(
        "Character Build cannot acquire Magic Initiate more than once for the same spell list.",
      );
    }
  });

  test("accepts background and Human grants from different spell lists", () => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [wizardAccess, clericAccess],
      build: {
        background: authoredUnitId("background_sage"),
        species: authoredUnitId("species_human"),
        features: [humanClericOriginFeat],
      },
      unitLibrary,
    });

    expect(result).toEqual(Either.right([wizardAccess, clericAccess]));
  });

  test("does not treat an unrelated selected feature as a Human grant", () => {
    const result = parseCharacterBuildMagicInitiateSpellAccesses({
      value: [wizardAccess],
      build: {
        background: authoredUnitId("background_soldier"),
        species: authoredUnitId("species_human"),
        features: [
          {
            ...humanOriginFeat,
            selectedFromUnitId: authoredUnitId("class_wizard"),
          },
        ],
      },
      unitLibrary,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.map((issue) => issue.message)).toContain(
        "Magic Initiate Spell Access source Unit feat_magic_initiate_wizard is not owned by the Character Build.",
      );
    }
  });
});
