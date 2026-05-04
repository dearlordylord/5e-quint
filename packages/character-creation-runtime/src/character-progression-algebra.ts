import { Either } from "effect";
import {
  CLASS_NAMES,
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

export type PostStartAdvancementLevelAbsent = {
  readonly tag: "postStartAdvancementAbsent";
  readonly postStartAdvancementIndex: number;
};
export type PostStartAdvancementLevelResult = Either.Either<
  CharacterClassLevel,
  PostStartAdvancementLevelAbsent
>;

export type AdvancementSelectionProgressionInput = {
  readonly unitLibrary: UnitCatalog;
  readonly primaryClassUnitId: UnitRecord["id"];
  readonly advancement: CharacterAdvancementSelection;
};

export function createCharacterProgression(input: {
  readonly startingClass: ClassName;
  readonly advancements: readonly ClassName[];
}): CharacterProgression {
  const advancements = [...input.advancements];
  characterClassLevel(1 + advancements.length);

  return {
    startingClass: input.startingClass,
    advancements,
  };
}

export function computeTotalLevel(
  progression: CharacterProgression,
): CharacterClassLevel {
  return characterClassLevel(orderedProgressionClasses(progression).length);
}

export function postStartAdvancementLevel(
  progression: CharacterProgression,
  postStartAdvancementIndex: number,
): PostStartAdvancementLevelResult {
  if (
    !Number.isInteger(postStartAdvancementIndex) ||
    postStartAdvancementIndex < 0 ||
    postStartAdvancementIndex >= progression.advancements.length
  ) {
    return Either.left({
      tag: "postStartAdvancementAbsent",
      postStartAdvancementIndex,
    });
  }

  return Either.right(characterClassLevel(postStartAdvancementIndex + 2));
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

export function classNameFromClassUnit(unit: UnitRecord): ClassName {
  if (unit.kind !== "class") {
    throw new Error(`Expected class Unit, got ${unit.kind}: ${unit.id}`);
  }

  return unit.className;
}

export function classUnitIdToClassName(input: {
  readonly unitLibrary: UnitCatalog;
  readonly classUnitId: UnitRecord["id"];
}): ClassName {
  return classNameFromClassUnit(input.unitLibrary.requireUnit(input.classUnitId));
}

export function characterProgressionFromUnitIds(
  input: CharacterProgressionUnitIdInput,
): CharacterProgression {
  return createCharacterProgression({
    startingClass: classUnitIdToClassName({
      unitLibrary: input.unitLibrary,
      classUnitId: input.startingClassUnitId,
    }),
    advancements: input.postStartAdvancementClassUnitIds.map((classUnitId) =>
      classUnitIdToClassName({ unitLibrary: input.unitLibrary, classUnitId }),
    ),
  });
}

export function characterProgressionFromAdvancementSelection(
  input: AdvancementSelectionProgressionInput,
): CharacterProgression {
  const startingClass = classUnitIdToClassName({
    unitLibrary: input.unitLibrary,
    classUnitId: input.primaryClassUnitId,
  });
  const expandedClasses = input.advancement.entries.flatMap((entry) =>
    Array.from({ length: entry.level }, () =>
      classUnitIdToClassName({
        unitLibrary: input.unitLibrary,
        classUnitId: entry.classUnitId,
      }),
    ),
  );

  if (expandedClasses[0] !== startingClass) {
    throw new Error(
      `Advancement selection must begin with the primary class: ${input.primaryClassUnitId}`,
    );
  }

  return createCharacterProgression({
    startingClass,
    advancements: expandedClasses.slice(1),
  });
}
