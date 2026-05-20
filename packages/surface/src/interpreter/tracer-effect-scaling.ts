import type { AreaDirectEffectAtom, UsageLimit } from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

import { traceActionRestriction } from "./tracer-action-restrictions.ts";

import { traceDiceAmountScaling } from "./tracer-scaling.ts";

// Emit scaling nodes for effect atoms that carry a DiceAmount.
export function traceEffectAtomScaling(
  e: AreaDirectEffectAtom,
  effectId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (e.kind) {
    case "damage":
    case "conditional_bonus_damage":
    case "retaliatory_damage":
      traceDiceAmountScaling(e.amount, effectId, slotId, nodes, edges, ids);
      return;
    case "share_damage_to_caster":
      return;
    case "heal_hp":
    case "grant_temp_hp":
      traceDiceAmountScaling(e.amount, effectId, slotId, nodes, edges, ids);
      return;
    case "prevent_hit_point_regain":
    case "heal_to_max_hp":
      return;
    case "modify_max_hp":
      traceDiceAmountScaling(e.delta, effectId, slotId, nodes, edges, ids);
      return;
    case "reduce_damage_taken":
      traceDiceAmountScaling(e.amount, effectId, slotId, nodes, edges, ids);
      return;
    case "conditional_by_current_hp":
      traceEffectAtomScaling(e.onMatch, effectId, slotId, nodes, edges, ids);
      if (e.otherwise !== undefined) {
        traceEffectAtomScaling(
          e.otherwise,
          effectId,
          slotId,
          nodes,
          edges,
          ids,
        );
      }
      return;
    case "grant_extra_action":
      traceActionRestriction(e.restriction, effectId, nodes, edges, ids);
      return;
    case "make_weapon_attack":
      if (e.bonusDamage !== undefined) {
        traceDiceAmountScaling(
          e.bonusDamage.amount,
          effectId,
          slotId,
          nodes,
          edges,
          ids,
        );
      }
      return;
    case "override_attached_weapon_attack":
      traceDiceAmountScaling(e.damageDie, effectId, slotId, nodes, edges, ids);
      return;
    case "none":
    case "modify_ac":
    case "modify_ac_set_base":
    case "modify_save_dc":
    case "apply_condition":
    case "suppress_condition_self_end":
    case "restrict_action_usage":
    case "command_target_next_turn":
    case "forced_reaction_movement":
    case "jump_movement_replacement":
    case "feather_fall_mitigation":
    case "audible":
    case "push_unsecured_objects":
    case "remove_condition":
    case "grant_resistance":
    case "kill_target":
    case "end_current_effect":
    case "repeat_save_for_condition":
    case "condition_persists_after_full_duration":
    case "take_standard_action":
    case "grant_alternate_action_cost":
    case "modify_roll_numeric":
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
    case "suspend_target":
    case "fall_at_end_of_next_turn_unless_reapplied":
    case "force_fall":
    case "levitate_target":
    case "grab_fixed_object":
    case "suspend_in_area":
    case "fall_when_effect_ends":
    case "move_area":
    case "end_current_effect_at_area_height_zero":
    case "ability_check_to_move_in_area":
    case "fall_to_ground":
    case "block_targeting":
    case "choose_new_target_or_lose":
    case "block_travel":
    case "end_if_created_in_occupied_space":
    case "allow_designated_creatures_safe_passage":
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
    case "grant_feat":
    case "grant_proficiency":
    case "grant_expertise":
    case "grant_language":
    case "grant_hidden_language_messages":
    case "grant_language_choice":
    case "grant_spell_access":
    case "grant_spell_access_choice":
    case "grant_spell_free_casts":
    case "grant_die_token":
    case "grant_bonus_action_attack":
    case "replace_damage_die":
    case "substitute_ability_for_rolls":
    case "grant_condition_immunity":
    case "suppress_condition_benefit":
    case "prevent_drop_to_0_hp":
    case "negate_instant_death":
    case "make_stable":
    case "grant_damage_immunity":
    case "block_max_hp_reduction":
    case "set_speed_ratio":
    case "set_ability_score":
    case "modify_ability_score":
    case "modify_proficiency_bonus":
    case "teleport":
    case "transport_exile":
    case "container_storage":
    case "create_extradimensional_space":
    case "create_sensor":
    case "remote_perception":
    case "grant_speed":
    case "ignore_web_restrictions":
    case "alter_item_kind":
    case "detect":
    case "locate_kind":
    case "object_location_sense":
    case "assign_courier_task":
    case "set_speed":
    case "negate_triggering_spell":
    case "reflect_triggering_spell":
    case "waste_triggering_spell_or_effect":
    case "end_ongoing_spells":
    case "maximize_healing_received":
    case "transform_target":
    case "natural_weapons":
    case "water_breathing":
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
    case "area_has_strong_wind":
    case "prevent_ranged_weapon_attacks":
    case "area_movement_cost_multiplier":
    case "grant_cover":
    case "block_line_of_sight":
    case "prevent_creature_passage":
    case "prevent_spellcasting_and_magic_actions":
    case "prevent_magical_ranged_attacks":
    case "block_magical_targeting_and_aoe":
    case "block_teleport_and_planar_travel":
    case "suppress_magic_items":
    case "suppress_ongoing_magic_effects":
    case "allow_reaction_stand_up":
    case "revert_shape_shift_to_true_form":
    case "suppress_shape_shifting_while_in_area":
      return;
    case "ordered_barrier_layers":
      for (const layer of e.layers) {
        if (layer.save !== undefined) {
          traceEffectAtomScaling(
            layer.save.onFail,
            effectId,
            slotId,
            nodes,
            edges,
            ids,
          );
          if (layer.save.onSuccess.kind !== "half_damage") {
            traceEffectAtomScaling(
              layer.save.onSuccess,
              effectId,
              slotId,
              nodes,
              edges,
              ids,
            );
          }
        }
        if (layer.passiveEffects !== undefined) {
          for (const passive of layer.passiveEffects) {
            traceEffectAtomScaling(
              passive,
              effectId,
              slotId,
              nodes,
              edges,
              ids,
            );
          }
        }
      }
      return;
    case "delayed_save":
      traceEffectAtomScaling(e.onSuccess, effectId, slotId, nodes, edges, ids);
      traceEffectAtomScaling(e.onFailure, effectId, slotId, nodes, edges, ids);
      return;
    case "repeat_save_counter":
      traceEffectAtomScaling(
        e.onSuccessCount,
        effectId,
        slotId,
        nodes,
        edges,
        ids,
      );
      traceEffectAtomScaling(
        e.onFailureCount,
        effectId,
        slotId,
        nodes,
        edges,
        ids,
      );
      return;
    case "reduce_area_height":
      traceDiceAmountScaling(e.amount, effectId, slotId, nodes, edges, ids);
      return;
    case "damage_structure":
      traceDiceAmountScaling(e.amount, effectId, slotId, nodes, edges, ids);
      return;
    case "composite":
      for (const child of e.effects) {
        traceEffectAtomScaling(child, effectId, slotId, nodes, edges, ids);
      }
      return;
    case "choose_effect_mode":
      for (const option of e.options) {
        for (const effect of option.effects) {
          traceOngoingChoiceEffectScaling(
            effect,
            effectId,
            slotId,
            nodes,
            edges,
            ids,
          );
        }
      }
      return;
    default: {
      const _exhaustive: never = e;
      throw new Error(`unhandled effect atom scaling: ${String(_exhaustive)}`);
    }
  }
}

export function traceUsageLimit(
  limit: UsageLimit | undefined,
  hostId: string,
  relation: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string | null {
  if (limit === undefined) {
    return null;
  }
  const fenceId = limit.limitGroup ?? ids("fence");
  const expectedLabel = `use_count\n${describeUsageLimit(limit)}`;
  const existingNode = nodes.find((n) => n.id === fenceId);
  if (existingNode === undefined) {
    nodes.push({
      id: fenceId,
      category: "resource",
      atomKind: "use_count",
      label: expectedLabel,
    });
  } else if (existingNode.label !== expectedLabel) {
    throw new Error(
      `Usage limit group "${limit.limitGroup}" has inconsistent kinds: ` +
        `existing "${existingNode.label}", new "${expectedLabel}"`,
    );
  }
  edges.push({ from: hostId, to: fenceId, relation });
  return fenceId;
}

export function traceOngoingChoiceEffectScaling(
  eff: import("../surface/types.ts").OngoingEffect,
  effectId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (eff.kind) {
    case "save_gate":
      traceEffectAtomScaling(eff.onFail, effectId, slotId, nodes, edges, ids);
      if (
        eff.onSuccess.kind !== "none" &&
        eff.onSuccess.kind !== "half_damage"
      ) {
        traceEffectAtomScaling(
          eff.onSuccess,
          effectId,
          slotId,
          nodes,
          edges,
          ids,
        );
      }
      return;
    case "ability_check_gate":
      traceEffectAtomScaling(eff.onPass, effectId, slotId, nodes, edges, ids);
      if (eff.onFail !== undefined) {
        traceEffectAtomScaling(eff.onFail, effectId, slotId, nodes, edges, ids);
      }
      return;
    case "attack_roll":
      for (const hit of eff.onHit) {
        traceEffectAtomScaling(hit, effectId, slotId, nodes, edges, ids);
      }
      for (const miss of eff.onMiss) {
        traceEffectAtomScaling(miss, effectId, slotId, nodes, edges, ids);
      }
      return;
    case "composite_ongoing":
      for (const child of eff.effects) {
        traceOngoingChoiceEffectScaling(
          child,
          effectId,
          slotId,
          nodes,
          edges,
          ids,
        );
      }
      return;
    case "modify_ac_set_floor":
      return;
    default:
      traceEffectAtomScaling(eff, effectId, slotId, nodes, edges, ids);
      return;
  }
}

export function describeUsageLimit(limit: UsageLimit): string {
  switch (limit.kind) {
    case "once_per_turn":
      return "once per turn";
    case "once_per_round":
      return "once per round";
    default: {
      const _: never = limit.kind;
      throw new Error(`unhandled usage limit: ${String(_)}`);
    }
  }
}
