import { describe, expect, it } from "vitest";

import {
  advanceCharacterSheet,
  finalizeCharacterDraft,
  previewCharacterSheetAdvancement,
  singleClassAdvancement,
  type CharacterDraft,
} from "#/character-domain.ts";
import type { ClassName } from "#/features/class-tables.ts";

const alertFeat = {
  slot: "feat",
  choice: { tag: "feat", featId: "alert" },
} as const;

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

function completeMulticlassDraft(
  overrides: Partial<CharacterDraft> = {},
): CharacterDraft {
  return {
    primaryClass: "paladin",
    advancement: [
      advancementEntry("paladin"),
      advancementEntry("paladin"),
      advancementEntry("paladin", {
        subclass: { className: "paladin", subclass: "devotion" },
      }),
      advancementEntry("bard"),
      advancementEntry("bard"),
      advancementEntry("bard", {
        subclass: { className: "bard", subclass: "lore" },
      }),
      advancementEntry("bard", { feat: alertFeat }),
      advancementEntry("bard"),
      advancementEntry("cleric"),
      advancementEntry("cleric"),
      advancementEntry("ranger"),
      advancementEntry("ranger"),
      advancementEntry("ranger", {
        subclass: { className: "ranger", subclass: "hunter" },
      }),
      advancementEntry("ranger", { feat: alertFeat }),
      advancementEntry("ranger"),
      advancementEntry("ranger"),
      advancementEntry("sorcerer"),
      advancementEntry("sorcerer"),
      advancementEntry("warlock"),
      advancementEntry("warlock"),
    ],
    background: "acolyte",
    abilityScoreGeneration: {
      mode: "randomGeneration",
      assignedScores: {
        str: 15,
        dex: 13,
        con: 8,
        int: 10,
        wis: 13,
        cha: 13,
      },
    },
    backgroundAbilityScoreIncrease: {
      kind: "plusOneToThree",
    },
    species: "human",
    languages: ["Common", "Dwarvish", "Elvish"],
    alignment: "LG",
    choices: {
      primaryClassSkills: ["athletics", "persuasion"],
      speciesSkill: "perception",
      humanOriginFeat: { feat: "alert" },
      clericDivineOrder: "protector",
      multiclassSkills: {
        bard: ["history"],
        ranger: ["survival"],
      },
      multiclassBardInstrument: "lute",
      paladinFightingStyle: "defense",
      rangerFightingStyle: "archery",
      rangerDeftExplorerLanguages: ["Sylvan", "Primordial"],
      expertiseSkills: ["history", "survival", "perception"],
    },
    spellcasting: {
      bard: {
        cantrips: ["mage_hand", "minor_illusion", "vicious_mockery"],
        preparedSpells: [
          "charm_person",
          "cure_wounds",
          "detect_magic",
          "healing_word",
          "identify",
          "sleep",
          "speak_with_animals",
          "suggestion",
          "thunderwave",
        ],
      },
      cleric: {
        cantrips: ["guidance", "sacred_flame", "thaumaturgy"],
        preparedSpells: [
          "bless",
          "cure_wounds",
          "detect_magic",
          "guiding_bolt",
          "healing_word",
        ],
      },
      paladin: {
        preparedSpells: ["bless", "cure_wounds", "detect_magic", "heroism"],
      },
      ranger: {
        preparedSpells: [
          "aid",
          "cure_wounds",
          "detect_magic",
          "longstrider",
          "speak_with_animals",
          "spike_growth",
        ],
      },
      sorcerer: {
        cantrips: ["fire_bolt", "light", "mage_hand", "minor_illusion"],
        preparedSpells: [
          "burning_hands",
          "charm_person",
          "detect_magic",
          "magic_missile",
        ],
      },
      warlock: {
        cantrips: ["eldritch_blast", "mage_hand"],
        preparedSpells: ["charm_person", "detect_magic", "speak_with_animals"],
      },
    },
    equipment: {
      backgroundOption: "package",
      classOption: "packageA",
      purchasedCombatEquipment: [],
      remainingGoldPieces: 17,
      loadout: {
        wornArmor: "chainMail",
        wieldedWeapon: "longsword",
        shield: true,
        wieldedWeaponGrip: "oneHanded",
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

  it("preserves existing multiclass skill branches when a level-up patch adds another branch", () => {
    const base = finalizeCharacterDraft(completeMulticlassDraft());
    expect(base.ok).toBe(true);
    if (!base.ok) {
      throw new Error("expected successful multiclass sheet");
    }

    const preview = previewCharacterSheetAdvancement(base.sheet, {
      entry: advancementEntry("rogue"),
      choices: {
        multiclassSkills: {
          rogue: ["stealth"],
        },
      },
    });

    expect(preview.candidateDraft.choices?.multiclassSkills).toEqual({
      bard: ["history"],
      ranger: ["survival"],
      rogue: ["stealth"],
    });
  });

  it("preserves spellcasting subfields when a level-up patch updates one field", () => {
    const levelOne = finalizeCharacterDraft(
      completeDraft({
        primaryClass: "wizard",
        advancement: singleClassAdvancement("wizard", 1),
        background: "sage",
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "int",
          plusOne: "wis",
        },
        species: "elf",
        languages: ["Common", "Elvish", "Draconic"],
        alignment: "LN",
        choices: {
          primaryClassSkills: ["investigation", "medicine"],
          speciesSkill: "perception",
        },
        spellcasting: {
          wizard: {
            cantrips: ["fire_bolt", "light", "mage_hand"],
            preparedSpells: [
              "burning_hands",
              "charm_person",
              "detect_magic",
              "magic_missile",
            ],
            spellbook: [
              "burning_hands",
              "charm_person",
              "detect_magic",
              "magic_missile",
              "identify",
              "sleep",
            ],
          },
        },
        equipment: {
          backgroundOption: "package",
          classOption: "gold",
          purchasedCombatEquipment: [],
          remainingGoldPieces: 8,
          loadout: {},
        },
      }),
    );
    expect(levelOne.ok).toBe(true);
    if (!levelOne.ok) {
      throw new Error("expected successful wizard sheet");
    }

    const preview = previewCharacterSheetAdvancement(levelOne.sheet, {
      entry: advancementEntry("wizard"),
      spellcasting: {
        wizard: {
          preparedSpells: [
            "burning_hands",
            "charm_person",
            "detect_magic",
            "magic_missile",
            "shield",
          ],
        },
      },
    });

    expect(preview.candidateDraft.spellcasting?.wizard).toEqual({
      cantrips: ["fire_bolt", "light", "mage_hand"],
      preparedSpells: [
        "burning_hands",
        "charm_person",
        "detect_magic",
        "magic_missile",
        "shield",
      ],
      spellbook: [
        "burning_hands",
        "charm_person",
        "detect_magic",
        "magic_missile",
        "identify",
        "sleep",
      ],
    });
  });
});
