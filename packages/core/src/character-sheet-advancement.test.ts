import { describe, expect, it } from "vitest";

import {
  advanceCharacterSheet,
  finalizeCharacterDraft,
  previewCharacterSheetAdvancement,
  singleClassAdvancement,
  type CharacterDraft,
} from "#/character-domain.ts";
import type { ClassName } from "#/features/class-tables.ts";

function advancementEntry(
  className: ClassName,
  entry: Omit<
    NonNullable<CharacterDraft["advancement"]>[number],
    "className"
  > = {},
): NonNullable<CharacterDraft["advancement"]>[number] {
  return { className, ...entry };
}

function completeDraft(
  overrides: Partial<CharacterDraft> = {},
): CharacterDraft {
  return {
    primaryClass: "fighter",
    advancement: singleClassAdvancement("fighter", 1),
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
    choices: {
      primaryClassSkills: ["acrobatics", "perception"],
      backgroundTool: "dice",
      speciesSkill: "stealth",
      fighterFightingStyle: "defense",
      humanOriginFeat: {
        feat: "skilled",
        proficiencies: ["history", "thievesTools", "viol"],
      },
    },
    equipment: {
      backgroundOption: "package",
      classOption: "packageA",
      purchasedCombatEquipment: [],
      remainingGoldPieces: 18,
      loadout: {
        wieldedWeapon: "greatsword",
        wieldedWeaponGrip: "twoHanded",
      },
    },
    ...overrides,
  };
}

describe("character-sheet-advancement", () => {
  it("previews open required level-up choices before commit", () => {
    const levelOne = finalizeCharacterDraft(completeDraft());
    expect(levelOne.ok).toBe(true);
    if (!levelOne.ok) throw new Error("expected successful level-one sheet");

    const levelTwo = advanceCharacterSheet(levelOne.sheet, {
      entry: advancementEntry("fighter"),
    });
    expect(levelTwo.ok).toBe(true);
    if (!levelTwo.ok) throw new Error("expected successful level-two sheet");

    const preview = previewCharacterSheetAdvancement(levelTwo.sheet, {
      entry: advancementEntry("fighter"),
    });

    expect(preview.candidateDraft.advancement).toEqual([
      advancementEntry("fighter"),
      advancementEntry("fighter"),
      advancementEntry("fighter"),
    ]);
    expect(preview.candidateAssessment.status).toBe("incomplete");
    if (preview.candidateAssessment.status !== "incomplete") {
      throw new Error("expected incomplete advancement preview");
    }
    expect(preview.candidateAssessment.openChoices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missingSubclassSelection" }),
      ]),
    );
    expect(preview.candidateAssessment.issues).toEqual([]);
  });

  it("keeps candidate open choices separate from contradictory sheet issues", () => {
    const levelOne = finalizeCharacterDraft(completeDraft());
    expect(levelOne.ok).toBe(true);
    if (!levelOne.ok) throw new Error("expected successful level-one sheet");

    const levelTwo = advanceCharacterSheet(levelOne.sheet, {
      entry: advancementEntry("fighter"),
    });
    expect(levelTwo.ok).toBe(true);
    if (!levelTwo.ok) throw new Error("expected successful level-two sheet");

    const preview = previewCharacterSheetAdvancement(
      {
        ...levelTwo.sheet,
        abilityScores: {
          ...levelTwo.sheet.abilityScores,
          str: 20,
        },
      },
      {
        entry: advancementEntry("fighter"),
      },
    );

    expect(preview.candidateAssessment.status).toBe("invalid");
    if (preview.candidateAssessment.status !== "invalid") {
      throw new Error("expected invalid advancement preview");
    }
    expect(preview.candidateAssessment.openChoices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missingSubclassSelection" }),
      ]),
    );
    expect(preview.candidateAssessment.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "contradictoryFinalizedSheet" }),
      ]),
    );
  });
});
