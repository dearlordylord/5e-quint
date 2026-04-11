import { describe, expect, it } from "vitest";

import {
  abilityModifiersFromScores,
  characterBattleEquipmentProjection,
  characterClassResources,
  characterOriginFeats,
  characterProficiencySummary,
  finalizeCharacterDraft,
  finalAbilityModifiers,
  ownedCombatEquipment,
  POINT_BUY_BUDGET,
  projectBattleWeaponProfile,
  startingGoldPieces,
  type CharacterDraft,
  deriveProficiencyBonus,
  singleClassLevels,
  STANDARD_ARRAY_SCORES,
  totalClassLevels,
  totalPointBuyCost,
  ZERO_CLASS_LEVELS,
} from "#/character-domain.ts";

describe("character-domain", () => {
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
      choices: {
        primaryClassSkills: ["acrobatics", "perception"],
        backgroundTool: "dice",
        speciesSkill: "stealth",
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
    expect(result.sheet.classLevels).toEqual({
      ...ZERO_CLASS_LEVELS,
      fighter: 1,
    });
    expect(result.sheet.equipment).toEqual({
      backgroundOption: "package",
      classOption: "packageA",
      purchasedCombatEquipment: [],
      remainingGoldPieces: 18,
      loadout: {
        wieldedWeapon: "greatsword",
        wieldedWeaponGrip: "twoHanded",
      },
    });
    expect(totalClassLevels(result.sheet.classLevels)).toBe(1);
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
    expect(result.issues.map((issue) => issue.code)).toContain(
      "missingSpeciesSkillChoice",
    );
  });

  it("rejects fighter subclasses unless fighter itself is level 3+", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        primaryClass: "wizard",
        classLevels: {
          ...ZERO_CLASS_LEVELS,
          fighter: 1,
          wizard: 3,
        },
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
          subclassSelections: {
            fighter: { className: "fighter", subclass: "champion" },
            wizard: { className: "wizard", subclass: "evoker" },
          },
        },
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed finalization");
    expect(result.issues.map((issue) => issue.code)).toContain(
      "prematureSubclassSelection",
    );
  });

  it("validates multiclass prerequisites on the final ability scores", () => {
    const result = finalizeCharacterDraft(
      completeDraft({
        primaryClass: "fighter",
        classLevels: {
          ...ZERO_CLASS_LEVELS,
          fighter: 1,
          wizard: 1,
        },
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
        classLevels: {
          ...ZERO_CLASS_LEVELS,
          bard: 5,
          cleric: 2,
          paladin: 3,
          ranger: 6,
          sorcerer: 2,
          warlock: 2,
        },
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
          subclassSelections: {
            bard: { className: "bard", subclass: "lore" },
            paladin: { className: "paladin", subclass: "devotion" },
            ranger: { className: "ranger", subclass: "hunter" },
          },
          multiclassSkills: {
            bard: ["history"],
            ranger: ["survival"],
          },
          multiclassBardInstrument: "lute",
          rangerDeftExplorerLanguages: ["Sylvan", "Primordial"],
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
      classLevels: { ...ZERO_CLASS_LEVELS, ranger: 14 },
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
        rangerDeftExplorerLanguages: ["Primordial", "Undercommon"],
        subclassSelections: {
          ranger: { className: "ranger", subclass: "hunter" },
        },
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
    expect(result.issues.map((issue) => issue.code)).toContain(
      "missingEquipmentChoices",
    );
  });

  it("rejects missing required canonical facts", () => {
    const result = finalizeCharacterDraft({});

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failed finalization");

    expect(result.issues.map((issue) => issue.code)).toEqual([
      "missingPrimaryClass",
      "missingClassLevels",
      "invalidTotalLevel",
      "missingBackground",
      "missingAbilityScoreGeneration",
      "missingBackgroundAbilityScoreIncrease",
      "missingSpecies",
      "missingLanguages",
      "missingAlignment",
      "missingEquipmentChoices",
    ]);
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
    const codes = result.issues.map((issue) => issue.code);
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
