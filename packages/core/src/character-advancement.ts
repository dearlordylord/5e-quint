import type { CharacterAbilityScores } from "#/character-ability-scores.ts";
import {
  SRD_SUBCLASSES,
  type CharacterAdvancementEntry,
  type CharacterAdvancementFeatSelection,
  type CharacterSubclassSelection,
} from "#/character-feature-types.ts";
import {
  CLASS_NAMES,
  meetsMulticlassPrereq,
  type ClassName,
} from "#/features/class-tables.ts";
import type {
  CharacterClassLevels,
  CharacterDraft,
  CharacterFinalizationIssue,
  CharacterSheet,
} from "#/character-domain.ts";
import type { Ability } from "#/types.ts";

export type CharacterAdvancement = ReadonlyArray<CharacterAdvancementEntry>;

type MutableCharacterAbilityScores = Record<Ability, number>;

const ZERO_CLASS_LEVELS = Object.fromEntries(
  CLASS_NAMES.map((className) => [className, 0]),
) as CharacterClassLevels;

const BASE_FEAT_LEVELS = new Set([4, 8, 12, 16]);
const EXTRA_FEAT_LEVELS: Readonly<
  Partial<Record<ClassName, ReadonlySet<number>>>
> = {
  fighter: new Set([6, 14]),
  rogue: new Set([10]),
};
const EPIC_BOON_LEVEL = 19;
const SUBCLASS_LEVEL = 3;
const EPIC_BOON_FEAT_IDS: ReadonlySet<string> = new Set([
  "boon_of_combat_prowess",
  "boon_of_dimensional_travel",
  "boon_of_fate",
  "boon_of_irresistible_offense",
  "boon_of_spell_recall",
  "boon_of_the_night_spirit",
  "boon_of_truesight",
]);

function normalizeClassLevels(
  partial: Partial<Record<ClassName, number>>,
): CharacterClassLevels {
  return {
    ...ZERO_CLASS_LEVELS,
    ...partial,
  };
}

function totalClassLevels(
  classLevels: Readonly<Record<ClassName, number>>,
): number {
  return CLASS_NAMES.reduce(
    (total, className) => total + classLevels[className],
    0,
  );
}

function classGainsFeatChoice(
  className: ClassName,
  classLevel: number,
): boolean {
  return (
    BASE_FEAT_LEVELS.has(classLevel) ||
    EXTRA_FEAT_LEVELS[className]?.has(classLevel) === true
  );
}

function cloneAbilityScores(
  scores: CharacterAbilityScores,
): MutableCharacterAbilityScores {
  return { ...scores };
}

function applyScoreIncrease(params: {
  readonly scores: MutableCharacterAbilityScores;
  readonly ability: Ability;
  readonly amount: number;
  readonly max: number;
  readonly issues: CharacterFinalizationIssue[];
}): void {
  const nextScore = params.scores[params.ability] + params.amount;
  if (nextScore > params.max) {
    params.issues.push({
      code:
        params.max === 30
          ? "abilityScoreIncreaseExceedsThirty"
          : "abilityScoreIncreaseExceedsTwenty",
      message: `Ability score increases cannot raise ${params.ability} above ${params.max}.`,
    });
  }
  params.scores[params.ability] = Math.min(nextScore, params.max);
}

function applyAdvancementChoice(
  scores: CharacterAbilityScores,
  featSelection: CharacterAdvancementFeatSelection,
): {
  readonly abilityScores: CharacterAbilityScores;
  readonly issues: ReadonlyArray<CharacterFinalizationIssue>;
} {
  const nextScores = cloneAbilityScores(scores);
  const issues: CharacterFinalizationIssue[] = [];
  const { choice } = featSelection;

  if (choice.tag === "abilityScoreImprovement") {
    if (choice.abilities.length < 1 || choice.abilities.length > 2) {
      issues.push({
        code: "invalidAdvancementChoice",
        message:
          "Ability Score Improvement choices must increase one ability by 2 or two abilities by 1.",
      });
      return { abilityScores: nextScores, issues };
    }

    if (choice.abilities.length === 1) {
      applyScoreIncrease({
        scores: nextScores,
        ability: choice.abilities[0],
        amount: 2,
        max: 20,
        issues,
      });
      return { abilityScores: nextScores, issues };
    }

    for (const ability of choice.abilities) {
      applyScoreIncrease({
        scores: nextScores,
        ability,
        amount: 1,
        max: 20,
        issues,
      });
    }
    return { abilityScores: nextScores, issues };
  }

  if (choice.abilityScoreIncrease != null) {
    applyScoreIncrease({
      scores: nextScores,
      ability: choice.abilityScoreIncrease,
      amount: 1,
      max: choice.tag === "epicBoon" ? 30 : 20,
      issues,
    });
  }

  return { abilityScores: nextScores, issues };
}

export function advancementToClassLevels(
  advancement: CharacterAdvancement,
): CharacterClassLevels {
  const classLevels = { ...ZERO_CLASS_LEVELS };
  for (const entry of advancement) {
    classLevels[entry.className] += 1;
  }
  return classLevels;
}

export function sheetClassLevels(
  sheet: Pick<CharacterSheet, "advancement">,
): CharacterClassLevels {
  return advancementToClassLevels(sheet.advancement);
}

export function cloneAdvancement(
  advancement: CharacterAdvancement,
): CharacterAdvancement {
  return advancement.map((entry) => ({
    className: entry.className,
    ...(entry.subclass == null ? {} : { subclass: { ...entry.subclass } }),
    ...(entry.feat == null
      ? {}
      : {
          feat: {
            slot: entry.feat.slot,
            choice:
              entry.feat.choice.tag === "abilityScoreImprovement"
                ? {
                    tag: "abilityScoreImprovement",
                    abilities:
                      entry.feat.choice.abilities.length === 1
                        ? ([entry.feat.choice.abilities[0]] as const)
                        : ([
                            entry.feat.choice.abilities[0],
                            entry.feat.choice.abilities[1],
                          ] as const),
                  }
                : {
                    ...entry.feat.choice,
                    ...(entry.feat.choice.proficiencies == null
                      ? {}
                      : {
                          proficiencies: [...entry.feat.choice.proficiencies],
                        }),
                  },
          },
        }),
  }));
}

export function singleClassAdvancement(
  className: ClassName,
  level: number,
): CharacterAdvancement {
  return Array.from({ length: level }, () => ({ className }));
}

export function characterSubclassSelections(
  sheet: Pick<CharacterSheet, "advancement">,
): ReadonlyArray<CharacterSubclassSelection> {
  return sheet.advancement.flatMap((entry) =>
    entry.subclass == null ? [] : [entry.subclass],
  );
}

function levelOneAdvancementFromLegacyDraft(
  draft: CharacterDraft,
): CharacterAdvancement | undefined {
  if (draft.primaryClass == null || draft.classLevels == null) return undefined;
  const classLevels = normalizeClassLevels(draft.classLevels);
  if (
    totalClassLevels(classLevels) === 1 &&
    classLevels[draft.primaryClass] === 1
  ) {
    return [{ className: draft.primaryClass }];
  }
  return undefined;
}

export function validateAndReplayAdvancement(
  draft: CharacterDraft,
  baseAbilityScores: CharacterAbilityScores,
): {
  readonly advancement?: CharacterAdvancement;
  readonly abilityScores: CharacterAbilityScores;
  readonly classLevels: CharacterClassLevels;
  readonly primaryClass?: ClassName;
  readonly issues: ReadonlyArray<CharacterFinalizationIssue>;
} {
  const advancement =
    draft.advancement ?? levelOneAdvancementFromLegacyDraft(draft);

  if (advancement == null) {
    return {
      advancement: undefined,
      abilityScores: cloneAbilityScores(baseAbilityScores),
      classLevels:
        draft.classLevels == null
          ? ZERO_CLASS_LEVELS
          : normalizeClassLevels(draft.classLevels),
      primaryClass: draft.primaryClass,
      issues: [],
    };
  }

  const issues: CharacterFinalizationIssue[] = [];
  if (advancement.length === 0) {
    issues.push({
      code: "invalidAdvancement",
      message: "Advancement history must contain at least one class level.",
    });
    return {
      advancement,
      abilityScores: cloneAbilityScores(baseAbilityScores),
      classLevels: ZERO_CLASS_LEVELS,
      primaryClass: draft.primaryClass,
      issues,
    };
  }

  const derivedClassLevels = advancementToClassLevels(advancement);
  if (draft.classLevels != null) {
    const normalizedDraftClassLevels = normalizeClassLevels(draft.classLevels);
    for (const className of CLASS_NAMES) {
      if (
        normalizedDraftClassLevels[className] !== derivedClassLevels[className]
      ) {
        issues.push({
          code: "invalidAdvancement",
          message:
            "Draft class levels must match the ordered advancement history when both are provided.",
        });
        break;
      }
    }
  }

  const primaryClass = advancement[0].className;
  if (draft.primaryClass != null && draft.primaryClass !== primaryClass) {
    issues.push({
      code: "invalidAdvancement",
      message: "Advancement history must start with the draft primary class.",
    });
  }

  const classLevels = { ...ZERO_CLASS_LEVELS };
  let currentScores = cloneAbilityScores(baseAbilityScores);

  for (const entry of advancement) {
    const priorLevel = classLevels[entry.className];
    const nextLevel = priorLevel + 1;
    classLevels[entry.className] = nextLevel;

    if (nextLevel > 20) {
      issues.push({
        code: "invalidClassLevel",
        message: `Class level for ${entry.className} must be an integer between 0 and 20.`,
      });
      continue;
    }

    if (priorLevel === 0 && entry.className !== primaryClass) {
      for (const className of CLASS_NAMES) {
        if (
          (classLevels[className] > 0 || className === entry.className) &&
          !meetsMulticlassPrereq(currentScores, className)
        ) {
          issues.push({
            code: "multiclassPrerequisiteNotMet",
            message: `Multiclass prerequisite not met for ${className} when taking ${entry.className} level ${nextLevel}.`,
          });
        }
      }
    }

    if (nextLevel === SUBCLASS_LEVEL) {
      if (entry.subclass == null) {
        issues.push({
          code: "missingSubclassSelection",
          message: `${entry.className} level ${nextLevel} requires a subclass selection.`,
        });
      } else {
        if (entry.subclass.className !== entry.className) {
          issues.push({
            code: "invalidSubclassSelection",
            message: `Subclass selection for ${entry.className} must be owned by ${entry.className}.`,
          });
        }
        if (
          !(SRD_SUBCLASSES[entry.className] as ReadonlyArray<string>).includes(
            entry.subclass.subclass,
          )
        ) {
          issues.push({
            code: "invalidSubclassSelection",
            message: `"${entry.subclass.subclass}" is not an SRD subclass for ${entry.className}.`,
          });
        }
      }
    } else if (entry.subclass != null) {
      issues.push({
        code:
          nextLevel < SUBCLASS_LEVEL
            ? "prematureSubclassSelection"
            : "invalidSubclassSelection",
        message:
          nextLevel < SUBCLASS_LEVEL
            ? `${entry.className} cannot choose a subclass before level ${SUBCLASS_LEVEL}.`
            : `${entry.className} chooses its subclass only when reaching level ${SUBCLASS_LEVEL}.`,
      });
    }

    const requiresEpicBoon = nextLevel === EPIC_BOON_LEVEL;
    const requiresFeatChoice =
      !requiresEpicBoon && classGainsFeatChoice(entry.className, nextLevel);

    if (requiresFeatChoice || requiresEpicBoon) {
      if (entry.feat == null) {
        issues.push({
          code: "missingAdvancementChoice",
          message: `${entry.className} level ${nextLevel} requires a recorded feat choice.`,
        });
      } else {
        if (requiresFeatChoice && entry.feat.slot !== "feat") {
          issues.push({
            code: "prematureEpicBoonChoice",
            message: `${entry.className} level ${nextLevel} grants a feat choice, not an Epic Boon choice.`,
          });
        }
        if (requiresEpicBoon && entry.feat.slot !== "epicBoon") {
          issues.push({
            code: "invalidAdvancementChoice",
            message: `${entry.className} level ${nextLevel} must be recorded as an Epic Boon feature.`,
          });
        }

        const choice = entry.feat.choice;
        const boonById =
          choice.tag !== "abilityScoreImprovement" &&
          EPIC_BOON_FEAT_IDS.has(choice.featId);

        if (requiresFeatChoice && (choice.tag === "epicBoon" || boonById)) {
          issues.push({
            code: "prematureEpicBoonChoice",
            message: `${entry.className} level ${nextLevel} cannot choose an Epic Boon feat.`,
          });
        }

        const applied = applyAdvancementChoice(currentScores, entry.feat);
        currentScores = applied.abilityScores;
        issues.push(...applied.issues);
      }
    } else if (entry.feat != null) {
      const boonById =
        entry.feat.choice.tag !== "abilityScoreImprovement" &&
        EPIC_BOON_FEAT_IDS.has(entry.feat.choice.featId);
      issues.push({
        code:
          entry.feat.choice.tag === "epicBoon" || boonById
            ? "prematureEpicBoonChoice"
            : "prematureFeatChoice",
        message:
          entry.feat.choice.tag === "epicBoon" || boonById
            ? `${entry.className} level ${nextLevel} cannot choose an Epic Boon feat.`
            : `${entry.className} level ${nextLevel} does not grant a feat choice.`,
      });
    }
  }

  return {
    advancement,
    abilityScores: currentScores,
    classLevels,
    primaryClass,
    issues,
  };
}
