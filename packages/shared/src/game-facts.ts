import { Brand } from "effect";
import {
  difficultyClass,
  type AbilityModifier,
  type DifficultyClass,
} from "./types.ts";

export const STANDARD_LANGUAGES = [
  "Common",
  "Common Sign Language",
  "Draconic",
  "Dwarvish",
  "Elvish",
  "Giant",
  "Gnomish",
  "Goblin",
  "Halfling",
  "Orc",
] as const;
export type StandardLanguage = (typeof STANDARD_LANGUAGES)[number];
export type SelectableStandardLanguage = Exclude<StandardLanguage, "Common">;
export type CharacterStartingLanguages = {
  readonly [First in SelectableStandardLanguage]: readonly [
    "Common",
    First,
    Exclude<SelectableStandardLanguage, First>,
  ];
}[SelectableStandardLanguage];

export const RARE_LANGUAGES = [
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
export type RareLanguage = (typeof RARE_LANGUAGES)[number];

export const LANGUAGES = [...STANDARD_LANGUAGES, ...RARE_LANGUAGES] as const;
export type Language = (typeof LANGUAGES)[number];

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type Ability = (typeof ABILITIES)[number];

export const CLASS_NAMES = [
  "barbarian",
  "bard",
  "cleric",
  "druid",
  "fighter",
  "monk",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "warlock",
  "wizard",
] as const satisfies ReadonlyArray<string>;
export type ClassName = (typeof CLASS_NAMES)[number];

export const CONDITIONS = [
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
] as const;
export type Condition = (typeof CONDITIONS)[number];

export const SURFACE_CONDITIONS = [
  "blinded",
  "charmed",
  "deafened",
  "exhaustion",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
] as const satisfies ReadonlyArray<Condition | "exhaustion">;
export type SurfaceCondition = (typeof SURFACE_CONDITIONS)[number];

export const SKILLS = [
  "acrobatics",
  "animalHandling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleightOfHand",
  "stealth",
  "survival",
] as const;
export type Skill = (typeof SKILLS)[number];

const SURFACE_SKILL_OVERRIDES = {
  animalHandling: "animal_handling",
  sleightOfHand: "sleight_of_hand",
} as const satisfies Partial<Record<Skill, SurfaceSkill>>;

export function surfaceSkillId(skill: Skill): SurfaceSkill {
  return Object.hasOwn(SURFACE_SKILL_OVERRIDES, skill)
    ? SURFACE_SKILL_OVERRIDES[skill as keyof typeof SURFACE_SKILL_OVERRIDES]
    : (skill as SurfaceSkill);
}

export const SURFACE_SKILLS = SKILLS.map(
  surfaceSkillId,
) as unknown as readonly [SurfaceSkill, ...SurfaceSkill[]];
export type SurfaceSkill =
  | Exclude<Skill, "animalHandling" | "sleightOfHand">
  | "animal_handling"
  | "sleight_of_hand";

export const CREATURE_TYPES = [
  "aberration",
  "beast",
  "celestial",
  "construct",
  "dragon",
  "elemental",
  "fey",
  "fiend",
  "giant",
  "humanoid",
  "monstrosity",
  "ooze",
  "plant",
  "undead",
] as const;
export type CreatureType = (typeof CREATURE_TYPES)[number];

export const SPEED_TYPES = ["walk", "fly", "swim", "climb", "burrow"] as const;
export type SpeedType = (typeof SPEED_TYPES)[number];

export const SURFACE_ABILITIES = ABILITIES;
export type SurfaceAbility = Ability;

export const CHARACTER_CLASS_LEVELS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
] as const satisfies ReadonlyArray<number>;

export type CharacterClassLevel = number & Brand.Brand<"CharacterClassLevel">;

export const CharacterClassLevel = Brand.all(
  Brand.refined<CharacterClassLevel>(
    (value) =>
      Number.isInteger(value) &&
      CHARACTER_CLASS_LEVELS.some((level) => level === value),
    (value) =>
      Brand.error(`Character class level must be from 1 through 20: ${value}`),
  ),
);

export const characterClassLevel: (value: number) => CharacterClassLevel =
  CharacterClassLevel;

export const ALIGNMENT_MORALITIES = ["good", "neutral", "evil"] as const;
export type AlignmentMorality = (typeof ALIGNMENT_MORALITIES)[number];

export const ALIGNMENT_ORDERS = ["lawful", "neutral", "chaotic"] as const;
export type AlignmentOrder = (typeof ALIGNMENT_ORDERS)[number];

export type Alignment = {
  readonly order: AlignmentOrder;
  readonly morality: AlignmentMorality;
};

export const STANDARD_ACTION_KINDS = [
  "attack",
  "dash",
  "disengage",
  "dodge",
  "help",
  "hide",
  "influence",
  "magic",
  "ready",
  "search",
  "study",
  "utilize",
] as const;
export type StandardActionKind = (typeof STANDARD_ACTION_KINDS)[number];
export type SrdActionKind = StandardActionKind;

export type AlignmentOptionId = `${AlignmentOrder}_${AlignmentMorality}`;

type OrderInitial = {
  readonly lawful: "L";
  readonly neutral: "N";
  readonly chaotic: "C";
};

type MoralityInitial = {
  readonly good: "G";
  readonly neutral: "N";
  readonly evil: "E";
};

export type AlignmentAbbreviationFor<
  O extends AlignmentOrder,
  M extends AlignmentMorality,
> = O extends "neutral"
  ? M extends "neutral"
    ? "N"
    : `${OrderInitial[O]}${MoralityInitial[M]}`
  : `${OrderInitial[O]}${MoralityInitial[M]}`;

export type AlignmentAbbreviation = {
  readonly [O in AlignmentOrder]: {
    readonly [M in AlignmentMorality]: AlignmentAbbreviationFor<O, M>;
  }[AlignmentMorality];
}[AlignmentOrder];

const ORDER_INITIALS: Readonly<Record<AlignmentOrder, string>> = {
  lawful: "L",
  neutral: "N",
  chaotic: "C",
};

const MORALITY_INITIALS: Readonly<Record<AlignmentMorality, string>> = {
  good: "G",
  neutral: "N",
  evil: "E",
};

export function alignmentAbbreviation(
  alignment: Alignment,
): AlignmentAbbreviation {
  if (alignment.order === "neutral" && alignment.morality === "neutral") {
    return "N";
  }

  return `${ORDER_INITIALS[alignment.order]}${
    MORALITY_INITIALS[alignment.morality]
  }` as AlignmentAbbreviation;
}

function titleCase(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

export function alignmentLabel(alignment: Alignment): string {
  if (alignment.order === "neutral" && alignment.morality === "neutral") {
    return "Neutral";
  }

  return `${titleCase(alignment.order)} ${titleCase(alignment.morality)}`;
}

export function alignmentOptionId(alignment: Alignment): AlignmentOptionId {
  return `${alignment.order}_${alignment.morality}`;
}

export const ALIGNMENTS = ALIGNMENT_MORALITIES.flatMap((morality) =>
  ALIGNMENT_ORDERS.map((order) => alignmentAbbreviation({ order, morality })),
) as unknown as readonly [AlignmentAbbreviation, ...AlignmentAbbreviation[]];

export const ALIGNMENT_CHOICES = ALIGNMENT_MORALITIES.flatMap((morality) =>
  ALIGNMENT_ORDERS.map((order) => ({ order, morality })),
) as unknown as readonly [Alignment, ...Alignment[]];

export function alignmentFromAbbreviation(
  abbreviation: AlignmentAbbreviation,
): Alignment | undefined {
  return ALIGNMENT_CHOICES.find(
    (choice) => alignmentAbbreviation(choice) === abbreviation,
  );
}

export function alignmentFromOptionId(
  optionId: AlignmentOptionId,
): Alignment | undefined {
  return ALIGNMENT_CHOICES.find(
    (choice) => alignmentOptionId(choice) === optionId,
  );
}

export function parseAlignmentOptionId(
  value: string,
): AlignmentOptionId | undefined {
  return ALIGNMENT_CHOICES.some((choice) => alignmentOptionId(choice) === value)
    ? (value as AlignmentOptionId)
    : undefined;
}

/** Base value for recurring game save DC formulas: 8 + modifier + proficiency bonus. */
export const SAVE_DC_BASE = 8;

export function featureSaveDC(
  abilityMod: AbilityModifier,
  profBonus: number,
): DifficultyClass {
  return difficultyClass(SAVE_DC_BASE + abilityMod + profBonus);
}
