// KERNEL-COVERAGE: runtime-owner CREATION.CHOICE_DISCOVERY_CARDINALITY

import {
  creationChoiceOptionId,
  creationHoleId,
  choiceCardinalityMax,
  loadoutEquipmentUnitIdFromUnitId,
  loadoutSourceHoleIdText,
  unitChoiceSourceUnitIdFromUnitId,
  unitChoiceSourceHoleIdText,
  type BackgroundAbilityScoreIncreaseSelection,
  type CharacterDraftPath,
  type CharacterDraftSelections,
  type ChoiceCardinality,
  type ChoiceCreationHoleSource,
  type CreationChoiceOption,
  type CreationChoiceOptionId,
  type CreationHole,
  type CreationHoleId,
  type CreationHoleSource,
  type DraftCreationHoleSource,
  type CharacterSelectedChoiceOption,
  type LoadoutSlot,
  type LoadoutSource,
  type UnitChoiceKey,
  type UnitChoiceSource,
} from "./types.ts";
import type {
  Ability,
  Skill,
  StartingEquipmentChoice,
  StartingEquipmentItemRef,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { ABILITIES } from "@dnd/shared/types";
import { Match } from "effect";

const BACKGROUND_ASI_ONE_EACH_OPTION_ID = "one_each";
const BACKGROUND_ASI_TWO_AND_ONE_OPTION_PREFIX = "two_and_one";
type BackgroundAbilityScoreTwoAndOneOptionIdText = {
  readonly [PlusTwo in Ability]: `${typeof BACKGROUND_ASI_TWO_AND_ONE_OPTION_PREFIX}:${PlusTwo}:${Exclude<Ability, PlusTwo>}`;
}[Ability];
export type BackgroundAbilityScoreIncreaseOptionIdText =
  | typeof BACKGROUND_ASI_ONE_EACH_OPTION_ID
  | BackgroundAbilityScoreTwoAndOneOptionIdText;

export function hasDraftSelection(
  selections: CharacterDraftSelections,
  path: CharacterDraftPath,
): boolean {
  return (
    (path === "draft.progression.initial" && selections.progression != null) ||
    (path === "draft.background" && selections.background != null) ||
    (path === "draft.species" && selections.species != null) ||
    (path === "draft.speciesSize" && selections.speciesSize != null) ||
    (path === "draft.draconicAncestry" &&
      selections.draconicAncestry != null) ||
    (path === "draft.abilityScoreGeneration" &&
      selections.abilityScoreGeneration != null) ||
    (path === "draft.languages" && selections.languages != null) ||
    (path === "draft.alignment" && selections.alignment != null)
  );
}

export function backgroundAbilityScoreIncreaseOptions(
  abilities: readonly Ability[],
): readonly CreationChoiceOption[] {
  const twoAndOneOptions = abilities.flatMap((plusTwo) =>
    abilities
      .filter((plusOne) => plusOne !== plusTwo)
      .map((plusOne) => ({
        // TypeScript cannot infer this mapped union branch from the local
        // plusOne !== plusTwo filter above.
        optionId: backgroundAbilityScoreIncreaseOptionId({
          kind: "twoAndOne",
          plusTwo,
          plusOne,
        } as BackgroundAbilityScoreIncreaseSelection),
        label: `+2 ${abilityLabel(plusTwo)}, +1 ${abilityLabel(plusOne)}`,
      })),
  );

  return [
    ...twoAndOneOptions,
    {
      optionId: backgroundAbilityScoreIncreaseOptionId({ kind: "oneEach" }),
      label: abilities
        .map((ability) => `+1 ${abilityLabel(ability)}`)
        .join(", "),
    },
  ];
}

export function backgroundAbilityScoreIncreaseOptionId(
  selection: BackgroundAbilityScoreIncreaseSelection,
): CreationChoiceOptionId {
  if (selection.kind === "oneEach") {
    return creationChoiceOptionId(BACKGROUND_ASI_ONE_EACH_OPTION_ID);
  }

  const optionIdText =
    `${BACKGROUND_ASI_TWO_AND_ONE_OPTION_PREFIX}:${selection.plusTwo}:${selection.plusOne}` as BackgroundAbilityScoreIncreaseOptionIdText;
  return creationChoiceOptionId(optionIdText);
}

export function parseBackgroundAbilityScoreIncreaseOptionId(
  optionId: CreationChoiceOptionId,
): BackgroundAbilityScoreIncreaseSelection | undefined {
  if (optionId === BACKGROUND_ASI_ONE_EACH_OPTION_ID) {
    return { kind: "oneEach" };
  }

  const parts = optionId.split(":");
  const plusTwo = parts[1];
  const plusOne = parts[2];
  if (
    parts.length !== 3 ||
    parts[0] !== BACKGROUND_ASI_TWO_AND_ONE_OPTION_PREFIX ||
    !isBackgroundAsiAbility(plusTwo) ||
    !isBackgroundAsiAbility(plusOne) ||
    plusTwo === plusOne
  ) {
    return undefined;
  }

  // TypeScript cannot infer the mapped union branch from the local plusTwo !==
  // plusOne check above; the parser has established exactly that invariant.
  return {
    kind: "twoAndOne",
    plusTwo,
    plusOne,
  } as BackgroundAbilityScoreIncreaseSelection;
}

function isBackgroundAsiAbility(value: string | undefined): value is Ability {
  return value != null && ABILITIES.some((ability) => ability === value);
}

export function choiceHole(input: {
  readonly source: ChoiceCreationHoleSource;
  readonly cardinality: ChoiceCardinality | undefined;
  readonly options: readonly CreationChoiceOption[];
}): CreationHole | undefined {
  if (input.cardinality === undefined) {
    return undefined;
  }
  const maxCount = choiceCardinalityMax(input.cardinality);
  if (maxCount > input.options.length) {
    return undefined;
  }

  return {
    kind: "choice",
    holeId: holeIdForSource(input.source),
    source: input.source,
    cardinality: input.cardinality,
    options: input.options,
  };
}

export function draftSource<Path extends CharacterDraftPath>(
  path: Path,
): DraftCreationHoleSource & { readonly path: Path } {
  return { tag: "draft", path };
}

export function unitSource(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): UnitChoiceSource {
  return {
    tag: "unitChoice",
    unitId: unitChoiceSourceUnitIdFromUnitId(unitId),
    choiceKey,
  };
}

export function loadoutSource(
  equipmentUnitId: UnitRecord["id"],
  slot: LoadoutSlot,
): LoadoutSource {
  return {
    tag: "loadout",
    equipmentUnitId: loadoutEquipmentUnitIdFromUnitId(equipmentUnitId),
    slot,
  };
}

export function holeIdForSource(source: CreationHoleSource): CreationHoleId {
  if (source.tag === "draft") {
    return creationHoleId(`cc:draft:${source.path}`);
  }

  return creationHoleId(
    source.tag === "unitChoice"
      ? unitChoiceSourceHoleIdText(source)
      : loadoutSourceHoleIdText(source),
  );
}

export function unitOption(unit: UnitRecord): CreationChoiceOption {
  return {
    optionId: creationChoiceOptionId(unit.id),
    label: unit.name,
    unitRef: { unitId: unit.id },
  };
}

export function skillOption(skill: Skill): CreationChoiceOption {
  return {
    optionId: creationChoiceOptionId(skill),
    label: skillLabel(skill),
  };
}

export function selectedChoiceOption(
  option: CreationChoiceOption,
): CharacterSelectedChoiceOption {
  return option.unitRef == null
    ? { optionId: option.optionId }
    : { optionId: option.optionId, unitRef: option.unitRef };
}

export function startingEquipmentLabel(
  choice: StartingEquipmentChoice,
): string {
  return Match.value(choice).pipe(
    Match.when(
      { kind: "coin_grant" },
      ({ id, coinsGp }) =>
        `${id} — ${coinsGp} GP instead of an equipment package`,
    ),
    Match.when({ kind: "item_bundle" }, ({ id, items, coinsGp }) => {
      const itemSummary = items.map(startingEquipmentItemLabel).join(", ");
      const coinSummary = coinsGp === undefined ? "" : `; plus ${coinsGp} GP`;
      return `${id} — equipment package: ${itemSummary}${coinSummary}`;
    }),
    Match.exhaustive,
  );
}

function startingEquipmentItemLabel(item: StartingEquipmentItemRef): string {
  return Match.value(item).pipe(
    Match.when({ kind: "unit_ref" }, ({ unitId, quantity }) =>
      quantity === undefined ? unitId : `${quantity} × ${unitId}`,
    ),
    Match.when(
      { kind: "unit_ref_with_spellcasting_focus" },
      ({ authoredItemId, spellcastingFocusKind, quantity }) => {
        const itemLabel = `${authoredItemId} (${spellcastingFocusKind} focus)`;
        return quantity === undefined
          ? itemLabel
          : `${quantity} × ${itemLabel}`;
      },
    ),
    Match.when(
      { kind: "selected_tool_proficiency" },
      () => "item matching the selected tool proficiency",
    ),
    Match.when({ kind: "draft_owned_item" }, ({ itemName, quantity }) =>
      quantity === undefined ? itemName : `${quantity} × ${itemName}`,
    ),
    Match.exhaustive,
  );
}

export function abilityLabel(ability: Ability): string {
  return ability.toUpperCase();
}

export function skillLabel(skill: Skill): string {
  return skill
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function isSupported<T extends string>(
  value: string,
  supportedValues: ReadonlyArray<T>,
): value is T {
  return supportedValues.some((supportedValue) => supportedValue === value);
}
