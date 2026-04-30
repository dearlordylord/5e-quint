import { Brand } from "effect";
import {
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  STANDARD_LANGUAGES,
  type Alignment as CharacterAlignment,
  type AlignmentMorality,
  type AlignmentOrder,
  type CharacterStartingLanguages,
  type SelectableStandardLanguage,
  type StandardLanguage,
} from "@dnd/shared/game-facts";
import {
  SUPPORTED_ABILITY_SCORE_METHODS,
  type AbilityScoreAssignment,
  type SupportedAbilityScoreMethod,
} from "@dnd/shared-algebras/ability-score-algebra";
import {
  Index,
  NonNegativeInteger,
  PositiveInteger,
  type HP,
  type Index as IndexType,
  type NonNegativeInteger as NonNegativeIntegerType,
  type PositiveInteger as PositiveIntegerType,
} from "@dnd/shared/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type {
  Ability,
  ActivationResource,
  ArmorTrainingCategory,
  Skill,
  UnitRecord,
  WeaponProficiencyCategory,
} from "@dnd/surface/surface/types";

export { SUPPORTED_ABILITY_SCORE_METHODS };
export type { AbilityScoreAssignment, SupportedAbilityScoreMethod };

export type UnitLibrary = UnitCatalog;

export type CreationSessionId = string & Brand.Brand<"CreationSessionId">;
const CreationSessionId = Brand.nominal<CreationSessionId>();
export const creationSessionId: (value: string) => CreationSessionId =
  CreationSessionId;

export type CharacterDraftId = string & Brand.Brand<"CharacterDraftId">;
const CharacterDraftId = Brand.nominal<CharacterDraftId>();
export const characterDraftId: (value: string) => CharacterDraftId =
  CharacterDraftId;

export {
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  STANDARD_LANGUAGES,
  type AlignmentMorality,
  type AlignmentOrder,
  type CharacterAlignment,
  type CharacterStartingLanguages,
  type SelectableStandardLanguage,
  type StandardLanguage,
};

export const CHARACTER_DRAFT_PATHS = [
  "draft.primaryClass",
  "draft.advancement.initial",
  "draft.background",
  "draft.abilityScoreGeneration",
  "draft.backgroundAbilityScoreIncrease",
  "draft.species",
  "draft.languages",
  "draft.alignment",
  "draft.choices",
  "draft.equipment",
] as const;
export type CharacterDraftPath = (typeof CHARACTER_DRAFT_PATHS)[number];

export const UNIT_CHOICE_KEYS = [
  "background_ability_score_increase",
  "background_tool_choice",
  "class_equipment_choice",
  "background_equipment_choice",
  "equipment_purchase",
  "fighter_skill_choices",
  "fighter_fighting_style",
  "fighter_weapon_mastery_choices",
  "loadout_armor",
  "loadout_shield",
  "loadout_weapon",
] as const;
export type UnitChoiceKey = (typeof UNIT_CHOICE_KEYS)[number];

export function unitChoiceKey(value: string): UnitChoiceKey {
  if (!UNIT_CHOICE_KEYS.some((key) => key === value)) {
    throw new Error(`Unsupported creation unit choice key: ${value}`);
  }

  return value as UnitChoiceKey;
}

export type CreationChoiceOptionId = string &
  Brand.Brand<"CreationChoiceOptionId">;
const CreationChoiceOptionId = Brand.nominal<CreationChoiceOptionId>();
export const creationChoiceOptionId: (value: string) => CreationChoiceOptionId =
  CreationChoiceOptionId;

export type ChoiceCount = number & Brand.Brand<"ChoiceCount">;
const ChoiceCount = Brand.nominal<ChoiceCount>();

export type DraftRevision = NonNegativeIntegerType &
  Brand.Brand<"DraftRevision">;
const DraftRevision = Brand.all(
  NonNegativeInteger,
  Brand.nominal<DraftRevision>(),
);
export const draftRevision: (value: number) => DraftRevision = DraftRevision;

export type FillIndex = IndexType & Brand.Brand<"FillIndex">;
const FillIndex = Brand.all(Index, Brand.nominal<FillIndex>());
export const creationFillIndex: (value: number) => FillIndex = FillIndex;

export type HitDieSize = PositiveIntegerType & Brand.Brand<"HitDieSize">;
const HitDieSize = Brand.all(PositiveInteger, Brand.nominal<HitDieSize>());
export const hitDieSize: (value: number) => HitDieSize = HitDieSize;

export type HitDieTotal = PositiveIntegerType & Brand.Brand<"HitDieTotal">;
const HitDieTotal = Brand.all(PositiveInteger, Brand.nominal<HitDieTotal>());
export const hitDieTotal: (value: number) => HitDieTotal = HitDieTotal;

export type ChoiceCardinality = {
  readonly tag: "exactly";
  readonly count: ChoiceCount;
};

export function exactChoiceCardinality(count: number): ChoiceCardinality {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Choice cardinality must be a positive integer: ${count}`);
  }

  return { tag: "exactly", count: ChoiceCount(count) };
}

export type CreationHoleSource =
  | { readonly tag: "draft"; readonly path: CharacterDraftPath }
  | {
      readonly tag: "unit";
      readonly unitId: UnitRecord["id"];
      readonly choiceKey: UnitChoiceKey;
    };
export type UnitChoiceSource = Extract<
  CreationHoleSource,
  { readonly tag: "unit" }
>;

export type CreationHoleIdText =
  | `cc:draft:${CharacterDraftPath}`
  | `cc:unit:${UnitRecord["id"]}:${UnitChoiceKey}`;

export type CreationHoleId = CreationHoleIdText & Brand.Brand<"CreationHoleId">;
const CreationHoleId = Brand.nominal<CreationHoleId>();
export const creationHoleId: (value: CreationHoleIdText) => CreationHoleId =
  CreationHoleId;

export function parseCreationHoleId(value: string): CreationHoleId | null {
  const text = parseCreationHoleIdText(value);
  return text == null ? null : creationHoleId(text);
}

function parseCreationHoleIdText(value: string): CreationHoleIdText | null {
  const draftPrefix = "cc:draft:";
  if (value.startsWith(draftPrefix)) {
    const path = value.slice(draftPrefix.length);
    return CHARACTER_DRAFT_PATHS.some((draftPath) => draftPath === path)
      ? `cc:draft:${path as CharacterDraftPath}`
      : null;
  }

  const unitPrefix = "cc:unit:";
  if (!value.startsWith(unitPrefix)) return null;
  const unitHoleText = value.slice(unitPrefix.length);
  const choiceKeySeparator = unitHoleText.lastIndexOf(":");
  if (choiceKeySeparator <= 0) return null;
  const unitId = unitHoleText.slice(0, choiceKeySeparator);
  const choiceKey = unitHoleText.slice(choiceKeySeparator + 1);
  if (
    unitId === "" ||
    !UNIT_CHOICE_KEYS.some((unitChoiceKey) => unitChoiceKey === choiceKey)
  ) {
    return null;
  }

  return `cc:unit:${unitId}:${choiceKey as UnitChoiceKey}`;
}

export type UnitRef = {
  readonly unitId: UnitRecord["id"];
};

export type AbilityScoreGenerationSelection = {
  readonly method: SupportedAbilityScoreMethod;
  readonly assignedScores: AbilityScoreAssignment;
};

export type TwoAndOneBackgroundAbilityScoreIncreaseSelection = {
  readonly [PlusTwo in Ability]: {
    readonly kind: "twoAndOne";
    readonly plusTwo: PlusTwo;
    readonly plusOne: Exclude<Ability, PlusTwo>;
  };
}[Ability];

export type BackgroundAbilityScoreIncreaseSelection =
  | TwoAndOneBackgroundAbilityScoreIncreaseSelection
  | {
      readonly kind: "oneEach";
    };

export const CHARACTER_CLASS_LEVELS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
] as const;
export type CharacterClassLevel = (typeof CHARACTER_CLASS_LEVELS)[number];

export function characterClassLevel(value: number): CharacterClassLevel {
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === value)) {
    throw new Error(
      `Character class level must be from 1 through 20: ${value}`,
    );
  }

  return value as CharacterClassLevel;
}

export type CharacterAdvancementSelection = {
  readonly entries: NonEmptyReadonlyArray<CharacterAdvancementEntry>;
};

export type CharacterAdvancementEntry = {
  readonly classUnitId: UnitRecord["id"];
  readonly level: CharacterClassLevel;
};

export type CharacterEquipmentSelection = {
  readonly selectedUnitIds: readonly UnitRecord["id"][];
};

export type CharacterDraftSelections = {
  readonly primaryClass?: UnitRecord["id"];
  readonly advancement?: CharacterAdvancementSelection;
  readonly background?: UnitRecord["id"];
  readonly abilityScoreGeneration?: AbilityScoreGenerationSelection;
  readonly backgroundAbilityScoreIncrease?: BackgroundAbilityScoreIncreaseSelection;
  readonly species?: UnitRecord["id"];
  readonly languages?: CharacterStartingLanguages;
  readonly alignment?: CharacterAlignment;
  readonly choices: readonly CharacterChoiceSelection[];
  readonly equipment?: CharacterEquipmentSelection;
};

export type CharacterDraft = {
  readonly draftId: CharacterDraftId;
  readonly selections: CharacterDraftSelections;
  // Optimistic concurrency token for fill batches against this draft identity.
  readonly revision: DraftRevision;
};

export type CreationSession = {
  readonly sessionId: CreationSessionId;
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
};

export type CreationChoiceOption = {
  readonly optionId: CreationChoiceOptionId;
  readonly label: string;
  readonly unitRef?: UnitRef;
};

export type CharacterSelectedChoiceOption = {
  readonly optionId: CreationChoiceOptionId;
  readonly unitRef?: UnitRef;
};

export type CharacterChoiceSelection = {
  readonly source: UnitChoiceSource;
  readonly options: readonly CharacterSelectedChoiceOption[];
};

export type CreationHole =
  | {
      readonly kind: "choice";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
      readonly cardinality: ChoiceCardinality;
      readonly options: readonly CreationChoiceOption[];
    }
  | {
      readonly kind: "abilityScores";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
      readonly methods: readonly SupportedAbilityScoreMethod[];
    };

export type ChoiceCreationHole = Extract<
  CreationHole,
  { readonly kind: "choice" }
>;

export type CreationFill =
  | {
      readonly kind: "choice";
      readonly holeId: CreationHoleId;
      readonly optionIds: readonly CreationChoiceOptionId[];
    }
  | {
      readonly kind: "abilityScores";
      readonly holeId: CreationHoleId;
      readonly method: SupportedAbilityScoreMethod;
      readonly value: AbilityScoreAssignment;
    };

// Creation fill issues stay package-owned because this protocol validates
// atomic mutations to durable draft state. Runtime and battle hole fills are
// transient action-resolution inputs: they can share hole-shape algebras, but
// not this batch/error vocabulary without losing domain precision.
export const CREATION_FILL_ISSUE_CODES = [
  "unknownHole",
  "duplicateFill",
  "wrongFillKind",
  "invalidChoice",
  "invalidAbilityScores",
  "tooFewChoices",
  "tooManyChoices",
  "unsupportedChoice",
] as const;
export type CreationFillIssueCode = (typeof CREATION_FILL_ISSUE_CODES)[number];

export type CreationFillIssue = {
  readonly tag: "illegalFill";
  readonly holeId: CreationHoleId;
  readonly fillIndex: FillIndex;
  readonly code: CreationFillIssueCode;
  readonly message: string;
};

export const CREATION_BATCH_ISSUE_CODES = ["staleRevision"] as const;
export type CreationBatchIssueCode =
  (typeof CREATION_BATCH_ISSUE_CODES)[number];

export type CreationBatchIssue = {
  readonly tag: "illegalBatch";
  readonly code: CreationBatchIssueCode;
  readonly message: string;
};

export const CREATION_FINALIZATION_ISSUE_CODES = [
  "illegalFinalization",
] as const;
export type CreationFinalizationIssueCode =
  (typeof CREATION_FINALIZATION_ISSUE_CODES)[number];

export type CreationFinalizationIssue = {
  readonly tag: "illegalFinalization";
  readonly code: CreationFinalizationIssueCode;
  readonly message: string;
};

export type CreationBatchFillIssue = CreationFillIssue | CreationBatchIssue;
export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export function nonEmptyReadonlyArray<T>(
  values: readonly T[],
): NonEmptyReadonlyArray<T> | undefined {
  const first = values[0];
  return first == null ? undefined : [first, ...values.slice(1)];
}

export type CreationBatchFillInput = {
  readonly draft: CharacterDraft;
  readonly fills: readonly CreationFill[];
  readonly expectedRevision: DraftRevision;
};

export type CreationBatchFillResult =
  | {
      readonly tag: "accepted";
      readonly draft: CharacterDraft;
      readonly holes: readonly CreationHole[];
      readonly finalization: CreationFinalizationResult;
    }
  | {
      readonly tag: "rejected";
      readonly draft: CharacterDraft;
      readonly holes: readonly CreationHole[];
      readonly issues: NonEmptyReadonlyArray<CreationBatchFillIssue>;
      readonly finalization: CreationFinalizationResult;
    };

// Finalization-internal boundary: a complete draft snapshot after all
// creation-session holes have been filled and before durable CharacterBuild
// facts are derived. Do not store this shape on CharacterBuild.
export type FinalizedCharacterSelections = {
  readonly primaryClass: UnitRecord["id"];
  readonly advancement: CharacterAdvancementSelection;
  readonly background: UnitRecord["id"];
  readonly abilityScoreGeneration: AbilityScoreGenerationSelection;
  readonly backgroundAbilityScoreIncrease: BackgroundAbilityScoreIncreaseSelection;
  readonly species: UnitRecord["id"];
  readonly languages: CharacterStartingLanguages;
  readonly alignment: CharacterAlignment;
  readonly choices: readonly CharacterChoiceSelection[];
  readonly equipment: CharacterEquipmentSelection;
};

export type CharacterBuildAbilityScores = AbilityScoreAssignment;

export type CharacterBuildHitPoints = {
  readonly maximum: HP;
  readonly hitDice: readonly CharacterBuildHitDiePool[];
};

/**
 * Recoverable player-character Hit Dice grouped by class.
 *
 * This is a character-build resource used for short-rest healing and
 * long-rest recovery. It is intentionally separate from monster stat-block
 * Hit Point Dice, which are authored HP formula data rather than a PC class
 * recovery pool.
 */
export type CharacterBuildHitDiePool = {
  readonly classUnitId: UnitRecord["id"];
  readonly dieSize: HitDieSize;
  readonly total: HitDieTotal;
};

export type CharacterBuildProficiencies = {
  readonly savingThrows: readonly Ability[];
  readonly skills: readonly Skill[];
  readonly weapon: readonly WeaponProficiencyCategory[];
  readonly tools: readonly CreationChoiceOptionId[];
};

export type CharacterBuildFeature =
  | {
      readonly kind: "classFeature";
      readonly unitId: UnitRecord["id"];
      readonly level: CharacterClassLevel;
    }
  | {
      readonly kind: "backgroundOriginFeat";
      readonly unitId: UnitRecord["id"];
    }
  | {
      readonly kind: "speciesTrait";
      readonly unitId: UnitRecord["id"];
    }
  | {
      readonly kind: "classChoice";
      readonly unitId: UnitRecord["id"];
      readonly choiceKey: UnitChoiceKey;
    };

export type CharacterBuildResource = {
  readonly unitId: UnitRecord["id"];
  readonly resource: ActivationResource;
};

export type CharacterBuildLoadout = {
  readonly armor?: UnitRecord["id"];
  readonly shield?: UnitRecord["id"];
  readonly weapon?: {
    readonly unitId: UnitRecord["id"];
    readonly grip: "one_handed";
  };
};

// Phase 1 only records the supported default build loadout. The future in-play
// CharacterSheet owns mutable equipment state if active equipment can change
// during adventuring.
export type CharacterBuildEquipment = CharacterBuildLoadout;

// CharacterBuild is the creation output: durable build and identity facts.
// In-play CharacterSheet state such as current HP, Temporary Hit Points, and
// Hit Dice remaining belongs to the adventuring/rest boundary, not this package.
export type CharacterBuild = {
  readonly advancement: CharacterAdvancementSelection;
  readonly background: UnitRecord["id"];
  readonly species: UnitRecord["id"];
  readonly originLanguages: CharacterStartingLanguages;
  readonly alignment: CharacterAlignment;
  readonly abilityScores: CharacterBuildAbilityScores;
  readonly hitPoints: CharacterBuildHitPoints;
  readonly proficiencies: CharacterBuildProficiencies;
  readonly armorTraining: readonly ArmorTrainingCategory[];
  readonly features: readonly CharacterBuildFeature[];
  readonly resources: readonly CharacterBuildResource[];
  readonly equipment: CharacterBuildEquipment;
};

export type CreationFinalizationResult =
  | { readonly tag: "ready"; readonly build: CharacterBuild }
  | {
      readonly tag: "incomplete";
      readonly holes: NonEmptyReadonlyArray<CreationHole>;
    }
  | {
      readonly tag: "invalid";
      readonly issues: NonEmptyReadonlyArray<CreationFinalizationIssue>;
    };
