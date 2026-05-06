import type { CharacterBackground } from "#/character-ability-scores.ts";
import type {
  CharacterArmorTraining,
  CharacterOriginFeatSelection,
  CharacterToolProficiency,
  CharacterWeaponProficiency,
  GamingSet,
} from "#/character-feature-types.ts";
import type { CharacterSpecies } from "#/character-domain.ts";
import type { ClassName } from "#/features/class-tables.ts";
import { SKILLS, type Skill } from "#/monster-types.ts";
import type { Ability } from "#/types.ts";

export const BACKGROUND_SKILLS: Readonly<
  Record<CharacterBackground, readonly [Skill, Skill]>
> = {
  acolyte: ["insight", "religion"],
  criminal: ["sleightOfHand", "stealth"],
  sage: ["arcana", "history"],
  soldier: ["athletics", "intimidation"],
};

export const BACKGROUND_FIXED_ORIGIN_FEATS: Readonly<
  Record<CharacterBackground, CharacterOriginFeatSelection>
> = {
  acolyte: { feat: "magicInitiateCleric" },
  criminal: { feat: "alert" },
  sage: { feat: "magicInitiateWizard" },
  soldier: { feat: "savageAttacker" },
};

export interface ClassProficiencyData {
  readonly savingThrows: readonly [Ability, Ability];
  readonly armorTraining: ReadonlyArray<CharacterArmorTraining>;
  readonly weaponProficiencies: ReadonlyArray<CharacterWeaponProficiency>;
  readonly skillChoiceCount: number;
  readonly availableSkills: ReadonlyArray<Skill>;
}

export const PRIMARY_CLASS_PROFICIENCIES: Readonly<
  Record<ClassName, ClassProficiencyData>
> = {
  barbarian: {
    savingThrows: ["str", "con"],
    armorTraining: ["light", "medium", "shield"],
    weaponProficiencies: ["simple", "martial"],
    skillChoiceCount: 2,
    availableSkills: [
      "animalHandling",
      "athletics",
      "intimidation",
      "nature",
      "perception",
      "survival",
    ],
  },
  bard: {
    savingThrows: ["dex", "cha"],
    armorTraining: ["light"],
    weaponProficiencies: ["simple"],
    skillChoiceCount: 3,
    availableSkills: [...SKILLS],
  },
  cleric: {
    savingThrows: ["wis", "cha"],
    armorTraining: ["light", "medium", "shield"],
    weaponProficiencies: ["simple"],
    skillChoiceCount: 2,
    availableSkills: [
      "history",
      "insight",
      "medicine",
      "persuasion",
      "religion",
    ],
  },
  druid: {
    savingThrows: ["int", "wis"],
    armorTraining: ["light", "shield"],
    weaponProficiencies: ["simple"],
    skillChoiceCount: 2,
    availableSkills: [
      "animalHandling",
      "arcana",
      "insight",
      "medicine",
      "nature",
      "perception",
      "religion",
      "survival",
    ],
  },
  fighter: {
    savingThrows: ["str", "con"],
    armorTraining: ["light", "medium", "heavy", "shield"],
    weaponProficiencies: ["simple", "martial"],
    skillChoiceCount: 2,
    availableSkills: [
      "acrobatics",
      "animalHandling",
      "athletics",
      "history",
      "insight",
      "intimidation",
      "persuasion",
      "perception",
      "survival",
    ],
  },
  monk: {
    savingThrows: ["str", "dex"],
    armorTraining: [],
    weaponProficiencies: ["simple", "martialLight"],
    skillChoiceCount: 2,
    availableSkills: [
      "acrobatics",
      "athletics",
      "history",
      "insight",
      "religion",
      "stealth",
    ],
  },
  paladin: {
    savingThrows: ["wis", "cha"],
    armorTraining: ["light", "medium", "heavy", "shield"],
    weaponProficiencies: ["simple", "martial"],
    skillChoiceCount: 2,
    availableSkills: [
      "athletics",
      "insight",
      "intimidation",
      "medicine",
      "persuasion",
      "religion",
    ],
  },
  ranger: {
    savingThrows: ["str", "dex"],
    armorTraining: ["light", "medium", "shield"],
    weaponProficiencies: ["simple", "martial"],
    skillChoiceCount: 3,
    availableSkills: [
      "animalHandling",
      "athletics",
      "insight",
      "investigation",
      "nature",
      "perception",
      "stealth",
      "survival",
    ],
  },
  rogue: {
    savingThrows: ["dex", "int"],
    armorTraining: ["light"],
    weaponProficiencies: ["simple", "martialFinesseOrLight"],
    skillChoiceCount: 4,
    availableSkills: [
      "acrobatics",
      "athletics",
      "deception",
      "insight",
      "intimidation",
      "investigation",
      "perception",
      "persuasion",
      "sleightOfHand",
      "stealth",
    ],
  },
  sorcerer: {
    savingThrows: ["con", "cha"],
    armorTraining: [],
    weaponProficiencies: ["simple"],
    skillChoiceCount: 2,
    availableSkills: [
      "arcana",
      "deception",
      "insight",
      "intimidation",
      "persuasion",
      "religion",
    ],
  },
  warlock: {
    savingThrows: ["wis", "cha"],
    armorTraining: ["light"],
    weaponProficiencies: ["simple"],
    skillChoiceCount: 2,
    availableSkills: [
      "arcana",
      "deception",
      "history",
      "intimidation",
      "investigation",
      "nature",
      "religion",
    ],
  },
  wizard: {
    savingThrows: ["int", "wis"],
    armorTraining: [],
    weaponProficiencies: ["simple"],
    skillChoiceCount: 2,
    availableSkills: [
      "arcana",
      "history",
      "insight",
      "investigation",
      "medicine",
      "nature",
      "religion",
    ],
  },
};

export interface MulticlassProficiencyData {
  readonly armorTraining: ReadonlyArray<CharacterArmorTraining>;
  readonly weaponProficiencies: ReadonlyArray<CharacterWeaponProficiency>;
  readonly skillChoiceCount: number;
  readonly availableSkills: ReadonlyArray<Skill>;
}

export const MULTICLASS_PROFICIENCIES: Readonly<
  Record<ClassName, MulticlassProficiencyData>
> = {
  barbarian: {
    armorTraining: ["shield"],
    weaponProficiencies: ["simple", "martial"],
    skillChoiceCount: 0,
    availableSkills: [],
  },
  bard: {
    armorTraining: ["light"],
    weaponProficiencies: [],
    skillChoiceCount: 1,
    availableSkills: [...SKILLS],
  },
  cleric: {
    armorTraining: ["light", "medium", "shield"],
    weaponProficiencies: [],
    skillChoiceCount: 0,
    availableSkills: [],
  },
  druid: {
    armorTraining: ["light", "shield"],
    weaponProficiencies: [],
    skillChoiceCount: 0,
    availableSkills: [],
  },
  fighter: {
    armorTraining: ["light", "medium", "shield"],
    weaponProficiencies: ["martial"],
    skillChoiceCount: 0,
    availableSkills: [],
  },
  monk: {
    armorTraining: [],
    weaponProficiencies: [],
    skillChoiceCount: 0,
    availableSkills: [],
  },
  paladin: {
    armorTraining: ["light", "medium", "shield"],
    weaponProficiencies: ["martial"],
    skillChoiceCount: 0,
    availableSkills: [],
  },
  ranger: {
    armorTraining: ["light", "medium", "shield"],
    weaponProficiencies: ["martial"],
    skillChoiceCount: 1,
    availableSkills: PRIMARY_CLASS_PROFICIENCIES.ranger.availableSkills,
  },
  rogue: {
    armorTraining: ["light"],
    weaponProficiencies: [],
    skillChoiceCount: 1,
    availableSkills: PRIMARY_CLASS_PROFICIENCIES.rogue.availableSkills,
  },
  sorcerer: {
    armorTraining: [],
    weaponProficiencies: [],
    skillChoiceCount: 0,
    availableSkills: [],
  },
  warlock: {
    armorTraining: ["light"],
    weaponProficiencies: ["simple"],
    skillChoiceCount: 0,
    availableSkills: [],
  },
  wizard: {
    armorTraining: [],
    weaponProficiencies: [],
    skillChoiceCount: 0,
    availableSkills: [],
  },
};

export const ELF_KEEN_SENSES_SKILLS = [
  "insight",
  "perception",
  "survival",
] as const satisfies ReadonlyArray<Skill>;

export function speciesGrantsSkill(species: CharacterSpecies): boolean {
  return species === "elf" || species === "human";
}

export function validSpeciesSkillChoice(
  species: CharacterSpecies,
  skill: Skill,
): boolean {
  if (species === "elf") {
    return (ELF_KEEN_SENSES_SKILLS as ReadonlyArray<Skill>).includes(skill);
  }
  return species === "human";
}

export function backgroundToolProficiencies(
  background: CharacterBackground,
  choice: GamingSet | undefined,
): ReadonlyArray<CharacterToolProficiency> {
  switch (background) {
    case "acolyte":
    case "sage":
      return ["calligraphersSupplies"];
    case "criminal":
      return ["thievesTools"];
    case "soldier":
      return choice == null ? [] : [choice];
  }
}
