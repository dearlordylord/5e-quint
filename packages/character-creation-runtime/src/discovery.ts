import { Match } from "effect";
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
} from "@dnd/surface/surface/character-creation-readers";
import type {
  BackgroundToolProficiency,
  FeatRecord,
  StartingEquipmentChoice,
  UnitRecord,
  WeaponRecord,
} from "@dnd/surface/surface/types";
import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
  EXACTLY_ONE_CHOICE,
  FIGHTER_FIGHTING_STYLE_CHOICE_KEY,
  FIGHTER_FIGHTING_STYLE_FEATURE_ID,
  FIGHTER_SECOND_WIND_FEATURE_ID,
  FIGHTER_SKILL_CHOICE_KEY,
  FIGHTER_WEAPON_MASTERY_CHOICE_KEY,
  FIGHTER_WEAPON_MASTERY_FEATURE_ID,
  INITIAL_CHARACTER_DRAFT_PATHS,
  LEVEL_ONE_FIGHTER_FEATURE_IDS,
  type LevelOneFighterFeatureId,
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
  type UnitLibrary,
} from "./types.ts";
import {
  supportedBackgroundUnitIds,
  supportedClassUnitIds,
  supportedLoadoutChoices,
  supportedPurchasableEquipmentUnitIds,
  unsupportedHoleSelectionOptionId,
} from "./support-gates.ts";

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
  readonly unitLibrary: UnitLibrary;
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
  readonly unitLibrary: UnitLibrary;
}): readonly CreationHole[] {
  return INITIAL_CHARACTER_DRAFT_PATHS.flatMap((path) =>
    hasDraftSelection(input.draft.selections, path)
      ? []
      : [draftHole(path, input.unitLibrary)],
  );
}

export function discoverClassGrantedHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): readonly CreationHole[] {
  const classUnitId = input.draft.selections.primaryClass;
  if (
    classUnitId == null ||
    !isSupported(classUnitId, supportedClassUnitIds())
  ) {
    return [];
  }

  const classUnit = input.unitLibrary.requireUnit(classUnitId);
  const facts = readClassCreationFacts(classUnit);
  if (facts.tag !== "readable") {
    return [];
  }

  return [
    ...unselectedUnitChoiceHole(
      input.draft,
      choiceHole({
        source: unitSource(classUnitId, FIGHTER_SKILL_CHOICE_KEY),
        cardinality: exactChoiceCardinality(
          facts.value.skillProficiencyChoice.choose,
        ),
        options: facts.value.skillProficiencyChoice.options.map(skillOption),
      }),
    ),
    ...facts.value.featureGrants.flatMap((grant) =>
      grant.level === 1
        ? discoverLevelOneFighterFeatureHole(
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
  ];
}

export function discoverBackgroundGrantedHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): readonly CreationHole[] {
  const backgroundUnitId = input.draft.selections.background;
  if (
    backgroundUnitId == null ||
    !isSupported(backgroundUnitId, supportedBackgroundUnitIds())
  ) {
    return [];
  }

  const backgroundUnit = input.unitLibrary.requireUnit(backgroundUnitId);
  const facts = readBackgroundCreationFacts(backgroundUnit);
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

  return spec != null && spec.cardinality.count <= spec.options.length
    ? spec
    : undefined;
}

export function discoverEquipmentHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): readonly CreationHole[] {
  const classUnitId = input.draft.selections.primaryClass;
  if (classUnitId == null || !hasPhaseOneCoinEquipmentPath(input)) {
    return [];
  }
  const purchaseHole = choiceHole({
    source: unitSource(classUnitId, EQUIPMENT_PURCHASE_CHOICE_KEY),
    cardinality: exactChoiceCardinality(
      supportedPurchasableEquipmentUnitIds().length,
    ),
    options: supportedPurchasableEquipmentUnitIds().map((unitId) =>
      unitOption(input.unitLibrary.requireUnit(unitId)),
    ),
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
): CreationHole {
  return choiceHole({
    source,
    cardinality: EXACTLY_ONE_CHOICE,
    options: choices.map((choice) => ({
      optionId: creationChoiceOptionId(choice.id),
      label: startingEquipmentLabel(choice),
    })),
  });
}

export function hasPhaseOneCoinEquipmentPath(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
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

  const classFacts = readClassCreationFacts(
    input.unitLibrary.requireUnit(classUnitId),
  );
  const backgroundFacts = readBackgroundCreationFacts(
    input.unitLibrary.requireUnit(backgroundUnitId),
  );
  if (classFacts.tag !== "readable" || backgroundFacts.tag !== "readable") {
    return false;
  }

  return (
    hasValidSelectionForHole(
      draft,
      startingEquipmentChoiceHole(
        unitSource(classUnitId, CLASS_EQUIPMENT_CHOICE_KEY),
        classFacts.value.startingEquipment,
      ),
    ) &&
    hasValidSelectionForHole(
      draft,
      startingEquipmentChoiceHole(
        unitSource(backgroundUnitId, BACKGROUND_EQUIPMENT_CHOICE_KEY),
        backgroundFacts.value.startingEquipment,
      ),
    )
  );
}

export function unselectedUnitChoiceHole(
  draft: CharacterDraft,
  hole: CreationHole,
): readonly CreationHole[] {
  return hasValidSelectionForHole(draft, hole) ? [] : [hole];
}

export function unselectedBackgroundAbilityScoreIncreaseHole(
  draft: CharacterDraft,
  hole: CreationHole,
): readonly CreationHole[] {
  return hasValidBackgroundAbilityScoreIncreaseSelectionForHole(draft, hole)
    ? []
    : [hole];
}

export function unselectedPurchaseHole(
  draft: CharacterDraft,
  hole: CreationHole,
): readonly CreationHole[] {
  return hasValidEquipmentPurchaseSelectionForHole(draft, hole) ? [] : [hole];
}

export function unselectedLoadoutHole(
  draft: CharacterDraft,
  hole: CreationHole,
  unitId: UnitRecord["id"],
  hasValidPurchaseSelection: boolean,
): readonly CreationHole[] {
  return hasValidPurchaseSelection &&
    hasPurchasedUnit(draft, unitId) &&
    !hasValidSelectionForHole(draft, hole)
    ? [hole]
    : [];
}

export function hasValidEquipmentPurchaseSelectionForHole(
  draft: CharacterDraft,
  hole: CreationHole,
): boolean {
  return choiceOptionIdsFitHole(
    hole,
    draft.selections.equipment?.selectedUnitIds.map((unitId) =>
      creationChoiceOptionId(unitId),
    ) ?? [],
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
  return (
    hole.kind === "choice" &&
    optionIds.length === hole.cardinality.count &&
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
  return hole.options.some(
    (option) =>
      choiceSelectionOptionKey(selectedOption) ===
      choiceSelectionOptionKey(selectedChoiceOption(option)),
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
  const rightKeys = right.map(choiceSelectionKey);
  const leftKeys = left.map(choiceSelectionKey);
  return sameOptionIdMultiset(leftKeys, rightKeys);
}

export function choiceSelectionKey(
  selection: CharacterChoiceSelection,
): string {
  const source = `unit:${selection.source.unitId}:${selection.source.choiceKey}`;
  const options = selection.options
    .map(choiceSelectionOptionKey)
    .sort()
    .join("\u0000");
  return `${source}\u0001${options}`;
}

export function choiceSelectionOptionIds(
  selection: CharacterChoiceSelection,
): readonly CreationChoiceOptionId[] {
  return selection.options.map((option) => option.optionId);
}

export function choiceSelectionOptionKey(
  option: CharacterSelectedChoiceOption,
): string {
  return option.unitRef == null
    ? option.optionId
    : `${option.optionId}\u0002${option.unitRef.unitId}`;
}

export function sameOptionIdMultiset(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const remainingRight = [...right];
  for (const optionId of left) {
    const matchIndex = remainingRight.indexOf(optionId);
    if (matchIndex === -1) {
      return false;
    }

    remainingRight.splice(matchIndex, 1);
  }

  return left.length === right.length && remainingRight.length === 0;
}

export function discoverLevelOneFighterFeatureHole(
  featureUnitId: UnitRecord["id"],
  draft: CharacterDraft,
  unitLibrary: UnitLibrary,
): readonly CreationHole[] {
  const featureId = requireLevelOneFighterFeatureId(featureUnitId);

  return Match.value(featureId).pipe(
    Match.when(FIGHTER_FIGHTING_STYLE_FEATURE_ID, () =>
      discoverFighterFightingStyleHole(draft, unitLibrary),
    ),
    Match.when(FIGHTER_SECOND_WIND_FEATURE_ID, () => []),
    Match.when(FIGHTER_WEAPON_MASTERY_FEATURE_ID, () =>
      discoverFighterWeaponMasteryHole(draft, unitLibrary),
    ),
    Match.exhaustive,
  );
}

function requireLevelOneFighterFeatureId(
  featureUnitId: UnitRecord["id"],
): LevelOneFighterFeatureId {
  const featureId = LEVEL_ONE_FIGHTER_FEATURE_IDS.find(
    (knownFeatureId) => knownFeatureId === featureUnitId,
  );
  if (featureId == null) {
    throw new Error(
      `Unsupported level-1 Fighter feature grant in character creation: ${featureUnitId}`,
    );
  }

  return featureId;
}

function discoverFighterFightingStyleHole(
  draft: CharacterDraft,
  unitLibrary: UnitLibrary,
): readonly CreationHole[] {
  const options = unitLibrary
    .listUnits()
    .filter(
      (unit): unit is FeatRecord =>
        unit.kind === "feat" && unit.category === "fighting_style",
    )
    .map(unitOption);

  return unselectedUnitChoiceHole(
    draft,
    choiceHole({
      source: unitSource(
        FIGHTER_FIGHTING_STYLE_FEATURE_ID,
        FIGHTER_FIGHTING_STYLE_CHOICE_KEY,
      ),
      cardinality: EXACTLY_ONE_CHOICE,
      options,
    }),
  );
}

function discoverFighterWeaponMasteryHole(
  draft: CharacterDraft,
  unitLibrary: UnitLibrary,
): readonly CreationHole[] {
  const feature = unitLibrary.requireUnit(FIGHTER_WEAPON_MASTERY_FEATURE_ID);
  const mechanics = feature.kind === "class_feature" ? feature.mechanics : null;
  if (mechanics?.family !== "weapon_mastery_choice") {
    throw new Error(
      `Expected ${FIGHTER_WEAPON_MASTERY_FEATURE_ID} to be a weapon mastery choice feature.`,
    );
  }

  const options = unitLibrary
    .listUnits()
    .filter(
      (unit): unit is WeaponRecord =>
        unit.kind === "weapon" &&
        mechanics.eligibleWeapons.includes(unit.category),
    )
    .map(unitOption);

  return unselectedUnitChoiceHole(
    draft,
    choiceHole({
      source: unitSource(
        FIGHTER_WEAPON_MASTERY_FEATURE_ID,
        FIGHTER_WEAPON_MASTERY_CHOICE_KEY,
      ),
      cardinality: exactChoiceCardinality(mechanics.choose),
      options,
    }),
  );
}

export function draftHole(
  path: (typeof INITIAL_CHARACTER_DRAFT_PATHS)[number],
  unitLibrary: UnitLibrary,
): CreationHole {
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
