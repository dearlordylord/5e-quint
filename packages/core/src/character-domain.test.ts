import { describe, expect, it } from "vitest";

import {
  finalizeCharacterDraft,
  singleClassLevels,
  totalClassLevels,
  ZERO_CLASS_LEVELS,
} from "#/character-domain.ts";

describe("character-domain", () => {
  it("finalizes a minimal legal character sheet", () => {
    const result = finalizeCharacterDraft({
      primaryClass: "fighter",
      classLevels: singleClassLevels("fighter", 1),
      background: "soldier",
      species: "human",
      languages: ["Common", "Dwarvish", "Elvish"],
      alignment: "NG",
    });

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
    expect(result.sheet.languages).toEqual(["Common", "Dwarvish", "Elvish"]);
  });

  it("keeps the finalized sheet JSON-serializable", () => {
    const result = finalizeCharacterDraft({
      primaryClass: "fighter",
      classLevels: singleClassLevels("fighter", 1),
      background: "soldier",
      species: "human",
      languages: ["Common", "Dwarvish", "Elvish"],
      alignment: "NG",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected successful finalization");
    }

    expect(JSON.parse(JSON.stringify(result.sheet))).toEqual({
      primaryClass: "fighter",
      classLevels: { ...ZERO_CLASS_LEVELS, fighter: 1 },
      background: "soldier",
      species: "human",
      languages: ["Common", "Dwarvish", "Elvish"],
      alignment: "NG",
    });
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
      "missingSpecies",
      "missingAlignment",
      "missingLanguages",
    ]);
  });

  it("rejects contradictory class and language state", () => {
    const result = finalizeCharacterDraft({
      primaryClass: "wizard",
      classLevels: { fighter: 2 },
      background: "sage",
      species: "elf",
      languages: ["Common", "Elvish", "Elvish"],
      alignment: "LN",
    });

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

  it("derives total level from classLevels instead of storing a duplicate field", () => {
    const classLevels = {
      ...ZERO_CLASS_LEVELS,
      fighter: 3,
      rogue: 2,
    };

    expect(totalClassLevels(classLevels)).toBe(5);
  });
});
