// KERNEL-COVERAGE: runtime-owner CREATION.CHOICE_DISCOVERY_CARDINALITY
// UNIT-PROFILE-COVERAGE: runtime-owner character-creation.grappler-general-feat character-creation.origin-feat-proficiency-choice character-creation.species-trait-proficiency-choice character-creation.species-origin-feat-choice character-creation.species-origin-feat-proficiency-choice character-creation.species-lineage-choice character-sheet.cleric-divine-intervention-session-invocation character-sheet.ranger-tireless
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { Either } from "effect";
import { abilityScore, PositiveInteger } from "@dnd/shared/types";
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
  PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
  PHASE1_CHARACTER_ALIGNMENT,
  PHASE1_CHARACTER_STARTING_LANGUAGES,
  PHASE1_CLASS_FIGHTER_UNIT_ID,
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
  PHASE1_WEAPON_FLAIL_UNIT_ID,
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_WEAPON_QUARTERSTAFF_UNIT_ID,
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
  SUPPORTED_BACKGROUND_UNIT_IDS,
  SUPPORTED_FIGHTER_SKILL_OPTION_IDS,
  SUPPORTED_FIGHTING_STYLE_OPTION_IDS,
  SUPPORTED_PURCHASE_UNIT_IDS,
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
  alignmentOptionId,
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

type SupportProfileUnitChoiceKey = Exclude<
  UnitChoiceKey,
  | typeof CLASS_EQUIPMENT_CHOICE_KEY
  | typeof BACKGROUND_EQUIPMENT_CHOICE_KEY
  | typeof EQUIPMENT_PURCHASE_CHOICE_KEY
>;

export type CharacterCreationSupportProfile = {
  readonly unitOptionIdsByChoiceKey: Partial<
    Record<SupportProfileUnitChoiceKey, readonly CreationChoiceOptionId[]>
  >;
  readonly backgroundUnitIds: readonly UnitRecord["id"][];
  readonly purchasableEquipmentUnitIds: readonly UnitRecord["id"][];
  readonly equipmentPurchaseChoiceCount: 3;
  readonly loadoutChoices: readonly SupportedLoadoutChoice[];
  readonly manifest: {
    readonly languages: CharacterStartingLanguages;
    readonly alignment: CharacterAlignment;
  };
  readonly supportedProgressions: readonly CharacterProgression[];
  readonly characterBuildResourceUnitIds: readonly UnitRecord["id"][];
};

const SUPPORTED_PROGRESSIONS = [
  ...SRD_LEVEL_ONE_CLASS_UNIT_IDS.map(supportedLevelOneProgression),
  ...SRD_LEVEL_ONE_CLASS_UNIT_IDS.map((classUnitId) =>
    supportedSameClassProgression(authoredUnitId(classUnitId), 3),
  ),
  supportedSameClassSecondLevelProgression(
    authoredUnitId(PHASE1_CLASS_FIGHTER_UNIT_ID),
  ),
  supportedSameClassSecondLevelProgression(
    authoredUnitId(SRD_BARD_CLASS_UNIT_ID),
  ),
  supportedSameClassSecondLevelProgression(
    authoredUnitId(SRD_CLERIC_CLASS_UNIT_ID),
  ),
  supportedSameClassSecondLevelProgression(
    authoredUnitId(SRD_DRUID_CLASS_UNIT_ID),
  ),
  supportedSameClassSecondLevelProgression(
    authoredUnitId(SRD_MONK_CLASS_UNIT_ID),
  ),
  supportedSameClassSecondLevelProgression(
    authoredUnitId(SRD_PALADIN_CLASS_UNIT_ID),
  ),
  supportedSameClassSecondLevelProgression(
    authoredUnitId(SRD_RANGER_CLASS_UNIT_ID),
  ),
  supportedSameClassSecondLevelProgression(
    authoredUnitId(SRD_SORCERER_CLASS_UNIT_ID),
  ),
  supportedSameClassSecondLevelProgression(
    authoredUnitId(WIDTH_CLASS_WIZARD_UNIT_ID),
  ),
  supportedSameClassProgression(
    authoredUnitId(PHASE1_CLASS_FIGHTER_UNIT_ID),
    5,
  ),
  supportedSameClassProgression(authoredUnitId(WIDTH_CLASS_WIZARD_UNIT_ID), 4),
  supportedSameClassProgression(authoredUnitId(WIDTH_CLASS_WIZARD_UNIT_ID), 5),
  supportedSameClassProgression(authoredUnitId(SRD_RANGER_CLASS_UNIT_ID), 9),
  supportedSameClassProgression(authoredUnitId(SRD_ROGUE_CLASS_UNIT_ID), 6),
  supportedSameClassProgression(authoredUnitId(SRD_ROGUE_CLASS_UNIT_ID), 10),
  ...SRD_LEVEL_ONE_CLASS_UNIT_IDS.filter(
    (classUnitId) => classUnitId !== PHASE1_CLASS_FIGHTER_UNIT_ID,
  ).map((classUnitId) =>
    supportedTwoClassSecondLevelProgression(
      authoredUnitId(PHASE1_CLASS_FIGHTER_UNIT_ID),
      classUnitId,
    ),
  ),
  supportedTwoClassSecondLevelProgression(
    authoredUnitId(WIDTH_CLASS_WIZARD_UNIT_ID),
    authoredUnitId(PHASE1_CLASS_FIGHTER_UNIT_ID),
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
    /* v8 ignore start -- Consecutive generated levels and the branded class id satisfy the progression parser. */
    if (Either.isLeft(advancement)) {
      throw new Error(
        `Invalid supported progression advancement: ${JSON.stringify(advancement.left)}`,
      );
    }
    /* v8 ignore stop */

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
  /* v8 ignore start -- This generated second-level entry and branded class id satisfy the progression parser. */
  if (Either.isLeft(advancement)) {
    throw new Error(
      `Invalid supported progression advancement: ${JSON.stringify(advancement.left)}`,
    );
  }
  /* v8 ignore stop */

  return {
    startingClass: classUnitId(startingClassUnitId),
    advancements: [advancement.right],
  };
}

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
  authoredUnitId("barbarian_rage"),
  authoredUnitId("bard_bardic_inspiration"),
  authoredUnitId("cleric_channel_divinity"),
  authoredUnitId("cleric_divine_intervention"),
  authoredUnitId("druid_wild_shape"),
  authoredUnitId("fighter_action_surge"),
  authoredUnitId("fighter_second_wind"),
  authoredUnitId("monk_monks_focus"),
  authoredUnitId("paladin_channel_divinity"),
  authoredUnitId("paladin_lay_on_hands"),
  authoredUnitId("ranger_tireless"),
  authoredUnitId("sorcerer_font_of_magic"),
  authoredUnitId("sorcerer_innate_sorcery"),
] as const satisfies ReadonlyArray<UnitRecord["id"]>;

export const CHARACTER_CREATION_SUPPORT_PROFILE = {
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
  },
  backgroundUnitIds: SUPPORTED_BACKGROUND_UNIT_IDS,
  purchasableEquipmentUnitIds: SUPPORTED_PURCHASE_UNIT_IDS,
  equipmentPurchaseChoiceCount: 3,
  loadoutChoices: [
    {
      slot: LOADOUT_ARMOR_SLOT,
      unitId: authoredUnitId(PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID),
      optionId: PHASE1_LOADOUT_ARMOR_OPTION_ID,
      label: "Worn",
      buildSlot: "armor",
    },
    {
      slot: LOADOUT_SHIELD_SLOT,
      unitId: authoredUnitId(PHASE1_SHIELD_UNIT_ID),
      optionId: PHASE1_LOADOUT_SHIELD_OPTION_ID,
      label: "Wielded",
      buildSlot: "shield",
    },
    {
      slot: LOADOUT_WEAPON_SLOT,
      unitId: authoredUnitId(PHASE1_WEAPON_LONGSWORD_UNIT_ID),
      optionId: PHASE1_LOADOUT_WEAPON_OPTION_ID,
      label: "Wielded one-handed",
      buildSlot: "weapon",
      grip: "one_handed",
    },
    {
      slot: LOADOUT_WEAPON_SLOT,
      unitId: authoredUnitId(PHASE1_WEAPON_FLAIL_UNIT_ID),
      optionId: PHASE1_LOADOUT_WEAPON_OPTION_ID,
      label: "Wielded one-handed",
      buildSlot: "weapon",
      grip: "one_handed",
    },
    {
      slot: LOADOUT_WEAPON_SLOT,
      unitId: authoredUnitId(PHASE1_WEAPON_QUARTERSTAFF_UNIT_ID),
      optionId: PHASE1_LOADOUT_WEAPON_OPTION_ID,
      label: "Wielded one-handed",
      buildSlot: "weapon",
      grip: "one_handed",
    },
  ],
  manifest: {
    languages: PHASE1_CHARACTER_STARTING_LANGUAGES,
    alignment: PHASE1_CHARACTER_ALIGNMENT,
  },
  supportedProgressions: SUPPORTED_PROGRESSIONS,
  characterBuildResourceUnitIds: CHARACTER_BUILD_RESOURCE_UNIT_IDS,
} as const satisfies CharacterCreationSupportProfile;

export function unsupportedHoleSelectionOptionId(
  hole: CreationHole,
  optionIds: readonly CreationChoiceOptionId[],
  supportProfile: CharacterCreationSupportProfile,
): CreationChoiceOptionId | undefined {
  const supportedOptionIds = supportedHoleOptionIdSet(hole, supportProfile);
  if (supportedOptionIds == null) {
    return undefined;
  }

  return optionIds.find((optionId) => !supportedOptionIds.has(optionId));
}

export function supportedHoleOptionIds(
  hole: CreationHole,
  supportProfile: CharacterCreationSupportProfile = CHARACTER_CREATION_SUPPORT_PROFILE,
): readonly CreationChoiceOptionId[] | undefined {
  const source = hole.source;
  if (source.tag === "draft") {
    if (hole.kind === "choice" && source.path === "draft.draconicAncestry") {
      return hole.options.map((option) => option.optionId);
    }
    return supportedDraftOptionIds(source, supportProfile);
  }

  if (source.tag === "loadout") {
    const loadoutChoice = supportedLoadoutChoiceForSource(
      source,
      supportProfile,
    );
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
    (source.choiceKey === CLASS_EQUIPMENT_CHOICE_KEY ||
      source.choiceKey === BACKGROUND_EQUIPMENT_CHOICE_KEY)
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

  return mappedUnitOptionIdsForSource(source, supportProfile);
}

export function supportedDraftOptionIds(
  source: DraftCreationHoleSource,
  supportProfile: CharacterCreationSupportProfile,
): readonly CreationChoiceOptionId[] | undefined {
  if (source.path === "draft.progression.initial") {
    return supportProfile.supportedProgressions.map(progressionOptionId);
  }

  if (source.path === "draft.background") {
    return supportProfile.backgroundUnitIds.map(creationChoiceOptionId);
  }

  if (source.path === "draft.languages") {
    return supportProfile.manifest.languages
      .filter((language) => language !== "Common")
      .map(creationChoiceOptionId);
  }

  if (source.path === "draft.alignment") {
    return [
      creationChoiceOptionId(
        alignmentOptionId(supportProfile.manifest.alignment),
      ),
    ];
  }

  if (source.path === "draft.species") {
    return SUPPORTED_SPECIES_OPTION_IDS;
  }

  return source.path === "draft.speciesSize"
    ? SUPPORTED_SPECIES_SIZE_OPTION_IDS
    : undefined;
}

// Support-profile filter, not RAW legality. This is the character
// creation equivalent of battle-runtime's Attack action option support gate: legal
// SRD-legal catalog choices may be discoverable, but finalization only accepts the
// subset this reducer can currently project and execute. This should shrink as
// character creation support widens beyond the current profile.
export function supportedUnitOptionIds(
  choiceKey: SupportProfileUnitChoiceKey,
  supportProfile: CharacterCreationSupportProfile,
): readonly CreationChoiceOptionId[] {
  const optionIdsByChoiceKey: CharacterCreationSupportProfile["unitOptionIdsByChoiceKey"] =
    supportProfile.unitOptionIdsByChoiceKey;
  return optionIdsByChoiceKey[choiceKey] ?? [];
}

function mappedUnitOptionIdsForSource(
  source: UnitChoiceSource,
  supportProfile: CharacterCreationSupportProfile,
): readonly CreationChoiceOptionId[] | undefined {
  if (
    source.choiceKey === CLASS_EQUIPMENT_CHOICE_KEY ||
    source.choiceKey === BACKGROUND_EQUIPMENT_CHOICE_KEY
  ) {
    return undefined;
  }

  if (source.choiceKey === EQUIPMENT_PURCHASE_CHOICE_KEY) {
    return supportProfile.purchasableEquipmentUnitIds.map(
      creationChoiceOptionId,
    );
  }

  if (source.choiceKey === CLASS_SKILL_PROFICIENCY_CHOICE_KEY) {
    if (source.unitId === PHASE1_CLASS_FIGHTER_UNIT_ID) {
      return SUPPORTED_FIGHTER_SKILL_OPTION_IDS;
    }

    return SUPPORTED_SKILL_PROFICIENCY_OPTION_IDS;
  }

  return supportedUnitOptionIds(source.choiceKey, supportProfile);
}

export function supportedHoleOptionIdSet(
  hole: CreationHole,
  supportProfile: CharacterCreationSupportProfile,
): ReadonlySet<CreationChoiceOptionId> | undefined {
  const optionIds = supportedHoleOptionIds(hole, supportProfile);
  return optionIds == null ? undefined : new Set(optionIds);
}

export function supportedClassUnitIds(
  supportProfile: CharacterCreationSupportProfile,
): readonly UnitRecord["id"][] {
  return uniqueValues(
    supportProfile.supportedProgressions.map((progression) =>
      startingClassUnitId(progression),
    ),
  );
}

export function supportedBackgroundUnitIds(
  supportProfile: CharacterCreationSupportProfile,
): readonly UnitRecord["id"][] {
  return supportProfile.backgroundUnitIds;
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

export function supportedPurchasableEquipmentUnitIds(
  supportProfile: CharacterCreationSupportProfile,
): readonly UnitRecord["id"][] {
  return supportProfile.purchasableEquipmentUnitIds;
}

export function supportedPurchasableEquipmentUnitIdsForClass(
  classUnitId: UnitRecord["id"],
  supportProfile: CharacterCreationSupportProfile,
): readonly UnitRecord["id"][] {
  return classUnitId === PHASE1_CLASS_FIGHTER_UNIT_ID
    ? supportProfile.purchasableEquipmentUnitIds
    : SUPPORTED_COIN_GRANT_PURCHASE_UNIT_IDS;
}

export function supportedEquipmentPurchaseChoiceCount(
  supportProfile: CharacterCreationSupportProfile,
): number {
  return supportProfile.equipmentPurchaseChoiceCount;
}

export function supportedLoadoutChoices(
  supportProfile: CharacterCreationSupportProfile,
): readonly SupportedLoadoutChoice[] {
  return supportProfile.loadoutChoices;
}

export function isSupportedProgression(
  progression: CharacterProgression,
  supportProfile: CharacterCreationSupportProfile,
): boolean {
  return supportProfile.supportedProgressions.some((supported) =>
    sameProgression(supported, progression),
  );
}

export function supportedProgressionsForClass(
  classUnitId: UnitRecord["id"],
  supportProfile: CharacterCreationSupportProfile,
): readonly CharacterProgression[] {
  return supportProfile.supportedProgressions.filter(
    (progression) => startingClassUnitId(progression) === classUnitId,
  );
}

export function supportedProgressionForOptionId(
  optionId: CreationChoiceOptionId,
  supportProfile: CharacterCreationSupportProfile,
): CharacterProgression | undefined {
  return supportProfile.supportedProgressions.find(
    (progression) => progressionOptionId(progression) === optionId,
  );
}

export function supportsCharacterBuildResourceUnitId(
  unitId: UnitRecord["id"],
  supportProfile: CharacterCreationSupportProfile,
): boolean {
  return supportProfile.characterBuildResourceUnitIds.some(
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
  supportProfile: CharacterCreationSupportProfile,
): SupportedLoadoutChoice | undefined {
  return supportProfile.loadoutChoices.find(
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
      maxScore: abilityScore(20),
      methods: [
        { kind: "one_score", increase: PositiveInteger(2) },
        {
          kind: "two_scores",
          primaryIncrease: PositiveInteger(1),
          secondaryIncrease: PositiveInteger(1),
        },
      ],
    }),
    ...abilityScoreIncreaseChoiceOptionIds({
      abilityScope: { kind: "all_abilities" },
      maxScore: abilityScore(30),
      methods: [{ kind: "one_score", increase: PositiveInteger(1) }],
    }),
    ...abilityScoreIncreaseChoiceOptionIds({
      abilityScope: {
        kind: "specific_abilities",
        abilities: ["str", "dex"],
      },
      maxScore: abilityScore(20),
      methods: [{ kind: "one_score", increase: PositiveInteger(1) }],
    }),
  ];
}
