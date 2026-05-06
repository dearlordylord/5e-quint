import {
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  STANDARD_LANGUAGES,
  SUPPORTED_ABILITY_SCORE_METHODS,
  abilityScoreAssignment,
  characterDraftId,
  creationChoiceOptionId,
  draftRevision,
  loadoutEquipmentUnitId,
  unitChoiceKey,
  unitChoiceSourceUnitId,
  type BackgroundAbilityScoreIncreaseSelection,
  type CharacterChoiceSelection,
  type CharacterDraft,
  type CharacterDraftId,
  type CharacterDraftSelections,
  type CharacterEquipmentSelection,
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
import { Either } from "effect";

export type CharacterDraftParseIssue = {
  readonly tag: "invalidCharacterDraft";
  readonly path: string;
  readonly message: string;
};

type ParseResult<T> = Either.Either<T, CharacterDraftParseIssue>;

export function parseCharacterDraft(
  value: unknown,
): ParseResult<CharacterDraft> {
  const draft = record(value, "$");
  if (Either.isLeft(draft)) return failIssue(draft.left);

  const draftId = stringAt(draft.right, "draftId", "$.draftId");
  if (Either.isLeft(draftId)) return failIssue(draftId.left);

  const revision = parseDraftRevision(draft.right.revision, "$.revision");
  if (Either.isLeft(revision)) return failIssue(revision.left);

  const selections = parseDraftSelections(
    draft.right.selections,
    "$.selections",
  );
  if (Either.isLeft(selections)) return failIssue(selections.left);

  return Either.right({
    draftId: characterDraftId(draftId.right),
    revision: revision.right,
    selections: selections.right,
  });
}

function parseDraftRevision(
  value: unknown,
  path: string,
): ParseResult<DraftRevision> {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? Either.right(draftRevision(value))
    : invalid(path, "Expected a non-negative integer draft revision.");
}

function parseDraftSelections(
  value: unknown,
  path: string,
): ParseResult<CharacterDraftSelections> {
  const selections = record(value, path);
  if (Either.isLeft(selections)) return failIssue(selections.left);

  const choices = arrayAt(selections.right, "choices", `${path}.choices`);
  if (Either.isLeft(choices)) return failIssue(choices.left);

  const parsedChoices = collect(
    choices.right.map((choice, index) =>
      parseCharacterChoiceSelection(choice, `${path}.choices[${index}]`),
    ),
  );
  if (Either.isLeft(parsedChoices)) return failIssue(parsedChoices.left);

  const progression =
    selections.right.progression === undefined
      ? Either.right(undefined)
      : parseCharacterProgression(
          selections.right.progression,
          `${path}.progression`,
        );
  if (Either.isLeft(progression)) return failIssue(progression.left);

  const background = optionalString(
    selections.right.background,
    `${path}.background`,
  );
  if (Either.isLeft(background)) return failIssue(background.left);

  const abilityScoreGeneration =
    selections.right.abilityScoreGeneration === undefined
      ? Either.right(undefined)
      : parseAbilityScoreGeneration(
          selections.right.abilityScoreGeneration,
          `${path}.abilityScoreGeneration`,
        );
  if (Either.isLeft(abilityScoreGeneration)) {
    return failIssue(abilityScoreGeneration.left);
  }

  const backgroundAbilityScoreIncrease =
    selections.right.backgroundAbilityScoreIncrease === undefined
      ? Either.right(undefined)
      : parseBackgroundAbilityScoreIncrease(
          selections.right.backgroundAbilityScoreIncrease,
          `${path}.backgroundAbilityScoreIncrease`,
        );
  if (Either.isLeft(backgroundAbilityScoreIncrease)) {
    return failIssue(backgroundAbilityScoreIncrease.left);
  }

  const species = optionalString(selections.right.species, `${path}.species`);
  if (Either.isLeft(species)) return failIssue(species.left);

  const languages =
    selections.right.languages === undefined
      ? Either.right(undefined)
      : parseStartingLanguages(selections.right.languages, `${path}.languages`);
  if (Either.isLeft(languages)) return failIssue(languages.left);

  const alignment =
    selections.right.alignment === undefined
      ? Either.right(undefined)
      : parseAlignment(selections.right.alignment, `${path}.alignment`);
  if (Either.isLeft(alignment)) return failIssue(alignment.left);

  const equipment =
    selections.right.equipment === undefined
      ? Either.right(undefined)
      : parseEquipmentSelection(
          selections.right.equipment,
          `${path}.equipment`,
        );
  if (Either.isLeft(equipment)) return failIssue(equipment.left);

  return Either.right({
    choices: parsedChoices.right,
    ...(progression.right === undefined
      ? {}
      : { progression: progression.right }),
    ...(background.right === undefined ? {} : { background: background.right }),
    ...(abilityScoreGeneration.right === undefined
      ? {}
      : { abilityScoreGeneration: abilityScoreGeneration.right }),
    ...(backgroundAbilityScoreIncrease.right === undefined
      ? {}
      : {
          backgroundAbilityScoreIncrease: backgroundAbilityScoreIncrease.right,
        }),
    ...(species.right === undefined ? {} : { species: species.right }),
    ...(languages.right === undefined ? {} : { languages: languages.right }),
    ...(alignment.right === undefined ? {} : { alignment: alignment.right }),
    ...(equipment.right === undefined ? {} : { equipment: equipment.right }),
  });
}

function parseCharacterProgression(
  value: unknown,
  path: string,
): ParseResult<CharacterProgression> {
  const progression = record(value, path);
  if (Either.isLeft(progression)) return failIssue(progression.left);

  const startingClass = stringAt(
    progression.right,
    "startingClass",
    `${path}.startingClass`,
  );
  if (Either.isLeft(startingClass)) return failIssue(startingClass.left);

  const advancements = arrayAt(
    progression.right,
    "advancements",
    `${path}.advancements`,
  );
  if (Either.isLeft(advancements)) return failIssue(advancements.left);

  const parsedAdvancements = collect(
    advancements.right.map((entry, index) =>
      parseCharacterProgressionEntry(entry, `${path}.advancements[${index}]`),
    ),
  );
  if (Either.isLeft(parsedAdvancements))
    return failIssue(parsedAdvancements.left);

  return Either.right({
    startingClass: classUnitId(startingClass.right),
    advancements: parsedAdvancements.right,
  });
}

function parseCharacterProgressionEntry(
  value: unknown,
  path: string,
): ParseResult<CharacterProgressionEntry> {
  const entry = record(value, path);
  if (Either.isLeft(entry)) return failIssue(entry.left);

  const classId = stringAt(entry.right, "classUnitId", `${path}.classUnitId`);
  if (Either.isLeft(classId)) return failIssue(classId.left);

  const hitPointRule = parseFixedHigherLevelHitPointRule(
    entry.right.hitPointRule,
    `${path}.hitPointRule`,
  );
  if (Either.isLeft(hitPointRule)) return failIssue(hitPointRule.left);

  return Either.right({
    classUnitId: classUnitId(classId.right),
    hitPointRule: hitPointRule.right,
  });
}

function parseFixedHigherLevelHitPointRule(
  value: unknown,
  path: string,
): ParseResult<FixedHigherLevelClassHitPointRule> {
  const rule = record(value, path);
  if (Either.isLeft(rule)) return failIssue(rule.left);
  return rule.right.tag === "fixedHigherLevelGain"
    ? Either.right({ tag: "fixedHigherLevelGain" })
    : invalid(path, "Expected fixedHigherLevelGain hit point rule.");
}

function parseAbilityScoreGeneration(
  value: unknown,
  path: string,
): ParseResult<
  NonNullable<CharacterDraftSelections["abilityScoreGeneration"]>
> {
  const selection = record(value, path);
  if (Either.isLeft(selection)) return failIssue(selection.left);

  const method = selection.right.method;
  if (!supportedAbilityScoreMethod(method)) {
    return invalid(path, "Expected a supported ability score method.");
  }

  const assignedScores = abilityScoreAssignment(selection.right.assignedScores);
  return Either.isLeft(assignedScores)
    ? invalid(
        `${path}.assignedScores`,
        "Expected a valid ability score assignment.",
      )
    : Either.right({
        method,
        assignedScores: assignedScores.right,
      });
}

function parseBackgroundAbilityScoreIncrease(
  value: unknown,
  path: string,
): ParseResult<BackgroundAbilityScoreIncreaseSelection> {
  const selection = record(value, path);
  if (Either.isLeft(selection)) return failIssue(selection.left);

  if (selection.right.kind === "oneEach")
    return Either.right({ kind: "oneEach" });
  if (selection.right.kind !== "twoAndOne") {
    return invalid(
      path,
      "Expected a supported background ability score increase.",
    );
  }

  const plusTwo = parseAbility(selection.right.plusTwo, `${path}.plusTwo`);
  if (Either.isLeft(plusTwo)) return failIssue(plusTwo.left);
  const plusOne = parseAbility(selection.right.plusOne, `${path}.plusOne`);
  if (Either.isLeft(plusOne)) return failIssue(plusOne.left);
  return twoAndOneBackgroundAbilityScoreIncrease(
    plusTwo.right,
    plusOne.right,
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
  if (Either.isLeft(alignment)) return failIssue(alignment.left);
  const order = alignment.right.order;
  const morality = alignment.right.morality;
  if (!alignmentOrder(order)) {
    return invalid(`${path}.order`, "Expected a supported alignment order.");
  }
  if (!alignmentMorality(morality)) {
    return invalid(
      `${path}.morality`,
      "Expected a supported alignment morality.",
    );
  }
  return Either.right({ order, morality });
}

function parseEquipmentSelection(
  value: unknown,
  path: string,
): ParseResult<CharacterEquipmentSelection> {
  const equipment = record(value, path);
  if (Either.isLeft(equipment)) return failIssue(equipment.left);
  const selectedUnitIds = arrayAt(
    equipment.right,
    "selectedUnitIds",
    `${path}.selectedUnitIds`,
  );
  if (Either.isLeft(selectedUnitIds)) return failIssue(selectedUnitIds.left);
  const parsedUnitIds = collect(
    selectedUnitIds.right.map((unitId, index) =>
      parseString(unitId, `${path}.selectedUnitIds[${index}]`),
    ),
  );
  return Either.isLeft(parsedUnitIds)
    ? failIssue(parsedUnitIds.left)
    : Either.right({ selectedUnitIds: parsedUnitIds.right });
}

function parseCharacterChoiceSelection(
  value: unknown,
  path: string,
): ParseResult<CharacterChoiceSelection> {
  const selection = record(value, path);
  if (Either.isLeft(selection)) return failIssue(selection.left);

  if (selection.right.kind === "unitChoice") {
    const source = parseUnitChoiceSelectionSource(
      selection.right.source,
      `${path}.source`,
    );
    if (Either.isLeft(source)) return failIssue(source.left);
    const options = parseSelectedChoiceOptions(
      selection.right.options,
      `${path}.options`,
    );
    return Either.isLeft(options)
      ? failIssue(options.left)
      : Either.right({
          kind: "unitChoice",
          source: source.right,
          options: options.right,
        });
  }

  if (selection.right.kind === "loadout") {
    const source = parseLoadoutSelectionSource(
      selection.right.source,
      `${path}.source`,
    );
    if (Either.isLeft(source)) return failIssue(source.left);
    const options = parseLoadoutSelectedChoiceOptions(
      selection.right.options,
      `${path}.options`,
    );
    return Either.isLeft(options)
      ? failIssue(options.left)
      : Either.right({
          kind: "loadout",
          source: source.right,
          options: options.right,
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
  if (Either.isLeft(source)) return failIssue(source.left);
  if (source.right.tag !== "unitChoice") {
    return invalid(`${path}.tag`, "Expected unitChoice source.");
  }
  const unitId = stringAt(source.right, "unitId", `${path}.unitId`);
  if (Either.isLeft(unitId)) return failIssue(unitId.left);
  const parsedUnitId = unitChoiceSourceUnitId(unitId.right);
  if (Either.isLeft(parsedUnitId)) {
    return invalid(`${path}.unitId`, "Expected a non-empty Unit id.");
  }
  const choiceKeyValue = source.right.choiceKey;
  if (typeof choiceKeyValue !== "string") {
    return invalid(`${path}.choiceKey`, "Expected a Unit choice key.");
  }
  const choiceKey = unitChoiceKey(choiceKeyValue);
  return Either.isLeft(choiceKey)
    ? invalid(`${path}.choiceKey`, "Expected a supported Unit choice key.")
    : Either.right({
        tag: "unitChoice",
        unitId: parsedUnitId.right,
        choiceKey: choiceKey.right,
      });
}

function parseLoadoutSelectionSource(
  value: unknown,
  path: string,
): ParseResult<
  Extract<CharacterChoiceSelection, { readonly kind: "loadout" }>["source"]
> {
  const source = record(value, path);
  if (Either.isLeft(source)) return failIssue(source.left);
  if (source.right.tag !== "loadout") {
    return invalid(`${path}.tag`, "Expected loadout source.");
  }
  const equipmentUnitId = stringAt(
    source.right,
    "equipmentUnitId",
    `${path}.equipmentUnitId`,
  );
  if (Either.isLeft(equipmentUnitId)) return failIssue(equipmentUnitId.left);
  const parsedEquipmentUnitId = loadoutEquipmentUnitId(equipmentUnitId.right);
  if (Either.isLeft(parsedEquipmentUnitId)) {
    return invalid(
      `${path}.equipmentUnitId`,
      "Expected a non-empty equipment Unit id.",
    );
  }
  const slot = source.right.slot;
  if (!loadoutSlot(slot)) {
    return invalid(`${path}.slot`, "Expected a supported loadout slot.");
  }
  return Either.right({
    tag: "loadout",
    equipmentUnitId: parsedEquipmentUnitId.right,
    slot,
  });
}

function parseSelectedChoiceOptions(
  value: unknown,
  path: string,
): ParseResult<readonly CharacterSelectedChoiceOption[]> {
  const options = parseArray(value, path);
  if (Either.isLeft(options)) return failIssue(options.left);
  return collect(
    options.right.map((option, index) =>
      parseSelectedChoiceOption(option, `${path}[${index}]`),
    ),
  );
}

function parseSelectedChoiceOption(
  value: unknown,
  path: string,
): ParseResult<CharacterSelectedChoiceOption> {
  const option = record(value, path);
  if (Either.isLeft(option)) return failIssue(option.left);
  const optionId = stringAt(option.right, "optionId", `${path}.optionId`);
  if (Either.isLeft(optionId)) return failIssue(optionId.left);
  const unitRef =
    option.right.unitRef === undefined
      ? Either.right(undefined)
      : parseUnitRef(option.right.unitRef, `${path}.unitRef`);
  return Either.isLeft(unitRef)
    ? failIssue(unitRef.left)
    : Either.right({
        optionId: creationChoiceOptionId(optionId.right),
        ...(unitRef.right === undefined ? {} : { unitRef: unitRef.right }),
      });
}

function parseLoadoutSelectedChoiceOptions(
  value: unknown,
  path: string,
): ParseResult<readonly [LoadoutSelectedChoiceOption]> {
  const options = parseArray(value, path);
  if (Either.isLeft(options)) return failIssue(options.left);
  if (options.right.length !== 1) {
    return invalid(path, "Expected exactly one loadout choice option.");
  }
  const option = record(options.right[0], `${path}[0]`);
  if (Either.isLeft(option)) return failIssue(option.left);
  const optionId = stringAt(option.right, "optionId", `${path}[0].optionId`);
  return Either.isLeft(optionId)
    ? failIssue(optionId.left)
    : Either.right([{ optionId: creationChoiceOptionId(optionId.right) }]);
}

function parseUnitRef(value: unknown, path: string): ParseResult<UnitRef> {
  const unitRef = record(value, path);
  if (Either.isLeft(unitRef)) return failIssue(unitRef.left);
  const unitId = stringAt(unitRef.right, "unitId", `${path}.unitId`);
  return Either.isLeft(unitId)
    ? failIssue(unitId.left)
    : Either.right({ unitId: unitId.right });
}

function parseAbility(value: unknown, path: string): ParseResult<Ability> {
  return ability(value)
    ? Either.right(value)
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
  return Either.right(languages);
}

function twoAndOneBackgroundAbilityScoreIncrease(
  plusTwo: Ability,
  plusOne: Ability,
  path: string,
): ParseResult<TwoAndOneBackgroundAbilityScoreIncreaseSelection> {
  if (plusTwo === plusOne) {
    return invalid(path, "Expected two distinct ability score choices.");
  }

  return Either.right({
    kind: "twoAndOne",
    plusTwo,
    // The branch above establishes the Exclude<Ability, PlusTwo> invariant;
    // TypeScript cannot express that relation for two runtime values.
    plusOne: plusOne as Exclude<Ability, typeof plusTwo>,
  });
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
    ? Either.right(undefined)
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
    ? Either.right(value)
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
    ? Either.right(value)
    : invalid(path, "Expected an array.");
}

function record(
  value: unknown,
  path: string,
): ParseResult<Readonly<Record<string, unknown>>> {
  return unknownRecord(value)
    ? Either.right(value)
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
    if (Either.isLeft(result)) return failIssue(result.left);
    values.push(result.right);
  }
  return Either.right(values);
}

function invalid<T = never>(path: string, message: string): ParseResult<T> {
  return Either.left({ tag: "invalidCharacterDraft", path, message });
}

function failIssue<T>(issue: CharacterDraftParseIssue): ParseResult<T> {
  return Either.left(issue);
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
