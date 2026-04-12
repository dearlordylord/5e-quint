import {
  characterSubclassSelections,
  type CharacterSheet,
} from "#/character-domain.ts";
import type {
  ArtisanTool,
  CharacterGrantedLanguage,
  CharacterOriginFeatSelection,
  CharacterProficiencySummary,
  CharacterToolProficiency,
  GamingSet,
  MusicalInstrument,
} from "#/character-feature-types.ts";
import {
  ARTISAN_TOOLS,
  GAMING_SETS,
  MUSICAL_INSTRUMENTS,
} from "#/character-feature-types.ts";
import {
  BACKGROUND_FIXED_ORIGIN_FEATS,
  BACKGROUND_SKILLS,
  MULTICLASS_PROFICIENCIES,
  PRIMARY_CLASS_PROFICIENCIES,
  backgroundToolProficiencies,
} from "#/character-proficiency-data.ts";
import { CLASS_NAMES } from "#/features/class-tables.ts";
import { SKILLS, type Skill } from "#/monster-types.ts";
import type { Ability } from "#/types.ts";

export { SKILLS, type Skill } from "#/monster-types.ts";
export {
  BACKGROUND_FIXED_ORIGIN_FEATS,
  BACKGROUND_SKILLS,
  ELF_KEEN_SENSES_SKILLS,
  MULTICLASS_PROFICIENCIES,
  PRIMARY_CLASS_PROFICIENCIES,
  backgroundToolProficiencies,
  speciesGrantsSkill,
  validSpeciesSkillChoice,
} from "#/character-proficiency-data.ts";
export {
  ARTISAN_TOOLS,
  GAMING_SETS,
  MUSICAL_INSTRUMENTS,
} from "#/character-feature-types.ts";

export const SKILL_ABILITIES: Readonly<Record<Skill, Ability>> = {
  acrobatics: "dex",
  animalHandling: "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  sleightOfHand: "dex",
  stealth: "dex",
  survival: "wis",
};

function pushUnique<T>(target: T[], values: ReadonlyArray<T>): void {
  for (const value of values) {
    if (!target.includes(value)) {
      target.push(value);
    }
  }
}

function primaryClassToolProficiencies(
  sheet: CharacterSheet,
): ReadonlyArray<CharacterToolProficiency> {
  switch (sheet.primaryClass) {
    case "bard":
      return [...(sheet.choices?.bardInstruments ?? [])];
    case "druid":
      return ["herbalismKit"];
    case "monk":
      return sheet.choices?.monkTool == null ? [] : [sheet.choices.monkTool];
    case "rogue":
      return ["thievesTools"];
    default:
      return [];
  }
}

function multiclassToolProficiencies(
  sheet: CharacterSheet,
): ReadonlyArray<CharacterToolProficiency> {
  const tools: CharacterToolProficiency[] = [];

  if (
    sheet.classLevels.bard > 0 &&
    sheet.primaryClass !== "bard" &&
    sheet.choices?.multiclassBardInstrument != null
  ) {
    tools.push(sheet.choices.multiclassBardInstrument);
  }
  if (sheet.classLevels.rogue > 0 && sheet.primaryClass !== "rogue") {
    tools.push("thievesTools");
  }

  return tools;
}

export function deriveCharacterProficiencies(
  sheet: CharacterSheet,
): CharacterProficiencySummary {
  const primary = PRIMARY_CLASS_PROFICIENCIES[sheet.primaryClass];
  const skills: Skill[] = [...BACKGROUND_SKILLS[sheet.background]];
  const toolProficiencies: CharacterToolProficiency[] = [
    ...backgroundToolProficiencies(
      sheet.background,
      sheet.choices?.backgroundTool,
    ),
  ];
  const armorTraining = [...primary.armorTraining];
  const weaponProficiencies = [...primary.weaponProficiencies];
  const grantedLanguages: CharacterGrantedLanguage[] = [];
  const originFeats: CharacterOriginFeatSelection[] = [
    BACKGROUND_FIXED_ORIGIN_FEATS[sheet.background],
  ];

  pushUnique(skills, sheet.choices?.primaryClassSkills ?? []);
  pushUnique(toolProficiencies, primaryClassToolProficiencies(sheet));

  for (const className of CLASS_NAMES) {
    if (className === sheet.primaryClass || sheet.classLevels[className] <= 0) {
      continue;
    }
    const gains = MULTICLASS_PROFICIENCIES[className];
    pushUnique(armorTraining, gains.armorTraining);
    pushUnique(weaponProficiencies, gains.weaponProficiencies);
    if (className === "bard")
      pushUnique(skills, sheet.choices?.multiclassSkills?.bard ?? []);
    if (className === "ranger")
      pushUnique(skills, sheet.choices?.multiclassSkills?.ranger ?? []);
    if (className === "rogue")
      pushUnique(skills, sheet.choices?.multiclassSkills?.rogue ?? []);
  }

  pushUnique(toolProficiencies, multiclassToolProficiencies(sheet));
  if (sheet.choices?.speciesSkill != null) {
    pushUnique(skills, [sheet.choices.speciesSkill]);
  }
  if (sheet.species === "human" && sheet.choices?.humanOriginFeat != null) {
    originFeats.push(sheet.choices.humanOriginFeat);
  }

  for (const feat of originFeats) {
    if (feat.feat !== "skilled") continue;
    for (const proficiency of feat.proficiencies) {
      if ((SKILLS as ReadonlyArray<string>).includes(proficiency)) {
        pushUnique(skills, [proficiency as Skill]);
      } else {
        pushUnique(toolProficiencies, [
          proficiency as CharacterToolProficiency,
        ]);
      }
    }
  }

  for (const entry of sheet.advancement) {
    const choice = entry.feat?.choice;
    if (
      choice == null ||
      choice.tag === "abilityScoreImprovement" ||
      choice.featId !== "skilled"
    ) {
      continue;
    }
    for (const proficiency of choice.proficiencies ?? []) {
      if ((SKILLS as ReadonlyArray<string>).includes(proficiency)) {
        pushUnique(skills, [proficiency as Skill]);
      } else {
        pushUnique(toolProficiencies, [
          proficiency as CharacterToolProficiency,
        ]);
      }
    }
  }

  if (
    sheet.classLevels.cleric > 0 &&
    sheet.choices?.clericDivineOrder === "protector"
  ) {
    pushUnique(armorTraining, ["heavy"]);
    pushUnique(weaponProficiencies, ["martial"]);
  }
  if (
    sheet.classLevels.druid > 0 &&
    sheet.choices?.druidPrimalOrder === "warden"
  ) {
    pushUnique(armorTraining, ["medium"]);
    pushUnique(weaponProficiencies, ["martial"]);
  }
  if (sheet.classLevels.druid > 0) {
    pushUnique(grantedLanguages, ["Druidic"]);
  }
  if (sheet.classLevels.rogue > 0) {
    pushUnique(grantedLanguages, ["Thieves' Cant"]);
    if (sheet.choices?.rogueLanguage != null) {
      pushUnique(grantedLanguages, [sheet.choices.rogueLanguage]);
    }
  }
  if (sheet.classLevels.ranger >= 2) {
    pushUnique(
      grantedLanguages,
      sheet.choices?.rangerDeftExplorerLanguages ?? [],
    );
  }

  return {
    savingThrows: primary.savingThrows,
    skills,
    tools: toolProficiencies,
    armorTraining,
    weaponProficiencies,
    originFeats,
    grantedLanguages,
    subclasses: characterSubclassSelections(sheet),
  };
}

export function isArtisanTool(
  tool: CharacterToolProficiency,
): tool is ArtisanTool {
  return (ARTISAN_TOOLS as ReadonlyArray<string>).includes(tool);
}

export function isGamingSet(tool: CharacterToolProficiency): tool is GamingSet {
  return (GAMING_SETS as ReadonlyArray<string>).includes(tool);
}

export function isMusicalInstrument(
  tool: CharacterToolProficiency,
): tool is MusicalInstrument {
  return (MUSICAL_INSTRUMENTS as ReadonlyArray<string>).includes(tool);
}
