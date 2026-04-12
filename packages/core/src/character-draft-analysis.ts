import {
  applyBackgroundAbilityScoreIncrease,
  type CharacterAbilityScoreGeneration,
  type CharacterAbilityScores,
} from "#/character-ability-scores.ts";
import {
  validateBackgroundToolChoice,
  validateDuplicateGrantedProficiencies,
  validateFeatChoices,
  validateFeatureChoices,
  validateGrantedLanguages,
  validateMulticlassChoices,
  validatePrimaryClassChoices,
  validateSpeciesChoices,
  validateSubclassSelections,
} from "#/character-build-choice-validation.ts";
import {
  advancementToClassLevels,
  cloneAdvancement,
  validateAndReplayAdvancement,
} from "#/character-advancement.ts";
import {
  type CharacterDraft,
  type CharacterFinalizationIssue,
  type CharacterFinalizationIssueCode,
  type CharacterFinalizationResult,
  type CharacterSheet,
} from "#/character-domain-model.ts";
import {
  validateDraftFields,
  validateLanguages,
} from "#/character-finalization-helpers.ts";
import { type CharacterSpellcastingChoices } from "#/character-spellcasting.ts";
import { validateCharacterSpellcastingChoices } from "#/character-spellcasting.ts";
import {
  applyCharacterDraftUpdate,
  normalizeClassLevels,
} from "#/character-draft-sanitizers.ts";
import { validateCharacterEquipment } from "#/character-equipment-validation.ts";

export const CHARACTER_OPEN_CHOICE_CODES = [
  "missingPrimaryClass",
  "missingClassLevels",
  "missingAdvancement",
  "advancementRequiredForHigherLevelStart",
  "missingBackground",
  "missingAbilityScoreGeneration",
  "missingBackgroundAbilityScoreIncrease",
  "incompleteAbilityScores",
  "missingSpecies",
  "missingLanguages",
  "tooFewLanguages",
  "missingAlignment",
  "missingPrimaryClassSkillChoices",
  "wrongPrimaryClassSkillChoiceCount",
  "missingMulticlassSkillChoice",
  "wrongMulticlassSkillChoiceCount",
  "missingToolChoice",
  "invalidToolChoiceCount",
  "missingSpeciesSkillChoice",
  "missingOriginFeatChoice",
  "wrongSkilledChoiceCount",
  "missingFeatureChoice",
  "missingAdvancementChoice",
  "missingSubclassSelection",
  "missingGrantedLanguageChoice",
  "wrongGrantedLanguageChoiceCount",
  "missingEquipmentChoices",
  "missingBackgroundEquipmentChoice",
  "missingClassEquipmentChoice",
  "missingRemainingGoldPieces",
  "missingLoadout",
  "missingSpellcastingChoices",
  "missingCantripChoices",
  "wrongCantripChoiceCount",
  "missingPreparedSpellChoices",
  "wrongPreparedSpellChoiceCount",
  "missingWizardSpellbookChoices",
  "wrongWizardSpellbookChoiceCount",
] as const satisfies ReadonlyArray<CharacterFinalizationIssueCode>;
export type CharacterOpenChoiceCode =
  (typeof CHARACTER_OPEN_CHOICE_CODES)[number];

export interface CharacterOpenChoice {
  readonly code: CharacterOpenChoiceCode;
  readonly message: string;
}

export interface CharacterDraftAssessment {
  readonly openChoices: ReadonlyArray<CharacterOpenChoice>;
  readonly issues: ReadonlyArray<CharacterFinalizationIssue>;
  readonly status: "complete" | "incomplete" | "invalid";
  readonly sheet?: CharacterSheet;
}

function isOpenChoiceCode(
  code: CharacterFinalizationIssueCode,
): code is CharacterOpenChoiceCode {
  return CHARACTER_OPEN_CHOICE_CODES.includes(code as CharacterOpenChoiceCode);
}

function shouldSuppressIllegalIssue(
  code: CharacterFinalizationIssueCode,
  openChoices: ReadonlyArray<CharacterOpenChoice>,
): boolean {
  const openCodes = new Set(openChoices.map((choice) => choice.code));
  return (
    (code === "invalidTotalLevel" &&
      (openCodes.has("missingClassLevels") ||
        openCodes.has("missingAdvancement"))) ||
    (code === "primaryClassLevelMissing" &&
      (openCodes.has("missingPrimaryClass") ||
        openCodes.has("missingClassLevels") ||
        openCodes.has("missingAdvancement")))
  );
}

function buildCharacterDraftEvaluation(
  draft: CharacterDraft,
): CharacterDraftAssessment & {
  readonly allIssues: ReadonlyArray<CharacterFinalizationIssue>;
} {
  const provisionalClassLevels =
    draft.advancement != null
      ? advancementToClassLevels(draft.advancement)
      : draft.classLevels == null
        ? normalizeClassLevels({})
        : normalizeClassLevels(draft.classLevels);

  const allIssues: CharacterFinalizationIssue[] = [
    ...validateDraftFields(draft, provisionalClassLevels),
    ...validatePrimaryClassChoices(draft),
    ...validateMulticlassChoices(draft, provisionalClassLevels),
    ...validateBackgroundToolChoice(draft),
    ...validateSpeciesChoices(draft),
    ...validateFeatChoices(draft),
    ...validateFeatureChoices(draft, provisionalClassLevels),
    ...validateSubclassSelections(draft, provisionalClassLevels),
    ...validateGrantedLanguages(draft, provisionalClassLevels),
    ...(draft.languages == null ? [] : validateLanguages(draft.languages)),
    ...validateDuplicateGrantedProficiencies(draft),
    ...validateCharacterEquipment(draft),
    ...validateCharacterSpellcastingChoices({
      classLevels: provisionalClassLevels,
      choices: draft.choices,
      spellcasting: draft.spellcasting,
    }),
  ];

  let abilityScores: CharacterAbilityScores | undefined;
  let advancement = draft.advancement;
  let classLevels = provisionalClassLevels;
  let primaryClass = draft.primaryClass;
  if (
    draft.abilityScoreGeneration != null &&
    draft.background != null &&
    draft.backgroundAbilityScoreIncrease != null
  ) {
    const baseAbilityScores = applyBackgroundAbilityScoreIncrease(
      draft.abilityScoreGeneration.assignedScores as CharacterAbilityScores,
      draft.background,
      draft.backgroundAbilityScoreIncrease,
    );
    const advancementReplay = validateAndReplayAdvancement(
      draft,
      baseAbilityScores,
    );
    abilityScores = advancementReplay.abilityScores;
    advancement = advancementReplay.advancement;
    classLevels = advancementReplay.classLevels;
    primaryClass = advancementReplay.primaryClass ?? primaryClass;
    allIssues.push(...advancementReplay.issues);
  }

  const openChoices = allIssues.reduce<CharacterOpenChoice[]>(
    (choices, issue) => {
      if (!isOpenChoiceCode(issue.code)) return choices;
      choices.push({
        code: issue.code,
        message: issue.message,
      });
      return choices;
    },
    [],
  );
  const issues = allIssues.filter(
    (issue) =>
      !isOpenChoiceCode(issue.code) &&
      !shouldSuppressIllegalIssue(issue.code, openChoices),
  );

  if (allIssues.length > 0) {
    return {
      allIssues,
      openChoices,
      issues,
      status: issues.length > 0 ? "invalid" : "incomplete",
    };
  }

  const abilityScoreGeneration: CharacterAbilityScoreGeneration = {
    ...draft.abilityScoreGeneration!,
    assignedScores: {
      ...draft.abilityScoreGeneration!.assignedScores,
    } as CharacterAbilityScores,
  };

  const sheet: CharacterSheet = {
    primaryClass: primaryClass!,
    advancement: cloneAdvancement(advancement!),
    classLevels,
    background: draft.background!,
    abilityScoreGeneration,
    backgroundAbilityScoreIncrease: draft.backgroundAbilityScoreIncrease!,
    abilityScores: abilityScores!,
    species: draft.species!,
    languages: [...draft.languages!],
    alignment: draft.alignment!,
    choices: draft.choices ?? {},
    equipment: {
      backgroundOption: draft.equipment!.backgroundOption!,
      classOption: draft.equipment!.classOption!,
      purchasedCombatEquipment: [
        ...(draft.equipment!.purchasedCombatEquipment ?? []),
      ],
      remainingGoldPieces: draft.equipment!.remainingGoldPieces!,
      loadout: { ...draft.equipment!.loadout! },
    },
    ...(draft.spellcasting == null
      ? {}
      : {
          spellcasting: Object.fromEntries(
            Object.entries(draft.spellcasting).map(([className, entry]) => [
              className,
              {
                ...(entry?.cantrips == null
                  ? {}
                  : { cantrips: [...entry.cantrips] }),
                ...(entry?.preparedSpells == null
                  ? {}
                  : { preparedSpells: [...entry.preparedSpells] }),
                ...(entry?.spellbook == null
                  ? {}
                  : { spellbook: [...entry.spellbook] }),
              },
            ]),
          ) as CharacterSpellcastingChoices,
        }),
  };

  return {
    allIssues: [],
    openChoices: [],
    issues: [],
    status: "complete",
    sheet,
  };
}

export function assessCharacterDraft(
  draft: CharacterDraft,
): CharacterDraftAssessment {
  const evaluation = buildCharacterDraftEvaluation(draft);
  if (evaluation.status === "complete") {
    return {
      openChoices: [],
      issues: [],
      status: "complete",
      sheet: evaluation.sheet,
    };
  }

  return {
    openChoices: evaluation.openChoices,
    issues: evaluation.issues,
    status: evaluation.status,
  };
}

export { applyCharacterDraftUpdate };

export function finalizeCharacterDraft(
  draft: CharacterDraft,
): CharacterFinalizationResult {
  const evaluation = buildCharacterDraftEvaluation(draft);
  return evaluation.status === "complete"
    ? { ok: true, sheet: evaluation.sheet! }
    : { ok: false, issues: evaluation.allIssues };
}
