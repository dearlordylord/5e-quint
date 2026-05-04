import { Either, Option } from "effect";
import {
  CHARACTER_CLASS_LEVELS,
  characterClassLevel,
  type CharacterClassLevel,
  type ClassName,
} from "@dnd/shared/game-facts";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";

import {
  characterProgressionEntry,
  characterLevelHitPointRule,
  classUnitId,
  type CharacterProgression,
  type CharacterProgressionLevelIssue,
  type CharacterProgressionEntry,
  type ClassUnitId,
  type ClassHitPointRule,
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

export function createCharacterProgression(input: {
  readonly startingClass: ClassUnitId;
  readonly advancements: readonly {
    readonly classUnitId: ClassUnitId;
    readonly hitPointRule: FixedHigherLevelClassHitPointRule;
  }[];
}): Either.Either<CharacterProgression, CharacterProgressionIssue> {
  const totalLevel = 1 + input.advancements.length;
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === totalLevel)) {
    return Either.left({
      code: "invalidCharacterClassLevel",
      classLevel: totalLevel,
    });
  }

  const advancements: CharacterProgressionEntry[] = [];
  for (const [index, entry] of input.advancements.entries()) {
    const parsedEntry = characterProgressionEntry({
      classUnitId: entry.classUnitId,
      characterLevel: characterClassLevel(index + 2),
      hitPointRule: entry.hitPointRule,
    });
    if (Either.isLeft(parsedEntry)) {
      return Either.left(parsedEntry.left);
    }
    advancements.push(parsedEntry.right);
  }

  return Either.right({
    startingClass: input.startingClass,
    advancements,
  });
}

export function createSingleClassProgression(input: {
  readonly classUnitId: ClassUnitId;
  readonly classLevel: CharacterClassLevel;
  readonly hitPointRule: ClassHitPointRule;
}): Either.Either<CharacterProgression, CharacterProgressionIssue> {
  const classLevelHitPointRule = characterLevelHitPointRule(input);
  if (Either.isLeft(classLevelHitPointRule)) {
    return Either.left(classLevelHitPointRule.left);
  }
  if (input.classLevel === 1) {
    return createCharacterProgression({
      startingClass: input.classUnitId,
      advancements: [],
    });
  }
  if (
    classLevelHitPointRule.right.hitPointRule.tag !== "fixedHigherLevelGain"
  ) {
    return Either.left({
      code: "invalidHitPointRuleForLevel",
      classLevel: input.classLevel,
      hitPointRule: input.hitPointRule,
    });
  }

  const hitPointRule = classLevelHitPointRule.right.hitPointRule;
  return createCharacterProgression({
    startingClass: input.classUnitId,
    advancements: Array.from({ length: input.classLevel - 1 }, () => ({
      classUnitId: input.classUnitId,
      hitPointRule,
    })),
  });
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
