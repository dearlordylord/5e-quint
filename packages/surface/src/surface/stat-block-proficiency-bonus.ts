import { SRD_CHALLENGE_RATINGS } from "./schema.ts";
import type { ChallengeRating } from "./types.ts";

const STAT_BLOCK_PROFICIENCY_BONUS_BY_CHALLENGE_RATING = {
  0: 2,
  0.125: 2,
  0.25: 2,
  0.5: 2,
  1: 2,
  2: 2,
  3: 2,
  4: 2,
  5: 3,
  6: 3,
  7: 3,
  8: 3,
  9: 4,
  10: 4,
  11: 4,
  12: 4,
  13: 5,
  14: 5,
  15: 5,
  16: 5,
  17: 6,
  18: 6,
  19: 6,
  20: 6,
  21: 7,
  22: 7,
  23: 7,
  24: 7,
  25: 8,
  26: 8,
  27: 8,
  28: 8,
  29: 9,
  30: 9,
} as const satisfies Readonly<Record<ChallengeRating, number>>;

export type StatBlockProficiencyBonus =
  (typeof STAT_BLOCK_PROFICIENCY_BONUS_BY_CHALLENGE_RATING)[ChallengeRating];

export function isChallengeRating(value: number): value is ChallengeRating {
  return SRD_CHALLENGE_RATINGS.some(
    (challengeRating) => challengeRating === value,
  );
}

export function statBlockProficiencyBonusForChallengeRating(
  challengeRating: ChallengeRating,
): StatBlockProficiencyBonus {
  return STAT_BLOCK_PROFICIENCY_BONUS_BY_CHALLENGE_RATING[challengeRating];
}
