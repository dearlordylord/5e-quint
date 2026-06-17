import {
  creationChoiceOptionId,
  type BackgroundAbilityScoreIncreaseSelection,
  CHARACTER_SPECIES_SIZE_SELECTIONS,
  type CharacterDraftPath,
  type ChoiceCardinality,
  type ChoiceCount,
  type CreationChoiceOption,
  type CreationChoiceOptionId,
  type LoadoutSlot,
  type UnitChoiceKey,
} from "./types.ts";
import {
  abilityScoreIncreaseOneScoreOptionId,
  requireAbilityScoreIncreaseTwoScoresOptionId,
} from "./choice-option-codecs.ts";
import { backgroundAbilityScoreIncreaseOptionId } from "./hole-factories.ts";
import {
  computeTotalLevel,
  finalAdvancementEntry,
  hitPointRuleOptionSuffix,
  startingClassUnitId,
} from "./character-progression-types.ts";
import type { CharacterProgression } from "./character-progression-types.ts";
import { Match } from "effect";
import { SURFACE_ABILITIES } from "@dnd/shared/game-facts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY as SURFACE_SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY } from "@dnd/surface/surface/schema";

export const INITIAL_CHARACTER_DRAFT_PATHS = [
  "draft.progression.initial",
  "draft.background",
  "draft.species",
  "draft.abilityScoreGeneration",
  "draft.speciesSize",
  "draft.draconicAncestry",
  "draft.languages",
  "draft.alignment",
] as const satisfies ReadonlyArray<CharacterDraftPath>;

// This manifest started as the first supported character-creation vertical from
// plans/phase1-fighter-manifest.md: an Orc Soldier Fighter using Standard
// Array, fixed initial languages/alignment, level-1 Fighter choices, Chain
// Mail + Shield + one-handed Longsword, and the Goblin Warrior battle setup.
// Hole discovery may expose broader legal SRD options, but finalization is
// intentionally gated to the support profile: selected class facts, selected
// Background origin facts, SRD species admission, and the remaining
// manifest-owned languages/alignment/equipment projections.
export const PHASE1_CLASS_FIGHTER_UNIT_ID = "class_fighter";
export const SRD_BARD_CLASS_UNIT_ID = "class_bard";
export const SRD_CLERIC_CLASS_UNIT_ID = "class_cleric";
export const SRD_DRUID_CLASS_UNIT_ID = "class_druid";
export const SRD_MONK_CLASS_UNIT_ID = "class_monk";
export const WIDTH_CLASS_WIZARD_UNIT_ID = "class_wizard";
export const SRD_ROGUE_CLASS_UNIT_ID = "class_rogue";
export const SRD_SORCERER_CLASS_UNIT_ID = "class_sorcerer";
export const SRD_PALADIN_CLASS_UNIT_ID = "class_paladin";
export const SRD_RANGER_CLASS_UNIT_ID = "class_ranger";
export const SRD_LEVEL_ONE_CLASS_UNIT_IDS = [
  "class_barbarian",
  SRD_BARD_CLASS_UNIT_ID,
  SRD_CLERIC_CLASS_UNIT_ID,
  SRD_DRUID_CLASS_UNIT_ID,
  PHASE1_CLASS_FIGHTER_UNIT_ID,
  SRD_MONK_CLASS_UNIT_ID,
  SRD_PALADIN_CLASS_UNIT_ID,
  SRD_RANGER_CLASS_UNIT_ID,
  SRD_ROGUE_CLASS_UNIT_ID,
  SRD_SORCERER_CLASS_UNIT_ID,
  "class_warlock",
  WIDTH_CLASS_WIZARD_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
export const SRD_LEVEL_THREE_SUBCLASS_UNIT_IDS = [
  "subclass_barbarian_path_of_the_berserker",
  "subclass_bard_college_of_lore",
  "subclass_cleric_life_domain",
  "subclass_druid_circle_of_the_land",
  "subclass_fighter_champion",
  "subclass_monk_warrior_of_the_open_hand",
  "subclass_paladin_oath_of_devotion",
  "subclass_ranger_hunter",
  "subclass_rogue_thief",
  "subclass_sorcerer_draconic_sorcery",
  "subclass_warlock_fiend_patron",
  "subclass_wizard_evoker",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
export const PHASE1_BACKGROUND_SOLDIER_UNIT_ID = "background_soldier";
export const SRD_CHARACTER_ADMISSION_BACKGROUND_UNIT_IDS = [
  "background_acolyte",
  "background_criminal",
  "background_sage",
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
export const PHASE1_SPECIES_ORC_UNIT_ID = "species_orc";
export const SRD_CHARACTER_ADMISSION_SPECIES_UNIT_IDS = [
  "species_dragonborn",
  "species_dwarf",
  "species_elf",
  "species_halfling",
  "species_human",
  "species_goliath",
  PHASE1_SPECIES_ORC_UNIT_ID,
  "species_tiefling",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
export const PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID = "armor_chain_mail";
export const PHASE1_WEAPON_LONGSWORD_UNIT_ID = "weapon_longsword";
export const PHASE1_WEAPON_DAGGER_UNIT_ID = "weapon_dagger";
export const PHASE1_WEAPON_SPEAR_UNIT_ID = "weapon_spear";
export const PHASE1_WEAPON_FLAIL_UNIT_ID = "weapon_flail";
export const PHASE1_WEAPON_SHORTSWORD_UNIT_ID = "weapon_shortsword";
export const PHASE1_SHIELD_UNIT_ID = "equipment_shield";
export const PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID = "defense";
export const PHASE1_FIGHTING_STYLE_ARCHERY_UNIT_ID = "feat_archery";

export const SUPPORTED_BACKGROUND_UNIT_IDS =
  SRD_CHARACTER_ADMISSION_BACKGROUND_UNIT_IDS;
export const SUPPORTED_PURCHASE_UNIT_IDS = [
  PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_WEAPON_DAGGER_UNIT_ID,
  PHASE1_WEAPON_FLAIL_UNIT_ID,
  PHASE1_SHIELD_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
export const SUPPORTED_COIN_GRANT_PURCHASE_UNIT_IDS = [
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_WEAPON_DAGGER_UNIT_ID,
  PHASE1_SHIELD_UNIT_ID,
  PHASE1_WEAPON_FLAIL_UNIT_ID,
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
export function progressionOptionId(
  progression: CharacterProgression,
): CreationChoiceOptionId {
  const totalLevel = computeTotalLevel(progression);
  const rule =
    finalAdvancementEntry(progression)?.hitPointRule ??
    ({ tag: "levelOneMaximumHitDie" } as const);
  return creationChoiceOptionId(
    `${progressionOptionClassPath(progression)}:level_${totalLevel}:${hitPointRuleOptionSuffix(rule)}`,
  );
}

function progressionOptionClassPath(progression: CharacterProgression): string {
  const classIds = [
    startingClassUnitId(progression),
    ...progression.advancements.map((entry) => entry.classUnitId),
  ];
  const optionClassPathSeparator = "|";
  return classIds
    .map((classId) => `${classId.length}:${classId}`)
    .join(optionClassPathSeparator);
}
export const SUPPORTED_BACKGROUND_OPTION_IDS = [
  ...SUPPORTED_BACKGROUND_UNIT_IDS.map(creationChoiceOptionId),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
export const SUPPORTED_SPECIES_OPTION_IDS = [
  ...SRD_CHARACTER_ADMISSION_SPECIES_UNIT_IDS.map(creationChoiceOptionId),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
export const SUPPORTED_SPECIES_SIZE_OPTION_IDS = [
  ...CHARACTER_SPECIES_SIZE_SELECTIONS.map(creationChoiceOptionId),
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
  creationChoiceOptionId(PHASE1_FIGHTING_STYLE_ARCHERY_UNIT_ID),
] as const satisfies ReadonlyArray<CreationChoiceOptionId>;
export const PHASE1_WEAPON_MASTERY_UNIT_IDS = [
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_WEAPON_DAGGER_UNIT_ID,
  PHASE1_WEAPON_SHORTSWORD_UNIT_ID,
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
export const CLASS_SKILL_PROFICIENCY_CHOICE_KEY =
  "class_skill_proficiency_choice" satisfies UnitChoiceKey;
export const CLASS_TOOL_PROFICIENCY_CHOICE_KEY =
  "class_tool_proficiency_choice" satisfies UnitChoiceKey;
export const CLASS_SUBCLASS_CHOICE_KEY =
  "class_subclass_choice" satisfies UnitChoiceKey;
export const CLASS_FEATURE_FEAT_CHOICE_KEY =
  "class_feature_feat_choice" satisfies UnitChoiceKey;
export const CLASS_FEATURE_ABILITY_SCORE_INCREASE_CHOICE_KEY =
  "class_feature_ability_score_increase_choice" satisfies UnitChoiceKey;
export const CLASS_FEATURE_PROFICIENCY_CHOICE_KEY =
  "class_feature_proficiency_choice" satisfies UnitChoiceKey;
export const ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY =
  "origin_feat_proficiency_choice" satisfies UnitChoiceKey;
export const SPECIES_TRAIT_PROFICIENCY_CHOICE_KEY =
  "species_trait_proficiency_choice" satisfies UnitChoiceKey;
export const SPECIES_ORIGIN_FEAT_CHOICE_KEY =
  "species_origin_feat_choice" satisfies UnitChoiceKey;
export const SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY =
  "species_origin_feat_proficiency_choice" satisfies UnitChoiceKey;
export const CLASS_FEATURE_LANGUAGE_CHOICE_KEY =
  "class_feature_language_choice" satisfies UnitChoiceKey;
export const DIVINE_ORDER_CHOICE_KEY = "divine_order" satisfies UnitChoiceKey;
export const PRIMAL_ORDER_CHOICE_KEY = "primal_order" satisfies UnitChoiceKey;
export const PALADIN_FIGHTING_STYLE_CHOICE_KEY =
  "paladin_fighting_style" satisfies UnitChoiceKey;
export const RANGER_FIGHTING_STYLE_CHOICE_KEY =
  "ranger_fighting_style" satisfies UnitChoiceKey;
export const HUNTERS_PREY_CHOICE_KEY = "hunters_prey" satisfies UnitChoiceKey;
export const BARD_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY =
  "bard_multiclass_skill_proficiency" satisfies UnitChoiceKey;
export const BARD_MULTICLASS_MUSICAL_INSTRUMENT_PROFICIENCY_CHOICE_KEY =
  "bard_multiclass_musical_instrument_proficiency" satisfies UnitChoiceKey;
export const RANGER_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY =
  "ranger_multiclass_skill_proficiency" satisfies UnitChoiceKey;
export const ROGUE_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY =
  "rogue_multiclass_skill_proficiency" satisfies UnitChoiceKey;
export const ELDRITCH_INVOCATIONS_CHOICE_KEY =
  "eldritch_invocations" satisfies UnitChoiceKey;
export const SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY =
  SURFACE_SORCERER_METAMAGIC_OPTIONS_CHOICE_KEY satisfies UnitChoiceKey;
export const MULTICLASS_PROFICIENCY_CHOICE_KEYS = [
  BARD_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  BARD_MULTICLASS_MUSICAL_INSTRUMENT_PROFICIENCY_CHOICE_KEY,
  RANGER_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  ROGUE_MULTICLASS_SKILL_PROFICIENCY_CHOICE_KEY,
] as const satisfies ReadonlyArray<UnitChoiceKey>;
export const WEAPON_MASTERY_OPTIONS_CHOICE_KEY =
  "weapon_mastery_options" satisfies UnitChoiceKey;
export const CLASS_CANTRIP_CHOICE_KEY =
  "class_cantrip_choices" satisfies UnitChoiceKey;
export const CLASS_PREPARED_SPELL_CHOICE_KEY =
  "class_prepared_spell_choices" satisfies UnitChoiceKey;
export const WIZARD_CANTRIP_CHOICE_KEY =
  "wizard_cantrip_choices" satisfies UnitChoiceKey;
export const WIZARD_SPELLBOOK_CHOICE_KEY =
  "wizard_spellbook_choices" satisfies UnitChoiceKey;
export const WIZARD_PREPARED_SPELL_CHOICE_KEY =
  "wizard_prepared_spell_choices" satisfies UnitChoiceKey;
export const LOADOUT_ARMOR_SLOT = "armor" satisfies LoadoutSlot;
export const LOADOUT_SHIELD_SLOT = "shield" satisfies LoadoutSlot;
export const LOADOUT_WEAPON_SLOT = "weapon" satisfies LoadoutSlot;
export const EXACTLY_ONE_CHOICE = {
  tag: "exactly",
  count: 1 as ChoiceCount,
} as const satisfies ChoiceCardinality;

type SurfaceAbility = (typeof SURFACE_ABILITIES)[number];
const byKind = Match.discriminator("kind");

type AbilityScoreIncreaseChoiceMethod =
  | {
      readonly kind: "one_score";
      readonly increase: number;
    }
  | {
      readonly kind: "two_scores";
      readonly primaryIncrease: number;
      readonly secondaryIncrease: number;
    };

type AbilityScoreIncreaseAbilityScope =
  | {
      readonly kind: "all_abilities";
    }
  | {
      readonly kind: "specific_abilities";
      readonly abilities: ReadonlyNonEmptyArray<SurfaceAbility>;
    };

export type AbilityScoreIncreaseChoiceSpec = {
  readonly abilityScope: AbilityScoreIncreaseAbilityScope;
  readonly maxScore: number;
  readonly methods: ReadonlyNonEmptyArray<AbilityScoreIncreaseChoiceMethod>;
};

export function abilityScoreIncreaseChoiceOptions(
  choice: AbilityScoreIncreaseChoiceSpec,
): readonly CreationChoiceOption[] {
  const abilities = abilityScoreIncreaseAbilities(choice.abilityScope);
  return choice.methods.flatMap((method) => {
    if (method.kind === "one_score") {
      return abilities.map((ability) => ({
        optionId: abilityScoreIncreaseOneScoreOptionId({
          ability,
          increase: method.increase,
          maxScore: choice.maxScore,
        }),
        label: `${ability.toUpperCase()} +${method.increase}`,
      }));
    }

    return unorderedSurfaceAbilityPairs(abilities).map(
      ([primary, secondary]) => ({
        optionId: requireAbilityScoreIncreaseTwoScoresOptionId({
          primary,
          primaryIncrease: method.primaryIncrease,
          secondary,
          secondaryIncrease: method.secondaryIncrease,
          maxScore: choice.maxScore,
        }),
        label: `${primary.toUpperCase()} +${method.primaryIncrease}, ${secondary.toUpperCase()} +${method.secondaryIncrease}`,
      }),
    );
  });
}

export function abilityScoreIncreaseChoiceOptionIds(
  choice: AbilityScoreIncreaseChoiceSpec,
): readonly CreationChoiceOptionId[] {
  return abilityScoreIncreaseChoiceOptions(choice).map(
    (option) => option.optionId,
  );
}

function abilityScoreIncreaseAbilities(
  abilityScope: AbilityScoreIncreaseAbilityScope,
): ReadonlyNonEmptyArray<SurfaceAbility> {
  return Match.value(abilityScope).pipe(
    byKind("all_abilities", () => SURFACE_ABILITIES),
    byKind("specific_abilities", (specific) => specific.abilities),
    Match.exhaustive,
  );
}

function unorderedSurfaceAbilityPairs(
  abilities: ReadonlyNonEmptyArray<SurfaceAbility>,
): readonly (readonly [SurfaceAbility, SurfaceAbility])[] {
  return abilities.flatMap((primary, primaryIndex) =>
    abilities
      .slice(primaryIndex + 1)
      .map((secondary) => [primary, secondary] as const),
  );
}

export { SURFACE_ABILITIES };
