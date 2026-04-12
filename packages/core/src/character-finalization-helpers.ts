import { ABILITIES } from "#/types.ts";
import {
  applyBackgroundAbilityScoreIncrease,
  type BackgroundAbilityScoreIncrease,
  BACKGROUND_ABILITY_SCORE_OPTIONS,
  isCompleteAbilityScores,
  POINT_BUY_BUDGET,
  STANDARD_ARRAY_SCORES,
  totalPointBuyCost,
  type CharacterAbilityScoreGenerationDraft,
  type CharacterBackground,
} from "#/character-ability-scores.ts";
import {
  CHARACTER_LANGUAGES,
  type CharacterClassLevels,
  type CharacterDraft,
  type CharacterFinalizationIssue,
  type CharacterLanguage,
  totalClassLevels,
} from "#/character-domain.ts";
import { CLASS_NAMES } from "#/features/class-tables.ts";

function isValidClassLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 0 && level <= 20;
}

export function validateAbilityScoreGeneration(
  generation: CharacterAbilityScoreGenerationDraft,
): ReadonlyArray<CharacterFinalizationIssue> {
  const issues: CharacterFinalizationIssue[] = [];

  if (!isCompleteAbilityScores(generation.assignedScores)) {
    return [
      {
        code: "incompleteAbilityScores",
        message: "Assigned ability scores must specify all six abilities.",
      },
    ];
  }

  const scores = generation.assignedScores;
  for (const ability of ABILITIES) {
    const score = scores[ability];
    if (!Number.isInteger(score)) {
      issues.push({
        code: "invalidAbilityScore",
        message: `Assigned ${ability} score must be an integer.`,
      });
      continue;
    }
    const isValidForMode =
      generation.mode === "randomGeneration"
        ? score >= 3 && score <= 18
        : score >= 8 && score <= 15;
    if (!isValidForMode) {
      issues.push({
        code: "invalidAbilityScore",
        message:
          generation.mode === "randomGeneration"
            ? `Assigned ${ability} score must be between 3 and 18 for random generation.`
            : `Assigned ${ability} score must be between 8 and 15 for ${generation.mode}.`,
      });
    }
  }

  if (generation.mode === "standardArray") {
    const assignedScores = Object.values(scores).sort(
      (left, right) => left - right,
    );
    const standardArrayScores = [...STANDARD_ARRAY_SCORES].sort(
      (left, right) => left - right,
    );
    if (
      !assignedScores.every(
        (score, index) => score === standardArrayScores[index],
      )
    ) {
      issues.push({
        code: "invalidStandardArray",
        message:
          "Standard Array characters must assign exactly 15, 14, 13, 12, 10, and 8.",
      });
    }
  }

  if (
    generation.mode === "pointBuy" &&
    totalPointBuyCost(scores) > POINT_BUY_BUDGET
  ) {
    issues.push({
      code: "invalidPointBuy",
      message: `Point Buy characters cannot spend more than ${POINT_BUY_BUDGET} points.`,
    });
  }

  return issues;
}

export function validateBackgroundAbilityScoreIncrease(
  background: CharacterBackground,
  generation: CharacterAbilityScoreGenerationDraft,
  increase: BackgroundAbilityScoreIncrease,
): ReadonlyArray<CharacterFinalizationIssue> {
  const issues: CharacterFinalizationIssue[] = [];
  if (!isCompleteAbilityScores(generation.assignedScores)) return issues;

  const allowedAbilities = new Set(
    BACKGROUND_ABILITY_SCORE_OPTIONS[background],
  );
  if (increase.kind === "plusTwoPlusOne") {
    if (increase.plusTwo === increase.plusOne) {
      issues.push({
        code: "duplicateBackgroundAbilityScoreIncreaseAbility",
        message:
          "A +2/+1 background increase must apply to two different abilities.",
      });
    }
    for (const ability of [increase.plusTwo, increase.plusOne]) {
      if (!allowedAbilities.has(ability)) {
        issues.push({
          code: "invalidBackgroundAbilityScoreIncrease",
          message: `${background} can increase only ${BACKGROUND_ABILITY_SCORE_OPTIONS[
            background
          ].join(", ")}.`,
        });
      }
    }
  }

  const finalScores = applyBackgroundAbilityScoreIncrease(
    generation.assignedScores,
    background,
    increase,
  );
  for (const ability of ABILITIES) {
    if (finalScores[ability] > 20) {
      issues.push({
        code: "abilityScoreIncreaseExceedsTwenty",
        message: `Background increases cannot raise ${ability} above 20.`,
      });
    }
  }

  return issues;
}

export function validateDraftFields(
  draft: CharacterDraft,
  classLevels: CharacterClassLevels,
): CharacterFinalizationIssue[] {
  const issues: CharacterFinalizationIssue[] = [];

  if (draft.primaryClass == null) {
    issues.push({
      code: "missingPrimaryClass",
      message: "CharacterDraft requires a primary class before finalization.",
    });
  }
  if (draft.classLevels == null) {
    issues.push({
      code: "missingClassLevels",
      message: "CharacterDraft requires class levels before finalization.",
    });
  }
  for (const className of CLASS_NAMES) {
    if (!isValidClassLevel(classLevels[className])) {
      issues.push({
        code: "invalidClassLevel",
        message: `Class level for ${className} must be an integer between 0 and 20.`,
      });
    }
  }
  const totalLevel = totalClassLevels(classLevels);
  if (totalLevel < 1 || totalLevel > 20) {
    issues.push({
      code: "invalidTotalLevel",
      message: "Total character level must be between 1 and 20.",
    });
  }
  if (draft.primaryClass != null && classLevels[draft.primaryClass] < 1) {
    issues.push({
      code: "primaryClassLevelMissing",
      message: "Primary class must have at least one class level.",
    });
  }

  for (const [field, code, message] of [
    [
      "background",
      "missingBackground",
      "CharacterDraft requires a background before finalization.",
    ],
    [
      "abilityScoreGeneration",
      "missingAbilityScoreGeneration",
      "CharacterDraft requires an ability score generation choice before finalization.",
    ],
    [
      "backgroundAbilityScoreIncrease",
      "missingBackgroundAbilityScoreIncrease",
      "CharacterDraft requires a background ability score increase choice before finalization.",
    ],
    [
      "species",
      "missingSpecies",
      "CharacterDraft requires a species before finalization.",
    ],
    [
      "languages",
      "missingLanguages",
      "CharacterDraft requires languages before finalization.",
    ],
    [
      "alignment",
      "missingAlignment",
      "CharacterDraft requires an alignment before finalization.",
    ],
  ] as const) {
    if (draft[field] == null) {
      issues.push({ code, message });
    }
  }

  if (draft.abilityScoreGeneration != null) {
    issues.push(
      ...validateAbilityScoreGeneration(draft.abilityScoreGeneration),
    );
  }
  if (
    draft.background != null &&
    draft.abilityScoreGeneration != null &&
    draft.backgroundAbilityScoreIncrease != null
  ) {
    issues.push(
      ...validateBackgroundAbilityScoreIncrease(
        draft.background,
        draft.abilityScoreGeneration,
        draft.backgroundAbilityScoreIncrease,
      ),
    );
  }

  return issues;
}

export function validateLanguages(
  languages: ReadonlyArray<CharacterLanguage>,
): ReadonlyArray<CharacterFinalizationIssue> {
  const issues: CharacterFinalizationIssue[] = [];
  const uniqueLanguages = new Set(languages);

  for (const language of uniqueLanguages) {
    if (!CHARACTER_LANGUAGES.includes(language)) {
      issues.push({
        code: "invalidLanguage",
        message: `Starting language "${language}" must come from the SRD Standard Languages table.`,
      });
    }
  }
  if (uniqueLanguages.size !== languages.length) {
    issues.push({
      code: "duplicateLanguages",
      message: "Character languages must be unique.",
    });
  }
  if (!uniqueLanguages.has("Common")) {
    issues.push({
      code: "missingCommonLanguage",
      message: "Character languages must include Common.",
    });
  }
  if (uniqueLanguages.size < 3) {
    issues.push({
      code: "tooFewLanguages",
      message:
        "Character languages must include Common plus two other Standard Languages.",
    });
  }
  if (uniqueLanguages.size > 3) {
    issues.push({
      code: "tooManyLanguages",
      message:
        "This character-creation slice supports exactly three starting languages.",
    });
  }

  return issues;
}
