import { Brand, Either, Match } from "effect";
import {
  CHARACTER_CLASS_LEVELS,
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

export type CharacterLevelHitPointRule =
  | {
      readonly classLevel: LevelOneCharacterClassLevel;
      readonly hitPointRule: LevelOneClassHitPointRule;
    }
  | {
      readonly classLevel: PostLevelOneCharacterClassLevel;
      readonly hitPointRule: FixedHigherLevelClassHitPointRule;
    };

export type CharacterProgression = {
  readonly classUnitId: ClassUnitId;
} & CharacterLevelHitPointRule;

export type CharacterProgressionLevelIssue =
  | {
      readonly code: "invalidCharacterClassLevel";
      readonly classLevel: number;
    }
  | {
      readonly code: "invalidHitPointRuleForLevel";
      readonly classLevel: CharacterClassLevel;
      readonly hitPointRule: ClassHitPointRule;
    };

export function characterLevelHitPointRule(input: {
  readonly classLevel: CharacterClassLevel;
  readonly hitPointRule: ClassHitPointRule;
}): Either.Either<CharacterLevelHitPointRule, CharacterProgressionLevelIssue> {
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === input.classLevel)) {
    return Either.left({
      code: "invalidCharacterClassLevel",
      classLevel: input.classLevel,
    });
  }

  return Match.value(input.hitPointRule).pipe(
    Match.when({ tag: "levelOneMaximumHitDie" }, (hitPointRule) =>
      input.classLevel === 1
        ? Either.right({
            classLevel: LevelOneCharacterClassLevel(input.classLevel),
            hitPointRule,
          })
        : Either.left({
            code: "invalidHitPointRuleForLevel" as const,
            classLevel: input.classLevel,
            hitPointRule,
          }),
    ),
    Match.when({ tag: "fixedHigherLevelGain" }, (hitPointRule) =>
      input.classLevel > 1
        ? Either.right({
            classLevel: PostLevelOneCharacterClassLevel(input.classLevel),
            hitPointRule,
          })
        : Either.left({
            code: "invalidHitPointRuleForLevel" as const,
            classLevel: input.classLevel,
            hitPointRule,
          }),
    ),
    Match.exhaustive,
  );
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
  return Match.value(progression).pipe(
    Match.when({ hitPointRule: { tag: "levelOneMaximumHitDie" } }, () => 0),
    Match.when(
      { hitPointRule: { tag: "fixedHigherLevelGain" } },
      (fixedProgression) => fixedProgression.classLevel - 1,
    ),
    Match.exhaustive,
  );
}
