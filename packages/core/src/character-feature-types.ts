import type { CharacterLanguage } from "#/character-domain.ts";
import type { ClassName } from "#/features/class-tables.ts";
import type { Skill } from "#/monster-types.ts";
import type { Ability } from "#/types.ts";

export const CHARACTER_RARE_LANGUAGES = [
  "Abyssal",
  "Celestial",
  "Deep Speech",
  "Druidic",
  "Infernal",
  "Primordial",
  "Sylvan",
  "Thieves' Cant",
  "Undercommon",
] as const;
export type CharacterRareLanguage = (typeof CHARACTER_RARE_LANGUAGES)[number];
export type CharacterGrantedLanguage =
  | CharacterLanguage
  | CharacterRareLanguage;

export const ARTISAN_TOOLS = [
  "alchemistsSupplies",
  "brewersSupplies",
  "calligraphersSupplies",
  "carpentersTools",
  "cartographersTools",
  "cobblersTools",
  "cooksUtensils",
  "glassblowersTools",
  "jewelersTools",
  "leatherworkersTools",
  "masonsTools",
  "paintersSupplies",
  "pottersTools",
  "smithsTools",
  "tinkersTools",
  "weaversTools",
  "woodcarversTools",
] as const;
export type ArtisanTool = (typeof ARTISAN_TOOLS)[number];

export const GAMING_SETS = [
  "dice",
  "dragonchess",
  "playingCards",
  "threeDragonAnte",
] as const;
export type GamingSet = (typeof GAMING_SETS)[number];

export const MUSICAL_INSTRUMENTS = [
  "bagpipes",
  "drum",
  "dulcimer",
  "flute",
  "horn",
  "lute",
  "lyre",
  "panFlute",
  "shawm",
  "viol",
] as const;
export type MusicalInstrument = (typeof MUSICAL_INSTRUMENTS)[number];

export const FIXED_TOOL_PROFICIENCIES = [
  "herbalismKit",
  "thievesTools",
] as const;
export type FixedToolProficiency = (typeof FIXED_TOOL_PROFICIENCIES)[number];

export const CHARACTER_TOOL_PROFICIENCIES = [
  ...ARTISAN_TOOLS,
  ...FIXED_TOOL_PROFICIENCIES,
  ...GAMING_SETS,
  ...MUSICAL_INSTRUMENTS,
] as const;
export type CharacterToolProficiency =
  (typeof CHARACTER_TOOL_PROFICIENCIES)[number];

export const CHARACTER_ARMOR_TRAININGS = [
  "light",
  "medium",
  "heavy",
  "shield",
] as const;
export type CharacterArmorTraining = (typeof CHARACTER_ARMOR_TRAININGS)[number];

export const CHARACTER_WEAPON_PROFICIENCIES = [
  "simple",
  "martial",
  "martialLight",
  "martialFinesseOrLight",
] as const;
export type CharacterWeaponProficiency =
  (typeof CHARACTER_WEAPON_PROFICIENCIES)[number];

export const ORIGIN_FEAT_IDS = [
  "alert",
  "magicInitiateCleric",
  "magicInitiateDruid",
  "magicInitiateWizard",
  "savageAttacker",
  "skilled",
] as const;
export type CharacterOriginFeatId = (typeof ORIGIN_FEAT_IDS)[number];

export type CharacterSkilledProficiencyChoice =
  | Skill
  | CharacterToolProficiency;

type AdvancementFeatData = {
  readonly featId: string;
  readonly abilityScoreIncrease?: Ability;
  readonly proficiencies?: ReadonlyArray<CharacterSkilledProficiencyChoice>;
};

export interface SkilledOriginFeatSelection {
  readonly feat: "skilled";
  readonly proficiencies: ReadonlyArray<CharacterSkilledProficiencyChoice>;
}

export interface MagicInitiateOriginFeatSelection {
  readonly feat:
    | "magicInitiateCleric"
    | "magicInitiateDruid"
    | "magicInitiateWizard";
}

export interface SimpleOriginFeatSelection {
  readonly feat: "alert" | "savageAttacker";
}

export type CharacterOriginFeatSelection =
  | SkilledOriginFeatSelection
  | MagicInitiateOriginFeatSelection
  | SimpleOriginFeatSelection;

export interface AbilityScoreImprovementChoice {
  readonly tag: "abilityScoreImprovement";
  readonly abilities: readonly [Ability] | readonly [Ability, Ability];
}

export interface GeneralFeatChoice extends AdvancementFeatData {
  readonly tag: "feat";
}

export interface EpicBoonFeatChoice extends AdvancementFeatData {
  readonly tag: "epicBoon";
}

export type CharacterAdvancementChoice =
  | AbilityScoreImprovementChoice
  | GeneralFeatChoice
  | EpicBoonFeatChoice;

export interface CharacterAdvancementFeatSelection {
  readonly slot: "feat" | "epicBoon";
  readonly choice: CharacterAdvancementChoice;
}

export const SRD_SUBCLASSES = {
  barbarian: ["berserker"],
  bard: ["lore"],
  cleric: ["life"],
  druid: ["land"],
  fighter: ["champion"],
  monk: ["openHand"],
  paladin: ["devotion"],
  ranger: ["hunter"],
  rogue: ["thief"],
  sorcerer: ["draconic"],
  warlock: ["fiend"],
  wizard: ["evoker"],
} as const satisfies Readonly<Record<ClassName, ReadonlyArray<string>>>;

export type CharacterSubclassSelection = {
  readonly [K in ClassName]: {
    readonly className: K;
    readonly subclass: (typeof SRD_SUBCLASSES)[K][number];
  };
}[ClassName];

export interface CharacterAdvancementEntry {
  readonly className: ClassName;
  readonly subclass?: CharacterSubclassSelection;
  readonly feat?: CharacterAdvancementFeatSelection;
}

export const CLERIC_DIVINE_ORDERS = ["protector", "thaumaturge"] as const;
export type ClericDivineOrder = (typeof CLERIC_DIVINE_ORDERS)[number];

export const DRUID_PRIMAL_ORDERS = ["magician", "warden"] as const;
export type DruidPrimalOrder = (typeof DRUID_PRIMAL_ORDERS)[number];

export interface CharacterBuildChoices {
  readonly primaryClassSkills?: ReadonlyArray<Skill>;
  readonly multiclassSkills?: Partial<
    Readonly<
      Record<
        Extract<ClassName, "bard" | "ranger" | "rogue">,
        ReadonlyArray<Skill>
      >
    >
  >;
  readonly backgroundTool?: GamingSet;
  readonly bardInstruments?: ReadonlyArray<MusicalInstrument>;
  readonly multiclassBardInstrument?: MusicalInstrument;
  readonly monkTool?: ArtisanTool | MusicalInstrument;
  readonly speciesSkill?: Skill;
  readonly humanOriginFeat?: CharacterOriginFeatSelection;
  readonly rogueLanguage?: CharacterGrantedLanguage;
  readonly rangerDeftExplorerLanguages?: ReadonlyArray<CharacterGrantedLanguage>;
  readonly clericDivineOrder?: ClericDivineOrder;
  readonly druidPrimalOrder?: DruidPrimalOrder;
}

export interface CharacterProficiencySummary {
  readonly savingThrows: readonly [Ability, Ability];
  readonly skills: ReadonlyArray<Skill>;
  readonly tools: ReadonlyArray<CharacterToolProficiency>;
  readonly armorTraining: ReadonlyArray<CharacterArmorTraining>;
  readonly weaponProficiencies: ReadonlyArray<CharacterWeaponProficiency>;
  readonly originFeats: ReadonlyArray<CharacterOriginFeatSelection>;
  readonly grantedLanguages: ReadonlyArray<CharacterGrantedLanguage>;
  readonly subclasses: ReadonlyArray<CharacterSubclassSelection>;
}

export interface CharacterClassResourcePool {
  readonly name: string;
  readonly uses: number;
  readonly rechargesOn: "shortRest" | "longRest" | "shortOrLongRest";
}
