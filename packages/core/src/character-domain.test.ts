import { describe, expect, it } from "vitest";

import {
  abilityModifiersFromScores,
  finalizeCharacterDraft,
  finalAbilityModifiers,
  POINT_BUY_BUDGET,
  singleClassLevels,
  STANDARD_ARRAY_SCORES,
  totalClassLevels,
  totalPointBuyCost,
  ZERO_CLASS_LEVELS,
} from "#/character-domain.ts";

describe("character-domain", () => {
  function completeDraft(
    overrides: Partial<Parameters<typeof finalizeCharacterDraft>[0]> = {},
  ): Parameters<typeof finalizeCharacterDraft>[0] {
    return {
      primaryClass: "fighter",
      classLevels: singleClassLevels("fighter", 1),
      background: "soldier",
      abilityScoreGeneration: {
        mode: "standardArray",
        assignedScores: {
          str: 15,
          dex: 13,
          con: 14,
          int: 8,
          wis: 10,
          cha: 12,
        },
      },
      backgroundAbilityScoreIncrease: {
        kind: "plusTwoPlusOne",
        plusTwo: "str",
        plusOne: "con",
      },
      species: "human",
      languages: ["Common", "Dwarvish", "Elvish"],
      alignment: "NG",
      ...overrides,
    };
  }

  it("finalizes a standard-array character with background increases", () => {
    const result = finalizeCharacterDraft(completeDraft());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected successful finalization");
    }

    expect(result.sheet.primaryClass).toBe("fighter");
    expect(result.sheet.classLevels).toEqual({
      ...ZERO_CLASS_LEVELS,
      fighter: 1,
    });
    expect(totalClassLevels(result.sheet.classLevels)).toBe(1);
    expect(result.sheet.abilityScoreGeneration).toEqual({
      mode: "standardArray",
      assignedScores: {
        str: 15,
        dex: 13,
        con: 14,
        int: 8,
        wis: 10,
        cha: 12,
      },
    });
    expect(result.sheet.abilityScores).toEqual({
      str: 17,
      dex: 13,
      con: 15,
      int: 8,
      wis: 10,
      cha: 12,
    });
    expect(finalAbilityModifiers(result.sheet)).toEqual({
      str: 3,
      dex: 1,
      con: 2,
      int: -1,
      wis: 0,
      cha: 1,
    });
    expect(result.sheet.languages).toEqual(["Common", "Dwarvish", "Elvish"]);
  });

  it("finalizes a point-buy character and preserves the owned choices", () => {
    const result = finalizeCharacterDraft({
      primaryClass: "wizard",
      classLevels: singleClassLevels("wizard", 1),
      background: "acolyte",
      abilityScoreGeneration: {
        mode: "pointBuy",
        assignedScores: {
          str: 8,
          dex: 14,
          con: 13,
          int: 15,
          wis: 12,
          cha: 10,
        },
      },
      backgroundAbilityScoreIncrease: {
        kind: "plusOneToThree",
      },
      species: "elf",
      languages: ["Common", "Elvish", "Draconic"],
      alignment: "LN",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected successful finalization");
    }

    expect(
      totalPointBuyCost(result.sheet.abilityScoreGeneration.assignedScores),
    ).toBe(POINT_BUY_BUDGET);
    expect(result.sheet.abilityScores).toEqual({
      str: 8,
      dex: 14,
      con: 13,
      int: 16,
      wis: 13,
      cha: 11,
    });
  });

  it("finalizes a random-generation character using rolled scores", () => {
    const result = finalizeCharacterDraft({
      primaryClass: "rogue",
      classLevels: singleClassLevels("rogue", 1),
      background: "criminal",
      abilityScoreGeneration: {
        mode: "randomGeneration",
        assignedScores: {
          str: 9,
          dex: 17,
          con: 14,
          int: 13,
          wis: 12,
          cha: 11,
        },
      },
      backgroundAbilityScoreIncrease: {
        kind: "plusTwoPlusOne",
        plusTwo: "dex",
        plusOne: "int",
      },
      species: "halfling",
      languages: ["Common", "Halfling", "Goblin"],
      alignment: "CN",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected successful finalization");
    }

    expect(result.sheet.abilityScores).toEqual({
      str: 9,
      dex: 19,
      con: 14,
      int: 14,
      wis: 12,
      cha: 11,
    });
  });

  it("keeps the finalized sheet JSON-serializable", () => {
    const result = finalizeCharacterDraft(completeDraft());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected successful finalization");
    }

    expect(JSON.parse(JSON.stringify(result.sheet))).toEqual(result.sheet);
  });

  it("rejects missing required canonical facts", () => {
    const result = finalizeCharacterDraft({});

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failed finalization");
    }

    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missingPrimaryClass",
      "missingClassLevels",
      "invalidTotalLevel",
      "missingBackground",
      "missingAbilityScoreGeneration",
      "missingBackgroundAbilityScoreIncrease",
      "missingSpecies",
      "missingAlignment",
      "missingLanguages",
    ]);
  });

  it("rejects contradictory class and language state", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        primaryClass: "wizard",
        classLevels: { fighter: 2 },
        background: "sage",
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "int",
          plusOne: "wis",
        },
        languages: ["Common", "Elvish", "Elvish"],
        alignment: "LN",
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failed finalization");
    }

    expect(result.issues.map((issue) => issue.code)).toEqual([
      "primaryClassLevelMissing",
      "duplicateLanguages",
      "tooFewLanguages",
    ]);
  });

  it("rejects an invalid standard-array assignment", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        abilityScoreGeneration: {
          mode: "standardArray",
          assignedScores: {
            str: 15,
            dex: 15,
            con: 14,
            int: 10,
            wis: 10,
            cha: 8,
          },
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failed finalization");
    }

    expect(result.issues.map((issue) => issue.code)).toContain(
      "invalidStandardArray",
    );
  });

  it("rejects a point-buy assignment that overspends the budget", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        primaryClass: "wizard",
        classLevels: singleClassLevels("wizard", 1),
        background: "sage",
        abilityScoreGeneration: {
          mode: "pointBuy",
          assignedScores: {
            str: 15,
            dex: 15,
            con: 15,
            int: 15,
            wis: 8,
            cha: 8,
          },
        },
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "int",
          plusOne: "wis",
        },
        species: "elf",
        languages: ["Common", "Elvish", "Draconic"],
        alignment: "LN",
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failed finalization");
    }

    expect(result.issues.map((issue) => issue.code)).toContain(
      "invalidPointBuy",
    );
  });

  it("rejects non-integer point-buy scores", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        abilityScoreGeneration: {
          mode: "pointBuy",
          assignedScores: {
            str: 10.5,
            dex: 14,
            con: 13,
            int: 12,
            wis: 10,
            cha: 8,
          },
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failed finalization");
    }

    expect(result.issues.map((issue) => issue.code)).toContain(
      "invalidAbilityScore",
    );
  });

  it("rejects a background increase that uses abilities the background does not offer", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "wis",
          plusOne: "cha",
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failed finalization");
    }

    expect(result.issues.map((issue) => issue.code)).toEqual([
      "invalidBackgroundAbilityScoreIncrease",
      "invalidBackgroundAbilityScoreIncrease",
    ]);
  });

  it("rejects starting languages outside the SRD Standard Languages table", () => {
    const result = finalizeCharacterDraft({
      ...completeDraft(),
      languages: ["Common", "Elvish", "Infernal"] as never,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failed finalization");
    }

    expect(result.issues.map((issue) => issue.code)).toContain(
      "invalidLanguage",
    );
  });

  it("rejects more than three starting languages in this slice", () => {
    const result = finalizeCharacterDraft({
      ...completeDraft(),
      languages: ["Common", "Dwarvish", "Elvish", "Draconic"],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failed finalization");
    }

    expect(result.issues.map((issue) => issue.code)).toContain(
      "tooManyLanguages",
    );
  });

  it("rejects a background increase that would raise a score above 20", () => {
    const result = finalizeCharacterDraft({
      ...completeDraft(),
      background: "criminal",
      abilityScoreGeneration: {
        mode: "randomGeneration",
        assignedScores: {
          str: 9,
          dex: 19,
          con: 14,
          int: 17,
          wis: 12,
          cha: 11,
        },
      },
      backgroundAbilityScoreIncrease: {
        kind: "plusTwoPlusOne",
        plusTwo: "dex",
        plusOne: "int",
      },
      languages: ["Common", "Goblin", "Halfling"],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failed finalization");
    }

    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("invalidAbilityScore");
    expect(codes).toContain("abilityScoreIncreaseExceedsTwenty");
  });

  it("derives total level from classLevels instead of storing a duplicate field", () => {
    const classLevels = {
      ...ZERO_CLASS_LEVELS,
      fighter: 3,
      rogue: 2,
    };

    expect(totalClassLevels(classLevels)).toBe(5);
  });

  it("derives ability modifiers directly from final scores", () => {
    expect(
      abilityModifiersFromScores({
        str: 3,
        dex: 8,
        con: 12,
        int: 14,
        wis: 18,
        cha: 20,
      }),
    ).toEqual({
      str: -4,
      dex: -1,
      con: 1,
      int: 2,
      wis: 4,
      cha: 5,
    });
  });

  it("keeps standard-array helpers aligned with the SRD constants", () => {
    expect([...STANDARD_ARRAY_SCORES]).toEqual([15, 14, 13, 12, 10, 8]);
  });
});
