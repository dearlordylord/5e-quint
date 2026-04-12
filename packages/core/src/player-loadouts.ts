import type { InitCreatureConfig } from "#/battle-machine-types.ts";
import {
  characterBattleEquipmentProjection,
  finalizeCharacterDraft,
  singleClassAdvancement,
  type CharacterSheet,
} from "#/character-domain.ts";

function canonicalFighterStartBattleSheet(): CharacterSheet {
  const result = finalizeCharacterDraft({
    primaryClass: "fighter",
    advancement: singleClassAdvancement("fighter", 1),
    background: "soldier",
    abilityScoreGeneration: {
      mode: "standardArray",
      assignedScores: {
        str: 15,
        dex: 14,
        con: 13,
        int: 12,
        wis: 10,
        cha: 8,
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
      primaryClassSkills: ["animalHandling", "perception"],
      backgroundTool: "dice",
      speciesSkill: "survival",
      humanOriginFeat: { feat: "alert" },
    },
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
  });

  if (!result.ok) {
    throw new Error(
      `canonical fighter start-battle sheet is invalid: ${result.issues
        .map((issue) => issue.code)
        .join(", ")}`,
    );
  }

  return result.sheet;
}

/**
 * Transitional MCP battle starter backed by the canonical character sheet.
 *
 * This remains a helper until MCP can accept a caller-provided sheet directly,
 * but the projected battle-facing loadout now comes from owned sheet facts
 * rather than a hardcoded weapon preset.
 */
export function fighterStartBattleLoadout(): Pick<
  InitCreatureConfig,
  | "hasShieldEquipped"
  | "isWearingArmor"
  | "mainHandUsesTwoHands"
  | "mainHandWeapon"
  | "offHandWeapon"
> {
  return characterBattleEquipmentProjection(canonicalFighterStartBattleSheet());
}
