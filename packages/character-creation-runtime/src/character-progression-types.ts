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

export type LevelOneHitPointAdvancement = {
  readonly tag: "levelOneMaximum";
};

export type FixedAfterLevelOneHitPointAdvancement = {
  readonly tag: "fixedAfterLevelOne";
};

export type HitPointAdvancementMethod =
  | LevelOneHitPointAdvancement
  | FixedAfterLevelOneHitPointAdvancement;

export type CharacterLevelHitPointAdvancement =
  | {
      readonly classLevel: LevelOneCharacterClassLevel;
      readonly hitPointAdvancement: LevelOneHitPointAdvancement;
    }
  | {
      readonly classLevel: PostLevelOneCharacterClassLevel;
      readonly hitPointAdvancement: FixedAfterLevelOneHitPointAdvancement;
    };

export type CharacterProgression = {
  readonly classUnitId: ClassUnitId;
} & CharacterLevelHitPointAdvancement;

export type CharacterProgressionLevelIssue =
  | {
      readonly code: "invalidCharacterClassLevel";
      readonly classLevel: number;
    }
  | {
      readonly code: "invalidHitPointAdvancementForLevel";
      readonly classLevel: CharacterClassLevel;
      readonly hitPointAdvancement: HitPointAdvancementMethod;
    };

export function characterLevelHitPointAdvancement(input: {
  readonly classLevel: CharacterClassLevel;
  readonly hitPointAdvancement: HitPointAdvancementMethod;
}): Either.Either<
  CharacterLevelHitPointAdvancement,
  CharacterProgressionLevelIssue
> {
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === input.classLevel)) {
    return Either.left({
      code: "invalidCharacterClassLevel",
      classLevel: input.classLevel,
    });
  }

  return Match.value(input.hitPointAdvancement).pipe(
    Match.when({ tag: "levelOneMaximum" }, (hitPointAdvancement) =>
      input.classLevel === 1
        ? Either.right({
            classLevel: LevelOneCharacterClassLevel(input.classLevel),
            hitPointAdvancement,
          })
        : Either.left({
            code: "invalidHitPointAdvancementForLevel" as const,
            classLevel: input.classLevel,
            hitPointAdvancement,
          }),
    ),
    Match.when({ tag: "fixedAfterLevelOne" }, (hitPointAdvancement) =>
      input.classLevel > 1
        ? Either.right({
            classLevel: PostLevelOneCharacterClassLevel(input.classLevel),
            hitPointAdvancement,
          })
        : Either.left({
            code: "invalidHitPointAdvancementForLevel" as const,
            classLevel: input.classLevel,
            hitPointAdvancement,
          }),
    ),
    Match.exhaustive,
  );
}

export function hitPointAdvancementOptionSuffix(
  advancement: HitPointAdvancementMethod,
): "hit_point_maximum" | "fixed_hit_points" {
  return Match.value(advancement).pipe(
    Match.when({ tag: "levelOneMaximum" }, () => "hit_point_maximum" as const),
    Match.when(
      { tag: "fixedAfterLevelOne" },
      () => "fixed_hit_points" as const,
    ),
    Match.exhaustive,
  );
}

export function hitPointAdvancementLabel(
  advancement: HitPointAdvancementMethod,
): "Hit Point Maximum" | "Fixed Hit Points" {
  return Match.value(advancement).pipe(
    Match.when({ tag: "levelOneMaximum" }, () => "Hit Point Maximum" as const),
    Match.when(
      { tag: "fixedAfterLevelOne" },
      () => "Fixed Hit Points" as const,
    ),
    Match.exhaustive,
  );
}

export function hitPointsAfterLevelOneMultiplier(
  progression: CharacterProgression,
): number {
  return Match.value(progression).pipe(
    Match.when({ hitPointAdvancement: { tag: "levelOneMaximum" } }, () => 0),
    Match.when(
      { hitPointAdvancement: { tag: "fixedAfterLevelOne" } },
      (fixedProgression) => fixedProgression.classLevel - 1,
    ),
    Match.exhaustive,
  );
}
