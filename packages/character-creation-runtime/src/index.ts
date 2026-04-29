import { Brand } from "effect";
import {
  readBackgroundCreationFacts,
  readClassCreationFacts,
} from "@dnd/surface/surface/character-creation-readers";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type {
  Ability,
  FeatRecord,
  Skill,
  SixAbilityScores,
  UnitRecord,
  WeaponRecord,
} from "@dnd/surface/surface/types";

export type UnitLibrary = UnitCatalog;

export type CreationSessionId = string & Brand.Brand<"CreationSessionId">;
const CreationSessionId = Brand.nominal<CreationSessionId>();
export const creationSessionId: (value: string) => CreationSessionId =
  CreationSessionId;

export type CharacterDraftId = string & Brand.Brand<"CharacterDraftId">;
const CharacterDraftId = Brand.nominal<CharacterDraftId>();
export const characterDraftId: (value: string) => CharacterDraftId =
  CharacterDraftId;

export const ABILITY_SCORE_METHODS = [
  "standardArray",
  "randomGeneration",
  "pointCost",
] as const;
export type AbilityScoreMethod = (typeof ABILITY_SCORE_METHODS)[number];

export const STANDARD_LANGUAGES = [
  "Common",
  "Common Sign Language",
  "Draconic",
  "Dwarvish",
  "Elvish",
  "Giant",
  "Gnomish",
  "Goblin",
  "Halfling",
  "Orc",
] as const;
export type StandardLanguage = (typeof STANDARD_LANGUAGES)[number];
export type SelectableStandardLanguage = Exclude<StandardLanguage, "Common">;
export type CharacterStartingLanguages = {
  readonly [First in SelectableStandardLanguage]: readonly [
    "Common",
    First,
    Exclude<SelectableStandardLanguage, First>,
  ];
}[SelectableStandardLanguage];

export const ALIGNMENT_MORALITIES = ["good", "neutral", "evil"] as const;
export type AlignmentMorality = (typeof ALIGNMENT_MORALITIES)[number];

export const ALIGNMENT_ORDERS = ["lawful", "neutral", "chaotic"] as const;
export type AlignmentOrder = (typeof ALIGNMENT_ORDERS)[number];

export type CharacterAlignment = {
  readonly morality: AlignmentMorality;
  readonly order: AlignmentOrder;
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

export type UnitChoiceKey = string & Brand.Brand<"UnitChoiceKey">;
const UnitChoiceKey = Brand.nominal<UnitChoiceKey>();
export const unitChoiceKey: (value: string) => UnitChoiceKey = UnitChoiceKey;

export type CreationChoiceOptionId = string &
  Brand.Brand<"CreationChoiceOptionId">;
const CreationChoiceOptionId = Brand.nominal<CreationChoiceOptionId>();
export const creationChoiceOptionId: (value: string) => CreationChoiceOptionId =
  CreationChoiceOptionId;

export type CreationHoleSource =
  | { readonly tag: "draft"; readonly path: CharacterDraftPath }
  | {
      readonly tag: "unit";
      readonly unitId: UnitRecord["id"];
      readonly choiceKey: UnitChoiceKey;
    };

export type CreationHoleIdText =
  | `cc:draft:${CharacterDraftPath}`
  | `cc:unit:${UnitRecord["id"]}:${UnitChoiceKey}`;

export type CreationHoleId = CreationHoleIdText & Brand.Brand<"CreationHoleId">;
const CreationHoleId = Brand.nominal<CreationHoleId>();
export const creationHoleId: (value: CreationHoleIdText) => CreationHoleId =
  CreationHoleId;

export type UnitRef = {
  readonly unitId: UnitRecord["id"];
};

export type AbilityScoreAssignment = SixAbilityScores;

export type AbilityScoreGenerationSelection = {
  readonly method: AbilityScoreMethod;
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

export type CharacterAdvancementSelection = {
  readonly entries: readonly CharacterAdvancementEntry[];
};

export type CharacterAdvancementEntry = {
  readonly classUnitId: UnitRecord["id"];
  readonly level: CharacterClassLevel;
};

export type CharacterChoiceSelection = {
  readonly source: CreationHoleSource;
  readonly optionIds: readonly CreationChoiceOptionId[];
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
  readonly revision: number;
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

export type CreationHole =
  | {
      readonly kind: "singleChoice";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
      readonly options: readonly CreationChoiceOption[];
    }
  | {
      readonly kind: "multiChoice";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
      readonly min: number;
      readonly max: number;
      readonly options: readonly CreationChoiceOption[];
    }
  | {
      readonly kind: "abilityScores";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
      readonly methods: readonly AbilityScoreMethod[];
    }
  | {
      readonly kind: "freeText";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
    };

export type CreationFill =
  | {
      readonly kind: "choice";
      readonly holeId: CreationHoleId;
      readonly optionId: CreationChoiceOptionId;
    }
  | {
      readonly kind: "multiChoice";
      readonly holeId: CreationHoleId;
      readonly optionIds: readonly CreationChoiceOptionId[];
    }
  | {
      readonly kind: "abilityScores";
      readonly holeId: CreationHoleId;
      readonly value: AbilityScoreAssignment;
    }
  | {
      readonly kind: "text";
      readonly holeId: CreationHoleId;
      readonly value: string;
    };

export const CREATION_FILL_ISSUE_CODES = [
  "unknownHole",
  "duplicateFill",
  "wrongFillKind",
  "invalidChoice",
  "tooFewChoices",
  "tooManyChoices",
  "unsupportedChoice",
] as const;
export type CreationFillIssueCode = (typeof CREATION_FILL_ISSUE_CODES)[number];

export type CreationFillIssue = {
  readonly tag: "illegalFill";
  readonly holeId: CreationHoleId;
  readonly fillIndex: number;
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

export type CreationIssue = CreationFillIssue | CreationBatchIssue;

export type CreationBatchFillInput = {
  readonly draft: CharacterDraft;
  readonly fills: readonly CreationFill[];
  readonly expectedRevision: number;
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
      readonly issues: readonly CreationIssue[];
      readonly finalization: CreationFinalizationResult;
    };

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

export type CharacterSheet = {
  readonly sourceDraftId: CharacterDraftId;
  readonly selections: FinalizedCharacterSelections;
  readonly unitRefs: readonly UnitRef[];
};

export type CreationFinalizationResult =
  | { readonly tag: "ready"; readonly sheet: CharacterSheet }
  | { readonly tag: "incomplete"; readonly holes: readonly CreationHole[] }
  | {
      readonly tag: "invalid";
      readonly issues: readonly CreationIssue[];
      readonly holes: readonly CreationHole[];
    };

const INITIAL_CHARACTER_DRAFT_PATHS = [
  "draft.primaryClass",
  "draft.background",
  "draft.species",
  "draft.abilityScoreGeneration",
  "draft.languages",
  "draft.alignment",
] as const satisfies ReadonlyArray<CharacterDraftPath>;

const PHASE1_CLASS_FIGHTER_UNIT_ID = "class_fighter";
const PHASE1_BACKGROUND_SOLDIER_UNIT_ID = "background_soldier";
const PHASE1_SPECIES_ORC_UNIT_ID = "species_orc";
const PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID = "armor_chain_mail";
const PHASE1_WEAPON_LONGSWORD_UNIT_ID = "weapon_longsword";
const PHASE1_SHIELD_UNIT_ID = "equipment_shield";
const PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID = "defense";

const SUPPORTED_CLASS_UNIT_IDS = [
  PHASE1_CLASS_FIGHTER_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const SUPPORTED_BACKGROUND_UNIT_IDS = [
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const SUPPORTED_SPECIES_UNIT_IDS = [
  PHASE1_SPECIES_ORC_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const SUPPORTED_FIGHTING_STYLE_FEAT_IDS = [
  PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const SUPPORTED_PURCHASE_UNIT_IDS = [
  PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_SHIELD_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;

const FIGHTER_FIGHTING_STYLE_FEATURE_ID = "fighter_fighting_style_l1";
const FIGHTER_WEAPON_MASTERY_FEATURE_ID = "fighter_weapon_mastery_l1";
const PHASE1_CLASS_EQUIPMENT_OPTION_ID = creationChoiceOptionId("option_c");
const PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID =
  creationChoiceOptionId("option_b");

const BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY = unitChoiceKey(
  "background_ability_score_increase",
);
const BACKGROUND_TOOL_CHOICE_KEY = unitChoiceKey("background_tool_choice");
const CLASS_EQUIPMENT_CHOICE_KEY = unitChoiceKey("class_equipment_choice");
const BACKGROUND_EQUIPMENT_CHOICE_KEY = unitChoiceKey(
  "background_equipment_choice",
);
const EQUIPMENT_PURCHASE_CHOICE_KEY = unitChoiceKey("equipment_purchase");
const FIGHTER_SKILL_CHOICE_KEY = unitChoiceKey("fighter_skill_choices");
const FIGHTER_FIGHTING_STYLE_CHOICE_KEY = unitChoiceKey(
  "fighter_fighting_style",
);
const FIGHTER_WEAPON_MASTERY_CHOICE_KEY = unitChoiceKey(
  "fighter_weapon_mastery_choices",
);
const LOADOUT_ARMOR_CHOICE_KEY = unitChoiceKey("loadout_armor");
const LOADOUT_SHIELD_CHOICE_KEY = unitChoiceKey("loadout_shield");
const LOADOUT_WEAPON_CHOICE_KEY = unitChoiceKey("loadout_weapon");

const ALIGNMENT_OPTIONS = [
  ["lawful", "good", "Lawful Good"],
  ["neutral", "good", "Neutral Good"],
  ["chaotic", "good", "Chaotic Good"],
  ["lawful", "neutral", "Lawful Neutral"],
  ["neutral", "neutral", "Neutral"],
  ["chaotic", "neutral", "Chaotic Neutral"],
  ["lawful", "evil", "Lawful Evil"],
  ["neutral", "evil", "Neutral Evil"],
  ["chaotic", "evil", "Chaotic Evil"],
] as const satisfies ReadonlyArray<
  readonly [AlignmentOrder, AlignmentMorality, string]
>;

let nextDraftOrdinal = 0;

export function createCharacterDraft(input: {
  readonly unitLibrary: UnitLibrary;
  readonly draftId?: CharacterDraftId;
}): CharacterDraft {
  void input.unitLibrary;

  return {
    draftId:
      input.draftId ?? characterDraftId(`cc:draft:${nextDraftOrdinal++}`),
    selections: {
      choices: [],
    },
    revision: 0,
  };
}

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

export function fillCreationHoles(
  input: CreationBatchFillInput & {
    readonly unitLibrary: UnitLibrary;
  },
): CreationBatchFillResult {
  const holes = discoverCreationHoles(input);
  const issues = creationFillIssues(input, holes);
  const finalization = finalizeCharacterDraft(input);

  if (issues.length > 0) {
    return {
      tag: "rejected",
      draft: input.draft,
      holes,
      issues,
      finalization,
    };
  }

  return {
    tag: "accepted",
    draft: input.draft,
    holes,
    finalization,
  };
}

export function finalizeCharacterDraft(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): CreationFinalizationResult {
  return {
    tag: "incomplete",
    holes: discoverCreationHoles(input),
  };
}

function creationFillIssues(
  input: CreationBatchFillInput,
  holes: readonly CreationHole[],
): readonly CreationIssue[] {
  if (input.expectedRevision !== input.draft.revision) {
    return [staleRevisionIssue(input)];
  }

  return input.fills.flatMap((fill, fillIndex) => {
    const matchingHole = holes.find((hole) => hole.holeId === fill.holeId);
    const isDuplicate = input.fills
      .slice(0, fillIndex)
      .some((priorFill) => priorFill.holeId === fill.holeId);

    if (isDuplicate) {
      return [duplicateFillIssue(fill, fillIndex)];
    }

    if (matchingHole == null) {
      return [unknownHoleIssue(fill, fillIndex)];
    }

    return [unsupportedFillIssue(fill, fillIndex)];
  });
}

function staleRevisionIssue(input: CreationBatchFillInput): CreationBatchIssue {
  return {
    tag: "illegalBatch",
    code: "staleRevision",
    message: `Expected draft revision ${input.expectedRevision}, received ${input.draft.revision}.`,
  };
}

function duplicateFillIssue(
  fill: CreationFill,
  fillIndex: number,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "duplicateFill",
    message: `Duplicate fill for character creation hole: ${fill.holeId}`,
  };
}

function unknownHoleIssue(
  fill: CreationFill,
  fillIndex: number,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "unknownHole",
    message: `Unknown character creation hole: ${fill.holeId}`,
  };
}

function unsupportedFillIssue(
  fill: CreationFill,
  fillIndex: number,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "unsupportedChoice",
    message: `Filling character creation hole is not implemented yet: ${fill.holeId}`,
  };
}

function discoverInitialDraftHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): readonly CreationHole[] {
  return INITIAL_CHARACTER_DRAFT_PATHS.flatMap((path) =>
    hasDraftSelection(input.draft.selections, path)
      ? []
      : [draftHole(path, input.unitLibrary)],
  );
}

function discoverClassGrantedHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): readonly CreationHole[] {
  const classUnitId = input.draft.selections.primaryClass;
  if (
    classUnitId == null ||
    !isSupported(classUnitId, SUPPORTED_CLASS_UNIT_IDS)
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
      multiChoiceHole({
        source: unitSource(classUnitId, FIGHTER_SKILL_CHOICE_KEY),
        min: facts.value.skillProficiencyChoice.choose,
        max: facts.value.skillProficiencyChoice.choose,
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
      singleChoiceHole({
        source: unitSource(classUnitId, CLASS_EQUIPMENT_CHOICE_KEY),
        options: facts.value.startingEquipment.map((choice) => ({
          optionId: creationChoiceOptionId(choice.id),
          label: startingEquipmentLabel(choice),
        })),
      }),
    ),
  ];
}

function discoverBackgroundGrantedHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): readonly CreationHole[] {
  const backgroundUnitId = input.draft.selections.background;
  if (
    backgroundUnitId == null ||
    !isSupported(backgroundUnitId, SUPPORTED_BACKGROUND_UNIT_IDS)
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
      singleChoiceHole({
        source: unitSource(
          backgroundUnitId,
          BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
        ),
        options: backgroundAbilityScoreIncreaseOptions(
          facts.value.abilityScoreIncrease.abilities,
        ),
      }),
    ),
    ...unselectedUnitChoiceHole(
      input.draft,
      singleChoiceHole({
        source: unitSource(backgroundUnitId, BACKGROUND_TOOL_CHOICE_KEY),
        options: [
          {
            optionId: creationChoiceOptionId("tool_dice_set"),
            label: "Dice Set",
          },
        ],
      }),
    ),
    ...unselectedUnitChoiceHole(
      input.draft,
      singleChoiceHole({
        source: unitSource(backgroundUnitId, BACKGROUND_EQUIPMENT_CHOICE_KEY),
        options: facts.value.startingEquipment.map((choice) => ({
          optionId: creationChoiceOptionId(choice.id),
          label: startingEquipmentLabel(choice),
        })),
      }),
    ),
  ];
}

function discoverEquipmentHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): readonly CreationHole[] {
  const classUnitId = input.draft.selections.primaryClass;
  if (classUnitId == null || !hasPhaseOneCoinEquipmentPath(input.draft)) {
    return [];
  }

  return [
    ...unselectedPurchaseHole(
      input.draft,
      multiChoiceHole({
        source: unitSource(classUnitId, EQUIPMENT_PURCHASE_CHOICE_KEY),
        min: SUPPORTED_PURCHASE_UNIT_IDS.length,
        max: SUPPORTED_PURCHASE_UNIT_IDS.length,
        options: SUPPORTED_PURCHASE_UNIT_IDS.map((unitId) =>
          unitOption(input.unitLibrary.requireUnit(unitId)),
        ),
      }),
    ),
    ...unselectedLoadoutHole(
      input.draft,
      singleChoiceHole({
        source: unitSource(
          PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
          LOADOUT_ARMOR_CHOICE_KEY,
        ),
        options: [
          {
            optionId: creationChoiceOptionId("worn"),
            label: "Worn",
            unitRef: { unitId: PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID },
          },
        ],
      }),
      PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
    ),
    ...unselectedLoadoutHole(
      input.draft,
      singleChoiceHole({
        source: unitSource(PHASE1_SHIELD_UNIT_ID, LOADOUT_SHIELD_CHOICE_KEY),
        options: [
          {
            optionId: creationChoiceOptionId("wielded"),
            label: "Wielded",
            unitRef: { unitId: PHASE1_SHIELD_UNIT_ID },
          },
        ],
      }),
      PHASE1_SHIELD_UNIT_ID,
    ),
    ...unselectedLoadoutHole(
      input.draft,
      singleChoiceHole({
        source: unitSource(
          PHASE1_WEAPON_LONGSWORD_UNIT_ID,
          LOADOUT_WEAPON_CHOICE_KEY,
        ),
        options: [
          {
            optionId: creationChoiceOptionId("wielded_one_handed"),
            label: "Wielded one-handed",
            unitRef: { unitId: PHASE1_WEAPON_LONGSWORD_UNIT_ID },
          },
        ],
      }),
      PHASE1_WEAPON_LONGSWORD_UNIT_ID,
    ),
  ];
}

function hasPhaseOneCoinEquipmentPath(draft: CharacterDraft): boolean {
  const classUnitId = draft.selections.primaryClass;
  const backgroundUnitId = draft.selections.background;
  return (
    classUnitId != null &&
    backgroundUnitId != null &&
    isSupported(classUnitId, SUPPORTED_CLASS_UNIT_IDS) &&
    isSupported(backgroundUnitId, SUPPORTED_BACKGROUND_UNIT_IDS) &&
    hasChoiceSelection(
      draft,
      unitSource(classUnitId, CLASS_EQUIPMENT_CHOICE_KEY),
      [PHASE1_CLASS_EQUIPMENT_OPTION_ID],
    ) &&
    hasChoiceSelection(
      draft,
      unitSource(backgroundUnitId, BACKGROUND_EQUIPMENT_CHOICE_KEY),
      [PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID],
    )
  );
}

function unselectedUnitChoiceHole(
  draft: CharacterDraft,
  hole: CreationHole,
): readonly CreationHole[] {
  return hasSelectionForSource(draft, hole.source) ? [] : [hole];
}

function unselectedBackgroundAbilityScoreIncreaseHole(
  draft: CharacterDraft,
  hole: CreationHole,
): readonly CreationHole[] {
  return draft.selections.backgroundAbilityScoreIncrease != null ||
    hasSelectionForSource(draft, hole.source)
    ? []
    : [hole];
}

function unselectedPurchaseHole(
  draft: CharacterDraft,
  hole: CreationHole,
): readonly CreationHole[] {
  return hasPurchasedManifestEquipment(draft) ? [] : [hole];
}

function unselectedLoadoutHole(
  draft: CharacterDraft,
  hole: CreationHole,
  unitId: UnitRecord["id"],
): readonly CreationHole[] {
  return hasPurchasedUnit(draft, unitId) &&
    !hasSelectionForSource(draft, hole.source)
    ? [hole]
    : [];
}

function hasPurchasedManifestEquipment(draft: CharacterDraft): boolean {
  return SUPPORTED_PURCHASE_UNIT_IDS.every((unitId) =>
    hasPurchasedUnit(draft, unitId),
  );
}

function hasPurchasedUnit(
  draft: CharacterDraft,
  unitId: UnitRecord["id"],
): boolean {
  return draft.selections.equipment?.selectedUnitIds.includes(unitId) ?? false;
}

function hasChoiceSelection(
  draft: CharacterDraft,
  source: CreationHoleSource,
  optionIds: readonly CreationChoiceOptionId[],
): boolean {
  return draft.selections.choices.some(
    (selection) =>
      sameCreationHoleSource(selection.source, source) &&
      sameOptionIdSet(selection.optionIds, optionIds),
  );
}

function hasSelectionForSource(
  draft: CharacterDraft,
  source: CreationHoleSource,
): boolean {
  return draft.selections.choices.some((selection) =>
    sameCreationHoleSource(selection.source, source),
  );
}

function sameCreationHoleSource(
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

function sameOptionIdSet(
  left: readonly CreationChoiceOptionId[],
  right: readonly CreationChoiceOptionId[],
): boolean {
  return (
    left.length === right.length &&
    left.every((optionId) => right.includes(optionId))
  );
}

function discoverLevelOneFighterFeatureHole(
  featureUnitId: UnitRecord["id"],
  draft: CharacterDraft,
  unitLibrary: UnitLibrary,
): readonly CreationHole[] {
  if (featureUnitId === FIGHTER_FIGHTING_STYLE_FEATURE_ID) {
    const options = unitLibrary
      .listUnits()
      .filter(
        (unit): unit is FeatRecord =>
          unit.kind === "feat" &&
          unit.category === "fighting_style" &&
          isSupported(unit.id, SUPPORTED_FIGHTING_STYLE_FEAT_IDS),
      )
      .map(unitOption);

    return unselectedUnitChoiceHole(
      draft,
      singleChoiceHole({
        source: unitSource(featureUnitId, FIGHTER_FIGHTING_STYLE_CHOICE_KEY),
        options,
      }),
    );
  }

  if (featureUnitId === FIGHTER_WEAPON_MASTERY_FEATURE_ID) {
    const feature = unitLibrary.requireUnit(featureUnitId);
    const mechanics =
      feature.kind === "class_feature" ? feature.mechanics : null;
    if (mechanics?.family !== "weapon_mastery_choice") {
      return [];
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
      multiChoiceHole({
        source: unitSource(featureUnitId, FIGHTER_WEAPON_MASTERY_CHOICE_KEY),
        min: mechanics.choose,
        max: mechanics.choose,
        options,
      }),
    );
  }

  return [];
}

function draftHole(
  path: (typeof INITIAL_CHARACTER_DRAFT_PATHS)[number],
  unitLibrary: UnitLibrary,
): CreationHole {
  if (path === "draft.primaryClass") {
    return singleChoiceHole({
      source: draftSource(path),
      options: unitLibrary
        .listUnits()
        .filter(
          (unit) =>
            unit.kind === "class" &&
            isSupported(unit.id, SUPPORTED_CLASS_UNIT_IDS),
        )
        .map(unitOption),
    });
  }

  if (path === "draft.background") {
    return singleChoiceHole({
      source: draftSource(path),
      options: unitLibrary
        .listUnits()
        .filter(
          (unit) =>
            unit.kind === "background" &&
            isSupported(unit.id, SUPPORTED_BACKGROUND_UNIT_IDS),
        )
        .map(unitOption),
    });
  }

  if (path === "draft.species") {
    return singleChoiceHole({
      source: draftSource(path),
      options: unitLibrary
        .listUnits()
        .filter(
          (unit) =>
            unit.kind === "species" &&
            isSupported(unit.id, SUPPORTED_SPECIES_UNIT_IDS),
        )
        .map(unitOption),
    });
  }

  if (path === "draft.abilityScoreGeneration") {
    return {
      kind: "abilityScores",
      holeId: creationHoleId(`cc:draft:${path}`),
      source: draftSource(path),
      methods: ["standardArray"],
    };
  }

  if (path === "draft.languages") {
    return multiChoiceHole({
      source: draftSource(path),
      min: 2,
      max: 2,
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
  return singleChoiceHole({
    source: draftSource(alignmentPath),
    options: ALIGNMENT_OPTIONS.map(([order, morality, label]) => ({
      optionId: creationChoiceOptionId(`${order}_${morality}`),
      label,
    })),
  });
}

function hasDraftSelection(
  selections: CharacterDraftSelections,
  path: (typeof INITIAL_CHARACTER_DRAFT_PATHS)[number],
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

function backgroundAbilityScoreIncreaseOptions(
  abilities: readonly Ability[],
): readonly CreationChoiceOption[] {
  const twoAndOneOptions = abilities.flatMap((plusTwo) =>
    abilities
      .filter((plusOne) => plusOne !== plusTwo)
      .map((plusOne) => ({
        optionId: creationChoiceOptionId(`two_and_one:${plusTwo}:${plusOne}`),
        label: `+2 ${abilityLabel(plusTwo)}, +1 ${abilityLabel(plusOne)}`,
      })),
  );

  return [
    ...twoAndOneOptions,
    {
      optionId: creationChoiceOptionId("one_each"),
      label: abilities
        .map((ability) => `+1 ${abilityLabel(ability)}`)
        .join(", "),
    },
  ];
}

function singleChoiceHole(input: {
  readonly source: CreationHoleSource;
  readonly options: readonly CreationChoiceOption[];
}): CreationHole {
  return {
    kind: "singleChoice",
    holeId: holeIdForSource(input.source),
    source: input.source,
    options: input.options,
  };
}

function multiChoiceHole(input: {
  readonly source: CreationHoleSource;
  readonly min: number;
  readonly max: number;
  readonly options: readonly CreationChoiceOption[];
}): CreationHole {
  return {
    kind: "multiChoice",
    holeId: holeIdForSource(input.source),
    source: input.source,
    min: input.min,
    max: input.max,
    options: input.options,
  };
}

function draftSource(path: CharacterDraftPath): CreationHoleSource {
  return { tag: "draft", path };
}

function unitSource(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): CreationHoleSource {
  return { tag: "unit", unitId, choiceKey };
}

function holeIdForSource(source: CreationHoleSource): CreationHoleId {
  if (source.tag === "draft") {
    return creationHoleId(`cc:draft:${source.path}`);
  }

  return creationHoleId(`cc:unit:${source.unitId}:${source.choiceKey}`);
}

function unitOption(unit: UnitRecord): CreationChoiceOption {
  return {
    optionId: creationChoiceOptionId(unit.id),
    label: unit.name,
    unitRef: { unitId: unit.id },
  };
}

function skillOption(skill: Skill): CreationChoiceOption {
  return {
    optionId: creationChoiceOptionId(skill),
    label: skillLabel(skill),
  };
}

function startingEquipmentLabel(choice: {
  readonly id: string;
  readonly kind: string;
  readonly coinsGp?: number;
}): string {
  return choice.coinsGp == null
    ? choice.id
    : `${choice.id} (${choice.coinsGp} GP)`;
}

function abilityLabel(ability: Ability): string {
  return ability.toUpperCase();
}

function skillLabel(skill: Skill): string {
  return skill
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function isSupported<T extends string>(
  value: string,
  supportedValues: ReadonlyArray<T>,
): value is T {
  return supportedValues.some((supportedValue) => supportedValue === value);
}
