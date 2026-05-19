import type { AreaDirectEffectAtom } from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  describeCriticalRangeAttackFilter,
  describeDc,
  describeDelta,
  describeDiceAmount,
  describeSavingThrowSourceFilter,
  describeSkillFilter,
  describeWeaponFilter,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";
import type { TraceEffectAtomFn } from "./tracer-effect-types.ts";

export type ActionAndRollEffectAtom = Extract<
  AreaDirectEffectAtom,
  {
    readonly kind:
      | "take_standard_action"
      | "grant_alternate_action_cost"
      | "grant_extra_action"
      | "modify_roll_numeric"
      | "jack_of_all_trades_ability_check_bonus"
      | "modify_damage_numeric"
      | "modify_size_category"
      | "modify_roll_advantage"
      | "suppress_roll_disadvantage"
      | "remove_equipment_requirement"
      | "modify_crit_range"
      | "transfer_weapon_bonus_to_ac"
      | "suppress_incoming_critical_hit"
      | "scale_attack_count"
      | "modify_speed"
      | "force_move"
      | "push_unsecured_objects"
      | "suspend_target"
      | "fall_at_end_of_next_turn_unless_reapplied"
      | "force_fall"
      | "levitate_target"
      | "grab_fixed_object"
      | "suspend_in_area"
      | "fall_when_effect_ends"
      | "move_area"
      | "reduce_area_height"
      | "end_current_effect_at_area_height_zero"
      | "ability_check_to_move_in_area"
      | "fall_to_ground"
      | "block_targeting"
      | "choose_new_target_or_lose"
      | "block_travel"
      | "end_if_created_in_occupied_space"
      | "allow_designated_creatures_safe_passage";
  }
>;

export function traceActionAndRollEffectAtom(
  e: ActionAndRollEffectAtom,
  nodes: TraceNode[],
  ids: IdGen,
  _edges: TraceEdge[] | undefined,
  _traceEffectAtom: TraceEffectAtomFn,
): string | null {
  switch (e.kind) {
    case "take_standard_action": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "take_standard_action",
        label: `take_standard_action\n${e.action}\ncost: ${e.cost}`,
      });
      return id;
    }
    case "grant_alternate_action_cost": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_alternate_action_cost",
        label: `grant_alternate_action_cost\n${e.from.actions.join(", ")}\nas ${e.to.kind}`,
      });
      return id;
    }
    case "grant_extra_action": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_extra_action",
        label: "grant_extra_action\n(1 additional action)",
      });
      return id;
    }
    case "modify_roll_numeric": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_roll_numeric",
        label: `modify_roll_numeric\n${describeDelta(e.delta)}\non ${e.on.join(", ")}${describeWeaponFilter(e.weaponFilter)}`,
      });
      return id;
    }
    case "jack_of_all_trades_ability_check_bonus": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "jack_of_all_trades_ability_check_bonus",
        label:
          "Jack of All Trades\nhalf Proficiency Bonus on unproficient skill Ability Checks\nno other Proficiency Bonus",
      });
      return id;
    }
    case "modify_damage_numeric": {
      const id = ids("eff");
      const damageSource =
        e.damageSourceFilter === undefined
          ? ""
          : `\nsource: ${e.damageSourceFilter.attackRollFilter}`;
      const minimum =
        e.minimumDamageTotal === undefined
          ? ""
          : `\nminimum total: ${e.minimumDamageTotal}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_damage_numeric",
        label: `modify_damage_numeric\n${describeDelta(e.delta)}${damageSource}${describeWeaponFilter(e.weaponFilter)}${minimum}`,
      });
      return id;
    }
    case "modify_size_category": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_size_category",
        label: `modify_size_category\n${e.direction} ${e.steps}`,
      });
      return id;
    }
    case "modify_roll_advantage": {
      const id = ids("eff");
      const by =
        e.attackerTypeFilter !== undefined && e.attackerTypeFilter.length > 0
          ? `\nby: ${e.attackerTypeFilter.join("/")}`
          : "";
      const condition =
        e.conditionFilter !== undefined && e.conditionFilter.length > 0
          ? `\ncondition: ${e.conditionFilter.join("/")}`
          : "";
      const ability =
        e.abilityFilter === undefined
          ? ""
          : Array.isArray(e.abilityFilter)
            ? `\nability: ${e.abilityFilter.join("/")}`
            : "holeId" in e.abilityFilter
              ? `\nability: ${e.abilityFilter.label ?? e.abilityFilter.holeId}`
              : "";
      const saveAbility =
        e.saveAbilityFilter === undefined
          ? ""
          : `\nsave ability: ${e.saveAbilityFilter.join("/")}`;
      const contextRange =
        e.contextRangeFeet !== undefined
          ? `\ncontext: within ${e.contextRangeFeet} ft`
          : "";
      const spellSource =
        e.spellSourceFilter === undefined
          ? ""
          : `\nsource: ${e.spellSourceFilter.className} spells`;
      const saveSource = describeSavingThrowSourceFilter(e.saveSourceFilter);
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_roll_advantage",
        label: `modify_roll_advantage\n${e.mode} on ${e.on.join(", ")}${by}${condition}${ability}${saveAbility}${spellSource}${saveSource}${contextRange}`,
      });
      return id;
    }
    case "suppress_roll_disadvantage": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "suppress_roll_disadvantage",
        label: `suppress_roll_disadvantage\non ${e.on.join(", ")}${describeSkillFilter(e.skillFilter)}`,
      });
      return id;
    }
    case "remove_equipment_requirement": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "remove_equipment_requirement",
        label: `remove_equipment_requirement\n${e.requirement}`,
      });
      return id;
    }
    case "modify_crit_range": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_crit_range",
        label: `modify_crit_range\n${describeCriticalRangeAttackFilter(e.attackRollFilter)} crits on ${e.threshold}-20${describeWeaponFilter(e.weaponFilter)}`,
      });
      return id;
    }
    case "transfer_weapon_bonus_to_ac": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "transfer_weapon_bonus_to_ac",
        label: `transfer_weapon_bonus_to_ac\nup to +${e.maxBonus} from ${e.from}\n${e.trigger} until ${e.duration}${describeWeaponFilter(e.weaponFilter)}`,
      });
      return id;
    }
    case "suppress_incoming_critical_hit": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "suppress_incoming_critical_hit",
        label:
          "suppress_incoming_critical_hit\ncritical hits against bearer become normal hits",
      });
      return id;
    }
    case "scale_attack_count": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "scale_attack_count",
        label: `scale_attack_count\n+${e.additional} attack${e.additional === 1 ? "" : "s"} per Attack action`,
      });
      return id;
    }
    case "modify_speed": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_speed",
        label: `modify_speed\n${e.delta >= 0 ? "+" : ""}${e.delta} ${e.unit}`,
      });
      return id;
    }
    case "force_move": {
      const id = ids("eff");
      let movementDetail: string = e.movementKind;
      if (e.movementKind === "move") {
        movementDetail = `${e.movementKind} ${e.direction}`;
      } else if (e.movementKind === "push" && e.originDirection !== undefined) {
        movementDetail = `${e.movementKind} ${e.originDirection}`;
      }
      nodes.push({
        id,
        category: "effect",
        atomKind: "force_move",
        label: `force_move\n${movementDetail} ${e.distanceFeet} ft`,
      });
      return id;
    }
    case "push_unsecured_objects": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "push_unsecured_objects",
        label: `push_unsecured_objects\n${e.objectLocation}\n${e.originDirection} ${e.distanceFeet} ft`,
      });
      return id;
    }
    case "suspend_target": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "suspend_target",
        label: `suspend_target\nuntil: ${e.until}`,
      });
      return id;
    }
    case "fall_at_end_of_next_turn_unless_reapplied": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "fall_at_end_of_next_turn_unless_reapplied",
        label: "fall_at_end_of_next_turn_unless_reapplied",
      });
      return id;
    }
    case "force_fall": {
      const id = ids("eff");
      const distance =
        e.maxDistanceFeet === undefined
          ? ""
          : `\nup to ${e.maxDistanceFeet} ft`;
      const impact =
        e.impactAsNormalFall === true ? "\nimpact as normal fall" : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "force_fall",
        label: `force_fall\n${e.direction}${distance}${impact}`,
      });
      return id;
    }
    case "levitate_target": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "levitate_target",
        label: [
          `levitate_target\nrise up to ${e.initialRiseMaxFeet} ft`,
          `suspend: ${e.suspension}`,
          `movement: ${e.targetMovement.allowedBy}`,
          `mode: ${e.targetMovement.movementMode}`,
          `caster altitude: ${e.casterAltitudeControl.direction} ${e.casterAltitudeControl.maxDistanceFeet} ft`,
          `cost: ${e.casterAltitudeControl.cost}`,
          `self altitude: ${e.selfAltitudeControl.cost}`,
          `ending: ${e.ending}`,
        ].join("\n"),
      });
      return id;
    }
    case "grab_fixed_object": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grab_fixed_object",
        label: "grab_fixed_object",
      });
      return id;
    }
    case "suspend_in_area": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "suspend_in_area",
        label: `suspend_in_area\nlocation: ${e.location}\nuntil: ${e.until}`,
      });
      return id;
    }
    case "fall_when_effect_ends": {
      const id = ids("eff");
      const unless =
        e.unlessCanStopFall === true ? "\nunless can stop fall" : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "fall_when_effect_ends",
        label: `fall_when_effect_ends\n${e.direction}${unless}`,
      });
      return id;
    }
    case "move_area": {
      const id = ids("eff");
      const carry =
        e.includeCreaturesInArea === true ? "\nwith creatures in area" : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "move_area",
        label: `move_area\n${e.direction} ${e.distanceFeet} ft${carry}`,
      });
      return id;
    }
    case "reduce_area_height": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "reduce_area_height",
        label: `reduce_area_height\n${describeDiceAmount(e.amount)}`,
      });
      return id;
    }
    case "end_current_effect_at_area_height_zero": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "lifecycle",
        atomKind: "end_current_effect_at_area_height_zero",
        label: "end_current_effect_at_area_height_zero",
      });
      return id;
    }
    case "ability_check_to_move_in_area": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "ability_check_to_move_in_area",
        label: `ability_check_to_move_in_area\n${e.ability.toUpperCase()} (${e.skill}) vs ${describeDc(e.dc)}\non failure: ${e.onFailure}`,
      });
      return id;
    }
    case "fall_to_ground": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "fall_to_ground",
        label: "fall_to_ground",
      });
      return id;
    }
    case "block_targeting": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_targeting",
        label: `block_targeting\nscope: ${e.scope}`,
      });
      return id;
    }
    case "choose_new_target_or_lose": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "choose_new_target_or_lose",
        label: `choose_new_target_or_lose\n${e.subject}`,
      });
      return id;
    }
    case "block_travel": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_travel",
        label: `block_travel\nscope: ${e.scope}`,
      });
      return id;
    }
    case "end_if_created_in_occupied_space": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "lifecycle",
        atomKind: "end_if_created_in_occupied_space",
        label: "end_if_created_in_occupied_space",
      });
      return id;
    }
    case "allow_designated_creatures_safe_passage": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "allow_designated_creatures_safe_passage",
        label: "allow_designated_creatures_safe_passage",
      });
      return id;
    }
    default: {
      const _exhaustive: never = e;
      throw new Error(
        `unhandled action or roll effect atom: ${String(_exhaustive)}`,
      );
    }
  }
}
