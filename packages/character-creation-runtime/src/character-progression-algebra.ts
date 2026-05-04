import { Either, Option } from "effect";
import {
  CLASS_NAMES,
  CHARACTER_CLASS_LEVELS,
  type CharacterClassLevel,
  type ClassName,
} from "@dnd/shared/game-facts";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";

import type { CharacterAdvancementSelection } from "./types.ts";

export type CharacterProgression = {
  readonly classUnitId: UnitRecord["id"];
  readonly classLevel: CharacterClassLevel;
};

export type CharacterProgressionClassLevels = Readonly<
  Partial<Record<ClassName, CharacterClassLevel>>
>;

export type CharacterProgressionUnitIdInput = {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: UnitRecord["id"];
  readonly classLevel: CharacterClassLevel;
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
      readonly code: "unsupportedMulticlassProgression";
    }
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
  readonly classUnitId: UnitRecord["id"];
  readonly classLevel: CharacterClassLevel;
}): Either.Either<CharacterProgression, CharacterProgressionIssue> {
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === input.classLevel)) {
    return Either.left({
      code: "invalidTotalCharacterLevel",
      totalLevel: input.classLevel,
    });
  }

  return Either.right({
    classUnitId: input.classUnitId,
    classLevel: input.classLevel,
  });
}

export function computeTotalLevel(
  progression: CharacterProgression,
): CharacterClassLevel {
  return progression.classLevel;
}

export function progressionClassLevels(input: {
  readonly progression: CharacterProgression;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<CharacterProgressionClassLevels, ClassUnitNameIssue> {
  const progressionClassName = classUnitIdToClassName({
    unitLibrary: input.unitLibrary,
    classUnitId: input.progression.classUnitId,
  });
  if (Either.isLeft(progressionClassName)) {
    return Either.left(progressionClassName.left);
  }

  return Either.right(
    Object.fromEntries(
      CLASS_NAMES.flatMap((className) =>
        className !== progressionClassName.right
          ? []
          : [[className, input.progression.classLevel]],
      ),
    ) as CharacterProgressionClassLevels,
  );
}

export function orderedProgressionClasses(input: {
  readonly progression: CharacterProgression;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<readonly ClassName[], ClassUnitNameIssue> {
  const className = classUnitIdToClassName({
    unitLibrary: input.unitLibrary,
    classUnitId: input.progression.classUnitId,
  });
  return Either.isLeft(className)
    ? Either.left(className.left)
    : Either.right(
        Array.from(
          { length: input.progression.classLevel },
          () => className.right,
        ),
      );
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
  const className = classUnitIdToClassName({
    unitLibrary: input.unitLibrary,
    classUnitId: input.classUnitId,
  });

  if (Either.isLeft(className)) {
    return Either.left(className.left);
  }

  return createCharacterProgression({
    classUnitId: input.classUnitId,
    classLevel: input.classLevel,
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

  if (input.advancement.entries.length !== 1) {
    return Either.left({ code: "unsupportedMulticlassProgression" });
  }

  const entry = input.advancement.entries[0];
  const className = classUnitIdToClassName({
    unitLibrary: input.unitLibrary,
    classUnitId: entry.classUnitId,
  });
  if (Either.isLeft(className)) {
    return Either.left(className.left);
  }

  if (className.right !== startingClass.right) {
    return Either.left({
      code: "primaryClassMismatch",
      primaryClassUnitId: input.primaryClassUnitId,
      firstAdvancementClassName: className.right,
    });
  }

  return createCharacterProgression({
    classUnitId: entry.classUnitId,
    classLevel: entry.level,
  });
}
