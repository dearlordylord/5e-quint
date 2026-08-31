import {
  ClassLevel,
  CharacterLevel,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { ClassName } from "@dnd/surface/surface/types";
import { Brand, Result } from "effect";

export type CharacterBattleClassLevelInit = {
  readonly className: ClassName;
  readonly level: number;
};

export type CharacterBattleClassLevel = {
  readonly className: ClassName;
  readonly level: ClassLevel;
};

export type CharacterBattleClassLevelInits =
  ReadonlyNonEmptyArray<CharacterBattleClassLevelInit>;

export type CharacterBattleClassLevels =
  ReadonlyNonEmptyArray<CharacterBattleClassLevel> &
    Brand.Brand<"CharacterBattleClassLevels">;
const CharacterBattleClassLevels = Brand.nominal<CharacterBattleClassLevels>();

export type CharacterBattleClassLevelsIssue = {
  readonly tag: "characterBattleClassLevelsIssue";
  readonly messages: ReadonlyNonEmptyArray<string>;
};

export function parseCharacterBattleClassLevels(
  classLevels: CharacterBattleClassLevelInits,
): Result.Result<CharacterBattleClassLevels, CharacterBattleClassLevelsIssue> {
  const messages: string[] = [];
  const seenClassNames = new Set<ClassName>();
  for (const classLevel of classLevels) {
    const duplicateClass = seenClassNames.has(classLevel.className);
    seenClassNames.add(classLevel.className);
    if (duplicateClass) {
      messages.push(
        `Character class levels duplicate ${classLevel.className}.`,
      );
    }
    if (
      !Number.isInteger(classLevel.level) ||
      classLevel.level < 1 ||
      classLevel.level > 20
    ) {
      messages.push(
        `${classLevel.className} class level must be an integer from 1 to 20.`,
      );
    }
  }
  if (
    messages.length === 0 &&
    classLevels.reduce((total, classLevel) => total + classLevel.level, 0) > 20
  ) {
    messages.push("Total character level must not exceed 20.");
  }
  if (isNonEmptyReadonlyArray(messages)) {
    return Result.fail({
      tag: "characterBattleClassLevelsIssue",
      messages,
    });
  }
  const [firstClassLevel, ...remainingClassLevels] = classLevels;
  return Result.succeed(
    CharacterBattleClassLevels([
      {
        className: firstClassLevel.className,
        level: ClassLevel.make(firstClassLevel.level),
      },
      ...remainingClassLevels.map((classLevel) => ({
        className: classLevel.className,
        level: ClassLevel.make(classLevel.level),
      })),
    ]),
  );
}

function isNonEmptyReadonlyArray<T>(
  values: readonly T[],
): values is ReadonlyNonEmptyArray<T> {
  return values.length > 0;
}

export function characterBattleLevel(
  classLevels: CharacterBattleClassLevels,
): CharacterLevel {
  return CharacterLevel.make(
    classLevels.reduce(
      (total, classLevel) => total + Number(classLevel.level),
      0,
    ),
  );
}
