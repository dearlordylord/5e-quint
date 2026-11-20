import { Brand, Match, Option, Result, Schema } from "effect";
import {
  CHARACTER_CLASS_LEVELS,
  characterClassLevel,
  type CharacterClassLevel,
} from "@dnd/shared/game-facts";
import {
  DieRollResultSchema,
  type DieRollResult,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
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

export const FixedHigherLevelClassHitPointRuleSchema = Schema.Struct({
  tag: Schema.Literal("fixedHigherLevelGain"),
});

export const RolledHigherLevelClassHitPointRuleSchema = Schema.Struct({
  tag: Schema.Literal("rolledHigherLevelGain"),
  hitDieResult: DieRollResultSchema,
});

export const HigherLevelClassHitPointRuleSchema = Schema.Union([
  FixedHigherLevelClassHitPointRuleSchema,
  RolledHigherLevelClassHitPointRuleSchema,
]);

export type FixedHigherLevelClassHitPointRule =
  typeof FixedHigherLevelClassHitPointRuleSchema.Type;

/** The class's Hit Die as the player rolled it for a level after 1. */
export type RolledHigherLevelClassHitPointRule =
  typeof RolledHigherLevelClassHitPointRuleSchema.Type;

export type HigherLevelClassHitPointRule =
  typeof HigherLevelClassHitPointRuleSchema.Type;

export type ClassHitPointRule =
  | LevelOneClassHitPointRule
  | HigherLevelClassHitPointRule;

export type CharacterTotalLevelHitPointRule =
  | {
      readonly totalLevel: LevelOneCharacterClassLevel;
      readonly hitPointRule: LevelOneClassHitPointRule;
    }
  | {
      readonly totalLevel: PostLevelOneCharacterClassLevel;
      readonly hitPointRule: HigherLevelClassHitPointRule;
    };

export type CharacterProgressionEntry = {
  readonly classUnitId: ClassUnitId;
  readonly hitPointRule: HigherLevelClassHitPointRule;
};

export type CharacterProgression = {
  readonly startingClass: ClassUnitId;
  readonly advancements: readonly CharacterProgressionEntry[];
};

/** Decodes the Constitution modifier a level records: a whole number. */
export const ConstitutionModifierAtGainSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
);

/**
 * A level after 1 as a built character records it: its Hit Point rule and the
 * Constitution modifier the character had when gaining it, before that level's
 * own score increases. A later increase adds 1 per level from that modifier.
 */
export type CharacterBuildProgressionEntry = CharacterProgressionEntry & {
  readonly constitutionModifierAtGain: number;
};

/** A built character's class levels, each recording its gain's Constitution modifier. */
export type CharacterBuildProgression = {
  readonly startingClass: ClassUnitId;
  readonly advancements: readonly CharacterBuildProgressionEntry[];
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
}): Result.Result<
  CharacterTotalLevelHitPointRule,
  CharacterProgressionLevelIssue
> {
  return Match.value(input.hitPointRule).pipe(
    Match.when({ tag: "levelOneMaximumHitDie" }, (hitPointRule) =>
      input.totalLevel === 1
        ? Result.succeed({
            totalLevel: LevelOneCharacterClassLevel(input.totalLevel),
            hitPointRule,
          })
        : Result.fail({
            code: "invalidHitPointRuleForLevel" as const,
            totalLevel: input.totalLevel,
            hitPointRule,
          }),
    ),
    Match.whenOr(
      { tag: "fixedHigherLevelGain" },
      { tag: "rolledHigherLevelGain" },
      (hitPointRule) =>
        input.totalLevel > 1
          ? Result.succeed({
              totalLevel: PostLevelOneCharacterClassLevel(input.totalLevel),
              hitPointRule,
            })
          : Result.fail({
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
  readonly hitPointRule: HigherLevelClassHitPointRule;
}): Result.Result<CharacterProgressionEntry, CharacterProgressionLevelIssue> {
  const levelRule = characterTotalLevelHitPointRule({
    totalLevel: input.characterLevel,
    hitPointRule: input.hitPointRule,
  });

  return Result.isFailure(levelRule)
    ? Result.fail(levelRule.failure)
    : Result.succeed({
        classUnitId: input.classUnitId,
        hitPointRule: input.hitPointRule,
      });
}

export function characterProgressionWithClassLevelGain(input: {
  readonly progression: CharacterBuildProgression;
  readonly classUnitId: ClassUnitId;
  readonly hitPointRule: HigherLevelClassHitPointRule;
  readonly constitutionModifierAtGain: number;
}): Result.Result<CharacterBuildProgression, CharacterProgressionLevelIssue> {
  const nextCharacterLevel = 2 + input.progression.advancements.length;
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === nextCharacterLevel)) {
    return Result.fail({
      code: "invalidCharacterClassLevel",
      classLevel: nextCharacterLevel,
    });
  }

  const entry = characterProgressionEntry({
    classUnitId: input.classUnitId,
    characterLevel: characterClassLevel(nextCharacterLevel),
    hitPointRule: input.hitPointRule,
  });
  /* v8 ignore start -- @preserve -- The consecutive level and higher-level Hit Point rule satisfy this narrowed constructor. */
  if (Result.isFailure(entry)) return Result.fail(entry.failure);
  /* v8 ignore stop -- @preserve */

  return Result.succeed({
    startingClass: input.progression.startingClass,
    advancements: [
      ...input.progression.advancements,
      {
        ...entry.success,
        constitutionModifierAtGain: input.constitutionModifierAtGain,
      },
    ],
  });
}

export function hitPointRuleOptionSuffix(
  rule: ClassHitPointRule,
): "maximum_hit_die" | "fixed_hp_gain" | "rolled_hp_gain" {
  return Match.value(rule).pipe(
    Match.when(
      { tag: "levelOneMaximumHitDie" },
      () => "maximum_hit_die" as const,
    ),
    Match.when({ tag: "fixedHigherLevelGain" }, () => "fixed_hp_gain" as const),
    Match.when(
      { tag: "rolledHigherLevelGain" },
      () => "rolled_hp_gain" as const,
    ),
    Match.exhaustive,
  );
}

export function hitPointRuleLabel(
  rule: ClassHitPointRule,
):
  | "Level 1 Hit Point maximum"
  | "Fixed higher-level HP gain"
  | "Rolled higher-level HP gain" {
  return Match.value(rule).pipe(
    Match.when(
      { tag: "levelOneMaximumHitDie" },
      () => "Level 1 Hit Point maximum" as const,
    ),
    Match.when(
      { tag: "fixedHigherLevelGain" },
      () => "Fixed higher-level HP gain" as const,
    ),
    Match.when(
      { tag: "rolledHigherLevelGain" },
      () => "Rolled higher-level HP gain" as const,
    ),
    Match.exhaustive,
  );
}

/** A level's rolled Hit Die result that is above the class's Hit Die. */
export type RolledHitDieResultAboveHitDie = {
  readonly classUnitId: UnitRecord["id"];
  readonly hitDieResult: DieRollResult;
  readonly hitDieSize: number;
};

/**
 * The roll a level's Hit Point rule records, when it is above the class's Hit
 * Die. A fixed gain records no roll.
 */
export function rolledHitDieResultAboveHitDie(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly hitPointRule: HigherLevelClassHitPointRule;
  readonly hitPointDie: number;
}): Option.Option<RolledHitDieResultAboveHitDie> {
  return Match.value(input.hitPointRule).pipe(
    Match.when({ tag: "fixedHigherLevelGain" }, () => Option.none()),
    Match.when({ tag: "rolledHigherLevelGain" }, ({ hitDieResult }) =>
      hitDieResult > input.hitPointDie
        ? Option.some({
            classUnitId: input.classUnitId,
            hitDieResult,
            hitDieSize: input.hitPointDie,
          })
        : Option.none(),
    ),
    Match.exhaustive,
  );
}

export function rolledHitDieResultAboveHitDieMessage(
  issue: RolledHitDieResultAboveHitDie,
): string {
  return `Rolled Hit Die result ${issue.hitDieResult} exceeds the d${issue.hitDieSize} Hit Die of class ${issue.classUnitId}.`;
}

/**
 * A level that records a higher Constitution modifier than the character has
 * now. A built character's scores only rise, so a stored sheet or direct input
 * that lowers Constitution afterwards has no Level Advancement reading.
 */
export type ConstitutionModifierAtGainAboveCurrent = {
  readonly characterLevel: CharacterClassLevel;
  readonly constitutionModifierAtGain: number;
  readonly constitutionModifier: number;
};

/** The levels that record a higher Constitution modifier than the current one. */
export function constitutionModifiersAtGainAboveCurrent(
  progression: CharacterBuildProgression,
  constitutionModifier: number,
): readonly ConstitutionModifierAtGainAboveCurrent[] {
  return progression.advancements.flatMap(
    ({ constitutionModifierAtGain }, index) =>
      constitutionModifierAtGain > constitutionModifier
        ? [
            {
              characterLevel: computeTotalLevel({
                ...progression,
                advancements: progression.advancements.slice(0, index + 1),
              }),
              constitutionModifierAtGain,
              constitutionModifier,
            },
          ]
        : [],
  );
}

export function constitutionModifierAtGainAboveCurrentMessage(
  issue: ConstitutionModifierAtGainAboveCurrent,
): string {
  return `Character level ${issue.characterLevel} records Constitution modifier ${issue.constitutionModifierAtGain}, above the current ${issue.constitutionModifier}.`;
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
): ReadonlyNonEmptyArray<ClassUnitId> {
  const additionalClassUnitIds = [
    ...new Set(progression.advancements.map((entry) => entry.classUnitId)),
  ].filter((classUnitId) => classUnitId !== progression.startingClass);
  return [progression.startingClass, ...additionalClassUnitIds];
}

export function progressionClassLevels(
  progression: CharacterProgression,
): ReadonlyNonEmptyArray<CharacterProgressionClassLevel> {
  const [firstClassUnitId, ...remainingClassUnitIds] =
    progressionClassUnitIds(progression);
  const classLevelFor = (
    classUnitId: ClassUnitId,
  ): CharacterProgressionClassLevel => ({
    classUnitId,
    classLevel: characterClassLevel(
      classLevelForUnit(progression, classUnitId),
    ),
  });
  return [
    classLevelFor(firstClassUnitId),
    ...remainingClassUnitIds.map(classLevelFor),
  ];
}
