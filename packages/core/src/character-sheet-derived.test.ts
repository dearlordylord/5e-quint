import { describe, expect, it } from "vitest";

import { finalizeCharacterDraft } from "#/character-domain.ts";
import {
  characterSheetBattleProjection,
  characterSheetMachineInput,
  deriveCharacterSheetNumbers,
} from "#/character-sheet-derived.ts";
import type { ClassName } from "#/features/class-tables.ts";

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
    expect(result.issues.map((issue) => issue.code)).toContain(
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

  it("derives sheet numbers and runtime projections from one owned path", () => {
    const sheet = finalizeSorcererSheet();
    const derived = deriveCharacterSheetNumbers(sheet);
    const machineInput = characterSheetMachineInput(sheet);
    const battleProjection = characterSheetBattleProjection(sheet);

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

    expect(machineInput.maxHp).toBe(27);
    expect(machineInput.conMod).toBe(1);
    expect(machineInput.baseWalkSpeed).toBe(30);
    expect(machineInput.sorcererLevel).toBe(5);
    expect(machineInput.preparedSpells).toEqual(
      derived.spellcasting.preparedSpells,
    );
    expect(machineInput.slotsMax).toEqual(derived.spellcasting.slotsMax);
    expect(machineInput.slotsCurrent).toEqual(
      derived.spellcasting.slotsCurrent,
    );

    expect(battleProjection.maxHp).toBe(27);
    expect(battleProjection.baseArmorClass).toBe(12);
    expect(battleProjection.baseWalkSpeed).toBe(30);
    expect(battleProjection.dexMod).toBe(2);
    expect(battleProjection.caster).toBe(true);
    expect(battleProjection.preparedSpells).toEqual(
      derived.spellcasting.preparedSpells,
    );
    expect(battleProjection.slotsMax).toEqual(derived.spellcasting.slotsMax);
    expect(
      battleProjection.readyableSpellPayloads!.get("fireball")?.release.saveDC,
    ).toBe(15);
    expect(
      battleProjection.readyableSpellPayloads!.get("hold_person")?.release
        .saveDC,
    ).toBe(15);
  });
});
