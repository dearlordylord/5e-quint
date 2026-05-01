import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  advancementOptionId,
  CLASS_EQUIPMENT_CHOICE_KEY,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
  FIGHTER_FIGHTING_STYLE_CHOICE_KEY,
  FIGHTER_SKILL_CHOICE_KEY,
  FIGHTER_WEAPON_MASTERY_CHOICE_KEY,
  WIZARD_CANTRIP_CHOICE_KEY,
  WIZARD_PREPARED_SPELL_CHOICE_KEY,
  WIZARD_SKILL_CHOICE_KEY,
  WIZARD_SPELLBOOK_CHOICE_KEY,
  LOADOUT_ARMOR_CHOICE_KEY,
  LOADOUT_SHIELD_CHOICE_KEY,
  LOADOUT_WEAPON_CHOICE_KEY,
  PHASE1_ALIGNMENT_OPTION_ID,
  PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
  PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID,
  PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_SELECTION,
  PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID,
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
  PHASE1_BACKGROUND_TOOL_OPTION_ID,
  PHASE1_CLASS_EQUIPMENT_OPTION_ID,
  PHASE1_CLASS_FIGHTER_UNIT_ID,
  PHASE1_LOADOUT_ARMOR_OPTION_ID,
  PHASE1_LOADOUT_SHIELD_OPTION_ID,
  PHASE1_LOADOUT_WEAPON_OPTION_ID,
  PHASE1_SHIELD_UNIT_ID,
  PHASE1_SPECIES_ORC_UNIT_ID,
  PHASE1_WEAPON_FLAIL_UNIT_ID,
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  SUPPORTED_BACKGROUND_OPTION_IDS,
  SUPPORTED_BACKGROUND_UNIT_IDS,
  SUPPORTED_CLASS_OPTION_IDS,
  SUPPORTED_CLASS_UNIT_IDS,
  SUPPORTED_FIGHTER_SKILL_OPTION_IDS,
  SUPPORTED_FIGHTING_STYLE_OPTION_IDS,
  SUPPORTED_LANGUAGE_OPTION_IDS,
  SUPPORTED_PURCHASE_OPTION_IDS,
  SUPPORTED_PURCHASE_UNIT_IDS,
  SUPPORTED_SPECIES_OPTION_IDS,
  SUPPORTED_WEAPON_MASTERY_OPTION_IDS,
  WIDTH_CLASS_WIZARD_UNIT_ID,
} from "./phase1-manifest.ts";
import type {
  BackgroundAbilityScoreIncreaseSelection,
  CharacterAdvancementEntry,
  CharacterAlignment,
  CharacterBuildEquipment,
  CharacterDraftPath,
  CharacterStartingLanguages,
  CreationChoiceOptionId,
  CreationHole,
  UnitChoiceKey,
  UnitChoiceSource,
  UnitRef,
} from "./types.ts";
import { creationChoiceOptionId } from "./types.ts";
import type { UnitRecord } from "@dnd/surface/surface/types";

type DraftSourcedCreationHole = CreationHole & {
  readonly source: Extract<CreationHole["source"], { readonly tag: "draft" }>;
};

export type SupportedLoadoutChoice =
  | {
      readonly choiceKey: typeof LOADOUT_ARMOR_CHOICE_KEY;
      readonly unitId: UnitRecord["id"];
      readonly optionId: CreationChoiceOptionId;
      readonly label: string;
      readonly buildSlot: "armor";
    }
  | {
      readonly choiceKey: typeof LOADOUT_SHIELD_CHOICE_KEY;
      readonly unitId: UnitRecord["id"];
      readonly optionId: CreationChoiceOptionId;
      readonly label: string;
      readonly buildSlot: "shield";
    }
  | {
      readonly choiceKey: typeof LOADOUT_WEAPON_CHOICE_KEY;
      readonly unitId: UnitRecord["id"];
      readonly optionId: CreationChoiceOptionId;
      readonly label: string;
      readonly buildSlot: "weapon";
      readonly grip: NonNullable<CharacterBuildEquipment["weapon"]>["grip"];
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
  readonly unitOptionIdsByChoiceKey: Record<
    SupportProfileUnitChoiceKey,
    readonly CreationChoiceOptionId[]
  >;
  readonly classUnitIds: readonly UnitRecord["id"][];
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
  readonly supportedAdvancements: readonly CharacterAdvancementEntry[];
};

const SUPPORTED_DRAFT_CHOICE_PATHS = [
  "draft.primaryClass",
  "draft.advancement.initial",
  "draft.background",
  "draft.species",
  "draft.languages",
  "draft.alignment",
] as const satisfies ReadonlyArray<CharacterDraftPath>;
type SupportedDraftChoicePath = (typeof SUPPORTED_DRAFT_CHOICE_PATHS)[number];

const SUPPORTED_ADVANCEMENTS = [
  { classUnitId: PHASE1_CLASS_FIGHTER_UNIT_ID, level: 1 },
  { classUnitId: PHASE1_CLASS_FIGHTER_UNIT_ID, level: 2 },
  { classUnitId: WIDTH_CLASS_WIZARD_UNIT_ID, level: 1 },
] as const satisfies ReadonlyArray<CharacterAdvancementEntry>;

const SUPPORTED_DRAFT_OPTION_IDS_BY_PATH = {
  "draft.primaryClass": SUPPORTED_CLASS_OPTION_IDS,
  "draft.advancement.initial": SUPPORTED_ADVANCEMENTS.map(advancementOptionId),
  "draft.background": SUPPORTED_BACKGROUND_OPTION_IDS,
  "draft.species": SUPPORTED_SPECIES_OPTION_IDS,
  "draft.languages": SUPPORTED_LANGUAGE_OPTION_IDS,
  "draft.alignment": [PHASE1_ALIGNMENT_OPTION_ID],
} as const satisfies Record<
  SupportedDraftChoicePath,
  readonly CreationChoiceOptionId[]
>;

export const CHARACTER_CREATION_SUPPORT_PROFILE = {
  draftOptionIdsByPath: SUPPORTED_DRAFT_OPTION_IDS_BY_PATH,
  unitOptionIdsByChoiceKey: {
    [FIGHTER_SKILL_CHOICE_KEY]: SUPPORTED_FIGHTER_SKILL_OPTION_IDS,
    [FIGHTER_FIGHTING_STYLE_CHOICE_KEY]: SUPPORTED_FIGHTING_STYLE_OPTION_IDS,
    [FIGHTER_WEAPON_MASTERY_CHOICE_KEY]: SUPPORTED_WEAPON_MASTERY_OPTION_IDS,
    [WIZARD_SKILL_CHOICE_KEY]: [
      creationChoiceOptionId("arcana"),
      creationChoiceOptionId("history"),
    ],
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
    [LOADOUT_ARMOR_CHOICE_KEY]: [PHASE1_LOADOUT_ARMOR_OPTION_ID],
    [LOADOUT_SHIELD_CHOICE_KEY]: [PHASE1_LOADOUT_SHIELD_OPTION_ID],
    [LOADOUT_WEAPON_CHOICE_KEY]: [PHASE1_LOADOUT_WEAPON_OPTION_ID],
  },
  classUnitIds: SUPPORTED_CLASS_UNIT_IDS,
  backgroundUnitIds: SUPPORTED_BACKGROUND_UNIT_IDS,
  purchasableEquipmentUnitIds: SUPPORTED_PURCHASE_UNIT_IDS,
  equipmentPurchaseChoiceCount: 3,
  coinEquipmentChoiceOptionIdsByUnitId: {
    [PHASE1_CLASS_FIGHTER_UNIT_ID]: [PHASE1_CLASS_EQUIPMENT_OPTION_ID],
    [WIDTH_CLASS_WIZARD_UNIT_ID]: [creationChoiceOptionId("option_b")],
    [PHASE1_BACKGROUND_SOLDIER_UNIT_ID]: [
      PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID,
    ],
  },
  loadoutChoices: [
    {
      choiceKey: LOADOUT_ARMOR_CHOICE_KEY,
      unitId: PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
      optionId: PHASE1_LOADOUT_ARMOR_OPTION_ID,
      label: "Worn",
      buildSlot: "armor",
    },
    {
      choiceKey: LOADOUT_SHIELD_CHOICE_KEY,
      unitId: PHASE1_SHIELD_UNIT_ID,
      optionId: PHASE1_LOADOUT_SHIELD_OPTION_ID,
      label: "Wielded",
      buildSlot: "shield",
    },
    {
      choiceKey: LOADOUT_WEAPON_CHOICE_KEY,
      unitId: PHASE1_WEAPON_LONGSWORD_UNIT_ID,
      optionId: PHASE1_LOADOUT_WEAPON_OPTION_ID,
      label: "Wielded one-handed",
      buildSlot: "weapon",
      grip: "one_handed",
    },
    {
      choiceKey: LOADOUT_WEAPON_CHOICE_KEY,
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
  supportedAdvancements: SUPPORTED_ADVANCEMENTS,
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
    return supportedDraftOptionIds({ ...hole, source });
  }

  return supportedUnitOptionIdsForSource(source);
}

export function supportedDraftOptionIds(
  hole: DraftSourcedCreationHole,
): readonly CreationChoiceOptionId[] | undefined {
  if (isSupportedDraftChoicePath(hole.source.path)) {
    return CHARACTER_CREATION_SUPPORT_PROFILE.draftOptionIdsByPath[
      hole.source.path
    ];
  }

  if (hole.kind === "choice") {
    throw new Error(
      `Draft choice path ${hole.source.path} has no support gate.`,
    );
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

// Current support-slice filter, not RAW legality. This is the character
// creation equivalent of battle-runtime's Attack action option support gate: legal
// SRD-legal catalog choices may be discoverable, but finalization only accepts the
// subset this reducer can currently project and execute. This should shrink as
// character creation support widens beyond the current profile.
export function supportedUnitOptionIds(
  choiceKey: SupportProfileUnitChoiceKey,
): readonly CreationChoiceOptionId[] {
  return CHARACTER_CREATION_SUPPORT_PROFILE.unitOptionIdsByChoiceKey[choiceKey];
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

  return supportedUnitOptionIds(source.choiceKey);
}

export function supportedHoleOptionIdSet(
  hole: CreationHole,
): ReadonlySet<CreationChoiceOptionId> | undefined {
  const optionIds = supportedHoleOptionIds(hole);
  return optionIds == null ? undefined : new Set(optionIds);
}

export function supportedClassUnitIds(): readonly UnitRecord["id"][] {
  return CHARACTER_CREATION_SUPPORT_PROFILE.classUnitIds;
}

export function supportedBackgroundUnitIds(): readonly UnitRecord["id"][] {
  return CHARACTER_CREATION_SUPPORT_PROFILE.backgroundUnitIds;
}

export function supportedPurchasableEquipmentUnitIds(): readonly UnitRecord["id"][] {
  return CHARACTER_CREATION_SUPPORT_PROFILE.purchasableEquipmentUnitIds;
}

export function supportedEquipmentPurchaseChoiceCount(): number {
  return CHARACTER_CREATION_SUPPORT_PROFILE.equipmentPurchaseChoiceCount;
}

export function supportedLoadoutChoices(): readonly SupportedLoadoutChoice[] {
  return CHARACTER_CREATION_SUPPORT_PROFILE.loadoutChoices;
}

export function isSupportedAdvancement(
  classUnitId: UnitRecord["id"],
  level: number,
): boolean {
  return CHARACTER_CREATION_SUPPORT_PROFILE.supportedAdvancements.some(
    (advancement) =>
      advancement.classUnitId === classUnitId && advancement.level === level,
  );
}

export function supportedAdvancementsForClass(
  classUnitId: UnitRecord["id"],
): readonly CharacterAdvancementEntry[] {
  return CHARACTER_CREATION_SUPPORT_PROFILE.supportedAdvancements.filter(
    (advancement) => advancement.classUnitId === classUnitId,
  );
}

export function supportedAdvancementForOptionId(
  optionId: CreationChoiceOptionId,
): CharacterAdvancementEntry | undefined {
  return CHARACTER_CREATION_SUPPORT_PROFILE.supportedAdvancements.find(
    (advancement) => advancementOptionId(advancement) === optionId,
  );
}

export function supportedLoadoutChoiceForSource(
  source: UnitChoiceSource,
): SupportedLoadoutChoice | undefined {
  return CHARACTER_CREATION_SUPPORT_PROFILE.loadoutChoices.find(
    (choice) =>
      choice.unitId === source.unitId && choice.choiceKey === source.choiceKey,
  );
}

export function unitRefsForSupportedClassChoice(
  source: UnitChoiceSource,
  options: readonly { readonly unitRef?: UnitRef }[],
): readonly UnitRecord["id"][] {
  if (source.choiceKey !== FIGHTER_FIGHTING_STYLE_CHOICE_KEY) {
    return [];
  }

  return options.flatMap((option) =>
    option.unitRef == null ? [] : [option.unitRef.unitId],
  );
}
