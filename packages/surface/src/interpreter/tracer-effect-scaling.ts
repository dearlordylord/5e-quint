import type { AreaDirectEffectAtom, UsageLimit } from "../surface/types.ts";
import { Match } from "effect";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

import { traceActionRestriction } from "./tracer-action-restrictions.ts";

import { traceDiceAmountScaling } from "./tracer-scaling.ts";
import { isIlluminationEffectAtom } from "./tracer-effect-illumination.ts";

const byKind = Match.discriminator("kind");

// Emit scaling nodes for effect atoms that carry a DiceAmount.
export function traceEffectAtomScaling(
  e: AreaDirectEffectAtom,
  effectId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  if (isIlluminationEffectAtom(e)) return;
  return Match.value(e)
    .pipe(
      byKind("object_contact_damage", (e) => {
        traceDiceAmountScaling(e.amount, effectId, slotId, nodes, edges, ids);
        return;
      }),
      byKind(
        "damage",
        "conditional_bonus_damage",
        "retaliatory_damage",
        (e) => {
          traceDiceAmountScaling(e.amount, effectId, slotId, nodes, edges, ids);
          return;
        },
      ),
      byKind("share_damage_to_caster", () => {
        return;
      }),
      byKind("heal_hp", "grant_temp_hp", (e) => {
        traceDiceAmountScaling(e.amount, effectId, slotId, nodes, edges, ids);
        return;
      }),
      byKind(
        "grant_rest_benefit",
        "spell_recipient_rest_lockout",
        "deliver_mental_message",
        "prevent_hit_point_regain",
        "heal_to_max_hp",
        () => {
          return;
        },
      ),
      byKind("modify_max_hp", (e) => {
        traceDiceAmountScaling(e.delta, effectId, slotId, nodes, edges, ids);
        return;
      }),
      byKind("reduce_damage_taken", (e) => {
        traceDiceAmountScaling(e.amount, effectId, slotId, nodes, edges, ids);
        return;
      }),
      byKind("conditional_by_current_hp", (e) => {
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
      }),
      byKind("grant_extra_action", (e) => {
        traceActionRestriction(e.restriction, effectId, nodes, edges, ids);
        return;
      }),
      byKind("make_weapon_attack", (e) => {
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
      }),
      byKind("override_attached_weapon_attack", (e) => {
        traceDiceAmountScaling(
          e.damageDie,
          effectId,
          slotId,
          nodes,
          edges,
          ids,
        );
        return;
      }),
    )
    .pipe(
      byKind(
        "none",
        "half_initial_damage_only",
        "modify_ac",
        "modify_ac_set_base",
        "modify_save_dc",
        "apply_condition",
        "apply_condition_while_in_area_or_until_escape",
        "suppress_condition_self_end",
        "target_effect_escape_action",
        "restrict_action_usage",
        "choose_action_or_bonus_action_each_turn",
        "compelled_target_next_turn",
        "forced_reaction_movement",
        "jump_movement_replacement",
        "feather_fall_mitigation",
        "audible",
        "push_unsecured_objects",
        "remove_condition",
        "grant_resistance",
        "kill_target",
        "end_current_effect",
        "effect_end_target_state",
        "repeat_save_for_condition",
        "condition_persists_after_full_duration",
        "take_standard_action",
        "grant_alternate_action_cost",
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
        "suspend_target",
        "fall_at_end_of_next_turn_unless_reapplied",
        "force_fall",
        "levitate_target",
        "grab_fixed_object",
        "suspend_in_area",
        "fall_when_effect_ends",
        "move_area",
        "end_current_effect_at_area_height_zero",
        "ability_check_to_move_in_area",
        "fall_to_ground",
        "block_targeting",
        "choose_new_target_or_lose",
        "block_travel",
        "end_if_created_in_occupied_space",
        "allow_designated_creatures_safe_passage",
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
        "prevent_drop_to_0_hp",
        "negate_instant_death",
        "make_stable",
        "revive_dead_creature",
        "grant_damage_immunity",
        "block_max_hp_reduction",
        "set_speed_ratio",
        "set_ability_score",
        "modify_ability_score",
        "modify_proficiency_bonus",
        "teleport",
        "transport_exile",
        "ethereal_phase",
        "container_storage",
        "create_extradimensional_space",
        "create_sensor",
        "remote_perception",
        "grant_speed",
        "grant_liquid_surface_traversal",
        "ignore_web_restrictions",
        "alter_item_kind",
        "detect",
        "locate_kind",
        "object_location_sense",
        "block_divination_targeting_and_scrying_perception",
        "divination_omen",
        "assign_courier_task",
        "magical_identity_mask",
        "set_speed",
        "negate_triggering_spell",
        "reflect_triggering_spell",
        "waste_triggering_spell_or_effect",
        "end_ongoing_spells",
        "maximize_healing_received",
        "transform_target",
        "natural_weapons",
        "water_breathing",
        "spell_created_held_object",
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
        "allow_reaction_stand_up",
        "revert_shape_shift_to_true_form",
        "suppress_shape_shifting_while_in_area",
        () => {
          return;
        },
      ),
      byKind("ordered_barrier_layers", (e) => {
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
      }),
      byKind("delayed_save", (e) => {
        traceEffectAtomScaling(
          e.onSuccess,
          effectId,
          slotId,
          nodes,
          edges,
          ids,
        );
        traceEffectAtomScaling(
          e.onFailure,
          effectId,
          slotId,
          nodes,
          edges,
          ids,
        );
        return;
      }),
      byKind("repeat_save_counter", (e) => {
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
      }),
      byKind("reduce_area_height", (e) => {
        traceDiceAmountScaling(e.amount, effectId, slotId, nodes, edges, ids);
        return;
      }),
      byKind("damage_structure", (e) => {
        traceDiceAmountScaling(e.amount, effectId, slotId, nodes, edges, ids);
        return;
      }),
      byKind("area_section_burns_away", (e) => {
        traceDiceAmountScaling(
          e.creatureStartsTurnInFireDamage.amount,
          effectId,
          slotId,
          nodes,
          edges,
          ids,
        );
        return;
      }),
      byKind("composite", (e) => {
        for (const child of e.effects) {
          traceEffectAtomScaling(child, effectId, slotId, nodes, edges, ids);
        }
        return;
      }),
      byKind("choose_effect_mode", (e) => {
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
      }),
      byKind("curse_occurrence", (e) => {
        for (const option of e.options) {
          for (const operation of option.operations) {
            traceOngoingChoiceEffectScaling(
              operation.effect,
              effectId,
              slotId,
              nodes,
              edges,
              ids,
            );
          }
        }
        return;
      }),
      byKind("planar_entity_answers", () => {
        return;
      }),
      Match.exhaustive,
    );
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
  } else {
    /* v8 ignore start -- @preserve -- the Surface usage-limit group invariant requires one kind per group; a conflicting label is malformed group composition */
    if (existingNode.label !== expectedLabel) {
      throw new Error(
        `Usage limit group "${limit.limitGroup}" has inconsistent kinds: ` +
          `existing "${existingNode.label}", new "${expectedLabel}"`,
      );
    }
    /* v8 ignore stop -- @preserve */
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
    case "random_table":
      for (const outcome of eff.outcomes) {
        for (const effect of outcome.effects ?? []) {
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
    /* v8 ignore start -- @preserve -- UsageLimit is decoder-narrowed to the two handled kinds */
    default: {
      const _: never = limit.kind;
      throw new Error(`unhandled usage limit: ${String(_)}`);
    }
    /* v8 ignore stop -- @preserve */
  }
}
