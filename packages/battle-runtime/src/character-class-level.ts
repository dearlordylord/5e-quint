import {
  ClassLevel,
  CharacterLevel,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { ClassName } from "@dnd/surface/surface/types";
import { Brand, Either } from "effect";

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
): Either.Either<CharacterBattleClassLevels, CharacterBattleClassLevelsIssue> {
  const messages: string[] = [];
  const seenClassNames = new Set<ClassName>();
  const parsed: CharacterBattleClassLevel[] = [];
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
      continue;
    }
    if (duplicateClass) continue;
    parsed.push({
      className: classLevel.className,
      level: ClassLevel.make(classLevel.level),
    });
  }
  if (
    messages.length === 0 &&
    parsed.reduce((total, classLevel) => total + Number(classLevel.level), 0) >
      20
  ) {
    messages.push("Total character level must not exceed 20.");
  }
  const [firstParsedClassLevel, ...remainingParsedClassLevels] = parsed;
  if (messages.length > 0 || firstParsedClassLevel === undefined) {
    const nonemptyMessages: ReadonlyNonEmptyArray<string> = [
      messages[0] ??
        "Character battle class levels require at least one entry.",
      ...messages.slice(1),
    ];
    return Either.left({
      tag: "characterBattleClassLevelsIssue",
      messages: nonemptyMessages,
    });
  }
  return Either.right(
    CharacterBattleClassLevels([
      firstParsedClassLevel,
      ...remainingParsedClassLevels,
    ]),
  );
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
