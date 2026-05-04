import { Either } from "effect";
import { describe, expect, it } from "vitest";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import { characterClassLevel } from "./types.ts";
import {
  classNameFromClassUnit,
  classUnitIdToClassName,
  characterProgressionFromAdvancementSelection,
  characterProgressionFromUnitIds,
  computeTotalLevel,
  createCharacterProgression,
  orderedProgressionClasses,
  progressionClassLevels,
} from "./character-progression-algebra.ts";

function expectRight<T, E>(result: Either.Either<T, E>): T {
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(
      `Expected Either.right, received ${JSON.stringify(result.left)}`,
    );
  }

  return result.right;
}

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

if (unitCatalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;

describe("character progression algebra", () => {
  it("derives a level-1 Fighter without storing an advancement level", () => {
    const progression = expectRight(
      createCharacterProgression({
        startingClass: "fighter",
        advancements: [],
      }),
    );

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
    const progression = expectRight(
      createCharacterProgression({
        startingClass: "fighter",
        advancements: ["fighter"],
      }),
    );

    expect(computeTotalLevel(progression)).toBe(2);
    expect(progressionClassLevels(progression)).toEqual({
      fighter: 2,
    });
  });

  it("derives a Fighter/Wizard progression from ordered class choices", () => {
    const progression = expectRight(
      createCharacterProgression({
        startingClass: "fighter",
        advancements: ["wizard"],
      }),
    );

    expect(orderedProgressionClasses(progression)).toEqual([
      "fighter",
      "wizard",
    ]);
    expect(computeTotalLevel(progression)).toBe(2);
    expect(progressionClassLevels(progression)).toEqual({
      fighter: 1,
      wizard: 1,
    });
  });

  it("converts Surface class Unit ids at one explicit boundary", () => {
    const progression = expectRight(
      characterProgressionFromUnitIds({
        unitLibrary,
        startingClassUnitId: "class_fighter",
        postStartAdvancementClassUnitIds: ["class_wizard"],
      }),
    );

    expect(progression).toEqual({
      startingClass: "fighter",
      advancements: ["wizard"],
    });
  });

  it("requires an explicit empty post-start Unit-id list for level 1", () => {
    const progression = expectRight(
      characterProgressionFromUnitIds({
        unitLibrary,
        startingClassUnitId: "class_fighter",
        postStartAdvancementClassUnitIds: [],
      }),
    );

    expect(progression).toEqual({
      startingClass: "fighter",
      advancements: [],
    });
  });

  it("projects advancement selection entries without keeping stored levels", () => {
    const progression = expectRight(
      characterProgressionFromAdvancementSelection({
        unitLibrary,
        primaryClassUnitId: "class_fighter",
        advancement: {
          entries: [
            { classUnitId: "class_fighter", level: characterClassLevel(2) },
          ],
        },
      }),
    );

    expect(progression).toEqual({
      startingClass: "fighter",
      advancements: ["fighter"],
    });
  });

  it("returns typed issues for non-class Unit projection inputs", () => {
    const background = unitLibrary.requireUnit("background_soldier");

    expect(classNameFromClassUnit(background)).toEqual(
      Either.left({
        code: "nonClassUnit",
        unitId: "background_soldier",
        unitKind: "background",
      }),
    );
    expect(
      classUnitIdToClassName({
        unitLibrary,
        classUnitId: "background_soldier",
      }),
    ).toEqual(
      Either.left({
        code: "nonClassUnit",
        unitId: "background_soldier",
        unitKind: "background",
      }),
    );
  });

  it("returns typed issues for unknown Unit ids", () => {
    expect(
      classUnitIdToClassName({
        unitLibrary,
        classUnitId: "missing_unit",
      }),
    ).toEqual(
      Either.left({
        code: "unknownUnitId",
        unitId: "missing_unit",
      }),
    );
  });

  it("returns typed issues for invalid progression totals", () => {
    expect(
      createCharacterProgression({
        startingClass: "fighter",
        advancements: Array.from({ length: 20 }, () => "fighter"),
      }),
    ).toEqual(
      Either.left({
        code: "invalidTotalCharacterLevel",
        totalLevel: 21,
      }),
    );
  });

  it("returns a typed issue when advancement selection starts with another class", () => {
    expect(
      characterProgressionFromAdvancementSelection({
        unitLibrary,
        primaryClassUnitId: "class_fighter",
        advancement: {
          entries: [
            { classUnitId: "class_wizard", level: characterClassLevel(1) },
          ],
        },
      }),
    ).toEqual(
      Either.left({
        code: "primaryClassMismatch",
        primaryClassUnitId: "class_fighter",
        firstAdvancementClassName: "wizard",
      }),
    );
  });
});
