import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  STANDARD_LANGUAGES,
  SUPPORTED_ABILITY_SCORE_METHODS,
  abilityScoreAssignment,
  characterDraftId,
  characterDraconicAncestrySelection,
  creationChoiceOptionId,
  draftRevision,
  isCharacterSpeciesSizeSelection,
  loadoutEquipmentUnitId,
  unitChoiceKey,
  unitChoiceSourceUnitId,
  type BackgroundAbilityScoreIncreaseSelection,
  type CharacterChoiceSelection,
  type CharacterDraft,
  type CharacterDraftId,
  type CharacterDraftSelections,
  type CharacterDraconicAncestrySelection,
  type CharacterEquipmentSelection,
  type CharacterSpeciesSizeSelection,
  type CharacterSelectedChoiceOption,
  type CharacterStartingLanguages,
  type CharacterAlignment,
  type AlignmentMorality,
  type AlignmentOrder,
  type DraftRevision,
  type LoadoutSelectedChoiceOption,
  type LoadoutSlot,
  type SelectableStandardLanguage,
  type SupportedAbilityScoreMethod,
  type TwoAndOneBackgroundAbilityScoreIncreaseSelection,
  type UnitCatalog,
  type UnitRef,
} from "./types.ts";
import {
  classUnitId,
  type CharacterProgression,
  type CharacterProgressionEntry,
  type FixedHigherLevelClassHitPointRule,
} from "./character-progression-types.ts";
import { SURFACE_ABILITIES, type Ability } from "@dnd/shared/game-facts";
import { Result } from "effect";

export type CharacterDraftParseIssue = {
  readonly tag: "invalidCharacterDraft";
  readonly path: string;
  readonly message: string;
};

type ParseResult<T> = Result.Result<T, CharacterDraftParseIssue>;

export function parseCharacterDraft(
  value: unknown,
): ParseResult<CharacterDraft> {
  const draft = record(value, "$");
  if (Result.isFailure(draft)) return failIssue(draft.failure);

  const draftId = stringAt(draft.success, "draftId", "$.draftId");
  if (Result.isFailure(draftId)) return failIssue(draftId.failure);

  const revision = parseDraftRevision(draft.success.revision, "$.revision");
  if (Result.isFailure(revision)) return failIssue(revision.failure);

  const selections = parseDraftSelections(
    draft.success.selections,
    "$.selections",
  );
  if (Result.isFailure(selections)) return failIssue(selections.failure);

  return Result.succeed({
    draftId: characterDraftId(draftId.success),
    revision: revision.success,
    selections: selections.success,
  });
}

function parseDraftRevision(
  value: unknown,
  path: string,
): ParseResult<DraftRevision> {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? Result.succeed(draftRevision(value))
    : invalid(path, "Expected a non-negative integer draft revision.");
}

function parseDraftSelections(
  value: unknown,
  path: string,
): ParseResult<CharacterDraftSelections> {
  const selections = record(value, path);
  if (Result.isFailure(selections)) return failIssue(selections.failure);

  const choices = arrayAt(selections.success, "choices", `${path}.choices`);
  if (Result.isFailure(choices)) return failIssue(choices.failure);

  const parsedChoices = collect(
    choices.success.map((choice, index) =>
      parseCharacterChoiceSelection(choice, `${path}.choices[${index}]`),
    ),
  );
  if (Result.isFailure(parsedChoices)) return failIssue(parsedChoices.failure);

  const progression =
    selections.success.progression === undefined
      ? Result.succeed(undefined)
      : parseCharacterProgression(
          selections.success.progression,
          `${path}.progression`,
        );
  if (Result.isFailure(progression)) return failIssue(progression.failure);

  const background = optionalString(
    selections.success.background,
    `${path}.background`,
  );
  if (Result.isFailure(background)) return failIssue(background.failure);

  const abilityScoreGeneration =
    selections.success.abilityScoreGeneration === undefined
      ? Result.succeed(undefined)
      : parseAbilityScoreGeneration(
          selections.success.abilityScoreGeneration,
          `${path}.abilityScoreGeneration`,
        );
  if (Result.isFailure(abilityScoreGeneration)) {
    return failIssue(abilityScoreGeneration.failure);
  }

  const backgroundAbilityScoreIncrease =
    selections.success.backgroundAbilityScoreIncrease === undefined
      ? Result.succeed(undefined)
      : parseBackgroundAbilityScoreIncrease(
          selections.success.backgroundAbilityScoreIncrease,
          `${path}.backgroundAbilityScoreIncrease`,
        );
  if (Result.isFailure(backgroundAbilityScoreIncrease)) {
    return failIssue(backgroundAbilityScoreIncrease.failure);
  }

  const species = optionalString(selections.success.species, `${path}.species`);
  if (Result.isFailure(species)) return failIssue(species.failure);

  const speciesSize =
    selections.success.speciesSize === undefined
      ? Result.succeed(undefined)
      : parseCharacterSpeciesSize(
          selections.success.speciesSize,
          `${path}.speciesSize`,
        );
  if (Result.isFailure(speciesSize)) return failIssue(speciesSize.failure);

  const draconicAncestry =
    selections.success.draconicAncestry === undefined
      ? Result.succeed(undefined)
      : parseCharacterDraconicAncestry(
          selections.success.draconicAncestry,
          `${path}.draconicAncestry`,
        );
  if (Result.isFailure(draconicAncestry)) {
    return failIssue(draconicAncestry.failure);
  }

  const languages =
    selections.success.languages === undefined
      ? Result.succeed(undefined)
      : parseStartingLanguages(selections.success.languages, `${path}.languages`);
  if (Result.isFailure(languages)) return failIssue(languages.failure);

  const alignment =
    selections.success.alignment === undefined
      ? Result.succeed(undefined)
      : parseAlignment(selections.success.alignment, `${path}.alignment`);
  if (Result.isFailure(alignment)) return failIssue(alignment.failure);

  const equipment =
    selections.success.equipment === undefined
      ? Result.succeed(undefined)
      : parseEquipmentSelection(
          selections.success.equipment,
          `${path}.equipment`,
        );
  if (Result.isFailure(equipment)) return failIssue(equipment.failure);

  return Result.succeed({
    choices: parsedChoices.success,
    ...(progression.success === undefined
      ? {}
      : { progression: progression.success }),
    ...(background.success === undefined
      ? {}
      : { background: authoredUnitId(background.success) }),
    ...(abilityScoreGeneration.success === undefined
      ? {}
      : { abilityScoreGeneration: abilityScoreGeneration.success }),
    ...(backgroundAbilityScoreIncrease.success === undefined
      ? {}
      : {
          backgroundAbilityScoreIncrease: backgroundAbilityScoreIncrease.success,
        }),
    ...(species.success === undefined
      ? {}
      : { species: authoredUnitId(species.success) }),
    ...(speciesSize.success === undefined
      ? {}
      : { speciesSize: speciesSize.success }),
    ...(draconicAncestry.success === undefined
      ? {}
      : { draconicAncestry: draconicAncestry.success }),
    ...(languages.success === undefined ? {} : { languages: languages.success }),
    ...(alignment.success === undefined ? {} : { alignment: alignment.success }),
    ...(equipment.success === undefined ? {} : { equipment: equipment.success }),
  });
}

function parseCharacterSpeciesSize(
  value: unknown,
  path: string,
): ParseResult<CharacterSpeciesSizeSelection> {
  const text = optionalString(value, path);
  if (Result.isFailure(text)) return failIssue(text.failure);
  if (isCharacterSpeciesSizeSelection(text.success)) {
    return Result.succeed(text.success);
  }

  return invalid(path, "Character species size must be medium or small.");
}

function parseCharacterDraconicAncestry(
  value: unknown,
  path: string,
): ParseResult<CharacterDraconicAncestrySelection> {
  return typeof value === "string"
    ? Result.succeed(characterDraconicAncestrySelection(value))
    : invalid(path, "Character Draconic Ancestry must be a string.");
}

function parseCharacterProgression(
  value: unknown,
  path: string,
): ParseResult<CharacterProgression> {
  const progression = record(value, path);
  if (Result.isFailure(progression)) return failIssue(progression.failure);

  const startingClass = stringAt(
    progression.success,
    "startingClass",
    `${path}.startingClass`,
  );
  if (Result.isFailure(startingClass)) return failIssue(startingClass.failure);

  const advancements = arrayAt(
    progression.success,
    "advancements",
    `${path}.advancements`,
  );
  if (Result.isFailure(advancements)) return failIssue(advancements.failure);

  const parsedAdvancements = collect(
    advancements.success.map((entry, index) =>
      parseCharacterProgressionEntry(entry, `${path}.advancements[${index}]`),
    ),
  );
  if (Result.isFailure(parsedAdvancements))
    return failIssue(parsedAdvancements.failure);

  return Result.succeed({
    startingClass: classUnitId(authoredUnitId(startingClass.success)),
    advancements: parsedAdvancements.success,
  });
}

function parseCharacterProgressionEntry(
  value: unknown,
  path: string,
): ParseResult<CharacterProgressionEntry> {
  const entry = record(value, path);
  if (Result.isFailure(entry)) return failIssue(entry.failure);

  const classId = stringAt(entry.success, "classUnitId", `${path}.classUnitId`);
  if (Result.isFailure(classId)) return failIssue(classId.failure);

  const hitPointRule = parseFixedHigherLevelHitPointRule(
    entry.success.hitPointRule,
    `${path}.hitPointRule`,
  );
  if (Result.isFailure(hitPointRule)) return failIssue(hitPointRule.failure);

  return Result.succeed({
    classUnitId: classUnitId(authoredUnitId(classId.success)),
    hitPointRule: hitPointRule.success,
  });
}

function parseFixedHigherLevelHitPointRule(
  value: unknown,
  path: string,
): ParseResult<FixedHigherLevelClassHitPointRule> {
  const rule = record(value, path);
  if (Result.isFailure(rule)) return failIssue(rule.failure);
  return rule.success.tag === "fixedHigherLevelGain"
    ? Result.succeed({ tag: "fixedHigherLevelGain" })
    : invalid(path, "Expected fixedHigherLevelGain hit point rule.");
}

function parseAbilityScoreGeneration(
  value: unknown,
  path: string,
): ParseResult<
  NonNullable<CharacterDraftSelections["abilityScoreGeneration"]>
> {
  const selection = record(value, path);
  if (Result.isFailure(selection)) return failIssue(selection.failure);

  const method = selection.success.method;
  if (!supportedAbilityScoreMethod(method)) {
    return invalid(path, "Expected a supported ability score method.");
  }

  const assignedScores = abilityScoreAssignment(selection.success.assignedScores);
  return Result.isFailure(assignedScores)
    ? invalid(
        `${path}.assignedScores`,
        "Expected a valid ability score assignment.",
      )
    : Result.succeed({
        method,
        assignedScores: assignedScores.success,
      });
}

function parseBackgroundAbilityScoreIncrease(
  value: unknown,
  path: string,
): ParseResult<BackgroundAbilityScoreIncreaseSelection> {
  const selection = record(value, path);
  if (Result.isFailure(selection)) return failIssue(selection.failure);

  if (selection.success.kind === "oneEach")
    return Result.succeed({ kind: "oneEach" });
  if (selection.success.kind !== "twoAndOne") {
    return invalid(
      path,
      "Expected a supported background ability score increase.",
    );
  }

  const plusTwo = parseAbility(selection.success.plusTwo, `${path}.plusTwo`);
  if (Result.isFailure(plusTwo)) return failIssue(plusTwo.failure);
  const plusOne = parseAbility(selection.success.plusOne, `${path}.plusOne`);
  if (Result.isFailure(plusOne)) return failIssue(plusOne.failure);
  return twoAndOneBackgroundAbilityScoreIncrease(
    plusTwo.success,
    plusOne.success,
    path,
  );
}

function parseStartingLanguages(
  value: unknown,
  path: string,
): ParseResult<CharacterStartingLanguages> {
  if (!Array.isArray(value) || value.length !== 3) {
    return invalid(path, "Expected exactly three starting languages.");
  }
  const [common, first, second] = value;
  if (common !== "Common") return invalid(`${path}[0]`, "Expected Common.");
  if (!selectableStandardLanguage(first)) {
    return invalid(`${path}[1]`, "Expected a selectable standard language.");
  }
  if (!selectableStandardLanguage(second)) {
    return invalid(
      `${path}[2]`,
      "Expected a distinct selectable standard language.",
    );
  }
  return startingLanguagesSelection(first, second, `${path}[2]`);
}

function parseAlignment(
  value: unknown,
  path: string,
): ParseResult<CharacterAlignment> {
  const alignment = record(value, path);
  if (Result.isFailure(alignment)) return failIssue(alignment.failure);
  const order = alignment.success.order;
  const morality = alignment.success.morality;
  if (!alignmentOrder(order)) {
    return invalid(`${path}.order`, "Expected a supported alignment order.");
  }
  if (!alignmentMorality(morality)) {
    return invalid(
      `${path}.morality`,
      "Expected a supported alignment morality.",
    );
  }
  return Result.succeed({ order, morality });
}

function parseEquipmentSelection(
  value: unknown,
  path: string,
): ParseResult<CharacterEquipmentSelection> {
  const equipment = record(value, path);
  if (Result.isFailure(equipment)) return failIssue(equipment.failure);
  const selectedUnitIds = arrayAt(
    equipment.success,
    "selectedUnitIds",
    `${path}.selectedUnitIds`,
  );
  if (Result.isFailure(selectedUnitIds)) return failIssue(selectedUnitIds.failure);
  const parsedUnitIds = collect(
    selectedUnitIds.success.map((unitId, index) =>
      parseString(unitId, `${path}.selectedUnitIds[${index}]`),
    ),
  );
  return Result.isFailure(parsedUnitIds)
    ? failIssue(parsedUnitIds.failure)
    : Result.succeed({
        selectedUnitIds: parsedUnitIds.success.map(authoredUnitId),
      });
}

function parseCharacterChoiceSelection(
  value: unknown,
  path: string,
): ParseResult<CharacterChoiceSelection> {
  const selection = record(value, path);
  if (Result.isFailure(selection)) return failIssue(selection.failure);

  if (selection.success.kind === "unitChoice") {
    const source = parseUnitChoiceSelectionSource(
      selection.success.source,
      `${path}.source`,
    );
    if (Result.isFailure(source)) return failIssue(source.failure);
    const options = parseSelectedChoiceOptions(
      selection.success.options,
      `${path}.options`,
    );
    return Result.isFailure(options)
      ? failIssue(options.failure)
      : Result.succeed({
          kind: "unitChoice",
          source: source.success,
          options: options.success,
        });
  }

  if (selection.success.kind === "loadout") {
    const source = parseLoadoutSelectionSource(
      selection.success.source,
      `${path}.source`,
    );
    if (Result.isFailure(source)) return failIssue(source.failure);
    const options = parseLoadoutSelectedChoiceOptions(
      selection.success.options,
      `${path}.options`,
    );
    return Result.isFailure(options)
      ? failIssue(options.failure)
      : Result.succeed({
          kind: "loadout",
          source: source.success,
          options: options.success,
        });
  }

  return invalid(path, "Expected a supported character choice selection kind.");
}

function parseUnitChoiceSelectionSource(
  value: unknown,
  path: string,
): ParseResult<
  Extract<CharacterChoiceSelection, { readonly kind: "unitChoice" }>["source"]
> {
  const source = record(value, path);
  if (Result.isFailure(source)) return failIssue(source.failure);
  if (source.success.tag !== "unitChoice") {
    return invalid(`${path}.tag`, "Expected unitChoice source.");
  }
  const unitId = stringAt(source.success, "unitId", `${path}.unitId`);
  if (Result.isFailure(unitId)) return failIssue(unitId.failure);
  const parsedUnitId = unitChoiceSourceUnitId(unitId.success);
  if (Result.isFailure(parsedUnitId)) {
    return invalid(`${path}.unitId`, "Expected a non-empty Unit id.");
  }
  const choiceKeyValue = source.success.choiceKey;
  if (typeof choiceKeyValue !== "string") {
    return invalid(`${path}.choiceKey`, "Expected a Unit choice key.");
  }
  const choiceKey = unitChoiceKey(choiceKeyValue);
  return Result.isFailure(choiceKey)
    ? invalid(`${path}.choiceKey`, "Expected a supported Unit choice key.")
    : Result.succeed({
        tag: "unitChoice",
        unitId: parsedUnitId.success,
        choiceKey: choiceKey.success,
      });
}

function parseLoadoutSelectionSource(
  value: unknown,
  path: string,
): ParseResult<
  Extract<CharacterChoiceSelection, { readonly kind: "loadout" }>["source"]
> {
  const source = record(value, path);
  if (Result.isFailure(source)) return failIssue(source.failure);
  if (source.success.tag !== "loadout") {
    return invalid(`${path}.tag`, "Expected loadout source.");
  }
  const equipmentUnitId = stringAt(
    source.success,
    "equipmentUnitId",
    `${path}.equipmentUnitId`,
  );
  if (Result.isFailure(equipmentUnitId)) return failIssue(equipmentUnitId.failure);
  const parsedEquipmentUnitId = loadoutEquipmentUnitId(equipmentUnitId.success);
  if (Result.isFailure(parsedEquipmentUnitId)) {
    return invalid(
      `${path}.equipmentUnitId`,
      "Expected a non-empty equipment Unit id.",
    );
  }
  const slot = source.success.slot;
  if (!loadoutSlot(slot)) {
    return invalid(`${path}.slot`, "Expected a supported loadout slot.");
  }
  return Result.succeed({
    tag: "loadout",
    equipmentUnitId: parsedEquipmentUnitId.success,
    slot,
  });
}

function parseSelectedChoiceOptions(
  value: unknown,
  path: string,
): ParseResult<readonly CharacterSelectedChoiceOption[]> {
  const options = parseArray(value, path);
  if (Result.isFailure(options)) return failIssue(options.failure);
  return collect(
    options.success.map((option, index) =>
      parseSelectedChoiceOption(option, `${path}[${index}]`),
    ),
  );
}

function parseSelectedChoiceOption(
  value: unknown,
  path: string,
): ParseResult<CharacterSelectedChoiceOption> {
  const option = record(value, path);
  if (Result.isFailure(option)) return failIssue(option.failure);
  const optionId = stringAt(option.success, "optionId", `${path}.optionId`);
  if (Result.isFailure(optionId)) return failIssue(optionId.failure);
  const unitRef =
    option.success.unitRef === undefined
      ? Result.succeed(undefined)
      : parseUnitRef(option.success.unitRef, `${path}.unitRef`);
  return Result.isFailure(unitRef)
    ? failIssue(unitRef.failure)
    : Result.succeed({
        optionId: creationChoiceOptionId(optionId.success),
        ...(unitRef.success === undefined ? {} : { unitRef: unitRef.success }),
      });
}

function parseLoadoutSelectedChoiceOptions(
  value: unknown,
  path: string,
): ParseResult<readonly [LoadoutSelectedChoiceOption]> {
  const options = parseArray(value, path);
  if (Result.isFailure(options)) return failIssue(options.failure);
  if (options.success.length !== 1) {
    return invalid(path, "Expected exactly one loadout choice option.");
  }
  const option = record(options.success[0], `${path}[0]`);
  if (Result.isFailure(option)) return failIssue(option.failure);
  const optionId = stringAt(option.success, "optionId", `${path}[0].optionId`);
  return Result.isFailure(optionId)
    ? failIssue(optionId.failure)
    : Result.succeed([{ optionId: creationChoiceOptionId(optionId.success) }]);
}

function parseUnitRef(value: unknown, path: string): ParseResult<UnitRef> {
  const unitRef = record(value, path);
  if (Result.isFailure(unitRef)) return failIssue(unitRef.failure);
  const unitId = stringAt(unitRef.success, "unitId", `${path}.unitId`);
  return Result.isFailure(unitId)
    ? failIssue(unitId.failure)
    : Result.succeed({ unitId: authoredUnitId(unitId.success) });
}

function parseAbility(value: unknown, path: string): ParseResult<Ability> {
  return ability(value)
    ? Result.succeed(value)
    : invalid(path, "Expected an ability.");
}

function supportedAbilityScoreMethod(
  value: unknown,
): value is SupportedAbilityScoreMethod {
  return (
    typeof value === "string" &&
    SUPPORTED_ABILITY_SCORE_METHODS.some((candidate) => candidate === value)
  );
}

function alignmentOrder(value: unknown): value is AlignmentOrder {
  return (
    typeof value === "string" &&
    ALIGNMENT_ORDERS.some((candidate) => candidate === value)
  );
}

function alignmentMorality(value: unknown): value is AlignmentMorality {
  return (
    typeof value === "string" &&
    ALIGNMENT_MORALITIES.some((candidate) => candidate === value)
  );
}

function ability(value: unknown): value is Ability {
  return (
    typeof value === "string" &&
    SURFACE_ABILITIES.some((candidate) => candidate === value)
  );
}

function loadoutSlot(value: unknown): value is LoadoutSlot {
  return value === "armor" || value === "shield" || value === "weapon";
}

function startingLanguagesSelection<First extends SelectableStandardLanguage>(
  first: First,
  second: SelectableStandardLanguage,
  secondPath: string,
): ParseResult<CharacterStartingLanguages> {
  if (first === second) {
    return invalid(
      secondPath,
      "Expected a distinct selectable standard language.",
    );
  }
  // The guard above establishes the tuple's no-duplicate invariant; TypeScript
  // cannot connect that runtime inequality to CharacterStartingLanguages' mapped
  // tuple union.
  const languages = ["Common", first, second] as CharacterStartingLanguages;
  return Result.succeed(languages);
}

function twoAndOneBackgroundAbilityScoreIncrease(
  plusTwo: Ability,
  plusOne: Ability,
  path: string,
): ParseResult<TwoAndOneBackgroundAbilityScoreIncreaseSelection> {
  if (plusTwo === plusOne) {
    return invalid(path, "Expected two distinct ability score choices.");
  }

  const selection = {
    kind: "twoAndOne",
    plusTwo,
    plusOne,
  } as TwoAndOneBackgroundAbilityScoreIncreaseSelection;

  return Result.succeed(selection);
}

function selectableStandardLanguage(
  value: unknown,
): value is Exclude<CharacterStartingLanguages[number], "Common"> {
  return (
    typeof value === "string" &&
    value !== "Common" &&
    STANDARD_LANGUAGES.some((language) => language === value)
  );
}

function optionalString(
  value: unknown,
  path: string,
): ParseResult<string | undefined> {
  return value === undefined
    ? Result.succeed(undefined)
    : parseString(value, path);
}

function stringAt(
  object: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
): ParseResult<string> {
  return parseString(object[key], path);
}

function parseString(value: unknown, path: string): ParseResult<string> {
  return typeof value === "string"
    ? Result.succeed(value)
    : invalid(path, "Expected a string.");
}

function arrayAt(
  object: Readonly<Record<string, unknown>>,
  key: string,
  path: string,
): ParseResult<readonly unknown[]> {
  return parseArray(object[key], path);
}

function parseArray(
  value: unknown,
  path: string,
): ParseResult<readonly unknown[]> {
  return Array.isArray(value)
    ? Result.succeed(value)
    : invalid(path, "Expected an array.");
}

function record(
  value: unknown,
  path: string,
): ParseResult<Readonly<Record<string, unknown>>> {
  return unknownRecord(value)
    ? Result.succeed(value)
    : invalid(path, "Expected an object.");
}

function unknownRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function collect<T>(
  results: readonly ParseResult<T>[],
): ParseResult<readonly T[]> {
  const values: T[] = [];
  for (const result of results) {
    if (Result.isFailure(result)) return failIssue(result.failure);
    values.push(result.success);
  }
  return Result.succeed(values);
}

function invalid<T = never>(path: string, message: string): ParseResult<T> {
  return Result.fail({ tag: "invalidCharacterDraft", path, message });
}

function failIssue<T>(issue: CharacterDraftParseIssue): ParseResult<T> {
  return Result.fail(issue);
}

let nextDraftOrdinal = 0;

export function createCharacterDraft(input: {
  readonly unitLibrary?: UnitCatalog;
  readonly draftId?: CharacterDraftId;
}): CharacterDraft {
  void input.unitLibrary;

  return {
    draftId:
      input.draftId ?? characterDraftId(`cc:draft:${nextDraftOrdinal++}`),
    selections: {
      choices: [],
    },
    revision: draftRevision(0),
  };
}
