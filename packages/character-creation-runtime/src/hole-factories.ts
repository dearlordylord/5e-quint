import {
  creationChoiceOptionId,
  creationHoleId,
  type BackgroundAbilityScoreIncreaseSelection,
  type CharacterDraftPath,
  type CharacterDraftSelections,
  type ChoiceCardinality,
  type CreationChoiceOption,
  type CreationChoiceOptionId,
  type CreationHole,
  type CreationHoleId,
  type CreationHoleSource,
  type CharacterSelectedChoiceOption,
  type UnitChoiceKey,
  type UnitChoiceSource,
} from "./types.ts";
import type {
  Ability,
  Skill,
  StartingEquipmentChoice,
  UnitRecord,
} from "@dnd/surface/surface/types";

export function hasDraftSelection(
  selections: CharacterDraftSelections,
  path: CharacterDraftPath,
): boolean {
  return (
    (path === "draft.primaryClass" && selections.primaryClass != null) ||
    (path === "draft.background" && selections.background != null) ||
    (path === "draft.species" && selections.species != null) ||
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
    return creationChoiceOptionId("one_each");
  }

  return creationChoiceOptionId(
    `two_and_one:${selection.plusTwo}:${selection.plusOne}`,
  );
}

export function choiceHole(input: {
  readonly source: CreationHoleSource;
  readonly cardinality: ChoiceCardinality;
  readonly options: readonly CreationChoiceOption[];
}): CreationHole {
  if (input.cardinality.count > input.options.length) {
    throw new Error(
      `Choice cardinality ${input.cardinality.count} exceeds option count ${input.options.length} for ${holeIdForSource(input.source)}.`,
    );
  }

  return {
    kind: "choice",
    holeId: holeIdForSource(input.source),
    source: input.source,
    cardinality: input.cardinality,
    options: input.options,
  };
}

export function draftSource(path: CharacterDraftPath): CreationHoleSource {
  return { tag: "draft", path };
}

export function unitSource(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): UnitChoiceSource {
  return { tag: "unit", unitId, choiceKey };
}

export function holeIdForSource(source: CreationHoleSource): CreationHoleId {
  if (source.tag === "draft") {
    return creationHoleId(`cc:draft:${source.path}`);
  }

  return creationHoleId(`cc:unit:${source.unitId}:${source.choiceKey}`);
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
  return choice.coinsGp == null
    ? choice.id
    : `${choice.id} (${choice.coinsGp} GP)`;
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
