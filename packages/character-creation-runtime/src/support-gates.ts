import { Either } from "effect";
import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  BARD_MULTICLASS_MUSICAL_INSTRUMENT_PROFICIENCY_CHOICE_KEY,
  BARD_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  CLASS_FEATURE_FEAT_CHOICE_KEY,
  CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  CLASS_FEATURE_PROFICIENCY_CHOICE_KEY,
  DIVINE_ORDER_CHOICE_KEY,
  CLASS_CANTRIP_CHOICE_KEY,
  CLASS_PREPARED_SPELL_CHOICE_KEY,
  CLASS_SUBCLASS_CHOICE_KEY,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
  ELDRITCH_INVOCATIONS_CHOICE_KEY,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  WIZARD_CANTRIP_CHOICE_KEY,
  WIZARD_PREPARED_SPELL_CHOICE_KEY,
  WIZARD_SPELLBOOK_CHOICE_KEY,
  LOADOUT_ARMOR_SLOT,
  LOADOUT_SHIELD_SLOT,
  LOADOUT_WEAPON_SLOT,
  PHASE1_ALIGNMENT_OPTION_ID,
  PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
  PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID,
  PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_SELECTION,
  PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID,
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
  PHASE1_BACKGROUND_TOOL_OPTION_ID,
  PHASE1_CLASS_EQUIPMENT_OPTION_ID,
  PHASE1_CLASS_FIGHTER_UNIT_ID,
  CLASS_TOOL_PROFICIENCY_CHOICE_KEY,
  PHASE1_LOADOUT_ARMOR_OPTION_ID,
  PHASE1_LOADOUT_SHIELD_OPTION_ID,
  PHASE1_LOADOUT_WEAPON_OPTION_ID,
  PHASE1_SHIELD_UNIT_ID,
  PHASE1_SPECIES_ORC_UNIT_ID,
  PHASE1_WEAPON_FLAIL_UNIT_ID,
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PRIMAL_ORDER_CHOICE_KEY,
  RANGER_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  ROGUE_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  SRD_LEVEL_ONE_CLASS_UNIT_IDS,
  progressionOptionId,
  SUPPORTED_BACKGROUND_OPTION_IDS,
  SUPPORTED_BACKGROUND_UNIT_IDS,
  SUPPORTED_FIGHTER_SKILL_OPTION_IDS,
  SUPPORTED_FIGHTING_STYLE_OPTION_IDS,
  SUPPORTED_LANGUAGE_OPTION_IDS,
  SUPPORTED_PURCHASE_OPTION_IDS,
  SUPPORTED_PURCHASE_UNIT_IDS,
  SUPPORTED_COIN_GRANT_PURCHASE_UNIT_IDS,
  SUPPORTED_SPECIES_OPTION_IDS,
  SUPPORTED_WEAPON_MASTERY_OPTION_IDS,
  WIDTH_CLASS_WIZARD_UNIT_ID,
  abilityScoreIncreaseChoiceOptionIds,
} from "./phase1-manifest.ts";
import { LEVEL_ONE_ELDRITCH_INVOCATION_OPTIONS } from "./eldritch-invocations.ts";
import type {
  BackgroundAbilityScoreIncreaseSelection,
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
} from "./types.ts";
import {
  classUnitId,
  characterProgressionEntry,
  startingClassUnitId,
  type CharacterProgression,
} from "./character-progression-types.ts";
import { characterClassLevel, SURFACE_SKILLS } from "@dnd/shared/game-facts";
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
  readonly equipmentPurchaseChoiceCount: 3;
  readonly coinEquipmentChoiceOptionIdsByUnitId: Partial<
    Record<UnitRecord["id"], readonly CreationChoiceOptionId[]>
  >;
  readonly loadoutChoices: readonly SupportedLoadoutChoice[];
  readonly manifest: {
    readonly backgroundUnitId: UnitRecord["id"];
    readonly speciesUnitId: UnitRecord["id"];
    readonly backgroundAbilityScoreIncrease: BackgroundAbilityScoreIncreaseSelection;
    readonly languages: CharacterStartingLanguages;
    readonly alignment: CharacterAlignment;
  };
  readonly supportedProgressions: readonly CharacterProgression[];
};

const SUPPORTED_DRAFT_CHOICE_PATHS = [
  "draft.progression.initial",
  "draft.background",
  "draft.species",
  "draft.languages",
  "draft.alignment",
] as const satisfies ReadonlyArray<CharacterDraftPath>;
type SupportedDraftChoicePath = (typeof SUPPORTED_DRAFT_CHOICE_PATHS)[number];

const SUPPORTED_PROGRESSIONS = [
  ...SRD_LEVEL_ONE_CLASS_UNIT_IDS.map(supportedLevelOneProgression),
  supportedSameClassSecondLevelProgression(PHASE1_CLASS_FIGHTER_UNIT_ID),
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
  return supportedTwoClassSecondLevelProgression(
    supportedClassUnitId,
    supportedClassUnitId,
  );
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
  "draft.languages": SUPPORTED_LANGUAGE_OPTION_IDS,
  "draft.alignment": [PHASE1_ALIGNMENT_OPTION_ID],
} as const satisfies Record<
  SupportedDraftChoicePath,
  readonly CreationChoiceOptionId[]
>;

const SUPPORTED_SKILL_PROFICIENCY_OPTION_IDS = SURFACE_SKILLS.map((skill) =>
  proficiencyGrantSubjectOptionId({ kind: "skill", skill }),
);
const SUPPORTED_PROFICIENCY_GRANT_OPTION_IDS = [
  ...SUPPORTED_SKILL_PROFICIENCY_OPTION_IDS,
  ...WEAPON_PROFICIENCY_CATEGORIES.map((category) =>
    proficiencyGrantSubjectOptionId({ kind: "weapon_category", category }),
  ),
  ...ARMOR_TRAINING_CATEGORIES.map((category) =>
    proficiencyGrantSubjectOptionId({ kind: "armor_category", category }),
  ),
  ...CHARACTER_BUILD_TOOL_PROFICIENCY_IDS.map((toolId) =>
    proficiencyGrantSubjectOptionId({ kind: "tool", toolId }),
  ),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
const SUPPORTED_MUSICAL_INSTRUMENT_PROFICIENCY_OPTION_IDS =
  MUSICAL_INSTRUMENT_TOOL_PROFICIENCY_IDS.map((toolId) =>
    proficiencyGrantSubjectOptionId({ kind: "tool", toolId }),
  );
const SUPPORTED_ABILITY_SCORE_INCREASE_OPTION_IDS =
  supportedAbilityScoreIncreaseOptionIds();

export const CHARACTER_CREATION_SUPPORT_PROFILE = {
  draftOptionIdsByPath: SUPPORTED_DRAFT_OPTION_IDS_BY_PATH,
  unitOptionIdsByChoiceKey: {
    [CLASS_FEATURE_FEAT_CHOICE_KEY]: [
      ...SUPPORTED_FIGHTING_STYLE_OPTION_IDS,
      creationChoiceOptionId("feat_ability_score_improvement"),
      creationChoiceOptionId("feat_boon_of_combat_prowess"),
    ],
    [CLASS_SUBCLASS_CHOICE_KEY]: [
      creationChoiceOptionId("subclass_fighter_champion"),
      creationChoiceOptionId("subclass_wizard_evoker"),
    ],
    [CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY]:
      SUPPORTED_ABILITY_SCORE_INCREASE_OPTION_IDS,
    [CLASS_FEATURE_PROFICIENCY_CHOICE_KEY]:
      SUPPORTED_PROFICIENCY_GRANT_OPTION_IDS,
    [DIVINE_ORDER_CHOICE_KEY]: [creationChoiceOptionId("protector")],
    [PRIMAL_ORDER_CHOICE_KEY]: [creationChoiceOptionId("warden")],
    [CLASS_TOOL_PROFICIENCY_CHOICE_KEY]: SUPPORTED_PROFICIENCY_GRANT_OPTION_IDS,
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
    [WEAPON_MASTERY_OPTIONS_CHOICE_KEY]: SUPPORTED_WEAPON_MASTERY_OPTION_IDS,
    [WIZARD_CANTRIP_CHOICE_KEY]: [
      creationChoiceOptionId("light"),
      creationChoiceOptionId("fire_bolt"),
      creationChoiceOptionId("ray_of_frost"),
    ],
    [WIZARD_SPELLBOOK_CHOICE_KEY]: [
      creationChoiceOptionId("detect_magic"),
      creationChoiceOptionId("mage_armor"),
      creationChoiceOptionId("magic_missile"),
      creationChoiceOptionId("shield"),
      creationChoiceOptionId("sleep"),
      creationChoiceOptionId("thunderwave"),
    ],
    [WIZARD_PREPARED_SPELL_CHOICE_KEY]: [
      creationChoiceOptionId("detect_magic"),
      creationChoiceOptionId("mage_armor"),
      creationChoiceOptionId("magic_missile"),
      creationChoiceOptionId("sleep"),
    ],
    [BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY]: [
      PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID,
    ],
    [BACKGROUND_TOOL_CHOICE_KEY]: [PHASE1_BACKGROUND_TOOL_OPTION_ID],
    [EQUIPMENT_PURCHASE_CHOICE_KEY]: SUPPORTED_PURCHASE_OPTION_IDS,
  },
  backgroundUnitIds: SUPPORTED_BACKGROUND_UNIT_IDS,
  purchasableEquipmentUnitIds: SUPPORTED_PURCHASE_UNIT_IDS,
  equipmentPurchaseChoiceCount: 3,
  coinEquipmentChoiceOptionIdsByUnitId: {
    ...Object.fromEntries(
      SRD_LEVEL_ONE_CLASS_UNIT_IDS.map((classUnitId) => [
        classUnitId,
        [creationChoiceOptionId("option_b")],
      ]),
    ),
    [PHASE1_CLASS_FIGHTER_UNIT_ID]: [PHASE1_CLASS_EQUIPMENT_OPTION_ID],
    [PHASE1_BACKGROUND_SOLDIER_UNIT_ID]: [
      PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID,
    ],
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
      unitId: PHASE1_WEAPON_FLAIL_UNIT_ID,
      optionId: PHASE1_LOADOUT_WEAPON_OPTION_ID,
      label: "Wielded one-handed",
      buildSlot: "weapon",
      grip: "one_handed",
    },
  ],
  manifest: {
    backgroundUnitId: PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
    speciesUnitId: PHASE1_SPECIES_ORC_UNIT_ID,
    backgroundAbilityScoreIncrease:
      PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_SELECTION,
    languages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
  },
  supportedProgressions: SUPPORTED_PROGRESSIONS,
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
      source.choiceKey === CLASS_PREPARED_SPELL_CHOICE_KEY)
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
    const coinEquipmentChoices =
      CHARACTER_CREATION_SUPPORT_PROFILE.coinEquipmentChoiceOptionIdsByUnitId as Partial<
        Record<UnitRecord["id"], readonly CreationChoiceOptionId[]>
      >;
    return coinEquipmentChoices[source.unitId] ?? [];
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

export function unitRefsForSupportedClassChoice(
  source: UnitChoiceSource,
  options: readonly { readonly unitRef?: UnitRef }[],
): readonly UnitRecord["id"][] {
  if (
    source.choiceKey !== CLASS_FEATURE_FEAT_CHOICE_KEY &&
    source.choiceKey !== CLASS_SUBCLASS_CHOICE_KEY &&
    source.choiceKey !== WEAPON_MASTERY_OPTIONS_CHOICE_KEY
  ) {
    return [];
  }

  return options.flatMap((option) =>
    option.unitRef == null ? [] : [option.unitRef.unitId],
  );
}

function supportedAbilityScoreIncreaseOptionIds(): readonly CreationChoiceOptionId[] {
  return [
    ...abilityScoreIncreaseChoiceOptionIds({
      maxScore: 20,
      methods: [
        { kind: "one_score", increase: 2 },
        { kind: "two_scores", primaryIncrease: 1, secondaryIncrease: 1 },
      ],
    }),
    ...abilityScoreIncreaseChoiceOptionIds({
      maxScore: 30,
      methods: [{ kind: "one_score", increase: 1 }],
    }),
  ];
}
