import {
  creationChoiceOptionId,
  type BackgroundAbilityScoreIncreaseSelection,
  type CharacterDraftPath,
  type ChoiceCardinality,
  type ChoiceCount,
  type CreationChoiceOptionId,
  type UnitChoiceKey,
} from "./types.ts";
import { backgroundAbilityScoreIncreaseOptionId } from "./hole-factories.ts";
import {
  computeTotalLevel,
  finalAdvancementEntry,
  hitPointRuleOptionSuffix,
  startingClassUnitId,
} from "./character-progression-types.ts";
import type { CharacterProgression } from "./character-progression-types.ts";
import { SURFACE_ABILITIES } from "@dnd/shared/game-facts";
import type { UnitRecord } from "@dnd/surface/surface/types";

export const INITIAL_CHARACTER_DRAFT_PATHS = [
  "draft.progression.initial",
  "draft.background",
  "draft.species",
  "draft.abilityScoreGeneration",
  "draft.languages",
  "draft.alignment",
] as const satisfies ReadonlyArray<CharacterDraftPath>;

// This manifest started as the first supported character-creation vertical from
// plans/phase1-fighter-manifest.md: an Orc Soldier Fighter using Standard
// Array, fixed first-slice languages/alignment, level-1 Fighter choices, Chain
// Mail + Shield + one-handed Longsword, and the Goblin Warrior battle setup.
// Hole discovery may expose broader legal SRD options, but finalization is
// intentionally gated to the support profile that now widens selected class
// facts while keeping Orc/Soldier origin facts manifest-owned.
export const PHASE1_CLASS_FIGHTER_UNIT_ID = "class_fighter";
export const WIDTH_CLASS_WIZARD_UNIT_ID = "class_wizard";
export const PHASE1_BACKGROUND_SOLDIER_UNIT_ID = "background_soldier";
export const PHASE1_SPECIES_ORC_UNIT_ID = "species_orc";
export const PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID = "armor_chain_mail";
export const PHASE1_WEAPON_LONGSWORD_UNIT_ID = "weapon_longsword";
export const PHASE1_WEAPON_DAGGER_UNIT_ID = "weapon_dagger";
export const PHASE1_WEAPON_SPEAR_UNIT_ID = "weapon_spear";
export const PHASE1_WEAPON_FLAIL_UNIT_ID = "weapon_flail";
export const PHASE1_SHIELD_UNIT_ID = "equipment_shield";
export const PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID = "defense";

export const SUPPORTED_BACKGROUND_UNIT_IDS = [
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
export const SUPPORTED_PURCHASE_UNIT_IDS = [
  PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_WEAPON_DAGGER_UNIT_ID,
  PHASE1_WEAPON_FLAIL_UNIT_ID,
  PHASE1_SHIELD_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
export function progressionOptionId(
  progression: CharacterProgression,
): CreationChoiceOptionId {
  const totalLevel = computeTotalLevel(progression);
  const rule =
    finalAdvancementEntry(progression)?.hitPointRule ??
    ({ tag: "levelOneMaximumHitDie" } as const);
  return creationChoiceOptionId(
    `${startingClassUnitId(progression)}:level_${totalLevel}:${hitPointRuleOptionSuffix(rule)}`,
  );
}
export const SUPPORTED_BACKGROUND_OPTION_IDS = [
  creationChoiceOptionId(PHASE1_BACKGROUND_SOLDIER_UNIT_ID),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
export const SUPPORTED_SPECIES_OPTION_IDS = [
  creationChoiceOptionId(PHASE1_SPECIES_ORC_UNIT_ID),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
export const SUPPORTED_PURCHASE_OPTION_IDS = SUPPORTED_PURCHASE_UNIT_IDS.map(
  creationChoiceOptionId,
);
export const SUPPORTED_FIGHTER_SKILL_OPTION_IDS = [
  creationChoiceOptionId("perception"),
  creationChoiceOptionId("survival"),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
export const SUPPORTED_FIGHTING_STYLE_OPTION_IDS = [
  creationChoiceOptionId(PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
export const PHASE1_WEAPON_MASTERY_UNIT_IDS = [
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_WEAPON_SPEAR_UNIT_ID,
  PHASE1_WEAPON_FLAIL_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
export const SUPPORTED_WEAPON_MASTERY_OPTION_IDS = [
  ...PHASE1_WEAPON_MASTERY_UNIT_IDS.map(creationChoiceOptionId),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
export const SUPPORTED_LANGUAGE_OPTION_IDS = [
  creationChoiceOptionId("Dwarvish"),
  creationChoiceOptionId("Goblin"),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;

export const PHASE1_CLASS_EQUIPMENT_OPTION_ID =
  creationChoiceOptionId("option_c");
export const PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID =
  creationChoiceOptionId("option_b");
export const PHASE1_BACKGROUND_TOOL_OPTION_ID =
  creationChoiceOptionId("tool_dice_set");
export const PHASE1_LOADOUT_ARMOR_OPTION_ID = creationChoiceOptionId("worn");
export const PHASE1_LOADOUT_SHIELD_OPTION_ID =
  creationChoiceOptionId("wielded");
export const PHASE1_LOADOUT_WEAPON_OPTION_ID =
  creationChoiceOptionId("wielded_one_handed");
export const PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_SELECTION = {
  kind: "twoAndOne",
  plusTwo: "str",
  plusOne: "con",
} as const satisfies BackgroundAbilityScoreIncreaseSelection;
export const PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID =
  backgroundAbilityScoreIncreaseOptionId(
    PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_SELECTION,
  );
export const PHASE1_ALIGNMENT_OPTION_ID = creationChoiceOptionId("lawful_good");

export const BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY =
  "background_ability_score_increase" satisfies UnitChoiceKey;
export const BACKGROUND_TOOL_CHOICE_KEY =
  "background_tool_choice" satisfies UnitChoiceKey;
export const CLASS_EQUIPMENT_CHOICE_KEY =
  "class_equipment_choice" satisfies UnitChoiceKey;
export const BACKGROUND_EQUIPMENT_CHOICE_KEY =
  "background_equipment_choice" satisfies UnitChoiceKey;
export const EQUIPMENT_PURCHASE_CHOICE_KEY =
  "equipment_purchase" satisfies UnitChoiceKey;
export const FIGHTER_SKILL_CHOICE_KEY =
  "fighter_skill_choices" satisfies UnitChoiceKey;
export const FIGHTER_FIGHTING_STYLE_CHOICE_KEY =
  "fighter_fighting_style" satisfies UnitChoiceKey;
export const FIGHTER_WEAPON_MASTERY_CHOICE_KEY =
  "fighter_weapon_mastery_choices" satisfies UnitChoiceKey;
export const WIZARD_SKILL_CHOICE_KEY =
  "wizard_skill_choices" satisfies UnitChoiceKey;
export const WIZARD_CANTRIP_CHOICE_KEY =
  "wizard_cantrip_choices" satisfies UnitChoiceKey;
export const WIZARD_SPELLBOOK_CHOICE_KEY =
  "wizard_spellbook_choices" satisfies UnitChoiceKey;
export const WIZARD_PREPARED_SPELL_CHOICE_KEY =
  "wizard_prepared_spell_choices" satisfies UnitChoiceKey;
export const LOADOUT_ARMOR_CHOICE_KEY = "loadout_armor" satisfies UnitChoiceKey;
export const LOADOUT_SHIELD_CHOICE_KEY =
  "loadout_shield" satisfies UnitChoiceKey;
export const LOADOUT_WEAPON_CHOICE_KEY =
  "loadout_weapon" satisfies UnitChoiceKey;
export const EXACTLY_ONE_CHOICE = {
  tag: "exactly",
  count: 1 as ChoiceCount,
} as const satisfies ChoiceCardinality;

export { SURFACE_ABILITIES };
