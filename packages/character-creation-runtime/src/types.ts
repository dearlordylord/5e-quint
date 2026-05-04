import { Brand, Either } from "effect";
import {
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  CHARACTER_CLASS_LEVELS,
  STANDARD_LANGUAGES,
  type Alignment as CharacterAlignment,
  type AlignmentMorality,
  type AlignmentOrder,
  type CharacterClassLevel,
  type CharacterStartingLanguages,
  type SelectableStandardLanguage,
  type StandardLanguage,
  characterClassLevel,
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
  WizardSpellcastingCreation,
} from "@dnd/surface/surface/types";
import type { CharacterProgression } from "./character-progression-types.ts";

export { SUPPORTED_ABILITY_SCORE_METHODS };
export type { AbilityScoreAssignment, SupportedAbilityScoreMethod };
export type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";

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
  CHARACTER_CLASS_LEVELS,
  STANDARD_LANGUAGES,
  type AlignmentMorality,
  type AlignmentOrder,
  type CharacterAlignment,
  type CharacterClassLevel,
  type CharacterStartingLanguages,
  type SelectableStandardLanguage,
  type StandardLanguage,
  characterClassLevel,
};

export const CHARACTER_DRAFT_PATHS = [
  "draft.progression.initial",
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
  "wizard_skill_choices",
  "wizard_cantrip_choices",
  "wizard_spellbook_choices",
  "wizard_prepared_spell_choices",
  "loadout_armor",
  "loadout_shield",
  "loadout_weapon",
] as const;
export type UnitChoiceKey = (typeof UNIT_CHOICE_KEYS)[number];

export type UnitChoiceKeyIssue = {
  readonly tag: "unsupportedUnitChoiceKey";
  readonly value: string;
};

export function unitChoiceKey(
  value: string,
): Either.Either<UnitChoiceKey, UnitChoiceKeyIssue> {
  return UNIT_CHOICE_KEYS.some((key) => key === value)
    ? Either.right(value as UnitChoiceKey)
    : Either.left({ tag: "unsupportedUnitChoiceKey", value });
}

export type CreationChoiceOptionId = string &
  Brand.Brand<"CreationChoiceOptionId">;
const CreationChoiceOptionId = Brand.nominal<CreationChoiceOptionId>();
export const creationChoiceOptionId: (value: string) => CreationChoiceOptionId =
  CreationChoiceOptionId;

export type ChoiceCount = number & Brand.Brand<"ChoiceCount">;
const ChoiceCount = Brand.nominal<ChoiceCount>();
export type ChoiceMinimumCount = NonNegativeIntegerType &
  Brand.Brand<"ChoiceMinimumCount">;
const ChoiceMinimumCount = Brand.all(
  NonNegativeInteger,
  Brand.nominal<ChoiceMinimumCount>(),
);

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

export type ChoiceCardinality =
  | {
      readonly tag: "exactly";
      readonly count: ChoiceCount;
    }
  | {
      readonly tag: "between";
      readonly min: ChoiceMinimumCount;
      readonly max: ChoiceCount;
    };

export function exactChoiceCardinality(
  count: number,
): ChoiceCardinality | undefined {
  if (!Number.isInteger(count) || count < 1) {
    return undefined;
  }

  return { tag: "exactly", count: ChoiceCount(count) };
}

export function boundedChoiceCardinality(input: {
  readonly min: number;
  readonly max: number;
}): ChoiceCardinality | undefined {
  if (
    !Number.isInteger(input.min) ||
    !Number.isInteger(input.max) ||
    input.min < 0 ||
    input.max < 1 ||
    input.max < input.min
  ) {
    return undefined;
  }

  if (input.min === input.max) {
    return exactChoiceCardinality(input.max);
  }

  return {
    tag: "between",
    min: ChoiceMinimumCount(input.min),
    max: ChoiceCount(input.max),
  };
}

export function choiceCardinalityBounds(cardinality: ChoiceCardinality): {
  readonly min: ChoiceMinimumCount | ChoiceCount;
  readonly max: ChoiceCount;
} {
  return cardinality.tag === "exactly"
    ? { min: cardinality.count, max: cardinality.count }
    : { min: cardinality.min, max: cardinality.max };
}

export function choiceCardinalityMax(cardinality: ChoiceCardinality): number {
  return choiceCardinalityBounds(cardinality).max;
}

export type CreationHoleSource =
  | { readonly tag: "draft"; readonly path: CharacterDraftPath }
  | {
      readonly tag: "unit";
      readonly unitId: UnitChoiceSourceUnitId;
      readonly choiceKey: UnitChoiceKey;
    };
export type UnitChoiceSource = Extract<
  CreationHoleSource,
  { readonly tag: "unit" }
>;

export type UnitChoiceSourceUnitId = UnitRecord["id"] &
  Brand.Brand<"UnitChoiceSourceUnitId">;
const UnitChoiceSourceUnitId = Brand.nominal<UnitChoiceSourceUnitId>();

export type UnitChoiceSourceUnitIdIssue = {
  readonly tag: "unitChoiceSourceUnitIdEmpty";
  readonly value: UnitRecord["id"];
};

export function unitChoiceSourceUnitId(
  value: UnitRecord["id"],
): Either.Either<UnitChoiceSourceUnitId, UnitChoiceSourceUnitIdIssue> {
  return value.length > 0
    ? Either.right(UnitChoiceSourceUnitId(value))
    : Either.left({ tag: "unitChoiceSourceUnitIdEmpty", value });
}

export type UnitChoiceSourceKeyText =
  `u:${number}:${UnitChoiceSourceUnitId}:c:${UnitChoiceKey}`;
export type UnitChoiceSourceKey = UnitChoiceSourceKeyText &
  Brand.Brand<"UnitChoiceSourceKey">;
const UnitChoiceSourceKey = Brand.nominal<UnitChoiceSourceKey>();

export type UnitChoiceSourceKeyIssue =
  | {
      readonly tag: "unitChoiceSourceKeyPrefixMismatch";
      readonly value: string;
    }
  | { readonly tag: "unitChoiceSourceKeyMissingLength"; readonly value: string }
  | {
      readonly tag: "unitChoiceSourceKeyInvalidLength";
      readonly value: string;
      readonly lengthText: string;
    }
  | {
      readonly tag: "unitChoiceSourceKeyMissingChoicePrefix";
      readonly value: string;
    }
  | {
      readonly tag: "unitChoiceSourceKeyUnsupportedChoiceKey";
      readonly value: string;
      readonly choiceKey: string;
    };

export function unitChoiceSourceKey(
  source: UnitChoiceSource,
): UnitChoiceSourceKey {
  // Template evidence is local to the codec: the parser below is the inverse.
  return UnitChoiceSourceKey(
    `u:${source.unitId.length}:${source.unitId}:c:${source.choiceKey}` as UnitChoiceSourceKeyText,
  );
}

export function parseUnitChoiceSourceKey(
  value: string,
): Either.Either<UnitChoiceSource, UnitChoiceSourceKeyIssue> {
  const prefix = "u:";
  if (!value.startsWith(prefix)) {
    return Either.left({ tag: "unitChoiceSourceKeyPrefixMismatch", value });
  }

  const lengthStart = prefix.length;
  const lengthEnd = value.indexOf(":", lengthStart);
  if (lengthEnd < 0) {
    return Either.left({ tag: "unitChoiceSourceKeyMissingLength", value });
  }

  const lengthText = value.slice(lengthStart, lengthEnd);
  const unitIdLength = Number(lengthText);
  if (
    !Number.isInteger(unitIdLength) ||
    unitIdLength < 1 ||
    String(unitIdLength) !== lengthText
  ) {
    return Either.left({
      tag: "unitChoiceSourceKeyInvalidLength",
      value,
      lengthText,
    });
  }

  const unitIdStart = lengthEnd + 1;
  const unitIdEnd = unitIdStart + unitIdLength;
  const unitId = value.slice(unitIdStart, unitIdEnd);
  if (unitId.length !== unitIdLength) {
    return Either.left({
      tag: "unitChoiceSourceKeyInvalidLength",
      value,
      lengthText,
    });
  }
  const sourceUnitId = unitChoiceSourceUnitId(unitId);
  if (Either.isLeft(sourceUnitId)) {
    return Either.left({
      tag: "unitChoiceSourceKeyInvalidLength",
      value,
      lengthText,
    });
  }

  const choicePrefix = ":c:";
  if (!value.startsWith(choicePrefix, unitIdEnd)) {
    return Either.left({
      tag: "unitChoiceSourceKeyMissingChoicePrefix",
      value,
    });
  }

  const choiceKey = value.slice(unitIdEnd + choicePrefix.length);
  if (!UNIT_CHOICE_KEYS.some((unitChoiceKey) => unitChoiceKey === choiceKey)) {
    return Either.left({
      tag: "unitChoiceSourceKeyUnsupportedChoiceKey",
      value,
      choiceKey,
    });
  }

  return Either.right({
    tag: "unit",
    unitId: sourceUnitId.right,
    // UNIT_CHOICE_KEYS membership check above establishes the literal union.
    choiceKey: choiceKey as UnitChoiceKey,
  });
}

export type CreationHoleIdText =
  | `cc:draft:${CharacterDraftPath}`
  | `cc:unit-source:${UnitChoiceSourceKeyText}`;

export type CreationHoleId = CreationHoleIdText & Brand.Brand<"CreationHoleId">;
const CreationHoleId = Brand.nominal<CreationHoleId>();
export const creationHoleId: (value: CreationHoleIdText) => CreationHoleId =
  CreationHoleId;

export function unitChoiceSourceHoleIdText(
  source: UnitChoiceSource,
): CreationHoleIdText {
  // CreationHoleIdText composes the branded source-key codec with a fixed prefix.
  return `cc:unit-source:${unitChoiceSourceKey(source)}` as CreationHoleIdText;
}

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

  const unitPrefix = "cc:unit-source:";
  if (!value.startsWith(unitPrefix)) return null;
  const source = parseUnitChoiceSourceKey(value.slice(unitPrefix.length));
  return Either.isRight(source)
    ? unitChoiceSourceHoleIdText(source.right)
    : null;
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

export type CharacterEquipmentSelection = {
  readonly selectedUnitIds: readonly UnitRecord["id"][];
};

export type CharacterDraftSelections = {
  readonly progression?: CharacterProgression;
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
  readonly unitLibrary: UnitCatalog;
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
  "unsupportedFinalization",
] as const;
export type CreationFinalizationIssueCode =
  (typeof CREATION_FINALIZATION_ISSUE_CODES)[number];

export type CreationFinalizationIssue =
  | {
      readonly tag: "illegalFinalization";
      readonly code: "illegalFinalization";
      readonly message: string;
    }
  | {
      readonly tag: "unsupportedFinalization";
      readonly code: "unsupportedFinalization";
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
  readonly progression: CharacterProgression;
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

export type CharacterBuildSpellcasting = {
  readonly spellcastingAbility: Ability;
  readonly cantrips: readonly UnitRecord["id"][];
  readonly spellbook: readonly CharacterBuildSpellbookEntry[];
  readonly preparedSpells: readonly UnitRecord["id"][];
  readonly spellSlots: readonly CharacterBuildSpellSlotCapacity[];
  readonly spellcastingFocuses: readonly CharacterBuildSpellcastingFocus[];
};

export type CharacterBuildSpellcastingFocus =
  WizardSpellcastingCreation["spellcastingFocuses"][number];
export type CharacterBuildSpellLevel =
  WizardSpellcastingCreation["spellbookAccess"]["spells"][number]["spellLevel"];
export type CharacterBuildSpellSlotCount =
  WizardSpellcastingCreation["spellSlotProjection"]["slots"][number]["count"];

export type CharacterBuildSpellbookEntry = {
  readonly spellId: UnitRecord["id"];
  readonly spellLevel: CharacterBuildSpellLevel;
};

export type CharacterBuildSpellSlotCapacity = {
  readonly spellLevel: CharacterBuildSpellLevel;
  readonly count: CharacterBuildSpellSlotCount;
};

export type CharacterBuildLoadout = {
  readonly armor?: UnitRecord["id"];
  readonly shield?: UnitRecord["id"];
  readonly weapon?: {
    readonly itemId: string;
    readonly unitId: UnitRecord["id"];
    readonly grip: "one_handed";
  };
  readonly offHandWeapon?: {
    readonly itemId: string;
    readonly unitId: UnitRecord["id"];
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
  readonly progression: CharacterProgression;
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
  readonly spellcasting?: CharacterBuildSpellcasting;
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
