import type { AreaDirectEffectAtom } from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  describeConditionChoice,
  describeDamageTypeRef,
  describeDc,
  describeDelta,
  describeDiceAmount,
  describeModifyAcSetBase,
  describeResistanceSourceFilter,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";
import type { TraceEffectAtomFn } from "./tracer-effect-types.ts";

export type OutcomeEffectAtom = Extract<
  AreaDirectEffectAtom,
  {
    readonly kind:
      | "object_contact_damage"
      | "none"
      | "damage"
      | "conditional_bonus_damage"
      | "conditional_by_current_hp"
      | "kill_target"
      | "end_current_effect"
      | "repeat_save_for_condition"
      | "repeat_save_counter"
      | "delayed_save"
      | "condition_persists_after_full_duration"
      | "heal_hp"
      | "prevent_hit_point_regain"
      | "heal_to_max_hp"
      | "modify_max_hp"
      | "modify_ac"
      | "modify_ac_set_base"
      | "modify_save_dc"
      | "apply_condition"
      | "suppress_condition_self_end"
      | "restrict_action_usage"
      | "command_target_next_turn"
      | "forced_reaction_movement"
      | "jump_movement_replacement"
      | "feather_fall_mitigation"
      | "audible"
      | "remove_condition"
      | "grant_resistance"
      | "reduce_damage_taken"
      | "share_damage_to_caster"
      | "retaliatory_damage";
  }
>;

export function traceOutcomeEffectAtom(
  e: OutcomeEffectAtom,
  nodes: TraceNode[],
  ids: IdGen,
  edges: TraceEdge[] | undefined,
  traceEffectAtom: TraceEffectAtomFn,
): string | null {
  switch (e.kind) {
    case "object_contact_damage": {
      const id = ids("dmg");
      nodes.push({
        id,
        category: "effect",
        atomKind: "object_contact_damage",
        label: [
          "object_contact_damage",
          `contact: ${e.contact.kind}`,
          `${describeDiceAmount(e.amount)} ${describeDamageTypeRef(e.damageType)}`,
        ].join("\n"),
      });
      if (edges !== undefined) {
        const save = e.holdingOrWearingSave;
        const saveId = ids("sg");
        nodes.push({
          id: saveId,
          category: "resolution",
          atomKind: "holding_or_wearing_save",
          label: `holding_or_wearing_save\n${save.ability.toUpperCase()} vs ${describeDc(save.dc)}\napplies: ${save.appliesIf.kind}`,
        });
        edges.push({ from: id, to: saveId, relation: "branches_on_contact" });

        const dropId = ids("drop");
        nodes.push({
          id: dropId,
          category: "resolution",
          atomKind: "drop_if_possible",
          label: [
            "drop_if_possible",
            save.onFailure.dropCapabilityWitness.kind,
            save.onFailure.dropResultWitness.kind,
            `fallback: ${save.onFailure.fallbackWhen}`,
          ].join("\n"),
        });
        edges.push({ from: saveId, to: dropId, relation: "branches_on_save" });

        const fallbackId = traceEffectAtom(
          save.onFailure.fallback,
          nodes,
          ids,
          edges,
        );
        if (fallbackId !== null) {
          edges.push({
            from: dropId,
            to: fallbackId,
            relation: "branches_on_drop_result",
          });
        }
      }
      return id;
    }
    case "none":
      return null;
    case "damage": {
      const id = ids("dmg");
      const whenTag = e.timing ? ` (deferred: ${e.timing})` : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "damage",
        label: `damage${whenTag}: ${describeDiceAmount(e.amount)} ${describeDamageTypeRef(e.damageType)}`,
      });
      return id;
    }
    case "conditional_bonus_damage": {
      const id = ids("dmg");
      const when =
        e.when.kind === "target_creature_type"
          ? `target type: ${e.when.types.join("/")}`
          : e.when.kind;
      nodes.push({
        id,
        category: "effect",
        atomKind: "conditional_bonus_damage",
        label: `conditional_bonus_damage\n${when}\n${describeDiceAmount(e.amount)} ${describeDamageTypeRef(e.damageType)}`,
      });
      return id;
    }
    case "conditional_by_current_hp": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "conditional_by_current_hp",
        label: `conditional_by_current_hp\nHP ${e.comparison} ${e.threshold}`,
      });
      if (edges !== undefined) {
        const matchId = traceEffectAtom(e.onMatch, nodes, ids, edges);
        if (matchId !== null) {
          edges.push({ from: id, to: matchId, relation: "branches_on_match" });
        }
        if (e.otherwise !== undefined) {
          const otherwiseId = traceEffectAtom(e.otherwise, nodes, ids, edges);
          if (otherwiseId !== null) {
            edges.push({
              from: id,
              to: otherwiseId,
              relation: "branches_otherwise",
            });
          }
        }
      }
      return id;
    }
    case "kill_target": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "kill_target",
        label: "kill_target",
      });
      return id;
    }
    case "end_current_effect": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "lifecycle",
        atomKind: "end_current_effect",
        label: "end_current_effect",
      });
      return id;
    }
    case "repeat_save_for_condition": {
      const id = ids("rep");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "repeat_save",
        label: `repeat_save\n${e.ability.toUpperCase()} vs ${describeDc(e.dc)}\ncondition: ${e.condition}\ncadence: ${e.cadence}\non success: ${e.onSuccess}`,
      });
      return id;
    }
    case "repeat_save_counter": {
      const id = ids("rep");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "repeat_save_counter",
        label: `repeat_save_counter\n${e.ability.toUpperCase()} vs ${describeDc(e.dc)}\ncondition: ${e.condition}${e.appliesCondition === true ? " (applies)" : ""}\ncadence: ${e.cadence}\n${e.successCount} successes / ${e.failureCount} failures`,
      });
      if (edges !== undefined) {
        const successId = traceEffectAtom(e.onSuccessCount, nodes, ids, edges);
        if (successId !== null) {
          edges.push({
            from: id,
            to: successId,
            relation: "on_success_count",
          });
        }
        const failureId = traceEffectAtom(e.onFailureCount, nodes, ids, edges);
        if (failureId !== null) {
          edges.push({
            from: id,
            to: failureId,
            relation: "on_failure_count",
          });
        }
      }
      return id;
    }
    case "delayed_save": {
      const id = ids("rep");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "delayed_save",
        label: `delayed_save\n${e.ability.toUpperCase()} vs ${describeDc(e.dc)}\ncadence: ${e.cadence}${e.condition === undefined ? "" : `\ncondition: ${e.condition}`}`,
      });
      if (edges !== undefined) {
        const successId = traceEffectAtom(e.onSuccess, nodes, ids, edges);
        if (successId !== null) {
          edges.push({
            from: id,
            to: successId,
            relation: "branches_on_save",
          });
        }
        const failureId = traceEffectAtom(e.onFailure, nodes, ids, edges);
        if (failureId !== null) {
          edges.push({
            from: id,
            to: failureId,
            relation: "branches_on_save",
          });
        }
      }
      return id;
    }
    case "condition_persists_after_full_duration": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "lifecycle",
        atomKind: "condition_persists_after_full_duration",
        label: `condition_persists_after_full_duration\n${e.condition}\nuntil: ${e.untilEndedBy}`,
      });
      return id;
    }
    case "heal_hp": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "heal",
        label: `heal\n${describeDiceAmount(e.amount)}\ntarget: ${e.target}`,
      });
      return id;
    }
    case "prevent_hit_point_regain": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "prevent_hit_point_regain",
        label: `prevent_hit_point_regain\nexpires: ${e.expiresAt}`,
      });
      return id;
    }
    case "heal_to_max_hp": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "heal_to_max_hp",
        label: `heal_to_max_hp\ntarget: ${e.target}`,
      });
      return id;
    }
    case "modify_max_hp": {
      const id = ids("eff");
      const directionTag = e.direction === "decrease" ? "\n(decrease)" : "";
      const floorTag =
        e.direction === "decrease" && e.floor !== undefined
          ? `\nfloor: ${e.floor}`
          : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_max_hp",
        label: `modify_max_hp\n${describeDiceAmount(e.delta)}${directionTag}${floorTag}`,
      });
      return id;
    }
    case "modify_ac": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_ac",
        label: `modify_ac\n${describeDelta(e.delta)}`,
      });
      return id;
    }
    case "modify_ac_set_base": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_ac_set_base",
        label: `modify_ac_set_base\n${describeModifyAcSetBase(e)}`,
      });
      return id;
    }
    case "modify_save_dc": {
      const id = ids("eff");
      const source =
        e.spellSourceFilter === undefined
          ? ""
          : `\nsource: ${e.spellSourceFilter.className} spells`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_save_dc",
        label: `modify_save_dc\n${describeDelta(e.delta)}${source}`,
      });
      return id;
    }
    case "apply_condition": {
      const id = ids("cond");
      const duration = e.duration === undefined ? "" : `\nuntil: ${e.duration}`;
      const label = `apply_condition\n${describeConditionChoice(e.condition)}${duration}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "apply_condition",
        label,
      });
      return id;
    }
    case "suppress_condition_self_end": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "suppress_condition_self_end",
        label: `suppress_condition_self_end\n${e.condition}`,
      });
      return id;
    }
    case "restrict_action_usage": {
      const id = ids("eff");
      const condition =
        e.whileCondition === undefined ? "" : `\nwhile: ${e.whileCondition}`;
      const duration = e.duration === undefined ? "" : `\nuntil: ${e.duration}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "restrict_action_usage",
        label: `restrict_action_usage\n${e.actions.join(", ")}${condition}${duration}`,
      });
      return id;
    }
    case "command_target_next_turn": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "command_target_next_turn",
        label: [
          "command_target_next_turn",
          e.execution,
          `approach: ${e.options.approach.route}, end within ${e.options.approach.endsTurnWhenWithinFeet} ft`,
          `drop: ${e.options.drop.objectSet}, then ${e.options.drop.afterward}`,
          `flee: ${e.options.flee.means} ${e.options.flee.direction}`,
          `grovel: ${e.options.grovel.condition}, then ${e.options.grovel.afterward}`,
          "halt: no movement/action/bonus action",
        ].join("\n"),
      });
      return id;
    }
    case "forced_reaction_movement": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "forced_reaction_movement",
        label: [
          "forced_reaction_movement",
          `cost: ${e.cost}`,
          `unavailable: ${e.unavailable}`,
          `${e.distance} ${e.direction}`,
          `route: ${e.route}`,
        ].join("\n"),
      });
      return id;
    }
    case "jump_movement_replacement": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "jump_movement_replacement",
        label: [
          "jump_movement_replacement",
          e.frequency,
          `jump: up to ${e.maxJumpDistanceFeet} ft`,
          `movement cost: ${e.movementCostFeet} ft`,
        ].join("\n"),
      });
      return id;
    }
    case "feather_fall_mitigation": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "feather_fall_mitigation",
        label: [
          "feather_fall_mitigation",
          `descent cap: ${e.descentRateCapFeetPerRound} ft/round`,
          e.landingOutcome,
        ].join("\n"),
      });
      return id;
    }
    case "audible": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "audible",
        label: `audible\n${e.sound}\nradius: ${e.audibleRadiusFeet} ft`,
      });
      return id;
    }
    case "remove_condition": {
      const id = ids("eff");
      const label = `remove_condition\n${describeConditionChoice(e.condition)}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "remove_condition",
        label,
      });
      return id;
    }
    case "grant_resistance": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_resistance",
        label: `grant_resistance\n${describeDamageTypeRef(e.damageType)}${describeResistanceSourceFilter(e.sourceFilter)}`,
      });
      return id;
    }
    case "reduce_damage_taken": {
      const id = ids("eff");
      const scope =
        e.damageType === undefined
          ? ""
          : `\nvs ${describeDamageTypeRef(e.damageType)}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "reduce_damage_taken",
        label: `reduce_damage_taken\n${describeDiceAmount(e.amount)}${scope}`,
      });
      return id;
    }
    case "share_damage_to_caster": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "share_damage_to_caster",
        label: `share_damage_to_caster\n${e.amount}`,
      });
      return id;
    }
    case "retaliatory_damage": {
      const id = ids("dmg");
      nodes.push({
        id,
        category: "effect",
        atomKind: "retaliatory_damage",
        label: `retaliatory_damage\n${describeDiceAmount(e.amount)} ${describeDamageTypeRef(e.damageType)}\ntarget: ${e.target}`,
      });
      return id;
    }
    default: {
      const _exhaustive: never = e;
      throw new Error(`unhandled outcome effect atom: ${String(_exhaustive)}`);
    }
  }
}
