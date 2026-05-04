import { Brand, Either, Match } from "effect";
import {
  CHARACTER_CLASS_LEVELS,
  characterClassLevel,
  type CharacterClassLevel,
} from "@dnd/shared/game-facts";
import type { UnitRecord } from "@dnd/surface/surface/types";

export type ClassUnitId = UnitRecord["id"] & Brand.Brand<"ClassUnitId">;
const ClassUnitId = Brand.nominal<ClassUnitId>();

export const classUnitId: (value: UnitRecord["id"]) => ClassUnitId =
  ClassUnitId;

export type LevelOneCharacterClassLevel = CharacterClassLevel &
  Brand.Brand<"LevelOneCharacterClassLevel">;
const LevelOneCharacterClassLevel =
  Brand.nominal<LevelOneCharacterClassLevel>();

export type PostLevelOneCharacterClassLevel = CharacterClassLevel &
  Brand.Brand<"PostLevelOneCharacterClassLevel">;
const PostLevelOneCharacterClassLevel =
  Brand.nominal<PostLevelOneCharacterClassLevel>();

export type LevelOneClassHitPointRule = {
  readonly tag: "levelOneMaximumHitDie";
};

export type FixedHigherLevelClassHitPointRule = {
  readonly tag: "fixedHigherLevelGain";
};

export type ClassHitPointRule =
  | LevelOneClassHitPointRule
  | FixedHigherLevelClassHitPointRule;

export type CharacterTotalLevelHitPointRule =
  | {
      readonly totalLevel: LevelOneCharacterClassLevel;
      readonly hitPointRule: LevelOneClassHitPointRule;
    }
  | {
      readonly totalLevel: PostLevelOneCharacterClassLevel;
      readonly hitPointRule: FixedHigherLevelClassHitPointRule;
    };

export type CharacterProgressionEntry = {
  readonly classUnitId: ClassUnitId;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
};

export type CharacterProgression = {
  readonly startingClass: ClassUnitId;
  readonly advancements: readonly CharacterProgressionEntry[];
};

export type CharacterProgressionClassLevel = {
  readonly classUnitId: ClassUnitId;
  readonly classLevel: CharacterClassLevel;
};

export type CharacterProgressionLevelIssue =
  | {
      readonly code: "invalidCharacterClassLevel";
      readonly classLevel: number;
    }
  | {
      readonly code: "invalidHitPointRuleForLevel";
      readonly totalLevel: CharacterClassLevel;
      readonly hitPointRule: ClassHitPointRule;
    };

export function characterTotalLevelHitPointRule(input: {
  readonly totalLevel: CharacterClassLevel;
  readonly hitPointRule: ClassHitPointRule;
}): Either.Either<
  CharacterTotalLevelHitPointRule,
  CharacterProgressionLevelIssue
> {
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === input.totalLevel)) {
    return Either.left({
      code: "invalidCharacterClassLevel",
      classLevel: input.totalLevel,
    });
  }

  return Match.value(input.hitPointRule).pipe(
    Match.when({ tag: "levelOneMaximumHitDie" }, (hitPointRule) =>
      input.totalLevel === 1
        ? Either.right({
            totalLevel: LevelOneCharacterClassLevel(input.totalLevel),
            hitPointRule,
          })
        : Either.left({
            code: "invalidHitPointRuleForLevel" as const,
            totalLevel: input.totalLevel,
            hitPointRule,
          }),
    ),
    Match.when({ tag: "fixedHigherLevelGain" }, (hitPointRule) =>
      input.totalLevel > 1
        ? Either.right({
            totalLevel: PostLevelOneCharacterClassLevel(input.totalLevel),
            hitPointRule,
          })
        : Either.left({
            code: "invalidHitPointRuleForLevel" as const,
            totalLevel: input.totalLevel,
            hitPointRule,
          }),
    ),
    Match.exhaustive,
  );
}

export function characterProgressionEntry(input: {
  readonly classUnitId: ClassUnitId;
  readonly characterLevel: CharacterClassLevel;
  readonly hitPointRule: FixedHigherLevelClassHitPointRule;
}): Either.Either<CharacterProgressionEntry, CharacterProgressionLevelIssue> {
  const levelRule = characterTotalLevelHitPointRule({
    totalLevel: input.characterLevel,
    hitPointRule: input.hitPointRule,
  });

  return Either.isLeft(levelRule)
    ? Either.left(levelRule.left)
    : Either.right({
        classUnitId: input.classUnitId,
        hitPointRule: input.hitPointRule,
      });
}

export function hitPointRuleOptionSuffix(
  rule: ClassHitPointRule,
): "maximum_hit_die" | "fixed_hp_gain" {
  return Match.value(rule).pipe(
    Match.when(
      { tag: "levelOneMaximumHitDie" },
      () => "maximum_hit_die" as const,
    ),
    Match.when({ tag: "fixedHigherLevelGain" }, () => "fixed_hp_gain" as const),
    Match.exhaustive,
  );
}

export function hitPointRuleLabel(
  rule: ClassHitPointRule,
): "Level 1 maximum Hit Die" | "Fixed higher-level HP gain" {
  return Match.value(rule).pipe(
    Match.when(
      { tag: "levelOneMaximumHitDie" },
      () => "Level 1 maximum Hit Die" as const,
    ),
    Match.when(
      { tag: "fixedHigherLevelGain" },
      () => "Fixed higher-level HP gain" as const,
    ),
    Match.exhaustive,
  );
}

export function hitPointsAfterLevelOneMultiplier(
  progression: CharacterProgression,
): number {
  return progression.advancements.filter(
    (entry) => entry.hitPointRule.tag === "fixedHigherLevelGain",
  ).length;
}

export function computeTotalLevel(
  progression: CharacterProgression,
): CharacterClassLevel {
  return characterClassLevel(1 + progression.advancements.length);
}

export function startingClassUnitId(
  progression: CharacterProgression,
): ClassUnitId {
  return progression.startingClass;
}

export function finalAdvancementEntry(
  progression: CharacterProgression,
): CharacterProgressionEntry | undefined {
  return progression.advancements.at(-1);
}

export function classLevelForUnit(
  progression: CharacterProgression,
  classUnitId: UnitRecord["id"],
): number {
  return (
    (progression.startingClass === classUnitId ? 1 : 0) +
    progression.advancements.filter(
      (entry) => entry.classUnitId === classUnitId,
    ).length
  );
}

export function progressionClassUnitIds(
  progression: CharacterProgression,
): readonly ClassUnitId[] {
  return [
    ...new Set([
      progression.startingClass,
      ...progression.advancements.map((entry) => entry.classUnitId),
    ]),
  ];
}

export function progressionClassLevels(
  progression: CharacterProgression,
): readonly CharacterProgressionClassLevel[] {
  return progressionClassUnitIds(progression).map((unitId) => ({
    classUnitId: unitId,
    classLevel: characterClassLevel(classLevelForUnit(progression, unitId)),
  }));
}
