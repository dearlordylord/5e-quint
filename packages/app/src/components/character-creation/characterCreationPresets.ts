import type { CharacterDraft, CharacterLevelUpTransition } from "@dnd/core/character-domain.ts"
import {
  advanceCharacterSheet,
  characterDraftFromSheet,
  finalizeCharacterDraft,
  previewCharacterSheetAdvancement,
  singleClassAdvancement
} from "@dnd/core/character-domain.ts"

export const FIGHTER_EXAMPLE_DRAFT: CharacterDraft = {
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
    fighterFightingStyle: "defense",
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

const FIGHTER_LEVEL5_TRANSITIONS: ReadonlyArray<CharacterLevelUpTransition> = [
  { entry: { className: "fighter" } },
  { entry: { className: "fighter", subclass: { className: "fighter", subclass: "champion" } } },
  {
    entry: {
      className: "fighter",
      feat: { slot: "feat", choice: { tag: "abilityScoreImprovement", abilities: ["str", "str"] } }
    }
  },
  { entry: { className: "fighter" } }
]

function buildAdvancedExampleDraft(
  draft: CharacterDraft,
  transitions: ReadonlyArray<CharacterLevelUpTransition>
): CharacterDraft {
  const finalized = finalizeCharacterDraft(draft)
  if (!finalized.ok) throw new Error("expected example draft to finalize")

  let sheet = finalized.sheet
  for (const transition of transitions) {
    const preview = previewCharacterSheetAdvancement(sheet, transition)
    if (preview.candidateAssessment.status !== "complete") {
      throw new Error("expected example advancement preview to stay complete")
    }

    const advanced = advanceCharacterSheet(sheet, transition)
    if (!advanced.ok) throw new Error("expected example advancement transition to finalize")
    sheet = advanced.sheet
  }

  return characterDraftFromSheet(sheet)
}

export const FIGHTER_LEVEL5_EXAMPLE_DRAFT: CharacterDraft = buildAdvancedExampleDraft(
  FIGHTER_EXAMPLE_DRAFT,
  FIGHTER_LEVEL5_TRANSITIONS
)

export const CLERIC_EXAMPLE_DRAFT: CharacterDraft = {
  primaryClass: "cleric",
  advancement: singleClassAdvancement("cleric", 1),
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
