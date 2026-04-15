import type { CharacterBuildChoices } from "#/character-feature-types.ts";
import type { ClassName } from "#/features/class-tables.ts";
import { initSpellSlotsFromLevels } from "#/machine-spells.ts";
import type { Ability, CasterClass } from "#/types.ts";

const FULL_CASTER_CANTRIP_COUNTS = {
  bard: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  cleric: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  druid: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  sorcerer: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  warlock: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  wizard: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
} as const;

const PREPARED_SPELL_COUNTS = {
  bard: [
    4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22,
  ],
  cleric: [
    4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22,
  ],
  druid: [
    4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22,
  ],
  paladin: [
    2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15,
  ],
  ranger: [
    2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15,
  ],
  sorcerer: [
    2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22,
  ],
  warlock: [
    2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15,
  ],
  wizard: [
    4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25,
  ],
} as const;

export const SPELLCASTING_ABILITIES = {
  bard: "cha",
  cleric: "wis",
  druid: "wis",
  paladin: "cha",
  ranger: "wis",
  sorcerer: "cha",
  warlock: "cha",
  wizard: "int",
} as const satisfies Readonly<Record<CasterClass, Ability>>;

function countAtLevel(counts: ReadonlyArray<number>, level: number): number {
  return counts[Math.max(0, level - 1)] ?? 0;
}

function extraCantripCount(
  className: CasterClass,
  choices: CharacterBuildChoices | undefined,
): number {
  if (className === "cleric" && choices?.clericDivineOrder === "thaumaturge") {
    return 1;
  }
  if (className === "druid" && choices?.druidPrimalOrder === "magician") {
    return 1;
  }
  if (
    className === "paladin" &&
    choices?.paladinFightingStyle === "blessedWarrior"
  ) {
    return 2;
  }
  if (
    className === "ranger" &&
    choices?.rangerFightingStyle === "druidicWarrior"
  ) {
    return 2;
  }
  return 0;
}

export function cantripChoiceCount(
  className: CasterClass,
  level: number,
  choices: CharacterBuildChoices | undefined,
): number {
  const baseCantripCount =
    className === "bard" ||
    className === "cleric" ||
    className === "druid" ||
    className === "sorcerer" ||
    className === "warlock" ||
    className === "wizard"
      ? countAtLevel(FULL_CASTER_CANTRIP_COUNTS[className], level)
      : 0;

  return baseCantripCount + extraCantripCount(className, choices);
}

export function cantripChoiceSourceClass(
  className: CasterClass,
  choices: CharacterBuildChoices | undefined,
): CasterClass {
  if (
    className === "paladin" &&
    choices?.paladinFightingStyle === "blessedWarrior"
  ) {
    return "cleric";
  }
  if (
    className === "ranger" &&
    choices?.rangerFightingStyle === "druidicWarrior"
  ) {
    return "druid";
  }
  return className;
}

export function preparedSpellChoiceCount(
  className: CasterClass,
  level: number,
): number {
  return countAtLevel(PREPARED_SPELL_COUNTS[className], level);
}

export function wizardSpellbookCount(level: number): number {
  return 6 + Math.max(0, level - 1) * 2;
}

export function maxSpellLevelForClass(
  className: CasterClass,
  level: number,
): number {
  if (level <= 0) return 0;
  switch (className) {
    case "bard":
    case "cleric":
    case "druid":
    case "sorcerer":
    case "wizard":
      return Math.min(9, Math.floor((level + 1) / 2));
    case "paladin":
    case "ranger":
      if (level < 2) return 0;
      return Math.min(5, Math.floor((level + 3) / 4));
    case "warlock":
      return Math.min(5, Math.floor((level + 1) / 2));
  }
}

export function classRequiresOwnedSpellcasting(
  className: CasterClass,
  level: number,
  choices: CharacterBuildChoices | undefined,
): boolean {
  return (
    cantripChoiceCount(className, level, choices) > 0 ||
    preparedSpellChoiceCount(className, level) > 0 ||
    (className === "wizard" && wizardSpellbookCount(level) > 0)
  );
}

export function classSpellSlots(
  classLevels: Readonly<Record<ClassName, number>>,
): ReturnType<typeof initSpellSlotsFromLevels> {
  return initSpellSlotsFromLevels({
    bardLevel: classLevels.bard,
    clericLevel: classLevels.cleric,
    druidLevel: classLevels.druid,
    sorcererLevel: classLevels.sorcerer,
    wizardLevel: classLevels.wizard,
    paladinLevel: classLevels.paladin,
    rangerLevel: classLevels.ranger,
    warlockLevel: classLevels.warlock,
  });
}
