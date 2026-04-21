import { describe, expect, it } from "vitest";

import { finalizeCharacterDraft } from "#/character-domain.ts";
import {
  characterSheetBattleProjection,
  characterSheetCreatureProjection,
  characterSheetMachineInput,
  deriveCharacterSheetNumbers,
} from "#/character-sheet-derived.ts";
import type { ClassName } from "#/features/class-tables.ts";
import { makeSpellLibrary, SRD_SPELLS } from "#/features/spell-registry.ts";
import { CreatureId } from "#/types.ts";

const SPELL_LIBRARY = makeSpellLibrary(SRD_SPELLS);

const MAGE_ARMOR_RECORD = {
  tag: "PPRSetBaseAc" as const,
  value: {
    source: {
      unitId: "mage_armor",
      unitKind: "PUKSpell" as const,
      unitName: "Mage Armor",
    },
    attachment: "PPAChosenTarget" as const,
    baseArmorClass: 13,
    abilityModifier: "dex" as const,
    earlyEnds: ["PPEETargetDonsArmor"] as const,
  },
};

describe("character-sheet-derived", () => {
  const alertFeat = {
    slot: "feat",
    choice: { tag: "feat", featId: "alert" },
  } as const;

  function advancementEntry(
    className: ClassName,
    entry: Omit<
      NonNullable<
        Parameters<typeof finalizeCharacterDraft>[0]["advancement"]
      >[number],
      "className"
    > = {},
  ): NonNullable<
    Parameters<typeof finalizeCharacterDraft>[0]["advancement"]
  >[number] {
    return { className, ...entry };
  }

  function finalizeSorcererSheet() {
    const result = finalizeCharacterDraft({
      primaryClass: "sorcerer",
      advancement: [
        advancementEntry("sorcerer"),
        advancementEntry("sorcerer"),
        advancementEntry("sorcerer", {
          subclass: { className: "sorcerer", subclass: "draconic" },
        }),
        advancementEntry("sorcerer", { feat: alertFeat }),
        advancementEntry("sorcerer"),
      ],
      background: "acolyte",
      abilityScoreGeneration: {
        mode: "randomGeneration",
        assignedScores: {
          str: 8,
          dex: 14,
          con: 13,
          int: 10,
          wis: 12,
          cha: 16,
        },
      },
      backgroundAbilityScoreIncrease: {
        kind: "plusTwoPlusOne",
        plusTwo: "cha",
        plusOne: "int",
      },
      species: "elf",
      languages: ["Common", "Elvish", "Draconic"],
      alignment: "CG",
      choices: {
        primaryClassSkills: ["arcana", "persuasion"],
        speciesSkill: "perception",
      },
      spellcasting: {
        sorcerer: {
          cantrips: [
            "fire_bolt",
            "light",
            "mage_hand",
            "minor_illusion",
            "sorcerous_burst",
          ],
          preparedSpells: [
            "burning_hands",
            "charm_person",
            "detect_magic",
            "fireball",
            "haste",
            "hold_person",
            "magic_missile",
            "sleep",
            "suggestion",
          ],
        },
      },
      equipment: {
        backgroundOption: "package",
        classOption: "gold",
        purchasedCombatEquipment: ["quarterstaff"],
        remainingGoldPieces: 42,
        loadout: {
          wieldedWeapon: "quarterstaff",
          wieldedWeaponGrip: "twoHanded",
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(
        `expected successful sorcerer finalization: ${result.issues
          .map((issue) => issue.code)
          .join(", ")}`,
      );
    }
    return result.sheet;
  }

  function finalizeRogueSheet() {
    const result = finalizeCharacterDraft({
      primaryClass: "rogue",
      advancement: [advancementEntry("rogue")],
      background: "criminal",
      abilityScoreGeneration: {
        mode: "standardArray",
        assignedScores: {
          str: 8,
          dex: 15,
          con: 13,
          int: 12,
          wis: 14,
          cha: 10,
        },
      },
      backgroundAbilityScoreIncrease: {
        kind: "plusTwoPlusOne",
        plusTwo: "dex",
        plusOne: "int",
      },
      species: "elf",
      languages: ["Common", "Elvish", "Draconic"],
      alignment: "CN",
      choices: {
        primaryClassSkills: [
          "acrobatics",
          "athletics",
          "investigation",
          "persuasion",
        ],
        speciesSkill: "perception",
        rogueLanguage: "Sylvan",
        expertiseSkills: ["stealth", "perception"],
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
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(
        `expected successful rogue finalization: ${result.issues
          .map((issue) => issue.code)
          .join(", ")}`,
      );
    }
    return result.sheet;
  }

  function finalizeWizardScholarSheet() {
    const result = finalizeCharacterDraft({
      primaryClass: "wizard",
      advancement: [advancementEntry("wizard"), advancementEntry("wizard")],
      background: "sage",
      abilityScoreGeneration: {
        mode: "standardArray",
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
    if (!result.ok) {
      throw new Error(
        `expected successful wizard scholar finalization: ${result.issues
          .map((issue) => issue.code)
          .join(", ")}`,
      );
    }
    return result.sheet;
  }

  it("requires owned spellcasting choices before finalizing a spellcaster", () => {
    const result = finalizeCharacterDraft({
      primaryClass: "wizard",
      advancement: [advancementEntry("wizard")],
      background: "sage",
      abilityScoreGeneration: {
        mode: "standardArray",
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

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected spellcasting finalization failure");
    }
    expect(result.openChoices.map((issue) => issue.code)).toContain(
      "missingSpellcastingChoices",
    );
  });

  it("validates class-specific spell levels instead of multiclass slot levels", () => {
    const result = finalizeCharacterDraft({
      primaryClass: "ranger",
      advancement: [
        advancementEntry("ranger"),
        advancementEntry("ranger"),
        advancementEntry("ranger", {
          subclass: { className: "ranger", subclass: "hunter" },
        }),
        advancementEntry("ranger", { feat: alertFeat }),
        advancementEntry("sorcerer"),
        advancementEntry("sorcerer"),
        advancementEntry("sorcerer", {
          subclass: { className: "sorcerer", subclass: "draconic" },
        }),
      ],
      background: "soldier",
      abilityScoreGeneration: {
        mode: "standardArray",
        assignedScores: {
          str: 10,
          dex: 15,
          con: 13,
          int: 8,
          wis: 14,
          cha: 12,
        },
      },
      backgroundAbilityScoreIncrease: { kind: "plusOneToThree" },
      species: "human",
      languages: ["Common", "Elvish", "Dwarvish"],
      alignment: "NG",
      choices: {
        primaryClassSkills: ["animalHandling", "survival", "perception"],
        speciesSkill: "nature",
        humanOriginFeat: { feat: "alert" },
      },
      spellcasting: {
        ranger: {
          preparedSpells: ["spike_growth", "cure_wounds", "longstrider", "aid"],
        },
        sorcerer: {
          cantrips: ["fire_bolt", "light", "mage_hand", "minor_illusion"],
          preparedSpells: [
            "burning_hands",
            "charm_person",
            "detect_magic",
            "magic_missile",
            "hold_person",
            "sleep",
          ],
        },
      },
      equipment: {
        backgroundOption: "package",
        classOption: "packageA",
        purchasedCombatEquipment: [],
        remainingGoldPieces: 10,
        loadout: {
          wieldedWeapon: "longbow",
          wieldedWeaponGrip: "twoHanded",
        },
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected invalid ranger spell level");
    }
    expect(result.issues.map((issue) => issue.code)).toContain(
      "spellLevelNotCastableForClass",
    );
  });

  it("projects character-owned fighting styles and expertise into creature input", () => {
    const fighterResult = finalizeCharacterDraft({
      primaryClass: "fighter",
      advancement: [advancementEntry("fighter")],
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
    });

    expect(fighterResult.ok).toBe(true);
    if (!fighterResult.ok) {
      throw new Error("expected successful fighter finalization");
    }

    const fighterProjection = characterSheetCreatureProjection(
      fighterResult.sheet,
    );
    expect(fighterProjection.fightingStyles).toEqual(new Set(["defense"]));

    const rogueProjection =
      characterSheetCreatureProjection(finalizeRogueSheet());
    expect(rogueProjection.expertiseSkills).toEqual(
      new Set(["stealth", "perception"]),
    );

    const wizardProjection = characterSheetCreatureProjection(
      finalizeWizardScholarSheet(),
    );
    expect(wizardProjection.expertiseSkills).toEqual(
      new Set(["investigation"]),
    );
  });

  it("derives sheet numbers and runtime projections from one owned path", () => {
    const sheet = finalizeSorcererSheet();
    const derived = deriveCharacterSheetNumbers(sheet);
    const projection = characterSheetCreatureProjection(sheet);
    const machineInput = characterSheetMachineInput(sheet);
    const battleProjection = characterSheetBattleProjection(sheet, SPELL_LIBRARY);

    expect(derived).toMatchObject({
      proficiencyBonus: 3,
      maxHp: 27,
      armorClass: 12,
      baseWalkSpeed: 30,
      initiativeModifier: 2,
      initiativeScore: 12,
      passivePerception: 14,
      savingThrowModifiers: {
        cha: 7,
        con: 4,
        dex: 2,
        int: 0,
        str: -1,
        wis: 1,
      },
      skillModifiers: {
        arcana: 3,
        perception: 4,
        persuasion: 7,
      },
    });
    expect(derived.hitDiceRemaining.sorcerer).toBe(5);
    expect(derived.spellcasting.classes).toHaveLength(1);
    expect(derived.spellcasting.classes[0]).toMatchObject({
      className: "sorcerer",
      spellSaveDC: 15,
      spellAttackBonus: 7,
    });
    expect([...derived.spellcasting.preparedSpells]).toEqual([
      "burning_hands",
      "charm_person",
      "detect_magic",
      "fireball",
      "haste",
      "hold_person",
      "magic_missile",
      "sleep",
      "suggestion",
    ]);
    expect(derived.spellcasting.slotsMax).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);

    expect(projection.creatureSize).toBe("medium");
    expect(projection.subclasses).toEqual([
      { className: "sorcerer", subclass: "draconic" },
    ]);
    expect(projection.fightingStyles).toEqual(new Set());
    expect(projection.saveProficiencies).toEqual(new Set(["con", "cha"]));
    expect(projection.skillProficiencies).toEqual(
      new Set(["insight", "religion", "arcana", "persuasion", "perception"]),
    );
    expect(projection.expertiseSkills).toEqual(new Set());
    expect(projection.armorProficiencies).toEqual(new Set());
    expect(projection.hitDieType).toBe(6);
    expect(projection.spellcastingAbility).toBe("cha");
    expect(projection.hasSpellcasting).toBe(true);
    expect(projection.unarmoredDefense).toBe("none");
    expect(projection.features).toEqual(new Set());
    expect(projection.critRange).toBe(20);
    expect(projection.hasFightingStyleFeature).toBe(false);

    expect(machineInput.maxHp).toBe(27);
    expect(machineInput.conMod).toBe(1);
    expect(machineInput.baseWalkSpeed).toBe(30);
    expect(machineInput.sorcererLevel).toBe(5);
    expect(machineInput.preparedSpells).toEqual(
      derived.spellcasting.preparedSpells,
    );
    expect(machineInput.preparedSpellSaveDCs).toEqual(
      derived.spellcasting.preparedSpellSaveDCs,
    );
    expect(machineInput.slotsMax).toEqual(derived.spellcasting.slotsMax);
    expect(machineInput.slotsCurrent).toEqual(
      derived.spellcasting.slotsCurrent,
    );

    expect(battleProjection.maxHp).toBe(27);
    expect(battleProjection.baseArmorClass).toBe(12);
    expect(battleProjection.baseWalkSpeed).toBe(30);
    expect(battleProjection.strMod).toBe(-1);
    expect(battleProjection.dexMod).toBe(2);
    expect(battleProjection.caster).toBe(true);
    expect(battleProjection.spellAccesses).toEqual(
      [...derived.spellcasting.preparedSpells].map((currentSpellId) => ({
        tag: "prepared",
        accessId: `prepared:${currentSpellId}`,
        projection: expect.objectContaining({
          reactionResolution: "none",
        }),
        spellId: currentSpellId,
        spellSaveDC:
          derived.spellcasting.preparedSpellSaveDCs.get(currentSpellId)!,
        resourcePath: { kind: "spellSlotLadder" },
      })),
    );
    expect(battleProjection.slotsMax).toEqual(derived.spellcasting.slotsMax);
    expect(battleProjection.mainHandWeapon?.name).toBe("Quarterstaff");
  });

  it("threads active projected persistents through battle projection without storing them on the sheet", () => {
    const sheet = finalizeSorcererSheet();
    const activeProjectedPersistents = new Set([
      {
        record: MAGE_ARMOR_RECORD,
        casterId: CreatureId("mage"),
        targetId: CreatureId("mage"),
      },
    ]);

    const battleProjection = characterSheetBattleProjection(sheet, SPELL_LIBRARY, {
      activeProjectedPersistents,
    });

    expect(battleProjection.activeProjectedPersistents).toBe(
      activeProjectedPersistents,
    );
  });

  it("projects spellcasting ability from the first caster class on the advancement path", () => {
    const sheet = finalizeSorcererSheet();
    const projection = characterSheetCreatureProjection({
      ...sheet,
      primaryClass: "fighter",
      advancement: [advancementEntry("fighter"), advancementEntry("wizard")],
    });

    expect(projection.hasSpellcasting).toBe(true);
    expect(projection.spellcastingAbility).toBe("int");
  });

  it("does not grant Champion crit ranges without a Champion subclass selection", () => {
    const sheet = finalizeSorcererSheet();

    const levelThreeWithoutChampion = characterSheetCreatureProjection({
      ...sheet,
      primaryClass: "fighter",
      advancement: [
        advancementEntry("fighter"),
        advancementEntry("fighter"),
        advancementEntry("fighter"),
      ],
    });
    const levelFifteenWithoutChampion = characterSheetCreatureProjection({
      ...sheet,
      primaryClass: "fighter",
      advancement: Array.from({ length: 15 }, () =>
        advancementEntry("fighter"),
      ),
    });

    expect(levelThreeWithoutChampion.critRange).toBe(20);
    expect(levelFifteenWithoutChampion.critRange).toBe(20);
  });
});
