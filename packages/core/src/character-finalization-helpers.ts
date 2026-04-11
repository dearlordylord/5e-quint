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
import { type CharacterFinalizationIssue } from "#/character-domain.ts";

export function validateAbilityScoreGeneration(
  generation: CharacterAbilityScoreGenerationDraft,
): ReadonlyArray<CharacterFinalizationIssue> {
  const issues: CharacterFinalizationIssue[] = [];

  if (!isCompleteAbilityScores(generation.assignedScores)) {
    issues.push({
      code: "incompleteAbilityScores",
      message: "Assigned ability scores must specify all six abilities.",
    });
    return issues;
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
    const matchesStandardArray = assignedScores.every(
      (score, index) => score === standardArrayScores[index],
    );
    if (!matchesStandardArray) {
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

  if (!isCompleteAbilityScores(generation.assignedScores)) {
    return issues;
  }

  const scores = generation.assignedScores;
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
          message: `${background} can increase only ${BACKGROUND_ABILITY_SCORE_OPTIONS[background].join(", ")}.`,
        });
      }
    }
  }

  const finalScores = applyBackgroundAbilityScoreIncrease(
    scores,
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
