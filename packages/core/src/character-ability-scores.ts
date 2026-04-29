import {
  POINT_BUY_BUDGET,
  POINT_BUY_MAX_SCORE,
  POINT_BUY_MIN_SCORE,
  STANDARD_ARRAY_SCORES,
  abilityScoreToMod,
  pointBuyCost,
  totalPointBuyCost,
  type AbilityScoreAssignment,
} from "@dnd/shared-algebras/ability-score-algebra";
import { ABILITIES, type Ability } from "#/types.ts";

export const CHARACTER_BACKGROUNDS = [
  "acolyte",
  "criminal",
  "sage",
  "soldier",
] as const;
export type CharacterBackground = (typeof CHARACTER_BACKGROUNDS)[number];

export const ABILITY_SCORE_GENERATION_MODES = [
  "standardArray",
  "randomGeneration",
  "pointBuy",
] as const;
export type AbilityScoreGenerationMode =
  (typeof ABILITY_SCORE_GENERATION_MODES)[number];

export type CharacterAbilityScores = AbilityScoreAssignment;
export type CharacterDraftAbilityScores = Partial<Record<Ability, number>>;
export type CharacterAbilityModifiers = Readonly<Record<Ability, number>>;

export {
  POINT_BUY_BUDGET,
  POINT_BUY_MAX_SCORE,
  POINT_BUY_MIN_SCORE,
  STANDARD_ARRAY_SCORES,
  pointBuyCost,
  totalPointBuyCost,
};

export interface StandardArrayAbilityScoreGeneration {
  readonly mode: "standardArray";
  readonly assignedScores: CharacterAbilityScores;
}

export interface RandomGenerationAbilityScoreGeneration {
  readonly mode: "randomGeneration";
  readonly assignedScores: CharacterAbilityScores;
}

export interface PointBuyAbilityScoreGeneration {
  readonly mode: "pointBuy";
  readonly assignedScores: CharacterAbilityScores;
}

export type CharacterAbilityScoreGeneration =
  | StandardArrayAbilityScoreGeneration
  | RandomGenerationAbilityScoreGeneration
  | PointBuyAbilityScoreGeneration;

export interface StandardArrayAbilityScoreGenerationDraft {
  readonly mode: "standardArray";
  readonly assignedScores: CharacterDraftAbilityScores;
}

export interface RandomGenerationAbilityScoreGenerationDraft {
  readonly mode: "randomGeneration";
  readonly assignedScores: CharacterDraftAbilityScores;
}

export interface PointBuyAbilityScoreGenerationDraft {
  readonly mode: "pointBuy";
  readonly assignedScores: CharacterDraftAbilityScores;
}

export type CharacterAbilityScoreGenerationDraft =
  | StandardArrayAbilityScoreGenerationDraft
  | RandomGenerationAbilityScoreGenerationDraft
  | PointBuyAbilityScoreGenerationDraft;

export interface BackgroundAbilityScoreIncreasePlusTwoPlusOne {
  readonly kind: "plusTwoPlusOne";
  readonly plusTwo: Ability;
  readonly plusOne: Ability;
}

export interface BackgroundAbilityScoreIncreasePlusOneToThree {
  readonly kind: "plusOneToThree";
}

export type BackgroundAbilityScoreIncrease =
  | BackgroundAbilityScoreIncreasePlusTwoPlusOne
  | BackgroundAbilityScoreIncreasePlusOneToThree;

export const BACKGROUND_ABILITY_SCORE_OPTIONS = {
  acolyte: ["int", "wis", "cha"],
  criminal: ["dex", "con", "int"],
  sage: ["con", "int", "wis"],
  soldier: ["str", "dex", "con"],
} as const satisfies Readonly<
  Record<CharacterBackground, ReadonlyArray<Ability>>
>;

export function isCompleteAbilityScores(
  scores: CharacterDraftAbilityScores,
): scores is CharacterAbilityScores {
  return ABILITIES.every((ability) => scores[ability] != null);
}

export function abilityModifiersFromScores(
  scores: CharacterAbilityScores,
): CharacterAbilityModifiers {
  return Object.fromEntries(
    ABILITIES.map((ability) => [ability, abilityScoreToMod(scores[ability])]),
  ) as CharacterAbilityModifiers;
}

export function applyBackgroundAbilityScoreIncrease(
  scores: CharacterAbilityScores,
  background: CharacterBackground,
  increase: BackgroundAbilityScoreIncrease,
): CharacterAbilityScores {
  const nextScores = { ...scores };

  if (increase.kind === "plusOneToThree") {
    for (const ability of BACKGROUND_ABILITY_SCORE_OPTIONS[background]) {
      nextScores[ability] += 1;
    }
    return nextScores;
  }

  nextScores[increase.plusTwo] += 2;
  nextScores[increase.plusOne] += 1;
  return nextScores;
}
