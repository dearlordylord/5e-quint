import { describe, expect, test } from "vitest";

import type { ChallengeRating } from "./types.ts";
import {
  statBlockProficiencyBonusForChallengeRating,
  type StatBlockProficiencyBonus,
} from "./stat-block-proficiency-bonus.ts";

const PROFICIENCY_BONUS_BAND_EDGES = [
  [0, 2],
  [0.125, 2],
  [0.25, 2],
  [0.5, 2],
  [1, 2],
  [4, 2],
  [5, 3],
  [8, 3],
  [9, 4],
  [12, 4],
  [13, 5],
  [16, 5],
  [17, 6],
  [20, 6],
  [21, 7],
  [24, 7],
  [25, 8],
  [28, 8],
  [29, 9],
  [30, 9],
] as const satisfies readonly (readonly [
  ChallengeRating,
  StatBlockProficiencyBonus,
])[];

describe("Stat Block Proficiency Bonus", () => {
  test("follows every RAW Challenge Rating band edge and fractional rating", () => {
    for (const [challengeRating, expected] of PROFICIENCY_BONUS_BAND_EDGES) {
      expect(statBlockProficiencyBonusForChallengeRating(challengeRating)).toBe(
        expected,
      );
    }
  });
});
