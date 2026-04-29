import { Brand, Match, Option } from "effect";
import {
  readBackgroundCreationFacts,
  readClassCreationFacts,
  readSpeciesCreationFacts,
} from "@dnd/surface/surface/character-creation-readers";
import { SKILLS } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type {
  Ability,
  ActivationResource,
  ArmorTrainingCategory,
  BackgroundToolProficiency,
  FeatRecord,
  Skill,
  SixAbilityScores,
  UnitRecord,
  WeaponRecord,
  WeaponProficiencyCategory,
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

export const CREATION_FINALIZATION_ISSUE_CODES = [
  "illegalFinalization",
] as const;
export type CreationFinalizationIssueCode =
  (typeof CREATION_FINALIZATION_ISSUE_CODES)[number];

export type CreationFinalizationIssue = {
  readonly tag: "illegalFinalization";
  readonly code: CreationFinalizationIssueCode;
  readonly message: string;
};

export type CreationIssue =
  | CreationFillIssue
  | CreationBatchIssue
  | CreationFinalizationIssue;

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

export type CharacterSheetAbilityScores = {
  readonly base: AbilityScoreAssignment;
  readonly backgroundIncrease: BackgroundAbilityScoreIncreaseSelection;
  readonly final: AbilityScoreAssignment;
};

export type CharacterSheetHitPoints = {
  readonly maximum: number;
  readonly hitDice: readonly CharacterSheetHitDie[];
};

export type CharacterSheetHitDie = {
  readonly classUnitId: UnitRecord["id"];
  readonly dieSize: number;
  readonly total: number;
};

export type CharacterSheetProficiencies = {
  readonly savingThrows: readonly Ability[];
  readonly skills: readonly Skill[];
  readonly weaponCategories: readonly WeaponProficiencyCategory[];
  readonly armorTraining: readonly ArmorTrainingCategory[];
  readonly tools: readonly CreationChoiceOptionId[];
};

export type CharacterSheetFeature = {
  readonly unitId: UnitRecord["id"];
  readonly source: "class" | "background" | "species" | "choice";
};

export type CharacterSheetResource = {
  readonly unitId: UnitRecord["id"];
  readonly resource: ActivationResource;
};

export type CharacterSheetLoadout = {
  readonly armor?: UnitRecord["id"];
  readonly shield?: UnitRecord["id"];
  readonly weapon?: {
    readonly unitId: UnitRecord["id"];
    readonly grip: "one_handed";
  };
};

export type CharacterSheet = {
  readonly sourceDraftId: CharacterDraftId;
  readonly selections: FinalizedCharacterSelections;
  readonly unitRefs: readonly UnitRef[];
  readonly abilityScores: CharacterSheetAbilityScores;
  readonly hitPoints: CharacterSheetHitPoints;
  readonly proficiencies: CharacterSheetProficiencies;
  readonly features: readonly CharacterSheetFeature[];
  readonly resources: readonly CharacterSheetResource[];
  readonly equipment: {
    readonly ownedUnitIds: readonly UnitRecord["id"][];
    readonly loadout: CharacterSheetLoadout;
  };
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
const SUPPORTED_CLASS_OPTION_IDS = [
  creationChoiceOptionId(PHASE1_CLASS_FIGHTER_UNIT_ID),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
const SUPPORTED_BACKGROUND_OPTION_IDS = [
  creationChoiceOptionId(PHASE1_BACKGROUND_SOLDIER_UNIT_ID),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
const SUPPORTED_SPECIES_OPTION_IDS = [
  creationChoiceOptionId(PHASE1_SPECIES_ORC_UNIT_ID),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
const SUPPORTED_PURCHASE_OPTION_IDS = SUPPORTED_PURCHASE_UNIT_IDS.map(
  creationChoiceOptionId,
);
const SUPPORTED_FIGHTER_SKILL_OPTION_IDS = [
  creationChoiceOptionId("perception"),
  creationChoiceOptionId("survival"),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
const SUPPORTED_FIGHTING_STYLE_OPTION_IDS = [
  creationChoiceOptionId(PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
const SUPPORTED_WEAPON_MASTERY_OPTION_IDS = [
  creationChoiceOptionId(PHASE1_WEAPON_LONGSWORD_UNIT_ID),
  creationChoiceOptionId("weapon_spear"),
  creationChoiceOptionId("weapon_flail"),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
const SUPPORTED_LANGUAGE_OPTION_IDS = [
  creationChoiceOptionId("Dwarvish"),
  creationChoiceOptionId("Goblin"),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;

const FIGHTER_FIGHTING_STYLE_FEATURE_ID = "fighter_fighting_style_l1";
const FIGHTER_WEAPON_MASTERY_FEATURE_ID = "fighter_weapon_mastery_l1";
const PHASE1_CLASS_EQUIPMENT_OPTION_ID = creationChoiceOptionId("option_c");
const PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID =
  creationChoiceOptionId("option_b");
const PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_SELECTION = {
  kind: "twoAndOne",
  plusTwo: "str",
  plusOne: "con",
} as const satisfies BackgroundAbilityScoreIncreaseSelection;
const PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID =
  backgroundAbilityScoreIncreaseOptionId(
    PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_SELECTION,
  );
const PHASE1_ALIGNMENT_OPTION_ID = creationChoiceOptionId("lawful_good");

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

const SURFACE_ABILITIES = [
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
] as const satisfies ReadonlyArray<Ability>;
const STANDARD_ARRAY_SCORES = [
  15, 14, 13, 12, 10, 8,
] as const satisfies ReadonlyArray<number>;

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

  const nextDraft = applyCreationFills(input.draft, holes, input.fills);
  const nextInput = { draft: nextDraft, unitLibrary: input.unitLibrary };

  return {
    tag: "accepted",
    draft: nextDraft,
    holes: discoverCreationHoles(nextInput),
    finalization: finalizeCharacterDraft(nextInput),
  };
}

export function finalizeCharacterDraft(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): CreationFinalizationResult {
  const holes = discoverCreationHoles(input);
  if (holes.length > 0) {
    return {
      tag: "incomplete",
      holes,
    };
  }

  const selections = finalizedSelections(input.draft);
  const issues =
    selections == null
      ? [illegalFinalizationIssue("Draft is incomplete.")]
      : [];
  const legalityIssues =
    selections == null
      ? issues
      : finalizedSelectionIssues(selections, input.unitLibrary);

  if (legalityIssues.length > 0 || selections == null) {
    return {
      tag: "invalid",
      issues: legalityIssues.length > 0 ? legalityIssues : issues,
      holes,
    };
  }

  return {
    tag: "ready",
    sheet: buildCharacterSheet({
      sourceDraftId: input.draft.draftId,
      selections,
      unitLibrary: input.unitLibrary,
    }),
  };
}

function finalizedSelections(
  draft: CharacterDraft,
): FinalizedCharacterSelections | undefined {
  const selections = draft.selections;
  if (
    selections.primaryClass == null ||
    selections.advancement == null ||
    selections.background == null ||
    selections.abilityScoreGeneration == null ||
    selections.backgroundAbilityScoreIncrease == null ||
    selections.species == null ||
    selections.languages == null ||
    selections.alignment == null ||
    selections.equipment == null
  ) {
    return undefined;
  }

  return {
    primaryClass: selections.primaryClass,
    advancement: selections.advancement,
    background: selections.background,
    abilityScoreGeneration: selections.abilityScoreGeneration,
    backgroundAbilityScoreIncrease: selections.backgroundAbilityScoreIncrease,
    species: selections.species,
    languages: selections.languages,
    alignment: selections.alignment,
    choices: selections.choices,
    equipment: selections.equipment,
  };
}

function finalizedSelectionIssues(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitLibrary,
): readonly CreationFinalizationIssue[] {
  return [
    ...expectedValueIssue(
      selections.primaryClass === PHASE1_CLASS_FIGHTER_UNIT_ID,
      "Finalized sheet must use the supported Fighter class.",
    ),
    ...expectedValueIssue(
      selections.background === PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
      "Finalized sheet must use the supported Soldier background.",
    ),
    ...expectedValueIssue(
      selections.species === PHASE1_SPECIES_ORC_UNIT_ID,
      "Finalized sheet must use the supported Orc species.",
    ),
    ...expectedValueIssue(
      isInitialFighterAdvancement(selections.advancement),
      "Finalized sheet advancement must be exactly one Fighter level.",
    ),
    ...expectedValueIssue(
      isStandardArrayAssignment(
        selections.abilityScoreGeneration.assignedScores,
      ) && selections.abilityScoreGeneration.method === "standardArray",
      "Finalized sheet must use the Standard Array exactly once.",
    ),
    ...expectedValueIssue(
      isPhaseOneManifestBackgroundAbilityScoreIncrease(
        selections.backgroundAbilityScoreIncrease,
        unitLibrary,
        selections.background,
        selections.abilityScoreGeneration.assignedScores,
      ),
      "Finalized sheet must use the phase-1 Soldier ability-score increase.",
    ),
    ...expectedValueIssue(
      sameOptionIdMultiset(selections.languages, [
        "Common",
        "Dwarvish",
        "Goblin",
      ]),
      "Finalized sheet must use Common, Dwarvish, and Goblin.",
    ),
    ...expectedValueIssue(
      selections.alignment.order === "lawful" &&
        selections.alignment.morality === "good",
      "Finalized sheet must use Lawful Good alignment for the phase-1 manifest.",
    ),
    ...expectedValueIssue(
      sameChoiceSelectionMultiset(
        selections.choices,
        phaseOneManifestChoiceSelections(),
      ),
      "Finalized sheet must carry exactly the phase-1 manifest choices.",
    ),
    ...expectedValueIssue(
      sameOptionIdMultiset(selections.equipment.selectedUnitIds, [
        PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
        PHASE1_WEAPON_LONGSWORD_UNIT_ID,
        PHASE1_SHIELD_UNIT_ID,
      ]),
      "Finalized sheet must own exactly the phase-1 purchased equipment.",
    ),
  ];
}

function phaseOneManifestChoiceSelections(): readonly CharacterChoiceSelection[] {
  return [
    choiceSelection(PHASE1_CLASS_FIGHTER_UNIT_ID, FIGHTER_SKILL_CHOICE_KEY, [
      ...SUPPORTED_FIGHTER_SKILL_OPTION_IDS,
    ]),
    choiceSelection(
      FIGHTER_FIGHTING_STYLE_FEATURE_ID,
      FIGHTER_FIGHTING_STYLE_CHOICE_KEY,
      [...SUPPORTED_FIGHTING_STYLE_OPTION_IDS],
    ),
    choiceSelection(
      FIGHTER_WEAPON_MASTERY_FEATURE_ID,
      FIGHTER_WEAPON_MASTERY_CHOICE_KEY,
      [...SUPPORTED_WEAPON_MASTERY_OPTION_IDS],
    ),
    choiceSelection(
      PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
      BACKGROUND_TOOL_CHOICE_KEY,
      [creationChoiceOptionId("tool_dice_set")],
    ),
    choiceSelection(PHASE1_CLASS_FIGHTER_UNIT_ID, CLASS_EQUIPMENT_CHOICE_KEY, [
      PHASE1_CLASS_EQUIPMENT_OPTION_ID,
    ]),
    choiceSelection(
      PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
      BACKGROUND_EQUIPMENT_CHOICE_KEY,
      [PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID],
    ),
    choiceSelection(PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID, LOADOUT_ARMOR_CHOICE_KEY, [
      creationChoiceOptionId("worn"),
    ]),
    choiceSelection(PHASE1_SHIELD_UNIT_ID, LOADOUT_SHIELD_CHOICE_KEY, [
      creationChoiceOptionId("wielded"),
    ]),
    choiceSelection(
      PHASE1_WEAPON_LONGSWORD_UNIT_ID,
      LOADOUT_WEAPON_CHOICE_KEY,
      [creationChoiceOptionId("wielded_one_handed")],
    ),
  ];
}

function choiceSelection(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
  optionIds: readonly CreationChoiceOptionId[],
): CharacterChoiceSelection {
  return {
    source: unitSource(unitId, choiceKey),
    optionIds,
  };
}

function expectedValueIssue(
  condition: boolean,
  message: string,
): readonly CreationFinalizationIssue[] {
  return condition ? [] : [illegalFinalizationIssue(message)];
}

function illegalFinalizationIssue(message: string): CreationFinalizationIssue {
  return {
    tag: "illegalFinalization",
    code: "illegalFinalization",
    message,
  };
}

function isInitialFighterAdvancement(
  advancement: CharacterAdvancementSelection,
): boolean {
  return (
    advancement.entries.length === 1 &&
    advancement.entries[0]?.classUnitId === PHASE1_CLASS_FIGHTER_UNIT_ID &&
    advancement.entries[0]?.level === 1
  );
}

function isSupportedBackgroundAbilityScoreIncrease(
  selection: BackgroundAbilityScoreIncreaseSelection,
  unitLibrary: UnitLibrary,
  backgroundUnitId: UnitRecord["id"],
  baseScores: AbilityScoreAssignment,
): boolean {
  const background = unitLibrary.requireUnit(backgroundUnitId);
  const facts = readBackgroundCreationFacts(background);
  if (facts.tag !== "readable") {
    return false;
  }

  const eligible = facts.value.abilityScoreIncrease.abilities;
  const finalScores = applyBackgroundAbilityScoreIncrease(
    baseScores,
    selection,
    eligible,
  );

  if (SURFACE_ABILITIES.some((ability) => finalScores[ability] > 20)) {
    return false;
  }

  if (selection.kind === "oneEach") {
    return true;
  }

  return (
    eligible.includes(selection.plusTwo) && eligible.includes(selection.plusOne)
  );
}

function isPhaseOneManifestBackgroundAbilityScoreIncrease(
  selection: BackgroundAbilityScoreIncreaseSelection,
  unitLibrary: UnitLibrary,
  backgroundUnitId: UnitRecord["id"],
  baseScores: AbilityScoreAssignment,
): boolean {
  return (
    sameBackgroundAbilityScoreIncreaseSelection(
      selection,
      PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_SELECTION,
    ) &&
    isSupportedBackgroundAbilityScoreIncrease(
      selection,
      unitLibrary,
      backgroundUnitId,
      baseScores,
    )
  );
}

function sameBackgroundAbilityScoreIncreaseSelection(
  left: BackgroundAbilityScoreIncreaseSelection,
  right: BackgroundAbilityScoreIncreaseSelection,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === "oneEach") {
    return true;
  }

  if (right.kind === "oneEach") {
    return false;
  }

  return left.plusTwo === right.plusTwo && left.plusOne === right.plusOne;
}

function buildCharacterSheet(input: {
  readonly sourceDraftId: CharacterDraftId;
  readonly selections: FinalizedCharacterSelections;
  readonly unitLibrary: UnitLibrary;
}): CharacterSheet {
  const classFacts = requireReadable(
    readClassCreationFacts(
      input.unitLibrary.requireUnit(input.selections.primaryClass),
    ),
    "class",
  );
  const backgroundFacts = requireReadable(
    readBackgroundCreationFacts(
      input.unitLibrary.requireUnit(input.selections.background),
    ),
    "background",
  );
  const speciesFacts = requireReadable(
    readSpeciesCreationFacts(
      input.unitLibrary.requireUnit(input.selections.species),
    ),
    "species",
  );
  const baseScores = input.selections.abilityScoreGeneration.assignedScores;
  const finalScores = applyBackgroundAbilityScoreIncrease(
    baseScores,
    input.selections.backgroundAbilityScoreIncrease,
    backgroundFacts.abilityScoreIncrease.abilities,
  );
  const classFeatureUnitIds = classFacts.featureGrants
    .filter((grant) => grant.level === 1)
    .map((grant) => grant.unitId);
  const featureUnitIds = [
    ...classFeatureUnitIds,
    backgroundFacts.originFeatId,
    ...Object.values(speciesFacts.traits),
    PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID,
  ];

  return {
    sourceDraftId: input.sourceDraftId,
    selections: input.selections,
    unitRefs: unitRefs(
      input.selections.primaryClass,
      ...classFeatureUnitIds,
      input.selections.background,
      backgroundFacts.originFeatId,
      input.selections.species,
      ...Object.values(speciesFacts.traits),
      ...selectedChoiceUnitIds(input.selections, input.unitLibrary),
      ...input.selections.equipment.selectedUnitIds,
    ),
    abilityScores: {
      base: baseScores,
      backgroundIncrease: input.selections.backgroundAbilityScoreIncrease,
      final: finalScores,
    },
    hitPoints: {
      maximum: classFacts.hitPointDie + abilityModifier(finalScores.con),
      hitDice: [
        {
          classUnitId: input.selections.primaryClass,
          dieSize: classFacts.hitPointDie,
          total: 1,
        },
      ],
    },
    proficiencies: {
      savingThrows: classFacts.savingThrowProficiencies,
      skills: uniqueValues([
        ...selectedSkillProficiencies(input.selections),
        ...backgroundFacts.skillProficiencies,
      ]),
      weaponCategories: classFacts.weaponProficiencies,
      armorTraining: classFacts.armorTraining,
      tools: selectedToolProficiencies(input.selections),
    },
    features: unitRefs(...featureUnitIds).map((ref) => ({
      unitId: ref.unitId,
      source: featureSource(
        ref.unitId,
        classFeatureUnitIds,
        speciesFacts.traits,
      ),
    })),
    resources: classFeatureUnitIds.flatMap((unitId) =>
      resourceForFeature(input.unitLibrary.requireUnit(unitId)),
    ),
    equipment: {
      ownedUnitIds: input.selections.equipment.selectedUnitIds,
      loadout: {
        armor: PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
        shield: PHASE1_SHIELD_UNIT_ID,
        weapon: {
          unitId: PHASE1_WEAPON_LONGSWORD_UNIT_ID,
          grip: "one_handed",
        },
      },
    },
  };
}

function requireReadable<T>(
  result:
    | { readonly tag: "readable"; readonly value: T }
    | { readonly tag: "unreadable" },
  label: string,
): T {
  if (result.tag === "unreadable") {
    throw new Error(`Cannot finalize unreadable ${label} Unit.`);
  }

  return result.value;
}

function applyBackgroundAbilityScoreIncrease(
  baseScores: AbilityScoreAssignment,
  selection: BackgroundAbilityScoreIncreaseSelection,
  eligibleAbilities: readonly Ability[],
): AbilityScoreAssignment {
  if (selection.kind === "oneEach") {
    return eligibleAbilities.reduce(
      (scores, ability) => ({
        ...scores,
        [ability]: scores[ability] + 1,
      }),
      baseScores,
    );
  }

  return {
    ...baseScores,
    [selection.plusTwo]: baseScores[selection.plusTwo] + 2,
    [selection.plusOne]: baseScores[selection.plusOne] + 1,
  };
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function selectedChoiceUnitIds(
  selections: FinalizedCharacterSelections,
  unitLibrary: UnitLibrary,
): readonly UnitRecord["id"][] {
  return selections.choices.flatMap((selection) =>
    selection.optionIds.flatMap((optionId) => {
      const unit = unitLibrary.getUnit(optionId);
      return Option.isSome(unit) ? [unit.value.id] : [];
    }),
  );
}

function selectedSkillProficiencies(
  selections: FinalizedCharacterSelections,
): readonly Skill[] {
  const skillSelection = selections.choices.find((selection) =>
    sameCreationHoleSource(
      selection.source,
      unitSource(PHASE1_CLASS_FIGHTER_UNIT_ID, FIGHTER_SKILL_CHOICE_KEY),
    ),
  );

  return skillSelection == null
    ? []
    : skillSelection.optionIds.flatMap((optionId) => {
        const skill = SKILLS.find((candidate) => candidate === optionId);
        return skill == null ? [] : [skill];
      });
}

function selectedToolProficiencies(
  selections: FinalizedCharacterSelections,
): readonly CreationChoiceOptionId[] {
  const toolSelection = selections.choices.find((selection) =>
    sameCreationHoleSource(
      selection.source,
      unitSource(PHASE1_BACKGROUND_SOLDIER_UNIT_ID, BACKGROUND_TOOL_CHOICE_KEY),
    ),
  );

  return toolSelection?.optionIds ?? [];
}

function featureSource(
  unitId: UnitRecord["id"],
  classFeatureUnitIds: readonly UnitRecord["id"][],
  speciesTraits: Record<string, UnitRecord["id"]>,
): CharacterSheetFeature["source"] {
  if (classFeatureUnitIds.includes(unitId)) {
    return "class";
  }

  if (Object.values(speciesTraits).includes(unitId)) {
    return "species";
  }

  if (unitId === PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID) {
    return "choice";
  }

  return "background";
}

function resourceForFeature(
  unit: UnitRecord,
): readonly CharacterSheetResource[] {
  if (unit.kind !== "class_feature") {
    return [];
  }

  return unit.mechanics.family === "activation"
    ? [{ unitId: unit.id, resource: unit.mechanics.resource }]
    : [];
}

function unitRefs(...unitIds: readonly UnitRecord["id"][]): readonly UnitRef[] {
  return uniqueValues(unitIds).map((unitId) => ({ unitId }));
}

function uniqueValues<T>(values: readonly T[]): readonly T[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function creationFillIssues(
  input: CreationBatchFillInput,
  holes: readonly CreationHole[],
): readonly CreationIssue[] {
  const batchIssues =
    input.expectedRevision === input.draft.revision
      ? []
      : [staleRevisionIssue(input)];

  return [
    ...batchIssues,
    ...input.fills.flatMap((fill, fillIndex) => {
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

      return fillIssuesForHole(fill, fillIndex, matchingHole);
    }),
  ];
}

function fillIssuesForHole(
  fill: CreationFill,
  fillIndex: number,
  hole: CreationHole,
): readonly CreationFillIssue[] {
  if (!fillKindMatchesHole(fill, hole)) {
    return [wrongFillKindIssue(fill, fillIndex, hole)];
  }

  if (hole.kind === "singleChoice" && fill.kind === "choice") {
    const hasOption = hole.options.some(
      (option) => option.optionId === fill.optionId,
    );
    if (!hasOption) {
      return [invalidChoiceIssue(fill, fillIndex, fill.optionId)];
    }

    const unsupportedOptionId = unsupportedHoleSelectionOptionId(hole, [
      fill.optionId,
    ]);
    return unsupportedOptionId == null
      ? []
      : [unsupportedChoiceIssue(fill, fillIndex, unsupportedOptionId)];
  }

  if (hole.kind === "multiChoice" && fill.kind === "multiChoice") {
    return multiChoiceFillIssues(fill, fillIndex, hole);
  }

  if (hole.kind === "abilityScores" && fill.kind === "abilityScores") {
    return abilityScoreFillIssues(fill, fillIndex);
  }

  return [];
}

function fillKindMatchesHole(fill: CreationFill, hole: CreationHole): boolean {
  return (
    (hole.kind === "singleChoice" && fill.kind === "choice") ||
    (hole.kind === "multiChoice" && fill.kind === "multiChoice") ||
    (hole.kind === "abilityScores" && fill.kind === "abilityScores") ||
    (hole.kind === "freeText" && fill.kind === "text")
  );
}

function multiChoiceFillIssues(
  fill: Extract<CreationFill, { readonly kind: "multiChoice" }>,
  fillIndex: number,
  hole: Extract<CreationHole, { readonly kind: "multiChoice" }>,
): readonly CreationFillIssue[] {
  const cardinalityIssues = [
    ...(fill.optionIds.length < hole.min
      ? [tooFewChoicesIssue(fill, fillIndex, hole)]
      : []),
    ...(fill.optionIds.length > hole.max
      ? [tooManyChoicesIssue(fill, fillIndex, hole)]
      : []),
  ];
  const invalidOptionIds = fill.optionIds.filter(
    (optionId, optionIndex) =>
      fill.optionIds.indexOf(optionId) !== optionIndex ||
      !hole.options.some((option) => option.optionId === optionId),
  );

  if (invalidOptionIds.length > 0) {
    return [
      ...cardinalityIssues,
      invalidChoiceIssue(fill, fillIndex, invalidOptionIds[0]),
    ];
  }

  const unsupportedOptionId = unsupportedHoleSelectionOptionId(
    hole,
    fill.optionIds,
  );
  return unsupportedOptionId == null
    ? cardinalityIssues
    : [
        ...cardinalityIssues,
        unsupportedChoiceIssue(fill, fillIndex, unsupportedOptionId),
      ];
}

function abilityScoreFillIssues(
  fill: Extract<CreationFill, { readonly kind: "abilityScores" }>,
  fillIndex: number,
): readonly CreationFillIssue[] {
  return isStandardArrayAssignment(fill.value)
    ? []
    : [invalidAbilityScoresIssue(fill, fillIndex)];
}

function isStandardArrayAssignment(value: SixAbilityScores): boolean {
  return sameNumberMultiset(abilityScoreValues(value), STANDARD_ARRAY_SCORES);
}

function abilityScoreValues(value: SixAbilityScores): readonly number[] {
  return SURFACE_ABILITIES.map((ability) => value[ability]);
}

function sameNumberMultiset(
  left: readonly number[],
  right: readonly number[],
): boolean {
  const sortedLeft = [...left].sort((a, b) => a - b);
  const sortedRight = [...right].sort((a, b) => a - b);

  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}

function applyCreationFills(
  draft: CharacterDraft,
  holes: readonly CreationHole[],
  fills: readonly CreationFill[],
): CharacterDraft {
  const selections = fills.reduce(
    (selectionsSoFar, fill) =>
      applyCreationFill(selectionsSoFar, requireHole(holes, fill.holeId), fill),
    draft.selections,
  );

  return {
    ...draft,
    selections,
    revision: draft.revision + 1,
  };
}

function requireHole(
  holes: readonly CreationHole[],
  holeId: CreationHoleId,
): CreationHole {
  const hole = holes.find((candidate) => candidate.holeId === holeId);
  if (hole == null) {
    throw new Error(`Accepted fill referenced missing creation hole ${holeId}`);
  }

  return hole;
}

function applyCreationFill(
  selections: CharacterDraftSelections,
  hole: CreationHole,
  fill: CreationFill,
): CharacterDraftSelections {
  if (hole.source.tag === "draft") {
    return applyDraftFill(selections, hole, hole.source.path, fill);
  }

  return applyUnitFill(selections, hole, hole.source, fill);
}

function applyDraftFill(
  selections: CharacterDraftSelections,
  hole: CreationHole,
  path: CharacterDraftPath,
  fill: CreationFill,
): CharacterDraftSelections {
  if (path === "draft.primaryClass" && fill.kind === "choice") {
    const classUnitId = requireSelectedUnitId(hole, fill.optionId);
    return {
      ...selections,
      primaryClass: classUnitId,
      advancement: {
        entries: [{ classUnitId, level: 1 }],
      },
    };
  }

  if (path === "draft.background" && fill.kind === "choice") {
    return {
      ...selections,
      background: requireSelectedUnitId(hole, fill.optionId),
    };
  }

  if (path === "draft.species" && fill.kind === "choice") {
    return {
      ...selections,
      species: requireSelectedUnitId(hole, fill.optionId),
    };
  }

  if (
    path === "draft.abilityScoreGeneration" &&
    fill.kind === "abilityScores"
  ) {
    return {
      ...selections,
      abilityScoreGeneration: {
        method: "standardArray",
        assignedScores: fill.value,
      },
    };
  }

  if (path === "draft.languages" && fill.kind === "multiChoice") {
    return {
      ...selections,
      languages: requireStartingLanguages(fill.optionIds),
    };
  }

  if (path === "draft.alignment" && fill.kind === "choice") {
    return {
      ...selections,
      alignment: requireAlignmentSelection(fill.optionId),
    };
  }

  return selections;
}

function applyUnitFill(
  selections: CharacterDraftSelections,
  hole: CreationHole,
  source: Extract<CreationHoleSource, { readonly tag: "unit" }>,
  fill: CreationFill,
): CharacterDraftSelections {
  if (
    source.choiceKey === BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY &&
    fill.kind === "choice"
  ) {
    return {
      ...selections,
      backgroundAbilityScoreIncrease:
        requireBackgroundAbilityScoreIncreaseSelection(fill.optionId),
    };
  }

  if (
    source.choiceKey === EQUIPMENT_PURCHASE_CHOICE_KEY &&
    fill.kind === "multiChoice"
  ) {
    return {
      ...selections,
      equipment: {
        selectedUnitIds: requireSelectedUnitIds(hole, fill.optionIds),
      },
    };
  }

  const optionIds =
    fill.kind === "choice"
      ? [fill.optionId]
      : fill.kind === "multiChoice"
        ? fill.optionIds
        : [];

  return optionIds.length === 0
    ? selections
    : {
        ...selections,
        choices: [
          ...selections.choices,
          {
            source,
            optionIds,
          },
        ],
      };
}

function requireSelectedUnitIds(
  hole: CreationHole,
  optionIds: readonly CreationChoiceOptionId[],
): readonly UnitRecord["id"][] {
  return optionIds.map((optionId) => requireSelectedUnitId(hole, optionId));
}

function requireSelectedUnitId(
  hole: CreationHole,
  optionId: CreationChoiceOptionId,
): UnitRecord["id"] {
  const option = requireAcceptedChoiceOption(hole, optionId);
  if (option.unitRef == null) {
    throw new Error(
      `Accepted fill option ${optionId} for ${hole.holeId} does not reference a Unit.`,
    );
  }

  return option.unitRef.unitId;
}

function requireAcceptedChoiceOption(
  hole: CreationHole,
  optionId: CreationChoiceOptionId,
): CreationChoiceOption {
  if (!("options" in hole)) {
    throw new Error(`Accepted fill referenced non-choice hole ${hole.holeId}.`);
  }

  const option = hole.options.find(
    (candidate) => candidate.optionId === optionId,
  );
  if (option == null) {
    throw new Error(
      `Accepted fill referenced invalid choice ${optionId} for ${hole.holeId}.`,
    );
  }

  return option;
}

function unsupportedHoleSelectionOptionId(
  hole: CreationHole,
  optionIds: readonly CreationChoiceOptionId[],
): CreationChoiceOptionId | undefined {
  const supportedOptionIds = supportedHoleOptionIds(hole);
  if (supportedOptionIds == null) {
    return undefined;
  }

  return optionIds.find((optionId) => !supportedOptionIds.includes(optionId));
}

function supportedHoleOptionIds(
  hole: CreationHole,
): readonly CreationChoiceOptionId[] | undefined {
  if (hole.source.tag === "draft") {
    return supportedDraftOptionIds(hole.source.path);
  }

  return supportedUnitOptionIds(hole.source.choiceKey);
}

function supportedDraftOptionIds(
  path: CharacterDraftPath,
): readonly CreationChoiceOptionId[] | undefined {
  if (path === "draft.primaryClass") {
    return SUPPORTED_CLASS_OPTION_IDS;
  }

  if (path === "draft.background") {
    return SUPPORTED_BACKGROUND_OPTION_IDS;
  }

  if (path === "draft.species") {
    return SUPPORTED_SPECIES_OPTION_IDS;
  }

  if (path === "draft.languages") {
    return SUPPORTED_LANGUAGE_OPTION_IDS;
  }

  if (path === "draft.alignment") {
    return [PHASE1_ALIGNMENT_OPTION_ID];
  }

  return undefined;
}

function supportedUnitOptionIds(
  choiceKey: UnitChoiceKey,
): readonly CreationChoiceOptionId[] {
  if (choiceKey === FIGHTER_SKILL_CHOICE_KEY) {
    return SUPPORTED_FIGHTER_SKILL_OPTION_IDS;
  }

  if (choiceKey === FIGHTER_FIGHTING_STYLE_CHOICE_KEY) {
    return SUPPORTED_FIGHTING_STYLE_OPTION_IDS;
  }

  if (choiceKey === FIGHTER_WEAPON_MASTERY_CHOICE_KEY) {
    return SUPPORTED_WEAPON_MASTERY_OPTION_IDS;
  }

  if (choiceKey === BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY) {
    return [PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID];
  }

  if (choiceKey === BACKGROUND_TOOL_CHOICE_KEY) {
    return [creationChoiceOptionId("tool_dice_set")];
  }

  if (choiceKey === CLASS_EQUIPMENT_CHOICE_KEY) {
    return [PHASE1_CLASS_EQUIPMENT_OPTION_ID];
  }

  if (choiceKey === BACKGROUND_EQUIPMENT_CHOICE_KEY) {
    return [PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID];
  }

  if (choiceKey === EQUIPMENT_PURCHASE_CHOICE_KEY) {
    return SUPPORTED_PURCHASE_OPTION_IDS;
  }

  if (choiceKey === LOADOUT_ARMOR_CHOICE_KEY) {
    return [creationChoiceOptionId("worn")];
  }

  if (choiceKey === LOADOUT_SHIELD_CHOICE_KEY) {
    return [creationChoiceOptionId("wielded")];
  }

  if (choiceKey === LOADOUT_WEAPON_CHOICE_KEY) {
    return [creationChoiceOptionId("wielded_one_handed")];
  }

  return [];
}

function requireAlignmentSelection(
  optionId: CreationChoiceOptionId,
): CharacterAlignment {
  const alignment = ALIGNMENT_OPTIONS.find(
    ([order, morality]) => `${order}_${morality}` === optionId,
  );
  if (alignment == null) {
    throw new Error(`Accepted fill referenced invalid alignment ${optionId}`);
  }

  const [order, morality] = alignment;
  return { order, morality };
}

function requireStartingLanguages(
  optionIds: readonly CreationChoiceOptionId[],
): CharacterStartingLanguages {
  const first = optionIds[0];
  const second = optionIds[1];
  if (
    optionIds.length !== 2 ||
    !isSelectableStandardLanguage(first) ||
    !isSelectableStandardLanguage(second) ||
    first === second
  ) {
    throw new Error("Accepted fill referenced invalid starting languages.");
  }

  // TypeScript cannot infer this dependent tuple union from the local
  // selectable-and-distinct checks above; the values are plain strings at runtime.
  return ["Common", first, second] as CharacterStartingLanguages;
}

function requireBackgroundAbilityScoreIncreaseSelection(
  optionId: CreationChoiceOptionId,
): BackgroundAbilityScoreIncreaseSelection {
  if (optionId === "one_each") {
    return { kind: "oneEach" };
  }

  const parts = optionId.split(":");
  const plusTwo = parts[1];
  const plusOne = parts[2];
  if (
    parts[0] !== "two_and_one" ||
    !isAbility(plusTwo) ||
    !isAbility(plusOne) ||
    plusTwo === plusOne
  ) {
    throw new Error(
      `Accepted fill referenced invalid background ability score increase ${optionId}`,
    );
  }

  // TypeScript cannot infer this mapped union branch from the local
  // plusTwo/plusOne distinctness check above.
  return {
    kind: "twoAndOne",
    plusTwo,
    plusOne,
  } as BackgroundAbilityScoreIncreaseSelection;
}

function isAbility(value: string | undefined): value is Ability {
  return (
    value != null && SURFACE_ABILITIES.some((ability) => ability === value)
  );
}

function isSelectableStandardLanguage(
  value: CreationChoiceOptionId | undefined,
): value is CreationChoiceOptionId & SelectableStandardLanguage {
  return (
    value != null &&
    value !== "Common" &&
    STANDARD_LANGUAGES.some((language) => language === value)
  );
}

function wrongFillKindIssue(
  fill: CreationFill,
  fillIndex: number,
  hole: CreationHole,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "wrongFillKind",
    message: `Fill kind ${fill.kind} does not match character creation hole ${hole.holeId} of kind ${hole.kind}.`,
  };
}

function invalidChoiceIssue(
  fill: CreationFill,
  fillIndex: number,
  optionId: CreationChoiceOptionId,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "invalidChoice",
    message: `Invalid choice ${optionId} for character creation hole: ${fill.holeId}`,
  };
}

function invalidAbilityScoresIssue(
  fill: Extract<CreationFill, { readonly kind: "abilityScores" }>,
  fillIndex: number,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "invalidChoice",
    message:
      "Invalid Standard Array assignment; expected the scores 15, 14, 13, 12, 10, and 8 exactly once.",
  };
}

function tooFewChoicesIssue(
  fill: CreationFill,
  fillIndex: number,
  hole: Extract<CreationHole, { readonly kind: "multiChoice" }>,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "tooFewChoices",
    message: `Too few choices for character creation hole ${fill.holeId}; expected at least ${hole.min}.`,
  };
}

function tooManyChoicesIssue(
  fill: CreationFill,
  fillIndex: number,
  hole: Extract<CreationHole, { readonly kind: "multiChoice" }>,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "tooManyChoices",
    message: `Too many choices for character creation hole ${fill.holeId}; expected at most ${hole.max}.`,
  };
}

function unsupportedChoiceIssue(
  fill: CreationFill,
  fillIndex: number,
  optionId: CreationChoiceOptionId,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "unsupportedChoice",
    message: `Unsupported choice ${optionId} for character creation hole: ${fill.holeId}`,
  };
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
        options: backgroundToolProficiencyOptions(facts.value.toolProficiency),
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

function backgroundToolProficiencyOptions(
  proficiency: BackgroundToolProficiency,
): readonly CreationChoiceOption[] {
  return Match.value(proficiency).pipe(
    Match.when({ kind: "specific_tool" }, (specificTool) => [
      {
        optionId: creationChoiceOptionId(specificTool.toolId),
        label: specificTool.toolId,
        unitRef: { unitId: specificTool.toolId },
      },
    ]),
    Match.when({ kind: "tool_category_choice", category: "gaming_set" }, () => [
      {
        optionId: creationChoiceOptionId("tool_dice_set"),
        label: "Dice Set",
      },
    ]),
    Match.when(
      { kind: "tool_category_choice", category: "artisan_tool" },
      () => [],
    ),
    Match.exhaustive,
  );
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
      sameOptionIdMultiset(selection.optionIds, optionIds),
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

function sameChoiceSelectionMultiset(
  left: readonly CharacterChoiceSelection[],
  right: readonly CharacterChoiceSelection[],
): boolean {
  const rightKeys = right.map(choiceSelectionKey);
  const leftKeys = left.map(choiceSelectionKey);
  return sameOptionIdMultiset(leftKeys, rightKeys);
}

function choiceSelectionKey(selection: CharacterChoiceSelection): string {
  const source =
    selection.source.tag === "draft"
      ? `draft:${selection.source.path}`
      : `unit:${selection.source.unitId}:${selection.source.choiceKey}`;
  const optionIds = [...selection.optionIds].sort().join("\u0000");
  return `${source}\u0001${optionIds}`;
}

function sameOptionIdMultiset(
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

function backgroundAbilityScoreIncreaseOptionId(
  selection: BackgroundAbilityScoreIncreaseSelection,
): CreationChoiceOptionId {
  if (selection.kind === "oneEach") {
    return creationChoiceOptionId("one_each");
  }

  return creationChoiceOptionId(
    `two_and_one:${selection.plusTwo}:${selection.plusOne}`,
  );
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
