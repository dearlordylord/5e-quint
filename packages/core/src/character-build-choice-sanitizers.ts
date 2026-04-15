import {
  expectedExpertiseChoiceCount,
  hasChampionAdditionalFightingStyleSlot,
  hasFighterFightingStyleSlot,
  hasPaladinFightingStyleSlot,
  hasRangerFightingStyleSlot,
  hasWizardScholarExpertiseSlot,
  isFightingStyle,
  isPaladinFightingStyleChoice,
  isRangerFightingStyleChoice,
  isWizardScholarExpertiseSkill,
} from "#/character-feature-choices.ts";
import type {
  CharacterClassLevels,
  CharacterDraft,
} from "#/character-domain-model.ts";
import { CHARACTER_LANGUAGES } from "#/character-domain-model.ts";
import type {
  CharacterBuildChoices,
  CharacterGrantedLanguage,
} from "#/character-feature-types.ts";
import {
  ARTISAN_TOOLS,
  CHARACTER_RARE_LANGUAGES,
  CLERIC_DIVINE_ORDERS,
  DRUID_PRIMAL_ORDERS,
  GAMING_SETS,
  MUSICAL_INSTRUMENTS,
} from "#/character-feature-types.ts";
import {
  MULTICLASS_PROFICIENCIES,
  PRIMARY_CLASS_PROFICIENCIES,
  deriveGrantedSkillProficiencies,
  speciesGrantsSkill,
  type Skill,
  validSpeciesSkillChoice,
} from "#/character-proficiencies.ts";
import { type ClassName } from "#/features/class-tables.ts";

type MutableCharacterBuildChoices = {
  -readonly [K in keyof CharacterBuildChoices]: CharacterBuildChoices[K];
};

function unique<T>(values: ReadonlyArray<T>): ReadonlyArray<T> {
  return [...new Set(values)];
}

function validPrimaryClassSkillChoices(
  primaryClass: ClassName,
  skills: ReadonlyArray<Skill> | undefined,
): CharacterBuildChoices["primaryClassSkills"] {
  if (skills == null) return undefined;
  const allowed = new Set<Skill>(
    PRIMARY_CLASS_PROFICIENCIES[primaryClass].availableSkills,
  );
  const filtered = unique(skills.filter((skill) => allowed.has(skill)));
  return filtered.length === 0 ? undefined : filtered;
}

function validMulticlassSkillChoices(
  className: Extract<ClassName, "bard" | "ranger" | "rogue">,
  skills: ReadonlyArray<Skill> | undefined,
): ReadonlyArray<Skill> | undefined {
  if (skills == null) return undefined;
  const allowed = new Set<Skill>(
    MULTICLASS_PROFICIENCIES[className].availableSkills,
  );
  const filtered = unique(skills.filter((skill) => allowed.has(skill)));
  return filtered.length === 0 ? undefined : filtered;
}

function validGrantedLanguages(
  languages: ReadonlyArray<CharacterGrantedLanguage> | undefined,
): ReadonlyArray<CharacterGrantedLanguage> | undefined {
  if (languages == null) return undefined;
  const allowed = new Set<CharacterGrantedLanguage>([
    ...CHARACTER_LANGUAGES,
    ...CHARACTER_RARE_LANGUAGES,
  ]);
  const filtered = unique(
    languages.filter((language) => allowed.has(language)),
  );
  return filtered.length === 0 ? undefined : filtered;
}

export function sanitizeBuildChoices(
  draft: CharacterDraft,
  classLevels: CharacterClassLevels,
): CharacterBuildChoices | undefined {
  if (draft.choices == null) return undefined;

  const next: MutableCharacterBuildChoices = {};

  if (draft.primaryClass != null) {
    const primaryClassSkills = validPrimaryClassSkillChoices(
      draft.primaryClass,
      draft.choices.primaryClassSkills,
    );
    if (primaryClassSkills != null)
      next.primaryClassSkills = primaryClassSkills;

    if (draft.primaryClass === "bard") {
      const bardInstruments = unique(
        (draft.choices.bardInstruments ?? []).filter((instrument) =>
          MUSICAL_INSTRUMENTS.includes(instrument),
        ),
      );
      if (bardInstruments.length > 0) next.bardInstruments = bardInstruments;
    }

    if (
      draft.primaryClass === "monk" &&
      draft.choices.monkTool != null &&
      (
        [...ARTISAN_TOOLS, ...MUSICAL_INSTRUMENTS] as ReadonlyArray<string>
      ).includes(draft.choices.monkTool)
    ) {
      next.monkTool = draft.choices.monkTool;
    }
  }

  const multiclassSkills: Record<
    Extract<ClassName, "bard" | "ranger" | "rogue">,
    ReadonlyArray<Skill> | undefined
  > = {
    bard: undefined,
    ranger: undefined,
    rogue: undefined,
  };
  for (const className of ["bard", "ranger", "rogue"] as const) {
    if (className === draft.primaryClass || classLevels[className] <= 0)
      continue;
    const skills = validMulticlassSkillChoices(
      className,
      draft.choices.multiclassSkills?.[className],
    );
    if (skills != null) multiclassSkills[className] = skills;
  }
  if (Object.values(multiclassSkills).some((skills) => skills != null)) {
    next.multiclassSkills = Object.fromEntries(
      Object.entries(multiclassSkills).filter(([, skills]) => skills != null),
    ) as NonNullable<CharacterBuildChoices["multiclassSkills"]>;
  }

  if (
    draft.background === "soldier" &&
    draft.choices.backgroundTool != null &&
    GAMING_SETS.includes(draft.choices.backgroundTool)
  ) {
    next.backgroundTool = draft.choices.backgroundTool;
  }

  if (
    draft.species != null &&
    speciesGrantsSkill(draft.species) &&
    draft.choices.speciesSkill != null &&
    validSpeciesSkillChoice(draft.species, draft.choices.speciesSkill)
  ) {
    next.speciesSkill = draft.choices.speciesSkill;
  }

  if (draft.species === "human" && draft.choices.humanOriginFeat != null) {
    next.humanOriginFeat = draft.choices.humanOriginFeat;
  }

  if (
    draft.primaryClass !== "bard" &&
    classLevels.bard > 0 &&
    draft.choices.multiclassBardInstrument != null &&
    MUSICAL_INSTRUMENTS.includes(draft.choices.multiclassBardInstrument)
  ) {
    next.multiclassBardInstrument = draft.choices.multiclassBardInstrument;
  }

  if (classLevels.rogue > 0 && draft.choices.rogueLanguage != null) {
    const [rogueLanguage] =
      validGrantedLanguages([draft.choices.rogueLanguage]) ?? [];
    if (rogueLanguage != null) next.rogueLanguage = rogueLanguage;
  }

  if (classLevels.ranger >= 2) {
    const rangerLanguages = validGrantedLanguages(
      draft.choices.rangerDeftExplorerLanguages,
    );
    if (rangerLanguages != null) {
      next.rangerDeftExplorerLanguages = rangerLanguages;
    }
  }

  if (
    classLevels.cleric > 0 &&
    draft.choices.clericDivineOrder != null &&
    CLERIC_DIVINE_ORDERS.includes(draft.choices.clericDivineOrder)
  ) {
    next.clericDivineOrder = draft.choices.clericDivineOrder;
  }

  if (
    classLevels.druid > 0 &&
    draft.choices.druidPrimalOrder != null &&
    DRUID_PRIMAL_ORDERS.includes(draft.choices.druidPrimalOrder)
  ) {
    next.druidPrimalOrder = draft.choices.druidPrimalOrder;
  }

  if (
    hasFighterFightingStyleSlot(classLevels) &&
    draft.choices.fighterFightingStyle != null &&
    isFightingStyle(draft.choices.fighterFightingStyle)
  ) {
    next.fighterFightingStyle = draft.choices.fighterFightingStyle;
  }

  if (
    hasChampionAdditionalFightingStyleSlot(classLevels, draft.advancement) &&
    draft.choices.championAdditionalFightingStyle != null &&
    isFightingStyle(draft.choices.championAdditionalFightingStyle)
  ) {
    next.championAdditionalFightingStyle =
      draft.choices.championAdditionalFightingStyle;
  }

  if (
    hasPaladinFightingStyleSlot(classLevels) &&
    draft.choices.paladinFightingStyle != null &&
    isPaladinFightingStyleChoice(draft.choices.paladinFightingStyle)
  ) {
    next.paladinFightingStyle = draft.choices.paladinFightingStyle;
  }

  if (
    hasRangerFightingStyleSlot(classLevels) &&
    draft.choices.rangerFightingStyle != null &&
    isRangerFightingStyleChoice(draft.choices.rangerFightingStyle)
  ) {
    next.rangerFightingStyle = draft.choices.rangerFightingStyle;
  }

  const expectedExpertiseChoices = expectedExpertiseChoiceCount(classLevels);
  if (expectedExpertiseChoices > 0 && draft.choices.expertiseSkills != null) {
    const grantedSkillProficiencies = new Set(
      deriveGrantedSkillProficiencies({
        primaryClass: draft.primaryClass,
        background: draft.background,
        species: draft.species,
        classLevels,
        choices: next,
        advancement: draft.advancement,
      }),
    );
    const validExpertise = unique(
      draft.choices.expertiseSkills.filter((skill) =>
        grantedSkillProficiencies.has(skill),
      ),
    );
    const requiredScholarChoices = hasWizardScholarExpertiseSlot(classLevels)
      ? 1
      : 0;
    const scholarSkills = validExpertise.filter(isWizardScholarExpertiseSkill);
    const nonScholarSkills = validExpertise.filter(
      (skill) => !isWizardScholarExpertiseSkill(skill),
    );
    const filteredExpertise = [
      ...scholarSkills.slice(0, requiredScholarChoices),
      ...nonScholarSkills.slice(
        0,
        Math.max(0, expectedExpertiseChoices - requiredScholarChoices),
      ),
      ...scholarSkills.slice(requiredScholarChoices),
    ].slice(0, expectedExpertiseChoices);
    if (filteredExpertise.length > 0) {
      next.expertiseSkills = filteredExpertise;
    }
  }

  return Object.keys(next).length === 0 ? undefined : next;
}
