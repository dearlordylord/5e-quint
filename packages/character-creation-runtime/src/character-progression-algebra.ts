import { Either, Option } from "effect";
import type { CharacterClassLevel, ClassName } from "@dnd/shared/game-facts";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";

import {
  characterLevelHitPointRule,
  classUnitId,
  type CharacterProgression,
  type CharacterProgressionLevelIssue,
  type ClassUnitId,
  type ClassHitPointRule,
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

export function createCharacterProgression(input: {
  readonly classUnitId: ClassUnitId;
  readonly classLevel: CharacterClassLevel;
  readonly hitPointRule: ClassHitPointRule;
}): Either.Either<CharacterProgression, CharacterProgressionIssue> {
  const classLevelHitPointRule = characterLevelHitPointRule(input);
  if (Either.isLeft(classLevelHitPointRule)) {
    return Either.left(classLevelHitPointRule.left);
  }

  return Either.right({
    classUnitId: input.classUnitId,
    ...classLevelHitPointRule.right,
  });
}

export function computeTotalLevel(
  progression: CharacterProgression,
): CharacterClassLevel {
  return progression.classLevel;
}

export function classNameFromClassUnit(
  unit: UnitRecord,
): Either.Either<ClassName, ClassUnitNameIssue> {
  if (unit.kind !== "class") {
    return Either.left({
      code: "nonClassUnit",
      unitId: unit.id,
      unitKind: unit.kind,
    });
  }

  return Either.right(unit.className);
}

export function classUnitIdFromClassUnit(
  unit: UnitRecord,
): Either.Either<ClassUnitId, ClassUnitNameIssue> {
  return unit.kind === "class"
    ? Either.right(classUnitId(unit.id))
    : Either.left({
        code: "nonClassUnit",
        unitId: unit.id,
        unitKind: unit.kind,
      });
}

export function classUnitIdToClassName(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: UnitRecord["id"];
}): Either.Either<ClassName, ClassUnitNameIssue> {
  const unit = input.unitLibrary.getUnit(input.classUnitId);

  if (Option.isNone(unit)) {
    return Either.left({
      code: "unknownUnitId",
      unitId: input.classUnitId,
    });
  }

  return classNameFromClassUnit(unit.value);
}

export function classUnitIdFromUnitId(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: UnitRecord["id"];
}): Either.Either<ClassUnitId, ClassUnitNameIssue> {
  const unit = input.unitLibrary.getUnit(input.classUnitId);

  if (Option.isNone(unit)) {
    return Either.left({
      code: "unknownUnitId",
      unitId: input.classUnitId,
    });
  }

  return classUnitIdFromClassUnit(unit.value);
}
