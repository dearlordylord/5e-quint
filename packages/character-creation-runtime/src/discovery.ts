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
  StartingEquipmentChoice,
  UnitRecord,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  advancementOptionId,
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
  EXACTLY_ONE_CHOICE,
  FIGHTER_FIGHTING_STYLE_CHOICE_KEY,
  FIGHTER_SKILL_CHOICE_KEY,
  FIGHTER_WEAPON_MASTERY_CHOICE_KEY,
  INITIAL_CHARACTER_DRAFT_PATHS,
  WIZARD_CANTRIP_CHOICE_KEY,
  WIZARD_PREPARED_SPELL_CHOICE_KEY,
  WIZARD_SKILL_CHOICE_KEY,
  WIZARD_SPELLBOOK_CHOICE_KEY,
} from "./phase1-manifest.ts";
import {
  backgroundAbilityScoreIncreaseOptionId,
  backgroundAbilityScoreIncreaseOptions,
  choiceHole,
  draftSource,
  hasDraftSelection,
  isSupported,
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
  type CreationChoiceOption,
  type CreationChoiceOptionId,
  type CreationHole,
  type CreationHoleSource,
  type UnitCatalog,
} from "./types.ts";
import {
  supportedBackgroundUnitIds,
  supportedClassUnitIds,
  supportedEquipmentPurchaseChoiceCount,
  supportedAdvancementsForClass,
  supportedLoadoutChoices,
  supportedPurchasableEquipmentUnitIds,
  unsupportedHoleSelectionOptionId,
} from "./support-gates.ts";
import { hitPointAdvancementLabel } from "./character-progression-types.ts";

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
    if (
      hasDraftSelection(input.draft.selections, path) ||
      isBlockedInitialDraftPath(input.draft, path)
    ) {
      return [];
    }
    const hole = draftHole(path, input.unitLibrary, input.draft);
    return hole === undefined ? [] : [hole];
  });
}

function isBlockedInitialDraftPath(
  draft: CharacterDraft,
  path: (typeof INITIAL_CHARACTER_DRAFT_PATHS)[number],
): boolean {
  return (
    path === "draft.advancement.initial" &&
    (draft.selections.primaryClass == null ||
      !isSupported(draft.selections.primaryClass, supportedClassUnitIds()))
  );
}

export function discoverClassGrantedHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitCatalog;
}): readonly CreationHole[] {
  const classUnitId = input.draft.selections.primaryClass;
  if (
    classUnitId == null ||
    !isSupported(classUnitId, supportedClassUnitIds())
  ) {
    return [];
  }

  const classUnit = input.unitLibrary.getUnit(classUnitId);
  if (Option.isNone(classUnit)) {
    return [];
  }
  const facts = readClassCreationFacts(classUnit.value);
  const classLevel = selectedClassLevel(input.draft, classUnitId);
  if (facts.tag !== "readable") {
    return [];
  }

  return [
    ...unselectedUnitChoiceHole(
      input.draft,
      choiceHole({
        source: unitSource(classUnitId, classSkillChoiceKey(facts.value)),
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
    ...unselectedUnitChoiceHole(
      input.draft,
      startingEquipmentChoiceHole(
        unitSource(classUnitId, CLASS_EQUIPMENT_CHOICE_KEY),
        facts.value.startingEquipment,
      ),
    ),
    ...discoverWizardSpellcastingHoles(classUnitId, facts.value, input.draft),
  ];
}

type ReadableClassCreationFacts = Extract<
  ReturnType<typeof readClassCreationFacts>,
  { readonly tag: "readable" }
>["value"];

function selectedClassLevel(
  draft: CharacterDraft,
  classUnitId: UnitRecord["id"],
): number {
  return (
    draft.selections.advancement?.entries.find(
      (entry) => entry.classUnitId === classUnitId,
    )?.classLevel ?? 1
  );
}

function classSkillChoiceKey(facts: ReadableClassCreationFacts) {
  return facts.className === "wizard"
    ? WIZARD_SKILL_CHOICE_KEY
    : FIGHTER_SKILL_CHOICE_KEY;
}

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
  source: CreationHoleSource,
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
        // Phase 1 only supports Dice Set; support-gates.ts rejects the rest as
        // unsupported rather than treating them as invalid RAW choices.
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
  const classUnitId = input.draft.selections.primaryClass;
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
          source: unitSource(loadoutChoice.unitId, loadoutChoice.choiceKey),
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
  source: CreationHoleSource,
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
  const classUnitId = draft.selections.primaryClass;
  const backgroundUnitId = draft.selections.background;
  if (
    classUnitId == null ||
    backgroundUnitId == null ||
    !isSupported(classUnitId, supportedClassUnitIds()) ||
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
    !hasValidSelectionForHole(draft, hole)
    ? [hole]
    : [];
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
    selection.options.every((selectedOption) =>
      selectedChoiceOptionMatchesHole(selectedOption, hole),
    )
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

  if (left.tag === "unit" && right.tag === "unit") {
    return left.unitId === right.unitId && left.choiceKey === right.choiceKey;
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
  return (
    sameCreationHoleSource(left.source, right.source) &&
    sameSelectedChoiceOptionMultiset(left.options, right.options)
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

  if (
    mechanics.family === "passive" &&
    mechanics.grants.some(
      (grant) =>
        grant.kind === "grant_feat" &&
        ("category" in grant
          ? grant.category === "fighting_style"
          : grant.categories.includes("fighting_style")),
    )
  ) {
    const hole = fightingStyleFeatureHoleSource(featureUnitId, unitLibrary);
    return hole === undefined ? [] : [hole];
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

function fightingStyleFeatureHoleSource(
  featureUnitId: UnitRecord["id"],
  unitLibrary: UnitCatalog,
): ChoiceCreationHole | undefined {
  const options = unitLibrary
    .listUnits()
    .filter(
      (unit): unit is FeatRecord =>
        unit.kind === "feat" && unit.category === "fighting_style",
    )
    .map(unitOption);

  return requireChoiceCreationHole(
    choiceHole({
      source: unitSource(featureUnitId, FIGHTER_FIGHTING_STYLE_CHOICE_KEY),
      cardinality: EXACTLY_ONE_CHOICE,
      options,
    }),
  );
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
      source: unitSource(feature.id, FIGHTER_WEAPON_MASTERY_CHOICE_KEY),
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
  draft?: CharacterDraft,
): CreationHole | undefined {
  if (path === "draft.primaryClass") {
    return choiceHole({
      source: draftSource(path),
      cardinality: EXACTLY_ONE_CHOICE,
      options: unitLibrary
        .listUnits()
        .filter((unit) => unit.kind === "class")
        .map(unitOption),
    });
  }

  if (path === "draft.advancement.initial") {
    const classUnitIds =
      draft?.selections.primaryClass == null
        ? supportedClassUnitIds()
        : [draft.selections.primaryClass];
    const supportedClassIds = new Set(classUnitIds);
    return choiceHole({
      source: draftSource(path),
      cardinality: EXACTLY_ONE_CHOICE,
      options: unitLibrary
        .listUnits()
        .filter(
          (unit) => unit.kind === "class" && supportedClassIds.has(unit.id),
        )
        .flatMap((unit) =>
          supportedAdvancementsForClass(unit.id).map((advancement) => ({
            optionId: advancementOptionId(advancement),
            label: `${unit.name} ${advancement.classLevel} (${hitPointAdvancementLabel(advancement.hitPointAdvancement)})`,
            unitRef: { unitId: unit.id },
          })),
        ),
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
