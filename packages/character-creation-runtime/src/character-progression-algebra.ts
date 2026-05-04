import { Either, Option } from "effect";
import type { CharacterClassLevel, ClassName } from "@dnd/shared/game-facts";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";

import type { CharacterAdvancementSelection } from "./types.ts";
import {
  characterLevelHitPointAdvancement,
  classUnitId,
  type CharacterProgression,
  type CharacterProgressionLevelIssue,
  type ClassUnitId,
  type HitPointAdvancementMethod,
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
  const advancement = characterLevelHitPointAdvancement(input);
  if (Either.isLeft(advancement)) {
    return Either.left(advancement.left);
  }

  return Either.right({
    classUnitId: input.classUnitId,
    ...advancement.right,
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

export function characterProgressionFromAdvancementSelection(
  input: AdvancementSelectionProgressionInput,
): Either.Either<CharacterProgression, AdvancementSelectionProgressionIssue> {
  const startingClassUnitId = classUnitIdFromUnitId({
    unitLibrary: input.unitLibrary,
    classUnitId: input.primaryClassUnitId,
  });

  if (Either.isLeft(startingClassUnitId)) {
    return Either.left(startingClassUnitId.left);
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
  if (firstEntry.classUnitId !== startingClassUnitId.right) {
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
    classLevel: firstEntry.entry.classLevel,
    hitPointAdvancement: firstEntry.entry.hitPointAdvancement,
  });
}
