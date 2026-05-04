import { Either } from "effect";
import { describe, expect, it } from "vitest";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import { characterClassLevel } from "./types.ts";
import {
  classNameFromClassUnit,
  classUnitIdFromUnitId,
  classUnitIdToClassName,
  createCharacterProgression,
  createSingleClassProgression,
} from "./character-progression-algebra.ts";
import {
  classLevelForUnit,
  computeTotalLevel,
} from "./character-progression-types.ts";

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
  it("derives a level-1 Fighter from a parsed class Unit id", () => {
    const fighterClassUnitId = expectRight(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: "class_fighter",
      }),
    );
    const progression = expectRight(
      createSingleClassProgression({
        classUnitId: fighterClassUnitId,
        classLevel: characterClassLevel(1),
        hitPointRule: { tag: "levelOneMaximumHitDie" },
      }),
    );

    expect(progression).toEqual({
      startingClass: "class_fighter",
      advancements: [],
    });
    expect(computeTotalLevel(progression)).toBe(1);
  });

  it("derives Fighter 2 with explicit fixed HP evidence", () => {
    const fighterClassUnitId = expectRight(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: "class_fighter",
      }),
    );
    const progression = expectRight(
      createSingleClassProgression({
        classUnitId: fighterClassUnitId,
        classLevel: characterClassLevel(2),
        hitPointRule: { tag: "fixedHigherLevelGain" },
      }),
    );

    expect(computeTotalLevel(progression)).toBe(2);
    expect(progression).toEqual({
      startingClass: "class_fighter",
      advancements: [
        {
          classUnitId: "class_fighter",
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
    });
  });

  it("represents a post-start multiclass entry without duplicating the starting class", () => {
    const fighterClassUnitId = expectRight(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: "class_fighter",
      }),
    );
    const wizardClassUnitId = expectRight(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: "class_wizard",
      }),
    );

    const progression = expectRight(
      createCharacterProgression({
        startingClass: fighterClassUnitId,
        advancements: [
          {
            classUnitId: wizardClassUnitId,
            hitPointRule: { tag: "fixedHigherLevelGain" },
          },
        ],
      }),
    );

    expect(computeTotalLevel(progression)).toBe(2);
    expect(classLevelForUnit(progression, "class_fighter")).toBe(1);
    expect(classLevelForUnit(progression, "class_wizard")).toBe(1);
    expect(progression).toEqual({
      startingClass: "class_fighter",
      advancements: [
        {
          classUnitId: "class_wizard",
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
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
    const fighterClassUnitId = expectRight(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: "class_fighter",
      }),
    );

    expect(
      createSingleClassProgression({
        classUnitId: fighterClassUnitId,
        classLevel: 21 as ReturnType<typeof characterClassLevel>,
        hitPointRule: { tag: "fixedHigherLevelGain" },
      }),
    ).toEqual(
      Either.left({
        code: "invalidCharacterClassLevel",
        classLevel: 21,
      }),
    );
  });

  it("returns typed issues for HP Hit Point rule evidence that contradicts level", () => {
    const fighterClassUnitId = expectRight(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: "class_fighter",
      }),
    );

    expect(
      createSingleClassProgression({
        classUnitId: fighterClassUnitId,
        classLevel: characterClassLevel(2),
        hitPointRule: { tag: "levelOneMaximumHitDie" },
      }),
    ).toEqual(
      Either.left({
        code: "invalidHitPointRuleForLevel",
        totalLevel: 2,
        hitPointRule: { tag: "levelOneMaximumHitDie" },
      }),
    );
  });
});
