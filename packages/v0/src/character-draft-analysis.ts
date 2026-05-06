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
  type NonEmptyReadonlyArray,
  type CharacterSheet,
} from "#/character-domain-model.ts";
import {
  validateDraftFields,
  validateLanguages,
} from "#/character-finalization-helpers.ts";
import { validateCharacterSpellcastingChoices } from "#/character-spellcasting.ts";
import {
  applyCharacterDraftUpdate,
  normalizeClassLevels,
} from "#/character-draft-sanitizers.ts";
import {
  collectDroppedDraftFacts,
  diffPreviewEntries,
  filterDirectlyPatchedDroppedFacts,
  type CharacterDraftDroppedFact,
} from "#/character-draft-update-preview.ts";
import { validateCharacterEquipment } from "#/character-equipment-validation.ts";
import {
  finalizedBuildChoices,
  finalizedLoadout,
  finalizedSpellcastingChoices,
} from "#/character-sheet-finalizers.ts";

export type {
  CharacterDraftDroppedFact,
  CharacterDraftPreviewValue,
} from "#/character-draft-update-preview.ts";

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

export type CharacterDraftAssessment =
  | {
      readonly status: "complete";
      readonly openChoices: readonly [];
      readonly issues: readonly [];
      readonly sheet: CharacterSheet;
    }
  | {
      readonly status: "incomplete";
      readonly openChoices: NonEmptyReadonlyArray<CharacterOpenChoice>;
      readonly issues: readonly [];
    }
  | {
      readonly status: "invalid";
      readonly openChoices: ReadonlyArray<CharacterOpenChoice>;
      readonly issues: NonEmptyReadonlyArray<CharacterFinalizationIssue>;
    };

export interface CharacterDraftUpdatePreview {
  readonly candidateDraft: CharacterDraft;
  readonly candidateAssessment: CharacterDraftAssessment;
  readonly droppedFacts: ReadonlyArray<CharacterDraftDroppedFact>;
  readonly newlyOpenedChoices: ReadonlyArray<CharacterOpenChoice>;
  readonly newlyIntroducedIssues: ReadonlyArray<CharacterFinalizationIssue>;
}

type CharacterDraftEvaluation =
  | {
      readonly allIssues: readonly [];
      readonly openChoices: readonly [];
      readonly issues: readonly [];
      readonly status: "complete";
      readonly sheet: CharacterSheet;
    }
  | {
      readonly allIssues: ReadonlyArray<CharacterFinalizationIssue>;
      readonly openChoices: ReadonlyArray<CharacterOpenChoice>;
      readonly issues: readonly [];
      readonly status: "incomplete";
    }
  | {
      readonly allIssues: ReadonlyArray<CharacterFinalizationIssue>;
      readonly openChoices: ReadonlyArray<CharacterOpenChoice>;
      readonly issues: ReadonlyArray<CharacterFinalizationIssue>;
      readonly status: "invalid";
    };

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

function asNonEmpty<T>(items: ReadonlyArray<T>): NonEmptyReadonlyArray<T> {
  if (items.length === 0) {
    throw new Error("Expected a non-empty array.");
  }
  return items as NonEmptyReadonlyArray<T>;
}

function buildCharacterDraftEvaluation(
  draft: CharacterDraft,
): CharacterDraftEvaluation {
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
  let primaryClass = draft.primaryClass;
  let finalizedClassLevels = provisionalClassLevels;
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
    primaryClass = advancementReplay.primaryClass ?? primaryClass;
    finalizedClassLevels = advancementReplay.classLevels;
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
    if (issues.length > 0) {
      return {
        allIssues,
        openChoices,
        issues,
        status: "invalid",
      };
    }
    return {
      allIssues,
      openChoices,
      issues: [],
      status: "incomplete",
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
    background: draft.background!,
    abilityScoreGeneration,
    backgroundAbilityScoreIncrease: draft.backgroundAbilityScoreIncrease!,
    abilityScores: abilityScores!,
    species: draft.species!,
    languages: [...draft.languages!],
    alignment: draft.alignment!,
    choices: finalizedBuildChoices(draft.choices),
    equipment: {
      backgroundOption: draft.equipment!.backgroundOption!,
      classOption: draft.equipment!.classOption!,
      purchasedCombatEquipment: [
        ...(draft.equipment!.purchasedCombatEquipment ?? []),
      ],
      remainingGoldPieces: draft.equipment!.remainingGoldPieces!,
      loadout: finalizedLoadout(draft.equipment!.loadout),
    },
    spellcasting: finalizedSpellcastingChoices(
      finalizedClassLevels,
      draft.choices,
      draft.spellcasting,
    ),
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
      status: "complete",
      openChoices: [],
      issues: [],
      sheet: evaluation.sheet!,
    };
  }
  if (evaluation.status === "incomplete") {
    return {
      status: "incomplete",
      openChoices: asNonEmpty(evaluation.openChoices),
      issues: [],
    };
  }
  return {
    status: "invalid",
    openChoices: evaluation.openChoices,
    issues: asNonEmpty(evaluation.issues),
  };
}

export { applyCharacterDraftUpdate };

export function previewCharacterDraftUpdate(
  current: CharacterDraft,
  patch: Partial<CharacterDraft>,
): CharacterDraftUpdatePreview {
  const candidateDraft = applyCharacterDraftUpdate(current, patch);
  const currentAssessment = assessCharacterDraft(current);
  const candidateAssessment = assessCharacterDraft(candidateDraft);
  const droppedFacts = filterDirectlyPatchedDroppedFacts({
    current,
    patch,
    droppedFacts: collectDroppedDraftFacts(current, candidateDraft),
  });

  return {
    candidateDraft,
    candidateAssessment,
    droppedFacts,
    newlyOpenedChoices: diffPreviewEntries(
      currentAssessment.openChoices,
      candidateAssessment.openChoices,
    ),
    newlyIntroducedIssues: diffPreviewEntries(
      currentAssessment.issues,
      candidateAssessment.issues,
    ),
  };
}

export function finalizeCharacterDraft(
  draft: CharacterDraft,
): CharacterFinalizationResult {
  const evaluation = buildCharacterDraftEvaluation(draft);
  if (evaluation.status === "complete") {
    return { ok: true, sheet: evaluation.sheet! };
  }
  if (evaluation.status === "incomplete") {
    return {
      ok: false,
      status: "incomplete",
      openChoices: asNonEmpty(evaluation.openChoices),
      issues: [],
    };
  }
  return {
    ok: false,
    status: "invalid",
    openChoices: evaluation.openChoices,
    issues: asNonEmpty(evaluation.issues),
  };
}
