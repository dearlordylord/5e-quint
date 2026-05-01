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

export type AlignmentOptionId =
  `${AlignmentOrder}_${AlignmentMorality}`;

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
): Alignment {
  const alignment = ALIGNMENT_CHOICES.find(
    (choice) => alignmentAbbreviation(choice) === abbreviation,
  );
  if (alignment == null) {
    throw new Error(`Unknown alignment abbreviation: ${abbreviation}`);
  }
  return alignment;
}

export function alignmentFromOptionId(
  optionId: AlignmentOptionId,
): Alignment {
  const alignment = ALIGNMENT_CHOICES.find(
    (choice) => alignmentOptionId(choice) === optionId,
  );
  if (alignment == null) {
    throw new Error(`Unknown alignment option id: ${optionId}`);
  }
  return alignment;
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
