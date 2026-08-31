import { unitId } from "@dnd/shared/game-facts";
import { classLevel } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { AuthoredUnitSource } from "@dnd/surface/surface/types";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  battleUnitSupportProfilesForUnit,
  parseSupportedUnitFeatureProfile,
} from "../unit-feature-support.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("Battle feature observation catalog must build.");
}

const units = catalogResult.catalog.listUnits();
const DRACONIC_ANCESTRY_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "poison",
] as const;

const EXPECTED_OBSERVED_ROOT_IDS = [
  "alert",
  "barbarian_brutal_strike",
  "barbarian_danger_sense",
  "barbarian_extra_attack",
  "barbarian_fast_movement",
  "barbarian_frenzy",
  "barbarian_retaliation",
  "bard_bardic_inspiration",
  "bard_cutting_words",
  "cleric_disciple_of_life",
  "cleric_preserve_life",
  "defense",
  "druid_lands_aid",
  "druid_wild_companion",
  "druid_wild_shape",
  "dwarf_dwarven_resilience",
  "feat_archery",
  "feat_boon_of_combat_prowess",
  "feat_grappler",
  "feat_great_weapon_fighting",
  "feat_savage_attacker",
  "feat_two_weapon_fighting",
  "fighter_extra_attack",
  "fighter_improved_critical",
  "fighter_indomitable",
  "fighter_remarkable_athlete",
  "fighter_tactical_master",
  "fighter_tactical_mind",
  "mastery_cleave",
  "mastery_push",
  "mastery_sap",
  "mastery_slow",
  "mastery_topple",
  "monk_acrobatic_movement",
  "monk_deflect_attacks",
  "monk_evasion",
  "monk_extra_attack",
  "monk_martial_arts",
  "monk_monks_focus",
  "monk_open_hand_technique",
  "monk_slow_fall",
  "monk_stunning_strike",
  "monk_unarmored_movement",
  "orc_adrenaline_rush",
  "orc_relentless_endurance",
  "paladin_abjure_foes",
  "paladin_extra_attack",
  "paladin_sacred_weapon",
  "ranger_extra_attack",
  "ranger_roving",
  "rogue_cunning_action",
  "rogue_cunning_strike",
  "rogue_evasion",
  "rogue_fast_hands",
  "rogue_second_story_work",
  "rogue_sneak_attack",
  "rogue_steady_aim",
  "rogue_supreme_sneak",
  "rogue_uncanny_dodge",
  "species_dragonborn_breath_weapon",
  "species_dragonborn_damage_resistance",
  "species_goliath_powerful_build",
  "species_halfling_brave",
  "species_halfling_luck",
  "species_halfling_naturally_stealthy",
  "species_halfling_nimbleness",
  "warlock_dark_ones_blessing",
  "wizard_potent_cantrip",
] as const;

const EXPECTED_CONTEXTUAL_OR_SUPPORT_ONLY_ROOT_IDS = [
  "barbarian_brutal_strike",
  "druid_wild_companion",
  "fighter_improved_critical",
  "fighter_tactical_master",
  "mastery_cleave",
  "mastery_push",
  "mastery_sap",
  "mastery_slow",
  "mastery_topple",
  "monk_monks_focus",
  "rogue_cunning_action",
  "species_dragonborn_damage_resistance",
] as const;

const CANONICAL_BATTLE_VISIBLE_SUBSET_ROOT_IDS = [
  "druid_wild_shape",
  "fighter_indomitable",
  "mastery_push",
  "monk_acrobatic_movement",
  "monk_monks_focus",
  "rogue_fast_hands",
  "species_halfling_luck",
  "species_halfling_naturally_stealthy",
  "species_halfling_nimbleness",
] as const;

function hasSupportObservation(
  result: ReturnType<typeof battleUnitSupportProfilesForUnit>,
): boolean {
  return Result.isSuccess(result) && result.success.length > 0;
}

function minimumOwningClassContext(unit: AuthoredUnitSource) {
  return unit.kind === "class_feature"
    ? [
        {
          className: unit.className,
          level: classLevel(unit.acquiredAtLevel),
        },
      ]
    : [];
}

describe("Battle feature and mastery support observations", () => {
  test("reproduces the exact 68 observed roots without double-counting source-fact variants", () => {
    const baseObserved = new Set<string>();
    const sourceFactObserved = new Set<string>();

    for (const unit of units) {
      if (hasSupportObservation(battleUnitSupportProfilesForUnit({ unit }))) {
        baseObserved.add(unit.id);
      }
      for (const draconicAncestryDamageType of DRACONIC_ANCESTRY_DAMAGE_TYPES) {
        if (
          hasSupportObservation(
            battleUnitSupportProfilesForUnit({
              unit,
              sourceFacts: { draconicAncestryDamageType },
            }),
          )
        ) {
          sourceFactObserved.add(unit.id);
        }
      }
    }

    const observed = new Set([...baseObserved, ...sourceFactObserved]);
    expect(baseObserved.size).toBe(66);
    expect(
      [...sourceFactObserved].filter((id) => !baseObserved.has(id)).sort(),
    ).toEqual([
      "species_dragonborn_breath_weapon",
      "species_dragonborn_damage_resistance",
    ]);
    expect([...observed].sort()).toEqual([...EXPECTED_OBSERVED_ROOT_IDS]);
    expect(observed.size).toBe(68);
  });

  test("keeps contextual and support-only overlap separate from admission evidence", () => {
    const contextualOrSupportOnly = units.flatMap((unit) => {
      const observed = DRACONIC_ANCESTRY_DAMAGE_TYPES.some(
        (draconicAncestryDamageType) =>
          hasSupportObservation(
            battleUnitSupportProfilesForUnit({
              unit,
              sourceFacts: { draconicAncestryDamageType },
            }),
          ),
      );
      if (!observed) return [];
      const singularProfile = parseSupportedUnitFeatureProfile(
        unit,
        minimumOwningClassContext(unit),
        { draconicAncestryDamageType: "acid" },
      );
      return singularProfile === null ? [unit.id] : [];
    });

    expect(contextualOrSupportOnly.sort()).toEqual([
      ...EXPECTED_CONTEXTUAL_OR_SUPPORT_ONLY_ROOT_IDS,
    ]);
    const canonicalSubset = new Set(
      CANONICAL_BATTLE_VISIBLE_SUBSET_ROOT_IDS.map(unitId),
    );
    expect(
      contextualOrSupportOnly
        .filter((id) => canonicalSubset.has(unitId(id)))
        .sort(),
    ).toEqual(["mastery_push", "monk_monks_focus"]);
  });
});
