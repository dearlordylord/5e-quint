import type { CharacterDraft } from "@dnd/core/character-domain.ts"
import { singleClassLevels } from "@dnd/core/character-domain.ts"

export const FIGHTER_EXAMPLE_DRAFT: CharacterDraft = {
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
      cha: 12
    }
  },
  backgroundAbilityScoreIncrease: {
    kind: "plusTwoPlusOne",
    plusTwo: "str",
    plusOne: "con"
  },
  species: "human",
  languages: ["Common", "Dwarvish", "Elvish"],
  alignment: "NG",
  choices: {
    primaryClassSkills: ["acrobatics", "perception"],
    backgroundTool: "dice",
    speciesSkill: "stealth",
    humanOriginFeat: {
      feat: "alert"
    }
  },
  equipment: {
    backgroundOption: "package",
    classOption: "packageA",
    purchasedCombatEquipment: [],
    remainingGoldPieces: 18,
    loadout: {
      wieldedWeapon: "greatsword",
      wieldedWeaponGrip: "twoHanded"
    }
  }
}

export const CLERIC_EXAMPLE_DRAFT: CharacterDraft = {
  primaryClass: "cleric",
  classLevels: singleClassLevels("cleric", 1),
  background: "acolyte",
  abilityScoreGeneration: {
    mode: "standardArray",
    assignedScores: {
      str: 14,
      dex: 8,
      con: 13,
      int: 10,
      wis: 15,
      cha: 12
    }
  },
  backgroundAbilityScoreIncrease: {
    kind: "plusTwoPlusOne",
    plusTwo: "wis",
    plusOne: "cha"
  },
  species: "dwarf",
  languages: ["Common", "Dwarvish", "Giant"],
  alignment: "LG",
  choices: {
    primaryClassSkills: ["medicine", "history"],
    clericDivineOrder: "protector"
  },
  equipment: {
    backgroundOption: "package",
    classOption: "packageA",
    purchasedCombatEquipment: [],
    remainingGoldPieces: 7,
    loadout: {
      wieldedWeapon: "mace",
      wieldedWeaponGrip: "oneHanded",
      shield: true,
      wornArmor: "chainShirt"
    }
  },
  spellcasting: {
    cleric: {
      cantrips: ["guidance", "sacred_flame", "thaumaturgy"],
      preparedSpells: ["bless", "cure_wounds", "detect_magic", "guiding_bolt"]
    }
  }
}
