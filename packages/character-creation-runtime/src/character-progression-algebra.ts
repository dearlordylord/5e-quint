import { Either, Option } from "effect";
import {
  CLASS_NAMES,
  CHARACTER_CLASS_LEVELS,
  characterClassLevel,
  type CharacterClassLevel,
  type ClassName,
} from "@dnd/shared/game-facts";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";

import type { CharacterAdvancementSelection } from "./types.ts";

export type CharacterProgression = {
  readonly startingClass: ClassName;
  readonly advancements: readonly ClassName[];
};

export type CharacterProgressionClassLevels = Readonly<
  Partial<Record<ClassName, CharacterClassLevel>>
>;

export type CharacterProgressionUnitIdInput = {
  readonly unitLibrary: UnitCatalog;
  readonly startingClassUnitId: UnitRecord["id"];
  readonly postStartAdvancementClassUnitIds: readonly UnitRecord["id"][];
};

export type CharacterProgressionIssue = {
  readonly code: "invalidTotalCharacterLevel";
  readonly totalLevel: number;
};

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

export type CharacterProgressionUnitIdIssue =
  | CharacterProgressionIssue
  | ClassUnitNameIssue;

export type AdvancementSelectionProgressionIssue =
  | CharacterProgressionIssue
  | ClassUnitNameIssue
  | {
      readonly code: "primaryClassMismatch";
      readonly primaryClassUnitId: UnitRecord["id"];
      readonly firstAdvancementClassName: ClassName | undefined;
    };

export type AdvancementSelectionProgressionInput = {
  readonly unitLibrary: UnitCatalog;
  readonly primaryClassUnitId: UnitRecord["id"];
  readonly advancement: CharacterAdvancementSelection;
};

export function createCharacterProgression(input: {
  readonly startingClass: ClassName;
  readonly advancements: readonly ClassName[];
}): Either.Either<CharacterProgression, CharacterProgressionIssue> {
  const advancements = [...input.advancements];
  const totalLevel = 1 + advancements.length;

  if (!CHARACTER_CLASS_LEVELS.some((level) => level === totalLevel)) {
    return Either.left({
      code: "invalidTotalCharacterLevel",
      totalLevel,
    });
  }

  return Either.right({
    startingClass: input.startingClass,
    advancements,
  });
}

export function computeTotalLevel(
  progression: CharacterProgression,
): CharacterClassLevel {
  return characterClassLevel(orderedProgressionClasses(progression).length);
}

export function progressionClassLevels(
  progression: CharacterProgression,
): CharacterProgressionClassLevels {
  const counts = Object.fromEntries(
    CLASS_NAMES.map((className) => [className, 0]),
  ) as Record<ClassName, number>;

  for (const className of orderedProgressionClasses(progression)) {
    counts[className] += 1;
  }

  return Object.fromEntries(
    CLASS_NAMES.flatMap((className) =>
      counts[className] === 0
        ? []
        : [[className, characterClassLevel(counts[className])]],
    ),
  ) as CharacterProgressionClassLevels;
}

export function orderedProgressionClasses(
  progression: CharacterProgression,
): readonly ClassName[] {
  return [progression.startingClass, ...progression.advancements];
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

export function characterProgressionFromUnitIds(
  input: CharacterProgressionUnitIdInput,
): Either.Either<CharacterProgression, CharacterProgressionUnitIdIssue> {
  const startingClass = classUnitIdToClassName({
    unitLibrary: input.unitLibrary,
    classUnitId: input.startingClassUnitId,
  });

  if (Either.isLeft(startingClass)) {
    return Either.left(startingClass.left);
  }

  const advancements: ClassName[] = [];

  for (const classUnitId of input.postStartAdvancementClassUnitIds) {
    const className = classUnitIdToClassName({
      unitLibrary: input.unitLibrary,
      classUnitId,
    });

    if (Either.isLeft(className)) {
      return Either.left(className.left);
    }

    advancements.push(className.right);
  }

  return createCharacterProgression({
    startingClass: startingClass.right,
    advancements,
  });
}

export function characterProgressionFromAdvancementSelection(
  input: AdvancementSelectionProgressionInput,
): Either.Either<CharacterProgression, AdvancementSelectionProgressionIssue> {
  const startingClass = classUnitIdToClassName({
    unitLibrary: input.unitLibrary,
    classUnitId: input.primaryClassUnitId,
  });

  if (Either.isLeft(startingClass)) {
    return Either.left(startingClass.left);
  }

  const expandedClasses: ClassName[] = [];

  for (const entry of input.advancement.entries) {
    const className = classUnitIdToClassName({
      unitLibrary: input.unitLibrary,
      classUnitId: entry.classUnitId,
    });

    if (Either.isLeft(className)) {
      return Either.left(className.left);
    }

    expandedClasses.push(
      ...Array.from({ length: entry.level }, () => className.right),
    );
  }

  if (expandedClasses[0] !== startingClass.right) {
    return Either.left({
      code: "primaryClassMismatch",
      primaryClassUnitId: input.primaryClassUnitId,
      firstAdvancementClassName: expandedClasses[0],
    });
  }

  return createCharacterProgression({
    startingClass: startingClass.right,
    advancements: expandedClasses.slice(1),
  });
}
