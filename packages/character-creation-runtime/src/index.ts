import { Brand, Match } from "effect";
import {
  ALIGNMENT_CHOICES,
  ALIGNMENT_MORALITIES,
  ALIGNMENT_ORDERS,
  STANDARD_LANGUAGES,
  alignmentFromOptionId,
  alignmentLabel,
  alignmentOptionId,
  parseAlignmentOptionId,
  type Alignment as CharacterAlignment,
  type AlignmentMorality,
  type AlignmentOrder,
  type CharacterStartingLanguages,
  type SelectableStandardLanguage,
  type StandardLanguage,
} from "@dnd/shared/game-facts";
import {
  SUPPORTED_ABILITY_SCORE_METHODS,
  isValidAbilityScoreAssignment,
  type AbilityScoreAssignment,
  type SupportedAbilityScoreMethod,
} from "@dnd/shared-algebras/ability-score-algebra";
import {
  Index,
  NonNegativeInteger,
  PositiveInteger,
  hp,
  type HP,
  type Index as IndexType,
  type NonNegativeInteger as NonNegativeIntegerType,
  type PositiveInteger as PositiveIntegerType,
} from "@dnd/shared/types";
import {
  readBackgroundCreationFacts,
  readClassCreationFacts,
  readSpeciesCreationFacts,
  type UnitReaderResult,
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
  StartingEquipmentChoice,
  UnitRecord,
  WeaponRecord,
  WeaponProficiencyCategory,
} from "@dnd/surface/surface/types";

export { SUPPORTED_ABILITY_SCORE_METHODS };
export type { AbilityScoreAssignment, SupportedAbilityScoreMethod };

export type UnitLibrary = UnitCatalog;

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
  STANDARD_LANGUAGES,
  type AlignmentMorality,
  type AlignmentOrder,
  type CharacterAlignment,
  type CharacterStartingLanguages,
  type SelectableStandardLanguage,
  type StandardLanguage,
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

export type ChoiceCount = number & Brand.Brand<"ChoiceCount">;
const ChoiceCount = Brand.nominal<ChoiceCount>();

export type DraftRevision = NonNegativeIntegerType &
  Brand.Brand<"DraftRevision">;
const DraftRevision = Brand.all(
  NonNegativeInteger,
  Brand.nominal<DraftRevision>(),
);
export const draftRevision: (value: number) => DraftRevision = DraftRevision;

export type FillIndex = IndexType & Brand.Brand<"FillIndex">;
const FillIndex = Brand.all(Index, Brand.nominal<FillIndex>());
const creationFillIndex: (value: number) => FillIndex = FillIndex;

export type HitDieSize = PositiveIntegerType & Brand.Brand<"HitDieSize">;
const HitDieSize = Brand.all(PositiveInteger, Brand.nominal<HitDieSize>());
const hitDieSize: (value: number) => HitDieSize = HitDieSize;

export type HitDieTotal = PositiveIntegerType & Brand.Brand<"HitDieTotal">;
const HitDieTotal = Brand.all(PositiveInteger, Brand.nominal<HitDieTotal>());
const hitDieTotal: (value: number) => HitDieTotal = HitDieTotal;

export type ChoiceCardinality = {
  readonly tag: "exactly";
  readonly count: ChoiceCount;
};

export function exactChoiceCardinality(count: number): ChoiceCardinality {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Choice cardinality must be a positive integer: ${count}`);
  }

  return { tag: "exactly", count: ChoiceCount(count) };
}

export type CreationHoleSource =
  | { readonly tag: "draft"; readonly path: CharacterDraftPath }
  | {
      readonly tag: "unit";
      readonly unitId: UnitRecord["id"];
      readonly choiceKey: UnitChoiceKey;
    };
export type UnitChoiceSource = Extract<
  CreationHoleSource,
  { readonly tag: "unit" }
>;

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

export type AbilityScoreGenerationSelection = {
  readonly method: SupportedAbilityScoreMethod;
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

function characterClassLevel(value: number): CharacterClassLevel {
  if (!CHARACTER_CLASS_LEVELS.some((level) => level === value)) {
    throw new Error(`Character class level must be from 1 through 20: ${value}`);
  }

  return value as CharacterClassLevel;
}

export type CharacterAdvancementSelection = {
  readonly entries: NonEmptyReadonlyArray<CharacterAdvancementEntry>;
};

export type CharacterAdvancementEntry = {
  readonly classUnitId: UnitRecord["id"];
  readonly level: CharacterClassLevel;
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
  // Optimistic concurrency token for fill batches against this draft identity.
  readonly revision: DraftRevision;
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

export type CharacterSelectedChoiceOption = {
  readonly optionId: CreationChoiceOptionId;
  readonly unitRef?: UnitRef;
};

export type CharacterChoiceSelection = {
  readonly source: UnitChoiceSource;
  readonly options: readonly CharacterSelectedChoiceOption[];
};

export type CreationHole =
  | {
      readonly kind: "choice";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
      readonly cardinality: ChoiceCardinality;
      readonly options: readonly CreationChoiceOption[];
    }
  | {
      readonly kind: "abilityScores";
      readonly holeId: CreationHoleId;
      readonly source: CreationHoleSource;
      readonly methods: readonly SupportedAbilityScoreMethod[];
    };

type ChoiceCreationHole = Extract<CreationHole, { readonly kind: "choice" }>;

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
      readonly value: AbilityScoreAssignment;
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
] as const;
export type CreationFinalizationIssueCode =
  (typeof CREATION_FINALIZATION_ISSUE_CODES)[number];

export type CreationFinalizationIssue = {
  readonly tag: "illegalFinalization";
  readonly code: CreationFinalizationIssueCode;
  readonly message: string;
};

export type CreationBatchFillIssue = CreationFillIssue | CreationBatchIssue;
export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

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
type FinalizedCharacterSelections = {
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

export type CharacterBuildAbilityScores = AbilityScoreAssignment;

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
  readonly weapon: readonly WeaponProficiencyCategory[];
  readonly tools: readonly CreationChoiceOptionId[];
};

export type CharacterBuildFeature =
  | {
      readonly kind: "classFeature";
      readonly unitId: UnitRecord["id"];
      readonly level: CharacterClassLevel;
    }
  | {
      readonly kind: "backgroundOriginFeat";
      readonly unitId: UnitRecord["id"];
    }
  | {
      readonly kind: "speciesTrait";
      readonly unitId: UnitRecord["id"];
    }
  | {
      readonly kind: "classChoice";
      readonly unitId: UnitRecord["id"];
      readonly choiceKey: UnitChoiceKey;
    };

export type CharacterBuildResource = {
  readonly unitId: UnitRecord["id"];
  readonly resource: ActivationResource;
};

export type CharacterBuildLoadout = {
  readonly armor?: UnitRecord["id"];
  readonly shield?: UnitRecord["id"];
  readonly weapon?: {
    readonly unitId: UnitRecord["id"];
    readonly grip: "one_handed";
  };
};

// Phase 1 only records the supported default build loadout. The future in-play
// CharacterSheet owns mutable equipment state if active equipment can change
// during adventuring.
export type CharacterBuildEquipment = CharacterBuildLoadout;

// CharacterBuild is the creation output: durable build and identity facts.
// In-play CharacterSheet state such as current HP, Temporary Hit Points, and
// Hit Dice remaining belongs to the adventuring/rest boundary, not this package.
export type CharacterBuild = {
  readonly advancement: CharacterAdvancementSelection;
  readonly background: UnitRecord["id"];
  readonly species: UnitRecord["id"];
  readonly originLanguages: CharacterStartingLanguages;
  readonly alignment: CharacterAlignment;
  readonly abilityScores: CharacterBuildAbilityScores;
  readonly hitPoints: CharacterBuildHitPoints;
  readonly proficiencies: CharacterBuildProficiencies;
  readonly armorTraining: readonly ArmorTrainingCategory[];
  readonly features: readonly CharacterBuildFeature[];
  readonly resources: readonly CharacterBuildResource[];
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

const INITIAL_CHARACTER_DRAFT_PATHS = [
  "draft.primaryClass",
  "draft.background",
  "draft.species",
  "draft.abilityScoreGeneration",
  "draft.languages",
  "draft.alignment",
] as const satisfies ReadonlyArray<CharacterDraftPath>;

// Phase 1 is the first supported character-creation vertical from
// plans/phase1-fighter-manifest.md: an Orc Soldier Fighter using Standard
// Array, fixed first-slice languages/alignment, level-1 Fighter choices, Chain
// Mail + Shield + one-handed Longsword, and the Goblin Warrior battle setup.
// Hole discovery may expose broader legal SRD options, but finalization is
// intentionally gated to this manifest until the runtime and parity coverage
// widen.
const PHASE1_CLASS_FIGHTER_UNIT_ID = "class_fighter";
const PHASE1_BACKGROUND_SOLDIER_UNIT_ID = "background_soldier";
const PHASE1_SPECIES_ORC_UNIT_ID = "species_orc";
const PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID = "armor_chain_mail";
const PHASE1_WEAPON_LONGSWORD_UNIT_ID = "weapon_longsword";
const PHASE1_WEAPON_SPEAR_UNIT_ID = "weapon_spear";
const PHASE1_WEAPON_FLAIL_UNIT_ID = "weapon_flail";
const PHASE1_SHIELD_UNIT_ID = "equipment_shield";
const PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID = "defense";

const SUPPORTED_CLASS_UNIT_IDS = [
  PHASE1_CLASS_FIGHTER_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const SUPPORTED_BACKGROUND_UNIT_IDS = [
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
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
const PHASE1_WEAPON_MASTERY_UNIT_IDS = [
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_WEAPON_SPEAR_UNIT_ID,
  PHASE1_WEAPON_FLAIL_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const SUPPORTED_WEAPON_MASTERY_OPTION_IDS = [
  ...PHASE1_WEAPON_MASTERY_UNIT_IDS.map(creationChoiceOptionId),
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
const PHASE1_BACKGROUND_TOOL_OPTION_ID = creationChoiceOptionId(
  "tool_dice_set",
);
const PHASE1_LOADOUT_ARMOR_OPTION_ID = creationChoiceOptionId("worn");
const PHASE1_LOADOUT_SHIELD_OPTION_ID = creationChoiceOptionId("wielded");
const PHASE1_LOADOUT_WEAPON_OPTION_ID = creationChoiceOptionId(
  "wielded_one_handed",
);
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
const EXACTLY_ONE_CHOICE = exactChoiceCardinality(1);

const SURFACE_ABILITIES = [
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
] as const satisfies ReadonlyArray<Ability>;

let nextDraftOrdinal = 0;

export function createCharacterDraft(input: {
  readonly unitLibrary?: UnitLibrary;
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
  const rejectedIssues = nonEmptyReadonlyArray(issues);

  if (rejectedIssues != null) {
    return {
      tag: "rejected",
      draft: input.draft,
      holes,
      issues: rejectedIssues,
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
  const openHoles = nonEmptyReadonlyArray(holes);
  if (openHoles != null) {
    return {
      tag: "incomplete",
      holes: openHoles,
    };
  }

  const selections = finalizedSelections(input.draft);
  if (selections == null) {
    return {
      tag: "invalid",
      issues: [illegalFinalizationIssue("Draft is incomplete.")],
    };
  }

  const invalidIssues = nonEmptyReadonlyArray(
    finalizedSelectionIssues(selections, input.unitLibrary),
  );
  if (invalidIssues != null) {
    return {
      tag: "invalid",
      issues: invalidIssues,
    };
  }

  return {
    tag: "ready",
    build: buildCharacterBuild({
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
      "Finalized build must use the supported Fighter class.",
    ),
    ...expectedValueIssue(
      selections.background === PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
      "Finalized build must use the supported Soldier background.",
    ),
    ...expectedValueIssue(
      selections.species === PHASE1_SPECIES_ORC_UNIT_ID,
      "Finalized build must use the supported Orc species.",
    ),
    ...expectedValueIssue(
      isInitialFighterAdvancement(selections.advancement),
      "Finalized build advancement must be exactly one Fighter level.",
    ),
    ...expectedValueIssue(
      isValidAbilityScoreAssignment(
        selections.abilityScoreGeneration.method,
        selections.abilityScoreGeneration.assignedScores,
      ),
      "Finalized build must use a supported ability-score generation method.",
    ),
    ...expectedValueIssue(
      isPhaseOneManifestBackgroundAbilityScoreIncrease(
        selections.backgroundAbilityScoreIncrease,
        unitLibrary,
        selections.background,
        selections.abilityScoreGeneration.assignedScores,
      ),
      "Finalized build must use the phase-1 Soldier ability-score increase.",
    ),
    ...expectedValueIssue(
      sameOptionIdMultiset(selections.languages, [
        "Common",
        "Dwarvish",
        "Goblin",
      ]),
      "Finalized build must use Common, Dwarvish, and Goblin.",
    ),
    ...expectedValueIssue(
      selections.alignment.order === "lawful" &&
        selections.alignment.morality === "good",
      "Finalized build must use Lawful Good alignment for the phase-1 manifest.",
    ),
    ...expectedValueIssue(
      sameChoiceSelectionMultiset(
        selections.choices,
        phaseOneManifestChoiceSelections(),
      ),
      "Finalized build must carry exactly the phase-1 manifest choices.",
    ),
    ...expectedValueIssue(
      sameOptionIdMultiset(selections.equipment.selectedUnitIds, [
        PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
        PHASE1_WEAPON_LONGSWORD_UNIT_ID,
        PHASE1_SHIELD_UNIT_ID,
      ]),
      "Finalized build must own exactly the phase-1 purchased equipment.",
    ),
  ];
}

function phaseOneManifestChoiceSelections(): readonly CharacterChoiceSelection[] {
  return [
    choiceSelection(PHASE1_CLASS_FIGHTER_UNIT_ID, FIGHTER_SKILL_CHOICE_KEY, [
      ...SUPPORTED_FIGHTER_SKILL_OPTION_IDS,
    ]),
    unitChoiceSelection(
      FIGHTER_FIGHTING_STYLE_FEATURE_ID,
      FIGHTER_FIGHTING_STYLE_CHOICE_KEY,
      [...SUPPORTED_FIGHTING_STYLE_FEAT_IDS],
    ),
    unitChoiceSelection(
      FIGHTER_WEAPON_MASTERY_FEATURE_ID,
      FIGHTER_WEAPON_MASTERY_CHOICE_KEY,
      PHASE1_WEAPON_MASTERY_UNIT_IDS,
    ),
    choiceSelection(
      PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
      BACKGROUND_TOOL_CHOICE_KEY,
      [PHASE1_BACKGROUND_TOOL_OPTION_ID],
    ),
    choiceSelection(PHASE1_CLASS_FIGHTER_UNIT_ID, CLASS_EQUIPMENT_CHOICE_KEY, [
      PHASE1_CLASS_EQUIPMENT_OPTION_ID,
    ]),
    choiceSelection(
      PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
      BACKGROUND_EQUIPMENT_CHOICE_KEY,
      [PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID],
    ),
    choiceSelectionWithOptions(
      PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
      LOADOUT_ARMOR_CHOICE_KEY,
      [
        selectedChoiceOptionRecord(
          PHASE1_LOADOUT_ARMOR_OPTION_ID,
          PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
        ),
      ],
    ),
    choiceSelectionWithOptions(
      PHASE1_SHIELD_UNIT_ID,
      LOADOUT_SHIELD_CHOICE_KEY,
      [
        selectedChoiceOptionRecord(
          PHASE1_LOADOUT_SHIELD_OPTION_ID,
          PHASE1_SHIELD_UNIT_ID,
        ),
      ],
    ),
    choiceSelectionWithOptions(
      PHASE1_WEAPON_LONGSWORD_UNIT_ID,
      LOADOUT_WEAPON_CHOICE_KEY,
      [
        selectedChoiceOptionRecord(
          PHASE1_LOADOUT_WEAPON_OPTION_ID,
          PHASE1_WEAPON_LONGSWORD_UNIT_ID,
        ),
      ],
    ),
  ];
}

function choiceSelection(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
  optionIds: readonly CreationChoiceOptionId[],
): CharacterChoiceSelection {
  return choiceSelectionWithOptions(
    unitId,
    choiceKey,
    optionIds.map((optionId) => ({ optionId })),
  );
}

function unitChoiceSelection(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
  selectedUnitIds: readonly UnitRecord["id"][],
): CharacterChoiceSelection {
  return choiceSelectionWithOptions(
    unitId,
    choiceKey,
    selectedUnitIds.map((selectedUnitId) =>
      selectedChoiceOptionRecord(
        creationChoiceOptionId(selectedUnitId),
        selectedUnitId,
      ),
    ),
  );
}

function choiceSelectionWithOptions(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
  options: readonly CharacterSelectedChoiceOption[],
): CharacterChoiceSelection {
  return {
    source: unitSource(unitId, choiceKey),
    options,
  };
}

function selectedChoiceOptionRecord(
  optionId: CreationChoiceOptionId,
  unitId: UnitRecord["id"],
): CharacterSelectedChoiceOption {
  return { optionId, unitRef: { unitId } };
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

function buildCharacterBuild(input: {
  readonly selections: FinalizedCharacterSelections;
  readonly unitLibrary: UnitLibrary;
}): CharacterBuild {
  const { selections } = input;
  const classFacts = requireReadable(
    readClassCreationFacts(
      input.unitLibrary.requireUnit(selections.primaryClass),
    ),
    "class",
  );
  const backgroundFacts = requireReadable(
    readBackgroundCreationFacts(
      input.unitLibrary.requireUnit(selections.background),
    ),
    "background",
  );
  const speciesFacts = requireReadable(
    readSpeciesCreationFacts(input.unitLibrary.requireUnit(selections.species)),
    "species",
  );
  const baseScores = selections.abilityScoreGeneration.assignedScores;
  const finalScores = applyBackgroundAbilityScoreIncrease(
    baseScores,
    selections.backgroundAbilityScoreIncrease,
    backgroundFacts.abilityScoreIncrease.abilities,
  );
  const classFeatureGrants = classFacts.featureGrants.filter(
    (grant) => grant.level === 1,
  );
  const classFeatureUnitIds = classFeatureGrants.map((grant) => grant.unitId);
  const buildFeatures: readonly CharacterBuildFeature[] = [
    ...classFeatureGrants.map((grant) => ({
      kind: "classFeature" as const,
      unitId: grant.unitId,
      level: characterClassLevel(grant.level),
    })),
    {
      kind: "backgroundOriginFeat",
      unitId: backgroundFacts.originFeatId,
    },
    ...Object.values(speciesFacts.traits).map((unitId) => ({
      kind: "speciesTrait" as const,
      unitId,
    })),
    {
      kind: "classChoice",
      unitId: PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID,
      choiceKey: FIGHTER_FIGHTING_STYLE_CHOICE_KEY,
    },
  ];
  const buildEquipment: CharacterBuildEquipment = {
    armor: PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
    shield: PHASE1_SHIELD_UNIT_ID,
    weapon: {
      unitId: PHASE1_WEAPON_LONGSWORD_UNIT_ID,
      grip: "one_handed",
    },
  };

  return {
    advancement: selections.advancement,
    background: selections.background,
    species: selections.species,
    originLanguages: selections.languages,
    alignment: selections.alignment,
    abilityScores: finalScores,
    hitPoints: {
      maximum: hp(classFacts.hitPointDie + abilityModifier(finalScores.con)),
      hitDice: [
        {
          classUnitId: selections.primaryClass,
          dieSize: hitDieSize(classFacts.hitPointDie),
          total: hitDieTotal(1),
        },
      ],
    },
    proficiencies: {
      savingThrows: classFacts.savingThrowProficiencies,
      skills: uniqueValues([
        ...finalizedBuildSkillProficiencies(selections),
        ...backgroundFacts.skillProficiencies,
      ]),
      weapon: classFacts.weaponProficiencies,
      tools: finalizedBuildToolProficiencies(selections),
    },
    armorTraining: classFacts.armorTraining,
    features: buildFeatures,
    resources: classFeatureUnitIds.flatMap((unitId) =>
      resourceForFeature(input.unitLibrary.requireUnit(unitId)),
    ),
    equipment: buildEquipment,
  };
}

export function characterBuildUnitRefs(
  build: Pick<
    CharacterBuild,
    "advancement" | "background" | "species" | "features" | "equipment"
  >,
): readonly UnitRef[] {
  return unitRefs(
    ...build.advancement.entries.map((entry) => entry.classUnitId),
    build.background,
    build.species,
    ...build.features.map((feature) => feature.unitId),
    ...optionalUnitId(build.equipment.armor),
    ...optionalUnitId(build.equipment.shield),
    ...optionalUnitId(build.equipment.weapon?.unitId),
  );
}

function optionalUnitId(
  unitId: UnitRecord["id"] | undefined,
): readonly UnitRecord["id"][] {
  return unitId == null ? [] : [unitId];
}

function requireReadable<T>(
  result: UnitReaderResult<T>,
  label: string,
): T {
  if (result.tag === "unreadable") {
    const issueText = result.issues
      .map((issue) => issue.message)
      .join("; ");
    throw new Error(
      `Cannot finalize unreadable ${label} Unit: ${issueText}`,
    );
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

function finalizedBuildSkillProficiencies(
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
    : choiceSelectionOptionIds(skillSelection).flatMap((optionId) => {
        const skill = SKILLS.find((candidate) => candidate === optionId);
        return skill == null ? [] : [skill];
      });
}

function finalizedBuildToolProficiencies(
  selections: FinalizedCharacterSelections,
): readonly CreationChoiceOptionId[] {
  const toolSelection = selections.choices.find((selection) =>
    sameCreationHoleSource(
      selection.source,
      unitSource(PHASE1_BACKGROUND_SOLDIER_UNIT_ID, BACKGROUND_TOOL_CHOICE_KEY),
    ),
  );

  return toolSelection == null ? [] : choiceSelectionOptionIds(toolSelection);
}

function resourceForFeature(
  unit: UnitRecord,
): readonly CharacterBuildResource[] {
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

function nonEmptyReadonlyArray<T>(
  values: readonly T[],
): NonEmptyReadonlyArray<T> | undefined {
  const first = values[0];
  return first == null ? undefined : [first, ...values.slice(1)];
}

function creationFillIssues(
  input: CreationBatchFillInput,
  holes: readonly CreationHole[],
): readonly CreationBatchFillIssue[] {
  const batchIssues =
    input.expectedRevision === input.draft.revision
      ? []
      : [staleRevisionIssue(input)];

  return [
    ...batchIssues,
    ...input.fills.flatMap((fill, fillIndexValue) => {
      const fillIndex = creationFillIndex(fillIndexValue);
      const matchingHole = holes.find((hole) => hole.holeId === fill.holeId);
      const isDuplicate = input.fills
        .slice(0, fillIndexValue)
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
  fillIndex: FillIndex,
  hole: CreationHole,
): readonly CreationFillIssue[] {
  if (!fillKindMatchesHole(fill, hole)) {
    return [wrongFillKindIssue(fill, fillIndex, hole)];
  }

  if (hole.kind === "choice" && fill.kind === "choice") {
    return choiceFillIssues(fill, fillIndex, hole);
  }

  if (hole.kind === "abilityScores" && fill.kind === "abilityScores") {
    return abilityScoreFillIssues(fill, fillIndex, hole);
  }

  return [];
}

function fillKindMatchesHole(fill: CreationFill, hole: CreationHole): boolean {
  return (
    (hole.kind === "choice" && fill.kind === "choice") ||
    (hole.kind === "abilityScores" && fill.kind === "abilityScores")
  );
}

function choiceFillIssues(
  fill: ChoiceFill,
  fillIndex: FillIndex,
  hole: Extract<CreationHole, { readonly kind: "choice" }>,
): readonly CreationFillIssue[] {
  const optionIds = fill.optionIds;
  const requiredCount = hole.cardinality.count;
  const cardinalityIssues = [
    ...(optionIds.length < requiredCount
      ? [tooFewChoicesIssue(fill, fillIndex, requiredCount)]
      : []),
    ...(optionIds.length > requiredCount
      ? [tooManyChoicesIssue(fill, fillIndex, requiredCount)]
      : []),
  ];
  const invalidOptionIds = optionIds.filter(
    (optionId, optionIndex) =>
      optionIds.indexOf(optionId) !== optionIndex ||
      !hole.options.some((option) => option.optionId === optionId),
  );

  if (invalidOptionIds.length > 0) {
    return [
      ...cardinalityIssues,
      ...invalidOptionIds.map((optionId) =>
        invalidChoiceIssue(fill, fillIndex, optionId),
      ),
    ];
  }

  const unsupportedOptionId = unsupportedHoleSelectionOptionId(hole, optionIds);
  return unsupportedOptionId == null
    ? cardinalityIssues
    : [
        ...cardinalityIssues,
        unsupportedChoiceIssue(fill, fillIndex, unsupportedOptionId),
      ];
}

type ChoiceFill = Extract<CreationFill, { readonly kind: "choice" }>;

function abilityScoreFillIssues(
  fill: Extract<CreationFill, { readonly kind: "abilityScores" }>,
  fillIndex: FillIndex,
  hole: Extract<CreationHole, { readonly kind: "abilityScores" }>,
): readonly CreationFillIssue[] {
  return hole.methods.includes(fill.method) &&
    isValidAbilityScoreAssignment(fill.method, fill.value)
    ? []
    : [invalidAbilityScoresIssue(fill, fillIndex)];
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
    revision: draftRevision(draft.revision + 1),
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
    const classUnitId = requireSelectedUnitId(hole, requireOneOptionId(fill));
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
      background: requireSelectedUnitId(hole, requireOneOptionId(fill)),
    };
  }

  if (path === "draft.species" && fill.kind === "choice") {
    return {
      ...selections,
      species: requireSelectedUnitId(hole, requireOneOptionId(fill)),
    };
  }

  if (
    path === "draft.abilityScoreGeneration" &&
    fill.kind === "abilityScores"
  ) {
    return {
      ...selections,
      abilityScoreGeneration: {
        method: fill.method,
        assignedScores: fill.value,
      },
    };
  }

  if (path === "draft.languages" && fill.kind === "choice") {
    return {
      ...selections,
      languages: requireStartingLanguages(fill.optionIds),
    };
  }

  if (path === "draft.alignment" && fill.kind === "choice") {
    return {
      ...selections,
      alignment: requireAlignmentSelection(requireOneOptionId(fill)),
    };
  }

  throw new Error(
    `Accepted fill ${fill.holeId} cannot be applied to draft path ${path}.`,
  );
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
        requireBackgroundAbilityScoreIncreaseSelection(
          requireOneOptionId(fill),
        ),
    };
  }

  if (
    source.choiceKey === EQUIPMENT_PURCHASE_CHOICE_KEY &&
    fill.kind === "choice"
  ) {
    return {
      ...selections,
      equipment: {
        selectedUnitIds: requireSelectedUnitIds(
          hole,
          fill.optionIds,
        ),
      },
    };
  }

  if (fill.kind !== "choice") {
    throw new Error(
      `Accepted fill ${fill.holeId} cannot be applied to unit choice ${source.choiceKey}.`,
    );
  }

  if (fill.optionIds.length === 0) {
    throw new Error(
      `Accepted unit choice fill ${fill.holeId} must carry at least one option.`,
    );
  }

  return {
    ...selections,
    choices: [
      ...selections.choices,
      {
        source,
        options: fill.optionIds.map((optionId) =>
          selectedChoiceOption(requireAcceptedChoiceOption(hole, optionId)),
        ),
      },
    ],
  };
}

function selectedChoiceOption(
  option: CreationChoiceOption,
): CharacterSelectedChoiceOption {
  return option.unitRef == null
    ? { optionId: option.optionId }
    : { optionId: option.optionId, unitRef: option.unitRef };
}

function requireSelectedUnitIds(
  hole: CreationHole,
  optionIds: readonly CreationChoiceOptionId[],
): readonly UnitRecord["id"][] {
  return optionIds.map((optionId) => requireSelectedUnitId(hole, optionId));
}

function requireOneOptionId(fill: ChoiceFill): CreationChoiceOptionId {
  const optionIds = fill.optionIds;
  const optionId = optionIds[0];
  if (optionId == null || optionIds.length !== 1) {
    throw new Error(
      `Accepted choice fill ${fill.holeId} must carry exactly one option.`,
    );
  }

  return optionId;
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

  // Non-initial draft paths are not current support-gate choices. They may
  // still be filled by Unit-backed holes or typed fills elsewhere.
  return undefined;
}

// Current support-slice filter, not RAW legality. This is the character
// creation equivalent of battle-runtime's supportedAttackProfile: legal
// Surface/RAW choices may be discoverable, but finalization only accepts the
// subset this reducer can currently project and execute. This should shrink as
// character creation support widens beyond the Phase 1 manifest.
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
    return [PHASE1_BACKGROUND_TOOL_OPTION_ID];
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
    return [PHASE1_LOADOUT_ARMOR_OPTION_ID];
  }

  if (choiceKey === LOADOUT_SHIELD_CHOICE_KEY) {
    return [PHASE1_LOADOUT_SHIELD_OPTION_ID];
  }

  if (choiceKey === LOADOUT_WEAPON_CHOICE_KEY) {
    return [PHASE1_LOADOUT_WEAPON_OPTION_ID];
  }

  // Unknown Unit choice keys are legal Surface content outside this reducer's
  // current support slice. Treat them as having no supported options here
  // rather than as RAW-invalid choices.
  return [];
}

function requireAlignmentSelection(
  optionId: CreationChoiceOptionId,
): CharacterAlignment {
  const alignmentOption = parseAlignmentOptionId(optionId);
  if (alignmentOption == null) {
    throw new Error(`Accepted fill referenced invalid alignment ${optionId}`);
  }

  return alignmentFromOptionId(alignmentOption);
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

  // SRD 5.2.1 Character-Creation.md:52 and :106-108: origin chooses two
  // languages, and every character knows Common plus those two Standard
  // Languages. This is the origin language choice, not the character's total
  // languages forever; classes and other features may add more.
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
  fillIndex: FillIndex,
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
  fillIndex: FillIndex,
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
  fillIndex: FillIndex,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "invalidAbilityScores",
    message:
      "Invalid ability score assignment for the selected generation method.",
  };
}

function tooFewChoicesIssue(
  fill: CreationFill,
  fillIndex: FillIndex,
  expectedCount: ChoiceCount,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "tooFewChoices",
    message: `Too few choices for character creation hole ${fill.holeId}; expected at least ${expectedCount}.`,
  };
}

function tooManyChoicesIssue(
  fill: CreationFill,
  fillIndex: FillIndex,
  expectedCount: ChoiceCount,
): CreationFillIssue {
  return {
    tag: "illegalFill",
    holeId: fill.holeId,
    fillIndex,
    code: "tooManyChoices",
    message: `Too many choices for character creation hole ${fill.holeId}; expected at most ${expectedCount}.`,
  };
}

function unsupportedChoiceIssue(
  fill: CreationFill,
  fillIndex: FillIndex,
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
  fillIndex: FillIndex,
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
  fillIndex: FillIndex,
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

function backgroundToolChoiceHole(
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

function backgroundToolChoiceSpec(proficiency: BackgroundToolProficiency):
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
        options: [
          {
            optionId: PHASE1_BACKGROUND_TOOL_OPTION_ID,
            label: "Dice Set",
          },
        ],
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

function discoverEquipmentHoles(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): readonly CreationHole[] {
  const classUnitId = input.draft.selections.primaryClass;
  if (classUnitId == null || !hasPhaseOneCoinEquipmentPath(input)) {
    return [];
  }
  const purchaseHole = choiceHole({
    source: unitSource(classUnitId, EQUIPMENT_PURCHASE_CHOICE_KEY),
    cardinality: exactChoiceCardinality(SUPPORTED_PURCHASE_UNIT_IDS.length),
    options: SUPPORTED_PURCHASE_UNIT_IDS.map((unitId) =>
      unitOption(input.unitLibrary.requireUnit(unitId)),
    ),
  });
  const hasValidPurchaseSelection = hasValidEquipmentPurchaseSelectionForHole(
    input.draft,
    purchaseHole,
  );

  return [
    ...unselectedPurchaseHole(input.draft, purchaseHole),
    ...unselectedLoadoutHole(
      input.draft,
      choiceHole({
        source: unitSource(
          PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
          LOADOUT_ARMOR_CHOICE_KEY,
        ),
        cardinality: EXACTLY_ONE_CHOICE,
        options: [
          {
            optionId: PHASE1_LOADOUT_ARMOR_OPTION_ID,
            label: "Worn",
            unitRef: { unitId: PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID },
          },
        ],
      }),
      PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
      hasValidPurchaseSelection,
    ),
    ...unselectedLoadoutHole(
      input.draft,
      choiceHole({
        source: unitSource(PHASE1_SHIELD_UNIT_ID, LOADOUT_SHIELD_CHOICE_KEY),
        cardinality: EXACTLY_ONE_CHOICE,
        options: [
          {
            optionId: PHASE1_LOADOUT_SHIELD_OPTION_ID,
            label: "Wielded",
            unitRef: { unitId: PHASE1_SHIELD_UNIT_ID },
          },
        ],
      }),
      PHASE1_SHIELD_UNIT_ID,
      hasValidPurchaseSelection,
    ),
    ...unselectedLoadoutHole(
      input.draft,
      choiceHole({
        source: unitSource(
          PHASE1_WEAPON_LONGSWORD_UNIT_ID,
          LOADOUT_WEAPON_CHOICE_KEY,
        ),
        cardinality: EXACTLY_ONE_CHOICE,
        options: [
          {
            optionId: PHASE1_LOADOUT_WEAPON_OPTION_ID,
            label: "Wielded one-handed",
            unitRef: { unitId: PHASE1_WEAPON_LONGSWORD_UNIT_ID },
          },
        ],
      }),
      PHASE1_WEAPON_LONGSWORD_UNIT_ID,
      hasValidPurchaseSelection,
    ),
  ];
}

function startingEquipmentChoiceHole(
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

function hasPhaseOneCoinEquipmentPath(input: {
  readonly draft: CharacterDraft;
  readonly unitLibrary: UnitLibrary;
}): boolean {
  const draft = input.draft;
  const classUnitId = draft.selections.primaryClass;
  const backgroundUnitId = draft.selections.background;
  if (
    classUnitId == null ||
    backgroundUnitId == null ||
    !isSupported(classUnitId, SUPPORTED_CLASS_UNIT_IDS) ||
    !isSupported(backgroundUnitId, SUPPORTED_BACKGROUND_UNIT_IDS)
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

function unselectedUnitChoiceHole(
  draft: CharacterDraft,
  hole: CreationHole,
): readonly CreationHole[] {
  return hasValidSelectionForHole(draft, hole) ? [] : [hole];
}

function unselectedBackgroundAbilityScoreIncreaseHole(
  draft: CharacterDraft,
  hole: CreationHole,
): readonly CreationHole[] {
  return hasValidBackgroundAbilityScoreIncreaseSelectionForHole(draft, hole)
    ? []
    : [hole];
}

function unselectedPurchaseHole(
  draft: CharacterDraft,
  hole: CreationHole,
): readonly CreationHole[] {
  return hasValidEquipmentPurchaseSelectionForHole(draft, hole) ? [] : [hole];
}

function unselectedLoadoutHole(
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

function hasValidEquipmentPurchaseSelectionForHole(
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

function hasPurchasedUnit(
  draft: CharacterDraft,
  unitId: UnitRecord["id"],
): boolean {
  return draft.selections.equipment?.selectedUnitIds.includes(unitId) ?? false;
}

function hasValidSelectionForHole(
  draft: CharacterDraft,
  hole: CreationHole,
): boolean {
  return draft.selections.choices.some((selection) =>
    choiceSelectionMatchesHole(selection, hole),
  );
}

function choiceSelectionMatchesHole(
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

function hasValidBackgroundAbilityScoreIncreaseSelectionForHole(
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

function choiceOptionIdsFitHole(
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

function selectedChoiceOptionMatchesHole(
  selectedOption: CharacterSelectedChoiceOption,
  hole: ChoiceCreationHole,
): boolean {
  return hole.options.some(
    (option) =>
      choiceSelectionOptionKey(selectedOption) ===
      choiceSelectionOptionKey(selectedChoiceOption(option)),
  );
}

function hasDuplicateOptionIds(
  optionIds: readonly CreationChoiceOptionId[],
): boolean {
  return optionIds.some(
    (optionId, optionIndex) => optionIds.indexOf(optionId) !== optionIndex,
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
  const source = `unit:${selection.source.unitId}:${selection.source.choiceKey}`;
  const options = selection.options
    .map(choiceSelectionOptionKey)
    .sort()
    .join("\u0000");
  return `${source}\u0001${options}`;
}

function choiceSelectionOptionIds(
  selection: CharacterChoiceSelection,
): readonly CreationChoiceOptionId[] {
  return selection.options.map((option) => option.optionId);
}

function choiceSelectionOptionKey(
  option: CharacterSelectedChoiceOption,
): string {
  return option.unitRef == null
    ? option.optionId
    : `${option.optionId}\u0002${option.unitRef.unitId}`;
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
          unit.kind === "feat" && unit.category === "fighting_style",
      )
      .map(unitOption);

    return unselectedUnitChoiceHole(
      draft,
      choiceHole({
        source: unitSource(featureUnitId, FIGHTER_FIGHTING_STYLE_CHOICE_KEY),
        cardinality: EXACTLY_ONE_CHOICE,
        options,
      }),
    );
  }

  if (featureUnitId === FIGHTER_WEAPON_MASTERY_FEATURE_ID) {
    const feature = unitLibrary.requireUnit(featureUnitId);
    const mechanics =
      feature.kind === "class_feature" ? feature.mechanics : null;
    if (mechanics?.family !== "weapon_mastery_choice") {
      throw new Error(
        `Expected ${featureUnitId} to be a weapon mastery choice feature.`,
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
        source: unitSource(featureUnitId, FIGHTER_WEAPON_MASTERY_CHOICE_KEY),
        cardinality: exactChoiceCardinality(mechanics.choose),
        options,
      }),
    );
  }

  // Not every level-1 Fighter feature opens a choice hole in this support slice.
  return [];
}

function draftHole(
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

function choiceHole(input: {
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

function draftSource(path: CharacterDraftPath): CreationHoleSource {
  return { tag: "draft", path };
}

function unitSource(
  unitId: UnitRecord["id"],
  choiceKey: UnitChoiceKey,
): UnitChoiceSource {
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

function startingEquipmentLabel(choice: StartingEquipmentChoice): string {
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
