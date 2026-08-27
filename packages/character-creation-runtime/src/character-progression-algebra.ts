import { Result, Option } from "effect";
import {
  CHARACTER_CLASS_LEVELS,
  characterClassLevel,
  type ClassName,
} from "@dnd/shared/game-facts";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";

import {
  characterProgressionEntry,
  classUnitId,
  type CharacterProgression,
  type CharacterProgressionLevelIssue,
  type ClassUnitId,
  type FixedHigherLevelClassHitPointRule,
} from "./character-progression-types.ts";

export type { CharacterProgression } from "./character-progression-types.ts";

export type CharacterProgressionIssue = CharacterProgressionLevelIssue;

export type ClassUnitNameIssue =
  | {
      readonly code: "unknownUnitId";
      readonly unitId: UnitRecord["id"];
    }
  | {
      readonly code: "nonClassUnit";
      readonly unitId: UnitRecord["id"];
      readonly unitKind: UnitRecord["kind"];
    };

export function parseCharacterProgressionShape(input: {
  readonly startingClass: ClassUnitId;
  readonly advancements: readonly {
    readonly classUnitId: ClassUnitId;
    readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  }[];
}): Result.Result<
  CharacterProgression,
  ReadonlyNonEmptyArray<CharacterProgressionIssue>
> {
  const totalLevel = 1 + input.advancements.length;
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === totalLevel)) {
    return Result.fail([
      {
        code: "invalidCharacterClassLevel",
        classLevel: totalLevel,
      },
    ]);
  }

  const advancements = traverseValidation(input.advancements, (entry, index) =>
    characterProgressionEntry({
      classUnitId: entry.classUnitId,
      characterLevel: characterClassLevel(index + 2),
      hitPointRule: entry.hitPointRule,
    }),
  );
  /* v8 ignore start -- @preserve -- Parsed progression entries have already satisfied this per-entry class-level boundary. */
  if (Result.isFailure(advancements)) return Result.fail(advancements.failure);
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    startingClass: input.startingClass,
    advancements: advancements.success,
  });
}

export function classNameFromClassUnit(
  unit: UnitRecord,
): Result.Result<ClassName, ClassUnitNameIssue> {
  if (unit.kind !== "class") {
    return Result.fail({
      code: "nonClassUnit",
      unitId: unit.id,
      unitKind: unit.kind,
    });
  }

  return Result.succeed(unit.className);
}

export function classUnitIdFromClassUnit(
  unit: UnitRecord,
): Result.Result<ClassUnitId, ClassUnitNameIssue> {
  return unit.kind === "class"
    ? Result.succeed(classUnitId(unit.id))
    : Result.fail({
        code: "nonClassUnit",
        unitId: unit.id,
        unitKind: unit.kind,
      });
}

export function classUnitIdToClassName(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: UnitRecord["id"];
}): Result.Result<ClassName, ClassUnitNameIssue> {
  const unit = input.unitLibrary.getUnit(input.classUnitId);

  if (Option.isNone(unit)) {
    return Result.fail({
      code: "unknownUnitId",
      unitId: input.classUnitId,
    });
  }

  return classNameFromClassUnit(unit.value);
}

export function classUnitIdFromUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: UnitRecord["id"];
}): Result.Result<ClassUnitId, ClassUnitNameIssue> {
  const unit = input.unitLibrary.getUnit(input.classUnitId);

  if (Option.isNone(unit)) {
    return Result.fail({
      code: "unknownUnitId",
      unitId: input.classUnitId,
    });
  }

  return classUnitIdFromClassUnit(unit.value);
}
