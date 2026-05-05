import { Either, Match, Option } from "effect";
import {
  ABILITIES,
  AbilityScore,
  type Ability,
  type AbilityScore as AbilityScoreValue,
} from "@dnd/shared/types";

export const SUPPORTED_ABILITY_SCORE_METHODS = [
  "standardArray",
  "pointBuy",
] as const;
export type SupportedAbilityScoreMethod =
  (typeof SUPPORTED_ABILITY_SCORE_METHODS)[number];

export type AbilityScoreAssignment = Readonly<Record<Ability, number>>;

export type ParsedAbilityScoreAssignment = Readonly<
  Record<Ability, AbilityScoreValue>
>;

export type AbilityScoreAssignmentValueIssue = {
  readonly tag: "invalidAbilityScore";
  readonly ability: Ability;
  readonly value: number;
};

export const STANDARD_ARRAY_SCORES = [15, 14, 13, 12, 10, 8] as const;
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN_SCORE = 8;
export const POINT_BUY_MAX_SCORE = 15;

export function abilityScoreAssignment(
  scores: AbilityScoreAssignment,
): Either.Either<
  ParsedAbilityScoreAssignment,
  AbilityScoreAssignmentValueIssue
> {
  const str = abilityScoreField(scores.str, "str");
  if (Either.isLeft(str)) return Either.left(str.left);
  const dex = abilityScoreField(scores.dex, "dex");
  if (Either.isLeft(dex)) return Either.left(dex.left);
  const con = abilityScoreField(scores.con, "con");
  if (Either.isLeft(con)) return Either.left(con.left);
  const int = abilityScoreField(scores.int, "int");
  if (Either.isLeft(int)) return Either.left(int.left);
  const wis = abilityScoreField(scores.wis, "wis");
  if (Either.isLeft(wis)) return Either.left(wis.left);
  const cha = abilityScoreField(scores.cha, "cha");
  if (Either.isLeft(cha)) return Either.left(cha.left);

  return Either.right({
    str: str.right,
    dex: dex.right,
    con: con.right,
    int: int.right,
    wis: wis.right,
    cha: cha.right,
  } satisfies ParsedAbilityScoreAssignment);
}

function abilityScoreField(
  score: number,
  ability: Ability,
): Either.Either<AbilityScoreValue, AbilityScoreAssignmentValueIssue> {
  if (!Number.isInteger(score) || score < 1 || score > 30) {
    return Either.left({
      tag: "invalidAbilityScore",
      ability,
      value: score,
    });
  }

  return Either.right(AbilityScore.make(score));
}

export function abilityScoreToMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

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
