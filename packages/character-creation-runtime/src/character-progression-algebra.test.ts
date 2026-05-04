import { Either, Option } from "effect";
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
  characterProgressionFromAdvancementSelection,
  computeTotalLevel,
  createCharacterProgression,
} from "./character-progression-algebra.ts";
import {
  characterAdvancementEntry,
  type CharacterAdvancementEntry,
  type HitPointAdvancementMethod,
} from "./character-progression-types.ts";
import type { UnitRecord } from "@dnd/surface/surface/types";

function expectRight<T, E>(result: Either.Either<T, E>): T {
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(
      `Expected Either.right, received ${JSON.stringify(result.left)}`,
    );
  }

  return result.right;
}

function testAdvancementEntry(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly classLevel: ReturnType<typeof characterClassLevel>;
  readonly hitPointAdvancement: HitPointAdvancementMethod;
}): CharacterAdvancementEntry {
  return expectRight(characterAdvancementEntry(input));
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
      createCharacterProgression({
        classUnitId: fighterClassUnitId,
        classLevel: characterClassLevel(1),
        hitPointAdvancement: { tag: "levelOneMaximum" },
      }),
    );

    expect(progression).toEqual({
      classUnitId: "class_fighter",
      classLevel: 1,
      hitPointAdvancement: { tag: "levelOneMaximum" },
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
      createCharacterProgression({
        classUnitId: fighterClassUnitId,
        classLevel: characterClassLevel(2),
        hitPointAdvancement: { tag: "fixedAfterLevelOne" },
      }),
    );

    expect(computeTotalLevel(progression)).toBe(2);
    expect(progression).toEqual({
      classUnitId: "class_fighter",
      classLevel: 2,
      hitPointAdvancement: { tag: "fixedAfterLevelOne" },
    });
  });

  it("projects single-class advancement selection entries", () => {
    const progression = expectRight(
      characterProgressionFromAdvancementSelection({
        unitLibrary,
        primaryClassUnitId: "class_fighter",
        advancement: {
          entries: [
            testAdvancementEntry({
              classUnitId: "class_fighter",
              classLevel: characterClassLevel(2),
              hitPointAdvancement: { tag: "fixedAfterLevelOne" },
            }),
          ],
        },
      }),
    );

    expect(progression).toEqual({
      classUnitId: "class_fighter",
      classLevel: 2,
      hitPointAdvancement: { tag: "fixedAfterLevelOne" },
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
      createCharacterProgression({
        classUnitId: fighterClassUnitId,
        classLevel: 21 as ReturnType<typeof characterClassLevel>,
        hitPointAdvancement: { tag: "fixedAfterLevelOne" },
      }),
    ).toEqual(
      Either.left({
        code: "invalidCharacterClassLevel",
        classLevel: 21,
      }),
    );
  });

  it("returns typed issues for HP advancement evidence that contradicts level", () => {
    const fighterClassUnitId = expectRight(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: "class_fighter",
      }),
    );

    expect(
      createCharacterProgression({
        classUnitId: fighterClassUnitId,
        classLevel: characterClassLevel(2),
        hitPointAdvancement: { tag: "levelOneMaximum" },
      }),
    ).toEqual(
      Either.left({
        code: "invalidHitPointAdvancementForLevel",
        classLevel: 2,
        hitPointAdvancement: { tag: "levelOneMaximum" },
      }),
    );
  });

  it("returns a typed issue for source-shaped multiclass groups", () => {
    expect(
      characterProgressionFromAdvancementSelection({
        unitLibrary,
        primaryClassUnitId: "class_fighter",
        advancement: {
          entries: [
            testAdvancementEntry({
              classUnitId: "class_fighter",
              classLevel: characterClassLevel(1),
              hitPointAdvancement: { tag: "levelOneMaximum" },
            }),
            testAdvancementEntry({
              classUnitId: "class_wizard",
              classLevel: characterClassLevel(1),
              hitPointAdvancement: { tag: "levelOneMaximum" },
            }),
          ],
        },
      }),
    ).toEqual(
      Either.left({
        code: "unsupportedMulticlassProgression",
      }),
    );
  });

  it("returns typed issues for grouped same-class advancement entries", () => {
    expect(
      characterProgressionFromAdvancementSelection({
        unitLibrary,
        primaryClassUnitId: "class_fighter",
        advancement: {
          entries: [
            testAdvancementEntry({
              classUnitId: "class_fighter",
              classLevel: characterClassLevel(1),
              hitPointAdvancement: { tag: "levelOneMaximum" },
            }),
            testAdvancementEntry({
              classUnitId: "class_fighter",
              classLevel: characterClassLevel(2),
              hitPointAdvancement: { tag: "fixedAfterLevelOne" },
            }),
          ],
        },
      }),
    ).toEqual(
      Either.left({
        code: "unsupportedGroupedClassProgression",
        classUnitId: "class_fighter",
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
            testAdvancementEntry({
              classUnitId: "class_wizard",
              classLevel: characterClassLevel(1),
              hitPointAdvancement: { tag: "levelOneMaximum" },
            }),
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

  it("compares primary and advancement class identity by Unit id, not class name", () => {
    const fighter = unitLibrary.requireUnit("class_fighter");
    const alternateFighter = {
      ...fighter,
      id: "class_fighter_alternate",
    } satisfies UnitRecord;
    const duplicateClassNameLibrary = {
      getUnit: (unitId: UnitRecord["id"]) =>
        unitId === alternateFighter.id
          ? Option.some(alternateFighter)
          : unitLibrary.getUnit(unitId),
      listUnits: () => [...unitLibrary.listUnits(), alternateFighter],
      requireUnit: (unitId: UnitRecord["id"]) => {
        const unit = duplicateClassNameLibrary.getUnit(unitId);
        if (Option.isNone(unit)) {
          throw new Error(`Missing test Unit: ${unitId}`);
        }

        return unit.value;
      },
    };

    expect(
      characterProgressionFromAdvancementSelection({
        unitLibrary: duplicateClassNameLibrary,
        primaryClassUnitId: "class_fighter",
        advancement: {
          entries: [
            testAdvancementEntry({
              classUnitId: alternateFighter.id,
              classLevel: characterClassLevel(1),
              hitPointAdvancement: { tag: "levelOneMaximum" },
            }),
          ],
        },
      }),
    ).toEqual(
      Either.left({
        code: "primaryClassMismatch",
        primaryClassUnitId: "class_fighter",
        firstAdvancementClassName: "fighter",
      }),
    );
  });
});
