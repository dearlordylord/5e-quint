import type { AreaDirectEffectAtom } from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

import { traceOutcomeEffectAtom } from "./tracer-effect-outcomes.ts";

import { traceActionAndRollEffectAtom } from "./tracer-effect-actions-rolls.ts";

import { traceObjectAndBarrierEffectAtom } from "./tracer-effect-objects-barriers.ts";

import { traceAttachmentAndAreaEffectAtom } from "./tracer-effect-attachments-areas.ts";

import { traceCompositeAndCountermagicEffectAtom } from "./tracer-effect-composite-countermagic.ts";

export function traceEffectAtom(
  e: AreaDirectEffectAtom,
  nodes: TraceNode[],
  ids: IdGen,
  edges?: TraceEdge[],
): string | null {
  switch (e.kind) {
    case "spell_created_held_object": {
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
    }
    case "half_initial_damage_only": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "half_initial_damage_only",
        label: "half_initial_damage_only",
      });
      return id;
    }
    case "object_contact_damage":
    case "none":
    case "damage":
    case "conditional_bonus_damage":
    case "conditional_by_current_hp":
    case "kill_target":
    case "end_current_effect":
    case "repeat_save_for_condition":
    case "repeat_save_counter":
    case "delayed_save":
    case "condition_persists_after_full_duration":
    case "heal_hp":
    case "grant_rest_benefit":
    case "spell_recipient_rest_lockout":
    case "prevent_hit_point_regain":
    case "heal_to_max_hp":
    case "modify_max_hp":
    case "modify_ac":
    case "modify_ac_set_base":
    case "modify_save_dc":
    case "apply_condition":
    case "apply_condition_while_in_area_or_until_escape":
    case "suppress_condition_self_end":
    case "restrict_action_usage":
    case "target_effect_escape_action":
    case "command_target_next_turn":
    case "forced_reaction_movement":
    case "jump_movement_replacement":
    case "feather_fall_mitigation":
    case "audible":
    case "remove_condition":
    case "grant_resistance":
    case "reduce_damage_taken":
    case "share_damage_to_caster":
    case "retaliatory_damage":
      return traceOutcomeEffectAtom(e, nodes, ids, edges, traceEffectAtom);
    case "deliver_mental_message": {
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
    }
    case "take_standard_action":
    case "grant_alternate_action_cost":
    case "grant_extra_action":
    case "modify_roll_numeric":
    case "initiative_swap":
    case "jack_of_all_trades_ability_check_bonus":
    case "modify_damage_numeric":
    case "modify_size_category":
    case "modify_roll_advantage":
    case "suppress_roll_disadvantage":
    case "remove_equipment_requirement":
    case "modify_crit_range":
    case "transfer_weapon_bonus_to_ac":
    case "suppress_incoming_critical_hit":
    case "scale_attack_count":
    case "modify_speed":
    case "force_move":
    case "push_unsecured_objects":
    case "suspend_target":
    case "fall_at_end_of_next_turn_unless_reapplied":
    case "force_fall":
    case "levitate_target":
    case "grab_fixed_object":
    case "suspend_in_area":
    case "fall_when_effect_ends":
    case "move_area":
    case "reduce_area_height":
    case "end_current_effect_at_area_height_zero":
    case "ability_check_to_move_in_area":
    case "fall_to_ground":
    case "block_targeting":
    case "choose_new_target_or_lose":
    case "block_travel":
    case "end_if_created_in_occupied_space":
    case "allow_designated_creatures_safe_passage":
      return traceActionAndRollEffectAtom(
        e,
        nodes,
        ids,
        edges,
        traceEffectAtom,
      );
    case "object_immune_to_all_damage":
    case "object_destroyed_by_spell":
    case "cannot_be_dispelled_by_spell":
    case "block_ethereal_travel":
    case "replace_destroyed_object_section_with_area":
    case "block_projectiles":
    case "block_gases_and_gaseous_creatures":
    case "block_flying_movement":
    case "negate_named_effect":
    case "see_invisible_and_ethereal":
    case "grant_sense":
    case "modify_sense_range":
    case "grant_language_understanding":
    case "grant_creature_communication":
    case "deny_opportunity_attack":
    case "grant_temp_hp":
    case "prevent_drop_to_0_hp":
    case "negate_instant_death":
    case "make_stable":
    case "revive_dead_creature":
    case "grant_feat":
    case "grant_proficiency":
    case "grant_expertise":
    case "grant_language":
    case "grant_hidden_language_messages":
    case "grant_language_choice":
    case "grant_spell_access":
    case "grant_spell_access_choice":
    case "grant_class_level_prepared_spell_access":
    case "grant_land_choice_prepared_spell_access":
    case "grant_spell_free_casts":
    case "grant_die_token":
    case "grant_bonus_action_attack":
    case "replace_damage_die":
    case "substitute_ability_for_rolls":
    case "offer_ability_substitution_for_ability_checks":
    case "offer_ability_substitution_for_jump_distance":
    case "grant_magic_weapon_enhancement":
    case "grant_condition_immunity":
    case "suppress_condition_benefit":
    case "grant_damage_immunity":
    case "block_max_hp_reduction":
    case "set_ability_score":
    case "modify_ability_score":
    case "modify_proficiency_bonus":
    case "create_extradimensional_space":
      return traceObjectAndBarrierEffectAtom(
        e,
        nodes,
        ids,
        edges,
        traceEffectAtom,
      );
    case "teleport":
    case "transport_exile":
    case "make_weapon_attack":
    case "override_attached_weapon_attack":
    case "container_storage":
    case "create_sensor":
    case "remote_perception":
    case "set_speed":
    case "set_speed_ratio":
    case "emit_light":
    case "emit_dim_light":
    case "block_reanimation":
    case "ignite_objects":
    case "create_object":
    case "create_illusion":
    case "force_drop_item":
    case "move_object":
    case "pull_object_away":
    case "manipulate_object":
    case "break_concentration":
    case "damage_structure":
    case "collapse_structure":
    case "bury_in_rubble":
    case "bond_objects":
    case "lock_object":
    case "release_object_access":
    case "suppress_arcane_lock":
    case "reposition_attachment":
    case "area_is_difficult_terrain":
    case "area_emits_dim_light":
    case "area_is_lightly_obscured":
    case "area_is_heavily_obscured":
    case "douse_exposed_flames":
    case "area_is_magical_darkness":
    case "area_of_silence":
    case "truthfulness_constraint":
    case "reveal_save_outcome_to_caster":
    case "end_overlapping_spell_created_bright_or_dim_light":
    case "area_anchor_or_layering_requirement":
    case "area_section_burns_away":
    case "area_has_strong_wind":
    case "prevent_ranged_weapon_attacks":
    case "area_movement_cost_multiplier":
    case "plant_enrichment":
    case "grant_cover":
    case "block_line_of_sight":
    case "prevent_creature_passage":
    case "prevent_spellcasting_and_magic_actions":
    case "prevent_magical_ranged_attacks":
    case "block_magical_targeting_and_aoe":
    case "block_teleport_and_planar_travel":
    case "suppress_magic_items":
    case "suppress_ongoing_magic_effects":
    case "ordered_barrier_layers":
    case "allow_reaction_stand_up":
    case "revert_shape_shift_to_true_form":
    case "suppress_shape_shifting_while_in_area":
      return traceAttachmentAndAreaEffectAtom(
        e,
        nodes,
        ids,
        edges,
        traceEffectAtom,
      );
    case "composite":
    case "choose_effect_mode":
    case "curse_occurrence":
    case "grant_speed":
    case "ignore_web_restrictions":
    case "alter_item_kind":
    case "natural_weapons":
    case "water_breathing":
    case "detect":
    case "magical_identity_mask":
    case "locate_kind":
    case "object_location_sense":
    case "block_divination_targeting_and_scrying_perception":
    case "divination_omen":
    case "assign_courier_task":
    case "negate_triggering_spell":
    case "reflect_triggering_spell":
    case "waste_triggering_spell_or_effect":
    case "end_ongoing_spells":
    case "maximize_healing_received":
    case "transform_target":
      return traceCompositeAndCountermagicEffectAtom(
        e,
        nodes,
        ids,
        edges,
        traceEffectAtom,
      );
    default: {
      const _exhaustive: never = e;
      throw new Error(`unhandled effect atom: ${String(_exhaustive)}`);
    }
  }
}
