import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
  FIGHTER_FIGHTING_STYLE_CHOICE_KEY,
  FIGHTER_SKILL_CHOICE_KEY,
  FIGHTER_WEAPON_MASTERY_CHOICE_KEY,
  LOADOUT_ARMOR_CHOICE_KEY,
  LOADOUT_SHIELD_CHOICE_KEY,
  LOADOUT_WEAPON_CHOICE_KEY,
  PHASE1_ALIGNMENT_OPTION_ID,
  PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID,
  PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID,
  PHASE1_BACKGROUND_TOOL_OPTION_ID,
  PHASE1_CLASS_EQUIPMENT_OPTION_ID,
  PHASE1_LOADOUT_ARMOR_OPTION_ID,
  PHASE1_LOADOUT_SHIELD_OPTION_ID,
  PHASE1_LOADOUT_WEAPON_OPTION_ID,
  SUPPORTED_BACKGROUND_OPTION_IDS,
  SUPPORTED_CLASS_OPTION_IDS,
  SUPPORTED_FIGHTER_SKILL_OPTION_IDS,
  SUPPORTED_FIGHTING_STYLE_OPTION_IDS,
  SUPPORTED_LANGUAGE_OPTION_IDS,
  SUPPORTED_PURCHASE_OPTION_IDS,
  SUPPORTED_SPECIES_OPTION_IDS,
  SUPPORTED_WEAPON_MASTERY_OPTION_IDS,
} from "./phase1-manifest.ts";
import type {
  CharacterDraftPath,
  CreationChoiceOptionId,
  CreationHole,
  UnitChoiceKey,
} from "./types.ts";

export function unsupportedHoleSelectionOptionId(
  hole: CreationHole,
  optionIds: readonly CreationChoiceOptionId[],
): CreationChoiceOptionId | undefined {
  const supportedOptionIds = supportedHoleOptionIds(hole);
  if (supportedOptionIds == null) {
    return undefined;
  }

  return optionIds.find((optionId) => !supportedOptionIds.includes(optionId));
}

export function supportedHoleOptionIds(
  hole: CreationHole,
): readonly CreationChoiceOptionId[] | undefined {
  if (hole.source.tag === "draft") {
    return supportedDraftOptionIds(hole);
  }

  return supportedUnitOptionIds(hole.source.choiceKey);
}

const SUPPORTED_DRAFT_CHOICE_PATHS = [
  "draft.primaryClass",
  "draft.background",
  "draft.species",
  "draft.languages",
  "draft.alignment",
] as const satisfies ReadonlyArray<CharacterDraftPath>;
type SupportedDraftChoicePath = (typeof SUPPORTED_DRAFT_CHOICE_PATHS)[number];

const SUPPORTED_DRAFT_OPTION_IDS_BY_PATH = {
  "draft.primaryClass": SUPPORTED_CLASS_OPTION_IDS,
  "draft.background": SUPPORTED_BACKGROUND_OPTION_IDS,
  "draft.species": SUPPORTED_SPECIES_OPTION_IDS,
  "draft.languages": SUPPORTED_LANGUAGE_OPTION_IDS,
  "draft.alignment": [PHASE1_ALIGNMENT_OPTION_ID],
} as const satisfies Record<
  SupportedDraftChoicePath,
  readonly CreationChoiceOptionId[]
>;

export function supportedDraftOptionIds(
  hole: CreationHole,
): readonly CreationChoiceOptionId[] | undefined {
  if (hole.source.tag !== "draft") {
    throw new Error("Expected draft-sourced character creation hole.");
  }

  if (isSupportedDraftChoicePath(hole.source.path)) {
    return SUPPORTED_DRAFT_OPTION_IDS_BY_PATH[hole.source.path];
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

const SUPPORTED_UNIT_OPTION_IDS_BY_KEY = {
  [FIGHTER_SKILL_CHOICE_KEY]: SUPPORTED_FIGHTER_SKILL_OPTION_IDS,
  [FIGHTER_FIGHTING_STYLE_CHOICE_KEY]: SUPPORTED_FIGHTING_STYLE_OPTION_IDS,
  [FIGHTER_WEAPON_MASTERY_CHOICE_KEY]: SUPPORTED_WEAPON_MASTERY_OPTION_IDS,
  [BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY]: [
    PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID,
  ],
  [BACKGROUND_TOOL_CHOICE_KEY]: [PHASE1_BACKGROUND_TOOL_OPTION_ID],
  [CLASS_EQUIPMENT_CHOICE_KEY]: [PHASE1_CLASS_EQUIPMENT_OPTION_ID],
  [BACKGROUND_EQUIPMENT_CHOICE_KEY]: [PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID],
  [EQUIPMENT_PURCHASE_CHOICE_KEY]: SUPPORTED_PURCHASE_OPTION_IDS,
  [LOADOUT_ARMOR_CHOICE_KEY]: [PHASE1_LOADOUT_ARMOR_OPTION_ID],
  [LOADOUT_SHIELD_CHOICE_KEY]: [PHASE1_LOADOUT_SHIELD_OPTION_ID],
  [LOADOUT_WEAPON_CHOICE_KEY]: [PHASE1_LOADOUT_WEAPON_OPTION_ID],
} as const satisfies Record<UnitChoiceKey, readonly CreationChoiceOptionId[]>;

// Current support-slice filter, not RAW legality. This is the character
// creation equivalent of battle-runtime's supportedAttackProfile: legal
// Surface/RAW choices may be discoverable, but finalization only accepts the
// subset this reducer can currently project and execute. This should shrink as
// character creation support widens beyond the Phase 1 manifest.
export function supportedUnitOptionIds(
  choiceKey: UnitChoiceKey,
): readonly CreationChoiceOptionId[] {
  return SUPPORTED_UNIT_OPTION_IDS_BY_KEY[choiceKey];
}
