import type { AreaDirectEffectAtom } from "../surface/types.ts";
import { Match } from "effect";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

import { traceOutcomeEffectAtom } from "./tracer-effect-outcomes.ts";

import { traceActionAndRollEffectAtom } from "./tracer-effect-actions-rolls.ts";

import { traceObjectAndBarrierEffectAtom } from "./tracer-effect-objects-barriers.ts";

import { traceAttachmentAndAreaEffectAtom } from "./tracer-effect-attachments-areas.ts";

import { traceCompositeAndCountermagicEffectAtom } from "./tracer-effect-composite-countermagic.ts";
import { isIlluminationEffectAtom } from "./tracer-effect-illumination.ts";

const byKind = Match.discriminator("kind");
const protectionByKind = Match.discriminator("kind");

export function traceEffectAtom(
  e: AreaDirectEffectAtom,
  nodes: TraceNode[],
  ids: IdGen,
  edges?: TraceEdge[],
): string | null {
  if (isIlluminationEffectAtom(e)) {
    return traceAttachmentAndAreaEffectAtom(
      e,
      nodes,
      ids,
      edges,
      traceEffectAtom,
    );
  }
  return Match.value(e).pipe(
    byKind("creature_type_protection", (e) => {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "creature_type_protection",
        label: `creature_type_protection\nsources: ${e.sourceCreatureTypes.join("/")}`,
      });

      for (const protection of e.protections) {
        const protectionId = ids("eff");
        const label = Match.value(protection).pipe(
          protectionByKind(
            "attack_rolls_against_target",
            (protection) => `${protection.kind}\nmode: ${protection.mode}`,
          ),
          protectionByKind(
            "new_relevant_effect_applications",
            (protection) =>
              `${protection.kind}\nconditions: ${protection.conditions.join("/")}\n` +
              `possession: ${protection.possession}\nresult: ${protection.result}`,
          ),
          protectionByKind(
            "new_saves_against_existing_relevant_effects",
            (protection) =>
              `${protection.kind}\nconditions: ${protection.conditions.join("/")}\n` +
              `possession: ${protection.possession}\nmode: ${protection.mode}`,
          ),
          Match.exhaustive,
        );
        nodes.push({
          id: protectionId,
          category: "effect",
          atomKind: protection.kind,
          label,
        });
        edges?.push({ from: id, to: protectionId, relation: "grants" });
      }

      return id;
    }),
    byKind("spell_created_held_object", (e) => {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "spell_created_held_object",
        label: [
          "spell_created_held_object",
          `held by ${e.heldBy}`,
          `requires ${e.requirements.join(", ")}`,
          `disappears when ${e.disappearsWhen.join(", ")}`,
          `re-evoke: ${e.reEvoke.cost.kind}; requires ${e.reEvoke.requirements.join(", ")}`,
        ].join("\n"),
      });
      return id;
    }),
    byKind("half_initial_damage_only", () => {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "half_initial_damage_only",
        label: "half_initial_damage_only",
      });
      return id;
    }),
    byKind(
      "object_contact_damage",
      "none",
      "damage",
      "conditional_bonus_damage",
      "conditional_by_current_hp",
      "kill_target",
      "end_current_effect",
      "effect_end_target_state",
      "repeat_save_for_condition",
      "repeat_save_counter",
      "delayed_save",
      "condition_persists_after_full_duration",
      "heal_hp",
      "grant_rest_benefit",
      "spell_recipient_rest_lockout",
      "prevent_hit_point_regain",
      "heal_to_max_hp",
      "modify_max_hp",
      "modify_ac",
      "modify_ac_set_base",
      "modify_save_dc",
      "apply_condition",
      "apply_condition_while_in_area_or_until_escape",
      "suppress_condition_self_end",
      "restrict_action_usage",
      "target_effect_escape_action",
      "compelled_target_next_turn",
      "forced_reaction_movement",
      "jump_movement_replacement",
      "feather_fall_mitigation",
      "audible",
      "remove_condition",
      "grant_resistance",
      "reduce_damage_taken",
      "share_damage_to_caster",
      "retaliatory_damage",
      (e) => {
        return traceOutcomeEffectAtom(e, nodes, ids, edges, traceEffectAtom);
      },
    ),
    byKind("deliver_mental_message", (e) => {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "deliver_mental_message",
        label: [
          "deliver_mental_message",
          `${e.message.maxWords} words`,
          e.message.delivery,
          `response: ${e.response.timing}`,
          `${e.planarDelivery.failureChance.percent}% ${e.planarDelivery.failureChance.kind}`,
          `block: ${e.recipientBlock.duration.amount} ${e.recipientBlock.duration.unit}`,
        ].join("\n"),
      });
      return id;
    }),
    byKind(
      "take_standard_action",
      "grant_alternate_action_cost",
      "grant_extra_action",
      "choose_action_or_bonus_action_each_turn",
      "modify_roll_numeric",
      "suppress_movement_trace",
      "initiative_swap",
      "jack_of_all_trades_ability_check_bonus",
      "modify_damage_numeric",
      "modify_size_category",
      "modify_roll_advantage",
      "suppress_roll_disadvantage",
      "remove_equipment_requirement",
      "modify_crit_range",
      "transfer_weapon_bonus_to_ac",
      "suppress_incoming_critical_hit",
      "scale_attack_count",
      "cap_attack_action_attacks",
      "somatic_spell_failure_chance",
      "modify_speed",
      "force_move",
      "push_unsecured_objects",
      "suspend_target",
      "fall_at_end_of_next_turn_unless_reapplied",
      "force_fall",
      "levitate_target",
      "grab_fixed_object",
      "suspend_in_area",
      "fall_when_effect_ends",
      "move_area",
      "reduce_area_height",
      "end_current_effect_at_area_height_zero",
      "ability_check_to_move_in_area",
      "fall_to_ground",
      "block_targeting",
      "choose_new_target_or_lose",
      "block_travel",
      "end_if_created_in_occupied_space",
      "allow_designated_creatures_safe_passage",
      (e) => {
        return traceActionAndRollEffectAtom(e, nodes, ids);
      },
    ),
    byKind(
      "object_immune_to_all_damage",
      "object_destroyed_by_spell",
      "cannot_be_dispelled_by_spell",
      "block_ethereal_travel",
      "replace_destroyed_object_section_with_area",
      "block_projectiles",
      "block_gases_and_gaseous_creatures",
      "block_flying_movement",
      "negate_named_effect",
      "see_invisible_and_ethereal",
      "grant_sense",
      "modify_sense_range",
      "grant_language_understanding",
      "grant_creature_communication",
      "deny_opportunity_attack",
      "grant_temp_hp",
      "prevent_drop_to_0_hp",
      "negate_instant_death",
      "make_stable",
      "revive_dead_creature",
      "grant_feat",
      "grant_proficiency",
      "grant_expertise",
      "grant_language",
      "grant_hidden_language_messages",
      "grant_language_choice",
      "grant_spell_access",
      "grant_spell_access_choice",
      "grant_class_level_prepared_spell_access",
      "grant_land_choice_prepared_spell_access",
      "grant_spell_free_casts",
      "grant_die_token",
      "grant_bonus_action_attack",
      "replace_damage_die",
      "substitute_ability_for_rolls",
      "offer_ability_substitution_for_ability_checks",
      "offer_ability_substitution_for_jump_distance",
      "grant_weapon_attack_enhancement",
      "grant_condition_immunity",
      "suppress_condition_benefit",
      "grant_damage_immunity",
      "block_max_hp_reduction",
      "set_ability_score",
      "modify_ability_score",
      "modify_proficiency_bonus",
      "create_extradimensional_space",
      (e) => {
        return traceObjectAndBarrierEffectAtom(e, nodes, ids);
      },
    ),
    byKind(
      "teleport",
      "transport_exile",
      "ethereal_phase",
      "make_weapon_attack",
      "override_attached_weapon_attack",
      "container_storage",
      "create_sensor",
      "remote_perception",
      "set_speed",
      "set_speed_ratio",
      "block_reanimation",
      "ignite_objects",
      "create_object",
      "create_illusion",
      "create_phantasmal_illusion",
      "force_drop_item",
      "move_object",
      "pull_object_away",
      "manipulate_object",
      "break_concentration",
      "damage_structure",
      "collapse_structure",
      "bury_in_rubble",
      "bond_objects",
      "lock_object",
      "release_object_access",
      "suppress_arcane_lock",
      "reposition_attachment",
      "area_is_difficult_terrain",
      "area_emits_dim_light",
      "area_is_lightly_obscured",
      "area_is_heavily_obscured",
      "douse_exposed_flames",
      "area_is_magical_darkness",
      "area_of_silence",
      "truthfulness_constraint",
      "reveal_save_outcome_to_caster",
      "end_overlapping_spell_created_bright_or_dim_light",
      "area_anchor_or_layering_requirement",
      "area_section_burns_away",
      "area_has_strong_wind",
      "prevent_ranged_weapon_attacks",
      "area_movement_cost_multiplier",
      "plant_enrichment",
      "grant_cover",
      "block_line_of_sight",
      "prevent_creature_passage",
      "prevent_spellcasting_and_magic_actions",
      "prevent_magical_ranged_attacks",
      "block_magical_targeting_and_aoe",
      "block_teleport_and_planar_travel",
      "suppress_magic_items",
      "suppress_ongoing_magic_effects",
      "ordered_barrier_layers",
      "allow_reaction_stand_up",
      "revert_shape_shift_to_true_form",
      "suppress_shape_shifting_while_in_area",
      (e) => {
        return traceAttachmentAndAreaEffectAtom(
          e,
          nodes,
          ids,
          edges,
          traceEffectAtom,
        );
      },
    ),
    byKind(
      "composite",
      "choose_effect_mode",
      "curse_occurrence",
      "grant_speed",
      "grant_liquid_surface_traversal",
      "ignore_web_restrictions",
      "alter_item_kind",
      "natural_weapons",
      "water_breathing",
      "detect",
      "magical_identity_mask",
      "locate_kind",
      "object_location_sense",
      "block_divination_targeting_and_scrying_perception",
      "divination_omen",
      "planar_entity_answers",
      "assign_courier_task",
      "negate_triggering_spell",
      "reflect_triggering_spell",
      "waste_triggering_spell_or_effect",
      "end_ongoing_spells",
      "maximize_healing_received",
      "transform_target",
      (e) => {
        return traceCompositeAndCountermagicEffectAtom(
          e,
          nodes,
          ids,
          edges,
          traceEffectAtom,
        );
      },
    ),
    Match.exhaustive,
  );
}
