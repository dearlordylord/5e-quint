import type { CharacterAbilityScores } from "#/character-ability-scores.ts";
import {
  CHARACTER_LANGUAGES,
  type CharacterClassLevels,
  type CharacterDraft,
  type CharacterFinalizationIssue,
  type CharacterLanguage,
} from "#/character-domain.ts";
import {
  type CharacterOriginFeatSelection,
  type CharacterSkilledProficiencyChoice,
  CHARACTER_RARE_LANGUAGES,
  SRD_SUBCLASSES,
} from "#/character-feature-types.ts";
import {
  BACKGROUND_SKILLS,
  MULTICLASS_PROFICIENCIES,
  PRIMARY_CLASS_PROFICIENCIES,
  speciesGrantsSkill,
  type Skill,
  validSpeciesSkillChoice,
} from "#/character-proficiencies.ts";
import { CLASS_NAMES, meetsMulticlassPrereq } from "#/features/class-tables.ts";

function validateSkillSelection(
  skills: ReadonlyArray<Skill>,
  allowed: ReadonlyArray<Skill>,
  expectedCount: number,
  missingCode: CharacterFinalizationIssue["code"],
  invalidCode: CharacterFinalizationIssue["code"],
  duplicateCode: CharacterFinalizationIssue["code"],
  wrongCountCode: CharacterFinalizationIssue["code"],
  label: string,
): ReadonlyArray<CharacterFinalizationIssue> {
  const issues: CharacterFinalizationIssue[] = [];

  if (skills.length === 0) {
    issues.push({
      code: missingCode,
      message: `${label} requires ${expectedCount} skill choices.`,
    });
    return issues;
  }
  if (skills.length !== expectedCount) {
    issues.push({
      code: wrongCountCode,
      message: `${label} requires exactly ${expectedCount} skill choices.`,
    });
  }

  const seen = new Set<Skill>();
  for (const skill of skills) {
    if (!allowed.includes(skill)) {
      issues.push({
        code: invalidCode,
        message: `${label} cannot choose "${skill}".`,
      });
    }
    if (seen.has(skill)) {
      issues.push({
        code: duplicateCode,
        message: `${label} cannot choose "${skill}" more than once.`,
      });
    }
    seen.add(skill);
  }

  return issues;
}

export function validatePrimaryClassChoices(
  draft: CharacterDraft,
): ReadonlyArray<CharacterFinalizationIssue> {
  const issues: CharacterFinalizationIssue[] = [];
  if (draft.primaryClass == null) return issues;

  const primary = PRIMARY_CLASS_PROFICIENCIES[draft.primaryClass];
  issues.push(
    ...validateSkillSelection(
      draft.choices?.primaryClassSkills ?? [],
      primary.availableSkills,
      primary.skillChoiceCount,
      "missingPrimaryClassSkillChoices",
      "invalidPrimaryClassSkillChoice",
      "duplicatePrimaryClassSkillChoice",
      "wrongPrimaryClassSkillChoiceCount",
      draft.primaryClass,
    ),
  );

  if (draft.primaryClass === "bard") {
    const instruments = draft.choices?.bardInstruments ?? [];
    if (instruments.length !== 3) {
      issues.push({
        code: "invalidToolChoiceCount",
        message: "bard requires exactly three musical instrument choices.",
      });
    }
    if (new Set(instruments).size !== instruments.length) {
      issues.push({
        code: "duplicateToolChoice",
        message: "bard musical instrument choices must be unique.",
      });
    }
  }

  if (draft.primaryClass === "monk" && draft.choices?.monkTool == null) {
    issues.push({
      code: "missingToolChoice",
      message:
        "monk requires one Artisan's Tools or Musical Instrument choice.",
    });
  }

  return issues;
}

export function validateMulticlassChoices(
  draft: CharacterDraft,
  classLevels: CharacterClassLevels,
): ReadonlyArray<CharacterFinalizationIssue> {
  const issues: CharacterFinalizationIssue[] = [];

  for (const className of CLASS_NAMES) {
    if (className === draft.primaryClass || classLevels[className] <= 0)
      continue;
    const gains = MULTICLASS_PROFICIENCIES[className];
    if (gains.skillChoiceCount > 0) {
      const selectedSkills =
        className === "bard"
          ? (draft.choices?.multiclassSkills?.bard ?? [])
          : className === "ranger"
            ? (draft.choices?.multiclassSkills?.ranger ?? [])
            : className === "rogue"
              ? (draft.choices?.multiclassSkills?.rogue ?? [])
              : [];
      issues.push(
        ...validateSkillSelection(
          selectedSkills,
          gains.availableSkills,
          gains.skillChoiceCount,
          "missingMulticlassSkillChoice",
          "invalidMulticlassSkillChoice",
          "duplicateMulticlassSkillChoice",
          "wrongMulticlassSkillChoiceCount",
          `multiclass ${className}`,
        ),
      );
    }
    if (
      className === "bard" &&
      draft.choices?.multiclassBardInstrument == null
    ) {
      issues.push({
        code: "missingToolChoice",
        message: "multiclass bard requires one musical instrument choice.",
      });
    }
  }

  return issues;
}

export function validateBackgroundToolChoice(
  draft: CharacterDraft,
): ReadonlyArray<CharacterFinalizationIssue> {
  if (draft.background !== "soldier") return [];
  return draft.choices?.backgroundTool == null
    ? [
        {
          code: "missingToolChoice",
          message: "soldier requires one Gaming Set choice.",
        },
      ]
    : [];
}

export function validateSpeciesChoices(
  draft: CharacterDraft,
): ReadonlyArray<CharacterFinalizationIssue> {
  const issues: CharacterFinalizationIssue[] = [];
  if (draft.species == null) return issues;

  const speciesSkill = draft.choices?.speciesSkill;
  if (speciesGrantsSkill(draft.species)) {
    if (speciesSkill == null) {
      issues.push({
        code: "missingSpeciesSkillChoice",
        message: `${draft.species} requires one species skill choice.`,
      });
    } else if (!validSpeciesSkillChoice(draft.species, speciesSkill)) {
      issues.push({
        code: "invalidSpeciesSkillChoice",
        message: `${draft.species} cannot choose "${speciesSkill}" as a species skill.`,
      });
    }
  } else if (speciesSkill != null) {
    issues.push({
      code: "invalidSpeciesSkillChoice",
      message: `${draft.species} does not grant a species skill choice.`,
    });
  }

  if (draft.species === "human") {
    if (draft.choices?.humanOriginFeat == null) {
      issues.push({
        code: "missingOriginFeatChoice",
        message: "human requires one Versatile origin feat choice.",
      });
    }
  } else if (draft.choices?.humanOriginFeat != null) {
    issues.push({
      code: "invalidOriginFeatChoice",
      message: `${draft.species} does not grant a human Versatile origin feat.`,
    });
  }

  return issues;
}

function validateSkilledSelection(
  feat: CharacterOriginFeatSelection,
  label: string,
): ReadonlyArray<CharacterFinalizationIssue> {
  if (feat.feat !== "skilled") return [];
  const issues: CharacterFinalizationIssue[] = [];
  if (feat.proficiencies.length !== 3) {
    issues.push({
      code: "wrongSkilledChoiceCount",
      message: `${label} must grant exactly three skills or tools.`,
    });
  }
  if (new Set(feat.proficiencies).size !== feat.proficiencies.length) {
    issues.push({
      code: "duplicateSkilledChoice",
      message: `${label} cannot grant the same skill or tool more than once.`,
    });
  }
  return issues;
}

export function validateFeatChoices(
  draft: CharacterDraft,
): ReadonlyArray<CharacterFinalizationIssue> {
  return draft.choices?.humanOriginFeat == null
    ? []
    : validateSkilledSelection(
        draft.choices.humanOriginFeat,
        "human Versatile",
      );
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
  return issues;
}

export function validateSubclassSelections(
  draft: CharacterDraft,
  classLevels: CharacterClassLevels,
): ReadonlyArray<CharacterFinalizationIssue> {
  const issues: CharacterFinalizationIssue[] = [];
  const subclassSelections = draft.choices?.subclassSelections ?? {};

  for (const className of CLASS_NAMES) {
    const selection = subclassSelections[className];
    const requiresSubclass = classLevels[className] >= 3;
    if (requiresSubclass && selection == null) {
      issues.push({
        code: "missingSubclassSelection",
        message: `${className} level ${classLevels[className]} requires a subclass selection.`,
      });
      continue;
    }
    if (!requiresSubclass && selection != null) {
      issues.push({
        code: "prematureSubclassSelection",
        message: `${className} cannot choose a subclass before level 3.`,
      });
      continue;
    }
    if (selection != null) {
      if (selection.className !== className) {
        issues.push({
          code: "invalidSubclassSelection",
          message: `Subclass selection for ${className} must be owned by ${className}.`,
        });
      }
      if (
        !(SRD_SUBCLASSES[className] as ReadonlyArray<string>).includes(
          selection.subclass,
        )
      ) {
        issues.push({
          code: "invalidSubclassSelection",
          message: `"${selection.subclass}" is not an SRD subclass for ${className}.`,
        });
      }
    }
  }

  return issues;
}

function isGrantedLanguage(
  language: string,
): language is CharacterLanguage | (typeof CHARACTER_RARE_LANGUAGES)[number] {
  return (
    (CHARACTER_LANGUAGES as ReadonlyArray<string>).includes(language) ||
    (CHARACTER_RARE_LANGUAGES as ReadonlyArray<string>).includes(language)
  );
}

export function validateGrantedLanguages(
  draft: CharacterDraft,
  classLevels: CharacterClassLevels,
): ReadonlyArray<CharacterFinalizationIssue> {
  const issues: CharacterFinalizationIssue[] = [];

  if (classLevels.rogue > 0) {
    if (draft.choices?.rogueLanguage == null) {
      issues.push({
        code: "missingGrantedLanguageChoice",
        message: "rogue requires one extra language choice for Thieves' Cant.",
      });
    } else if (!isGrantedLanguage(draft.choices.rogueLanguage)) {
      issues.push({
        code: "invalidGrantedLanguageChoice",
        message: `rogue cannot choose "${draft.choices.rogueLanguage}" as its extra language.`,
      });
    }
  }

  if (classLevels.ranger >= 2) {
    const languages = draft.choices?.rangerDeftExplorerLanguages ?? [];
    if (languages.length !== 2) {
      issues.push({
        code: "wrongGrantedLanguageChoiceCount",
        message: "ranger Deft Explorer requires exactly two language choices.",
      });
    }
    if (new Set(languages).size !== languages.length) {
      issues.push({
        code: "duplicateGrantedLanguageChoice",
        message: "ranger Deft Explorer language choices must be unique.",
      });
    }
    for (const language of languages) {
      if (!isGrantedLanguage(language)) {
        issues.push({
          code: "invalidGrantedLanguageChoice",
          message: `ranger cannot choose "${language}" from the Character Creation language tables.`,
        });
      }
    }
  }

  return issues;
}

export function validateMulticlassPrerequisites(
  classLevels: CharacterClassLevels,
  abilityScores: CharacterAbilityScores,
): ReadonlyArray<CharacterFinalizationIssue> {
  const classesWithLevels = CLASS_NAMES.filter(
    (className) => classLevels[className] > 0,
  );
  if (classesWithLevels.length <= 1) return [];

  return classesWithLevels.flatMap((className) =>
    meetsMulticlassPrereq(abilityScores, className)
      ? []
      : [
          {
            code: "multiclassPrerequisiteNotMet" as const,
            message: `Multiclass prerequisite not met for ${className}.`,
          },
        ],
  );
}

export function validateDuplicateGrantedProficiencies(
  draft: CharacterDraft,
): ReadonlyArray<CharacterFinalizationIssue> {
  if (draft.background == null || draft.primaryClass == null) return [];

  const issues: CharacterFinalizationIssue[] = [];
  const granted = [
    ...BACKGROUND_SKILLS[draft.background],
    ...(draft.choices?.primaryClassSkills ?? []),
    ...(draft.choices?.multiclassSkills?.bard ?? []),
    ...(draft.choices?.multiclassSkills?.ranger ?? []),
    ...(draft.choices?.multiclassSkills?.rogue ?? []),
  ];
  if (draft.choices?.speciesSkill != null)
    granted.push(draft.choices.speciesSkill);

  const skilledSelections: CharacterSkilledProficiencyChoice[] = [];
  if (draft.choices?.humanOriginFeat?.feat === "skilled") {
    skilledSelections.push(...draft.choices.humanOriginFeat.proficiencies);
  }
  for (const selection of skilledSelections) {
    if (
      (BACKGROUND_SKILLS[draft.background] as ReadonlyArray<string>).includes(
        selection,
      )
    ) {
      issues.push({
        code: "duplicateGrantedProficiency",
        message: `Skill "${selection}" is granted by more than one source.`,
      });
    }
  }

  const seen = new Set<string>();
  for (const proficiency of granted) {
    if (seen.has(proficiency)) {
      issues.push({
        code: "duplicateGrantedProficiency",
        message: `Skill "${proficiency}" is granted by more than one source.`,
      });
    }
    seen.add(proficiency);
  }

  return issues;
}
