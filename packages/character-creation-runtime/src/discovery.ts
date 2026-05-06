import { Match, Option } from "effect";
import {
  ALIGNMENT_CHOICES,
  STANDARD_LANGUAGES,
  alignmentLabel,
  alignmentOptionId,
  type SelectableStandardLanguage,
} from "@dnd/shared/game-facts";
import { SUPPORTED_ABILITY_SCORE_METHODS } from "@dnd/shared-algebras/ability-score-algebra";
import {
  readBackgroundCreationFacts,
  readClassCreationFacts,
  type WizardClassCreationFacts,
} from "@dnd/surface/surface/character-creation-readers";
import type {
  BackgroundToolProficiency,
  ClassFeatureRecord,
  FeatRecord,
  ProficiencyGrant,
  StartingEquipmentChoice,
  UnitRecord,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import { proficiencyGrantSubjectOption } from "./choice-option-codecs.ts";
import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  CLASS_FEATURE_FEAT_CHOICE_KEY,
  CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  CLASS_SUBCLASS_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
  EXACTLY_ONE_CHOICE,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  INITIAL_CHARACTER_DRAFT_PATHS,
  abilityScoreIncreaseChoiceOptions,
  progressionOptionId,
  WIZARD_CANTRIP_CHOICE_KEY,
  WIZARD_PREPARED_SPELL_CHOICE_KEY,
  WIZARD_SPELLBOOK_CHOICE_KEY,
} from "./phase1-manifest.ts";
import {
  backgroundAbilityScoreIncreaseOptionId,
  backgroundAbilityScoreIncreaseOptions,
  choiceHole,
  draftSource,
  hasDraftSelection,
  isSupported,
  loadoutSource,
  selectedChoiceOption,
  skillOption,
  startingEquipmentLabel,
  unitOption,
  unitSource,
} from "./hole-factories.ts";
import {
  creationChoiceOptionId,
  creationHoleId,
  boundedChoiceCardinality,
  choiceCardinalityBounds,
  choiceCardinalityMax,
  exactChoiceCardinality,
  type CharacterChoiceSelection,
  type CharacterDraft,
  type CharacterSelectedChoiceOption,
  type ChoiceCardinality,
  type ChoiceCreationHole,
  type ChoiceCreationHoleSource,
  type CreationChoiceOption,
  type CreationChoiceOptionId,
  type CreationHole,
  type CreationHoleSource,
  type UnitCatalog,
} from "./types.ts";
import {
  supportedBackgroundUnitIds,
  supportedEquipmentPurchaseChoiceCount,
  isSupportedProgression,
  supportedLoadoutChoices,
  supportedProgressionsForClass,
  supportedPurchasableEquipmentUnitIds,
  unsupportedHoleSelectionOptionId,
} from "./support-gates.ts";
import {
  classLevelForUnit,
  computeTotalLevel,
  finalAdvancementEntry,
  hitPointRuleLabel,
  progressionClassUnitIds,
  startingClassUnitId,
} from "./character-progression-types.ts";
import {
  classUnitId,
  type CharacterProgression,
} from "./character-progression-types.ts";

const SRD_GAMING_SET_OPTIONS = [
  {
    optionId: creationChoiceOptionId("tool_dice_set"),
    label: "Dice Set",
  },
  {
    optionId: creationChoiceOptionId("tool_dragonchess_set"),
    label: "Dragonchess Set",
  },
  {
    optionId: creationChoiceOptionId("tool_playing_card_set"),
    label: "Playing Card Set",
  },
  {
    optionId: creationChoiceOptionId("tool_three_dragon_ante_set"),
    label: "Three-Dragon Ante Set",
  },
] as const satisfies ReadonlyArray<CreationChoiceOption>;

export function discoverCreationHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly CreationHole[] {
  return [
    ...discoverInitialDraftHoles(input),
    ...discoverClassGrantedHoles(input),
    ...discoverBackgroundGrantedHoles(input),
    ...discoverEquipmentHoles(input),
  ];
}
export function discoverInitialDraftHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly CreationHole[] {
  return INITIAL_CHARACTER_DRAFT_PATHS.flatMap((path) => {
    if (hasDraftSelection(input.draft.selections, path)) {
      return [];
    }
    const hole = draftHole(path, input.unitLibrary, input.draft);
    return hole === undefined ? [] : [hole];
  });
}

export function discoverClassGrantedHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly CreationHole[] {
  const progression = input.draft.selections.progression;
  if (progression == null || !isSupportedProgression(progression)) {
    return [];
  }
  const startingUnitId = startingClassUnitId(progression);
  const classUnitId = startingUnitId;
  const classUnit = input.unitLibrary.getUnit(classUnitId);
  if (Option.isNone(classUnit)) {
    return [];
  }
  const facts = readClassCreationFacts(classUnit.value);
  const classLevel = classLevelForUnit(progression, classUnitId);
  if (facts.tag !== "readable") {
    return [];
  }

  return [
    ...unselectedUnitChoiceHole(
      input.draft,
      choiceHole({
        source: unitSource(classUnitId, CLASS_SKILL_PROFICIENCY_CHOICE_KEY),
        cardinality: exactChoiceCardinality(
          facts.value.skillProficiencyChoice.choose,
        ),
        options: facts.value.skillProficiencyChoice.options.map(skillOption),
      }),
    ),
    ...facts.value.featureGrants.flatMap((grant) =>
      grant.level <= classLevel
        ? discoverClassFeatureGrantHoles(
            grant.unitId,
            input.draft,
            input.unitLibrary,
          )
        : [],
    ),
    ...discoverSubclassHoles(classUnitId, classLevel, facts.value, input),
    ...discoverSelectedFeatAbilityScoreIncreaseHoles(input),
    ...unselectedUnitChoiceHole(
      input.draft,
      startingEquipmentChoiceHole(
        unitSource(classUnitId, CLASS_EQUIPMENT_CHOICE_KEY),
        facts.value.startingEquipment,
      ),
    ),
    ...discoverWizardSpellcastingHoles(classUnitId, facts.value, input.draft),
    ...progressionClassUnitIds(progression).flatMap((progressionClassUnitId) =>
      progressionClassUnitId === startingUnitId
        ? []
        : discoverAdditionalClassGrantedHoles(
            progressionClassUnitId,
            classLevelForUnit(progression, progressionClassUnitId),
            input.draft,
            input.unitLibrary,
          ),
    ),
  ];
}

type ReadableClassCreationFacts = Extract<
  ReturnType<typeof readClassCreationFacts>,
  { readonly tag: "readable" }
>["value"];

function discoverWizardSpellcastingHoles(
  classUnitId: UnitRecord["id"],
  facts: ReadableClassCreationFacts,
  draft: CharacterDraft,
): readonly CreationHole[] {
  if (!isWizardClassCreationFacts(facts)) {
    return [];
  }

  const spellcasting = facts.spellcasting;
  return [
    ...unselectedUnitChoiceHole(
      draft,
      choiceHole({
        source: unitSource(classUnitId, WIZARD_CANTRIP_CHOICE_KEY),
        cardinality: exactChoiceCardinality(spellcasting.cantripAccess.choose),
        options: spellcasting.cantripAccess.spellIds.map((spellId) => ({
          optionId: creationChoiceOptionId(spellId),
          label: spellId,
          unitRef: { unitId: spellId },
        })),
      }),
    ),
    ...unselectedUnitChoiceHole(
      draft,
      choiceHole({
        source: unitSource(classUnitId, WIZARD_SPELLBOOK_CHOICE_KEY),
        cardinality: exactChoiceCardinality(
          spellcasting.spellbookAccess.choose,
        ),
        options: spellcasting.spellbookAccess.spells.map((spell) => ({
          optionId: creationChoiceOptionId(spell.spellId),
          label: spell.spellId,
          unitRef: { unitId: spell.spellId },
        })),
      }),
    ),
    ...unselectedUnitChoiceHole(
      draft,
      choiceHole({
        source: unitSource(classUnitId, WIZARD_PREPARED_SPELL_CHOICE_KEY),
        cardinality: exactChoiceCardinality(spellcasting.preparedAccess.choose),
        options: spellcasting.preparedAccess.spellIds.map((spellId) => ({
          optionId: creationChoiceOptionId(spellId),
          label: spellId,
          unitRef: { unitId: spellId },
        })),
      }),
    ),
  ];
}

function isWizardClassCreationFacts(
  facts: ReadableClassCreationFacts,
): facts is WizardClassCreationFacts {
  return facts.className === "wizard";
}

function discoverSubclassHoles(
  classUnitId: UnitRecord["id"],
  classLevel: number,
  facts: ReadableClassCreationFacts,
  input: {
    readonly draft: CharacterDraft;
    readonly unitLibrary: UnitCatalog;
  },
): readonly CreationHole[] {
  return facts.subclassChoices
    .filter((choice) => choice.level <= classLevel)
    .flatMap((choice) =>
      unselectedUnitChoiceHole(
        input.draft,
        choiceHole({
          source: unitSource(classUnitId, CLASS_SUBCLASS_CHOICE_KEY),
          cardinality: EXACTLY_ONE_CHOICE,
          options: choice.options.flatMap((unitId) => {
            const unit = input.unitLibrary.getUnit(unitId);
            return Option.isSome(unit) ? [unitOption(unit.value)] : [];
          }),
        }),
      ),
    );
}

function discoverAdditionalClassGrantedHoles(
  classUnitId: UnitRecord["id"],
  classLevel: number,
  draft: CharacterDraft,
  unitLibrary: UnitCatalog,
): readonly CreationHole[] {
  const classUnit = unitLibrary.getUnit(classUnitId);
  if (Option.isNone(classUnit)) {
    return [];
  }
  const facts = readClassCreationFacts(classUnit.value);
  if (facts.tag !== "readable") {
    return [];
  }

  return [
    ...facts.value.featureGrants.flatMap((grant) =>
      grant.level <= classLevel
        ? discoverClassFeatureGrantHoles(grant.unitId, draft, unitLibrary)
        : [],
    ),
    ...unselectedUnitChoiceHole(
      draft,
      proficiencyGrantChoiceHoleSource(
        classUnitId,
        facts.value.multiclassProficiencies,
      ),
    ),
  ];
}

function discoverSelectedFeatAbilityScoreIncreaseHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly CreationHole[] {
  return input.draft.selections.choices.flatMap((selection) => {
    if (
      selection.kind !== "unitChoice" ||
      selection.source.choiceKey !== CLASS_FEATURE_FEAT_CHOICE_KEY
    ) {
      return [];
    }

    return selection.options.flatMap((option) => {
      const featUnitId = option.unitRef?.unitId;
      if (featUnitId == null) return [];
      const unit = input.unitLibrary.getUnit(featUnitId);
      if (Option.isNone(unit)) return [];
      const options = selectedFeatAbilityScoreIncreaseOptions(unit.value);
      if (options.length === 0) return [];

      return unselectedUnitChoiceHole(
        input.draft,
        choiceHole({
          source: unitSource(
            selection.source.unitId,
            CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
          ),
          cardinality: EXACTLY_ONE_CHOICE,
          options,
        }),
      );
    });
  });
}

export function discoverBackgroundGrantedHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly CreationHole[] {
  const backgroundUnitId = input.draft.selections.background;
  if (
    backgroundUnitId == null ||
    !isSupported(backgroundUnitId, supportedBackgroundUnitIds())
  ) {
    return [];
  }

  const backgroundUnit = input.unitLibrary.getUnit(backgroundUnitId);
  if (Option.isNone(backgroundUnit)) {
    return [];
  }
  const facts = readBackgroundCreationFacts(backgroundUnit.value);
  if (facts.tag !== "readable") {
    return [];
  }

  return [
    ...unselectedBackgroundAbilityScoreIncreaseHole(
      input.draft,
      choiceHole({
        source: unitSource(
          backgroundUnitId,
          BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
        ),
        cardinality: EXACTLY_ONE_CHOICE,
        options: backgroundAbilityScoreIncreaseOptions(
          facts.value.abilityScoreIncrease.abilities,
        ),
      }),
    ),
    ...backgroundToolChoiceHole(
      input.draft,
      unitSource(backgroundUnitId, BACKGROUND_TOOL_CHOICE_KEY),
      facts.value.toolProficiency,
    ),
    ...unselectedUnitChoiceHole(
      input.draft,
      startingEquipmentChoiceHole(
        unitSource(backgroundUnitId, BACKGROUND_EQUIPMENT_CHOICE_KEY),
        facts.value.startingEquipment,
      ),
    ),
  ];
}

export function backgroundToolChoiceHole(
  draft: CharacterDraft,
  source: ChoiceCreationHoleSource,
  proficiency: BackgroundToolProficiency,
): readonly CreationHole[] {
  const spec = backgroundToolChoiceSpec(proficiency);
  return spec == null
    ? []
    : unselectedUnitChoiceHole(
        draft,
        choiceHole({
          source,
          cardinality: spec.cardinality,
          options: spec.options,
        }),
      );
}

export function backgroundToolChoiceSpec(
  proficiency: BackgroundToolProficiency,
):
  | {
      readonly cardinality: ChoiceCardinality;
      readonly options: readonly CreationChoiceOption[];
    }
  | undefined {
  const spec = Match.value(proficiency).pipe(
    Match.when({ kind: "specific_tool" }, (specificTool) => ({
      cardinality: EXACTLY_ONE_CHOICE,
      options: [
        {
          optionId: creationChoiceOptionId(specificTool.toolId),
          label: specificTool.toolId,
          unitRef: { unitId: specificTool.toolId },
        },
      ],
    })),
    Match.when(
      { kind: "tool_category_choice", category: "gaming_set" },
      (toolChoice) => ({
        cardinality: exactChoiceCardinality(toolChoice.choose),
        // SRD 5.2.1 Equipment.md:334-337 lists these Gaming Set variants.
        // The current support profile admits Dice Set; support-gates.ts rejects
        // the rest as unsupported rather than treating them as invalid RAW choices.
        options: SRD_GAMING_SET_OPTIONS,
      }),
    ),
    Match.when(
      { kind: "tool_category_choice", category: "artisan_tool" },
      () => undefined,
    ),
    Match.exhaustive,
  );

  return spec != null &&
    spec.cardinality !== undefined &&
    choiceCardinalityMax(spec.cardinality) <= spec.options.length
    ? { cardinality: spec.cardinality, options: spec.options }
    : undefined;
}

export function discoverEquipmentHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly CreationHole[] {
  const classUnitId =
    input.draft.selections.progression == null
      ? undefined
      : startingClassUnitId(input.draft.selections.progression);
  if (classUnitId == null || !hasSupportedCoinEquipmentPath(input)) {
    return [];
  }
  const purchaseHole = choiceHole({
    source: unitSource(classUnitId, EQUIPMENT_PURCHASE_CHOICE_KEY),
    cardinality: boundedChoiceCardinality({
      min: 1,
      max: supportedEquipmentPurchaseChoiceCount(),
    }),
    options: supportedPurchasableEquipmentUnitIds().flatMap((unitId) => {
      const unit = input.unitLibrary.getUnit(unitId);
      return Option.isSome(unit) ? [unitOption(unit.value)] : [];
    }),
  });
  const hasValidPurchaseSelection = hasValidEquipmentPurchaseSelectionForHole(
    input.draft,
    purchaseHole,
  );

  return [
    ...unselectedPurchaseHole(input.draft, purchaseHole),
    ...supportedLoadoutChoices().flatMap((loadoutChoice) =>
      unselectedLoadoutHole(
        input.draft,
        choiceHole({
          source: loadoutSource(loadoutChoice.unitId, loadoutChoice.slot),
          cardinality: EXACTLY_ONE_CHOICE,
          options: [
            {
              optionId: loadoutChoice.optionId,
              label: loadoutChoice.label,
              unitRef: { unitId: loadoutChoice.unitId },
            },
          ],
        }),
        loadoutChoice.unitId,
        hasValidPurchaseSelection,
      ),
    ),
  ];
}

export function startingEquipmentChoiceHole(
  source: ChoiceCreationHoleSource,
  choices: readonly StartingEquipmentChoice[],
): CreationHole | undefined {
  return choiceHole({
    source,
    cardinality: EXACTLY_ONE_CHOICE,
    options: choices.map((choice) => ({
      optionId: creationChoiceOptionId(choice.id),
      label: startingEquipmentLabel(choice),
    })),
  });
}

export function hasSupportedCoinEquipmentPath(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): boolean {
  const draft = input.draft;
  const progression = draft.selections.progression;
  const classUnitId =
    progression == null ? undefined : startingClassUnitId(progression);
  const backgroundUnitId = draft.selections.background;
  if (
    progression == null ||
    classUnitId == null ||
    backgroundUnitId == null ||
    !isSupportedProgression(progression) ||
    !isSupported(backgroundUnitId, supportedBackgroundUnitIds())
  ) {
    return false;
  }

  const classUnit = input.unitLibrary.getUnit(classUnitId);
  const backgroundUnit = input.unitLibrary.getUnit(backgroundUnitId);
  if (Option.isNone(classUnit) || Option.isNone(backgroundUnit)) {
    return false;
  }
  const classFacts = readClassCreationFacts(classUnit.value);
  const backgroundFacts = readBackgroundCreationFacts(backgroundUnit.value);
  if (classFacts.tag !== "readable" || backgroundFacts.tag !== "readable") {
    return false;
  }

  return (
    selectedCoinGrantStartingEquipmentChoice(
      draft,
      startingEquipmentChoiceHole(
        unitSource(classUnitId, CLASS_EQUIPMENT_CHOICE_KEY),
        classFacts.value.startingEquipment,
      ),
      classFacts.value.startingEquipment,
    ) != null &&
    selectedCoinGrantStartingEquipmentChoice(
      draft,
      startingEquipmentChoiceHole(
        unitSource(backgroundUnitId, BACKGROUND_EQUIPMENT_CHOICE_KEY),
        backgroundFacts.value.startingEquipment,
      ),
      backgroundFacts.value.startingEquipment,
    ) != null
  );
}

export function selectedCoinGrantStartingEquipmentChoice(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
  choices: readonly StartingEquipmentChoice[],
): StartingEquipmentChoice | undefined {
  const selectedChoice = selectedStartingEquipmentChoice(draft, hole, choices);
  return selectedChoice?.kind === "coin_grant" ? selectedChoice : undefined;
}

export function selectedStartingEquipmentChoice(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
  choices: readonly StartingEquipmentChoice[],
): StartingEquipmentChoice | undefined {
  if (hole === undefined) {
    return undefined;
  }
  const selection = draft.selections.choices.find((candidate) =>
    choiceSelectionMatchesHole(candidate, hole),
  );
  if (selection?.options.length !== 1) {
    return undefined;
  }

  const optionId = selection.options[0]?.optionId;
  return choices.find((choice) => choice.id === optionId);
}

export function unselectedUnitChoiceHole(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
): readonly CreationHole[] {
  if (hole === undefined) {
    return [];
  }
  return hasValidSelectionForHole(draft, hole) ? [] : [hole];
}

export function unselectedBackgroundAbilityScoreIncreaseHole(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
): readonly CreationHole[] {
  if (hole === undefined) {
    return [];
  }
  return hasValidBackgroundAbilityScoreIncreaseSelectionForHole(draft, hole)
    ? []
    : [hole];
}

export function unselectedPurchaseHole(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
): readonly CreationHole[] {
  if (hole === undefined) {
    return [];
  }
  return hasValidEquipmentPurchaseSelectionForHole(draft, hole) ? [] : [hole];
}

export function unselectedLoadoutHole(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
  unitId: UnitRecord["id"],
  hasValidPurchaseSelection: boolean,
): readonly CreationHole[] {
  if (hole === undefined) {
    return [];
  }
  return hasValidPurchaseSelection &&
    hasPurchasedUnit(draft, unitId) &&
    !hasValidLoadoutSlotSelectionForHole(draft, hole)
    ? [hole]
    : [];
}

function hasValidLoadoutSlotSelectionForHole(
  draft: CharacterDraft,
  hole: CreationHole,
): boolean {
  if (hole.source.tag !== "loadout") {
    return false;
  }

  const slot = hole.source.slot;
  return draft.selections.choices.some(
    (selection) =>
      selection.kind === "loadout" && selection.source.slot === slot,
  );
}

export function hasValidEquipmentPurchaseSelectionForHole(
  draft: CharacterDraft,
  hole: CreationHole | undefined,
): boolean {
  if (draft.selections.equipment == null || hole === undefined) {
    return false;
  }

  return choiceOptionIdsFitHole(
    hole,
    draft.selections.equipment.selectedUnitIds.map((unitId) =>
      creationChoiceOptionId(unitId),
    ),
  );
}

export function hasPurchasedUnit(
  draft: CharacterDraft,
  unitId: UnitRecord["id"],
): boolean {
  return draft.selections.equipment?.selectedUnitIds.includes(unitId) ?? false;
}

export function hasValidSelectionForHole(
  draft: CharacterDraft,
  hole: CreationHole,
): boolean {
  return draft.selections.choices.some((selection) =>
    choiceSelectionMatchesHole(selection, hole),
  );
}

export function choiceSelectionMatchesHole(
  selection: CharacterChoiceSelection,
  hole: CreationHole,
): boolean {
  if (
    hole.kind !== "choice" ||
    !sameCreationHoleSource(selection.source, hole.source)
  ) {
    return false;
  }

  const optionIds = choiceSelectionOptionIds(selection);
  return (
    choiceOptionIdsFitHole(hole, optionIds) &&
    (selection.kind === "loadout"
      ? selection.options.every((selectedOption) =>
          loadoutSelectionOptionMatchesHole(selection, selectedOption, hole),
        )
      : selection.options.every((selectedOption) =>
          selectedChoiceOptionMatchesHole(selectedOption, hole),
        ))
  );
}

export function hasValidBackgroundAbilityScoreIncreaseSelectionForHole(
  draft: CharacterDraft,
  hole: CreationHole,
): boolean {
  const selection = draft.selections.backgroundAbilityScoreIncrease;
  return (
    selection != null &&
    hole.kind === "choice" &&
    choiceOptionIdsFitHole(hole, [
      backgroundAbilityScoreIncreaseOptionId(selection),
    ])
  );
}

export function choiceOptionIdsFitHole(
  hole: CreationHole,
  optionIds: readonly CreationChoiceOptionId[],
): boolean {
  const bounds =
    hole.kind === "choice" ? choiceCardinalityBounds(hole.cardinality) : null;
  return (
    hole.kind === "choice" &&
    bounds != null &&
    optionIds.length >= bounds.min &&
    optionIds.length <= bounds.max &&
    !hasDuplicateOptionIds(optionIds) &&
    optionIds.every((optionId) =>
      hole.options.some((option) => option.optionId === optionId),
    ) &&
    unsupportedHoleSelectionOptionId(hole, optionIds) == null
  );
}

export function selectedChoiceOptionMatchesHole(
  selectedOption: CharacterSelectedChoiceOption,
  hole: ChoiceCreationHole,
): boolean {
  return hole.options.some((option) =>
    sameSelectedChoiceOption(selectedOption, selectedChoiceOption(option)),
  );
}

function loadoutSelectionOptionMatchesHole(
  selection: Extract<CharacterChoiceSelection, { readonly kind: "loadout" }>,
  selectedOption: CharacterChoiceSelection["options"][number],
  hole: ChoiceCreationHole,
): boolean {
  return hole.options.some(
    (option) =>
      option.optionId === selectedOption.optionId &&
      option.unitRef?.unitId === selection.source.equipmentUnitId,
  );
}

export function hasDuplicateOptionIds(
  optionIds: readonly CreationChoiceOptionId[],
): boolean {
  return optionIds.some(
    (optionId, optionIndex) => optionIds.indexOf(optionId) !== optionIndex,
  );
}

export function sameCreationHoleSource(
  left: CreationHoleSource,
  right: CreationHoleSource,
): boolean {
  if (left.tag === "draft" && right.tag === "draft") {
    return left.path === right.path;
  }

  if (left.tag === "unitChoice" && right.tag === "unitChoice") {
    return left.unitId === right.unitId && left.choiceKey === right.choiceKey;
  }

  if (left.tag === "loadout" && right.tag === "loadout") {
    return (
      left.equipmentUnitId === right.equipmentUnitId && left.slot === right.slot
    );
  }

  return false;
}

export function sameChoiceSelectionMultiset(
  left: readonly CharacterChoiceSelection[],
  right: readonly CharacterChoiceSelection[],
): boolean {
  return sameMultiset(left, right, sameChoiceSelection);
}

export function choiceSelectionOptionIds(
  selection: CharacterChoiceSelection,
): readonly CreationChoiceOptionId[] {
  return selection.options.map((option) => option.optionId);
}

export function sameChoiceSelection(
  left: CharacterChoiceSelection,
  right: CharacterChoiceSelection,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  return (
    sameCreationHoleSource(left.source, right.source) &&
    (left.kind === "loadout" && right.kind === "loadout"
      ? sameOptionIdMultiset(
          choiceSelectionOptionIds(left),
          choiceSelectionOptionIds(right),
        )
      : sameSelectedChoiceOptionMultiset(left.options, right.options))
  );
}

export function sameSelectedChoiceOptionMultiset(
  left: readonly CharacterSelectedChoiceOption[],
  right: readonly CharacterSelectedChoiceOption[],
): boolean {
  return sameMultiset(left, right, sameSelectedChoiceOption);
}

export function sameSelectedChoiceOption(
  left: CharacterSelectedChoiceOption,
  right: CharacterSelectedChoiceOption,
): boolean {
  return (
    left.optionId === right.optionId &&
    left.unitRef?.unitId === right.unitRef?.unitId
  );
}

export function sameOptionIdMultiset(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return sameMultiset(
    left,
    right,
    (leftValue, rightValue) => leftValue === rightValue,
  );
}

function sameMultiset<T>(
  left: readonly T[],
  right: readonly T[],
  sameElement: (leftElement: T, rightElement: T) => boolean,
): boolean {
  const remainingRight = [...right];
  for (const leftElement of left) {
    const matchIndex = remainingRight.findIndex((rightElement) =>
      sameElement(leftElement, rightElement),
    );
    if (matchIndex === -1) {
      return false;
    }

    remainingRight.splice(matchIndex, 1);
  }

  return left.length === right.length && remainingRight.length === 0;
}

export function discoverClassFeatureGrantHoles(
  featureUnitId: UnitRecord["id"],
  draft: CharacterDraft,
  unitLibrary: UnitCatalog,
): readonly CreationHole[] {
  return classFeatureGrantChoiceHoles(featureUnitId, unitLibrary).flatMap(
    (hole) => unselectedUnitChoiceHole(draft, hole),
  );
}

export function classFeatureGrantChoiceHoles(
  featureUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): readonly ChoiceCreationHole[] {
  const feature = requireClassFeature(unitLibrary, featureUnitId);
  if (feature === undefined) {
    return [];
  }
  const mechanics = feature.mechanics;

  if (mechanics.family === "passive") {
    const passiveGrantHoles = mechanics.grants.flatMap((grant) =>
      grant.kind === "grant_feat"
        ? [featGrantFeatureHoleSource(featureUnitId, grant, unitLibrary)]
        : grant.kind === "grant_proficiency"
          ? [proficiencyGrantChoiceHoleSource(featureUnitId, grant.proficiency)]
          : [],
    );
    const readablePassiveGrantHoles = passiveGrantHoles.filter(
      (hole): hole is ChoiceCreationHole => hole !== undefined,
    );
    if (readablePassiveGrantHoles.length > 0) {
      return readablePassiveGrantHoles;
    }
  }

  if (isWeaponMasteryChoiceFeature(feature)) {
    const hole = weaponMasteryFeatureHoleSource(feature, unitLibrary);
    return hole === undefined ? [] : [hole];
  }

  return [];
}

function requireClassFeature(
  unitLibrary: UnitCatalog,
  featureUnitId: UnitRecord["id"],
): ClassFeatureRecord | undefined {
  const feature = unitLibrary.getUnit(featureUnitId);
  if (Option.isNone(feature) || feature.value.kind !== "class_feature") {
    return undefined;
  }

  return feature.value;
}

function isWeaponMasteryChoiceFeature(
  feature: ClassFeatureRecord,
): feature is ClassFeatureRecord & {
  readonly mechanics: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "weapon_mastery_choice" }
  >;
} {
  return feature.mechanics.family === "weapon_mastery_choice";
}

function featGrantFeatureHoleSource(
  featureUnitId: UnitRecord["id"],
  grant: Extract<
    ClassFeatureRecord["mechanics"],
    { readonly family: "passive" }
  >["grants"][number] & { readonly kind: "grant_feat" },
  unitLibrary: UnitCatalog,
): ChoiceCreationHole | undefined {
  const categories = "category" in grant ? [grant.category] : grant.categories;
  const options = unitLibrary
    .listUnits()
    .filter(
      (unit): unit is FeatRecord =>
        unit.kind === "feat" && categories.includes(unit.category),
    )
    .map(unitOption);

  return requireChoiceCreationHole(
    choiceHole({
      source: unitSource(featureUnitId, CLASS_FEATURE_FEAT_CHOICE_KEY),
      cardinality: EXACTLY_ONE_CHOICE,
      options,
    }),
  );
}

function proficiencyGrantChoiceHoleSource(
  sourceUnitId: UnitRecord["id"],
  proficiency: ProficiencyGrant,
): ChoiceCreationHole | undefined {
  if (proficiency.kind !== "choice") {
    return undefined;
  }

  const options = proficiency.options.map(proficiencyGrantSubjectOption);
  const cardinality = exactChoiceCardinality(proficiency.count);
  if (
    cardinality === undefined ||
    choiceCardinalityMax(cardinality) > options.length
  ) {
    return undefined;
  }

  return requireChoiceCreationHole(
    choiceHole({
      source: unitSource(sourceUnitId, CLASS_FEATURE_PROFICIENCY_CHOICE_KEY),
      cardinality,
      options,
    }),
  );
}

export function abilityScoreIncreaseOptions(
  feat: FeatRecord & {
    readonly abilityScoreIncreaseChoice: NonNullable<
      FeatRecord["abilityScoreIncreaseChoice"]
    >;
  },
): readonly CreationChoiceOption[] {
  return abilityScoreIncreaseChoiceOptions(feat.abilityScoreIncreaseChoice);
}

export function selectedFeatAbilityScoreIncreaseOptions(
  unit: UnitRecord,
): readonly CreationChoiceOption[] {
  return unit.kind === "feat" && unit.abilityScoreIncreaseChoice != null
    ? abilityScoreIncreaseChoiceOptions(unit.abilityScoreIncreaseChoice)
    : [];
}

function weaponMasteryFeatureHoleSource(
  feature: ClassFeatureRecord & {
    readonly mechanics: Extract<
      ClassFeatureRecord["mechanics"],
      { readonly family: "weapon_mastery_choice" }
    >;
  },
  unitLibrary: UnitCatalog,
): ChoiceCreationHole | undefined {
  const mechanics = feature.mechanics;
  const options = unitLibrary
    .listUnits()
    .filter(
      (unit): unit is WeaponRecord =>
        unit.kind === "weapon" &&
        mechanics.eligibleWeapons.includes(unit.category),
    )
    .map(unitOption);

  return requireChoiceCreationHole(
    choiceHole({
      source: unitSource(feature.id, WEAPON_MASTERY_OPTIONS_CHOICE_KEY),
      cardinality: exactChoiceCardinality(mechanics.choose),
      options,
    }),
  );
}

function requireChoiceCreationHole(
  hole: CreationHole | undefined,
): ChoiceCreationHole | undefined {
  if (hole?.kind !== "choice") {
    return undefined;
  }

  return hole;
}

export function draftHole(
  path: (typeof INITIAL_CHARACTER_DRAFT_PATHS)[number],
  unitLibrary: UnitCatalog,
  _draft?: CharacterDraft,
): CreationHole | undefined {
  if (path === "draft.progression.initial") {
    return choiceHole({
      source: draftSource(path),
      cardinality: EXACTLY_ONE_CHOICE,
      options: unitLibrary
        .listUnits()
        .filter((unit) => unit.kind === "class")
        .flatMap((unit) => progressionOptionsForClassUnit(unit)),
    });
  }

  if (path === "draft.background") {
    return choiceHole({
      source: draftSource(path),
      cardinality: EXACTLY_ONE_CHOICE,
      options: unitLibrary
        .listUnits()
        .filter((unit) => unit.kind === "background")
        .map(unitOption),
    });
  }

  if (path === "draft.species") {
    return choiceHole({
      source: draftSource(path),
      cardinality: EXACTLY_ONE_CHOICE,
      options: unitLibrary
        .listUnits()
        .filter((unit) => unit.kind === "species")
        .map(unitOption),
    });
  }

  if (path === "draft.abilityScoreGeneration") {
    return {
      kind: "abilityScores",
      holeId: creationHoleId(`cc:draft:${path}`),
      source: draftSource(path),
      methods: SUPPORTED_ABILITY_SCORE_METHODS,
    };
  }

  if (path === "draft.languages") {
    return choiceHole({
      source: draftSource(path),
      cardinality: exactChoiceCardinality(2),
      options: STANDARD_LANGUAGES.filter(
        (language): language is SelectableStandardLanguage =>
          language !== "Common",
      ).map((language) => ({
        optionId: creationChoiceOptionId(language),
        label: language,
      })),
    });
  }

  const alignmentPath: "draft.alignment" = path;
  return choiceHole({
    source: draftSource(alignmentPath),
    cardinality: EXACTLY_ONE_CHOICE,
    options: ALIGNMENT_CHOICES.map((alignment) => ({
      optionId: creationChoiceOptionId(alignmentOptionId(alignment)),
      label: alignmentLabel(alignment),
    })),
  });
}

function progressionOptionsForClassUnit(
  unit: UnitRecord,
): readonly CreationChoiceOption[] {
  const optionsById = new Map<CreationChoiceOptionId, CreationChoiceOption>();
  for (const progression of [
    ...levelOneProgressionForClassUnit(unit.id),
    ...supportedProgressionsForClass(unit.id),
  ]) {
    const optionId = progressionOptionId(progression);
    optionsById.set(optionId, {
      optionId,
      label: `${unit.name} ${computeTotalLevel(progression)} (${hitPointRuleLabel(finalAdvancementEntry(progression)?.hitPointRule ?? { tag: "levelOneMaximumHitDie" })})`,
      unitRef: { unitId: unit.id },
    });
  }

  return [...optionsById.values()];
}

function levelOneProgressionForClassUnit(
  unitId: UnitRecord["id"],
): readonly CharacterProgression[] {
  return [{ startingClass: classUnitId(unitId), advancements: [] }];
}
