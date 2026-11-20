import { Match, Option, Result } from "effect";
import { traverseValidation } from "@dnd/shared/validation";
import {
  ABILITIES,
  ABILITY_SCORE_MAX,
  ABILITY_SCORE_MIN,
  AbilityScore,
  type Ability,
  type ReadonlyNonEmptyArray,
  type AbilityScore as AbilityScoreValue,
} from "@dnd/shared/types";

export const SUPPORTED_ABILITY_SCORE_METHODS = [
  "standardArray",
  "pointBuy",
  "randomGeneration",
] as const;
export type SupportedAbilityScoreMethod =
  (typeof SUPPORTED_ABILITY_SCORE_METHODS)[number];

export type AbilityScoreAssignment = Readonly<Record<Ability, number>>;

export type ParsedAbilityScoreAssignment = Readonly<
  Record<Ability, AbilityScoreValue>
>;

export type AbilityScoreAssignmentIssue =
  | { readonly tag: "abilityScoreAssignmentNotObject" }
  | {
      readonly tag: "missingNumericAbilityScore";
      readonly ability: Ability;
    }
  | {
      readonly tag: "invalidAbilityScore";
      readonly ability: Ability;
      readonly value: number;
    };

export const STANDARD_ARRAY_SCORES = [15, 14, 13, 12, 10, 8] as const;
/** The total of the highest three of four d6s. */
export const RANDOM_GENERATION_MIN_SCORE = 3;
export const RANDOM_GENERATION_MAX_SCORE = 18;
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN_SCORE = 8;
export const POINT_BUY_MAX_SCORE = 15;

export function abilityScoreAssignment(
  scores: unknown,
): Result.Result<
  ParsedAbilityScoreAssignment,
  ReadonlyNonEmptyArray<AbilityScoreAssignmentIssue>
> {
  if (typeof scores !== "object" || scores == null) {
    return Result.fail([{ tag: "abilityScoreAssignmentNotObject" }]);
  }

  const fields = traverseValidation(ABILITIES, (ability) =>
    Result.map(abilityScoreField(scores, ability), (score) => ({
      ability,
      score,
    })),
  );
  if (Result.isFailure(fields)) return Result.fail(fields.failure);
  const scoresByAbility = Object.fromEntries(
    fields.success.map(({ ability, score }) => [ability, score]),
  ) as ParsedAbilityScoreAssignment;

  return Result.succeed(scoresByAbility);
}

function abilityScoreField(
  scores: object,
  ability: Ability,
): Result.Result<AbilityScoreValue, AbilityScoreAssignmentIssue> {
  const score: unknown = Reflect.get(scores, ability);
  if (typeof score !== "number") {
    return Result.fail({ tag: "missingNumericAbilityScore", ability });
  }
  if (
    !Number.isInteger(score) ||
    score < ABILITY_SCORE_MIN ||
    score > ABILITY_SCORE_MAX
  ) {
    return Result.fail({
      tag: "invalidAbilityScore",
      ability,
      value: score,
    });
  }

  return Result.succeed(AbilityScore.make(score));
}

export function abilityScoreToMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** The modifier of the lowest ability score. */
export const LOWEST_ABILITY_MODIFIER = abilityScoreToMod(ABILITY_SCORE_MIN);

export function pointBuyCost(score: number): Option.Option<number> {
  switch (score) {
    case 8:
      return Option.some(0);
    case 9:
      return Option.some(1);
    case 10:
      return Option.some(2);
    case 11:
      return Option.some(3);
    case 12:
      return Option.some(4);
    case 13:
      return Option.some(5);
    case 14:
      return Option.some(7);
    case 15:
      return Option.some(9);
    default:
      return Option.none();
  }
}

export function abilityScoreValues(
  scores: AbilityScoreAssignment,
): readonly number[] {
  return ABILITIES.map((ability) => scores[ability]);
}

export function totalPointBuyCost(
  scores: AbilityScoreAssignment,
): Option.Option<number> {
  return ABILITIES.reduce<Option.Option<number>>(
    (total, ability) =>
      Option.flatMap(total, (currentTotal) =>
        Option.map(
          pointBuyCost(scores[ability]),
          (cost) => currentTotal + cost,
        ),
      ),
    Option.some(0),
  );
}

export function isStandardArrayAssignment(
  scores: AbilityScoreAssignment,
): boolean {
  return sameNumberMultiset(abilityScoreValues(scores), STANDARD_ARRAY_SCORES);
}

export function isRandomGenerationAssignment(
  scores: AbilityScoreAssignment,
): boolean {
  return abilityScoreValues(scores).every(
    (score) =>
      Number.isInteger(score) &&
      score >= RANDOM_GENERATION_MIN_SCORE &&
      score <= RANDOM_GENERATION_MAX_SCORE,
  );
}

export function isPointBuyAssignment(scores: AbilityScoreAssignment): boolean {
  const totalCost = totalPointBuyCost(scores);
  return (
    abilityScoreValues(scores).every(
      (score) =>
        Number.isInteger(score) &&
        score >= POINT_BUY_MIN_SCORE &&
        score <= POINT_BUY_MAX_SCORE,
    ) &&
    Option.isSome(totalCost) &&
    totalCost.value <= POINT_BUY_BUDGET
  );
}

export function isValidAbilityScoreAssignment(
  method: SupportedAbilityScoreMethod,
  scores: AbilityScoreAssignment,
): boolean {
  return Match.value(method).pipe(
    Match.when("standardArray", () => isStandardArrayAssignment(scores)),
    Match.when("randomGeneration", () => isRandomGenerationAssignment(scores)),
    Match.when("pointBuy", () => isPointBuyAssignment(scores)),
    Match.exhaustive,
  );
}

function sameNumberMultiset(
  left: readonly number[],
  right: readonly number[],
): boolean {
  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);

  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}
