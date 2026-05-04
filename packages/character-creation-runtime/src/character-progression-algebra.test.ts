import { describe, expect, it } from "vitest";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import { characterClassLevel } from "./types.ts";
import {
  characterProgressionFromLegacyAdvancement,
  characterProgressionFromUnitIds,
  computeTotalLevel,
  createCharacterProgression,
  orderedProgressionClasses,
  postStartAdvancementLevel,
  progressionClassLevels,
} from "./character-progression-algebra.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

if (unitCatalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;

describe("character progression algebra", () => {
  it("derives a level-1 Fighter without storing an advancement level", () => {
    const progression = createCharacterProgression({
      startingClass: "fighter",
    });

    expect(progression).toEqual({
      startingClass: "fighter",
      advancements: [],
    });
    expect(computeTotalLevel(progression)).toBe(1);
    expect(progressionClassLevels(progression)).toEqual({
      fighter: 1,
    });
  });

  it("derives Fighter 2 from one post-start Fighter advancement", () => {
    const progression = createCharacterProgression({
      startingClass: "fighter",
      advancements: ["fighter"],
    });

    expect(computeTotalLevel(progression)).toBe(2);
    expect(postStartAdvancementLevel(progression, 0)).toBe(2);
    expect(progressionClassLevels(progression)).toEqual({
      fighter: 2,
    });
  });

  it("derives a Fighter/Wizard progression from ordered class choices", () => {
    const progression = createCharacterProgression({
      startingClass: "fighter",
      advancements: ["wizard"],
    });

    expect(orderedProgressionClasses(progression)).toEqual([
      "fighter",
      "wizard",
    ]);
    expect(computeTotalLevel(progression)).toBe(2);
    expect(postStartAdvancementLevel(progression, 0)).toBe(2);
    expect(progressionClassLevels(progression)).toEqual({
      fighter: 1,
      wizard: 1,
    });
  });

  it("converts Surface class Unit ids at one explicit boundary", () => {
    const progression = characterProgressionFromUnitIds({
      unitLibrary,
      startingClassUnitId: "class_fighter",
      postStartAdvancementClassUnitIds: ["class_wizard"],
    });

    expect(progression).toEqual({
      startingClass: "fighter",
      advancements: ["wizard"],
    });
  });

  it("requires an explicit empty post-start Unit-id list for level 1", () => {
    const progression = characterProgressionFromUnitIds({
      unitLibrary,
      startingClassUnitId: "class_fighter",
      postStartAdvancementClassUnitIds: [],
    });

    expect(progression).toEqual({
      startingClass: "fighter",
      advancements: [],
    });
  });

  it("projects legacy advancement entries without keeping stored levels", () => {
    const progression = characterProgressionFromLegacyAdvancement({
      unitLibrary,
      primaryClassUnitId: "class_fighter",
      advancement: {
        entries: [
          { classUnitId: "class_fighter", level: characterClassLevel(2) },
        ],
      },
    });

    expect(progression).toEqual({
      startingClass: "fighter",
      advancements: ["fighter"],
    });
  });
});
