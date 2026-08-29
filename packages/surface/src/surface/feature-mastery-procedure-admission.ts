import { Match } from "effect";

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

import type {
  ClassFeatureComponentMechanics,
  ClassFeatureMechanics,
  FeatMechanics,
  MasteryMechanics,
  SpeciesTraitMechanics,
  UnitRecord,
} from "./types.ts";

export type FeatureMasteryProcedureUnit = Extract<
  UnitRecord,
  {
    readonly kind: "class_feature" | "feat" | "mastery" | "species_trait";
  }
>;

export type ClassFeatureComponentProcedureProjection =
  ClassFeatureComponentMechanics;

export type ClassFeatureProcedureProjection =
  | Exclude<ClassFeatureMechanics, { readonly family: "composite" }>
  | {
      readonly family: "composite";
      readonly parts: ReadonlyNonEmptyArray<ClassFeatureComponentProcedureProjection>;
    };

export type FeatProcedureProjection = FeatMechanics;

export type MasteryProcedureProjection = MasteryMechanics;

export type SpeciesTraitProcedureProjection = SpeciesTraitMechanics;

export type FeatureMasteryProcedureProjection =
  | {
      readonly unitKind: "class_feature";
      readonly procedure: ClassFeatureProcedureProjection;
    }
  | {
      readonly unitKind: "feat";
      readonly procedure: FeatProcedureProjection;
    }
  | {
      readonly unitKind: "mastery";
      readonly procedure: MasteryProcedureProjection;
    }
  | {
      readonly unitKind: "species_trait";
      readonly procedure: SpeciesTraitProcedureProjection;
    };

export type FeatureMasteryProcedureAdmissionIssue = {
  readonly code: "unsupportedUnitRole";
  readonly unitKind: Exclude<UnitRecord, FeatureMasteryProcedureUnit>["kind"];
  readonly message: string;
};

export type FeatureMasteryProcedureAdmissionResult =
  | {
      readonly tag: "admitted";
      readonly projection: FeatureMasteryProcedureProjection;
    }
  | {
      readonly tag: "rejected";
      readonly issues: readonly [FeatureMasteryProcedureAdmissionIssue];
    };

/**
 * Projects the complete context-independent procedure carried by a feature or
 * mastery Unit. Authored identity, actor/build facts, selected options,
 * resources, and Battle State deliberately do not enter this boundary.
 */
export function admitFeatureMasteryUnitProcedure(
  unit: UnitRecord,
): FeatureMasteryProcedureAdmissionResult {
  if (!isFeatureMasteryProcedureUnit(unit)) {
    return {
      tag: "rejected",
      issues: [
        {
          code: "unsupportedUnitRole",
          unitKind: unit.kind,
          message: `Unit role ${unit.kind} does not own a feature or mastery procedure.`,
        },
      ],
    };
  }

  return {
    tag: "admitted",
    projection: projectFeatureMasteryUnitProcedure(unit),
  };
}

export function projectFeatureMasteryUnitProcedure(
  unit: FeatureMasteryProcedureUnit,
): FeatureMasteryProcedureProjection {
  return Match.value(unit).pipe(
    Match.when({ kind: "class_feature" }, (source) => ({
      unitKind: source.kind,
      procedure: projectClassFeatureProcedure(source.mechanics),
    })),
    Match.when({ kind: "feat" }, (source) => ({
      unitKind: source.kind,
      procedure: projectFeatProcedure(source.mechanics),
    })),
    Match.when({ kind: "mastery" }, (source) => ({
      unitKind: source.kind,
      procedure: projectMasteryProcedure(source.mechanics),
    })),
    Match.when({ kind: "species_trait" }, (source) => ({
      unitKind: source.kind,
      procedure: projectSpeciesTraitProcedure(source.mechanics),
    })),
    Match.exhaustive,
  );
}

function isFeatureMasteryProcedureUnit(
  unit: UnitRecord,
): unit is FeatureMasteryProcedureUnit {
  return Match.value(unit.kind).pipe(
    Match.when("class_feature", () => true),
    Match.when("feat", () => true),
    Match.when("mastery", () => true),
    Match.when("species_trait", () => true),
    Match.orElse(() => false),
  );
}

function projectClassFeatureProcedure(
  mechanics: ClassFeatureMechanics,
): ClassFeatureProcedureProjection {
  return Match.value(mechanics).pipe(
    Match.when({ family: "composite" }, (composite) => ({
      family: composite.family,
      parts: mapNonEmpty(composite.parts, projectClassFeatureComponent),
    })),
    Match.when({ family: "abjure_foes" }, (matched) => matched),
    Match.when({ family: "acrobatic_movement" }, (matched) => matched),
    Match.when({ family: "activation" }, (matched) => matched),
    Match.when({ family: "alternate_action_cost" }, (matched) => matched),
    Match.when(
      { family: "bonus_action_delegated_standard_actions" },
      (matched) => matched,
    ),
    Match.when({ family: "brutal_strike" }, (matched) => matched),
    Match.when(
      { family: "class_feature_acquisition_choice" },
      (matched) => matched,
    ),
    Match.when(
      { family: "class_spellcasting_projection" },
      (matched) => matched,
    ),
    Match.when(
      { family: "combat_turn_start_heroic_inspiration" },
      (matched) => matched,
    ),
    Match.when({ family: "cunning_strike" }, (matched) => matched),
    Match.when({ family: "cunning_strike_option_grant" }, (matched) => matched),
    Match.when(
      { family: "druid_wild_companion_spell_cast" },
      (matched) => matched,
    ),
    Match.when(
      { family: "enemy_zero_hit_point_temporary_hit_points" },
      (matched) => matched,
    ),
    Match.when(
      { family: "failed_ability_check_resource_boost" },
      (matched) => matched,
    ),
    Match.orElse((remaining) =>
      Match.value(remaining).pipe(
        Match.when(
          { family: "failed_saving_throw_reroll" },
          (matched) => matched,
        ),
        Match.when({ family: "feature_choice" }, (matched) => matched),
        Match.when({ family: "hunters_prey" }, (matched) => matched),
        Match.when(
          { family: "initiative_focus_recovery" },
          (matched) => matched,
        ),
        Match.when(
          { family: "magic_action_area_save_damage_healing" },
          (matched) => matched,
        ),
        Match.when(
          { family: "magic_action_healing_pool" },
          (matched) => matched,
        ),
        Match.when({ family: "metamagic_options" }, (matched) => matched),
        Match.when({ family: "on_hit_trigger" }, (matched) => matched),
        Match.when({ family: "open_hand_technique" }, (matched) => matched),
        Match.when({ family: "pact_slot_recovery" }, (matched) => matched),
        Match.when({ family: "passive" }, (matched) => matched),
        Match.when({ family: "potent_cantrip" }, (matched) => matched),
        Match.when(
          { family: "prepared_spell_list_expansion" },
          (matched) => matched,
        ),
        Match.when(
          { family: "reaction_roll_or_damage_reduction" },
          (matched) => matched,
        ),
        Match.orElse((finalFamilies) =>
          Match.value(finalFamilies).pipe(
            Match.when({ family: "remarkable_athlete" }, (matched) => matched),
            Match.when({ family: "resource_container" }, (matched) => matched),
            Match.when({ family: "resource_pool" }, (matched) => matched),
            Match.when(
              { family: "rest_spell_slot_recovery" },
              (matched) => matched,
            ),
            Match.when({ family: "sacred_weapon" }, (matched) => matched),
            Match.when(
              { family: "save_damage_replacement" },
              (matched) => matched,
            ),
            Match.when(
              { family: "sorcery_point_short_rest_recovery" },
              (matched) => matched,
            ),
            Match.when(
              { family: "spell_damage_roll_ability_modifier" },
              (matched) => matched,
            ),
            Match.when(
              { family: "spell_slot_healing_modifier" },
              (matched) => matched,
            ),
            Match.when(
              { family: "spellbook_ritual_access" },
              (matched) => matched,
            ),
            Match.when({ family: "steady_aim" }, (matched) => matched),
            Match.when({ family: "stunning_strike" }, (matched) => matched),
            Match.when(
              { family: "weapon_mastery_choice" },
              (matched) => matched,
            ),
            Match.when(
              { family: "weapon_mastery_property_replacement" },
              (matched) => matched,
            ),
            Match.when(
              { family: "wizard_spellbook_learning" },
              (matched) => matched,
            ),
            Match.exhaustive,
          ),
        ),
      ),
    ),
  );
}

function projectClassFeatureComponent(
  mechanics: ClassFeatureComponentMechanics,
): ClassFeatureComponentProcedureProjection {
  return Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, (matched) => matched),
    Match.when({ family: "alternate_action_cost" }, (matched) => matched),
    Match.when({ family: "on_hit_trigger" }, (matched) => matched),
    Match.when({ family: "passive" }, (matched) => matched),
    Match.when(
      { family: "reaction_roll_or_damage_reduction" },
      (matched) => matched,
    ),
    Match.when({ family: "save_damage_replacement" }, (matched) => matched),
    Match.exhaustive,
  );
}

function projectFeatProcedure(
  mechanics: FeatMechanics,
): FeatProcedureProjection {
  return Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, (matched) => matched),
    Match.when({ family: "damage_die_floor" }, (matched) => matched),
    Match.when(
      { family: "light_extra_attack_damage_ability_modifier" },
      (matched) => matched,
    ),
    Match.when({ family: "grappler" }, (matched) => matched),
    Match.when({ family: "magic_initiate" }, (matched) => matched),
    Match.when({ family: "on_hit_trigger" }, (matched) => matched),
    Match.when({ family: "passive" }, (matched) => matched),
    Match.when({ family: "triggered_replacement" }, (matched) => matched),
    Match.exhaustive,
  );
}

function projectMasteryProcedure(
  mechanics: MasteryMechanics,
): MasteryProcedureProjection {
  return Match.value(mechanics).pipe(
    Match.when(
      { effect: { kind: "grant_weapon_attack" } },
      (matched) => matched,
    ),
    Match.when({ effect: { kind: "push_creature" } }, (matched) => matched),
    Match.when({ effect: { kind: "save_gate" } }, (matched) => matched),
    Match.when({ effect: { kind: "speed_delta" } }, (matched) => matched),
    Match.when(
      { effect: { kind: "modify_roll_advantage", mode: "advantage" } },
      (matched) => matched,
    ),
    Match.when(
      { effect: { kind: "modify_roll_advantage", mode: "disadvantage" } },
      (matched) => matched,
    ),
    Match.exhaustive,
  );
}

function projectSpeciesTraitProcedure(
  mechanics: SpeciesTraitMechanics,
): SpeciesTraitProcedureProjection {
  return Match.value(mechanics).pipe(
    Match.when({ family: "activation" }, (matched) => matched),
    Match.when(
      { family: "creature_space_movement_permission" },
      (matched) => matched,
    ),
    Match.when({ family: "d20_test_natural_one_reroll" }, (matched) => matched),
    Match.when(
      { family: "hide_action_obscurement_permission" },
      (matched) => matched,
    ),
    Match.when({ family: "passive" }, (matched) => matched),
    Match.when(
      { family: "rest_triggered_heroic_inspiration" },
      (matched) => matched,
    ),
    Match.when({ family: "species_lineage_choice" }, (matched) => matched),
    Match.when({ family: "triggered_replacement" }, (matched) => matched),
    Match.exhaustive,
  );
}

function mapNonEmpty<T, U>(
  values: ReadonlyNonEmptyArray<T>,
  project: (value: T) => U,
): ReadonlyNonEmptyArray<U> {
  const [head, ...tail] = values;
  return [project(head), ...tail.map(project)];
}
