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
  type Language,
  type SelectableStandardLanguage,
  type StandardLanguage,
  characterClassLevel,
} from "@dnd/shared/game-facts";
import {
  SUPPORTED_ABILITY_SCORE_METHODS,
  abilityScoreAssignment,
  type ParsedAbilityScoreAssignment,
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
  ClassSpellcastingCreation,
  Skill,
  Size,
  UnitRecord,
  WeaponProficiency,
  WeaponProficiencyCategory,
  WizardSpellcastingCreation,
} from "@dnd/surface/surface/types";
import type { CharacterProgression } from "./character-progression-types.ts";

export { SUPPORTED_ABILITY_SCORE_METHODS, abilityScoreAssignment };
export type { SupportedAbilityScoreMethod };
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
  "draft.speciesSize",
  "draft.languages",
  "draft.alignment",
  "draft.choices",
  "draft.equipment",
] as const;
export type CharacterDraftPath = (typeof CHARACTER_DRAFT_PATHS)[number];
export const ABILITY_SCORE_GENERATION_DRAFT_PATH =
  "draft.abilityScoreGeneration" as const satisfies CharacterDraftPath;
export const CHARACTER_DRAFT_CHOICE_PATHS = [
  "draft.progression.initial",
  "draft.background",
  "draft.species",
  "draft.speciesSize",
  "draft.languages",
  "draft.alignment",
] as const satisfies ReadonlyArray<
  Exclude<CharacterDraftPath, typeof ABILITY_SCORE_GENERATION_DRAFT_PATH>
>;
export type CharacterDraftChoicePath =
  (typeof CHARACTER_DRAFT_CHOICE_PATHS)[number];

export const UNIT_CHOICE_KEYS = [
  "background_ability_score_increase",
  "background_tool_choice",
  "class_equipment_choice",
  "background_equipment_choice",
  "equipment_purchase",
  "class_skill_proficiency_choice",
  "class_tool_proficiency_choice",
  "class_subclass_choice",
  "class_feature_feat_choice",
  "class_feature_ability_score_increase_choice",
  "class_feature_proficiency_choice",
  "class_feature_language_choice",
  "divine_order",
  "primal_order",
  "paladin_fighting_style",
  "ranger_fighting_style",
  "bard_multiclass_skill_proficiency",
  "bard_multiclass_musical_instrument_proficiency",
  "ranger_multiclass_skill_proficiency",
  "rogue_multiclass_skill_proficiency",
  "eldritch_invocations",
  "weapon_mastery_options",
  "class_cantrip_choices",
  "class_prepared_spell_choices",
  "wizard_cantrip_choices",
  "wizard_spellbook_choices",
  "wizard_prepared_spell_choices",
] as const;
export type UnitChoiceKey = (typeof UNIT_CHOICE_KEYS)[number];

export type EldritchInvocationId = string & Brand.Brand<"EldritchInvocationId">;
const EldritchInvocationId = Brand.nominal<EldritchInvocationId>();
export const eldritchInvocationId: (value: string) => EldritchInvocationId =
  EldritchInvocationId;

export const LOADOUT_SLOTS = ["armor", "shield", "weapon"] as const;
export type LoadoutSlot = (typeof LOADOUT_SLOTS)[number];

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
      readonly tag: "unitChoice";
      readonly unitId: UnitChoiceSourceUnitId;
      readonly choiceKey: UnitChoiceKey;
    }
  | {
      readonly tag: "loadout";
      readonly equipmentUnitId: LoadoutEquipmentUnitId;
      readonly slot: LoadoutSlot;
    };
export type UnitChoiceSource = Extract<
  CreationHoleSource,
  { readonly tag: "unitChoice" }
>;
export type LoadoutSource = Extract<
  CreationHoleSource,
  { readonly tag: "loadout" }
>;
export type DraftCreationHoleSource = Extract<
  CreationHoleSource,
  { readonly tag: "draft" }
>;
export type DraftChoiceCreationHoleSource = DraftCreationHoleSource & {
  readonly path: CharacterDraftChoicePath;
};
export type AbilityScoreGenerationSource = DraftCreationHoleSource & {
  readonly path: typeof ABILITY_SCORE_GENERATION_DRAFT_PATH;
};
export type ChoiceCreationHoleSource =
  | DraftChoiceCreationHoleSource
  | UnitChoiceSource
  | LoadoutSource;

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

export type LoadoutEquipmentUnitId = UnitRecord["id"] &
  Brand.Brand<"LoadoutEquipmentUnitId">;
const LoadoutEquipmentUnitId = Brand.nominal<LoadoutEquipmentUnitId>();

export type LoadoutEquipmentUnitIdIssue = {
  readonly tag: "loadoutEquipmentUnitIdEmpty";
  readonly value: UnitRecord["id"];
};

export function loadoutEquipmentUnitId(
  value: UnitRecord["id"],
): Either.Either<LoadoutEquipmentUnitId, LoadoutEquipmentUnitIdIssue> {
  return value.length > 0
    ? Either.right(LoadoutEquipmentUnitId(value))
    : Either.left({ tag: "loadoutEquipmentUnitIdEmpty", value });
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
  // Template evidence is local to the source/key isomorphism.
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
    tag: "unitChoice",
    unitId: sourceUnitId.right,
    // UNIT_CHOICE_KEYS membership check above establishes the literal union.
    choiceKey: choiceKey as UnitChoiceKey,
  });
}

export type LoadoutSourceKeyText =
  `e:${number}:${LoadoutEquipmentUnitId}:s:${LoadoutSlot}`;
export type LoadoutSourceKey = LoadoutSourceKeyText &
  Brand.Brand<"LoadoutSourceKey">;
const LoadoutSourceKey = Brand.nominal<LoadoutSourceKey>();

export type LoadoutSourceKeyIssue =
  | {
      readonly tag: "loadoutSourceKeyPrefixMismatch";
      readonly value: string;
    }
  | { readonly tag: "loadoutSourceKeyMissingLength"; readonly value: string }
  | {
      readonly tag: "loadoutSourceKeyInvalidLength";
      readonly value: string;
      readonly lengthText: string;
    }
  | {
      readonly tag: "loadoutSourceKeyMissingSlotPrefix";
      readonly value: string;
    }
  | {
      readonly tag: "loadoutSourceKeyUnsupportedSlot";
      readonly value: string;
      readonly slot: string;
    };

export function loadoutSourceKey(source: LoadoutSource): LoadoutSourceKey {
  // Template evidence is local to the source/key isomorphism.
  return LoadoutSourceKey(
    `e:${source.equipmentUnitId.length}:${source.equipmentUnitId}:s:${source.slot}` as LoadoutSourceKeyText,
  );
}

export function parseLoadoutSourceKey(
  value: string,
): Either.Either<LoadoutSource, LoadoutSourceKeyIssue> {
  const prefix = "e:";
  if (!value.startsWith(prefix)) {
    return Either.left({ tag: "loadoutSourceKeyPrefixMismatch", value });
  }

  const lengthStart = prefix.length;
  const lengthEnd = value.indexOf(":", lengthStart);
  if (lengthEnd < 0) {
    return Either.left({ tag: "loadoutSourceKeyMissingLength", value });
  }

  const lengthText = value.slice(lengthStart, lengthEnd);
  const equipmentUnitIdLength = Number(lengthText);
  if (
    !Number.isInteger(equipmentUnitIdLength) ||
    equipmentUnitIdLength < 1 ||
    String(equipmentUnitIdLength) !== lengthText
  ) {
    return Either.left({
      tag: "loadoutSourceKeyInvalidLength",
      value,
      lengthText,
    });
  }

  const equipmentUnitIdStart = lengthEnd + 1;
  const equipmentUnitIdEnd = equipmentUnitIdStart + equipmentUnitIdLength;
  const equipmentUnitIdText = value.slice(
    equipmentUnitIdStart,
    equipmentUnitIdEnd,
  );
  if (equipmentUnitIdText.length !== equipmentUnitIdLength) {
    return Either.left({
      tag: "loadoutSourceKeyInvalidLength",
      value,
      lengthText,
    });
  }
  const equipmentUnitId = loadoutEquipmentUnitId(equipmentUnitIdText);
  if (Either.isLeft(equipmentUnitId)) {
    return Either.left({
      tag: "loadoutSourceKeyInvalidLength",
      value,
      lengthText,
    });
  }

  const slotPrefix = ":s:";
  if (!value.startsWith(slotPrefix, equipmentUnitIdEnd)) {
    return Either.left({ tag: "loadoutSourceKeyMissingSlotPrefix", value });
  }

  const slot = value.slice(equipmentUnitIdEnd + slotPrefix.length);
  if (!LOADOUT_SLOTS.some((candidate) => candidate === slot)) {
    return Either.left({
      tag: "loadoutSourceKeyUnsupportedSlot",
      value,
      slot,
    });
  }

  return Either.right({
    tag: "loadout",
    equipmentUnitId: equipmentUnitId.right,
    // LOADOUT_SLOTS membership check above establishes the literal union.
    slot: slot as LoadoutSlot,
  });
}

export type CreationHoleIdText =
  | `cc:draft:${CharacterDraftPath}`
  | `cc:unit-source:${UnitChoiceSourceKeyText}`
  | `cc:loadout-source:${LoadoutSourceKeyText}`;

export type CreationHoleId = CreationHoleIdText & Brand.Brand<"CreationHoleId">;
const CreationHoleId = Brand.nominal<CreationHoleId>();
export const creationHoleId: (value: CreationHoleIdText) => CreationHoleId =
  CreationHoleId;

export function unitChoiceSourceHoleIdText(
  source: UnitChoiceSource,
): CreationHoleIdText {
  // CreationHoleIdText composes the branded source/key isomorphism with a fixed prefix.
  return `cc:unit-source:${unitChoiceSourceKey(source)}` as CreationHoleIdText;
}

export function loadoutSourceHoleIdText(
  source: LoadoutSource,
): CreationHoleIdText {
  // CreationHoleIdText composes the branded source/key isomorphism with a fixed prefix.
  return `cc:loadout-source:${loadoutSourceKey(source)}` as CreationHoleIdText;
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
  if (value.startsWith(unitPrefix)) {
    const source = parseUnitChoiceSourceKey(value.slice(unitPrefix.length));
    return Either.isRight(source)
      ? unitChoiceSourceHoleIdText(source.right)
      : null;
  }

  const loadoutPrefix = "cc:loadout-source:";
  if (!value.startsWith(loadoutPrefix)) return null;
  const source = parseLoadoutSourceKey(value.slice(loadoutPrefix.length));
  return Either.isRight(source) ? loadoutSourceHoleIdText(source.right) : null;
}

export const CHARACTER_EQUIPMENT_ITEM_SLOTS = [
  "armor",
  "shield",
  "main",
  "off",
] as const;
export type CharacterEquipmentItemSlot =
  (typeof CHARACTER_EQUIPMENT_ITEM_SLOTS)[number];

export type CharacterEquipmentItemUnitId = UnitRecord["id"] &
  Brand.Brand<"CharacterEquipmentItemUnitId">;
const CharacterEquipmentItemUnitId =
  Brand.nominal<CharacterEquipmentItemUnitId>();

export type CharacterEquipmentItemUnitIdIssue = {
  readonly tag: "characterEquipmentItemUnitIdEmpty";
  readonly value: UnitRecord["id"];
};

export function characterEquipmentItemUnitId(
  value: UnitRecord["id"],
): Either.Either<
  CharacterEquipmentItemUnitId,
  CharacterEquipmentItemUnitIdIssue
> {
  return value.length > 0
    ? Either.right(CharacterEquipmentItemUnitId(value))
    : Either.left({ tag: "characterEquipmentItemUnitIdEmpty", value });
}

export function characterEquipmentItemUnitIdFromLoadoutEquipmentUnitId(
  value: LoadoutEquipmentUnitId,
): CharacterEquipmentItemUnitId {
  return CharacterEquipmentItemUnitId(value);
}

export type ToolProficiencyId = string & Brand.Brand<"ToolProficiencyId">;
const ToolProficiencyId = Brand.nominal<ToolProficiencyId>();
export const MUSICAL_INSTRUMENT_TOOL_PROFICIENCY_IDS = [
  "tool_bagpipes",
  "tool_drum",
  "tool_dulcimer",
  "tool_flute",
  "tool_horn",
  "tool_lute",
  "tool_lyre",
  "tool_pan_flute",
  "tool_shawm",
  "tool_viol",
] as const;
export const CHARACTER_BUILD_TOOL_PROFICIENCY_IDS = [
  "tool_dice_set",
  "herbalism_kit",
  "thieves_tools",
  ...MUSICAL_INSTRUMENT_TOOL_PROFICIENCY_IDS,
] as const;
export type ToolProficiencyIdText =
  (typeof CHARACTER_BUILD_TOOL_PROFICIENCY_IDS)[number];
export function isCharacterBuildToolProficiencyId(
  value: string,
): value is ToolProficiencyIdText {
  return CHARACTER_BUILD_TOOL_PROFICIENCY_IDS.some(
    (candidate) => candidate === value,
  );
}
export function toolProficiencyId(
  value: ToolProficiencyIdText,
): ToolProficiencyId {
  return ToolProficiencyId(value);
}

export type CharacterEquipmentItemSource<
  Slot extends CharacterEquipmentItemSlot = CharacterEquipmentItemSlot,
> = {
  readonly slot: Slot;
  readonly unitId: CharacterEquipmentItemUnitId;
};

export type CharacterEquipmentItemIdText<
  Slot extends CharacterEquipmentItemSlot = CharacterEquipmentItemSlot,
> = `${Slot}:${CharacterEquipmentItemUnitId}`;
export type CharacterEquipmentItemId<
  Slot extends CharacterEquipmentItemSlot = CharacterEquipmentItemSlot,
> = CharacterEquipmentItemIdText<Slot> &
  Brand.Brand<"CharacterEquipmentItemId">;
const CharacterEquipmentItemId = Brand.nominal<CharacterEquipmentItemId>();

export type CharacterEquipmentItemIdIssue =
  | {
      readonly tag: "characterEquipmentItemIdSlotUnsupported";
      readonly value: string;
    }
  | {
      readonly tag: "characterEquipmentItemIdUnitIdEmpty";
      readonly value: string;
      readonly slot: CharacterEquipmentItemSlot;
    };

export function characterEquipmentItemId<
  const Slot extends CharacterEquipmentItemSlot,
>(source: CharacterEquipmentItemSource<Slot>): CharacterEquipmentItemId<Slot> {
  // Template evidence is local to the source/key isomorphism: slot is narrowed
  // to the item slot literal and unitId is already branded non-empty.
  return CharacterEquipmentItemId(
    `${source.slot}:${source.unitId}` as CharacterEquipmentItemIdText<Slot>,
  ) as CharacterEquipmentItemId<Slot>;
}

export function parseCharacterEquipmentItemId(
  value: string,
): Either.Either<CharacterEquipmentItemSource, CharacterEquipmentItemIdIssue> {
  const slot = CHARACTER_EQUIPMENT_ITEM_SLOTS.find((candidate) =>
    value.startsWith(`${candidate}:`),
  );
  if (slot == null) {
    return Either.left({
      tag: "characterEquipmentItemIdSlotUnsupported",
      value,
    });
  }

  const unitIdText = value.slice(slot.length + 1);
  const unitId = characterEquipmentItemUnitId(unitIdText);
  return Either.isRight(unitId)
    ? Either.right({ slot, unitId: unitId.right })
    : Either.left({
        tag: "characterEquipmentItemIdUnitIdEmpty",
        value,
        slot,
      });
}

export function characterEquipmentItemSourceFromId(
  itemId: CharacterEquipmentItemId,
): CharacterEquipmentItemSource {
  const source = parseCharacterEquipmentItemId(itemId);
  if (Either.isRight(source)) {
    return source.right;
  }

  // Branded ids are only produced by characterEquipmentItemId or an explicit
  // unsafe cast, so this is an invariant failure rather than caller validation.
  throw new Error(
    `CharacterEquipmentItemId invariant violated: ${String(itemId)}`,
  );
}

export type UnitRef = {
  readonly unitId: UnitRecord["id"];
};

export type AbilityScoreGenerationSelection = {
  readonly method: SupportedAbilityScoreMethod;
  readonly assignedScores: CharacterCreationAbilityScoreAssignment;
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

export const CHARACTER_SPECIES_SIZE_SELECTIONS = [
  "medium",
  "small",
] as const satisfies ReadonlyArray<Size>;
export type CharacterSpeciesSizeSelection =
  (typeof CHARACTER_SPECIES_SIZE_SELECTIONS)[number];
export function isCharacterSpeciesSizeSelection(
  value: string | undefined,
): value is CharacterSpeciesSizeSelection {
  return CHARACTER_SPECIES_SIZE_SELECTIONS.some((size) => size === value);
}

export type CharacterDraftSelections = {
  readonly progression?: CharacterProgression;
  readonly background?: UnitRecord["id"];
  readonly abilityScoreGeneration?: AbilityScoreGenerationSelection;
  readonly backgroundAbilityScoreIncrease?: BackgroundAbilityScoreIncreaseSelection;
  readonly species?: UnitRecord["id"];
  readonly speciesSize?: CharacterSpeciesSizeSelection;
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

export type LoadoutSelectedChoiceOption = {
  readonly optionId: CreationChoiceOptionId;
};

export type CharacterChoiceSelection =
  | {
      readonly kind: "unitChoice";
      readonly source: UnitChoiceSource;
      readonly options: readonly CharacterSelectedChoiceOption[];
    }
  | {
      readonly kind: "loadout";
      readonly source: LoadoutSource;
      readonly options: readonly [LoadoutSelectedChoiceOption];
    };

export type CreationHole =
  | {
      readonly kind: "choice";
      readonly holeId: CreationHoleId;
      readonly source: ChoiceCreationHoleSource;
      readonly cardinality: ChoiceCardinality;
      readonly options: readonly CreationChoiceOption[];
    }
  | {
      readonly kind: "abilityScores";
      readonly holeId: CreationHoleId;
      readonly source: AbilityScoreGenerationSource;
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
      readonly value: CharacterCreationAbilityScoreAssignment;
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
  "invalidChoiceOption",
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
      readonly tag: "invalidChoiceOption";
      readonly code: "invalidChoiceOption";
      readonly optionId: string;
      readonly reason: string;
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
  // Present only when the selected species has a size choice in Surface.
  // Absence means the species has a fixed authored size.
  readonly speciesSize?: CharacterSpeciesSizeSelection;
  readonly languages: CharacterStartingLanguages;
  readonly alignment: CharacterAlignment;
  readonly choices: readonly CharacterChoiceSelection[];
  readonly equipment: CharacterEquipmentSelection;
};

export type CharacterCreationAbilityScoreAssignment =
  ParsedAbilityScoreAssignment;
export type AbilityScoreAssignment = CharacterCreationAbilityScoreAssignment;
export type CharacterBuildAbilityScores =
  CharacterCreationAbilityScoreAssignment;

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
  readonly expertise: readonly Skill[];
  readonly weapon: readonly WeaponProficiencyCategory[];
  readonly weaponPropertyFilters: readonly Extract<
    WeaponProficiency,
    { readonly kind: "weapon_category_with_properties" }
  >[];
  readonly tools: readonly ToolProficiencyId[];
};

export type CharacterBuildProficiencyChoiceSubject =
  | { readonly kind: "skill"; readonly skill: Skill }
  | { readonly kind: "skill_expertise"; readonly skill: Skill }
  | {
      readonly kind: "weapon_category";
      readonly category: WeaponProficiencyCategory;
    }
  | {
      readonly kind: "armor_category";
      readonly category: ArmorTrainingCategory;
    }
  | { readonly kind: "tool"; readonly toolId: ToolProficiencyId };

type CharacterBuildSelectedFeatureSource = {
  readonly selectedFromUnitId: UnitRecord["id"];
};

export type CharacterBuildFeature =
  | (CharacterBuildSelectedFeatureSource & {
      readonly kind: "selectedClassChoice";
      readonly unitId: UnitRecord["id"];
    })
  | (CharacterBuildSelectedFeatureSource & {
      readonly kind: "selectedEldritchInvocation";
      readonly selection: CharacterBuildEldritchInvocationSelection;
    })
  | CharacterBuildAbilityCheckBonusFeature;

export type CharacterBuildEldritchInvocationSelection =
  | {
      readonly kind: "nonRepeatable";
      readonly invocationId: EldritchInvocationId;
    }
  | {
      readonly kind: "repeatable";
      readonly invocationId: EldritchInvocationId;
      readonly repeatableChoice: CharacterBuildEldritchInvocationRepeatableChoice;
    };

export type CharacterBuildEldritchInvocationRepeatableChoice =
  | {
      readonly kind: "knownWarlockCantrip";
      readonly cantripId: UnitRecord["id"];
    }
  | {
      readonly kind: "originFeat";
      readonly featUnitId: UnitRecord["id"];
    };

type CharacterBuildAbilityCheckBonusFeature =
  CharacterBuildSelectedFeatureSource & {
    readonly kind: "abilityCheckBonus";
    readonly ability: Ability;
    readonly skills: readonly Skill[];
    readonly bonus: {
      readonly kind: "abilityModifier";
      readonly ability: Ability;
      readonly minimum: number;
    };
  };

export type CharacterBuildResource = {
  readonly unitId: UnitRecord["id"];
  readonly resource: ActivationResource;
};

export type CharacterBuildSpellcasting = {
  readonly sources: NonEmptyReadonlyArray<CharacterBuildSpellcastingSource>;
  readonly slotPools: CharacterBuildSpellSlotPools;
};

export type CharacterBuildSpellcastingSource = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly spellcastingAbility: Ability;
  readonly cantrips: readonly UnitRecord["id"][];
  readonly spellbook: readonly UnitRecord["id"][];
  readonly preparedSpells: readonly UnitRecord["id"][];
  readonly spellcastingFocuses: readonly CharacterBuildSpellcastingFocus[];
  readonly bookOfShadows?: CharacterBuildBookOfShadowsSpellAccess;
};

export type CharacterBuildBookOfShadowsSpellAccess = {
  readonly tag: "bookOfShadows";
  readonly cantrips: readonly [
    UnitRecord["id"],
    UnitRecord["id"],
    UnitRecord["id"],
  ];
  readonly ritualSpells: readonly [UnitRecord["id"], UnitRecord["id"]];
  readonly spellcastingFocus: "book_of_shadows";
};

export type CharacterBuildSpellSlotPools = {
  readonly spellcasting?: CharacterBuildSpellcastingSlotPool;
  readonly pactMagic?: CharacterBuildPactMagicSlotPool;
};

export type CharacterBuildSpellcastingSlotPool = {
  readonly kind: "spellcasting";
  readonly slots: readonly CharacterBuildSpellSlotCapacity[];
};

export type CharacterBuildPactMagicSlotPool = {
  readonly kind: "pactMagic";
  readonly slotLevel: CharacterBuildSpellLevel;
  readonly count: CharacterBuildSpellSlotCount;
};

export type CharacterBuildSpellcastingFocus =
  | WizardSpellcastingCreation["spellcastingFocuses"][number]
  | CharacterBuildBookOfShadowsSpellAccess["spellcastingFocus"]
  | Extract<
      ClassSpellcastingCreation,
      {
        readonly kind:
          | "list_prepared_spellcasting_creation"
          | "list_prepared_spellcasting_progression_creation";
      }
    >["spellcastingFocus"]
  | Extract<
      ClassSpellcastingCreation,
      { readonly kind: "pact_magic_spellcasting_creation" }
    >["spellcastingFocus"];
export type CharacterBuildSpellLevel =
  WizardSpellcastingCreation["spellbookAccess"]["spells"][number]["spellLevel"];
export type CharacterBuildSpellSlotCount =
  WizardSpellcastingCreation["spellSlotProjection"]["slots"][number]["count"];

export type CharacterBuildSpellSlotCapacity = {
  readonly spellLevel: CharacterBuildSpellLevel;
  readonly count: CharacterBuildSpellSlotCount;
};

export type CharacterBuildLoadout = {
  readonly armor?: CharacterEquipmentItemId<"armor">;
  readonly shield?: CharacterEquipmentItemId<"shield">;
  readonly weapon?: {
    readonly itemId: CharacterEquipmentItemId<"main">;
    readonly grip: "one_handed";
  };
  readonly offHandWeapon?: {
    readonly itemId: CharacterEquipmentItemId<"off">;
  };
};

export type CharacterBuildOwnedEquipmentItem = {
  readonly itemId: CharacterEquipmentItemId;
  readonly unitId: UnitRecord["id"];
};

// The build records durable owned equipment separately from the initial loadout.
// Equipment acquisition provenance can be added when a workflow needs it; the
// current model intentionally keeps owned equipment source-less.
// The in-play Character Sheet owns mutable equipment state after creation.
export type CharacterBuildEquipment = {
  readonly owned: readonly CharacterBuildOwnedEquipmentItem[];
  readonly loadout: CharacterBuildLoadout;
};

export type CharacterBuildClassFeatureLanguage =
  | {
      readonly kind: "classFeatureLanguageGrant";
      readonly sourceUnitId: UnitRecord["id"];
      readonly language: Language;
    }
  | {
      readonly kind: "classFeatureLanguageChoice";
      readonly sourceUnitId: UnitRecord["id"];
      readonly language: Language;
    };

// CharacterBuild is the creation output: durable build and identity facts.
// In-play CharacterSheet state such as current HP, Temporary Hit Points, and
// Hit Dice remaining belongs to the adventuring/rest boundary, not this package.
export type CharacterBuild = {
  readonly progression: CharacterProgression;
  readonly background: UnitRecord["id"];
  readonly species: UnitRecord["id"];
  // Present only when the selected species has a size choice in Surface.
  // Absence means the species has a fixed authored size.
  readonly speciesSize?: CharacterSpeciesSizeSelection;
  readonly originLanguages: CharacterStartingLanguages;
  readonly classFeatureLanguages: readonly CharacterBuildClassFeatureLanguage[];
  readonly alignment: CharacterAlignment;
  readonly abilityScores: CharacterBuildAbilityScores;
  readonly proficiencyChoices: readonly CharacterBuildProficiencyChoiceSubject[];
  readonly features: readonly CharacterBuildFeature[];
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
