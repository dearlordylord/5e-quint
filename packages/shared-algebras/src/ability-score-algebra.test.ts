import { describe, expect, test } from "vitest";
import { Either } from "effect";

import {
  abilityScoreAssignment,
  isValidAbilityScoreAssignment,
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
  });
});
