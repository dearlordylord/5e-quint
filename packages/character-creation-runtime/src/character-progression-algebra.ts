import { Brand, Either, Option } from "effect";
import {
  CHARACTER_CLASS_LEVELS,
  type CharacterClassLevel,
  type ClassName,
} from "@dnd/shared/game-facts";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";

import type { CharacterAdvancementSelection } from "./types.ts";

export type ClassUnitId = UnitRecord["id"] & Brand.Brand<"ClassUnitId">;
const ClassUnitId = Brand.nominal<ClassUnitId>();

export type HitPointAdvancementMethod =
  | { readonly tag: "levelOneMaximum" }
  | { readonly tag: "fixedAfterLevelOne" };

export type CharacterProgression = {
  readonly classUnitId: ClassUnitId;
  readonly classLevel: CharacterClassLevel;
  readonly hitPointAdvancement: HitPointAdvancementMethod;
};

export type CharacterProgressionIssue =
  | {
      readonly code: "invalidTotalCharacterLevel";
      readonly totalLevel: number;
    }
  | {
      readonly code: "invalidHitPointAdvancementForLevel";
      readonly classLevel: CharacterClassLevel;
      readonly hitPointAdvancement: HitPointAdvancementMethod;
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

export type AdvancementSelectionProgressionIssue =
  | CharacterProgressionIssue
  | ClassUnitNameIssue
  | {
      readonly code: "unsupportedMulticlassProgression";
    }
  | {
      readonly code: "unsupportedGroupedClassProgression";
      readonly classUnitId: ClassUnitId;
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

type ParsedAdvancementEntry = {
  readonly entry: CharacterAdvancementSelection["entries"][number];
  readonly classUnitId: ClassUnitId;
  readonly className: ClassName;
};

export function createCharacterProgression(input: {
  readonly classUnitId: ClassUnitId;
  readonly classLevel: CharacterClassLevel;
  readonly hitPointAdvancement: HitPointAdvancementMethod;
}): Either.Either<CharacterProgression, CharacterProgressionIssue> {
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === input.classLevel)) {
    return Either.left({
      code: "invalidTotalCharacterLevel",
      totalLevel: input.classLevel,
    });
  }

  if (
    (input.classLevel === 1 &&
      input.hitPointAdvancement.tag !== "levelOneMaximum") ||
    (input.classLevel > 1 &&
      input.hitPointAdvancement.tag !== "fixedAfterLevelOne")
  ) {
    return Either.left({
      code: "invalidHitPointAdvancementForLevel",
      classLevel: input.classLevel,
      hitPointAdvancement: input.hitPointAdvancement,
    });
  }

  return Either.right({
    classUnitId: input.classUnitId,
    classLevel: input.classLevel,
    hitPointAdvancement: input.hitPointAdvancement,
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
    ? Either.right(ClassUnitId(unit.id))
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

  const parsedEntries: ParsedAdvancementEntry[] = [];
  for (const entry of input.advancement.entries) {
    const classUnitId = classUnitIdFromUnitId({
      unitLibrary: input.unitLibrary,
      classUnitId: entry.classUnitId,
    });
    if (Either.isLeft(classUnitId)) {
      return Either.left(classUnitId.left);
    }

    const className = classUnitIdToClassName({
      unitLibrary: input.unitLibrary,
      classUnitId: entry.classUnitId,
    });
    if (Either.isLeft(className)) {
      return Either.left(className.left);
    }

    parsedEntries.push({
      entry,
      classUnitId: classUnitId.right,
      className: className.right,
    });
  }

  const firstEntry = parsedEntries[0];
  if (firstEntry.className !== startingClass.right) {
    return Either.left({
      code: "primaryClassMismatch",
      primaryClassUnitId: input.primaryClassUnitId,
      firstAdvancementClassName: firstEntry.className,
    });
  }

  const classUnitIds = new Set(
    parsedEntries.map((entry) => entry.entry.classUnitId),
  );
  if (classUnitIds.size > 1) {
    return Either.left({ code: "unsupportedMulticlassProgression" });
  }

  if (parsedEntries.length !== 1) {
    return Either.left({
      code: "unsupportedGroupedClassProgression",
      classUnitId: firstEntry.classUnitId,
    });
  }

  return createCharacterProgression({
    classUnitId: firstEntry.classUnitId,
    classLevel: firstEntry.entry.level,
    hitPointAdvancement: firstEntry.entry.hitPointAdvancement,
  });
}
