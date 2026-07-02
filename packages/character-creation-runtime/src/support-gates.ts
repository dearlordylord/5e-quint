// KERNEL-COVERAGE: runtime-owner CREATION.CHOICE_DISCOVERY_CARDINALITY
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.grappler-general-feat character-creation.origin-feat-proficiency-choice character-creation.species-trait-proficiency-choice character-creation.species-origin-feat-choice character-creation.species-origin-feat-proficiency-choice character-creation.species-lineage-choice
import { Either } from "effect";
import type {
  StartingEquipmentChoice,
  StartingEquipmentItemRef,
} from "@dnd/surface/surface/types";
import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  BARD_MULTICLASS_MUSICAL_INSTRUMENT_PROFICIENCY_CHOICE_KEY,
  BARD_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  CLASS_FEATURE_FEAT_CHOICE_KEY,
  CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  CLASS_FEATURE_LANGUAGE_CHOICE_KEY,
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  DIVINE_ORDER_CHOICE_KEY,
  CLASS_CANTRIP_CHOICE_KEY,
  CLASS_PREPARED_SPELL_CHOICE_KEY,
  CLASS_SUBCLASS_CHOICE_KEY,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
  ELDRITCH_INVOCATIONS_CHOICE_KEY,
  GNOMISH_LINEAGE_CHOICE_KEY,
  GNOMISH_LINEAGE_SPELLCASTING_ABILITY_CHOICE_KEY,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  WIZARD_CANTRIP_CHOICE_KEY,
  WIZARD_PREPARED_SPELL_CHOICE_KEY,
  WIZARD_SPELLBOOK_CHOICE_KEY,
  LOADOUT_ARMOR_SLOT,
  LOADOUT_SHIELD_SLOT,
  LOADOUT_WEAPON_SLOT,
  PHASE1_ALIGNMENT_OPTION_ID,
  PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
  PHASE1_ARMOR_LEATHER_UNIT_ID,
  SRD_ARMOR_CHAIN_SHIRT_UNIT_ID,
  PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID,
  PHASE1_CLASS_EQUIPMENT_OPTION_ID,
  PHASE1_CLASS_FIGHTER_UNIT_ID,
  SRD_BARBARIAN_CLASS_UNIT_ID,
  SRD_BARD_CLASS_UNIT_ID,
  SRD_CLERIC_CLASS_UNIT_ID,
  SRD_DRUID_CLASS_UNIT_ID,
  SRD_MONK_CLASS_UNIT_ID,
  CLASS_TOOL_PROFICIENCY_CHOICE_KEY,
  PHASE1_LOADOUT_ARMOR_OPTION_ID,
  PHASE1_LOADOUT_SHIELD_OPTION_ID,
  PHASE1_LOADOUT_WEAPON_OPTION_ID,
  ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
  SPECIES_ORIGIN_FEAT_CHOICE_KEY,
  SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
  SPECIES_TRAIT_PROFICIENCY_CHOICE_KEY,
  SRD_ROGUE_CLASS_UNIT_ID,
  PHASE1_SHIELD_UNIT_ID,
  PHASE1_WEAPON_DAGGER_UNIT_ID,
  PHASE1_WEAPON_FLAIL_UNIT_ID,
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_WEAPON_QUARTERSTAFF_UNIT_ID,
  SRD_WEAPON_MACE_UNIT_ID,
  PRIMAL_ORDER_CHOICE_KEY,
  PALADIN_FIGHTING_STYLE_CHOICE_KEY,
  RANGER_FIGHTING_STYLE_CHOICE_KEY,
  HUNTERS_PREY_CHOICE_KEY,
  RANGER_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  ROGUE_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  SRD_PALADIN_CLASS_UNIT_ID,
  SRD_RANGER_CLASS_UNIT_ID,
  SRD_LEVEL_THREE_SUBCLASS_UNIT_IDS,
  SRD_LEVEL_ONE_CLASS_UNIT_IDS,
  SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY,
  SRD_SORCERER_CLASS_UNIT_ID,
  SRD_CHARACTER_ADMISSION_SPECIES_UNIT_IDS,
  progressionOptionId,
  SUPPORTED_BACKGROUND_OPTION_IDS,
  SUPPORTED_BACKGROUND_UNIT_IDS,
  SUPPORTED_FIGHTER_SKILL_OPTION_IDS,
  SUPPORTED_FIGHTING_STYLE_OPTION_IDS,
  SUPPORTED_LANGUAGE_OPTION_IDS,
  SUPPORTED_PURCHASE_OPTION_IDS,
  SUPPORTED_PURCHASE_UNIT_IDS,
  SUPPORTED_STARTING_EQUIPMENT_UNIT_IDS,
  SUPPORTED_COIN_GRANT_PURCHASE_UNIT_IDS,
  SUPPORTED_SPECIES_OPTION_IDS,
  SUPPORTED_SPECIES_SIZE_OPTION_IDS,
  SUPPORTED_WEAPON_MASTERY_OPTION_IDS,
  WIDTH_CLASS_WIZARD_UNIT_ID,
  abilityScoreIncreaseChoiceOptionIds,
} from "./phase1-manifest.ts";
import { LEVEL_ONE_ELDRITCH_INVOCATION_OPTIONS } from "./eldritch-invocations.ts";
import { SORCERER_METAMAGIC_OPTION_IDS } from "@dnd/surface/surface/schema";
import type {
  CharacterAlignment,
  CharacterBuildLoadout,
  CharacterDraftPath,
  CharacterStartingLanguages,
  CreationChoiceOptionId,
  CreationHole,
  DraftCreationHoleSource,
  LoadoutSource,
  UnitChoiceKey,
  UnitChoiceSource,
  UnitRef,
} from "./types.ts";
import {
  CHARACTER_BUILD_TOOL_PROFICIENCY_IDS,
  MUSICAL_INSTRUMENT_TOOL_PROFICIENCY_IDS,
  creationChoiceOptionId,
  type ToolProficiencyIdText,
} from "./types.ts";
import {
  classUnitId,
  characterProgressionEntry,
  startingClassUnitId,
  type CharacterProgression,
} from "./character-progression-types.ts";
import {
  characterClassLevel,
  LANGUAGES,
  SURFACE_SKILLS,
} from "@dnd/shared/game-facts";
import {
  ARMOR_TRAINING_CATEGORIES,
  WEAPON_PROFICIENCY_CATEGORIES,
} from "@dnd/surface/surface/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { proficiencyGrantSubjectOptionId } from "./choice-option-codecs.ts";

export type SupportedLoadoutChoice =
  | {
      readonly slot: typeof LOADOUT_ARMOR_SLOT;
      readonly unitId: UnitRecord["id"];
      readonly optionId: CreationChoiceOptionId;
      readonly label: string;
      readonly buildSlot: "armor";
    }
  | {
      readonly slot: typeof LOADOUT_SHIELD_SLOT;
      readonly unitId: UnitRecord["id"];
      readonly optionId: CreationChoiceOptionId;
      readonly label: string;
      readonly buildSlot: "shield";
    }
  | {
      readonly slot: typeof LOADOUT_WEAPON_SLOT;
      readonly unitId: UnitRecord["id"];
      readonly optionId: CreationChoiceOptionId;
      readonly label: string;
      readonly buildSlot: "weapon";
      readonly grip: NonNullable<CharacterBuildLoadout["weapon"]>["grip"];
    };

export type SupportedStartingEquipmentUnitStack = {
  readonly unitId: UnitRecord["id"];
  readonly quantity: number;
};

type SourceScopedEquipmentChoiceKey =
  | typeof CLASS_EQUIPMENT_CHOICE_KEY
  | typeof BACKGROUND_EQUIPMENT_CHOICE_KEY;
type SupportProfileUnitChoiceKey = Exclude<
  UnitChoiceKey,
  SourceScopedEquipmentChoiceKey
>;

export type CharacterCreationSupportProfile = {
  readonly draftOptionIdsByPath: Partial<
    Record<CharacterDraftPath, readonly CreationChoiceOptionId[]>
  >;
  readonly unitOptionIdsByChoiceKey: Partial<
    Record<SupportProfileUnitChoiceKey, readonly CreationChoiceOptionId[]>
  >;
  readonly backgroundUnitIds: readonly UnitRecord["id"][];
  readonly purchasableEquipmentUnitIds: readonly UnitRecord["id"][];
  readonly startingEquipmentUnitIds: readonly UnitRecord["id"][];
  readonly equipmentPurchaseChoiceCount: 3;
  readonly equipmentChoiceOptionIdsByUnitId: Partial<
    Record<UnitRecord["id"], readonly CreationChoiceOptionId[]>
  >;
  readonly loadoutChoices: readonly SupportedLoadoutChoice[];
  readonly manifest: {
    readonly languages: CharacterStartingLanguages;
    readonly alignment: CharacterAlignment;
  };
  readonly supportedProgressions: readonly CharacterProgression[];
  readonly characterBuildResourceUnitIds: readonly UnitRecord["id"][];
};

const SUPPORTED_DRAFT_CHOICE_PATHS = [
  "draft.progression.initial",
  "draft.background",
  "draft.species",
  "draft.speciesSize",
  "draft.languages",
  "draft.alignment",
] as const satisfies ReadonlyArray<CharacterDraftPath>;
type SupportedDraftChoicePath = (typeof SUPPORTED_DRAFT_CHOICE_PATHS)[number];

const SUPPORTED_PROGRESSIONS = [
  ...SRD_LEVEL_ONE_CLASS_UNIT_IDS.map(supportedLevelOneProgression),
  ...SRD_LEVEL_ONE_CLASS_UNIT_IDS.map((classUnitId) =>
    supportedSameClassProgression(classUnitId, 3),
  ),
  supportedSameClassSecondLevelProgression(SRD_BARBARIAN_CLASS_UNIT_ID),
  supportedSameClassSecondLevelProgression(PHASE1_CLASS_FIGHTER_UNIT_ID),
  supportedSameClassSecondLevelProgression(SRD_BARD_CLASS_UNIT_ID),
  supportedSameClassSecondLevelProgression(SRD_CLERIC_CLASS_UNIT_ID),
  supportedSameClassSecondLevelProgression(SRD_DRUID_CLASS_UNIT_ID),
  supportedSameClassSecondLevelProgression(SRD_MONK_CLASS_UNIT_ID),
  supportedSameClassSecondLevelProgression(SRD_PALADIN_CLASS_UNIT_ID),
  supportedSameClassSecondLevelProgression(SRD_RANGER_CLASS_UNIT_ID),
  supportedSameClassSecondLevelProgression(SRD_ROGUE_CLASS_UNIT_ID),
  supportedSameClassSecondLevelProgression(SRD_SORCERER_CLASS_UNIT_ID),
  supportedSameClassSecondLevelProgression(WIDTH_CLASS_WIZARD_UNIT_ID),
  supportedSameClassProgression(WIDTH_CLASS_WIZARD_UNIT_ID, 4),
  supportedSameClassProgression(WIDTH_CLASS_WIZARD_UNIT_ID, 5),
  supportedSameClassProgression(SRD_ROGUE_CLASS_UNIT_ID, 6),
  ...SRD_LEVEL_ONE_CLASS_UNIT_IDS.filter(
    (classUnitId) => classUnitId !== PHASE1_CLASS_FIGHTER_UNIT_ID,
  ).map((classUnitId) =>
    supportedTwoClassSecondLevelProgression(
      PHASE1_CLASS_FIGHTER_UNIT_ID,
      classUnitId,
    ),
  ),
  supportedTwoClassSecondLevelProgression(
    WIDTH_CLASS_WIZARD_UNIT_ID,
    PHASE1_CLASS_FIGHTER_UNIT_ID,
  ),
] as const satisfies ReadonlyArray<CharacterProgression>;

function supportedLevelOneProgression(
  supportedClassUnitId: UnitRecord["id"],
): CharacterProgression {
  return {
    startingClass: classUnitId(supportedClassUnitId),
    advancements: [],
  };
}

function supportedSameClassSecondLevelProgression(
  supportedClassUnitId: UnitRecord["id"],
): CharacterProgression {
  return supportedSameClassProgression(supportedClassUnitId, 2);
}

function supportedSameClassProgression(
  supportedClassUnitId: UnitRecord["id"],
  totalLevel: number,
): CharacterProgression {
  const progressionClassUnitId = classUnitId(supportedClassUnitId);
  const advancements = Array.from({ length: totalLevel - 1 }, (_, index) => {
    const advancement = characterProgressionEntry({
      classUnitId: progressionClassUnitId,
      characterLevel: characterClassLevel(index + 2),
      hitPointRule: { tag: "fixedHigherLevelGain" },
    });
    if (Either.isLeft(advancement)) {
      throw new Error(
        `Invalid supported progression advancement: ${JSON.stringify(advancement.left)}`,
      );
    }

    return advancement.right;
  });

  return {
    startingClass: progressionClassUnitId,
    advancements,
  };
}

function supportedTwoClassSecondLevelProgression(
  startingClassUnitId: UnitRecord["id"],
  advancementClassUnitId: UnitRecord["id"],
): CharacterProgression {
  const advancement = characterProgressionEntry({
    classUnitId: classUnitId(advancementClassUnitId),
    characterLevel: characterClassLevel(2),
    hitPointRule: { tag: "fixedHigherLevelGain" },
  });
  if (Either.isLeft(advancement)) {
    throw new Error(
      `Invalid supported progression advancement: ${JSON.stringify(advancement.left)}`,
    );
  }

  return {
    startingClass: classUnitId(startingClassUnitId),
    advancements: [advancement.right],
  };
}

const SUPPORTED_DRAFT_OPTION_IDS_BY_PATH = {
  "draft.progression.initial": SUPPORTED_PROGRESSIONS.map(progressionOptionId),
  "draft.background": SUPPORTED_BACKGROUND_OPTION_IDS,
  "draft.species": SUPPORTED_SPECIES_OPTION_IDS,
  "draft.speciesSize": SUPPORTED_SPECIES_SIZE_OPTION_IDS,
  "draft.languages": SUPPORTED_LANGUAGE_OPTION_IDS,
  "draft.alignment": [PHASE1_ALIGNMENT_OPTION_ID],
} as const satisfies Record<
  SupportedDraftChoicePath,
  readonly CreationChoiceOptionId[]
>;

const SUPPORTED_SKILL_PROFICIENCY_OPTION_IDS = SURFACE_SKILLS.map((skill) =>
  proficiencyGrantSubjectOptionId({ kind: "skill", skill }),
);
const SUPPORTED_CLASS_BACKGROUND_TOOL_PROFICIENCY_IDS = [
  "tool_dice_set",
  "calligraphers_supplies",
  "herbalism_kit",
  "thieves_tools",
  ...MUSICAL_INSTRUMENT_TOOL_PROFICIENCY_IDS,
] as const satisfies ReadonlyArray<ToolProficiencyIdText>;
const SUPPORTED_CLASS_BACKGROUND_TOOL_OPTION_IDS =
  SUPPORTED_CLASS_BACKGROUND_TOOL_PROFICIENCY_IDS.map(creationChoiceOptionId);
const SUPPORTED_NON_TOOL_PROFICIENCY_GRANT_OPTION_IDS = [
  ...SUPPORTED_SKILL_PROFICIENCY_OPTION_IDS,
  ...WEAPON_PROFICIENCY_CATEGORIES.map((category) =>
    proficiencyGrantSubjectOptionId({ kind: "weapon_category", category }),
  ),
  ...ARMOR_TRAINING_CATEGORIES.map((category) =>
    proficiencyGrantSubjectOptionId({ kind: "armor_category", category }),
  ),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
const SUPPORTED_CLASS_BACKGROUND_PROFICIENCY_GRANT_OPTION_IDS = [
  ...SUPPORTED_NON_TOOL_PROFICIENCY_GRANT_OPTION_IDS,
  ...SUPPORTED_CLASS_BACKGROUND_TOOL_PROFICIENCY_IDS.map((toolId) =>
    proficiencyGrantSubjectOptionId({ kind: "tool", toolId }),
  ),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
const SUPPORTED_ORIGIN_FEAT_PROFICIENCY_GRANT_OPTION_IDS = [
  ...SUPPORTED_NON_TOOL_PROFICIENCY_GRANT_OPTION_IDS,
  ...CHARACTER_BUILD_TOOL_PROFICIENCY_IDS.map((toolId) =>
    proficiencyGrantSubjectOptionId({ kind: "tool", toolId }),
  ),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
const SUPPORTED_HUMAN_ORIGIN_FEAT_OPTION_IDS = [
  creationChoiceOptionId("alert"),
  creationChoiceOptionId("feat_magic_initiate_cleric"),
  creationChoiceOptionId("feat_magic_initiate_druid"),
  creationChoiceOptionId("feat_magic_initiate_wizard"),
  creationChoiceOptionId("feat_savage_attacker"),
  creationChoiceOptionId("feat_skilled"),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
const SUPPORTED_MUSICAL_INSTRUMENT_PROFICIENCY_OPTION_IDS =
  MUSICAL_INSTRUMENT_TOOL_PROFICIENCY_IDS.map((toolId) =>
    proficiencyGrantSubjectOptionId({ kind: "tool", toolId }),
  );
const SUPPORTED_ABILITY_SCORE_INCREASE_OPTION_IDS =
  supportedAbilityScoreIncreaseOptionIds();
const CHARACTER_BUILD_RESOURCE_UNIT_IDS = [
  "barbarian_rage",
  "bard_bardic_inspiration",
  "cleric_channel_divinity",
  "druid_wild_shape",
  "fighter_action_surge",
  "fighter_second_wind",
  "monk_monks_focus",
  "paladin_channel_divinity",
  "paladin_lay_on_hands",
  "sorcerer_font_of_magic",
  "sorcerer_innate_sorcery",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;

export const CHARACTER_CREATION_SUPPORT_PROFILE = {
  draftOptionIdsByPath: SUPPORTED_DRAFT_OPTION_IDS_BY_PATH,
  unitOptionIdsByChoiceKey: {
    [CLASS_FEATURE_FEAT_CHOICE_KEY]: [
      ...SUPPORTED_FIGHTING_STYLE_OPTION_IDS,
      creationChoiceOptionId("feat_ability_score_improvement"),
      creationChoiceOptionId("feat_boon_of_combat_prowess"),
      creationChoiceOptionId("feat_grappler"),
    ],
    [CLASS_SUBCLASS_CHOICE_KEY]: SRD_LEVEL_THREE_SUBCLASS_UNIT_IDS.map(
      creationChoiceOptionId,
    ),
    [CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY]:
      SUPPORTED_ABILITY_SCORE_INCREASE_OPTION_IDS,
    [CLASS_FEATURE_PROFICIENCY_CHOICE_KEY]:
      SUPPORTED_CLASS_BACKGROUND_PROFICIENCY_GRANT_OPTION_IDS,
    [ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY]:
      SUPPORTED_ORIGIN_FEAT_PROFICIENCY_GRANT_OPTION_IDS,
    [SPECIES_TRAIT_PROFICIENCY_CHOICE_KEY]:
      SUPPORTED_SKILL_PROFICIENCY_OPTION_IDS,
    [SPECIES_ORIGIN_FEAT_CHOICE_KEY]: SUPPORTED_HUMAN_ORIGIN_FEAT_OPTION_IDS,
    [SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY]:
      SUPPORTED_ORIGIN_FEAT_PROFICIENCY_GRANT_OPTION_IDS,
    [CLASS_FEATURE_LANGUAGE_CHOICE_KEY]: LANGUAGES.map(creationChoiceOptionId),
    [DIVINE_ORDER_CHOICE_KEY]: [
      creationChoiceOptionId("protector"),
      creationChoiceOptionId("thaumaturge"),
    ],
    [PRIMAL_ORDER_CHOICE_KEY]: [
      creationChoiceOptionId("magician"),
      creationChoiceOptionId("warden"),
    ],
    [PALADIN_FIGHTING_STYLE_CHOICE_KEY]: [
      creationChoiceOptionId("fighting_style_feat"),
      creationChoiceOptionId("blessed_warrior"),
    ],
    [RANGER_FIGHTING_STYLE_CHOICE_KEY]: [
      creationChoiceOptionId("fighting_style_feat"),
      creationChoiceOptionId("druidic_warrior"),
    ],
    [HUNTERS_PREY_CHOICE_KEY]: [
      creationChoiceOptionId("colossus_slayer"),
      creationChoiceOptionId("horde_breaker"),
    ],
    [CLASS_TOOL_PROFICIENCY_CHOICE_KEY]:
      SUPPORTED_CLASS_BACKGROUND_PROFICIENCY_GRANT_OPTION_IDS,
    [BARD_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY]:
      SUPPORTED_SKILL_PROFICIENCY_OPTION_IDS,
    [BARD_MULTICLASS_MUSICAL_INSTRUMENT_PROFICIENCY_CHOICE_KEY]:
      SUPPORTED_MUSICAL_INSTRUMENT_PROFICIENCY_OPTION_IDS,
    [RANGER_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY]:
      SUPPORTED_SKILL_PROFICIENCY_OPTION_IDS,
    [ROGUE_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY]:
      SUPPORTED_SKILL_PROFICIENCY_OPTION_IDS,
    [ELDRITCH_INVOCATIONS_CHOICE_KEY]:
      LEVEL_ONE_ELDRITCH_INVOCATION_OPTIONS.map((option) => option.optionId),
    [SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY]: SORCERER_METAMAGIC_OPTION_IDS.map(
      creationChoiceOptionId,
    ),
    [WEAPON_MASTERY_OPTIONS_CHOICE_KEY]: SUPPORTED_WEAPON_MASTERY_OPTION_IDS,
    [EQUIPMENT_PURCHASE_CHOICE_KEY]: SUPPORTED_PURCHASE_OPTION_IDS,
  },
  backgroundUnitIds: SUPPORTED_BACKGROUND_UNIT_IDS,
  purchasableEquipmentUnitIds: SUPPORTED_PURCHASE_UNIT_IDS,
  startingEquipmentUnitIds: SUPPORTED_STARTING_EQUIPMENT_UNIT_IDS,
  equipmentPurchaseChoiceCount: 3,
  equipmentChoiceOptionIdsByUnitId: {
    ...Object.fromEntries(
      SRD_LEVEL_ONE_CLASS_UNIT_IDS.map((classUnitId) => [
        classUnitId,
        [creationChoiceOptionId("option_b")],
      ]),
    ),
    [PHASE1_CLASS_FIGHTER_UNIT_ID]: [
      PHASE1_CLASS_EQUIPMENT_OPTION_ID,
      creationChoiceOptionId("option_a"),
    ],
    [SRD_BARD_CLASS_UNIT_ID]: [
      creationChoiceOptionId("option_b"),
      creationChoiceOptionId("option_a"),
    ],
    [SRD_CLERIC_CLASS_UNIT_ID]: [
      creationChoiceOptionId("option_b"),
      creationChoiceOptionId("option_a"),
    ],
    [SRD_DRUID_CLASS_UNIT_ID]: [
      creationChoiceOptionId("option_b"),
      creationChoiceOptionId("option_a"),
    ],
    ...Object.fromEntries(
      SUPPORTED_BACKGROUND_UNIT_IDS.map((backgroundUnitId) => [
        backgroundUnitId,
        [PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID],
      ]),
    ),
  },
  loadoutChoices: [
    {
      slot: LOADOUT_ARMOR_SLOT,
      unitId: PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
      optionId: PHASE1_LOADOUT_ARMOR_OPTION_ID,
      label: "Worn",
      buildSlot: "armor",
    },
    {
      slot: LOADOUT_ARMOR_SLOT,
      unitId: SRD_ARMOR_CHAIN_SHIRT_UNIT_ID,
      optionId: PHASE1_LOADOUT_ARMOR_OPTION_ID,
      label: "Worn",
      buildSlot: "armor",
    },
    {
      slot: LOADOUT_ARMOR_SLOT,
      unitId: PHASE1_ARMOR_LEATHER_UNIT_ID,
      optionId: PHASE1_LOADOUT_ARMOR_OPTION_ID,
      label: "Worn",
      buildSlot: "armor",
    },
    {
      slot: LOADOUT_SHIELD_SLOT,
      unitId: PHASE1_SHIELD_UNIT_ID,
      optionId: PHASE1_LOADOUT_SHIELD_OPTION_ID,
      label: "Wielded",
      buildSlot: "shield",
    },
    {
      slot: LOADOUT_WEAPON_SLOT,
      unitId: PHASE1_WEAPON_LONGSWORD_UNIT_ID,
      optionId: PHASE1_LOADOUT_WEAPON_OPTION_ID,
      label: "Wielded one-handed",
      buildSlot: "weapon",
      grip: "one_handed",
    },
    {
      slot: LOADOUT_WEAPON_SLOT,
      unitId: PHASE1_WEAPON_DAGGER_UNIT_ID,
      optionId: PHASE1_LOADOUT_WEAPON_OPTION_ID,
      label: "Wielded one-handed",
      buildSlot: "weapon",
      grip: "one_handed",
    },
    {
      slot: LOADOUT_WEAPON_SLOT,
      unitId: SRD_WEAPON_MACE_UNIT_ID,
      optionId: PHASE1_LOADOUT_WEAPON_OPTION_ID,
      label: "Wielded one-handed",
      buildSlot: "weapon",
      grip: "one_handed",
    },
    {
      slot: LOADOUT_WEAPON_SLOT,
      unitId: PHASE1_WEAPON_FLAIL_UNIT_ID,
      optionId: PHASE1_LOADOUT_WEAPON_OPTION_ID,
      label: "Wielded one-handed",
      buildSlot: "weapon",
      grip: "one_handed",
    },
    {
      slot: LOADOUT_WEAPON_SLOT,
      unitId: PHASE1_WEAPON_QUARTERSTAFF_UNIT_ID,
      optionId: PHASE1_LOADOUT_WEAPON_OPTION_ID,
      label: "Wielded one-handed",
      buildSlot: "weapon",
      grip: "one_handed",
    },
  ],
  manifest: {
    languages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
  },
  supportedProgressions: SUPPORTED_PROGRESSIONS,
  characterBuildResourceUnitIds: CHARACTER_BUILD_RESOURCE_UNIT_IDS,
} as const satisfies CharacterCreationSupportProfile;

export function unsupportedHoleSelectionOptionId(
  hole: CreationHole,
  optionIds: readonly CreationChoiceOptionId[],
): CreationChoiceOptionId | undefined {
  const supportedOptionIds = supportedHoleOptionIdSet(hole);
  if (supportedOptionIds == null) {
    return undefined;
  }

  return optionIds.find((optionId) => !supportedOptionIds.has(optionId));
}

export function supportedHoleOptionIds(
  hole: CreationHole,
): readonly CreationChoiceOptionId[] | undefined {
  const source = hole.source;
  if (source.tag === "draft") {
    return supportedDraftOptionIds(source);
  }

  if (source.tag === "loadout") {
    const loadoutChoice = supportedLoadoutChoiceForSource(source);
    return loadoutChoice == null ? undefined : [loadoutChoice.optionId];
  }

  if (
    hole.kind === "choice" &&
    (source.choiceKey === CLASS_CANTRIP_CHOICE_KEY ||
      source.choiceKey === CLASS_PREPARED_SPELL_CHOICE_KEY ||
      source.choiceKey === WIZARD_CANTRIP_CHOICE_KEY ||
      source.choiceKey === WIZARD_SPELLBOOK_CHOICE_KEY ||
      source.choiceKey === WIZARD_PREPARED_SPELL_CHOICE_KEY)
  ) {
    return hole.options.map((option) => option.optionId);
  }

  if (
    hole.kind === "choice" &&
    source.choiceKey === BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY
  ) {
    return hole.options.map((option) => option.optionId);
  }

  if (
    hole.kind === "choice" &&
    source.choiceKey === BACKGROUND_TOOL_CHOICE_KEY
  ) {
    return hole.options
      .map((option) => option.optionId)
      .filter((optionId) =>
        SUPPORTED_CLASS_BACKGROUND_TOOL_OPTION_IDS.some(
          (supportedOptionId) => supportedOptionId === optionId,
        ),
      );
  }

  if (
    hole.kind === "choice" &&
    (source.choiceKey === GNOMISH_LINEAGE_CHOICE_KEY ||
      source.choiceKey === GNOMISH_LINEAGE_SPELLCASTING_ABILITY_CHOICE_KEY)
  ) {
    return hole.options.map((option) => option.optionId);
  }

  return supportedUnitOptionIdsForSource(source);
}

export function supportedDraftOptionIds(
  source: DraftCreationHoleSource,
): readonly CreationChoiceOptionId[] | undefined {
  if (isSupportedDraftChoicePath(source.path)) {
    return CHARACTER_CREATION_SUPPORT_PROFILE.draftOptionIdsByPath[source.path];
  }

  return undefined;
}

function isSupportedDraftChoicePath(
  path: CharacterDraftPath,
): path is SupportedDraftChoicePath {
  return SUPPORTED_DRAFT_CHOICE_PATHS.some(
    (supportedPath) => supportedPath === path,
  );
}

// Support-profile filter, not RAW legality. This is the character
// creation equivalent of battle-runtime's Attack action option support gate: legal
// SRD-legal catalog choices may be discoverable, but finalization only accepts the
// subset this reducer can currently project and execute. This should shrink as
// character creation support widens beyond the current profile.
export function supportedUnitOptionIds(
  choiceKey: SupportProfileUnitChoiceKey,
): readonly CreationChoiceOptionId[] {
  const optionIdsByChoiceKey: CharacterCreationSupportProfile["unitOptionIdsByChoiceKey"] =
    CHARACTER_CREATION_SUPPORT_PROFILE.unitOptionIdsByChoiceKey;
  return optionIdsByChoiceKey[choiceKey] ?? [];
}

export function supportedUnitOptionIdsForSource(
  source: UnitChoiceSource,
): readonly CreationChoiceOptionId[] {
  if (
    source.choiceKey === CLASS_EQUIPMENT_CHOICE_KEY ||
    source.choiceKey === BACKGROUND_EQUIPMENT_CHOICE_KEY
  ) {
    const equipmentChoices =
      CHARACTER_CREATION_SUPPORT_PROFILE.equipmentChoiceOptionIdsByUnitId as Partial<
        Record<UnitRecord["id"], readonly CreationChoiceOptionId[]>
      >;
    return equipmentChoices[source.unitId] ?? [];
  }

  if (source.choiceKey === CLASS_SKILL_PROFICIENCY_CHOICE_KEY) {
    if (source.unitId === PHASE1_CLASS_FIGHTER_UNIT_ID) {
      return SUPPORTED_FIGHTER_SKILL_OPTION_IDS;
    }

    return SUPPORTED_SKILL_PROFICIENCY_OPTION_IDS;
  }

  return supportedUnitOptionIds(source.choiceKey);
}

export function supportedHoleOptionIdSet(
  hole: CreationHole,
): ReadonlySet<CreationChoiceOptionId> | undefined {
  const optionIds = supportedHoleOptionIds(hole);
  return optionIds == null ? undefined : new Set(optionIds);
}

export function supportedClassUnitIds(): readonly UnitRecord["id"][] {
  return uniqueValues(
    CHARACTER_CREATION_SUPPORT_PROFILE.supportedProgressions.map(
      (progression) => startingClassUnitId(progression),
    ),
  );
}

export function supportedBackgroundUnitIds(): readonly UnitRecord["id"][] {
  return CHARACTER_CREATION_SUPPORT_PROFILE.backgroundUnitIds;
}

export function supportedSpeciesUnitIds(): readonly UnitRecord["id"][] {
  return SRD_CHARACTER_ADMISSION_SPECIES_UNIT_IDS;
}

export function finalizableSpeciesUnitIds(): readonly UnitRecord["id"][] {
  return speciesUnitIdsWithSupportedTraitChoices();
}

export function speciesUnitIdsWithSupportedTraitChoices(): readonly UnitRecord["id"][] {
  return SRD_CHARACTER_ADMISSION_SPECIES_UNIT_IDS;
}

export function supportedPurchasableEquipmentUnitIds(): readonly UnitRecord["id"][] {
  return CHARACTER_CREATION_SUPPORT_PROFILE.purchasableEquipmentUnitIds;
}

export function supportedPurchasableEquipmentUnitIdsForClass(
  classUnitId: UnitRecord["id"],
): readonly UnitRecord["id"][] {
  return classUnitId === PHASE1_CLASS_FIGHTER_UNIT_ID
    ? CHARACTER_CREATION_SUPPORT_PROFILE.purchasableEquipmentUnitIds
    : SUPPORTED_COIN_GRANT_PURCHASE_UNIT_IDS;
}

export function supportedEquipmentPurchaseChoiceCount(): number {
  return CHARACTER_CREATION_SUPPORT_PROFILE.equipmentPurchaseChoiceCount;
}

export function supportedLoadoutChoices(): readonly SupportedLoadoutChoice[] {
  return CHARACTER_CREATION_SUPPORT_PROFILE.loadoutChoices;
}

export function supportedStartingEquipmentUnitStacks(
  choice: StartingEquipmentChoice,
): readonly SupportedStartingEquipmentUnitStack[] {
  if (choice.kind === "coin_grant") return [];

  return choice.items.flatMap(supportedStartingEquipmentItemUnitStacks);
}

export function isSupportedStartingEquipmentChoice(
  choice: StartingEquipmentChoice,
): boolean {
  if (choice.kind === "coin_grant") return true;

  const unitRefItems = choice.items.filter(
    (
      item,
    ): item is Extract<
      StartingEquipmentItemRef,
      { readonly kind: "unit_ref" }
    > =>
      item.kind === "unit_ref",
  );
  return (
    unitRefItems.length > 0 &&
    unitRefItems.every((item) => isSupportedEquipmentUnitId(item.unitId))
  );
}

function supportedStartingEquipmentItemUnitStacks(
  item: StartingEquipmentItemRef,
): readonly SupportedStartingEquipmentUnitStack[] {
  if (item.kind === "unit_ref") {
    return isSupportedEquipmentUnitId(item.unitId)
      ? [{ unitId: item.unitId, quantity: item.quantity ?? 1 }]
      : [];
  }

  return [];
}

function isSupportedEquipmentUnitId(unitId: UnitRecord["id"]): boolean {
  return supportedEquipmentUnitIds().some(
    (supportedUnitId) => supportedUnitId === unitId,
  );
}

function supportedEquipmentUnitIds(): readonly UnitRecord["id"][] {
  return CHARACTER_CREATION_SUPPORT_PROFILE.startingEquipmentUnitIds;
}

export function isSupportedProgression(
  progression: CharacterProgression,
): boolean {
  return CHARACTER_CREATION_SUPPORT_PROFILE.supportedProgressions.some(
    (supported) => sameProgression(supported, progression),
  );
}

export function supportedProgressionsForClass(
  classUnitId: UnitRecord["id"],
): readonly CharacterProgression[] {
  return CHARACTER_CREATION_SUPPORT_PROFILE.supportedProgressions.filter(
    (progression) => startingClassUnitId(progression) === classUnitId,
  );
}

export function supportedProgressionForOptionId(
  optionId: CreationChoiceOptionId,
): CharacterProgression | undefined {
  return CHARACTER_CREATION_SUPPORT_PROFILE.supportedProgressions.find(
    (progression) => progressionOptionId(progression) === optionId,
  );
}

export function supportsCharacterBuildResourceUnitId(
  unitId: UnitRecord["id"],
): boolean {
  return CHARACTER_CREATION_SUPPORT_PROFILE.characterBuildResourceUnitIds.some(
    (supportedUnitId) => supportedUnitId === unitId,
  );
}

function uniqueValues<T>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function sameProgression(
  left: CharacterProgression,
  right: CharacterProgression,
): boolean {
  return (
    startingClassUnitId(left) === startingClassUnitId(right) &&
    left.advancements.length === right.advancements.length &&
    left.advancements.every((leftEntry, index) => {
      const rightEntry = right.advancements[index];
      return (
        rightEntry != null &&
        leftEntry.classUnitId === rightEntry.classUnitId &&
        leftEntry.hitPointRule.tag === rightEntry.hitPointRule.tag
      );
    })
  );
}

export function supportedLoadoutChoiceForSource(
  source: LoadoutSource,
): SupportedLoadoutChoice | undefined {
  return CHARACTER_CREATION_SUPPORT_PROFILE.loadoutChoices.find(
    (choice) =>
      choice.unitId === source.equipmentUnitId && choice.slot === source.slot,
  );
}

export function unitRefsForSupportedSelectedUnitChoice(
  source: UnitChoiceSource,
  options: readonly { readonly unitRef?: UnitRef }[],
): readonly UnitRecord["id"][] {
  if (
    source.choiceKey !== CLASS_FEATURE_FEAT_CHOICE_KEY &&
    source.choiceKey !== SPECIES_ORIGIN_FEAT_CHOICE_KEY &&
    source.choiceKey !== CLASS_SUBCLASS_CHOICE_KEY &&
    source.choiceKey !== WEAPON_MASTERY_OPTIONS_CHOICE_KEY &&
    source.choiceKey !== HUNTERS_PREY_CHOICE_KEY
  ) {
    return [];
  }

  if (source.choiceKey === HUNTERS_PREY_CHOICE_KEY) {
    return [source.unitId];
  }

  return options.flatMap((option) =>
    option.unitRef == null ? [] : [option.unitRef.unitId],
  );
}

function supportedAbilityScoreIncreaseOptionIds(): readonly CreationChoiceOptionId[] {
  return [
    ...abilityScoreIncreaseChoiceOptionIds({
      abilityScope: { kind: "all_abilities" },
      maxScore: 20,
      methods: [
        { kind: "one_score", increase: 2 },
        { kind: "two_scores", primaryIncrease: 1, secondaryIncrease: 1 },
      ],
    }),
    ...abilityScoreIncreaseChoiceOptionIds({
      abilityScope: { kind: "all_abilities" },
      maxScore: 30,
      methods: [{ kind: "one_score", increase: 1 }],
    }),
    ...abilityScoreIncreaseChoiceOptionIds({
      abilityScope: {
        kind: "specific_abilities",
        abilities: ["str", "dex"],
      },
      maxScore: 20,
      methods: [{ kind: "one_score", increase: 1 }],
    }),
  ];
}
