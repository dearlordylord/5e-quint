import type {
  CharacterClassLevels,
  CharacterDraft,
  CharacterFinalizationIssue,
} from "#/character-domain.ts";
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
  selectedFightingStyles,
} from "#/character-feature-choices.ts";
import { deriveGrantedSkillProficiencies } from "#/character-proficiencies.ts";

const FIGHTING_STYLE_NAMES = [
  "archery",
  "defense",
  "greatWeaponFighting",
  "twoWeaponFighting",
] as const;

export const EXPERTISE_MESSAGE_PREFIX = "current class levels require" as const;

function invalidFeatureChoiceIssue(
  message: string,
): CharacterFinalizationIssue {
  return {
    code: "invalidFeatureChoice",
    message,
  };
}

export function validateFeatureChoices(
  draft: CharacterDraft,
  classLevels: CharacterClassLevels,
): ReadonlyArray<CharacterFinalizationIssue> {
  const issues: CharacterFinalizationIssue[] = [];
  if (classLevels.cleric > 0 && draft.choices?.clericDivineOrder == null) {
    issues.push({
      code: "missingFeatureChoice",
      message: "cleric requires a Divine Order choice.",
    });
  }
  if (classLevels.druid > 0 && draft.choices?.druidPrimalOrder == null) {
    issues.push({
      code: "missingFeatureChoice",
      message: "druid requires a Primal Order choice.",
    });
  }

  if (
    hasFighterFightingStyleSlot(classLevels) &&
    draft.choices?.fighterFightingStyle == null
  ) {
    issues.push({
      code: "missingFeatureChoice",
      message: "fighter requires a Fighting Style choice.",
    });
  }
  if (
    !hasFighterFightingStyleSlot(classLevels) &&
    draft.choices?.fighterFightingStyle != null
  ) {
    issues.push(
      invalidFeatureChoiceIssue(
        "fighter Fighting Style choices require fighter level 1 or higher.",
      ),
    );
  }
  if (
    draft.choices?.fighterFightingStyle != null &&
    !isFightingStyle(draft.choices.fighterFightingStyle)
  ) {
    issues.push(
      invalidFeatureChoiceIssue(
        `fighter Fighting Style choices must be one of: ${FIGHTING_STYLE_NAMES.join(", ")}.`,
      ),
    );
  }

  if (
    hasChampionAdditionalFightingStyleSlot(classLevels, draft.advancement) &&
    draft.choices?.championAdditionalFightingStyle == null
  ) {
    issues.push({
      code: "missingFeatureChoice",
      message:
        "champion fighter requires an additional Fighting Style choice at fighter level 7.",
    });
  }
  if (
    !hasChampionAdditionalFightingStyleSlot(classLevels, draft.advancement) &&
    draft.choices?.championAdditionalFightingStyle != null
  ) {
    issues.push(
      invalidFeatureChoiceIssue(
        "additional fighter Fighting Style choices require fighter level 7 or higher and the Champion subclass.",
      ),
    );
  }
  if (
    draft.choices?.championAdditionalFightingStyle != null &&
    !isFightingStyle(draft.choices.championAdditionalFightingStyle)
  ) {
    issues.push(
      invalidFeatureChoiceIssue(
        `champion additional Fighting Style choices must be one of: ${FIGHTING_STYLE_NAMES.join(", ")}.`,
      ),
    );
  }

  if (
    hasPaladinFightingStyleSlot(classLevels) &&
    draft.choices?.paladinFightingStyle == null
  ) {
    issues.push({
      code: "missingFeatureChoice",
      message: "paladin requires a Fighting Style choice at paladin level 2.",
    });
  }
  if (
    !hasPaladinFightingStyleSlot(classLevels) &&
    draft.choices?.paladinFightingStyle != null
  ) {
    issues.push(
      invalidFeatureChoiceIssue(
        "paladin Fighting Style choices require paladin level 2 or higher.",
      ),
    );
  }
  if (
    draft.choices?.paladinFightingStyle != null &&
    !isPaladinFightingStyleChoice(draft.choices.paladinFightingStyle)
  ) {
    issues.push(
      invalidFeatureChoiceIssue(
        "paladin Fighting Style choices must be a Fighting Style feat or blessedWarrior.",
      ),
    );
  }

  if (
    hasRangerFightingStyleSlot(classLevels) &&
    draft.choices?.rangerFightingStyle == null
  ) {
    issues.push({
      code: "missingFeatureChoice",
      message: "ranger requires a Fighting Style choice at ranger level 2.",
    });
  }
  if (
    !hasRangerFightingStyleSlot(classLevels) &&
    draft.choices?.rangerFightingStyle != null
  ) {
    issues.push(
      invalidFeatureChoiceIssue(
        "ranger Fighting Style choices require ranger level 2 or higher.",
      ),
    );
  }
  if (
    draft.choices?.rangerFightingStyle != null &&
    !isRangerFightingStyleChoice(draft.choices.rangerFightingStyle)
  ) {
    issues.push(
      invalidFeatureChoiceIssue(
        "ranger Fighting Style choices must be a Fighting Style feat or druidicWarrior.",
      ),
    );
  }

  const selectedStyles = selectedFightingStyles(draft.choices);
  if (new Set(selectedStyles).size !== selectedStyles.length) {
    issues.push(
      invalidFeatureChoiceIssue(
        "Fighting Style feat choices must be unique across all owned Fighting Style slots.",
      ),
    );
  }

  const expectedExpertiseChoices = expectedExpertiseChoiceCount(classLevels);
  const expertiseSkills = draft.choices?.expertiseSkills ?? [];
  if (
    expectedExpertiseChoices > 0 &&
    expertiseSkills.length < expectedExpertiseChoices
  ) {
    issues.push({
      code: "missingFeatureChoice",
      message: `${EXPERTISE_MESSAGE_PREFIX} ${expectedExpertiseChoices} Expertise skill choices.`,
    });
  }
  if (expectedExpertiseChoices === 0 && expertiseSkills.length > 0) {
    issues.push(
      invalidFeatureChoiceIssue(
        "Expertise skill choices require a class feature that grants Expertise.",
      ),
    );
  }
  if (expertiseSkills.length > expectedExpertiseChoices) {
    issues.push(
      invalidFeatureChoiceIssue(
        `current class levels allow only ${expectedExpertiseChoices} Expertise skill choices.`,
      ),
    );
  }
  if (new Set(expertiseSkills).size !== expertiseSkills.length) {
    issues.push(
      invalidFeatureChoiceIssue("Expertise skill choices must be unique."),
    );
  }

  const grantedSkillProficiencies = new Set(
    deriveGrantedSkillProficiencies({
      primaryClass: draft.primaryClass,
      background: draft.background,
      species: draft.species,
      classLevels,
      choices: draft.choices,
      advancement: draft.advancement,
    }),
  );
  for (const skill of expertiseSkills) {
    if (!grantedSkillProficiencies.has(skill)) {
      issues.push(
        invalidFeatureChoiceIssue(
          `Expertise requires an existing skill proficiency; "${skill}" is not currently granted.`,
        ),
      );
    }
  }
  if (
    hasWizardScholarExpertiseSlot(classLevels) &&
    !expertiseSkills.some(isWizardScholarExpertiseSkill)
  ) {
    issues.push(
      invalidFeatureChoiceIssue(
        "wizard Scholar expertise must be Arcana, History, Investigation, Medicine, Nature, or Religion.",
      ),
    );
  }

  return issues;
}
