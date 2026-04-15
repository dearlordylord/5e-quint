import { describe, expect, it } from "vitest";

import {
  assessCharacterDraft,
  advanceCharacterSheet,
  applyCharacterDraftUpdate,
  abilityModifiersFromScores,
  characterBattleEquipmentProjection,
  characterClassResources,
  characterOriginFeats,
  characterProficiencySummary,
  finalizeCharacterDraft,
  finalAbilityModifiers,
  ownedCombatEquipment,
  POINT_BUY_BUDGET,
  previewCharacterDraftUpdate,
  projectBattleWeaponProfile,
  deriveProficiencyBonus,
  sheetClassLevels,
  singleClassAdvancement,
  startingGoldPieces,
  type CharacterDraft,
  STANDARD_ARRAY_SCORES,
  totalClassLevels,
  totalPointBuyCost,
  ZERO_CLASS_LEVELS,
} from "#/character-domain.ts";
import type { ClassName } from "#/features/class-tables.ts";

describe("character-domain", () => {
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

  const wizardLevelOneSpellcasting = {
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
  } as const;

  const rangerLevelFourteenSpellcasting = {
    ranger: {
      preparedSpells: [
        "cure_wounds",
        "detect_magic",
        "speak_with_animals",
        "speak_with_plants",
        "spike_growth",
        "aid",
        "goodberry",
        "longstrider",
        "pass_without_trace",
        "silence",
        "daylight",
      ],
    },
  } as const;

  const multiclassCasterSpellcasting = {
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
  } as const;

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

  it("finalizes a standard-array character and preserves the owned sheet choices", () => {
    const result = finalizeCharacterDraft(completeDraft());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected successful finalization");

    expect(result.sheet.primaryClass).toBe("fighter");
    expect(sheetClassLevels(result.sheet)).toEqual({
      ...ZERO_CLASS_LEVELS,
      fighter: 1,
    });
    expect(result.sheet.equipment).toEqual({
      backgroundOption: "package",
      classOption: "packageA",
      purchasedCombatEquipment: [],
      remainingGoldPieces: 18,
      loadout: {
        wornArmor: null,
        wieldedWeapon: "greatsword",
        secondaryWeapon: null,
        shield: false,
        wieldedWeaponGrip: "twoHanded",
      },
    });
    expect(totalClassLevels(sheetClassLevels(result.sheet))).toBe(1);
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
    expect(JSON.parse(JSON.stringify(result.sheet))).toEqual(result.sheet);
  });

  it("requires a fighter fighting style choice once fighter level 1 is owned", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        choices: {
          primaryClassSkills: ["acrobatics", "perception"],
          backgroundTool: "dice",
          speciesSkill: "stealth",
          humanOriginFeat: {
            feat: "skilled",
            proficiencies: ["history", "thievesTools", "viol"],
          },
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error(
        "expected missing Fighting Style choice to block finalization",
      );
    }
    expect(result.openChoices.map((issue) => issue.code)).toContain(
      "missingFeatureChoice",
    );
  });

  it("rejects malformed fighting style values instead of finalizing them", () => {
    const result = finalizeCharacterDraft({
      ...completeDraft(),
      choices: {
        ...completeDraft().choices,
        fighterFightingStyle: "notAStyle" as never,
        paladinFightingStyle: "alsoNotAStyle" as never,
      },
      advancement: [advancementEntry("fighter"), advancementEntry("paladin")],
      classLevels: {
        ...ZERO_CLASS_LEVELS,
        fighter: 1,
        paladin: 1,
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected malformed Fighting Style choices to fail");
    }
    expect(result.issues.map((issue) => issue.code)).toContain(
      "invalidFeatureChoice",
    );
  });

  it("rejects expertise skills that are not current skill proficiencies", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        primaryClass: "rogue",
        advancement: singleClassAdvancement("rogue", 1),
        background: "criminal",
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "dex",
          plusOne: "int",
        },
        species: "elf",
        choices: {
          primaryClassSkills: [
            "acrobatics",
            "athletics",
            "deception",
            "stealth",
          ],
          speciesSkill: "perception",
          rogueLanguage: "Sylvan",
          expertiseSkills: ["arcana", "stealth"],
        },
        equipment: {
          backgroundOption: "package",
          classOption: "packageA",
          purchasedCombatEquipment: [],
          remainingGoldPieces: 8,
          loadout: {
            wieldedWeapon: "shortsword",
          },
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error(
        "expected invalid Expertise choice to block finalization",
      );
    }
    expect(result.issues.map((issue) => issue.code)).toContain(
      "invalidFeatureChoice",
    );
  });

  it("rejects wizard Scholar expertise outside the SRD scholar skill list", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        primaryClass: "wizard",
        advancement: [advancementEntry("wizard"), advancementEntry("wizard")],
        background: "sage",
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "int",
          plusOne: "wis",
        },
        species: "elf",
        choices: {
          primaryClassSkills: ["investigation", "medicine"],
          speciesSkill: "perception",
          expertiseSkills: ["perception"],
        },
        spellcasting: {
          wizard: {
            cantrips: ["fire_bolt", "light", "mage_hand"],
            preparedSpells: [
              "burning_hands",
              "charm_person",
              "detect_magic",
              "identify",
              "magic_missile",
            ],
            spellbook: [
              "burning_hands",
              "charm_person",
              "detect_magic",
              "identify",
              "magic_missile",
              "shield",
              "sleep",
              "thunderwave",
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

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error(
        "expected wizard Scholar to reject expertise outside the scholar skill list",
      );
    }
    expect(result.issues.map((issue) => issue.code)).toContain(
      "invalidFeatureChoice",
    );
  });

  it("models higher-level starts as repeated legal sheet-to-sheet advancement", () => {
    const levelOne = finalizeCharacterDraft(completeDraft());
    expect(levelOne.ok).toBe(true);
    if (!levelOne.ok) throw new Error("expected successful level-one sheet");

    const levelTwo = advanceCharacterSheet(levelOne.sheet, {
      entry: advancementEntry("fighter"),
    });
    expect(levelTwo.ok).toBe(true);
    if (!levelTwo.ok) throw new Error("expected successful level-two sheet");

    const levelThree = advanceCharacterSheet(levelTwo.sheet, {
      entry: advancementEntry("fighter", {
        subclass: { className: "fighter", subclass: "champion" },
      }),
    });
    expect(levelThree.ok).toBe(true);
    if (!levelThree.ok)
      throw new Error("expected successful level-three sheet");

    const levelFour = advanceCharacterSheet(levelThree.sheet, {
      entry: advancementEntry("fighter", {
        feat: {
          slot: "feat",
          choice: {
            tag: "abilityScoreImprovement",
            abilities: ["str", "con"],
          },
        },
      }),
    });
    expect(levelFour.ok).toBe(true);
    if (!levelFour.ok) throw new Error("expected successful level-four sheet");

    const levelFive = advanceCharacterSheet(levelFour.sheet, {
      entry: advancementEntry("fighter"),
    });
    expect(levelFive.ok).toBe(true);
    if (!levelFive.ok) throw new Error("expected successful level-five sheet");

    const direct = finalizeCharacterDraft(
      completeDraft({
        advancement: [
          advancementEntry("fighter"),
          advancementEntry("fighter"),
          advancementEntry("fighter", {
            subclass: { className: "fighter", subclass: "champion" },
          }),
          advancementEntry("fighter", {
            feat: {
              slot: "feat",
              choice: {
                tag: "abilityScoreImprovement",
                abilities: ["str", "con"],
              },
            },
          }),
          advancementEntry("fighter"),
        ],
      }),
    );

    expect(direct.ok).toBe(true);
    if (!direct.ok) throw new Error("expected successful direct sheet");

    expect(levelFive.sheet).toEqual(direct.sheet);
    expect(levelFive.sheet.abilityScores).toEqual({
      str: 18,
      dex: 13,
      con: 16,
      int: 8,
      wis: 10,
      cha: 12,
    });
  });

  it("does not open Champion's additional fighting style slot on a non-Champion fighter-7 draft", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        advancement: [
          advancementEntry("fighter"),
          advancementEntry("fighter"),
          advancementEntry("fighter"),
          advancementEntry("fighter", {
            feat: {
              slot: "feat",
              choice: {
                tag: "abilityScoreImprovement",
                abilities: ["str"],
              },
            },
          }),
          advancementEntry("fighter"),
          advancementEntry("fighter"),
          advancementEntry("fighter", { feat: alertFeat }),
          advancementEntry("fighter"),
        ],
        classLevels: { fighter: 7 },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error(
        "expected missing subclass selection to block finalization",
      );
    }
    expect(result.openChoices.map((issue) => issue.code)).toContain(
      "missingSubclassSelection",
    );
    expect(result.openChoices.map((issue) => issue.code)).not.toContain(
      "missingFeatureChoice",
    );
  });

  it("requires Champion's additional fighting style once fighter level 7 Champion is owned", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        advancement: [
          advancementEntry("fighter"),
          advancementEntry("fighter"),
          advancementEntry("fighter", {
            subclass: { className: "fighter", subclass: "champion" },
          }),
          advancementEntry("fighter", {
            feat: {
              slot: "feat",
              choice: {
                tag: "abilityScoreImprovement",
                abilities: ["str"],
              },
            },
          }),
          advancementEntry("fighter"),
          advancementEntry("fighter", { feat: alertFeat }),
          advancementEntry("fighter"),
        ],
        classLevels: { fighter: 7 },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error(
        "expected Champion fighter level seven to require an additional Fighting Style choice",
      );
    }
    expect(result.openChoices.map((issue) => issue.code)).toContain(
      "missingFeatureChoice",
    );
  });

  it("rejects illegal advancement transitions instead of creating a bespoke higher-level path", () => {
    const levelOne = finalizeCharacterDraft(completeDraft());
    expect(levelOne.ok).toBe(true);
    if (!levelOne.ok) throw new Error("expected successful level-one sheet");

    const levelTwo = advanceCharacterSheet(levelOne.sheet, {
      entry: advancementEntry("fighter"),
    });
    expect(levelTwo.ok).toBe(true);
    if (!levelTwo.ok) throw new Error("expected successful level-two sheet");

    const illegalLevelThree = advanceCharacterSheet(levelTwo.sheet, {
      entry: advancementEntry("fighter"),
    });

    expect(illegalLevelThree.ok).toBe(false);
    if (illegalLevelThree.ok) {
      throw new Error("expected illegal level-three advancement");
    }

    expect(illegalLevelThree.openChoices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missingSubclassSelection" }),
      ]),
    );
  });

  it("uses the same advancement path for multiclass continuation", () => {
    const fighterStart = finalizeCharacterDraft(
      completeDraft({
        abilityScoreGeneration: {
          mode: "standardArray",
          assignedScores: {
            str: 14,
            dex: 15,
            con: 12,
            int: 8,
            wis: 13,
            cha: 10,
          },
        },
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "dex",
          plusOne: "con",
        },
      }),
    );
    expect(fighterStart.ok).toBe(true);
    if (!fighterStart.ok) throw new Error("expected successful fighter sheet");

    const multiclassed = advanceCharacterSheet(fighterStart.sheet, {
      entry: advancementEntry("monk"),
      choices: {
        monkTool: "flute",
      },
    });

    expect(multiclassed.ok).toBe(true);
    if (!multiclassed.ok)
      throw new Error("expected successful multiclass sheet");

    const direct = finalizeCharacterDraft(
      completeDraft({
        abilityScoreGeneration: {
          mode: "standardArray",
          assignedScores: {
            str: 14,
            dex: 15,
            con: 12,
            int: 8,
            wis: 13,
            cha: 10,
          },
        },
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "dex",
          plusOne: "con",
        },
        advancement: [advancementEntry("fighter"), advancementEntry("monk")],
        choices: {
          ...completeDraft().choices,
          monkTool: "flute",
        },
      }),
    );

    expect(direct.ok).toBe(true);
    if (!direct.ok)
      throw new Error("expected successful direct multiclass sheet");

    expect(multiclassed.sheet).toEqual(direct.sheet);
    expect(sheetClassLevels(multiclassed.sheet)).toEqual({
      ...ZERO_CLASS_LEVELS,
      fighter: 1,
      monk: 1,
    });
    expect(multiclassed.sheet.choices.monkTool).toBe("flute");
  });

  it("blocks contradictory finalized sheets with an actionable issue", () => {
    const levelOne = finalizeCharacterDraft(completeDraft());
    expect(levelOne.ok).toBe(true);
    if (!levelOne.ok) throw new Error("expected successful level-one sheet");

    const tampered = {
      ...levelOne.sheet,
      abilityScores: {
        ...levelOne.sheet.abilityScores,
        str: 20,
      },
    } as const;

    const blocked = advanceCharacterSheet(tampered, {
      entry: advancementEntry("fighter"),
    });

    expect(blocked.ok).toBe(false);
    if (blocked.ok) {
      throw new Error("expected contradictory sheet to be blocked");
    }

    expect(blocked.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "contradictoryFinalizedSheet" }),
      ]),
    );
  });

  it("keeps spellcasting expansion on the same advancement path", () => {
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
        spellcasting: wizardLevelOneSpellcasting,
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
    if (!levelOne.ok) throw new Error("expected successful wizard sheet");

    const levelTwo = advanceCharacterSheet(levelOne.sheet, {
      entry: advancementEntry("wizard"),
      choices: {
        expertiseSkills: ["investigation"],
      },
      spellcasting: {
        wizard: {
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
            "shield",
            "thunderwave",
          ],
        },
      },
    });
    expect(levelTwo.ok).toBe(true);
    if (!levelTwo.ok) throw new Error("expected successful level-two wizard");

    const direct = finalizeCharacterDraft(
      completeDraft({
        primaryClass: "wizard",
        advancement: [advancementEntry("wizard"), advancementEntry("wizard")],
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
          expertiseSkills: ["investigation"],
        },
        spellcasting: {
          wizard: {
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
              "shield",
              "thunderwave",
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
    expect(direct.ok).toBe(true);
    if (!direct.ok) throw new Error("expected successful direct wizard");

    expect(levelTwo.sheet).toEqual(direct.sheet);
  });

  it("derives merged proficiencies from class, background, species, feat, and granted-language choices", () => {
    const result = finalizeCharacterDraft(completeDraft());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected successful finalization");

    expect(characterOriginFeats(result.sheet)).toEqual([
      { feat: "savageAttacker" },
      {
        feat: "skilled",
        proficiencies: ["history", "thievesTools", "viol"],
      },
    ]);
    expect(characterProficiencySummary(result.sheet)).toEqual({
      savingThrows: ["str", "con"],
      skills: [
        "athletics",
        "intimidation",
        "acrobatics",
        "perception",
        "stealth",
        "history",
      ],
      tools: ["dice", "thievesTools", "viol"],
      armorTraining: ["light", "medium", "heavy", "shield"],
      weaponProficiencies: ["simple", "martial"],
      originFeats: [
        { feat: "savageAttacker" },
        {
          feat: "skilled",
          proficiencies: ["history", "thievesTools", "viol"],
        },
      ],
      grantedLanguages: [],
      subclasses: [],
    });
  });

  it("enforces species skill choices for elf and human", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        species: "elf",
        choices: {
          primaryClassSkills: ["acrobatics", "perception"],
          backgroundTool: "dice",
          humanOriginFeat: undefined,
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed finalization");
    expect(result.openChoices.map((issue) => issue.code)).toContain(
      "missingSpeciesSkillChoice",
    );
  });

  it("rejects fighter subclasses unless fighter itself is level 3+", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        primaryClass: "wizard",
        advancement: [
          advancementEntry("wizard"),
          advancementEntry("wizard"),
          advancementEntry("wizard", {
            subclass: { className: "wizard", subclass: "evoker" },
          }),
          advancementEntry("fighter", {
            subclass: { className: "fighter", subclass: "champion" },
          }),
        ],
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
          primaryClassSkills: ["arcana", "investigation"],
          speciesSkill: "perception",
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed finalization");
    expect(result.issues.map((issue) => issue.code)).toContain(
      "prematureSubclassSelection",
    );
  });

  it("surfaces subclass legality through draft assessment without a parallel validator", () => {
    const assessment = assessCharacterDraft(
      completeDraft({
        primaryClass: "wizard",
        advancement: [
          advancementEntry("wizard"),
          advancementEntry("wizard"),
          advancementEntry("wizard", {
            subclass: { className: "wizard", subclass: "evoker" },
          }),
          advancementEntry("fighter", {
            subclass: { className: "fighter", subclass: "champion" },
          }),
        ],
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
          primaryClassSkills: ["arcana", "investigation"],
          speciesSkill: "perception",
        },
      }),
    );

    expect(assessment.status).toBe("invalid");
    expect(assessment.openChoices.map((choice) => choice.code)).not.toContain(
      "prematureSubclassSelection",
    );
    expect(assessment.issues.map((issue) => issue.code)).toContain(
      "prematureSubclassSelection",
    );
  });

  it("validates multiclass prerequisites on the final ability scores", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        primaryClass: "fighter",
        advancement: [advancementEntry("fighter"), advancementEntry("wizard")],
        background: "criminal",
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "dex",
          plusOne: "con",
        },
        species: "halfling",
        choices: {
          primaryClassSkills: ["acrobatics", "perception"],
          backgroundTool: undefined,
          multiclassSkills: {},
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed finalization");
    expect(result.issues.map((issue) => issue.code)).toContain(
      "multiclassPrerequisiteNotMet",
    );
  });

  it("derives cross-class resources with correct recharge boundaries and class gates", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
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
        spellcasting: multiclassCasterSpellcasting,
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
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected successful finalization");

    expect(deriveProficiencyBonus(result.sheet)).toBe(6);
    expect(characterClassResources(result.sheet)).toEqual([
      { name: "Bardic Inspiration", uses: 2, rechargesOn: "shortOrLongRest" },
      { name: "Channel Divinity", uses: 4, rechargesOn: "shortRest" },
      { name: "Lay on Hands", uses: 15, rechargesOn: "longRest" },
      { name: "Favored Enemy", uses: 3, rechargesOn: "longRest" },
      { name: "Sorcery Points", uses: 2, rechargesOn: "longRest" },
      { name: "Pact Slots", uses: 2, rechargesOn: "shortRest" },
      { name: "Pact Slot Level 1", uses: 1, rechargesOn: "longRest" },
      { name: "Invocations Known", uses: 3, rechargesOn: "longRest" },
    ]);
  });

  it("derives ranger long-rest pools from level-gated class facts", () => {
    const result = finalizeCharacterDraft({
      primaryClass: "ranger",
      advancement: [
        ...singleClassAdvancement("ranger", 2),
        advancementEntry("ranger", {
          subclass: { className: "ranger", subclass: "hunter" },
        }),
        advancementEntry("ranger", { feat: alertFeat }),
        ...singleClassAdvancement("ranger", 3),
        advancementEntry("ranger", { feat: alertFeat }),
        ...singleClassAdvancement("ranger", 3),
        advancementEntry("ranger", { feat: alertFeat }),
        ...singleClassAdvancement("ranger", 2),
      ],
      background: "sage",
      abilityScoreGeneration: {
        mode: "standardArray",
        assignedScores: {
          str: 10,
          dex: 14,
          con: 13,
          int: 8,
          wis: 15,
          cha: 12,
        },
      },
      backgroundAbilityScoreIncrease: {
        kind: "plusTwoPlusOne",
        plusTwo: "wis",
        plusOne: "con",
      },
      species: "human",
      languages: ["Common", "Dwarvish", "Elvish"],
      alignment: "NG",
      choices: {
        primaryClassSkills: ["animalHandling", "nature", "survival"],
        speciesSkill: "perception",
        humanOriginFeat: { feat: "alert" },
        rangerFightingStyle: "archery",
        rangerDeftExplorerLanguages: ["Primordial", "Undercommon"],
        expertiseSkills: ["animalHandling", "survival", "perception"],
      },
      spellcasting: rangerLevelFourteenSpellcasting,
      equipment: {
        backgroundOption: "package",
        classOption: "packageA",
        purchasedCombatEquipment: [],
        remainingGoldPieces: 15,
        loadout: {
          wornArmor: "studdedLeatherArmor",
          wieldedWeapon: "longbow",
          wieldedWeaponGrip: "twoHanded",
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected successful finalization");

    expect(characterClassResources(result.sheet)).toEqual([
      { name: "Favored Enemy", uses: 5, rechargesOn: "longRest" },
      { name: "Tireless", uses: 3, rechargesOn: "longRest" },
      { name: "Nature's Veil", uses: 3, rechargesOn: "longRest" },
    ]);
  });

  it("derives point-buy scores and preserves the owned generation input", () => {
    const result = finalizeCharacterDraft({
      primaryClass: "wizard",
      advancement: singleClassAdvancement("wizard", 1),
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
      backgroundAbilityScoreIncrease: { kind: "plusOneToThree" },
      species: "elf",
      languages: ["Common", "Elvish", "Draconic"],
      alignment: "LN",
      choices: {
        primaryClassSkills: ["arcana", "investigation"],
        speciesSkill: "perception",
      },
      spellcasting: wizardLevelOneSpellcasting,
      equipment: {
        backgroundOption: "package",
        classOption: "packageA",
        purchasedCombatEquipment: [],
        remainingGoldPieces: 13,
        loadout: {
          wieldedWeapon: "quarterstaff",
          wieldedWeaponGrip: "twoHanded",
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected successful finalization");

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

  it("applies advancement ASIs to the canonical sheet ability scores", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        advancement: [
          advancementEntry("fighter"),
          advancementEntry("fighter"),
          advancementEntry("fighter", {
            subclass: { className: "fighter", subclass: "champion" },
          }),
          advancementEntry("fighter", {
            feat: {
              slot: "feat",
              choice: {
                tag: "abilityScoreImprovement",
                abilities: ["str"],
              },
            },
          }),
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected successful finalization");
    expect(result.sheet.abilityScores.str).toBe(19);
  });

  it("rejects Epic Boon feat ids before level 19", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        advancement: [
          advancementEntry("fighter"),
          advancementEntry("fighter"),
          advancementEntry("fighter", {
            subclass: { className: "fighter", subclass: "champion" },
          }),
          advancementEntry("fighter", {
            feat: {
              slot: "feat",
              choice: { tag: "feat", featId: "boon_of_combat_prowess" },
            },
          }),
        ],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed finalization");
    expect(result.issues.map((issue) => issue.code)).toContain(
      "prematureEpicBoonChoice",
    );
  });

  it("rejects mismatched class levels alongside advancement", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        classLevels: { ...ZERO_CLASS_LEVELS, fighter: 2 },
        advancement: [advancementEntry("fighter")],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed finalization");
    expect(result.issues.map((issue) => issue.code)).toContain(
      "invalidAdvancement",
    );
  });

  it("owns starting equipment choices and projects battle-facing loadout facts from the sheet", () => {
    const result = finalizeCharacterDraft(completeDraft());

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected successful finalization");

    expect(ownedCombatEquipment(result.sheet)).toEqual({
      armor: ["chainMail"],
      weapons: [
        "spear",
        "shortbow",
        "greatsword",
        "flail",
        "javelin",
        "javelin",
        "javelin",
        "javelin",
        "javelin",
        "javelin",
        "javelin",
        "javelin",
      ],
      shields: 0,
    });
    expect(startingGoldPieces(result.sheet)).toBe(18);
    expect(characterBattleEquipmentProjection(result.sheet)).toEqual({
      hasShieldEquipped: false,
      isWearingArmor: false,
      mainHandUsesTwoHands: true,
      mainHandWeapon: {
        name: "Greatsword",
        damageType: "slashing",
        isMelee: true,
        damageDie: 6,
        diceCount: 2,
        properties: new Set(["heavy", "twoHanded"]),
      },
    });
  });

  it("tracks gold-start combat purchases without reviving starter presets", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        equipment: {
          backgroundOption: "package",
          classOption: "gold",
          purchasedCombatEquipment: ["chainMail", "shield", "longsword"],
          remainingGoldPieces: 69,
          loadout: {
            wornArmor: "chainMail",
            wieldedWeapon: "longsword",
            shield: true,
            wieldedWeaponGrip: "oneHanded",
          },
        },
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected successful finalization");

    expect(ownedCombatEquipment(result.sheet)).toEqual({
      armor: ["chainMail"],
      weapons: ["spear", "shortbow", "longsword"],
      shields: 1,
    });
    expect(startingGoldPieces(result.sheet)).toBe(169);
    expect(characterBattleEquipmentProjection(result.sheet)).toEqual({
      hasShieldEquipped: true,
      isWearingArmor: true,
      mainHandUsesTwoHands: false,
      mainHandWeapon: {
        name: "Longsword",
        damageType: "slashing",
        isMelee: true,
        damageDie: 8,
        versatileDie: 10,
        properties: new Set(["versatile"]),
      },
    });
  });

  it("rejects loadouts that consume one owned weapon twice", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        equipment: {
          backgroundOption: "gold",
          classOption: "gold",
          purchasedCombatEquipment: ["longsword"],
          remainingGoldPieces: 190,
          loadout: {
            wieldedWeapon: "longsword",
            secondaryWeapon: "longsword",
            wieldedWeaponGrip: "oneHanded",
          },
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed finalization");
    expect(result.issues.map((issue) => issue.code)).toContain(
      "invalidLoadoutSecondaryWeapon",
    );
    expect(result.issues.map((issue) => issue.code)).toContain(
      "loadoutConsumesSameWeaponTwice",
    );
  });

  it("rejects two-handed weapons without an explicit two-handed grip", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        equipment: {
          backgroundOption: "package",
          classOption: "packageA",
          purchasedCombatEquipment: [],
          remainingGoldPieces: 18,
          loadout: {
            wieldedWeapon: "greatsword",
          },
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed finalization");
    expect(result.issues.map((issue) => issue.code)).toContain(
      "twoHandedWeaponRequiresTwoHandedGrip",
    );
  });

  it("records missing equipment facts at finalization time", () => {
    const result = finalizeCharacterDraft(
      completeDraft({ equipment: undefined }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed finalization");
    expect(result.openChoices.map((issue) => issue.code)).toContain(
      "missingEquipmentChoices",
    );
  });

  it("rejects missing required canonical facts", () => {
    const result = finalizeCharacterDraft({});

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed finalization");

    expect(result.openChoices.map((issue) => issue.code)).toEqual([
      "missingPrimaryClass",
      "missingClassLevels",
      "missingAdvancement",
      "missingBackground",
      "missingAbilityScoreGeneration",
      "missingBackgroundAbilityScoreIncrease",
      "missingSpecies",
      "missingLanguages",
      "missingAlignment",
      "missingEquipmentChoices",
    ]);
    expect(result.issues).toEqual([]);
  });

  it("distinguishes open choices from illegal issues on the draft boundary", () => {
    const assessment = assessCharacterDraft({
      ...completeDraft(),
      languages: ["Common", "Elvish", "Elvish"],
      choices: {
        ...completeDraft().choices,
        primaryClassSkills: ["acrobatics"],
      },
    });

    expect(assessment.status).toBe("invalid");
    expect(assessment.openChoices.map((choice) => choice.code)).toContain(
      "wrongPrimaryClassSkillChoiceCount",
    );
    expect(assessment.openChoices.map((choice) => choice.code)).toContain(
      "tooFewLanguages",
    );
    expect(assessment.issues.map((issue) => issue.code)).toContain(
      "duplicateLanguages",
    );
    expect(assessment.issues.map((issue) => issue.code)).not.toContain(
      "wrongPrimaryClassSkillChoiceCount",
    );
  });

  it("treats an empty draft as incomplete rather than illegally shaped", () => {
    const assessment = assessCharacterDraft({});

    expect(assessment.status).toBe("incomplete");
    expect(assessment.openChoices.map((choice) => choice.code)).toContain(
      "missingPrimaryClass",
    );
    expect(assessment.issues).toEqual([]);
  });

  it("selectively invalidates only dependent choices when earlier authored facts change", () => {
    const updated = applyCharacterDraftUpdate(completeDraft(), {
      primaryClass: "wizard",
      background: "acolyte",
      species: "dwarf",
    });

    expect(updated.primaryClass).toBe("wizard");
    expect(updated.advancement).toEqual([{ className: "wizard" }]);
    expect(updated.backgroundAbilityScoreIncrease).toBeUndefined();
    expect(updated.choices?.backgroundTool).toBeUndefined();
    expect(updated.choices?.fighterFightingStyle).toBeUndefined();
    expect(updated.choices?.humanOriginFeat).toBeUndefined();
    expect(updated.choices?.primaryClassSkills).toBeUndefined();
    expect(updated.equipment?.loadout?.wieldedWeapon).toBeUndefined();
    expect(updated.equipment?.loadout?.wieldedWeaponGrip).toBeUndefined();
    expect(updated.languages).toEqual(["Common", "Dwarvish", "Elvish"]);
  });

  it("sanitizes fighting style and expertise choices when the owning class levels shrink", () => {
    const updated = applyCharacterDraftUpdate(
      completeDraft({
        primaryClass: "ranger",
        advancement: [
          advancementEntry("ranger"),
          advancementEntry("ranger"),
          advancementEntry("ranger", {
            subclass: { className: "ranger", subclass: "hunter" },
          }),
          advancementEntry("ranger", { feat: alertFeat }),
          advancementEntry("ranger"),
          advancementEntry("ranger"),
          advancementEntry("ranger"),
          advancementEntry("ranger", { feat: alertFeat }),
          advancementEntry("ranger"),
        ],
        background: "acolyte",
        backgroundAbilityScoreIncrease: {
          kind: "plusTwoPlusOne",
          plusTwo: "dex",
          plusOne: "wis",
        },
        species: "elf",
        choices: {
          primaryClassSkills: ["animalHandling", "nature", "survival"],
          rangerDeftExplorerLanguages: ["Sylvan", "Primordial"],
          rangerFightingStyle: "archery",
          expertiseSkills: ["nature", "survival", "perception"],
        },
        spellcasting: {
          ranger: {
            preparedSpells: [
              "aid",
              "cure_wounds",
              "detect_magic",
              "goodberry",
              "longstrider",
              "pass_without_trace",
              "silence",
              "speak_with_animals",
              "spike_growth",
            ],
          },
        },
        equipment: {
          backgroundOption: "package",
          classOption: "packageA",
          purchasedCombatEquipment: [],
          remainingGoldPieces: 7,
          loadout: {
            wieldedWeapon: "longbow",
            wieldedWeaponGrip: "twoHanded",
          },
        },
      }),
      {
        advancement: [advancementEntry("ranger")],
      },
    );

    expect(updated.choices?.rangerFightingStyle).toBeUndefined();
    expect(updated.choices?.expertiseSkills).toBeUndefined();
  });

  it("sanitizes malformed fighting style values instead of carrying them through", () => {
    const updated = applyCharacterDraftUpdate(
      completeDraft({
        choices: {
          ...completeDraft().choices,
          fighterFightingStyle: "notAStyle" as never,
          paladinFightingStyle: "stillNotAStyle" as never,
          rangerFightingStyle: "alsoNotAStyle" as never,
        },
        advancement: [
          advancementEntry("fighter"),
          advancementEntry("paladin"),
          advancementEntry("paladin"),
        ],
        classLevels: {
          ...ZERO_CLASS_LEVELS,
          fighter: 1,
          paladin: 2,
        },
      }),
      {},
    );

    expect(updated.choices?.fighterFightingStyle).toBeUndefined();
    expect(updated.choices?.paladinFightingStyle).toBeUndefined();
    expect(updated.choices?.rangerFightingStyle).toBeUndefined();
  });

  it("previews destructive draft edits without mutating the current draft", () => {
    const current = completeDraft();

    const preview = previewCharacterDraftUpdate(current, {
      primaryClass: "wizard",
      background: "acolyte",
      species: "dwarf",
    });

    expect(current).toEqual(completeDraft());
    expect(preview.candidateDraft).toEqual(
      applyCharacterDraftUpdate(current, {
        primaryClass: "wizard",
        background: "acolyte",
        species: "dwarf",
      }),
    );
    expect(preview.droppedFacts).toEqual([
      {
        path: ["advancement"],
        before: [{ className: "fighter" }],
        after: [{ className: "wizard" }],
      },
      {
        path: ["backgroundAbilityScoreIncrease"],
        before: {
          kind: "plusTwoPlusOne",
          plusTwo: "str",
          plusOne: "con",
        },
      },
      {
        path: ["choices", "primaryClassSkills"],
        before: ["acrobatics", "perception"],
      },
      {
        path: ["choices", "backgroundTool"],
        before: "dice",
      },
      {
        path: ["choices", "speciesSkill"],
        before: "stealth",
      },
      {
        path: ["choices", "fighterFightingStyle"],
        before: "defense",
      },
      {
        path: ["choices", "humanOriginFeat", "feat"],
        before: "skilled",
      },
      {
        path: ["choices", "humanOriginFeat", "proficiencies"],
        before: ["history", "thievesTools", "viol"],
      },
      {
        path: ["equipment", "purchasedCombatEquipment"],
        before: [],
      },
      {
        path: ["equipment", "remainingGoldPieces"],
        before: 18,
      },
      {
        path: ["equipment", "loadout", "wieldedWeapon"],
        before: "greatsword",
      },
      {
        path: ["equipment", "loadout", "wieldedWeaponGrip"],
        before: "twoHanded",
      },
    ]);
    expect(preview.newlyOpenedChoices.map((choice) => choice.code)).toEqual([
      "missingBackgroundAbilityScoreIncrease",
      "missingPrimaryClassSkillChoices",
      "missingRemainingGoldPieces",
      "missingSpellcastingChoices",
    ]);
    expect(preview.newlyIntroducedIssues).toEqual([]);
    expect(preview.candidateAssessment.status).toBe("incomplete");
  });

  it("requires Blessed Warrior cantrips and validates them against the cleric list", () => {
    const draft = completeDraft({
      primaryClass: "paladin",
      advancement: [advancementEntry("paladin"), advancementEntry("paladin")],
      background: "acolyte",
      backgroundAbilityScoreIncrease: {
        kind: "plusTwoPlusOne",
        plusTwo: "wis",
        plusOne: "cha",
      },
      species: "elf",
      languages: ["Common", "Elvish", "Draconic"],
      alignment: "LG",
      choices: {
        primaryClassSkills: ["athletics", "persuasion"],
        speciesSkill: "perception",
        paladinFightingStyle: "blessedWarrior",
      },
      spellcasting: {
        paladin: {
          preparedSpells: ["bless", "cure_wounds", "detect_magic"],
        },
      },
      equipment: {
        backgroundOption: "package",
        classOption: "gold",
        purchasedCombatEquipment: [],
        remainingGoldPieces: 9,
        loadout: {},
      },
    });

    const missingCantrips = finalizeCharacterDraft(draft);
    expect(missingCantrips.ok).toBe(false);
    if (missingCantrips.ok) {
      throw new Error("expected Blessed Warrior to require cantrips");
    }
    expect(missingCantrips.openChoices.map((issue) => issue.code)).toContain(
      "missingCantripChoices",
    );

    const wrongList = finalizeCharacterDraft({
      ...draft,
      spellcasting: {
        paladin: {
          cantrips: ["guidance", "fire_bolt"],
          preparedSpells: ["bless", "cure_wounds", "detect_magic"],
        },
      },
    });
    expect(wrongList.ok).toBe(false);
    if (wrongList.ok) {
      throw new Error("expected cleric-list validation failure");
    }
    expect(wrongList.issues.map((issue) => issue.code)).toContain(
      "cantripNotAvailableForClass",
    );

    const valid = finalizeCharacterDraft({
      ...draft,
      spellcasting: {
        paladin: {
          cantrips: ["guidance", "sacred_flame"],
          preparedSpells: ["bless", "cure_wounds", "detect_magic"],
        },
      },
    });
    expect(valid.ok).toBe(true);
  });

  it("requires Druidic Warrior cantrips and validates them against the druid list", () => {
    const draft = completeDraft({
      primaryClass: "ranger",
      advancement: [advancementEntry("ranger"), advancementEntry("ranger")],
      background: "criminal",
      backgroundAbilityScoreIncrease: {
        kind: "plusTwoPlusOne",
        plusTwo: "dex",
        plusOne: "int",
      },
      species: "elf",
      languages: ["Common", "Elvish", "Draconic"],
      alignment: "NG",
      choices: {
        primaryClassSkills: ["animalHandling", "nature", "survival"],
        speciesSkill: "perception",
        rangerDeftExplorerLanguages: ["Sylvan", "Primordial"],
        rangerFightingStyle: "druidicWarrior",
        expertiseSkills: ["nature"],
      },
      spellcasting: {
        ranger: {
          preparedSpells: ["cure_wounds", "detect_magic", "goodberry"],
        },
      },
      equipment: {
        backgroundOption: "package",
        classOption: "packageA",
        purchasedCombatEquipment: [],
        remainingGoldPieces: 8,
        loadout: {
          wieldedWeapon: "longbow",
          wieldedWeaponGrip: "twoHanded",
        },
      },
    });

    const missingCantrips = finalizeCharacterDraft(draft);
    expect(missingCantrips.ok).toBe(false);
    if (missingCantrips.ok) {
      throw new Error("expected Druidic Warrior to require cantrips");
    }
    expect(missingCantrips.openChoices.map((issue) => issue.code)).toContain(
      "missingCantripChoices",
    );

    const wrongList = finalizeCharacterDraft({
      ...draft,
      spellcasting: {
        ranger: {
          cantrips: ["guidance", "sacred_flame"],
          preparedSpells: ["cure_wounds", "detect_magic", "goodberry"],
        },
      },
    });
    expect(wrongList.ok).toBe(false);
    if (wrongList.ok) {
      throw new Error("expected druid-list validation failure");
    }
    expect(wrongList.issues.map((issue) => issue.code)).toContain(
      "cantripNotAvailableForClass",
    );

    const valid = finalizeCharacterDraft({
      ...draft,
      spellcasting: {
        ranger: {
          cantrips: ["guidance", "produce_flame"],
          preparedSpells: ["cure_wounds", "detect_magic", "goodberry"],
        },
      },
    });
    expect(valid.ok).toBe(true);
  });

  it("drops stray finalized spellcasting entries for classes the sheet does not own", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
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
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected fighter sheet finalization to succeed");
    }
    expect(result.sheet.spellcasting.wizard).toEqual({
      cantrips: [],
      preparedSpells: [],
      spellbook: [],
    });
  });

  it("reopens overspent equipment and spellcasting-dependent extras after earlier choices change", () => {
    const updated = applyCharacterDraftUpdate(
      {
        ...completeDraft({
          primaryClass: "cleric",
          advancement: singleClassAdvancement("cleric", 1),
          background: "acolyte",
          backgroundAbilityScoreIncrease: {
            kind: "plusTwoPlusOne",
            plusTwo: "wis",
            plusOne: "int",
          },
          species: "dwarf",
          choices: {
            primaryClassSkills: ["history", "insight"],
            clericDivineOrder: "thaumaturge",
          },
          spellcasting: {
            cleric: {
              cantrips: ["guidance", "light", "mending", "resistance"],
              preparedSpells: [
                "bless",
                "cure_wounds",
                "detect_magic",
                "guiding_bolt",
              ],
            },
          },
          equipment: {
            backgroundOption: "package",
            classOption: "gold",
            purchasedCombatEquipment: ["chainMail", "shield"],
            remainingGoldPieces: 78,
            loadout: {
              wornArmor: "chainMail",
              shield: true,
            },
          },
        }),
      },
      {
        choices: {
          primaryClassSkills: ["history", "insight"],
          clericDivineOrder: "protector",
        },
        background: "criminal",
      },
    );

    expect(updated.choices?.clericDivineOrder).toBe("protector");
    expect(updated.spellcasting?.cleric?.cantrips).toEqual([
      "guidance",
      "light",
      "mending",
    ]);
    expect(updated.equipment?.purchasedCombatEquipment).toBeUndefined();
    expect(updated.equipment?.remainingGoldPieces).toBeUndefined();
    expect(updated.equipment?.loadout?.wornArmor).toBeUndefined();
    expect(updated.equipment?.loadout?.shield).toBeUndefined();
  });

  it("previews dropped spellcasting and equipment facts after an upstream cleric change", () => {
    const current = completeDraft({
      primaryClass: "cleric",
      advancement: singleClassAdvancement("cleric", 1),
      background: "acolyte",
      backgroundAbilityScoreIncrease: {
        kind: "plusTwoPlusOne",
        plusTwo: "wis",
        plusOne: "int",
      },
      species: "dwarf",
      choices: {
        primaryClassSkills: ["history", "insight"],
        clericDivineOrder: "thaumaturge",
      },
      spellcasting: {
        cleric: {
          cantrips: ["guidance", "light", "mending", "resistance"],
          preparedSpells: [
            "bless",
            "cure_wounds",
            "detect_magic",
            "guiding_bolt",
          ],
        },
      },
      equipment: {
        backgroundOption: "package",
        classOption: "gold",
        purchasedCombatEquipment: ["chainMail", "shield"],
        remainingGoldPieces: 78,
        loadout: {
          wornArmor: "chainMail",
          shield: true,
        },
      },
    });

    const preview = previewCharacterDraftUpdate(current, {
      background: "criminal",
      choices: {
        primaryClassSkills: ["history", "insight"],
        clericDivineOrder: "protector",
      },
    });

    expect(preview.droppedFacts).toEqual([
      {
        path: ["backgroundAbilityScoreIncrease"],
        before: {
          kind: "plusTwoPlusOne",
          plusTwo: "wis",
          plusOne: "int",
        },
      },
      {
        path: ["equipment", "purchasedCombatEquipment"],
        before: ["chainMail", "shield"],
      },
      {
        path: ["equipment", "remainingGoldPieces"],
        before: 78,
      },
      {
        path: ["equipment", "loadout", "wornArmor"],
        before: "chainMail",
      },
      {
        path: ["equipment", "loadout", "shield"],
        before: true,
      },
      {
        path: ["spellcasting", "cleric", "cantrips"],
        before: ["guidance", "light", "mending", "resistance"],
        after: ["guidance", "light", "mending"],
      },
    ]);
    expect(preview.newlyOpenedChoices.map((choice) => choice.code)).toEqual([
      "missingBackgroundAbilityScoreIncrease",
      "missingRemainingGoldPieces",
    ]);
    expect(preview.newlyIntroducedIssues).toEqual([]);
  });

  it("reports sanitized losses inside a carried choices object when an upstream change invalidates them", () => {
    const current = completeDraft();

    const preview = previewCharacterDraftUpdate(current, {
      species: "dwarf",
      choices: current.choices,
    });

    expect(preview.droppedFacts).toEqual([
      {
        path: ["choices", "speciesSkill"],
        before: "stealth",
      },
      {
        path: ["choices", "humanOriginFeat", "feat"],
        before: "skilled",
      },
      {
        path: ["choices", "humanOriginFeat", "proficiencies"],
        before: ["history", "thievesTools", "viol"],
      },
    ]);
    expect(preview.candidateDraft.choices).toEqual({
      primaryClassSkills: ["acrobatics", "perception"],
      backgroundTool: "dice",
      fighterFightingStyle: "defense",
    });
  });

  it("treats omitted nested fields inside whole-object choice patches as direct edits", () => {
    const current = completeDraft();

    const preview = previewCharacterDraftUpdate(current, {
      choices: {
        backgroundTool: "dice",
      },
    });

    expect(preview.droppedFacts).toEqual([]);
    expect(preview.candidateDraft.choices).toEqual({
      backgroundTool: "dice",
    });
    expect(preview.newlyOpenedChoices.map((choice) => choice.code)).toEqual([
      "missingPrimaryClassSkillChoices",
      "missingSpeciesSkillChoice",
      "missingOriginFeatChoice",
      "missingFeatureChoice",
    ]);
  });

  it("previews newly introduced illegal issues without counting direct edits as dropped facts", () => {
    const preview = previewCharacterDraftUpdate(completeDraft(), {
      languages: ["Common", "Elvish", "Elvish"],
    });

    expect(preview.droppedFacts).toEqual([]);
    expect(preview.newlyOpenedChoices.map((choice) => choice.code)).toEqual([
      "tooFewLanguages",
    ]);
    expect(preview.newlyIntroducedIssues.map((issue) => issue.code)).toEqual([
      "duplicateLanguages",
    ]);
    expect(preview.candidateDraft.languages).toEqual([
      "Common",
      "Elvish",
      "Elvish",
    ]);
  });

  it("does not report already-open spellcasting requirements as newly opened when only their messages change", () => {
    const current = completeDraft({
      primaryClass: "wizard",
      advancement: singleClassAdvancement("wizard", 1),
      choices: {
        ...completeDraft().choices,
        primaryClassSkills: ["arcana", "history"],
      },
      spellcasting: {
        wizard: {
          cantrips: ["acid_splash", "fire_bolt"],
          preparedSpells: ["detect_magic"],
          spellbook: ["detect_magic"],
        },
      },
    });

    const currentAssessment = assessCharacterDraft(current);
    expect(currentAssessment.openChoices.map((choice) => choice.code)).toEqual([
      "wrongCantripChoiceCount",
      "wrongPreparedSpellChoiceCount",
      "wrongWizardSpellbookChoiceCount",
    ]);

    const preview = previewCharacterDraftUpdate(current, {
      advancement: singleClassAdvancement("wizard", 2),
    });

    expect(preview.droppedFacts).toEqual([
      {
        path: ["choices", "fighterFightingStyle"],
        before: "defense",
      },
      {
        path: ["equipment", "loadout", "wieldedWeapon"],
        before: "greatsword",
      },
      {
        path: ["equipment", "loadout", "wieldedWeaponGrip"],
        before: "twoHanded",
      },
    ]);
    expect(preview.newlyOpenedChoices.map((choice) => choice.code)).toEqual([
      "missingFeatureChoice",
    ]);
    expect(preview.newlyIntroducedIssues).toEqual([]);
  });

  it("rejects invalid standard-array and language assignments", () => {
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
        languages: ["Common", "Elvish", "Elvish"],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed finalization");
    const codes = [
      ...result.openChoices.map((issue) => issue.code),
      ...result.issues.map((issue) => issue.code),
    ];
    expect(codes).toContain("invalidStandardArray");
    expect(codes).toContain("duplicateLanguages");
    expect(codes).toContain("tooFewLanguages");
  });

  it("derives total level and ability modifiers without storing duplicate state", () => {
    expect(
      totalClassLevels({
        ...ZERO_CLASS_LEVELS,
        fighter: 3,
        rogue: 2,
      }),
    ).toBe(5);

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
    expect([...STANDARD_ARRAY_SCORES]).toEqual([15, 14, 13, 12, 10, 8]);
  });

  it("projects two-die weapon profiles without dropping diceCount", () => {
    expect(projectBattleWeaponProfile("maul")).toEqual({
      name: "Maul",
      damageType: "bludgeoning",
      isMelee: true,
      damageDie: 6,
      diceCount: 2,
      properties: new Set(["heavy", "twoHanded"]),
    });
  });
});
