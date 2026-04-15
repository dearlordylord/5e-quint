import type {
  CharacterBuildChoices,
  PaladinFightingStyleChoice,
  RangerFightingStyleChoice,
} from "#/character-feature-types.ts";
import type {
  CharacterAdvancement,
  CharacterClassLevels,
} from "#/character-domain-model.ts";
import {
  PALADIN_FIGHTING_STYLE_CHOICES,
  RANGER_FIGHTING_STYLE_CHOICES,
} from "#/character-feature-types.ts";
import {
  FIGHTING_STYLES,
  type FightingStyle,
} from "#/features/class-fighter.ts";
import type { Skill } from "#/monster-types.ts";

const FIGHTING_STYLE_SET = new Set<FightingStyle>(FIGHTING_STYLES);
const PALADIN_FIGHTING_STYLE_CHOICE_SET = new Set<PaladinFightingStyleChoice>(
  PALADIN_FIGHTING_STYLE_CHOICES,
);
const RANGER_FIGHTING_STYLE_CHOICE_SET = new Set<RangerFightingStyleChoice>(
  RANGER_FIGHTING_STYLE_CHOICES,
);

export const WIZARD_SCHOLAR_EXPERTISE_SKILLS = [
  "arcana",
  "history",
  "investigation",
  "medicine",
  "nature",
  "religion",
] as const satisfies ReadonlyArray<Skill>;

const WIZARD_SCHOLAR_EXPERTISE_SKILL_SET = new Set<Skill>(
  WIZARD_SCHOLAR_EXPERTISE_SKILLS,
);

export function expectedExpertiseChoiceCount(
  classLevels: CharacterClassLevels,
): number {
  return (
    (classLevels.bard >= 2 ? 2 : 0) +
    (classLevels.bard >= 9 ? 2 : 0) +
    (classLevels.ranger >= 2 ? 1 : 0) +
    (classLevels.ranger >= 9 ? 2 : 0) +
    (classLevels.rogue >= 1 ? 2 : 0) +
    (classLevels.rogue >= 6 ? 2 : 0) +
    (classLevels.wizard >= 2 ? 1 : 0)
  );
}

export function hasFighterFightingStyleSlot(
  classLevels: CharacterClassLevels,
): boolean {
  return classLevels.fighter >= 1;
}

export function hasChampionAdditionalFightingStyleSlot(
  classLevels: CharacterClassLevels,
  advancement: CharacterAdvancement | undefined,
): boolean {
  return (
    classLevels.fighter >= 7 &&
    advancement?.some(
      (entry) =>
        entry.className === "fighter" &&
        entry.subclass?.className === "fighter" &&
        entry.subclass.subclass === "champion",
    ) === true
  );
}

export function hasPaladinFightingStyleSlot(
  classLevels: CharacterClassLevels,
): boolean {
  return classLevels.paladin >= 2;
}

export function hasRangerFightingStyleSlot(
  classLevels: CharacterClassLevels,
): boolean {
  return classLevels.ranger >= 2;
}

export function hasWizardScholarExpertiseSlot(
  classLevels: CharacterClassLevels,
): boolean {
  return classLevels.wizard >= 2;
}

export function isFightingStyle(value: unknown): value is FightingStyle {
  return (
    typeof value === "string" && FIGHTING_STYLE_SET.has(value as FightingStyle)
  );
}

export function isPaladinFightingStyleChoice(
  value: unknown,
): value is PaladinFightingStyleChoice {
  return (
    typeof value === "string" &&
    PALADIN_FIGHTING_STYLE_CHOICE_SET.has(value as PaladinFightingStyleChoice)
  );
}

export function isRangerFightingStyleChoice(
  value: unknown,
): value is RangerFightingStyleChoice {
  return (
    typeof value === "string" &&
    RANGER_FIGHTING_STYLE_CHOICE_SET.has(value as RangerFightingStyleChoice)
  );
}

export function isWizardScholarExpertiseSkill(skill: Skill): boolean {
  return WIZARD_SCHOLAR_EXPERTISE_SKILL_SET.has(skill);
}

function paladinChoiceToFeat(
  choice: PaladinFightingStyleChoice | undefined,
): FightingStyle | undefined {
  return choice === "blessedWarrior" ? undefined : choice;
}

function rangerChoiceToFeat(
  choice: RangerFightingStyleChoice | undefined,
): FightingStyle | undefined {
  return choice === "druidicWarrior" ? undefined : choice;
}

export function selectedFightingStyles(
  choices: CharacterBuildChoices | undefined,
): ReadonlyArray<FightingStyle> {
  const styles: FightingStyle[] = [];

  if (choices?.fighterFightingStyle != null) {
    styles.push(choices.fighterFightingStyle);
  }
  if (choices?.championAdditionalFightingStyle != null) {
    styles.push(choices.championAdditionalFightingStyle);
  }

  const paladinStyle = paladinChoiceToFeat(choices?.paladinFightingStyle);
  if (paladinStyle != null) styles.push(paladinStyle);

  const rangerStyle = rangerChoiceToFeat(choices?.rangerFightingStyle);
  if (rangerStyle != null) styles.push(rangerStyle);

  return styles;
}
