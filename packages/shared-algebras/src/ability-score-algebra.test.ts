import { describe, expect, test } from "vitest";
import { Either, Option } from "effect";

import {
  abilityScoreAssignment,
  abilityScoreToMod,
  abilityScoreValues,
  isPointBuyAssignment,
  isStandardArrayAssignment,
  isValidAbilityScoreAssignment,
  pointBuyCost,
  totalPointBuyCost,
} from "./ability-score-algebra.ts";

describe("ability score assignment algebra", () => {
  test("parses raw scores into durable AbilityScore values", () => {
    const result = abilityScoreAssignment({
      str: 15,
      dex: 14,
      con: 13,
      int: 8,
      wis: 10,
      cha: 12,
    });

    expect(Either.isRight(result)).toBe(true);
    if (Either.isLeft(result)) return;
    expect(isValidAbilityScoreAssignment("standardArray", result.right)).toBe(
      true,
    );
  });

  test("returns typed issues for missing or out-of-range scores", () => {
    expect(abilityScoreAssignment(null)).toEqual(
      Either.left([{ tag: "abilityScoreAssignmentNotObject" }]),
    );
    expect(abilityScoreAssignment({ str: 15 })).toEqual(
      Either.left([
        { tag: "missingNumericAbilityScore", ability: "dex" },
        { tag: "missingNumericAbilityScore", ability: "con" },
        { tag: "missingNumericAbilityScore", ability: "int" },
        { tag: "missingNumericAbilityScore", ability: "wis" },
        { tag: "missingNumericAbilityScore", ability: "cha" },
      ]),
    );
    expect(
      abilityScoreAssignment({
        str: 31,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    ).toEqual(
      Either.left([{ tag: "invalidAbilityScore", ability: "str", value: 31 }]),
    );
    expect(
      abilityScoreAssignment({
        str: 1.5,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    ).toEqual(
      Either.left([{ tag: "invalidAbilityScore", ability: "str", value: 1.5 }]),
    );
  });

  test("computes modifiers, point-buy costs, and assignment policies", () => {
    expect(abilityScoreToMod(8)).toBe(-1);
    expect(
      Array.from({ length: 8 }, (_, index) =>
        Option.getOrNull(pointBuyCost(index + 8)),
      ),
    ).toEqual([0, 1, 2, 3, 4, 5, 7, 9]);
    expect(Option.isNone(pointBuyCost(16))).toBe(true);

    const standardArray = {
      str: 15,
      dex: 14,
      con: 13,
      int: 12,
      wis: 10,
      cha: 8,
    };
    expect(abilityScoreValues(standardArray)).toEqual([15, 14, 13, 12, 10, 8]);
    expect(isStandardArrayAssignment(standardArray)).toBe(true);
    expect(isPointBuyAssignment(standardArray)).toBe(true);
    expect(isValidAbilityScoreAssignment("pointBuy", standardArray)).toBe(true);
    expect(Option.getOrNull(totalPointBuyCost(standardArray))).toBe(27);

    const invalid = { ...standardArray, str: 16 };
    expect(isStandardArrayAssignment(invalid)).toBe(false);
    expect(isPointBuyAssignment(invalid)).toBe(false);
    expect(Option.isNone(totalPointBuyCost(invalid))).toBe(true);
  });
});
