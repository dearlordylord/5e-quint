// Tracer — interpreter over the authored unit ADT. Emits a dependency
// graph of atoms + typed relations; does not call the combat runtime.

import * as Either from "effect/Either";
import {
  elapsedTimeTicksFromHours,
  formatElapsedTimeTicks,
  formatTimeSpanDuration,
  timeSpanDuration,
} from "@dnd/shared/elapsed-time";

import type {
  UnitRecord,
  SpellRecord,
  BackgroundRecord,
  ClassFeatureRecord,
  ClassRecord,
  MasteryRecord,
  SpellMechanics,
  OngoingEffectMechanics,
  ActivationMechanics,
  ActivationPhase,
  CastTimeEffectModeChoice,
  CastingTime,
  Duration,
  DurationEndTrigger,
  Range,
  Attachment,
  AttachmentRangeOrigin,
  ObjectFilter,
  EffectAtom,
  OngoingOperation,
  DiceAmount,
  DiceExpr,
  DiceExprDelta,
  DiceDelta,
  LinkedSpeed,
  ResistanceSourceFilter,
  SavingThrowSourceFilter,
  WeaponFilter,
  TargetSelection,
  SlotScaling,
  ThresholdTiers,
  SpellLevel,
  StandardActionKind,
  ProficiencyGrant,
  ProficiencyGrantSubject,
  ToolProficiencyGrant,
  ToolProficiencyGrantSubject,
  ClassFeatureMechanics,
  ActivatedAbilityMechanics,
  PassiveMechanics,
  CompositeMagicItemMechanics,
  MagicItemMechanics,
  EquipmentPredicate,
  FeatRecord,
  SpeciesRecord,
  SpeciesTraitRecord,
  MagicItemRecord,
  StartingEquipmentChoice,
  StartingEquipmentItemRef,
  MagicItemAttunement,
  ClassFeatureActivationCost,
  ActivationResource,
  UseCountResource,
  ResetCadence,
  ActionRestriction,
  TriggeredReactionMechanics,
  TriggeredReactionAbilityMechanics,
  ReactionTrigger,
  MarkTransfer,
  OnHitTriggerMechanics,
  OnHitRiderEffect,
  RiderExpiry,
  DcSource,
  AnchoredTriggerMechanics,
  AnchorTarget,
  AnchoredEvent,
  AnchoredFilter,
  AnchoredSignal,
  AreaOrigin,
  AreaOccupantDispositionFilter,
  AreaShapeDescriptor,
  AreaShapeSpec,
  DamageTypeRef,
  ItemDestructionPolicy,
  SpellAccessMode,
  GrantedSpellDurationOverride,
  SaveGateRiderResult,
  SpawnedCreaturePayload,
  CreatureStatBlock,
  CreatureActions,
  CreatureNamedAttackRoll,
  CreatureNamedSaveGate,
  CreatureNamedSupport,
  CreatureNamedMultiattack,
  CreatureNamedActionOption,
  CreatureControl,
  StatBlockValue,
  ReanimatedCreatureMechanics,
  TemplatedMultiSpawnMechanics,
  GrantedSpellTargetRestriction,
  MagicItemAttunementRestriction,
  MagicItemVariant,
  PassiveOperation,
  MagicItemSpawnedCreatureMechanics,
  PassiveSuppressor,
  SpawnedCreatureStatBlock,
  SkillFilter,
  UsageLimit,
  ArmorRecord,
  ArmorTemplateRecord,
  ShieldRecord,
  ShieldTemplateRecord,
  WeaponRecord,
  WeaponTemplateRecord,
  WeaponProficiency,
  ArmorAcFormula,
  WeaponDamage,
  WeaponPropertyDetail,
  MagicEquipmentVariant,
  TriggeredReplacementMechanics,
  StatBlockRecord,
  PrimaryAbilityExpression,
} from "../surface/types.ts";

export type AtomCategory =
  | "source"
  | "procedure"
  | "window"
  | "hole"
  | "attachment"
  | "resolution"
  | "lifecycle"
  | "resource"
  | "scaling"
  | "effect"
  | "statBlock";

export type TraceNode = {
  readonly id: string;
  readonly category: AtomCategory;
  readonly atomKind: string;
  readonly label: string;
};

export type TraceEdge = {
  readonly from: string;
  readonly to: string;
  readonly relation: string;
};

export type Trace = {
  readonly unitId: string;
  readonly unitName: string;
  readonly nodes: ReadonlyArray<TraceNode>;
  readonly edges: ReadonlyArray<TraceEdge>;
  readonly atomKinds: ReadonlyArray<string>;
};

export function traceUnit(unit: UnitRecord): Trace {
  switch (unit.kind) {
    case "spell":
      return traceSpellUnit(unit);
    case "class":
      return traceClassUnit(unit);
    case "subclass":
      return traceSubclassUnit(unit);
    case "class_feature":
      return traceClassFeatureUnit(unit);
    case "background":
      return traceBackgroundUnit(unit);
    case "mastery":
      return traceMasteryUnit(unit);
    case "feat":
      return traceFeatUnit(unit);
    case "species":
      return traceSpeciesUnit(unit);
    case "species_trait":
      return traceSpeciesTraitUnit(unit);
    case "magic_item":
      return traceMagicItemUnit(unit);
    case "armor":
      return traceArmorUnit(unit);
    case "armor_template":
      return traceArmorTemplateUnit(unit);
    case "shield":
      return traceShieldUnit(unit);
    case "shield_template":
      return traceShieldTemplateUnit(unit);
    case "weapon":
      return traceWeaponUnit(unit);
    case "weapon_template":
      return traceWeaponTemplateUnit(unit);
    default: {
      const _exhaustive: never = unit;
      throw new Error(`unhandled unit kind: ${String(_exhaustive)}`);
    }
  }
}

export function traceStatBlock(record: StatBlockRecord): Trace {
  const ids = idGen();
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const rootId = ids("stat");

  nodes.push({
    id: rootId,
    category: "statBlock",
    atomKind: "stat_block_record",
    label: `stat_block_record\n${record.name}\nauthored content, not Unit`,
  });

  for (const [slot, kind] of [
    [record.statBlock.actions, "action"],
    [record.statBlock.bonusActions, "bonus_action"],
    [record.statBlock.reactions, "reaction"],
  ] as const) {
    if (slot === undefined) continue;
    traceCreatureActions(
      {
        procId: rootId,
        compId: rootId,
        slotId: null,
        kind,
        nodes,
        edges,
        ids,
      },
      slot,
    );
  }

  return {
    unitId: record.id,
    unitName: record.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

// ============================================================
// Unified effect atom tracer
// ============================================================

// Single function that traces any EffectAtom variant. Returns the node
// id, or null for the `none` sentinel. `edges` is optional — legacy
// callers omit it; composite (and future structural atoms) need it to
// wire child nodes under the returned parent.
function traceEffectAtom(
  e: EffectAtom,
  nodes: TraceNode[],
  ids: IdGen,
  edges?: TraceEdge[],
): string | null {
  switch (e.kind) {
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
        label: `share_damage_to_caster\nrange ${e.rangeFeet} ft`,
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
    case "modify_damage_numeric": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_damage_numeric",
        label: `modify_damage_numeric\n${describeDelta(e.delta)}${describeWeaponFilter(e.weaponFilter)}`,
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
        e.abilityFilter !== undefined && e.abilityFilter.length > 0
          ? `\nability: ${e.abilityFilter.join("/")}`
          : "";
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
        label: `modify_roll_advantage\n${e.mode} on ${e.on.join(", ")}${by}${condition}${ability}${spellSource}${saveSource}${contextRange}`,
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
      nodes.push({
        id,
        category: "effect",
        atomKind: "force_move",
        label: `force_move\n${e.direction} ${e.distanceFeet} ft`,
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
    case "object_immune_to_all_damage": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "object_immune_to_all_damage",
        label: "object_immune_to_all_damage",
      });
      return id;
    }
    case "object_destroyed_by_spell": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "object_destroyed_by_spell",
        label: `object_destroyed_by_spell\n${e.spellId}`,
      });
      return id;
    }
    case "cannot_be_dispelled_by_spell": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "cannot_be_dispelled_by_spell",
        label: `cannot_be_dispelled_by_spell\n${e.spellId}`,
      });
      return id;
    }
    case "block_ethereal_travel": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_ethereal_travel",
        label: "block_ethereal_travel",
      });
      return id;
    }
    case "replace_destroyed_object_section_with_area": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "replace_destroyed_object_section_with_area",
        label: `replace_destroyed_object_section_with_area\n${e.areaLabel}`,
      });
      return id;
    }
    case "block_projectiles": {
      const id = ids("eff");
      const exception =
        e.exception === undefined ? "" : `\nexcept: ${e.exception}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_projectiles",
        label: `block_projectiles\n${e.projectile}${exception}`,
      });
      return id;
    }
    case "block_gases_and_gaseous_creatures": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_gases",
        label: "block_gases_and_gaseous_creatures",
      });
      return id;
    }
    case "block_flying_movement": {
      const id = ids("eff");
      const objects = e.includesObjects === true ? "\nincludes objects" : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_flying_movement",
        label: `block_flying_movement\nmax size: ${e.maxSize}${objects}`,
      });
      return id;
    }
    case "negate_named_effect": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "negate_named_effect",
        label: `negate_named_effect\n${e.spellId} (${e.scope})`,
      });
      return id;
    }
    case "grant_sense": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_sense",
        label: `grant_sense\n${e.sense} ${e.rangeFeet} ft`,
      });
      return id;
    }
    case "modify_sense_range": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_sense_range",
        label:
          `modify_sense_range\n${e.sense}: grant ${e.grantIfAbsentFeet} ft if absent` +
          `\nelse +${e.increaseIfPresentFeet} ft`,
      });
      return id;
    }
    case "grant_language_understanding": {
      const id = ids("eff");
      const outward = e.intelligibleToAnyLanguageKnower
        ? "\nunderstood by any language-knower"
        : "";
      const writtenTouch =
        e.writtenRequiresTouch === true ? "\nwritten: touch required" : "";
      const excludesCodes =
        e.excludesCodesAndSecretMessages === true
          ? "\nexcludes codes/secret messages"
          : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_language_understanding",
        label: `grant_language_understanding\n${e.scope}${outward}${writtenTouch}${excludesCodes}`,
      });
      return id;
    }
    case "grant_creature_communication": {
      const id = ids("eff");
      const influence = e.includesInfluenceActionOptions
        ? "\nincludes Influence action options"
        : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_creature_communication",
        label: `grant_creature_communication\n${e.creatureType}${influence}`,
      });
      return id;
    }
    case "deny_opportunity_attack": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "deny_opportunity_attack",
        label: "deny_opportunity_attack",
      });
      return id;
    }
    case "grant_temp_hp": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_temp_hp",
        label: `grant_temp_hp\n${describeDiceAmount(e.amount)}`,
      });
      return id;
    }
    case "prevent_drop_to_0_hp": {
      const id = ids("eff");
      const once = e.consumesEffect === true ? "\nconsumes effect" : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "prevent_drop_to_0_hp",
        label: `prevent_drop_to_0_hp\nreplacement HP: ${e.replacementHp}${once}`,
      });
      return id;
    }
    case "negate_instant_death": {
      const id = ids("eff");
      const once = e.consumesEffect === true ? "\nconsumes effect" : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "negate_instant_death",
        label: `negate_instant_death${once}`,
      });
      return id;
    }
    case "grant_feat": {
      const id = ids("eff");
      const categories =
        "category" in e ? e.category : e.categories.join(" | ");
      const fallback =
        e.openFallback === "any_qualifying_feat"
          ? "\n+ any qualifying feat"
          : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_feat",
        label: `grant_feat\n${categories}${fallback}`,
      });
      return id;
    }
    case "grant_proficiency": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_proficiency",
        label: `grant_proficiency\n${describeProficiencyGrant(e.proficiency)}`,
      });
      return id;
    }
    case "grant_expertise": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_expertise",
        label: `grant_expertise\n${describeClassLevelChoiceCount(e.choiceCount)} owned skill proficiencies without Expertise`,
      });
      return id;
    }
    case "grant_language": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_language",
        label: `grant_language\n${e.languageId}`,
      });
      return id;
    }
    case "grant_hidden_language_messages": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_hidden_language_messages",
        label:
          `grant_hidden_language_messages\n${e.languageId}\n` +
          `knowers ${e.spotting.languageKnowers}; others DC ${e.spotting.others.dc} ` +
          `${e.spotting.others.ability.toUpperCase()} (${e.spotting.others.skill})`,
      });
      return id;
    }
    case "grant_language_choice": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_language_choice",
        label: `grant_language_choice\nchoose ${e.count} from ${e.source}`,
      });
      return id;
    }
    case "grant_spell_access": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_spell_access",
        label:
          `grant_spell_access\n${e.spellId}\n(${describeSpellAccessMode(e.mode)})` +
          describeGrantedSpellDcOverride(e.dcOverride) +
          describeGrantedSpellAreaOverride(e.areaOverride) +
          describeGrantedSpellTargetRestriction(e.targetRestriction) +
          describeGrantedSpellDurationOverride(e.durationOverride),
      });
      return id;
    }
    case "grant_spell_access_choice": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_spell_access_choice",
        label: `grant_spell_access_choice\nchoose ${e.count} ${e.spellList} level ${e.spellLevel}\n(${describeSpellAccessMode(e.mode)})`,
      });
      return id;
    }
    case "grant_spell_free_casts": {
      const id = ids("eff");
      const scaling =
        e.scaling === undefined
          ? ""
          : `\n${e.scaling.tiers.map((tier) => `L${tier.atLevel}: ${tier.count}`).join(", ")}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_spell_free_casts",
        label: `grant_spell_free_casts\n${e.spellId} x${e.count}\nreset ${e.resetCadence}${scaling}`,
      });
      return id;
    }
    case "grant_die_token": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_die_token",
        label: `grant_die_token\n${describeDiceAmount(e.die)}\n${e.trigger}, max held ${e.maxHeld}\n${e.duration.amount} ${e.duration.unit}`,
      });
      return id;
    }
    case "grant_bonus_action_attack": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_bonus_action_attack",
        label: `grant_bonus_action_attack\n${e.attack}`,
      });
      return id;
    }
    case "replace_damage_die": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "replace_damage_die",
        label: `replace_damage_die\n${describeDiceAmount(e.die)}\n${e.scope}`,
      });
      return id;
    }
    case "substitute_ability_for_rolls": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "substitute_ability_for_rolls",
        label: `substitute_ability_for_rolls\n${e.use} for ${e.replaces}\n${e.on.join(", ")}\n${e.scope}`,
      });
      return id;
    }
    case "grant_condition_immunity": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_condition_immunity",
        label: `grant_condition_immunity\n${e.condition}`,
      });
      return id;
    }
    case "suppress_condition_benefit": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "suppress_condition_benefit",
        label: `suppress_condition_benefit\n${e.condition}`,
      });
      return id;
    }
    case "grant_damage_immunity": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_damage_immunity",
        label: `grant_damage_immunity\n${e.damageType}`,
      });
      return id;
    }
    case "block_max_hp_reduction": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_max_hp_reduction",
        label: "block_max_hp_reduction",
      });
      return id;
    }
    case "set_ability_score": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "set_ability_score",
        label: `set_ability_score\n${e.ability} = ${e.value} (${e.mode})`,
      });
      return id;
    }
    case "modify_ability_score": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_ability_score",
        label: `modify_ability_score\n${e.ability} ${describeSignedNumber(e.delta)}${describeAbilityScoreBounds(e.minimum, e.maximum)}`,
      });
      return id;
    }
    case "modify_proficiency_bonus": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_proficiency_bonus",
        label: `modify_proficiency_bonus\n${describeSignedNumber(e.delta)}${describeNumericBounds(e.minimum, e.maximum)}`,
      });
      return id;
    }
    case "teleport": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "teleport",
        label: `teleport\nup to ${e.maxFeet} ft\ndest: ${e.destination}`,
      });
      return id;
    }
    case "transport_exile": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "transport_exile",
        label: `transport_exile\ndest: ${e.destination}`,
      });
      return id;
    }
    case "make_weapon_attack": {
      const id = ids("eff");
      const ability =
        e.abilityOverride === undefined
          ? ""
          : `\nability: ${e.abilityOverride}`;
      const damageChoice =
        e.damageTypeChoice === undefined
          ? ""
          : `\ndamage choice: ${e.damageTypeChoice.join(" or ")}`;
      const bonus =
        e.bonusDamage === undefined
          ? ""
          : `\nbonus: ${describeDiceAmount(e.bonusDamage.amount)} ${describeDamageTypeRef(e.bonusDamage.damageType)}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "make_weapon_attack",
        label: `make_weapon_attack\nweapon: ${e.weapon}${ability}${damageChoice}${bonus}`,
      });
      return id;
    }
    case "container_storage": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "container_storage",
        label: describeContainerStorage(e.storage),
      });
      return id;
    }
    case "create_sensor": {
      const id = ids("eff");
      const senses =
        e.sensorSenses === undefined
          ? ""
          : `\nsenses: ${e.sensorSenses.map((s) => `${s.kind} ${s.rangeFeet} ft`).join(", ")}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "create_sensor",
        label: `create_sensor\n${e.visibility}, ${e.durability}${senses}`,
      });
      return id;
    }
    case "remote_perception": {
      const id = ids("eff");
      const switchTag =
        e.switchCost === "bonus_action" ? "\nswitch: Bonus Action" : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "remote_perception",
        label: `remote_perception\n${e.senses.join(" or ")}${switchTag}`,
      });
      return id;
    }
    case "set_speed": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "set_speed",
        label: `set_speed\n= ${e.feet} ft`,
      });
      return id;
    }
    case "set_speed_ratio": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "set_speed_ratio",
        label: `set_speed_ratio\n× ${e.numerator}/${e.denominator}`,
      });
      return id;
    }
    case "emit_light": {
      const id = ids("eff");
      const dimTag =
        e.dimAdditionalFeet !== undefined && e.dimAdditionalFeet > 0
          ? `\ndim: +${e.dimAdditionalFeet} ft`
          : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "emit_light",
        label: `emit_light\nbright: ${e.brightRadiusFeet} ft${dimTag}`,
      });
      return id;
    }
    case "block_reanimation": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_reanimation",
        label: "block_reanimation",
      });
      return id;
    }
    case "ignite_objects": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "ignite_objects",
        label: `ignite_objects${describeObjectFilter(e.filter)}`,
      });
      return id;
    }
    case "create_object": {
      const id = ids("eff");
      const shapeTag = e.shape ? `\n${describeAreaShape(e.shape)}` : "";
      const consumableTag = e.consumable === true ? "\nconsumable" : "";
      const durabilityTag = e.durability
        ? `\nAC ${e.durability.acValue}, HP ${e.durability.hpPerSection}/section`
        : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "create_object",
        label: `create_object\nmax ${e.maxSize}${shapeTag}${consumableTag}${durabilityTag}`,
      });
      return id;
    }
    case "create_illusion": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "create_illusion",
        label: `create_illusion\nmax ${e.maxSize}\nchannels: ${e.channels.join(", ")}`,
      });
      return id;
    }
    case "force_drop_item": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "force_drop_item",
        label: "force_drop_item",
      });
      return id;
    }
    case "move_object": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "move_object",
        label: `move_object\nup to ${e.maxDistanceFeet} ft`,
      });
      return id;
    }
    case "pull_object_away": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "pull_object_away",
        label: `pull_object_away\nup to ${e.maxDistanceFeet} ft`,
      });
      return id;
    }
    case "manipulate_object": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "manipulate_object",
        label: "manipulate_object",
      });
      return id;
    }
    case "break_concentration": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "break_concentration",
        label: "break_concentration",
      });
      return id;
    }
    case "damage_structure": {
      const id = ids("dmg");
      nodes.push({
        id,
        category: "effect",
        atomKind: "damage_structure",
        label: `damage_structure\n${describeDiceAmount(e.amount)} ${describeDamageTypeRef(e.damageType)}\ncontact: ${e.structureContact}`,
      });
      return id;
    }
    case "collapse_structure": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "collapse_structure",
        label: `collapse_structure\ntrigger: ${e.trigger}`,
      });
      return id;
    }
    case "bury_in_rubble": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "bury_in_rubble",
        label: `bury_in_rubble\nescape: ${e.escape.action} ${e.escape.ability.toUpperCase()} (${e.escape.skill}) DC ${e.escape.dc}`,
      });
      return id;
    }
    case "bond_objects": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "bond_objects",
        label: "bond_objects",
      });
      return id;
    }
    case "lock_object": {
      const id = ids("eff");
      const pwTag = e.password !== undefined ? `\npassword set` : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "lock_object",
        label: `lock_object${pwTag}`,
      });
      return id;
    }
    case "reposition_attachment": {
      const id = ids("eff");
      const capTag =
        e.maxMoveFeet !== undefined ? `\nmax ${e.maxMoveFeet} ft` : "";
      nodes.push({
        id,
        category: "effect",
        atomKind: "reposition_attachment",
        label: `reposition_attachment${capTag}`,
      });
      return id;
    }
    case "area_is_difficult_terrain": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "area_is_difficult_terrain",
        label: "area_is_difficult_terrain",
      });
      return id;
    }
    case "area_is_lightly_obscured": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "area_is_lightly_obscured",
        label: "area_is_lightly_obscured",
      });
      return id;
    }
    case "area_is_heavily_obscured": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "area_is_heavily_obscured",
        label: "area_is_heavily_obscured",
      });
      return id;
    }
    case "area_has_strong_wind": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "area_has_strong_wind",
        label: "area_has_strong_wind",
      });
      return id;
    }
    case "prevent_ranged_weapon_attacks": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "prevent_ranged_weapon_attacks",
        label: "prevent_ranged_weapon_attacks",
      });
      return id;
    }
    case "area_movement_cost_multiplier": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "area_movement_cost_multiplier",
        label: `area_movement_cost_multiplier\nx${e.multiplier}`,
      });
      return id;
    }
    case "grant_cover": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_cover",
        label: `grant_cover\n${e.cover}`,
      });
      return id;
    }
    case "block_line_of_sight": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_line_of_sight",
        label: "block_line_of_sight",
      });
      return id;
    }
    case "prevent_creature_passage": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "prevent_creature_passage",
        label: `prevent_creature_passage\nexcept: ${e.exceptCreatureTypes.join(", ")}\nallows: ${e.allowsThroughBarrier.join(", ")}`,
      });
      return id;
    }
    case "prevent_spellcasting_and_magic_actions": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "prevent_spellcasting_and_magic_actions",
        label: "prevent_spellcasting_and_magic_actions",
      });
      return id;
    }
    case "prevent_magical_ranged_attacks": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "prevent_magical_ranged_attacks",
        label: "prevent_magical_ranged_attacks",
      });
      return id;
    }
    case "block_magical_targeting_and_aoe": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_magical_targeting_and_aoe",
        label: "block_magical_targeting_and_aoe",
      });
      return id;
    }
    case "block_teleport_and_planar_travel": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "block_teleport_and_planar_travel",
        label: "block_teleport_and_planar_travel",
      });
      return id;
    }
    case "suppress_magic_items": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "suppress_magic_items",
        label: "suppress_magic_items",
      });
      return id;
    }
    case "suppress_ongoing_magic_effects": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "suppress_ongoing_magic_effects",
        label: `suppress_ongoing_magic_effects\nexcept: ${e.exceptSources.join(", ")}\ntime counts: ${e.suppressedTimeCountsAgainstDuration}`,
      });
      return id;
    }
    case "ordered_barrier_layers": {
      const id = ids("layers");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "ordered_barrier_layers",
        label: `ordered_barrier_layers\n${e.layers.length} layers`,
      });
      if (edges !== undefined) {
        for (const layer of e.layers) {
          const layerId = ids("layer");
          nodes.push({
            id: layerId,
            category: "resolution",
            atomKind: "barrier_layer",
            label: `layer ${layer.order}: ${layer.label}\ndestroyed by: ${layer.destroyedBy}`,
          });
          edges.push({ from: id, to: layerId, relation: "orders" });
          if (layer.save !== undefined) {
            const saveId = ids("sg");
            nodes.push({
              id: saveId,
              category: "resolution",
              atomKind: "save_gate",
              label: `save_gate\n${layer.save.ability.toUpperCase()} vs ${describeDc(layer.save.dc)}`,
            });
            edges.push({ from: layerId, to: saveId, relation: "requires" });
            const failId = traceEffectAtom(
              layer.save.onFail,
              nodes,
              ids,
              edges,
            );
            if (failId !== null) {
              edges.push({
                from: saveId,
                to: failId,
                relation: "branches_on_save",
              });
            }
            if (layer.save.onSuccess.kind === "half_damage") {
              const halfId = ids("eff");
              nodes.push({
                id: halfId,
                category: "effect",
                atomKind: "half_damage",
                label: "half_damage\n(½ of onFail damage)",
              });
              edges.push({
                from: saveId,
                to: halfId,
                relation: "branches_on_save",
              });
            } else {
              const successId = traceEffectAtom(
                layer.save.onSuccess,
                nodes,
                ids,
                edges,
              );
              if (successId !== null) {
                edges.push({
                  from: saveId,
                  to: successId,
                  relation: "branches_on_save",
                });
              }
            }
          }
          if (layer.passiveEffects !== undefined) {
            for (const passive of layer.passiveEffects) {
              const passiveId = traceEffectAtom(passive, nodes, ids, edges);
              if (passiveId !== null) {
                edges.push({
                  from: layerId,
                  to: passiveId,
                  relation: "grants",
                });
              }
            }
          }
        }
      }
      return id;
    }
    case "allow_reaction_stand_up": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "allow_reaction_stand_up",
        label: "allow_reaction_stand_up",
      });
      return id;
    }
    case "composite": {
      // Emit a container node; children are traced as siblings all
      // rooted at the container. Container acts as the returned id.
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "composite",
        label: `composite\n(${e.effects.length} effects)`,
      });
      if (edges !== undefined) {
        for (const child of e.effects) {
          const childId = traceEffectAtom(child, nodes, ids, edges);
          if (childId !== null) {
            edges.push({ from: id, to: childId, relation: "grants" });
          }
        }
      }
      return id;
    }
    case "choose_effect_mode": {
      const id = ids("choice");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "choose_effect_mode",
        label: `choose_effect_mode\n${e.label}`,
      });
      if (edges !== undefined) {
        for (const option of e.options) {
          const optionId = ids("opt");
          nodes.push({
            id: optionId,
            category: "resolution",
            atomKind: "effect_mode_option",
            label: `mode: ${option.displayName}`,
          });
          edges.push({ from: id, to: optionId, relation: "offers" });
          for (const effect of option.effects) {
            const effectId = traceDetachedOngoingChoiceEffect(
              effect,
              nodes,
              ids,
              edges,
            );
            if (effectId !== null) {
              edges.push({ from: optionId, to: effectId, relation: "grants" });
            }
          }
        }
      }
      return id;
    }
    case "grant_speed": {
      const id = ids("eff");
      const suffix = e.hover === true ? " (hover)" : "";
      const feet =
        typeof e.feet === "number"
          ? `${e.feet} ft`
          : describeLinkedSpeed(e.feet);
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_speed",
        label: `grant_speed\n${e.speedKind} ${feet}${suffix}`,
      });
      return id;
    }
    case "ignore_web_restrictions": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "ignore_web_restrictions",
        label: "ignore_web_restrictions",
      });
      return id;
    }
    case "alter_item_kind": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "alter_item_kind",
        label: `alter_item_kind\n${e.newKind}`,
      });
      return id;
    }
    case "natural_weapons": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "natural_weapons",
        label: `natural_weapons\n1d${e.damageDie} ${e.damageType}\nuses spellcasting ability`,
      });
      return id;
    }
    case "water_breathing": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "water_breathing",
        label: "water_breathing",
      });
      return id;
    }
    case "detect": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "detect",
        label: `detect\nproperty: ${e.property}\nradius ${e.radiusFeet} ft`,
      });
      return id;
    }
    case "negate_triggering_spell": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "negate_triggering_spell",
        label:
          e.maxSpellLevel === undefined
            ? "negate_triggering_spell"
            : `negate_triggering_spell\nmax level: ${e.maxSpellLevel}`,
      });
      return id;
    }
    case "reflect_triggering_spell": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "reflect_triggering_spell",
        label: "reflect_triggering_spell",
      });
      return id;
    }
    case "waste_triggering_spell_or_effect": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "waste_triggering_spell_or_effect",
        label: "waste_triggering_spell_or_effect",
      });
      return id;
    }
    case "end_ongoing_spells": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "end_ongoing_spells",
        label: `end_ongoing_spells\nmax level: ${e.maxSpellLevel}`,
      });
      return id;
    }
    case "maximize_healing_received": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "maximize_healing_received",
        label: "maximize_healing_received",
      });
      return id;
    }
    case "transform_target": {
      const id = ids("eff");
      const cr =
        e.newForm.crBound.kind === "fixed"
          ? `CR ${e.newForm.crBound.cr}`
          : e.newForm.crBound.kind === "target_cr_or_level"
            ? "CR ≤ target CR/level"
            : "CR ≤ caster level";
      const rev = e.revertTriggers.map((t) => t.kind).join(" | ");
      const extras = [
        `retain: ${e.retainedFields.join(", ")}`,
        `revert: ${rev}`,
        e.tempHpFromForm === true ? "temp HP = new form HP" : null,
        e.actionRestriction !== undefined ? e.actionRestriction : null,
      ]
        .filter((s): s is string => s !== null)
        .join("\n");
      nodes.push({
        id,
        category: "effect",
        atomKind: "transform_target",
        label: `transform_target\n${e.newForm.creatureType} (${cr})\n${extras}`,
      });
      return id;
    }
    default: {
      const _exhaustive: never = e;
      throw new Error(`unhandled effect atom: ${String(_exhaustive)}`);
    }
  }
}

// Emit scaling nodes for effect atoms that carry a DiceAmount.
function traceEffectAtomScaling(
  e: EffectAtom,
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
    case "none":
    case "modify_ac":
    case "modify_ac_set_base":
    case "modify_save_dc":
    case "apply_condition":
    case "restrict_action_usage":
    case "remove_condition":
    case "grant_resistance":
    case "kill_target":
    case "end_current_effect":
    case "repeat_save_for_condition":
    case "condition_persists_after_full_duration":
    case "modify_roll_numeric":
    case "modify_damage_numeric":
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
    case "grab_fixed_object":
    case "suspend_in_area":
    case "fall_when_effect_ends":
    case "move_area":
    case "end_current_effect_at_area_height_zero":
    case "ability_check_to_move_in_area":
    case "fall_to_ground":
    case "block_targeting":
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
    case "grant_damage_immunity":
    case "block_max_hp_reduction":
    case "set_speed_ratio":
    case "set_ability_score":
    case "modify_ability_score":
    case "modify_proficiency_bonus":
    case "teleport":
    case "transport_exile":
    case "container_storage":
    case "create_sensor":
    case "remote_perception":
    case "grant_speed":
    case "ignore_web_restrictions":
    case "alter_item_kind":
    case "detect":
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
    case "reposition_attachment":
    case "area_is_difficult_terrain":
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

function traceUsageLimit(
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
  const fenceId = ids("fence");
  nodes.push({
    id: fenceId,
    category: "resource",
    atomKind: "use_count",
    label: `use_count\n${describeUsageLimit(limit)}`,
  });
  edges.push({ from: hostId, to: fenceId, relation });
  return fenceId;
}

function traceDetachedOngoingChoiceEffect(
  eff: import("../surface/types.ts").OngoingEffect,
  nodes: TraceNode[],
  ids: IdGen,
  edges: TraceEdge[],
): string | null {
  switch (eff.kind) {
    case "save_gate": {
      const sgId = ids("sg");
      nodes.push({
        id: sgId,
        category: "resolution",
        atomKind: "save_gate",
        label: `save_gate\n${eff.ability.toUpperCase()} vs ${describeDc(eff.dc)}`,
      });
      const failId = traceEffectAtom(eff.onFail, nodes, ids, edges);
      if (failId !== null) {
        edges.push({ from: sgId, to: failId, relation: "branches_on_save" });
      }
      if (
        eff.onSuccess.kind !== "none" &&
        eff.onSuccess.kind !== "half_damage"
      ) {
        const sucId = traceEffectAtom(eff.onSuccess, nodes, ids, edges);
        if (sucId !== null) {
          edges.push({ from: sgId, to: sucId, relation: "branches_on_save" });
        }
      }
      return sgId;
    }
    case "ability_check_gate": {
      const acgId = ids("acg");
      nodes.push({
        id: acgId,
        category: "resolution",
        atomKind: "ability_check_gate",
        label: `ability_check_gate\n${eff.ability.toUpperCase()} vs ${describeDc(eff.dc)}`,
      });
      const passId = traceEffectAtom(eff.onPass, nodes, ids, edges);
      if (passId !== null) {
        edges.push({ from: acgId, to: passId, relation: "branches_on_pass" });
      }
      if (eff.onFail !== undefined) {
        const failId = traceEffectAtom(eff.onFail, nodes, ids, edges);
        if (failId !== null) {
          edges.push({
            from: acgId,
            to: failId,
            relation: "branches_on_fail",
          });
        }
      }
      return acgId;
    }
    case "attack_roll": {
      const arId = ids("ar");
      nodes.push({
        id: arId,
        category: "resolution",
        atomKind: "attack_roll",
        label: `attack_roll\n${eff.attackKind}`,
      });
      for (const hit of eff.onHit) {
        const hitId = traceEffectAtom(hit, nodes, ids, edges);
        if (hitId !== null) {
          edges.push({ from: arId, to: hitId, relation: "branches_on_hit" });
        }
      }
      for (const miss of eff.onMiss) {
        const missId = traceEffectAtom(miss, nodes, ids, edges);
        if (missId !== null) {
          edges.push({ from: arId, to: missId, relation: "branches_on_miss" });
        }
      }
      return arId;
    }
    case "composite_ongoing": {
      const id = ids("op");
      nodes.push({
        id,
        category: "effect",
        atomKind: "composite_ongoing",
        label: `composite_ongoing\n(${eff.effects.length} effects)`,
      });
      for (const child of eff.effects) {
        const childId = traceDetachedOngoingChoiceEffect(
          child,
          nodes,
          ids,
          edges,
        );
        if (childId !== null) {
          edges.push({ from: id, to: childId, relation: "grants" });
        }
      }
      return id;
    }
    case "modify_ac_set_floor": {
      const id = ids("op");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_ac",
        label: `modify_ac\nfloor: max(AC, ${eff.const})`,
      });
      return id;
    }
    default:
      return traceEffectAtom(eff, nodes, ids, edges);
  }
}

function traceOngoingChoiceEffectScaling(
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

function describeUsageLimit(limit: UsageLimit): string {
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

// ============================================================
// Spell tracer
// ============================================================

type SpellCtx = {
  readonly procId: string;
  readonly slotId: string | null;
  readonly range: Range;
};

function traceSpellUnit(spell: SpellRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "spell_root",
    label: `spell_root\n${spell.name}`,
  });

  const procedureId = traceSpellMechanics(spell.mechanics, nodes, edges, ids);
  edges.push({ from: rootId, to: procedureId, relation: "roots" });

  return {
    unitId: spell.id,
    unitName: spell.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

function traceSpellMechanics(
  m: SpellMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  // Procedure kind depends on family (v4 procedure atoms):
  //   - active casts → `activate`
  //   - triggered reactions → `respond`
  //   - anchored triggers → `store` (released later when the anchor fires)
  const procKind = procedureForFamily(m.family);
  const procId = ids(procedurePrefix(procKind));
  nodes.push({
    id: procId,
    category: "procedure",
    atomKind: procKind,
    label: procKind,
  });

  const quotaId = traceCastingTimeQuota(m.castingTime, nodes, ids);
  edges.push({ from: procId, to: quotaId, relation: "consumes" });

  const slotId =
    m.level === 0 ? null : createSpellSlotNode(m.level, nodes, ids);
  if (slotId !== null)
    edges.push({ from: procId, to: slotId, relation: "consumes" });

  traceDuration(m.duration, procId, nodes, edges, ids);

  const ctx: SpellCtx = { procId, slotId, range: m.range };

  switch (m.family) {
    case "ongoing_effect":
      traceOngoingEffect(m, ctx, nodes, edges, ids);
      break;
    case "activation":
      traceActivation(m, ctx, nodes, edges, ids);
      break;
    case "triggered_reaction":
      traceTriggeredReaction(m, ctx, nodes, edges, ids);
      break;
    case "anchored_trigger":
      traceAnchoredTrigger(m, ctx, nodes, edges, ids);
      break;
    case "spawned_creature":
      traceSpawnedCreature(m, ctx, nodes, edges, ids);
      break;
    case "reanimated_creature":
      traceReanimatedCreature(m, ctx, nodes, edges, ids);
      break;
    case "templated_multi_spawn":
      traceTemplatedMultiSpawn(m, ctx, nodes, edges, ids);
      break;
    default: {
      const _exhaustive: never = m;
      throw new Error(`unhandled spell family: ${String(_exhaustive)}`);
    }
  }

  return procId;
}

function procedureForFamily(
  f: SpellMechanics["family"],
): "activate" | "respond" | "store" {
  switch (f) {
    case "triggered_reaction":
      return "respond";
    case "anchored_trigger":
      return "store";
    case "ongoing_effect":
    case "activation":
    case "spawned_creature":
    case "reanimated_creature":
    case "templated_multi_spawn":
      return "activate";
    default: {
      const _: never = f;
      throw new Error(`unhandled spell family for procedure: ${String(_)}`);
    }
  }
}

function procedurePrefix(k: "activate" | "respond" | "store"): string {
  switch (k) {
    case "activate":
      return "act";
    case "respond":
      return "rsp";
    case "store":
      return "sto";
    default: {
      const _: never = k;
      throw new Error(`unhandled procedure prefix: ${String(_)}`);
    }
  }
}

function traceCastingTimeQuota(
  ct: CastingTime,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const id = ids("q");
  switch (ct.kind) {
    case "action":
      nodes.push({
        id,
        category: "resource",
        atomKind: "action_quota",
        label: `action_quota\n(Casting Time: Action${
          ct.ritual === true ? " or Ritual" : ""
        })`,
      });
      return id;
    case "bonus_action":
      const trigger =
        ct.trigger === undefined
          ? ""
          : `\ntrigger: ${describeBonusActionTrigger(ct.trigger)}`;
      nodes.push({
        id,
        category: "resource",
        atomKind: "bonus_action_quota",
        label: `bonus_action_quota\n(Casting Time: Bonus Action)${trigger}`,
      });
      return id;
    case "reaction":
      nodes.push({
        id,
        category: "resource",
        atomKind: "reaction_quota",
        label: "reaction_quota\n(Casting Time: Reaction)",
      });
      return id;
    case "minutes":
      // Long-cast spells (Alarm: 1 minute or Ritual). No 1-action-quota
      // cost — the caster is locked into the cast for `amount` minutes.
      nodes.push({
        id,
        category: "resource",
        atomKind: "action_quota",
        label: `action_quota\n(Casting Time: ${ct.amount} min${
          ct.ritual ? " / Ritual" : ""
        })`,
      });
      return id;
    default: {
      const _exhaustive: never = ct;
      throw new Error(`unhandled casting time: ${String(_exhaustive)}`);
    }
  }
}

function describeBonusActionTrigger(
  t: Extract<CastingTime, { kind: "bonus_action" }>["trigger"],
): string {
  if (t === undefined) return "";
  switch (t.kind) {
    case "after_hit_with":
      if (t.attack === "melee_weapon_or_unarmed_strike") {
        return "after hit with Melee weapon or Unarmed Strike";
      }
      if (t.attack === "weapon") return "after hit with weapon";
      return t.attack;
  }
}

function describeReactionTrigger(t: ReactionTrigger): string {
  switch (t.kind) {
    case "hit_by_attack_roll":
      return `hit by attack roll${describeWeaponFilter(t.weaponFilter)}`;
    case "takes_damage_from_creature": {
      const visible = t.requiresVisibleCreature === true ? ", visible" : "";
      const range =
        t.rangeFeet === undefined ? "" : `, within ${t.rangeFeet} ft`;
      return `takes damage from creature${visible}${range}`;
    }
    case "targeted_by_named_spell":
      return `targeted by ${t.spellId}`;
    case "creature_casts_spell": {
      const levelTag =
        t.spellLevelAtMost === undefined
          ? ""
          : `, level <= ${t.spellLevelAtMost}`;
      const visibilityTag =
        t.requiresVisibleCaster === true ? ", visible caster" : "";
      return `creature casts spell (${t.components.join("/")}${levelTag}${visibilityTag})`;
    }
    case "spell_save_outcome": {
      const levelTag =
        t.spellLevelAtMost === undefined
          ? ""
          : `, level <= ${t.spellLevelAtMost}`;
      const schoolTag = t.spellSchool === undefined ? "" : `, ${t.spellSchool}`;
      const selfTag = t.spellTargetsOnlySelf === true ? ", self only" : "";
      const areaTag =
        t.spellHasNoAreaOfEffect === true ? ", no area of effect" : "";
      return `${t.outcome} on spell save${levelTag}${schoolTag}${selfTag}${areaTag}`;
    }
    case "any_of":
      return t.triggers.map(describeReactionTrigger).join(" OR ");
    default: {
      const _: never = t;
      throw new Error(`unhandled reaction trigger: ${String(_)}`);
    }
  }
}

function createSpellSlotNode(
  level: SpellLevel,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const id = ids("slot");
  nodes.push({
    id,
    category: "resource",
    atomKind: "spell_slot",
    label: `spell_slot\n≥ level ${level}`,
  });
  return id;
}

function traceDuration(
  d: Duration,
  procId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (d.kind) {
    case "instantaneous":
      return;
    case "concentration": {
      const lockId = ids("lock");
      nodes.push({
        id: lockId,
        category: "resource",
        atomKind: "concentration_lock",
        label: "concentration_lock",
      });
      edges.push({ from: procId, to: lockId, relation: "consumes" });

      const concId = ids("conc");
      nodes.push({
        id: concId,
        category: "lifecycle",
        atomKind: "concentrate",
        label: "concentrate",
      });
      edges.push({ from: procId, to: concId, relation: "grants" });

      const permTag =
        d.permanentIfMaintainedFull === true
          ? "\npermanent if maintained full"
          : "";
      const expId = ids("exp");
      nodes.push({
        id: expId,
        category: "lifecycle",
        atomKind: "expire",
        label: `expire\n≤ ${describeDurationValue(d.upTo)}${describeEarlyEnd(d.earlyEnd)}${permTag}`,
      });
      edges.push({ from: concId, to: expId, relation: "persists_until" });
      return;
    }
    case "timed": {
      const persistId = ids("per");
      nodes.push({
        id: persistId,
        category: "lifecycle",
        atomKind: "persist",
        label: "persist",
      });
      edges.push({ from: procId, to: persistId, relation: "grants" });

      const expId = ids("exp");
      nodes.push({
        id: expId,
        category: "lifecycle",
        atomKind: "expire",
        label: `expire\n${describeDurationValue(d.value)}${describeEarlyEnd(d.earlyEnd)}`,
      });
      edges.push({ from: persistId, to: expId, relation: "persists_until" });
      return;
    }
    case "permanent": {
      const persistId = ids("per");
      nodes.push({
        id: persistId,
        category: "lifecycle",
        atomKind: "persist",
        label: "persist\npermanent",
      });
      edges.push({ from: procId, to: persistId, relation: "grants" });
      if (d.endsOn !== undefined) {
        const expId = ids("exp");
        nodes.push({
          id: expId,
          category: "lifecycle",
          atomKind: "expire",
          label: `expire\non: ${d.endsOn.join(", ")}`,
        });
        edges.push({ from: persistId, to: expId, relation: "persists_until" });
      }
      return;
    }
    default: {
      const _exhaustive: never = d;
      throw new Error(`unhandled duration: ${String(_exhaustive)}`);
    }
  }
}

function traceOngoingEffect(
  m: OngoingEffectMechanics,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const attId = traceAttachment(m.attachment, ctx.range, nodes, ids);
  edges.push({ from: ctx.procId, to: attId, relation: "attaches_to" });

  traceTargetCountScaling(m.attachment, attId, ctx.slotId, nodes, edges, ids);
  traceMarkAttachmentEffects(
    m.attachment,
    ctx.procId,
    attId,
    nodes,
    edges,
    ids,
  );

  if (m.initialPhase !== undefined) {
    tracePhase(m.initialPhase, 0, ctx, nodes, edges, ids);
  }

  for (const op of m.operations) {
    traceOngoingOperation(op, ctx.procId, attId, ctx.slotId, nodes, edges, ids);
  }
}

// If the attachment is a v4 `mark`, emit the mark_target effect (and,
// if configured, the transfer_mark effect with its transfers_to edge
// back onto the mark attachment node).
function traceMarkAttachmentEffects(
  a: Attachment,
  procId: string,
  attId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  if (a.kind !== "mark") return;
  const markId = ids("mk");
  nodes.push({
    id: markId,
    category: "effect",
    atomKind: "mark_target",
    label: "mark_target",
  });
  edges.push({ from: procId, to: markId, relation: "grants" });
  edges.push({ from: markId, to: attId, relation: "attaches_to" });

  if (a.transfer !== undefined) {
    const transferId = traceMarkTransfer(a.transfer, procId, nodes, edges, ids);
    edges.push({ from: transferId, to: attId, relation: "transfers_to" });
  }
}

function traceMarkTransfer(
  t: MarkTransfer,
  procId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  // Bonus-action cost → bonus_action_quota resource consumed by the
  // caster when invoking the transfer.
  const quotaId = ids("q");
  nodes.push({
    id: quotaId,
    category: "resource",
    atomKind: "bonus_action_quota",
    label: "bonus_action_quota\n(transfer mark)",
  });
  const transferId = ids("xfer");
  nodes.push({
    id: transferId,
    category: "effect",
    atomKind: "transfer_mark",
    label: `transfer_mark\non: ${describeTransferEvent(t)}`,
  });
  edges.push({ from: procId, to: transferId, relation: "grants" });
  edges.push({ from: transferId, to: quotaId, relation: "consumes" });
  return transferId;
}

function describeTransferEvent(t: MarkTransfer): string {
  switch (t.onEvent.kind) {
    case "target_drops_to_0_hp":
      return "target drops to 0 HP";
    default: {
      const _: never = t.onEvent.kind;
      throw new Error(`unhandled transfer event: ${String(_)}`);
    }
  }
}

function traceOngoingOperation(
  op: OngoingOperation,
  procId: string,
  attId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  // §A15 unified grammar: trigger → (optional predicate) → effect.
  // Attack-hit riders open an on_hit_window between procedure and
  // effect; other triggers emit a window node matching the cadence
  // so the trace reads as "procedure opens window, window grants
  // effect, effect attaches to the attachment".
  const triggerCtx = traceOngoingTrigger(op.trigger, procId, nodes, edges, ids);
  // The host for the effect is either the procedure (passive) or a
  // window atom emitted for the trigger.
  const hostId = triggerCtx.hostId;
  const hostRelation = triggerCtx.hostRelation;
  traceUsageLimit(op.usageLimit, hostId, "limits", nodes, edges, ids);
  const effectHostId =
    op.predicate === undefined
      ? hostId
      : traceOngoingPredicateGate(op.predicate, hostId, nodes, edges, ids);
  const effectHostRelation =
    op.predicate === undefined ? hostRelation : "grants";
  if (op.targetLimit !== undefined) {
    const limitId = ids("limit");
    const targetTypes = op.targetLimit.targetTypes.join("/");
    const distinct = op.targetLimit.distinct === true ? " distinct" : "";
    nodes.push({
      id: limitId,
      category: "resolution",
      atomKind: "target_limit",
      label: `target_limit\n${op.targetLimit.count}${distinct} ${targetTypes}`,
    });
    edges.push({ from: hostId, to: limitId, relation: "limits" });
  }
  traceOngoingOpEffect(
    op.effect,
    effectHostId,
    effectHostRelation,
    attId,
    slotId,
    nodes,
    edges,
    ids,
  );
}

type OngoingTriggerCtx = {
  readonly hostId: string;
  readonly hostRelation: "grants" | "opens_window";
};

function traceOngoingPredicateGate(
  predicate: import("../surface/types.ts").OngoingPredicate,
  hostId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const id = ids("pred");
  nodes.push({
    id,
    category: "resolution",
    atomKind: "ongoing_predicate",
    label: `ongoing_predicate\n${describeOngoingPredicate(predicate)}`,
  });
  edges.push({ from: hostId, to: id, relation: "gates" });
  return id;
}

function traceOngoingTrigger(
  trigger: import("../surface/types.ts").OngoingTrigger,
  procId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): OngoingTriggerCtx {
  switch (trigger.kind) {
    case "passive":
      // No event window — the effect is granted directly by the
      // procedure.
      return { hostId: procId, hostRelation: "grants" };
    case "on_effect_starts": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "effect_start_window",
        label: "effect_start_window",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_caster_attack_hit": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "on_hit_window",
        label: "on_hit_window\n(caster hits attachment)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_attached_hit_by_attack_roll": {
      const winId = ids("win");
      const attack =
        trigger.attackKind === undefined
          ? ""
          : `\nattack: ${trigger.attackKind}`;
      const range =
        trigger.attackerWithinFeet === undefined
          ? ""
          : `\nattacker within ${trigger.attackerWithinFeet} ft`;
      const attackerTypes =
        trigger.attackerTypeFilter === undefined
          ? ""
          : `\nattacker type: ${trigger.attackerTypeFilter.join("/")}`;
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "on_hit_window",
        label: `on_hit_window\n(attached hit by attack roll)${attack}${range}${attackerTypes}`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_attached_turn_start": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_start_window",
        label: "turn_start_window\n(attached creature)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_attached_turn_end": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_end_window",
        label: "turn_end_window\n(attached creature)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_caster_turn_start": {
      const winId = ids("win");
      const turn =
        trigger.turnWindow === undefined
          ? ""
          : `\n${describeOngoingTurnWindow(trigger.turnWindow)}`;
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_start_window",
        label: `turn_start_window\n(caster)${turn}`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_caster_turn_end": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_end_window",
        label: "turn_end_window\n(caster)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_attached_damaged": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: "post_action_window\n(attached takes damage)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_moves": {
      const winId = ids("win");
      const label =
        trigger.perFeet !== undefined
          ? `post_action_window\n(creature moves per ${trigger.perFeet} ft)`
          : "post_action_window\n(creature moves)";
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_enters_area": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: "post_action_window\n(creature enters area)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_moves_through_area": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: "post_action_window\n(creature moves through area)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_moves_within_area": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: `post_action_window\n(creature moves within ${trigger.distanceFeet} ft of area)`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_starts_turn_within_area": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_start_window",
        label: `turn_start_window\n(creature within ${trigger.distanceFeet} ft of area)`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_attempts_magical_escape": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "escape_attempt_window",
        label: `escape_attempt_window\n${trigger.methods.join(", ")}`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_object_section_destroyed": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: "post_action_window\n(object section destroyed)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_area_moves_into_creature_space": {
      const winId = ids("win");
      const size =
        trigger.maxCreatureSize === undefined
          ? ""
          : `\nmax size: ${trigger.maxCreatureSize}`;
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: `post_action_window\n(area moves into creature space)${size}`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_exits_area": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: "post_action_window\n(creature exits area)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_caster_spends_action": {
      const winId = ids("win");
      const atomKind =
        trigger.cost.kind === "bonus_action"
          ? "bonus_action_window"
          : "action_window";
      nodes.push({
        id: winId,
        category: "window",
        atomKind,
        label: `${atomKind}\n(caster spends ${describeOngoingCasterActionCost(trigger.cost)})`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_studies": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "action_window",
        label: "action_window\n(creature Study action on attachment)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_ends_turn_in_area": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: "post_action_window\n(creature ends turn in area)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_structure_collapses": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: `post_action_window\n(structure collapses, affected within ${trigger.affectedWithin})`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    default: {
      const _: never = trigger;
      throw new Error(`unhandled ongoing trigger: ${String(_)}`);
    }
  }
}

function describeOngoingTurnWindow(
  turnWindow: NonNullable<
    Extract<
      import("../surface/types.ts").OngoingTrigger,
      { readonly kind: "on_caster_turn_start" }
    >["turnWindow"]
  >,
): string {
  switch (turnWindow.kind) {
    case "effect_turn":
      return `effect turn ${turnWindow.turn}`;
    case "effect_turn_range":
      return `effect turns ${turnWindow.from}-${turnWindow.to}`;
    default: {
      const _: never = turnWindow;
      throw new Error(`unhandled ongoing turn window: ${String(_)}`);
    }
  }
}

function traceOngoingOpEffect(
  eff: import("../surface/types.ts").OngoingEffect,
  hostId: string,
  hostRelation: "grants" | "opens_window",
  attId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (eff.kind) {
    case "modify_ac_set_floor": {
      const id = ids("op");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_ac",
        label: `modify_ac\nfloor: max(AC, ${eff.const})`,
      });
      edges.push({ from: hostId, to: id, relation: hostRelation });
      edges.push({ from: id, to: attId, relation: "attaches_to" });
      return;
    }
    case "save_gate": {
      // §A9 — damage-triggered or turn-start save inside an ongoing
      // effect. Reuses the activation save_gate atom.
      const sgId = ids("sg");
      nodes.push({
        id: sgId,
        category: "resolution",
        atomKind: "save_gate",
        label: `save_gate\n${eff.ability.toUpperCase()} vs ${describeDc(eff.dc)}`,
      });
      edges.push({ from: hostId, to: sgId, relation: hostRelation });
      edges.push({ from: sgId, to: attId, relation: "attaches_to" });
      const failId = traceEffectAtom(eff.onFail, nodes, ids, edges);
      if (failId !== null) {
        edges.push({ from: sgId, to: failId, relation: "branches_on_save" });
        traceEffectAtomScaling(eff.onFail, failId, slotId, nodes, edges, ids);
      }
      if (
        eff.onSuccess.kind !== "none" &&
        eff.onSuccess.kind !== "half_damage"
      ) {
        const sucId = traceEffectAtom(eff.onSuccess, nodes, ids, edges);
        if (sucId !== null) {
          edges.push({ from: sgId, to: sucId, relation: "branches_on_save" });
          traceEffectAtomScaling(
            eff.onSuccess,
            sucId,
            slotId,
            nodes,
            edges,
            ids,
          );
        }
      }
      return;
    }
    case "attack_roll": {
      const arId = ids("ar");
      nodes.push({
        id: arId,
        category: "resolution",
        atomKind: "attack_roll",
        label: `attack_roll\n${eff.attackKind}`,
      });
      edges.push({ from: hostId, to: arId, relation: hostRelation });
      edges.push({ from: arId, to: attId, relation: "attaches_to" });
      for (const hit of eff.onHit) {
        const hitId = traceEffectAtom(hit, nodes, ids, edges);
        if (hitId !== null) {
          edges.push({ from: arId, to: hitId, relation: "branches_on_hit" });
          traceEffectAtomScaling(hit, hitId, slotId, nodes, edges, ids);
        }
      }
      for (const miss of eff.onMiss) {
        const missId = traceEffectAtom(miss, nodes, ids, edges);
        if (missId !== null) {
          edges.push({ from: arId, to: missId, relation: "branches_on_miss" });
          traceEffectAtomScaling(miss, missId, slotId, nodes, edges, ids);
        }
      }
      return;
    }
    case "composite_ongoing": {
      const id = ids("op");
      nodes.push({
        id,
        category: "effect",
        atomKind: "composite_ongoing",
        label: `composite_ongoing\n(${eff.effects.length} effects)`,
      });
      edges.push({ from: hostId, to: id, relation: hostRelation });
      edges.push({ from: id, to: attId, relation: "attaches_to" });
      for (const child of eff.effects) {
        traceOngoingOpEffect(
          child,
          id,
          "grants",
          attId,
          slotId,
          nodes,
          edges,
          ids,
        );
      }
      return;
    }
    case "ability_check_gate": {
      const acgId = ids("acg");
      nodes.push({
        id: acgId,
        category: "resolution",
        atomKind: "ability_check_gate",
        label: `ability_check_gate\n${eff.ability.toUpperCase()} vs ${describeDc(eff.dc)}`,
      });
      edges.push({ from: hostId, to: acgId, relation: hostRelation });
      edges.push({ from: acgId, to: attId, relation: "attaches_to" });
      const passId = traceEffectAtom(eff.onPass, nodes, ids, edges);
      if (passId !== null) {
        edges.push({ from: acgId, to: passId, relation: "branches_on_pass" });
      }
      if (eff.onFail !== undefined) {
        const failId = traceEffectAtom(eff.onFail, nodes, ids, edges);
        if (failId !== null) {
          edges.push({
            from: acgId,
            to: failId,
            relation: "branches_on_fail",
          });
        }
      }
      return;
    }
    case "choose_effect_mode": {
      const id = ids("choice");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "choose_effect_mode",
        label: `choose_effect_mode\n${eff.label}`,
      });
      edges.push({ from: hostId, to: id, relation: hostRelation });
      edges.push({ from: id, to: attId, relation: "attaches_to" });
      for (const option of eff.options) {
        const optionId = ids("opt");
        nodes.push({
          id: optionId,
          category: "resolution",
          atomKind: "effect_mode_option",
          label: `mode: ${option.displayName}`,
        });
        edges.push({ from: id, to: optionId, relation: "offers" });
        for (const effect of option.effects) {
          traceOngoingOpEffect(
            effect,
            optionId,
            "grants",
            attId,
            slotId,
            nodes,
            edges,
            ids,
          );
        }
      }
      return;
    }
    default: {
      // All other ongoing effects are EffectAtoms — delegate.
      const effId = traceEffectAtom(eff, nodes, ids, edges);
      if (effId === null) return;
      edges.push({ from: hostId, to: effId, relation: hostRelation });
      edges.push({ from: effId, to: attId, relation: "attaches_to" });
      if (
        eff.kind === "damage" ||
        eff.kind === "heal_hp" ||
        eff.kind === "grant_temp_hp"
      ) {
        traceDiceAmountScaling(eff.amount, effId, slotId, nodes, edges, ids);
      } else if (eff.kind === "modify_max_hp") {
        traceDiceAmountScaling(eff.delta, effId, slotId, nodes, edges, ids);
      }
      return;
    }
  }
}

function traceTriggeredReaction(
  m: TriggeredReactionMechanics,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  // Subgraph A — Prepare / Prompt / Commit (TAXONOMY_graph_representation.md §5.A):
  //   respond --opens_window--> reaction_window (labeled with trigger)
  //   respond --prepares--> prepare --prompts--> prompt --commits--> commit
  //   commit --grants--> interrupt_resolution (if interruptsTrigger)
  //   commit --grants--> <each effect atom>

  // Reaction window — labeled with the trigger grammar.
  const winId = ids("win");
  const triggerLabel =
    m.castingTime.kind === "reaction"
      ? describeReactionTrigger(m.castingTime.trigger)
      : "—";
  nodes.push({
    id: winId,
    category: "window",
    atomKind: "reaction_window",
    label: `reaction_window\ntrigger: ${triggerLabel}`,
  });
  edges.push({ from: ctx.procId, to: winId, relation: "opens_window" });

  // Prepare / Prompt / Commit chain — the decision boundary. Per
  // UBIQUITOUS_LANGUAGE §Triggers line 31: "Declining does not consume
  // the reaction resource." The chain represents that optionality.
  const prepId = ids("prep");
  nodes.push({
    id: prepId,
    category: "procedure",
    atomKind: "prepare",
    label: "prepare",
  });
  edges.push({ from: ctx.procId, to: prepId, relation: "prepares" });

  const promptId = ids("prompt");
  nodes.push({
    id: promptId,
    category: "procedure",
    atomKind: "prompt",
    label: "prompt",
  });
  edges.push({ from: prepId, to: promptId, relation: "prompts" });

  const commitId = ids("commit");
  nodes.push({
    id: commitId,
    category: "procedure",
    atomKind: "commit",
    label: "commit",
  });
  edges.push({ from: promptId, to: commitId, relation: "commits" });

  if (m.interruptsTrigger) {
    const intId = ids("int");
    nodes.push({
      id: intId,
      category: "resolution",
      atomKind: "interrupt_resolution",
      label: "interrupt_resolution",
    });
    edges.push({ from: commitId, to: intId, relation: "grants" });
  }

  // Phases of the reaction — unified with ActivationMechanics.
  // ctx.procId threads through so the phase tracers emit their
  // standard subgraphs rooted at `commit`.
  const phaseCtx: SpellCtx = {
    procId: commitId,
    slotId: ctx.slotId,
    range: ctx.range,
  };
  let previousResolutionId: string | null = null;
  m.phases.forEach((phase, idx) => {
    const thisResolutionId = tracePhase(
      phase,
      idx + 1,
      phaseCtx,
      nodes,
      edges,
      ids,
    );
    if (previousResolutionId !== null) {
      edges.push({
        from: previousResolutionId,
        to: thisResolutionId,
        relation: "branches_on_completion",
      });
    }
    previousResolutionId = thisResolutionId;
  });
}

// v4 Subgraph hunt §4.2 — anchored_trigger payload family. Pressure
// case: Alarm. Graph shape:
//   spell_root → store → anchor (location/area) + trigger_condition
//   trigger_condition → release (when matching event + filters fire)
//   release → signal (audible/mental)
//   duration: timed → persist → expire (wards the anchor until then)
function traceAnchoredTrigger(
  m: AnchoredTriggerMechanics,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  // Anchor node — the `location` or `area` the spell is planted on.
  const anchorId = traceAnchorTarget(m.anchor, ctx.range, nodes, ids);
  edges.push({ from: ctx.procId, to: anchorId, relation: "attaches_to" });

  // Filters and signals are structural grammar on the trigger, not
  // standalone v4 atoms. Fold them into the release node's label so
  // the graph remains legible without polluting the atom inventory
  // with non-v4 names. ARCHITECTURE.md routes notification effects to
  // the caller; signals are recorded here only as authoring intent.
  const filterLines = m.filters.map(
    (f) => `filter: ${describeAnchoredFilter(f)}`,
  );
  const signalLines = m.signals.map(
    (s) => `signal (caller-owned): ${describeAnchoredSignal(s)}`,
  );
  const releaseExtras = [...filterLines, ...signalLines].join("\n");
  const releaseLabel =
    releaseExtras.length > 0 ? `release\n---\n${releaseExtras}` : "release";

  // `release` procedure — fires later when a matching event occurs.
  const releaseId = ids("rel");
  nodes.push({
    id: releaseId,
    category: "procedure",
    atomKind: "release",
    label: releaseLabel,
  });
  edges.push({ from: ctx.procId, to: releaseId, relation: "stores" });
  edges.push({ from: releaseId, to: anchorId, relation: "attaches_to" });

  // Events — each event kind becomes a `post_action_window` node that
  // the anchor `opens_window` on. We use post_action_window as the
  // closest v4 window atom for "after a creature acts on the anchor".
  for (const e of m.events) {
    const eId = ids("evt");
    nodes.push({
      id: eId,
      category: "window",
      atomKind: "post_action_window",
      label: `post_action_window\n${describeAnchoredEvent(e)}`,
    });
    edges.push({ from: anchorId, to: eId, relation: "opens_window" });
    edges.push({ from: eId, to: releaseId, relation: "prompts" });
  }
}

function traceAnchorTarget(
  a: AnchorTarget,
  range: Range,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const id = ids("anc");
  switch (a.kind) {
    case "location":
      nodes.push({
        id,
        category: "attachment",
        atomKind: "location",
        label: `location\n${a.description}\nrange ${describeRange(range)}`,
      });
      return id;
    case "area":
      nodes.push({
        id,
        category: "attachment",
        atomKind: "area",
        label: `area\n${a.shape.kind} ≤ ${a.shape.maxSideFeet} ft side\nrange ${describeRange(range)}`,
      });
      return id;
    default: {
      const _: never = a;
      throw new Error(`unhandled anchor target: ${String(_)}`);
    }
  }
}

function describeAnchoredEvent(e: AnchoredEvent): string {
  switch (e.kind) {
    case "physical_contact":
      return "physical contact (touch)";
    case "enters_area":
      return "creature enters area";
    default: {
      const _: never = e;
      throw new Error(`unhandled anchored event: ${String(_)}`);
    }
  }
}

function describeAnchoredFilter(f: AnchoredFilter): string {
  switch (f.kind) {
    case "creature_exemption_list":
      return "creature exemption list\n(chosen at cast)";
    default: {
      const _: never = f.kind;
      throw new Error(`unhandled anchored filter: ${String(_)}`);
    }
  }
}

function describeAnchoredSignal(s: AnchoredSignal): string {
  switch (s.kind) {
    case "audible":
      return `audible signal\n${s.sound} (${s.durationSeconds}s, r=${s.audibleRadiusFeet} ft)`;
    case "mental":
      return `mental signal\nrange ${s.rangeFeet} ft${
        s.awakensIfAsleep ? "\nawakens if asleep" : ""
      }`;
    default: {
      const _: never = s;
      throw new Error(`unhandled anchored signal: ${String(_)}`);
    }
  }
}

type CreatureActionsKind = "action" | "bonus_action" | "reaction";

type CreatureCtx = {
  readonly procId: string;
  readonly compId: string;
  readonly slotId: string | null;
  readonly kind: CreatureActionsKind;
  readonly nodes: TraceNode[];
  readonly edges: TraceEdge[];
  readonly ids: IdGen;
};

function traceSpawnedCreature(
  m: SpawnedCreaturePayload,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const compId = ids("cmp");
  nodes.push({
    id: compId,
    category: "attachment",
    atomKind: "companion",
    label: `companion\n${describeSpawnedCreatureStatBlock(m.creature)}\nrange ${describeRange(ctx.range)}`,
  });
  edges.push({ from: ctx.procId, to: compId, relation: "attaches_to" });

  const createId = ids("eff");
  nodes.push({
    id: createId,
    category: "effect",
    atomKind: "create_companion",
    label: `create_companion\n${describeSpawnedCreatureDisplayName(m.creature)}`,
  });
  edges.push({ from: ctx.procId, to: createId, relation: "grants" });
  edges.push({ from: createId, to: compId, relation: "attaches_to" });

  if (m.mode !== undefined) {
    const modeId = ids("chz");
    nodes.push({
      id: modeId,
      category: "procedure",
      atomKind: "choose",
      label: `choose\n${m.mode.label}\n${m.mode.options.map((o) => o.displayName).join(" | ")}`,
    });
    edges.push({ from: ctx.procId, to: modeId, relation: "prompts" });
    edges.push({ from: modeId, to: compId, relation: "modifies" });
  }

  const cmdId = ids("eff");
  nodes.push({
    id: cmdId,
    category: "effect",
    atomKind: "command_companion",
    label: `command_companion\ncost: ${describeCommandCost(m.control)}\n${describeCommandRange(m.control)}`,
  });
  edges.push({ from: ctx.procId, to: cmdId, relation: "grants" });
  edges.push({ from: cmdId, to: compId, relation: "attaches_to" });

  if (m.creature.kind === "inline") {
    for (const [slot, kind] of [
      [m.creature.statBlock.actions, "action"],
      [m.creature.statBlock.bonusActions, "bonus_action"],
      [m.creature.statBlock.reactions, "reaction"],
    ] as const) {
      if (slot === undefined) continue;
      traceCreatureActions(
        {
          procId: ctx.procId,
          compId,
          slotId: ctx.slotId,
          kind,
          nodes,
          edges,
          ids,
        },
        slot,
      );
    }
  }
}

function traceCreatureActions(
  ctx: CreatureCtx,
  actions: CreatureActions,
): void {
  // Multiattacks intentionally excluded from dispatch targets —
  // RAW forbids nesting (a Multiattack can't dispatch another
  // Multiattack; that would double-consume the action economy).
  const definedNames = new Set<string>([
    ...(actions.attacks ?? []).map((a) => a.name),
    ...(actions.saves ?? []).map((a) => a.name),
    ...(actions.supports ?? []).map((a) => a.name),
    ...(actions.actionOptions ?? []).map((a) => a.name),
  ]);
  actions.multiattacks?.forEach((ma, idx) => {
    for (const d of ma.dispatches) {
      if (!definedNames.has(d.name)) {
        throw new Error(
          `multiattack "${ma.name}" dispatches to unknown action "${d.name}"`,
        );
      }
    }
    traceMultiattack(ctx, ma, idx + 1);
  });
  actions.attacks?.forEach((ar, idx) => traceCreatureAttack(ctx, ar, idx + 1));
  actions.saves?.forEach((sg, idx) => traceCreatureSaveGate(ctx, sg, idx + 1));
  actions.supports?.forEach((sp, idx) =>
    traceCreatureSupport(ctx, sp, idx + 1),
  );
  actions.actionOptions?.forEach((option, idx) =>
    traceCreatureActionOption(ctx, option, idx + 1),
  );
}

function maTag(count: StatBlockValue | undefined): string {
  return count !== undefined
    ? `\nmultiattack ×${describeStatBlockValue(count)}`
    : "";
}

function traceCreatureAttack(
  ctx: CreatureCtx,
  ar: CreatureNamedAttackRoll,
  idx: number,
): void {
  const resId = ctx.ids("res");
  ctx.nodes.push({
    id: resId,
    category: "resolution",
    atomKind: "attack_roll",
    label: `attack_roll [${ctx.kind} ${idx}: ${ar.name}]\n${ar.attackType} (+${describeStatBlockValue(ar.attackBonus)})${maTag(ar.multiattackCount)}`,
  });
  ctx.edges.push({ from: ctx.procId, to: resId, relation: "grants" });
  ctx.edges.push({ from: resId, to: ctx.compId, relation: "attaches_to" });
  traceAttackWindow(
    ar.onHit,
    "on_hit_window",
    resId,
    ctx.compId,
    ctx.slotId,
    ctx.nodes,
    ctx.edges,
    ctx.ids,
  );
}

function traceCreatureSaveGate(
  ctx: CreatureCtx,
  sg: CreatureNamedSaveGate,
  idx: number,
): void {
  const resId = ctx.ids("res");
  ctx.nodes.push({
    id: resId,
    category: "resolution",
    atomKind: "save_gate",
    label: `save_gate [${ctx.kind} ${idx}: ${sg.name}]\n${sg.ability.toUpperCase()} save\nDC: ${describeDc(sg.dc)}\narea: ${describeAreaShapeFixed(sg.area)}${maTag(sg.multiattackCount)}`,
  });
  ctx.edges.push({ from: ctx.procId, to: resId, relation: "grants" });
  ctx.edges.push({ from: resId, to: ctx.compId, relation: "attaches_to" });

  traceSaveBranch(
    sg.onFail,
    resId,
    ctx.compId,
    ctx.slotId,
    ctx.nodes,
    ctx.edges,
    ctx.ids,
  );
  if (sg.onSuccess.kind === "half_damage") {
    const halfId = ctx.ids("eff");
    ctx.nodes.push({
      id: halfId,
      category: "effect",
      atomKind: "half_damage",
      label: "half_damage\n(½ of onFail damage)",
    });
    ctx.edges.push({ from: resId, to: halfId, relation: "branches_on_save" });
    ctx.edges.push({ from: halfId, to: ctx.compId, relation: "attaches_to" });
  } else {
    traceSaveBranch(
      sg.onSuccess,
      resId,
      ctx.compId,
      ctx.slotId,
      ctx.nodes,
      ctx.edges,
      ctx.ids,
    );
  }
}

function traceCreatureSupport(
  ctx: CreatureCtx,
  sp: CreatureNamedSupport,
  idx: number,
): void {
  const dirId = ctx.ids("dir");
  ctx.nodes.push({
    id: dirId,
    category: "procedure",
    atomKind: "direct_apply",
    label: `direct_apply [${ctx.kind} ${idx}: ${sp.name}]\ntarget: ${sp.target}${
      sp.rangeFeet !== undefined ? ` (${sp.rangeFeet} ft)` : ""
    }${maTag(sp.multiattackCount)}`,
  });
  ctx.edges.push({ from: ctx.procId, to: dirId, relation: "grants" });
  ctx.edges.push({ from: dirId, to: ctx.compId, relation: "attaches_to" });
  const effId = traceEffectAtom(sp.effect, ctx.nodes, ctx.ids, ctx.edges);
  if (effId !== null) {
    ctx.edges.push({ from: dirId, to: effId, relation: "grants" });
    ctx.edges.push({ from: effId, to: ctx.compId, relation: "attaches_to" });
  }
}

function traceCreatureActionOption(
  ctx: CreatureCtx,
  option: CreatureNamedActionOption,
  idx: number,
): void {
  const optionId = ctx.ids("act");
  ctx.nodes.push({
    id: optionId,
    category: "procedure",
    atomKind: "action_option",
    label: `action_option [${ctx.kind} ${idx}: ${option.name}]\n${option.options.join(" or ")}`,
  });
  ctx.edges.push({ from: ctx.procId, to: optionId, relation: "offers" });
  ctx.edges.push({ from: optionId, to: ctx.compId, relation: "available_to" });
}

function traceMultiattack(
  ctx: CreatureCtx,
  ma: CreatureNamedMultiattack,
  idx: number,
): void {
  const dirId = ctx.ids("dir");
  const dispatches = ma.dispatches
    .map((d) => `${describeStatBlockValue(d.count)}× ${d.name}`)
    .join(" + ");
  ctx.nodes.push({
    id: dirId,
    category: "procedure",
    atomKind: "direct_apply",
    label: `direct_apply [${ctx.kind} ${idx}: ${ma.name}]\nmultiattack: ${dispatches}`,
  });
  ctx.edges.push({ from: ctx.procId, to: dirId, relation: "grants" });
  ctx.edges.push({ from: dirId, to: ctx.compId, relation: "attaches_to" });
}

function describeCommandCost(c: CreatureControl): string {
  switch (c.commandCost.kind) {
    case "no_action_required":
      return "no action";
    case "bonus_action":
      return "bonus action";
    case "action":
      return "action";
    default: {
      const _: never = c.commandCost;
      throw new Error(`unhandled command cost: ${String(_)}`);
    }
  }
}

function describeCommandRange(c: CreatureControl): string {
  return c.commandRangeFeet === undefined
    ? "range unspecified"
    : `range ${c.commandRangeFeet} ft`;
}

function describeStatBlockValue(v: StatBlockValue): string {
  switch (v.kind) {
    case "literal":
      return String(v.value);
    case "linear_per_level":
      return `${v.base} + ${v.perLevel}×(${v.axis}−${v.startingAtLevel})`;
    case "caster_derived":
      return v.source;
    default: {
      const _: never = v;
      throw new Error(`unhandled StatBlockValue: ${String(_)}`);
    }
  }
}

function describeCreatureStatBlock(sb: CreatureStatBlock): string {
  const parts: string[] = [sb.displayName];
  parts.push(
    `size: ${typeof sb.size === "string" ? sb.size : `choice(${sb.size.label})`}`,
  );
  parts.push(
    `type: ${typeof sb.creatureType === "string" ? sb.creatureType : `choice(${sb.creatureType.label})`}`,
  );
  parts.push(`AC ${describeStatBlockValue(sb.ac)}`);
  parts.push(`HP ${describeStatBlockValue(sb.hp)}`);
  return parts.join(" / ");
}

function describeSpawnedCreatureStatBlock(
  creature: SpawnedCreatureStatBlock,
): string {
  switch (creature.kind) {
    case "inline":
      return describeCreatureStatBlock(creature.statBlock);
    case "catalog_ref":
      return `${creature.displayName} / catalog_ref(${creature.monsterId})`;
    default: {
      const _exhaustive: never = creature;
      return _exhaustive;
    }
  }
}

function describeSpawnedCreatureDisplayName(
  creature: SpawnedCreatureStatBlock,
): string {
  switch (creature.kind) {
    case "inline":
      return creature.statBlock.displayName;
    case "catalog_ref":
      return creature.displayName;
    default: {
      const _exhaustive: never = creature;
      return _exhaustive;
    }
  }
}

function traceActivation(
  m: ActivationMechanics,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  // Thread phase resolutions with `branches_on_completion` edges so the
  // graph shows "phase 1 completes, phase 2 follows" explicitly. SRD
  // sequencing ("Hit or miss, the shard then explodes") becomes a real
  // edge instead of implicit array order.
  let previousResolutionId: string | null = null;
  m.phases.forEach((phase, idx) => {
    const thisResolutionId = tracePhase(phase, idx + 1, ctx, nodes, edges, ids);
    if (previousResolutionId !== null) {
      edges.push({
        from: previousResolutionId,
        to: thisResolutionId,
        relation: "branches_on_completion",
      });
    }
    previousResolutionId = thisResolutionId;
  });
}

function tracePhase(
  phase: ActivationPhase,
  phaseNumber: number,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  switch (phase.kind) {
    case "attack_roll": {
      const attId = traceAttachment(phase.attachment, ctx.range, nodes, ids);
      edges.push({ from: ctx.procId, to: attId, relation: "attaches_to" });
      traceTargetCountScaling(
        phase.attachment,
        attId,
        ctx.slotId,
        nodes,
        edges,
        ids,
      );

      const resId = ids("res");
      nodes.push({
        id: resId,
        category: "resolution",
        atomKind: "attack_roll",
        label: `attack_roll [phase ${phaseNumber}]\n${phase.attackKind.replaceAll("_", " ")}`,
      });
      edges.push({ from: ctx.procId, to: resId, relation: "grants" });
      edges.push({ from: resId, to: attId, relation: "attaches_to" });

      traceAttackWindow(
        phase.onHit,
        "on_hit_window",
        resId,
        attId,
        ctx.slotId,
        nodes,
        edges,
        ids,
      );
      traceAttackWindow(
        phase.onMiss,
        "on_miss_window",
        resId,
        attId,
        ctx.slotId,
        nodes,
        edges,
        ids,
      );
      if (phase.continue !== undefined) {
        tracePhaseContinuation(phase.continue, resId, ctx, nodes, edges, ids);
      }
      return resId;
    }
    case "save_gate": {
      const attId = traceAttachment(phase.attachment, ctx.range, nodes, ids);
      edges.push({ from: ctx.procId, to: attId, relation: "attaches_to" });
      traceTargetCountScaling(
        phase.attachment,
        attId,
        ctx.slotId,
        nodes,
        edges,
        ids,
      );

      const autoLabel =
        phase.autoSuccessIfCasterSlotGte !== undefined
          ? `\nauto-success if caster slot ≥ ${phase.autoSuccessIfCasterSlotGte}`
          : "";
      const gateLabel =
        phase.saveAppliesIf !== undefined
          ? `\nsave only if ${phase.saveAppliesIf}`
          : "";
      const resId = ids("res");
      nodes.push({
        id: resId,
        category: "resolution",
        atomKind: "save_gate",
        label: `save_gate [phase ${phaseNumber}]\n${phase.ability.toUpperCase()} save\nDC: ${describeDc(phase.dc)}${autoLabel}${gateLabel}`,
      });
      edges.push({ from: ctx.procId, to: resId, relation: "grants" });
      edges.push({ from: resId, to: attId, relation: "attaches_to" });

      traceSaveBranch(
        phase.onFail,
        resId,
        attId,
        ctx.slotId,
        nodes,
        edges,
        ids,
      );
      if (phase.onSuccess.kind === "half_damage") {
        const halfId = ids("eff");
        nodes.push({
          id: halfId,
          category: "effect",
          atomKind: "half_damage",
          label: "half_damage\n(½ of onFail damage)",
        });
        edges.push({
          from: resId,
          to: halfId,
          relation: "branches_on_save",
        });
        edges.push({ from: halfId, to: attId, relation: "attaches_to" });
      } else {
        traceSaveBranch(
          phase.onSuccess,
          resId,
          attId,
          ctx.slotId,
          nodes,
          edges,
          ids,
        );
      }
      if (phase.repeatSave !== undefined) {
        const repId = ids("rep");
        nodes.push({
          id: repId,
          category: "resolution",
          atomKind: "repeat_save",
          label: `repeat_save\ncadence: ${phase.repeatSave.cadence}\non success: ${phase.repeatSave.onSuccess}`,
        });
        edges.push({ from: resId, to: repId, relation: "repeats_as" });
        edges.push({ from: repId, to: attId, relation: "attaches_to" });
        if (phase.repeatSave.onFailAgain !== undefined) {
          const escId = traceEffectAtom(
            phase.repeatSave.onFailAgain,
            nodes,
            ids,
            edges,
          );
          if (escId !== null) {
            edges.push({
              from: repId,
              to: escId,
              relation: "branches_on_save",
            });
            edges.push({ from: escId, to: attId, relation: "attaches_to" });
          }
        }
      }
      return resId;
    }
    case "direct": {
      const attId = traceAttachment(phase.attachment, ctx.range, nodes, ids);
      edges.push({ from: ctx.procId, to: attId, relation: "attaches_to" });
      traceTargetCountScaling(
        phase.attachment,
        attId,
        ctx.slotId,
        nodes,
        edges,
        ids,
      );

      // Direct phases emit a procedure node rather than a resolution
      // node — there is no D20 test to resolve.
      const directId = ids("dir");
      nodes.push({
        id: directId,
        category: "procedure",
        atomKind: "direct_apply",
        label: `direct_apply [phase ${phaseNumber}]`,
      });
      edges.push({ from: ctx.procId, to: directId, relation: "grants" });

      if (phase.effects !== undefined) {
        for (const eff of phase.effects) {
          const effId = traceEffectAtom(eff, nodes, ids, edges);
          if (effId === null) continue;
          edges.push({ from: directId, to: effId, relation: "grants" });
          edges.push({ from: effId, to: attId, relation: "attaches_to" });
          traceEffectAtomScaling(eff, effId, ctx.slotId, nodes, edges, ids);
        }
      }
      if (phase.mode !== undefined) {
        traceEffectModeChoice(
          phase.mode,
          directId,
          attId,
          ctx.slotId,
          nodes,
          edges,
          ids,
        );
      }
      return directId;
    }
    case "ability_check_gate": {
      const attId = traceAttachment(phase.attachment, ctx.range, nodes, ids);
      edges.push({ from: ctx.procId, to: attId, relation: "attaches_to" });

      const autoLabel =
        phase.autoSuccessIfCasterSlotGte !== undefined
          ? `\nauto-success if caster slot ≥ ${phase.autoSuccessIfCasterSlotGte}`
          : "";
      const resId = ids("res");
      nodes.push({
        id: resId,
        category: "resolution",
        atomKind: "ability_check",
        label: `ability_check_gate [phase ${phaseNumber}]\n${phase.ability.toUpperCase()} check\nDC ${phase.dc}${autoLabel}`,
      });
      edges.push({ from: ctx.procId, to: resId, relation: "grants" });
      edges.push({ from: resId, to: attId, relation: "attaches_to" });

      const passId = traceEffectAtom(phase.onPass, nodes, ids, edges);
      if (passId !== null) {
        edges.push({
          from: resId,
          to: passId,
          relation: "branches_on_completion",
        });
        edges.push({ from: passId, to: attId, relation: "attaches_to" });
      }
      if (phase.onFail !== undefined) {
        const failId = traceEffectAtom(phase.onFail, nodes, ids, edges);
        if (failId !== null) {
          edges.push({
            from: resId,
            to: failId,
            relation: "branches_on_completion",
          });
          edges.push({ from: failId, to: attId, relation: "attaches_to" });
        }
      }
      return resId;
    }
    case "random_table": {
      const resId = ids("res");
      nodes.push({
        id: resId,
        category: "resolution",
        atomKind: "random_table",
        label: `random_table [phase ${phaseNumber}]\nroll: ${describeRandomTableRoll(phase.roll)}`,
      });
      edges.push({ from: ctx.procId, to: resId, relation: "grants" });

      for (const outcome of phase.outcomes) {
        const branchId = ids("tbl");
        nodes.push({
          id: branchId,
          category: "resolution",
          atomKind: "table_result",
          label:
            `table_result\n${describeRandomTableOutcomeRange(outcome)}` +
            `\n${outcome.label}`,
        });
        edges.push({ from: resId, to: branchId, relation: "branches_on_roll" });

        if (outcome.phases === undefined) continue;

        const branchCtx: SpellCtx = { ...ctx, procId: branchId };
        let previousResolutionId: string | null = null;
        outcome.phases.forEach((nestedPhase, idx) => {
          const nestedResolutionId = tracePhase(
            nestedPhase,
            idx + 1,
            branchCtx,
            nodes,
            edges,
            ids,
          );
          if (previousResolutionId !== null) {
            edges.push({
              from: previousResolutionId,
              to: nestedResolutionId,
              relation: "branches_on_completion",
            });
          }
          previousResolutionId = nestedResolutionId;
        });
      }
      return resId;
    }
    default: {
      const _exhaustive: never = phase;
      throw new Error(`unhandled phase: ${String(_exhaustive)}`);
    }
  }
}

function tracePhaseContinuation(
  continuation: import("../surface/types.ts").PhaseContinuation,
  hostId: string,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const continuationId = ids("cont");
  nodes.push({
    id: continuationId,
    category: "window",
    atomKind: "repeat_continuation",
    label:
      continuation.when.kind === "damage_roll_has_duplicate_faces"
        ? `repeat_continuation\nwhen damage roll has duplicate faces (${continuation.when.minimumMultiplicity}+)`
        : "repeat_continuation",
  });
  edges.push({ from: hostId, to: continuationId, relation: "opens_window" });

  for (const limit of continuation.limits) {
    const limitId = ids("lim");
    nodes.push({
      id: limitId,
      category: "lifecycle",
      atomKind: "continuation_limit",
      label:
        limit.kind === "max_leaps_from_slot_level"
          ? "continuation_limit\nmax leaps from slot level"
          : "continuation_limit\nexclude already targeted in same cast",
    });
    edges.push({ from: continuationId, to: limitId, relation: "bounded_by" });
  }

  const branchCtx: SpellCtx = { ...ctx, procId: continuationId };
  let previousResolutionId: string | null = null;
  continuation.next.forEach((nestedPhase: ActivationPhase, idx: number) => {
    const nestedResolutionId = tracePhase(
      nestedPhase,
      idx + 1,
      branchCtx,
      nodes,
      edges,
      ids,
    );
    if (previousResolutionId !== null) {
      edges.push({
        from: previousResolutionId,
        to: nestedResolutionId,
        relation: "branches_on_completion",
      });
    }
    previousResolutionId = nestedResolutionId;
  });
}

function traceEffectModeChoice(
  mode: CastTimeEffectModeChoice,
  procId: string,
  attId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const chooseId = ids("chz");
  const switchTag =
    mode.allowsMidDurationSwitchAs === "magic_action"
      ? "\nswitch: Magic action"
      : "";
  nodes.push({
    id: chooseId,
    category: "procedure",
    atomKind: "choose",
    label: `choose\n${mode.label}\n${mode.options
      .map((option) =>
        option.effects === undefined
          ? `${option.displayName} (DM-owned)`
          : option.displayName,
      )
      .join(" | ")}${switchTag}`,
  });
  edges.push({ from: procId, to: chooseId, relation: "prompts" });

  if (mode.allowsMidDurationSwitchAs === "magic_action") {
    const replaceId = ids("repl");
    nodes.push({
      id: replaceId,
      category: "procedure",
      atomKind: "replace",
      label: "replace\nmode via Magic action",
    });
    edges.push({ from: procId, to: replaceId, relation: "grants" });

    const quotaId = ids("q");
    nodes.push({
      id: quotaId,
      category: "resource",
      atomKind: "action_quota",
      label: "action_quota\n(mode switch)",
    });
    edges.push({ from: replaceId, to: quotaId, relation: "consumes" });
    edges.push({ from: replaceId, to: chooseId, relation: "prompts" });
  }

  for (const option of mode.options) {
    if (option.effects === undefined) continue;
    const modeId = ids("eff");
    nodes.push({
      id: modeId,
      category: "effect",
      atomKind: "composite",
      label: `mode\n${option.displayName}\n(${option.effects.length} effect${option.effects.length === 1 ? "" : "s"})`,
    });
    edges.push({ from: chooseId, to: modeId, relation: "modifies" });
    edges.push({ from: modeId, to: attId, relation: "attaches_to" });
    for (const effect of option.effects) {
      const effectId = traceEffectAtom(effect, nodes, ids, edges);
      if (effectId === null) continue;
      edges.push({ from: modeId, to: effectId, relation: "grants" });
      edges.push({ from: effectId, to: attId, relation: "attaches_to" });
      traceEffectAtomScaling(effect, effectId, slotId, nodes, edges, ids);
    }
  }
}

function traceSaveBranch(
  e: EffectAtom,
  fromResolutionId: string,
  attId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const eId = traceEffectAtom(e, nodes, ids, edges);
  if (eId === null) return;
  edges.push({ from: fromResolutionId, to: eId, relation: "branches_on_save" });
  edges.push({ from: eId, to: attId, relation: "attaches_to" });
  traceEffectAtomScaling(e, eId, slotId, nodes, edges, ids);
}

function traceAttackWindow(
  effects: ReadonlyArray<EffectAtom>,
  windowAtom: "on_hit_window" | "on_miss_window",
  attackRollId: string,
  attId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const effectIds: string[] = [];
  for (const e of effects) {
    const effectId = traceEffectAtom(e, nodes, ids, edges);
    if (effectId === null) continue;
    effectIds.push(effectId);
  }
  if (effectIds.length === 0) return;
  const winId = ids("win");
  nodes.push({
    id: winId,
    category: "window",
    atomKind: windowAtom,
    label: windowAtom,
  });
  edges.push({ from: attackRollId, to: winId, relation: "opens_window" });
  for (let i = 0; i < effectIds.length; i++) {
    const effectId = effectIds[i]!;
    edges.push({ from: winId, to: effectId, relation: "grants" });
    edges.push({ from: effectId, to: attId, relation: "attaches_to" });
    traceEffectAtomScaling(effects[i]!, effectId, slotId, nodes, edges, ids);
  }
}

function traceAttachment(
  a: Attachment,
  range: Range,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const id = ids("att");
  switch (a.kind) {
    case "self": {
      nodes.push({
        id,
        category: "attachment",
        atomKind: "self",
        label: `self\nrange ${describeRange(range)}`,
      });
      return id;
    }
    case "target": {
      const selectionLabel = describeTargetSelection(a.selection);
      nodes.push({
        id,
        category: "attachment",
        atomKind: "target",
        label: `target\n${selectionLabel}\nrange ${describeAttachmentRange(range, a.rangeOrigin)}`,
      });
      return id;
    }
    case "area": {
      const originLabel = describeAreaOrigin(a.origin, range, a.rangeOrigin);
      const occupantLabel = describeAreaOccupantDispositionFilter(
        a.occupantDispositionFilter,
      );
      nodes.push({
        id,
        category: "attachment",
        atomKind: "area",
        label: `area\n${describeAreaShape(a.shape)}\n${originLabel}${occupantLabel}`,
      });
      return id;
    }
    case "mark": {
      const selectionLabel = describeTargetSelection(a.selection);
      const transferLabel = a.transfer
        ? `\ntransfer on ${describeTransferEvent(a.transfer)} (${a.transfer.cost.kind})`
        : "";
      nodes.push({
        id,
        category: "attachment",
        atomKind: "mark",
        label: `mark\n${selectionLabel}\nrange ${describeAttachmentRange(range, a.rangeOrigin)}${transferLabel}`,
      });
      return id;
    }
    case "object": {
      const countLabel = a.count === 2 ? "2 objects" : "object";
      const filterLabel = describeObjectFilter(a.filter);
      nodes.push({
        id,
        category: "attachment",
        atomKind: "object",
        label: `${countLabel}${filterLabel}\nrange ${describeAttachmentRange(range, a.rangeOrigin)}`,
      });
      return id;
    }
    case "location": {
      nodes.push({
        id,
        category: "attachment",
        atomKind: "location",
        label: `location\n${a.description}\nrange ${describeAttachmentRange(range, a.rangeOrigin)}`,
      });
      return id;
    }
    case "hole": {
      nodes.push({
        id,
        category: "hole",
        atomKind: "hole",
        label: describeAttachmentHole(a, range),
      });
      return id;
    }
    default: {
      const _exhaustive: never = a;
      throw new Error(`unhandled attachment: ${String(_exhaustive)}`);
    }
  }
}

function describeAttachmentHole(
  a: Extract<Attachment, { readonly kind: "hole" }>,
  range: Range,
): string {
  const labelPrefix = a.label !== undefined ? `hole\n${a.label}` : "hole";
  switch (a.value.kind) {
    case "self":
      return `${labelPrefix}\nself\nrange ${describeRange(range)}`;
    case "target":
      return `${labelPrefix}\ntarget\n${describeTargetSelection(a.value.selection)}\nrange ${describeAttachmentRange(range, a.value.rangeOrigin)}`;
    case "area": {
      const originLabel = describeAreaOrigin(
        a.value.origin,
        range,
        a.value.rangeOrigin,
      );
      const occupantLabel = describeAreaOccupantDispositionFilter(
        a.value.occupantDispositionFilter,
      );
      return `${labelPrefix}\narea\n${describeAreaShape(a.value.shape)}\n${originLabel}${occupantLabel}`;
    }
    case "mark": {
      const transferLabel = a.value.transfer
        ? `\ntransfer on ${describeTransferEvent(a.value.transfer)} (${a.value.transfer.cost.kind})`
        : "";
      return `${labelPrefix}\nmark\n${describeTargetSelection(a.value.selection)}\nrange ${describeAttachmentRange(range, a.value.rangeOrigin)}${transferLabel}`;
    }
    case "object": {
      const countLabel = a.value.count === 2 ? "2 objects" : "object";
      const filterLabel = describeObjectFilter(a.value.filter);
      return `${labelPrefix}\n${countLabel}${filterLabel}\nrange ${describeAttachmentRange(range, a.value.rangeOrigin)}`;
    }
    case "location":
      return `${labelPrefix}\nlocation\n${a.value.description}\nrange ${describeAttachmentRange(range, a.value.rangeOrigin)}`;
    default: {
      const _: never = a.value;
      throw new Error(`unhandled attachment hole value: ${String(_)}`);
    }
  }
}

function describeOngoingCasterActionCost(
  cost: import("../surface/types.ts").OngoingCasterActionCost,
): string {
  switch (cost.kind) {
    case "bonus_action":
      return "Bonus Action";
    case "standard_action":
      return `${cost.action} action`;
    default: {
      const _: never = cost;
      throw new Error(`unhandled ongoing caster action cost: ${String(_)}`);
    }
  }
}

function describeObjectFilter(f: ObjectFilter | undefined): string {
  if (f === undefined) return "";
  const parts: string[] = [];
  if (f.material !== undefined) parts.push(f.material);
  if (f.manufactured === true) parts.push("manufactured");
  if (f.maxSize !== undefined) parts.push(`${f.maxSize}_or_smaller`);
  switch (f.heldOrWorn) {
    case "required":
      parts.push("held_or_worn");
      break;
    case "forbidden":
      parts.push("not_held_or_worn");
      break;
    case undefined:
      break;
    default: {
      const _: never = f.heldOrWorn;
      throw new Error(`unhandled heldOrWorn: ${String(_)}`);
    }
  }
  return parts.length > 0 ? `\nfilter: ${parts.join(", ")}` : "";
}

function describeDamageTypeRef(d: DamageTypeRef): string {
  if (typeof d === "string") return d;
  if (d.kind === "hole") {
    return `${describeDamageTypeRef(d.value)}${d.label !== undefined ? ` [hole: ${d.label}]` : " [hole]"}`;
  }
  if (d.kind === "same_choice_as") return `same choice as ${d.holeId}`;
  if (d.kind === "choice_table") {
    const options = d.options
      .map((option) => `${option.displayName}: ${option.damageType}`)
      .join(" | ");
    return `${d.label} [${d.holeId}] (${options})`;
  }
  if (d.kind === "same_table_choice_as") {
    const options = d.options
      .map((option) => `${option.displayName}: ${option.damageType}`)
      .join(" | ");
    return `same table choice as ${d.holeId} (${options})`;
  }
  if (d.kind === "choice")
    return `${d.label} (choose: ${d.options.join(" | ")})`;
  const _: never = d;
  throw new Error(`unhandled damage type ref: ${String(_)}`);
}

function describeTargetSelection(s: TargetSelection): string {
  const typeFilter =
    s.typeFilter !== undefined && s.typeFilter.length > 0
      ? `\ntype: ${s.typeFilter.join("/")}`
      : "";
  if (s.mode === "one") return `one${typeFilter}`;
  if (s.mode === "any_number") return `any_number${typeFilter}`;
  const repeats = s.repeatsAllowed === true ? " (repeats allowed)" : "";
  return `choose_up_to: ${describeScaling(s.count)}${repeats}${typeFilter}`;
}

function describeAreaOrigin(
  o: AreaOrigin,
  range: Range,
  rangeOrigin: AttachmentRangeOrigin | undefined,
): string {
  switch (o.kind) {
    case "point_within_range":
      return `origin: point within ${describeAttachmentRange(range, rangeOrigin)}`;
    case "on_primary_target":
      return "origin: primary target";
    case "self":
      return "origin: caster (self)";
    default: {
      const _: never = o;
      throw new Error(`unhandled area origin: ${String(_)}`);
    }
  }
}

function describeAttachmentRange(
  range: Range,
  origin: AttachmentRangeOrigin | undefined,
): string {
  const base = describeRange(range);
  return (origin ?? "caster") === "caster" ? base : `${base} from spell sensor`;
}

function describeAreaOccupantDispositionFilter(
  filter: AreaOccupantDispositionFilter | undefined,
): string {
  switch (filter) {
    case undefined:
      return "";
    case "friendly_to_source":
      return "\naffects: friendly creatures";
    case "hostile_to_source":
      return "\naffects: hostile creatures";
    default: {
      const _: never = filter;
      throw new Error(
        `unhandled area occupant disposition filter: ${String(_)}`,
      );
    }
  }
}

function describeAreaShape(s: AreaShapeSpec): string {
  switch (s.kind) {
    case "sphere":
      return `sphere r=${s.radiusFeet} ft`;
    case "circle":
      return `circle r=${s.radiusFeet} ft`;
    case "sphere_cluster":
      return `${s.count} spheres r=${s.radiusFeet} ft (${s.overlapResolution})`;
    case "cone":
      return `cone ${s.lengthFeet} ft`;
    case "cube":
      return `cube ${s.sideFeet} ft side`;
    case "cube_cluster": {
      const contig = s.contiguous === true ? ", contiguous" : "";
      return `up to ${s.maxCubes} cubes (${s.sideFeet} ft side${contig})`;
    }
    case "cylinder":
      return `cylinder r=${s.radiusFeet} ft h=${s.heightFeet} ft`;
    case "emanation":
      return `emanation r=${s.radiusFeet} ft`;
    case "line":
      return `line ${s.lengthFeet} ft × ${s.widthFeet} ft`;
    case "wall_volume":
      return `wall ${s.maxLengthFeet} ft × ${s.maxHeightFeet} ft × ${s.thicknessFeet} ft`;
    case "choice":
      return `choice of:\n  ${s.options
        .map(describeAreaShapeFixed)
        .join("\n  ")}`;
    default: {
      const _: never = s;
      throw new Error(`unhandled area shape: ${String(_)}`);
    }
  }
}

function describeAreaShapeFixed(s: AreaShapeDescriptor): string {
  switch (s.kind) {
    case "sphere":
      return `sphere r=${s.radiusFeet} ft`;
    case "circle":
      return `circle r=${s.radiusFeet} ft`;
    case "sphere_cluster":
      return `${s.count} spheres r=${s.radiusFeet} ft (${s.overlapResolution})`;
    case "cone":
      return `cone ${s.lengthFeet} ft`;
    case "cube":
      return `cube ${s.sideFeet} ft side`;
    case "cube_cluster": {
      const contig = s.contiguous === true ? ", contiguous" : "";
      return `up to ${s.maxCubes} cubes (${s.sideFeet} ft side${contig})`;
    }
    case "cylinder":
      return `cylinder r=${s.radiusFeet} ft h=${s.heightFeet} ft`;
    case "emanation":
      return `emanation r=${s.radiusFeet} ft`;
    case "line":
      return `line ${s.lengthFeet} ft × ${s.widthFeet} ft`;
    case "wall_volume":
      return `wall ${s.maxLengthFeet} ft × ${s.maxHeightFeet} ft × ${s.thicknessFeet} ft`;
    default: {
      const _: never = s;
      throw new Error(`unhandled area shape: ${String(_)}`);
    }
  }
}

function traceTargetCountScaling(
  a: Attachment,
  attId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  // target + mark are the two attachments that can carry a target count.
  const selection =
    a.kind === "target" || a.kind === "mark" ? a.selection : null;
  if (selection === null || selection.mode !== "choose_up_to") return;
  // Fixed count (Aid: "up to three creatures" — no upcast on count) has
  // no scaling node; the spell's upcast acts elsewhere.
  if (typeof selection.count === "number") return;
  if (selection.count.kind !== "linear") return;
  const scId = ids("sc");
  nodes.push({
    id: scId,
    category: "scaling",
    atomKind: "scale_target_count",
    label: `scale_target_count\n+${selection.count.perSlotAboveBase}/slot above ${selection.count.baseLevel}`,
  });
  edges.push({ from: scId, to: attId, relation: "modifies" });
  if (slotId !== null)
    edges.push({ from: slotId, to: scId, relation: "modifies" });
}

// Emit a scaling atom node attached to an effect (damage OR heal) when
// the DiceAmount is scaled. Works uniformly across damage and heal.
function traceDiceAmountScaling(
  amt: DiceAmount,
  effectId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (amt.kind) {
    case "fixed":
      return;
    case "threshold_tiers": {
      const scId = ids("sc");
      const tierText = amt.tiers
        .map(
          (t) => `L${t.atLevel}:${describeTierOverride(t.override, amt.base)}`,
        )
        .join(" | ");
      nodes.push({
        id: scId,
        category: "scaling",
        atomKind: scalingAtomFor(amt),
        label: `${scalingAtomFor(amt)}\naxis=${amt.axis}\ntiers: ${tierText}`,
      });
      edges.push({ from: scId, to: effectId, relation: "modifies" });
      // For slot-axis scaling, thread the spell_slot node into the chain.
      if (amt.axis === "slot" && slotId !== null) {
        edges.push({ from: slotId, to: scId, relation: "modifies" });
      }
      return;
    }
    case "linear_per_level": {
      const scId = ids("sc");
      const deltaText = describeDelta_(amt.perLevel, amt.base);
      nodes.push({
        id: scId,
        category: "scaling",
        atomKind: scalingAtomFor(amt),
        label: `${scalingAtomFor(amt)}\naxis=${amt.axis}\n+${deltaText} per level above ${amt.startingAtLevel}`,
      });
      edges.push({ from: scId, to: effectId, relation: "modifies" });
      if (amt.axis === "slot" && slotId !== null) {
        edges.push({ from: slotId, to: scId, relation: "modifies" });
      }
      return;
    }
    case "resource_spent":
      // No scaling node — the amount is determined by the activation's
      // resource expenditure, not a character or slot axis. The
      // describe side renders the label "= resource spent".
      return;
    case "proficiency_bonus": {
      const scId = ids("sc");
      nodes.push({
        id: scId,
        category: "scaling",
        atomKind: "scale_numeric_bonus",
        label: "scale_numeric_bonus\naxis=proficiency_bonus",
      });
      edges.push({ from: scId, to: effectId, relation: "modifies" });
      return;
    }
    case "resource_spent_linear": {
      const scId = ids("sc");
      const deltaText = describeDelta_(amt.perResource, amt.base);
      const maxText =
        amt.maximum === undefined ? "" : `\nmax ${describeExpr(amt.maximum)}`;
      nodes.push({
        id: scId,
        category: "scaling",
        atomKind: scalingAtomFor(amt),
        label:
          `${scalingAtomFor(amt)}\naxis=resource_spent\n` +
          `base ${describeExpr(amt.base)}\n` +
          `+${deltaText} per resource spent${maxText}`,
      });
      edges.push({ from: scId, to: effectId, relation: "modifies" });
      return;
    }
    case "linked":
      // §A14: no scaling node — the amount is derived from another
      // atom's resolved output in the same phase. Any slot/character
      // scaling already lives on the source damage atom and
      // propagates through the link.
      return;
    default: {
      const _exhaustive: never = amt;
      throw new Error(`unhandled dice amount: ${String(_exhaustive)}`);
    }
  }
}

// Pick the v4 scaling atom kind based on what this scaling actually
// changes. Die size changes → scale_die_size. Die count changes →
// scale_die_count. Only flat changes → scale_numeric_bonus.
function scalingAtomFor(amt: DiceAmount): string {
  if (amt.kind === "fixed") return "scale_numeric_bonus";
  if (amt.kind === "threshold_tiers") {
    const changesDieSize = amt.tiers.some(
      (t) => t.override.dieSize !== undefined,
    );
    const changesDice = amt.tiers.some((t) => t.override.dice !== undefined);
    if (changesDieSize) return "scale_die_size";
    if (changesDice) return "scale_die_count";
    return "scale_numeric_bonus";
  }
  if (amt.kind === "linear_per_level") {
    if (amt.perLevel.dieSize !== undefined) return "scale_die_size";
    if (amt.perLevel.dice !== undefined) return "scale_die_count";
    return "scale_numeric_bonus";
  }
  if (amt.kind === "resource_spent_linear") {
    if (amt.perResource.dieSize !== undefined) return "scale_die_size";
    if (amt.perResource.dice !== undefined) return "scale_die_count";
    return "scale_numeric_bonus";
  }
  return "scale_numeric_bonus";
}

function describeTierOverride(d: DiceExprDelta, base: DiceExpr): string {
  const dice = d.dice ?? base.dice;
  const dieSize = d.dieSize ?? base.dieSize;
  const flat = d.flat ?? base.flat;
  return `${dice}d${dieSize}${flat !== undefined && flat !== 0 ? `+${flat}` : ""}`;
}

function describeDelta_(d: DiceExprDelta, base: DiceExpr): string {
  const parts: string[] = [];
  if (d.dice !== undefined)
    parts.push(`${d.dice}d${d.dieSize ?? base.dieSize}`);
  if (d.dieSize !== undefined && d.dice === undefined)
    parts.push(`die size ${d.dieSize}`);
  if (d.flat !== undefined) parts.push(`${d.flat} flat`);
  return parts.join(" + ");
}

function describeModifyAcSetBase(
  effect: Extract<EffectAtom, { readonly kind: "modify_ac_set_base" }>,
): string {
  switch (effect.formula.kind) {
    case "base_plus_dex":
      return `${effect.formula.base} + DEX mod`;
    case "base_plus_dex_con":
      return `${effect.formula.base} + DEX mod + CON mod`;
    case "base_plus_dex_wis":
      return `${effect.formula.base} + DEX mod + WIS mod`;
    default: {
      const _exhaustive: never = effect.formula;
      throw new Error(`unhandled AC base formula: ${String(_exhaustive)}`);
    }
  }
}

// ============================================================
// Equipment tracer
// ============================================================

function traceArmorUnit(armor: ArmorRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "armor_root",
    label: `armor_root\n${armor.name}\n(${armor.category})`,
  });

  const baseId = ids("ac");
  nodes.push({
    id: baseId,
    category: "effect",
    atomKind: "modify_ac_set_base",
    label: `armor base AC\n${describeArmorAcFormula(armor.acFormula)}`,
  });
  edges.push({ from: rootId, to: baseId, relation: "defines" });

  if (armor.strengthRequirement !== undefined) {
    const strId = ids("req");
    nodes.push({
      id: strId,
      category: "resolution",
      atomKind: "strength_requirement",
      label: `strength_requirement\nSTR ${armor.strengthRequirement}`,
    });
    edges.push({ from: rootId, to: strId, relation: "requires" });
  }

  if (armor.stealthDisadvantage === true) {
    const stealthId = ids("pred");
    nodes.push({
      id: stealthId,
      category: "effect",
      atomKind: "stealth_disadvantage",
      label: "stealth_disadvantage",
    });
    edges.push({ from: rootId, to: stealthId, relation: "imposes" });
  }

  traceDonDoff(
    rootId,
    `don ${armor.donDoff.donMinutes} min / doff ${armor.donDoff.doffMinutes} min`,
    nodes,
    edges,
    ids,
  );

  return traceFromNodes(armor, nodes, edges);
}

function traceArmorTemplateUnit(armor: ArmorTemplateRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "armor_template_root",
    label: `armor_template_root\n${armor.name}\n(${armor.armorApplicability.categories.join(", ")})`,
  });
  for (const variant of armor.variants) {
    traceMagicEquipmentVariant(rootId, variant, nodes, edges, ids);
  }
  return traceFromNodes(armor, nodes, edges);
}

function traceShieldUnit(shield: ShieldRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "shield_root",
    label: `shield_root\n${shield.name}\nhand use: ${shield.armorClassProjection.handUse}\ntraining: ${shield.armorClassProjection.trainingRequired}`,
  });

  const bonusId = ids("ac");
  nodes.push({
    id: bonusId,
    category: "effect",
    atomKind: "modify_ac",
    label: `shield AC bonus\n+${shield.armorClassProjection.bonus}`,
  });
  edges.push({ from: rootId, to: bonusId, relation: "grants" });

  traceDonDoff(
    rootId,
    `don/doff action: ${shield.donDoff.action}`,
    nodes,
    edges,
    ids,
  );

  return traceFromNodes(shield, nodes, edges);
}

function traceShieldTemplateUnit(shield: ShieldTemplateRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "shield_template_root",
    label: `shield_template_root\n${shield.name}\nhand use: ${shield.armorClassProjection.handUse}\ntraining: ${shield.armorClassProjection.trainingRequired}`,
  });

  const bonusId = ids("ac");
  nodes.push({
    id: bonusId,
    category: "effect",
    atomKind: "modify_ac",
    label: `shield AC bonus\n+${shield.armorClassProjection.bonus}`,
  });
  edges.push({ from: rootId, to: bonusId, relation: "grants" });

  traceDonDoff(
    rootId,
    `don/doff action: ${shield.donDoff.action}`,
    nodes,
    edges,
    ids,
  );

  for (const variant of shield.variants) {
    traceMagicEquipmentVariant(rootId, variant, nodes, edges, ids);
  }

  return traceFromNodes(shield, nodes, edges);
}

function traceMagicEquipmentVariant(
  rootId: string,
  variant: MagicEquipmentVariant,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const variantId = ids("root");
  nodes.push({
    id: variantId,
    category: "source",
    atomKind: "magic_equipment_variant",
    label: `magic_equipment_variant\n${variant.name}\n(${variant.magic.rarity})`,
  });
  edges.push({ from: rootId, to: variantId, relation: "roots" });
  const procIds = traceMagicItemMechanics(
    variant.magic.mechanics,
    nodes,
    edges,
    ids,
  );
  for (const procId of procIds) {
    edges.push({ from: variantId, to: procId, relation: "roots" });
  }
  traceItemDestruction(variant.magic.destruction, variantId, nodes, edges, ids);
}

function traceWeaponUnit(weapon: WeaponRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "weapon_root",
    label: `weapon_root\n${weapon.name}\n(${weapon.category}, ${weapon.usage})`,
  });

  const damageId = ids("dmg");
  nodes.push({
    id: damageId,
    category: "effect",
    atomKind: "weapon_damage",
    label: `weapon_damage\n${describeWeaponDamage(weapon.damage)}`,
  });
  edges.push({ from: rootId, to: damageId, relation: "defines" });

  for (const property of weapon.properties ?? []) {
    const propertyId = ids("prop");
    nodes.push({
      id: propertyId,
      category: "source",
      atomKind: "weapon_property",
      label: `weapon_property\n${describeWeaponProperty(property)}`,
    });
    edges.push({ from: rootId, to: propertyId, relation: "defines" });
  }

  const masteryId = ids("mast");
  nodes.push({
    id: masteryId,
    category: "source",
    atomKind: "weapon_mastery",
    label: `weapon_mastery\n${weapon.mastery}`,
  });
  edges.push({ from: rootId, to: masteryId, relation: "defines" });

  return traceFromNodes(weapon, nodes, edges);
}

function traceWeaponTemplateUnit(weapon: WeaponTemplateRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "weapon_template_root",
    label: `weapon_template_root\n${weapon.name}\n${describeWeaponApplicability(weapon.weaponApplicability)}`,
  });
  if (weapon.ammunitionQuantity !== undefined) {
    const qtyId = ids("qty");
    nodes.push({
      id: qtyId,
      category: "source",
      atomKind: "ammunition_quantity",
      label: `ammunition_quantity\n${weapon.ammunitionQuantity.counts.join(" or ")} pieces\n${weapon.ammunitionQuantity.valueEquivalence.count} = ${weapon.ammunitionQuantity.valueEquivalence.item}`,
    });
    edges.push({ from: rootId, to: qtyId, relation: "defines" });
  }
  for (const variant of weapon.variants) {
    traceMagicEquipmentVariant(rootId, variant, nodes, edges, ids);
  }
  return traceFromNodes(weapon, nodes, edges);
}

function describeWeaponApplicability(
  applicability: WeaponTemplateRecord["weaponApplicability"],
): string {
  switch (applicability.kind) {
    case "any_weapon":
      return `(${applicability.categories.join(", ")})`;
    case "any_melee_weapon":
      return "(any melee weapon)";
    case "ammunition":
      return "(ammunition)";
    default: {
      const _exhaustive: never = applicability;
      throw new Error(`unhandled weapon applicability: ${String(_exhaustive)}`);
    }
  }
}

function traceDonDoff(
  rootId: string,
  label: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const id = ids("equip");
  nodes.push({
    id,
    category: "procedure",
    atomKind: "don_doff",
    label: `don_doff\n${label}`,
  });
  edges.push({ from: rootId, to: id, relation: "uses" });
}

function describeArmorAcFormula(formula: ArmorAcFormula): string {
  switch (formula.kind) {
    case "light_dex":
      return `${formula.base} + DEX mod`;
    case "medium_dex_max_2":
      return `${formula.base} + DEX mod (max 2)`;
    case "heavy_fixed":
      return `${formula.ac}`;
    default: {
      const _exhaustive: never = formula;
      throw new Error(`unhandled armor AC formula: ${String(_exhaustive)}`);
    }
  }
}

function describeWeaponDamage(damage: WeaponDamage): string {
  switch (damage.kind) {
    case "dice":
      return `${damage.dice}d${damage.dieSize} ${damage.damageType}`;
    case "flat":
      return `${damage.amount} ${damage.damageType}`;
    default: {
      const _exhaustive: never = damage;
      throw new Error(`unhandled weapon damage: ${String(_exhaustive)}`);
    }
  }
}

function describeWeaponProperty(property: WeaponPropertyDetail): string {
  switch (property.kind) {
    case "ammunition":
      return `ammunition (${property.range.normal}/${property.range.long}; ${property.ammunition})`;
    case "finesse":
    case "heavy":
    case "light":
    case "loading":
    case "reach":
      return property.kind;
    case "two_handed":
      return property.unless === undefined
        ? property.kind
        : `${property.kind} unless ${property.unless}`;
    case "thrown":
      return `thrown (${property.range.normal}/${property.range.long})`;
    case "versatile":
      return `versatile (${describeWeaponDamage(property.damage)})`;
    default: {
      const _exhaustive: never = property;
      throw new Error(`unhandled weapon property: ${String(_exhaustive)}`);
    }
  }
}

function traceFromNodes(
  unit:
    | ArmorRecord
    | ArmorTemplateRecord
    | BackgroundRecord
    | ClassRecord
    | ShieldRecord
    | ShieldTemplateRecord
    | SpeciesRecord
    | WeaponTemplateRecord
    | WeaponRecord,
  nodes: ReadonlyArray<TraceNode>,
  edges: ReadonlyArray<TraceEdge>,
): Trace {
  return {
    unitId: unit.id,
    unitName: unit.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

// ============================================================
// Character-creation aggregate tracers
// ============================================================

function traceClassUnit(unit: ClassRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "class_root",
    label: `class_root\n${unit.name}\nhit die d${unit.hitPointDie}`,
  });

  const primaryAbilityId = ids("primary_ability");
  nodes.push({
    id: primaryAbilityId,
    category: "source",
    atomKind: "class_primary_abilities",
    label: `class_primary_abilities\n${formatPrimaryAbilityExpression(unit.primaryAbilities)}`,
  });
  edges.push({ from: rootId, to: primaryAbilityId, relation: "grants" });

  const savesId = ids("save");
  nodes.push({
    id: savesId,
    category: "source",
    atomKind: "class_saving_throw_proficiencies",
    label: `class_saving_throw_proficiencies\n${unit.savingThrowProficiencies.join(", ")}`,
  });
  edges.push({ from: rootId, to: savesId, relation: "grants" });

  const weaponId = ids("weapon");
  nodes.push({
    id: weaponId,
    category: "source",
    atomKind: "class_weapon_proficiencies",
    label: `class_weapon_proficiencies\n${unit.weaponProficiencies
      .map(describeClassWeaponProficiency)
      .join(", ")}`,
  });
  edges.push({ from: rootId, to: weaponId, relation: "grants" });

  const toolId = ids("tool");
  nodes.push({
    id: toolId,
    category: "source",
    atomKind: "class_tool_proficiencies",
    label: `class_tool_proficiencies\n${describeToolProficiencyGrant(
      unit.toolProficiencies,
    )}`,
  });
  edges.push({ from: rootId, to: toolId, relation: "grants" });

  const armorId = ids("armor");
  nodes.push({
    id: armorId,
    category: "source",
    atomKind: "class_armor_training",
    label: `class_armor_training\n${
      unit.armorTraining.kind === "trained"
        ? unit.armorTraining.categories.join(", ")
        : "none"
    }`,
  });
  edges.push({ from: rootId, to: armorId, relation: "grants" });

  const skillId = ids("skill");
  nodes.push({
    id: skillId,
    category: "hole",
    atomKind: "class_skill_proficiency_choice",
    label: `class_skill_proficiency_choice\nchoose ${unit.skillProficiencyChoice.choose}\n${unit.skillProficiencyChoice.options.join(", ")}`,
  });
  edges.push({ from: rootId, to: skillId, relation: "opens" });

  for (const grant of unit.featureGrants) {
    const grantId = ids("grant");
    nodes.push({
      id: grantId,
      category: "source",
      atomKind: "class_feature_grant",
      label: `class_feature_grant\nlevel ${grant.level}\n${grant.unitId}`,
    });
    edges.push({ from: rootId, to: grantId, relation: "grants" });
  }

  for (const choice of unit.subclassChoices) {
    const choiceId = ids("subclass");
    nodes.push({
      id: choiceId,
      category: "hole",
      atomKind: "subclass_choice",
      label: `subclass_choice\nlevel ${choice.level}\n${choice.options.join(", ")}`,
    });
    edges.push({ from: rootId, to: choiceId, relation: "opens" });
  }

  traceStartingEquipment(rootId, unit.startingEquipment, nodes, edges, ids);

  return traceFromNodes(unit, nodes, edges);
}

function formatPrimaryAbilityExpression(
  primaryAbilities: PrimaryAbilityExpression,
): string {
  if (primaryAbilities.kind === "all_of") {
    return primaryAbilities.abilities.join(" and ");
  }

  if (primaryAbilities.kind === "any_of") {
    return primaryAbilities.abilities.join(" or ");
  }

  const exhaustive: never = primaryAbilities;
  throw new Error(`Unhandled primary ability expression: ${exhaustive}`);
}

function traceSubclassUnit(
  unit: Extract<UnitRecord, { kind: "subclass" }>,
): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();
  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "subclass_root",
    label: `subclass_root\n${unit.name}\n${unit.className}`,
  });

  for (const grant of unit.featureGrants) {
    const grantId = ids("grant");
    nodes.push({
      id: grantId,
      category: "source",
      atomKind: "subclass_feature_grant",
      label: `subclass_feature_grant\nlevel ${grant.level}\n${grant.unitId}`,
    });
    edges.push({ from: rootId, to: grantId, relation: "grants" });
  }

  return {
    unitId: unit.id,
    unitName: unit.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

function traceBackgroundUnit(unit: BackgroundRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "background_root",
    label: `background_root\n${unit.name}\n${unit.abilityScoreIncrease.abilities.join(", ")}`,
  });

  const featId = ids("feat");
  nodes.push({
    id: featId,
    category: "source",
    atomKind: "background_origin_feat",
    label: `background_origin_feat\n${unit.originFeatId}`,
  });
  edges.push({ from: rootId, to: featId, relation: "grants" });

  traceStartingEquipment(rootId, unit.startingEquipment, nodes, edges, ids);

  return traceFromNodes(unit, nodes, edges);
}

function traceSpeciesUnit(unit: SpeciesRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "species_root",
    label: `species_root\n${unit.name}\n${unit.creatureType}, ${unit.size.size}, ${unit.speed.walkFeet} ft.`,
  });

  for (const traitId of Object.values(unit.traits)) {
    const traitNodeId = ids("trait");
    nodes.push({
      id: traitNodeId,
      category: "source",
      atomKind: "species_trait_grant",
      label: `species_trait_grant\n${traitId}`,
    });
    edges.push({ from: rootId, to: traitNodeId, relation: "grants" });
  }

  return traceFromNodes(unit, nodes, edges);
}

function traceStartingEquipment(
  rootId: string,
  choices: readonly StartingEquipmentChoice[],
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  for (const choice of choices) {
    const nodeId = ids("equipment");
    nodes.push({
      id: nodeId,
      category: "hole",
      atomKind: "starting_equipment_choice",
      label:
        choice.kind === "coin_grant"
          ? `starting_equipment_choice\n${choice.id}: ${choice.coinsGp} GP`
          : `starting_equipment_choice\n${choice.id}: ${choice.items.map(describeStartingEquipmentItem).join(", ")}`,
    });
    edges.push({ from: rootId, to: nodeId, relation: "offers" });
  }
}

function describeStartingEquipmentItem(item: StartingEquipmentItemRef): string {
  switch (item.kind) {
    case "unit_ref":
      return item.quantity === undefined
        ? item.unitId
        : `${item.quantity} ${item.unitId}`;
    case "selected_tool_proficiency":
      return "selected tool proficiency";
    case "draft_owned_item":
      return item.quantity === undefined
        ? item.itemName
        : `${item.quantity} ${item.itemName}`;
    default: {
      const _exhaustive: never = item;
      throw new Error(
        `unhandled starting equipment item: ${String(_exhaustive)}`,
      );
    }
  }
}

// ============================================================
// Class-feature tracer
// ============================================================

function traceClassFeatureUnit(feat: ClassFeatureRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "class_feature_root",
    label: `class_feature_root\n${feat.name}\n(${feat.className}, L${feat.acquiredAtLevel})`,
  });

  const procedureIds = traceClassFeatureMechanics(
    feat.mechanics,
    nodes,
    edges,
    ids,
  );
  for (const procedureId of procedureIds) {
    edges.push({ from: rootId, to: procedureId, relation: "roots" });
  }

  return {
    unitId: feat.id,
    unitName: feat.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

// Shared dispatch for families that can be either passive or activated —
// used by FeatRecord and SpeciesTraitRecord.
function tracePassiveOrActivated(
  m: PassiveMechanics | ActivatedAbilityMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  switch (m.family) {
    case "passive":
      return tracePassiveMechanics(m, nodes, edges, ids);
    case "activation":
      return traceActivatedAbility(m, nodes, edges, ids);
    default: {
      const _exhaustive: never = m;
      throw new Error(
        `unhandled mechanics family: ${String((_exhaustive as { family: string }).family)}`,
      );
    }
  }
}

function traceTriggeredReplacementMechanics(
  m: TriggeredReplacementMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const triggerId = ids("trig");
  nodes.push({
    id: triggerId,
    category: "window",
    atomKind: "triggered_replacement_window",
    label: `triggered_replacement_window\n${m.trigger.kind}`,
  });

  const effectId = ids("eff");
  nodes.push({
    id: effectId,
    category: "effect",
    atomKind: m.effect.kind,
    label:
      m.effect.kind === "prevent_drop_to_0_hp"
        ? `${m.effect.kind}\nreplacement HP ${m.effect.replacementHp}`
        : m.effect.kind,
  });
  edges.push({ from: triggerId, to: effectId, relation: "replaces_with" });

  const resetId = ids("reset");
  nodes.push({
    id: resetId,
    category: "resource",
    atomKind: "reset_cadence",
    label: `reset_cadence\n${m.resetCadence.kind}`,
  });
  edges.push({ from: effectId, to: resetId, relation: "recovers_on" });

  return triggerId;
}

function traceMagicItemMechanics(
  m:
    | PassiveMechanics
    | ActivatedAbilityMechanics
    | TriggeredReactionAbilityMechanics
    | OnHitTriggerMechanics
    | MagicItemSpawnedCreatureMechanics
    | CompositeMagicItemMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string[] {
  switch (m.family) {
    case "passive":
    case "activation":
      return [tracePassiveOrActivated(m, nodes, edges, ids)];
    case "on_hit_trigger":
      return [traceOnHitTriggerMechanics(m, nodes, edges, ids)];
    case "spawned_creature":
      return [traceMagicItemSpawnedCreature(m, nodes, edges, ids)];
    case "triggered_reaction":
      return [traceTriggeredReactionAbility(m, nodes, edges, ids)];
    case "composite":
      return m.parts.map((part) => {
        switch (part.family) {
          case "passive":
          case "activation":
            return tracePassiveOrActivated(part, nodes, edges, ids);
          case "on_hit_trigger":
            return traceOnHitTriggerMechanics(part, nodes, edges, ids);
          case "spawned_creature":
            return traceMagicItemSpawnedCreature(part, nodes, edges, ids);
          case "triggered_reaction":
            return traceTriggeredReactionAbility(part, nodes, edges, ids);
          default: {
            const _exhaustive: never = part;
            throw new Error(
              `unhandled magic-item component family: ${String((_exhaustive as { family: string }).family)}`,
            );
          }
        }
      });
    default: {
      const _exhaustive: never = m;
      throw new Error(
        `unhandled magic-item mechanics family: ${String((_exhaustive as { family: string }).family)}`,
      );
    }
  }
}

// ============================================================
// Feat tracer
// ============================================================

function traceFeatUnit(feat: FeatRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "feat_root",
    label: `feat_root\n${feat.name}\n(${feat.category})`,
  });

  const procId =
    feat.mechanics.family === "on_hit_trigger"
      ? traceOnHitTriggerMechanics(feat.mechanics, nodes, edges, ids)
      : feat.mechanics.family === "triggered_replacement"
        ? traceTriggeredReplacementMechanics(feat.mechanics, nodes, edges, ids)
        : tracePassiveOrActivated(feat.mechanics, nodes, edges, ids);
  edges.push({ from: rootId, to: procId, relation: "roots" });

  return {
    unitId: feat.id,
    unitName: feat.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

// ============================================================
// Species-trait tracer
// ============================================================

function traceSpeciesTraitUnit(trait: SpeciesTraitRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "species_trait_root",
    label: `species_trait_root\n${trait.name}\n(${trait.species})`,
  });

  const procId =
    trait.mechanics.family === "triggered_replacement"
      ? traceTriggeredReplacementMechanics(trait.mechanics, nodes, edges, ids)
      : tracePassiveOrActivated(trait.mechanics, nodes, edges, ids);
  edges.push({ from: rootId, to: procId, relation: "roots" });

  return {
    unitId: trait.id,
    unitName: trait.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

// ============================================================
// Magic-item tracer
// ============================================================

function traceMagicItemUnit(item: MagicItemRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "magic_item_root",
    label:
      "variants" in item
        ? `magic_item_root\n${item.name}\n(${item.variants.length} variants)${describeMagicItemCollectionAttunement(item)}`
        : `magic_item_root\n${item.name}\n(${item.rarity})${describeMagicItemAttunement(item)}`,
  });

  if ("variants" in item) {
    for (const variant of item.variants) {
      traceMagicItemVariant(rootId, item, variant, nodes, edges, ids);
    }
  } else {
    traceMagicItemPayload(rootId, item, nodes, edges, ids);
  }

  return {
    unitId: item.id,
    unitName: item.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

function traceMagicItemVariant(
  parentRootId: string,
  item: Extract<
    MagicItemRecord,
    { readonly variants: ReadonlyArray<MagicItemVariant> }
  >,
  variant: MagicItemVariant,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const attunement = resolveMagicItemVariantAttunement(item, variant);
  const variantRootId = ids("root");
  nodes.push({
    id: variantRootId,
    category: "source",
    atomKind: "magic_item_root",
    label: `magic_item_root\n${variant.name}\n(${variant.rarity})${describeMagicItemPayloadAttunement(attunement)}`,
  });
  edges.push({ from: parentRootId, to: variantRootId, relation: "roots" });
  traceMagicItemPayload(
    variantRootId,
    {
      mechanics: variant.mechanics,
      destruction: variant.destruction,
      ...attunement,
    },
    nodes,
    edges,
    ids,
  );
}

function traceMagicItemPayload(
  rootId: string,
  item: {
    readonly mechanics: MagicItemMechanics;
    readonly destruction: ItemDestructionPolicy;
  } & MagicItemAttunement,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  // Attunement slot is a v4 resource atom. Only emit when required.
  if (item.requiresAttunement) {
    const slotId = ids("attun");
    nodes.push({
      id: slotId,
      category: "resource",
      atomKind: "attunement_slot",
      label: "attunement_slot",
    });
    edges.push({ from: rootId, to: slotId, relation: "consumes" });
  }

  const procIds = traceMagicItemMechanics(item.mechanics, nodes, edges, ids);
  for (const procId of procIds) {
    edges.push({ from: rootId, to: procId, relation: "roots" });
  }

  traceItemDestruction(item.destruction, rootId, nodes, edges, ids);
}

function describeMagicItemAttunement(item: MagicItemRecord): string {
  if ("variants" in item) return "";
  return describeMagicItemPayloadAttunement(item);
}

function describeMagicItemCollectionAttunement(
  item: Extract<
    MagicItemRecord,
    { readonly variants: ReadonlyArray<MagicItemVariant> }
  >,
): string {
  return describeMagicItemPayloadAttunement(item.defaultAttunement);
}

function describeMagicItemPayloadAttunement(item: {
  readonly requiresAttunement: boolean;
  readonly attunementRestriction?: MagicItemAttunementRestriction;
}): string {
  if (!item.requiresAttunement) return "";
  if (item.attunementRestriction === undefined) return " [attunement]";
  return ` [attunement: ${describeMagicItemAttunementRestriction(item.attunementRestriction)}]`;
}

function resolveMagicItemVariantAttunement(
  item: Extract<
    MagicItemRecord,
    { readonly variants: ReadonlyArray<MagicItemVariant> }
  >,
  variant: MagicItemVariant,
): MagicItemAttunement {
  return variant.attunementOverride ?? item.defaultAttunement;
}

function describeMagicItemAttunementRestriction(
  restriction: MagicItemAttunementRestriction,
): string {
  switch (restriction.kind) {
    case "spellcaster":
      return "spellcaster";
    case "class_list":
      return restriction.classes.join(", ");
    default: {
      const _exhaustive: never = restriction;
      return _exhaustive;
    }
  }
}

function describeRandomTableRoll(roll: {
  die: number;
  modifier?: number;
}): string {
  const modifier =
    roll.modifier === undefined || roll.modifier === 0
      ? ""
      : roll.modifier > 0
        ? `+${roll.modifier}`
        : `${roll.modifier}`;
  return `d${roll.die}${modifier}`;
}

function describeRandomTableOutcomeRange(outcome: {
  min: number;
  max: number;
}): string {
  return outcome.min === outcome.max
    ? `${outcome.min}`
    : `${outcome.min}-${outcome.max}`;
}

function traceItemDestruction(
  d: ItemDestructionPolicy,
  rootId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (d.kind) {
    case "none":
      return;
    case "becomes_nonmagical_on_hit": {
      const destId = ids("dest");
      nodes.push({
        id: destId,
        category: "lifecycle",
        atomKind: "item_destruction",
        label: "item_destruction\nbecomes nonmagical on hit",
      });
      edges.push({ from: rootId, to: destId, relation: "lifecycle" });
      return;
    }
    case "last_charge_roll": {
      const destId = ids("dest");
      nodes.push({
        id: destId,
        category: "lifecycle",
        atomKind: "item_destruction",
        label:
          `item_destruction\non last charge: roll d${d.die}\n` +
          `destroyed on ${d.destroyOn}`,
      });
      edges.push({ from: rootId, to: destId, relation: "lifecycle" });
      return;
    }
    case "permanent_on_empty": {
      const destId = ids("dest");
      nodes.push({
        id: destId,
        category: "lifecycle",
        atomKind: "item_destruction",
        label: "item_destruction\non pool empty (deterministic)",
      });
      edges.push({ from: rootId, to: destId, relation: "lifecycle" });
      return;
    }
    default: {
      const _: never = d;
      throw new Error(`unhandled item destruction policy: ${String(_)}`);
    }
  }
}

function traceClassFeatureMechanics(
  m: ClassFeatureMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string[] {
  switch (m.family) {
    case "activation":
      return [traceActivatedAbility(m, nodes, edges, ids)];
    case "passive":
      return [tracePassiveMechanics(m, nodes, edges, ids)];
    case "alternate_action_cost":
      return [traceAlternateActionCostMechanics(m, nodes, ids)];
    case "feature_choice":
      return [traceFeatureChoiceMechanics(m, nodes, ids)];
    case "on_hit_trigger":
      return [traceOnHitTriggerMechanics(m, nodes, edges, ids)];
    case "save_damage_replacement":
      return [traceSaveDamageReplacementMechanics(m, nodes, ids)];
    case "reaction_roll_or_damage_reduction":
      return [traceReactionRollOrDamageReductionMechanics(m, nodes, ids)];
    case "weapon_mastery_choice": {
      const masteryId = ids("mastery");
      nodes.push({
        id: masteryId,
        category: "hole",
        atomKind: "class_weapon_mastery_choice",
        label:
          `class_weapon_mastery_choice\nchoose ${m.choose}\n` +
          `${m.eligibleWeapons.join(", ")}\nchange ${m.changeOn.count} on ${m.changeOn.kind}`,
      });
      return [masteryId];
    }
    case "suborder_choice": {
      const choiceId = ids("suborder");
      nodes.push({
        id: choiceId,
        category: "procedure",
        atomKind: "suborder_choice",
        label: `suborder_choice\n${m.choiceKey}\n${m.options.map((option) => option.displayName).join(" | ")}`,
      });
      for (const option of m.options) {
        const optionId = tracePassiveMechanics(
          option.mechanics,
          nodes,
          edges,
          ids,
        );
        edges.push({ from: choiceId, to: optionId, relation: option.id });
      }
      return [choiceId];
    }
    case "class_spellcasting_projection": {
      const spellcastingId = ids("spellcasting");
      nodes.push({
        id: spellcastingId,
        category: "procedure",
        atomKind: "class_spellcasting_projection",
        label: `class_spellcasting_projection\n${m.spellcastingKind}\nsource ${m.source}`,
      });
      return [spellcastingId];
    }
    case "spellbook_ritual_access": {
      const ritualId = ids("ritual");
      nodes.push({
        id: ritualId,
        category: "procedure",
        atomKind: "spellbook_ritual_access",
        label:
          `spellbook_ritual_access\nsource ${m.source}\n` +
          `preparation ${m.preparationRequirement}`,
      });
      return [ritualId];
    }
    case "rest_spell_slot_recovery": {
      const recoveryId = ids("arcane");
      nodes.push({
        id: recoveryId,
        category: "resource",
        atomKind: "rest_spell_slot_recovery",
        label:
          `rest_spell_slot_recovery\ntrigger ${m.recoveryTrigger}\n` +
          `${m.recoveredSlotLevelCap.kind}\n` +
          `slot level < ${m.recoveredSlotLevelCap.maximumSlotLevelExclusive}\n` +
          `reset ${m.resetCadence.kind}`,
      });
      return [recoveryId];
    }
    case "failed_ability_check_resource_boost": {
      const tacticalId = ids("tactical");
      nodes.push({
        id: tacticalId,
        category: "resource",
        atomKind: "failed_ability_check_resource_boost",
        label:
          `failed_ability_check_resource_boost\n` +
          `spend ${m.spends.resourceUnitId}\n` +
          `+${m.bonus.expr.dice}d${m.bonus.expr.dieSize}`,
      });
      return [tacticalId];
    }
    case "composite":
      return m.parts.map((part) => {
        switch (part.family) {
          case "activation":
            return traceActivatedAbility(part, nodes, edges, ids);
          case "passive":
            return tracePassiveMechanics(part, nodes, edges, ids);
          case "alternate_action_cost":
            return traceAlternateActionCostMechanics(part, nodes, ids);
          case "on_hit_trigger":
            return traceOnHitTriggerMechanics(part, nodes, edges, ids);
          case "save_damage_replacement":
            return traceSaveDamageReplacementMechanics(part, nodes, ids);
          case "reaction_roll_or_damage_reduction":
            return traceReactionRollOrDamageReductionMechanics(
              part,
              nodes,
              ids,
            );
          default: {
            const _exhaustive: never = part;
            throw new Error(
              `unhandled class-feature component family: ${String((_exhaustive as { family: string }).family)}`,
            );
          }
        }
      });
    default: {
      const _exhaustive: never = m;
      throw new Error(
        `unhandled class-feature family: ${String((_exhaustive as { family: string }).family)}`,
      );
    }
  }
}

function traceFeatureChoiceMechanics(
  m: Extract<ClassFeatureMechanics, { readonly family: "feature_choice" }>,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const choiceId = ids("feature-choice");
  nodes.push({
    id: choiceId,
    category: "procedure",
    atomKind: "feature_choice",
    label:
      `feature_choice\n${m.choiceKey}\n${describeClassLevelChoiceCount(m.choiceCount)}\n` +
      `${m.optionSource.className} ${m.optionSource.optionKind}\n${describeFeatureChoiceChange(m.changeOn)}`,
  });
  return choiceId;
}

type SurfaceChoiceCount =
  | Extract<
      ClassFeatureMechanics,
      { readonly family: "feature_choice" }
    >["choiceCount"]
  | Extract<EffectAtom, { readonly kind: "grant_expertise" }>["choiceCount"];

function describeClassLevelChoiceCount(
  choiceCount: SurfaceChoiceCount,
): string {
  switch (choiceCount.kind) {
    case "class_level_additional_choices":
      return (
        `choose ${choiceCount.initial} at acquisition; ` +
        choiceCount.increases
          .map((increase) => `L${increase.atLevel}: +${increase.choose}`)
          .join(", ")
      );
    case "class_level_total_choices":
      return `choose by class level: ${choiceCount.levels
        .map((level) => `L${level.atLevel}: ${level.total}`)
        .join(", ")}`;
    default: {
      const _exhaustive: never = choiceCount;
      return _exhaustive;
    }
  }
}

function describeFeatureChoiceChange(
  changeOn: Extract<
    ClassFeatureMechanics,
    { readonly family: "feature_choice" }
  >["changeOn"],
): string {
  switch (changeOn.kind) {
    case "never":
      return "no replacement";
    case "class_level":
      return `change ${changeOn.count} on class_level`;
    default: {
      const _exhaustive: never = changeOn;
      return _exhaustive;
    }
  }
}

function traceAlternateActionCostMechanics(
  m: Extract<
    ClassFeatureMechanics,
    { readonly family: "alternate_action_cost" }
  >,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const alternateCostId = ids("alternate-cost");
  nodes.push({
    id: alternateCostId,
    category: "procedure",
    atomKind: "alternate_action_cost",
    label: `alternate_action_cost\n${m.from.actions.join(", ")}\nas ${m.to.kind}`,
  });
  return alternateCostId;
}

function traceSaveDamageReplacementMechanics(
  m: Extract<
    ClassFeatureMechanics,
    { readonly family: "save_damage_replacement" }
  >,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const replacementId = ids("save-damage-replacement");
  nodes.push({
    id: replacementId,
    category: "resolution",
    atomKind: "save_damage_replacement",
    label:
      `save_damage_replacement\n${m.trigger.ability} save\n` +
      `success ${m.replacement.onSuccess}\nfail ${m.replacement.onFail}`,
  });
  return replacementId;
}

function traceReactionRollOrDamageReductionMechanics(
  m: Extract<
    ClassFeatureMechanics,
    { readonly family: "reaction_roll_or_damage_reduction" }
  >,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const modifierId = ids("reaction-roll-or-damage-reduction");
  nodes.push({
    id: modifierId,
    category: "resolution",
    atomKind: "reaction_roll_or_damage_reduction",
    label: `reaction_roll_or_damage_reduction\n${m.modifiers.length} modifier(s)`,
  });
  return modifierId;
}

// Passive family — "grants" edge from a passive_grant procedure node to
// each carried EffectAtom. Works across class_feature / species_trait /
// feat / magic_item.
function tracePassiveMechanics(
  m: PassiveMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const procId = ids("pass");
  nodes.push({
    id: procId,
    category: "procedure",
    atomKind: "grant",
    label: `grant (passive)\n${m.grants.length} effect(s)`,
  });
  if (m.condition !== undefined && m.condition.kind !== "always") {
    for (const predId of traceEquipmentPredicate(m.condition, nodes, ids)) {
      edges.push({ from: procId, to: predId, relation: "requires" });
    }
  }
  for (const suppressor of m.suppressedBy ?? []) {
    const suppressId = tracePassiveSuppressor(suppressor, nodes, ids);
    edges.push({ from: suppressId, to: procId, relation: "suppresses" });
  }
  for (const atom of m.grants) {
    const effId = traceEffectAtom(atom, nodes, ids, edges);
    if (effId !== null) {
      edges.push({ from: procId, to: effId, relation: "grants" });
    }
  }
  for (const operation of m.operations ?? []) {
    tracePassiveOperation(operation, procId, nodes, edges, ids);
  }
  return procId;
}

function tracePassiveOperation(
  operation: PassiveOperation,
  procId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const winId = ids("win");
  nodes.push({
    id: winId,
    category: "window",
    atomKind: "duration_window",
    label: describePassiveOperationWindow(operation),
  });
  edges.push({ from: procId, to: winId, relation: "opens_window" });

  const effId = traceEffectAtom(operation.effect, nodes, ids, edges);
  if (effId !== null) {
    edges.push({ from: winId, to: effId, relation: "grants" });
  }
}

function tracePassiveSuppressor(
  suppressor: PassiveSuppressor,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const id = ids("supp");
  nodes.push({
    id,
    category: "procedure",
    atomKind: "suppress",
    label: `suppress\nwhile ${describeConditionList(suppressor.conditions)} active`,
  });
  return id;
}

function describePassiveOperationWindow(operation: PassiveOperation): string {
  const predicate =
    operation.predicate === undefined
      ? ""
      : `\nif ${describeOngoingPredicate(operation.predicate)}`;
  const unitLabel =
    operation.trigger.amount === 1
      ? operation.trigger.unit
      : `${operation.trigger.unit}s`;
  return (
    `duration_window\nevery ${operation.trigger.amount} ${unitLabel}` +
    predicate
  );
}

function describeContainerStorage(
  storage: Extract<
    EffectAtom,
    { readonly kind: "container_storage" }
  >["storage"],
): string {
  const lines = [
    "container_storage",
    `capacity: ${storage.maxWeightPounds} lb / ${storage.maxVolumeCubicFeet} cu ft`,
  ];
  if (storage.weightOverridePounds !== undefined) {
    lines.push(`carry weight: ${storage.weightOverridePounds} lb`);
  }
  if (storage.airSupply !== undefined) {
    lines.push(`air: ${storage.airSupply.sharedMinutes} min shared`);
  }
  if (storage.extradimensional === true) {
    lines.push("extradimensional");
  }
  return lines.join("\n");
}

function traceEquipmentPredicate(
  p: Exclude<EquipmentPredicate, { kind: "always" }>,
  nodes: TraceNode[],
  ids: IdGen,
): string[] {
  switch (p.kind) {
    case "holding_item": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "holding_item",
        label: "holding_item",
      });
      return [id];
    }
    case "peering_through_item": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "peering_through_item",
        label: "peering_through_item",
      });
      return [id];
    }
    case "wearing_item": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "wearing_item",
        label: "wearing_item",
      });
      return [id];
    }
    case "unarmored": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "unarmored",
        label: "unarmored",
      });
      return [id];
    }
    case "wearing_armor": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "wearing_armor",
        label: `wearing_armor\n[${p.categories.join(", ")}]`,
      });
      return [id];
    }
    case "not_wearing_armor": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "not_wearing_armor",
        label: `not_wearing_armor\n[${p.categories.join(", ")}]`,
      });
      return [id];
    }
    case "wielding_weapon": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "wielding_weapon",
        label: `wielding_weapon\n${p.weaponKind}`,
      });
      return [id];
    }
    case "unarmed_or_monk_weapons_only": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "unarmed_or_monk_weapons_only",
        label: "unarmed_or_monk_weapons_only",
      });
      return [id];
    }
    case "all_of":
      return p.predicates.flatMap((predicate) =>
        traceEquipmentPredicate(predicate, nodes, ids),
      );
    case "not_wielding_shield": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "not_wielding_shield",
        label: "not_wielding_shield",
      });
      return [id];
    }
    default: {
      const _exhaustive: never = p;
      throw new Error(
        `unhandled equipment predicate ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}

function traceActivatedAbility(
  m: ActivatedAbilityMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const procId = ids("act");
  nodes.push({
    id: procId,
    category: "procedure",
    atomKind: "activate",
    label: "activate",
  });

  if (m.condition !== undefined && m.condition.kind !== "always") {
    for (const predId of traceEquipmentPredicate(m.condition, nodes, ids)) {
      edges.push({ from: procId, to: predId, relation: "requires" });
    }
  }

  // Activation cost. `free` emits nothing — no quota consumed.
  traceActivationCost(m.activationCost, procId, nodes, edges, ids);

  // Resource consumption + reset cadence.
  if (m.resource !== undefined && m.resetCadence !== undefined) {
    const resId = traceActivationResource(m.resource, nodes, edges, ids);
    edges.push({ from: procId, to: resId, relation: "consumes" });
    traceResetCadence(m.resetCadence, resId, nodes, edges, ids);
  }

  traceUsageLimit(m.usageLimit, procId, "consumes", nodes, edges, ids);

  // Phases — iterate in sequence, threading branches_on_completion
  // edges like spell activations.
  const ctx: SpellCtx = {
    procId,
    slotId: null,
    range: m.range ?? { kind: "self" },
  };
  let previousResolutionId: string | null = null;
  m.phases.forEach((phase, idx) => {
    const thisResolutionId = tracePhase(phase, idx + 1, ctx, nodes, edges, ids);
    if (previousResolutionId !== null) {
      edges.push({
        from: previousResolutionId,
        to: thisResolutionId,
        relation: "branches_on_completion",
      });
    }
    previousResolutionId = thisResolutionId;
  });

  return procId;
}

function traceTriggeredReactionAbility(
  m: TriggeredReactionAbilityMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const procId = ids("rsp");
  nodes.push({
    id: procId,
    category: "procedure",
    atomKind: "respond",
    label: "respond",
  });

  if (m.condition !== undefined && m.condition.kind !== "always") {
    for (const predId of traceEquipmentPredicate(m.condition, nodes, ids)) {
      edges.push({ from: procId, to: predId, relation: "requires" });
    }
  }

  traceActivationCost(m.activationCost, procId, nodes, edges, ids);

  const resId = traceActivationResource(m.resource, nodes, edges, ids);
  edges.push({ from: procId, to: resId, relation: "consumes" });
  traceResetCadence(m.resetCadence, resId, nodes, edges, ids);

  traceUsageLimit(m.usageLimit, procId, "consumes", nodes, edges, ids);

  if (m.duration !== undefined) {
    traceDuration(m.duration, procId, nodes, edges, ids);
  }

  const prepId = ids("prep");
  nodes.push({
    id: prepId,
    category: "procedure",
    atomKind: "prepare",
    label: "prepare",
  });
  edges.push({ from: procId, to: prepId, relation: "prepares" });

  const promptId = ids("prompt");
  nodes.push({
    id: promptId,
    category: "procedure",
    atomKind: "prompt",
    label: "prompt",
  });
  edges.push({ from: prepId, to: promptId, relation: "prompts" });

  const commitId = ids("commit");
  nodes.push({
    id: commitId,
    category: "procedure",
    atomKind: "commit",
    label: "commit",
  });
  edges.push({ from: promptId, to: commitId, relation: "commits" });

  if (m.interruptsTrigger) {
    const intId = ids("int");
    nodes.push({
      id: intId,
      category: "resolution",
      atomKind: "interrupt_resolution",
      label: "interrupt_resolution",
    });
    edges.push({ from: commitId, to: intId, relation: "grants" });
  }

  const ctx: SpellCtx = {
    procId: commitId,
    slotId: null,
    range: m.range,
  };
  let previousResolutionId: string | null = null;
  m.phases.forEach((phase, idx) => {
    const thisResolutionId = tracePhase(phase, idx + 1, ctx, nodes, edges, ids);
    if (previousResolutionId !== null) {
      edges.push({
        from: previousResolutionId,
        to: thisResolutionId,
        relation: "branches_on_completion",
      });
    }
    previousResolutionId = thisResolutionId;
  });

  return procId;
}

function traceMagicItemSpawnedCreature(
  m: MagicItemSpawnedCreatureMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const procId = ids("act");
  nodes.push({
    id: procId,
    category: "procedure",
    atomKind: "activate",
    label: "activate",
  });

  if (m.condition !== undefined && m.condition.kind !== "always") {
    for (const predId of traceEquipmentPredicate(m.condition, nodes, ids)) {
      edges.push({ from: procId, to: predId, relation: "requires" });
    }
  }

  traceActivationCost(m.activationCost, procId, nodes, edges, ids);

  const resId = traceActivationResource(m.resource, nodes, edges, ids);
  edges.push({ from: procId, to: resId, relation: "consumes" });
  traceResetCadence(m.resetCadence, resId, nodes, edges, ids);

  traceUsageLimit(m.usageLimit, procId, "consumes", nodes, edges, ids);

  if (m.duration !== undefined) {
    traceDuration(m.duration, procId, nodes, edges, ids);
  }

  const ctx: SpellCtx = { procId, slotId: null, range: m.range };
  traceSpawnedCreature(m, ctx, nodes, edges, ids);
  return procId;
}

function traceActivationCost(
  c: ClassFeatureActivationCost,
  procId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (c.kind) {
    case "free":
      // no quota consumed — feature is free on owner's turn
      return;
    case "standard_action": {
      const id = ids("q");
      nodes.push({
        id,
        category: "resource",
        atomKind: "action_quota",
        label: `action_quota\n(Activation: ${describeStandardActionCost(c.action)})`,
      });
      edges.push({ from: procId, to: id, relation: "consumes" });
      return;
    }
    case "action_plus_bonus_action": {
      const actionId = ids("q");
      nodes.push({
        id: actionId,
        category: "resource",
        atomKind: "action_quota",
        label: "action_quota\n(Activation: Action step)",
      });
      edges.push({ from: procId, to: actionId, relation: "consumes" });

      const bonusId = ids("q");
      nodes.push({
        id: bonusId,
        category: "resource",
        atomKind: "bonus_action_quota",
        label: "bonus_action_quota\n(Activation: Bonus Action step)",
      });
      edges.push({ from: procId, to: bonusId, relation: "consumes" });
      return;
    }
    case "bonus_action": {
      const id = ids("q");
      const activation =
        c.action === undefined
          ? "Bonus Action"
          : `Bonus Action: ${describeStandardActionCost(c.action)}`;
      nodes.push({
        id,
        category: "resource",
        atomKind: "bonus_action_quota",
        label: `bonus_action_quota\n(Activation: ${activation})`,
      });
      edges.push({ from: procId, to: id, relation: "consumes" });
      return;
    }
    case "reaction": {
      const id = ids("q");
      nodes.push({
        id,
        category: "resource",
        atomKind: "reaction_quota",
        label: "reaction_quota\n(Activation: Reaction)",
      });
      edges.push({ from: procId, to: id, relation: "consumes" });
      if (c.trigger !== undefined) {
        const winId = ids("win");
        nodes.push({
          id: winId,
          category: "window",
          atomKind: "reaction_window",
          label: `reaction_window\ntrigger: ${describeReactionTrigger(c.trigger)}`,
        });
        edges.push({ from: procId, to: winId, relation: "opens_window" });
      }
      return;
    }
    case "study": {
      const id = ids("study");
      const dayLabel = c.withinDays === 1 ? "day" : "days";
      nodes.push({
        id,
        category: "window",
        atomKind: "duration_window",
        label:
          `duration_window\nstudy ${formatElapsedHours(c.hours)}\n` +
          `within ${c.withinDays} ${dayLabel}`,
      });
      edges.push({ from: procId, to: id, relation: "requires" });
      return;
    }
    case "replace_attack": {
      const id = ids("q");
      nodes.push({
        id,
        category: "resource",
        atomKind: "attack_slot",
        label: "attack_slot\n(Activation: replaces one attack)",
      });
      edges.push({ from: procId, to: id, relation: "consumes" });
      return;
    }
    default: {
      const _exhaustive: never = c;
      throw new Error(`unhandled activation cost: ${String(_exhaustive)}`);
    }
  }
}

function describeStandardActionCost(action: StandardActionKind): string {
  return `${capitalizeWords(action.replaceAll("_", " "))} action`;
}

function traceActivationResource(
  r: ActivationResource,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const atomKind = r.kind === "use_count" ? "use_count" : "charge";
  const id = ids(r.kind === "use_count" ? "use" : "pool");
  const capLabel = describeUseCountCap(r.cap);
  const initialLabel =
    r.kind === "charge_pool" && r.initialCount !== undefined
      ? `\ninitial ${describeDiceAmount(r.initialCount)}`
      : "";
  const lifetimeAbsorptionLabel =
    r.kind === "charge_pool" && r.lifetimeAbsorptionCap !== undefined
      ? `\nlifetime absorb <= ${r.lifetimeAbsorptionCap}`
      : "";
  nodes.push({
    id,
    category: "resource",
    atomKind,
    label: `${atomKind}\n${capLabel}${initialLabel}${lifetimeAbsorptionLabel}`,
  });
  // If the cap scales by level, emit a scaling node that modifies the pool/counter.
  if (r.cap.kind === "threshold_tiers") {
    const scId = ids("sc");
    const tierText = r.cap.tiers
      .map((t) => `L${t.atLevel}:${t.value}`)
      .join(" | ");
    nodes.push({
      id: scId,
      category: "scaling",
      atomKind: "scale_numeric_bonus",
      label: `scale_numeric_bonus\naxis=${r.cap.axis}\ntiers: ${tierText}`,
    });
    edges.push({ from: scId, to: id, relation: "modifies" });
  } else if (r.cap.kind === "linear_per_level") {
    const scId = ids("sc");
    const starts = r.cap.startingAtLevel;
    nodes.push({
      id: scId,
      category: "scaling",
      atomKind: "scale_numeric_bonus",
      label:
        `scale_numeric_bonus\naxis=${r.cap.axis}\n` +
        `${r.cap.base} + ${r.cap.perLevel}/level above L${starts}`,
    });
    edges.push({ from: scId, to: id, relation: "modifies" });
  }
  return id;
}

function describeUseCountCap(cap: UseCountResource["cap"]): string {
  switch (cap.kind) {
    case "fixed":
      return `max ${cap.uses}`;
    case "threshold_tiers":
      return (
        `tiered(axis=${cap.axis}): ` +
        cap.tiers.map((t) => `L${t.atLevel}:${t.value}`).join(", ")
      );
    case "linear_per_level": {
      const starts = cap.startingAtLevel;
      return (
        `linear(axis=${cap.axis}): ` +
        `${cap.base} + ${cap.perLevel} per level above L${starts}`
      );
    }
    case "proficiency_bonus":
      return "max = proficiency bonus";
    case "ability_modifier":
      return `max = ${cap.ability.toUpperCase()} modifier${cap.minimum === undefined ? "" : ` (minimum ${cap.minimum})`}`;
    case "unlimited":
      return "unlimited";
    default: {
      const _: never = cap;
      throw new Error(`unhandled use count cap: ${String(_)}`);
    }
  }
}

function describeProficiencyGrant(grant: ProficiencyGrant): string {
  switch (grant.kind) {
    case "none":
      return "none";
    case "fixed":
      return grant.proficiencies
        .map(describeProficiencyGrantSubject)
        .join(", ");
    case "choice":
      return `choose ${grant.count}: ${grant.options
        .map(describeProficiencyGrantSubject)
        .join(", ")}`;
    case "mixed":
      return [
        grant.fixed.map(describeProficiencyGrantSubject).join(", "),
        `choose ${grant.choice.count}: ${grant.choice.options
          .map(describeProficiencyGrantSubject)
          .join(", ")}`,
      ].join("; ");
    case "mixed_choices":
      return [
        grant.fixed.map(describeProficiencyGrantSubject).join(", "),
        ...grant.choices.map(
          (choice) =>
            `choose ${choice.count} (${choice.choiceKey}): ${choice.options
              .map(describeProficiencyGrantSubject)
              .join(", ")}`,
        ),
      ].join("; ");
    default: {
      const _exhaustive: never = grant;
      return _exhaustive;
    }
  }
}

function describeToolProficiencyGrant(grant: ToolProficiencyGrant): string {
  switch (grant.kind) {
    case "none":
      return "none";
    case "fixed":
      return grant.proficiencies
        .map(describeToolProficiencyGrantSubject)
        .join(", ");
    case "choice":
      return `choose ${grant.count}: ${grant.options
        .map(describeToolProficiencyGrantSubject)
        .join(", ")}`;
    default: {
      const _exhaustive: never = grant;
      return _exhaustive;
    }
  }
}

function describeClassWeaponProficiency(
  proficiency: WeaponProficiency,
): string {
  switch (proficiency.kind) {
    case "weapon_category":
      return `${proficiency.category} weapons`;
    case "weapon_category_with_properties":
      return `${proficiency.category} weapons with ${proficiency.anyOfProperties.join(
        " or ",
      )}`;
    default: {
      const _exhaustive: never = proficiency;
      return _exhaustive;
    }
  }
}

function describeProficiencyGrantSubject(
  subject: ProficiencyGrantSubject,
): string {
  switch (subject.kind) {
    case "skill":
      return `${subject.skill} skill`;
    case "weapon_category":
      return `${subject.category} weapons`;
    case "armor_category":
      return `${subject.category} armor`;
    case "tool":
      return `${subject.toolId} tool`;
    case "tool_category":
      return `${subject.category} tools`;
    default: {
      const _exhaustive: never = subject;
      return _exhaustive;
    }
  }
}

function describeToolProficiencyGrantSubject(
  subject: ToolProficiencyGrantSubject,
): string {
  switch (subject.kind) {
    case "tool":
      return `${subject.toolId} tool`;
    case "tool_category":
      return `${subject.category} tool`;
    default: {
      const _exhaustive: never = subject;
      return _exhaustive;
    }
  }
}

function traceResetCadence(
  c: ResetCadence,
  resId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  // Emit rest_window nodes labeled with whether each rest refills fully
  // or partially. "partial_short_full_long" is the Second Wind pattern:
  // short rest restores shortRestRefill uses; long rest restores all.
  // `dawn` is the magic-item idiom — emitted as a `duration_window`
  // since it is not a SRD Rest.
  type RestEntry = { kind: "short" | "long"; refillLabel: string };
  let rests: ReadonlyArray<RestEntry> = [];
  switch (c.kind) {
    case "short_or_long_rest":
      rests = [
        { kind: "short", refillLabel: "refill all" },
        { kind: "long", refillLabel: "refill all" },
      ];
      break;
    case "short_rest":
      rests = [{ kind: "short", refillLabel: "refill all" }];
      break;
    case "long_rest":
      rests = [{ kind: "long", refillLabel: "refill all" }];
      break;
    case "partial_short_full_long":
      rests = [
        { kind: "short", refillLabel: `refill ${c.shortRestRefill}` },
        { kind: "long", refillLabel: "refill all" },
      ];
      break;
    case "dawn": {
      const did = ids("dawn");
      const refill =
        c.regain == null
          ? "refill all"
          : `refill ${describeDiceAmount(c.regain)}`;
      nodes.push({
        id: did,
        category: "window",
        atomKind: "duration_window",
        label: `duration_window\ndaily at dawn (${refill})`,
      });
      edges.push({ from: resId, to: did, relation: "persists_until" });
      return;
    }
    case "century": {
      const cid = ids("century");
      nodes.push({
        id: cid,
        category: "window",
        atomKind: "duration_window",
        label: "duration_window\ncentury cooldown (refill all)\nafter spend",
      });
      edges.push({ from: resId, to: cid, relation: "persists_until" });
      return;
    }
    case "elapsed_days": {
      const did = ids("days");
      const refill =
        c.regain == null
          ? "refill all"
          : `refill ${describeDiceAmount(c.regain)}`;
      const trigger =
        c.startsWhen === "resource_empty" ? "after pool empty" : "after spend";
      nodes.push({
        id: did,
        category: "window",
        atomKind: "duration_window",
        label:
          `duration_window\n${c.days} day cooldown (${refill})\n` +
          `${trigger}`,
      });
      edges.push({ from: resId, to: did, relation: "persists_until" });
      return;
    }
    case "elapsed_hours": {
      const hid = ids("hours");
      const refill =
        c.regain == null
          ? "refill all"
          : `refill ${describeDiceAmount(c.regain)}`;
      nodes.push({
        id: hid,
        category: "window",
        atomKind: "duration_window",
        label: `duration_window\n${formatElapsedHours(c.hours)} cooldown (${refill})`,
      });
      edges.push({ from: resId, to: hid, relation: "persists_until" });
      return;
    }
    case "never": {
      // Pool never refills. No rest/window node — the resource is
      // exhausted permanently once depleted. Pair with
      // ItemDestructionPolicy.permanent_on_empty for item lifecycle.
      return;
    }
    default: {
      const _: never = c;
      throw new Error(`unhandled reset cadence: ${String(_)}`);
    }
  }
  for (const r of rests) {
    const rid = ids("rest");
    nodes.push({
      id: rid,
      category: "window",
      atomKind: "rest_window",
      label: `rest_window\n${r.kind} (${r.refillLabel})`,
    });
    edges.push({ from: resId, to: rid, relation: "persists_until" });
  }
}

function traceActionRestriction(
  r: ActionRestriction,
  targetId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (r.kind) {
    case "none":
      return;
    case "exclude": {
      const rid = ids("rst");
      nodes.push({
        id: rid,
        category: "effect",
        atomKind: "restrict_action_set",
        label: `restrict_action_set\nexclude: ${r.actions.join(", ")}`,
      });
      edges.push({ from: rid, to: targetId, relation: "modifies" });
      return;
    }
    default: {
      const _exhaustive: never = r;
      throw new Error(`unhandled action restriction: ${String(_exhaustive)}`);
    }
  }
}

// ============================================================
// Mastery tracer
// ============================================================

function traceMasteryUnit(mastery: MasteryRecord): Trace {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const ids = idGen();

  const rootId = ids("root");
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "mastery_root",
    label: `mastery_root\n${mastery.name}`,
  });

  const resolutionId = traceOnHitTriggerMechanics(
    mastery.mechanics,
    nodes,
    edges,
    ids,
  );
  edges.push({ from: rootId, to: resolutionId, relation: "roots" });

  return {
    unitId: mastery.id,
    unitName: mastery.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
}

function traceOnHitTriggerMechanics(
  m: OnHitTriggerMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  // Subgraph G — On-Hit Rider. The source roots an attack_roll resolution;
  // that resolution opens an on_hit_window which grants the rider effect.
  const resId = ids("res");
  nodes.push({
    id: resId,
    category: "resolution",
    atomKind: "attack_roll",
    label: `attack_roll\n${describeOnHitTrigger(m.trigger)}`,
  });

  const winId = ids("win");
  nodes.push({
    id: winId,
    category: "window",
    atomKind: "on_hit_window",
    label: m.optional ? "on_hit_window\n(wielder choice)" : "on_hit_window",
  });
  edges.push({ from: resId, to: winId, relation: "opens_window" });

  const targetId = ids("att");
  nodes.push({
    id: targetId,
    category: "attachment",
    atomKind: "target",
    label: "target\n(primary)",
  });
  edges.push({ from: resId, to: targetId, relation: "attaches_to" });

  traceOnHitRiderEffect(m.effect, winId, targetId, nodes, edges, ids);

  const fenceId = traceUsageLimit(
    "usageLimit" in m ? m.usageLimit : undefined,
    winId,
    "consumes",
    nodes,
    edges,
    ids,
  );
  if (fenceId !== null) {
    const turnId = ids("turn");
    nodes.push({
      id: turnId,
      category: "window",
      atomKind: "turn_start_window",
      label: "turn_start_window\n(wielder)",
    });
    edges.push({ from: fenceId, to: turnId, relation: "persists_until" });
  }

  return resId;
}

function describeOnHitTrigger(t: OnHitTriggerMechanics["trigger"]): string {
  switch (t.kind) {
    case "weapon_hit":
      return "(any weapon hit)";
    case "weapon_hit_melee_only":
      return "(melee weapon hit only)";
    case "weapon_hit_with_damage":
      return "(weapon hit with damage)";
    case "hit_with_attack_roll":
      return `(hit with attack roll, ${t.weaponFilter}, ${t.eligibility})`;
    default: {
      const _: never = t;
      throw new Error(`unhandled on-hit trigger: ${String(_)}`);
    }
  }
}

function traceOnHitRiderEffect(
  e: OnHitRiderEffect,
  winId: string,
  targetId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (e.kind) {
    case "modify_roll_advantage": {
      const effId = ids("eff");
      nodes.push({
        id: effId,
        category: "effect",
        atomKind: "modify_roll_advantage",
        label: `modify_roll_advantage\n${e.mode} on ${e.on.join(", ")} ×${e.count}`,
      });
      edges.push({ from: winId, to: effId, relation: "grants" });
      edges.push({ from: effId, to: targetId, relation: "attaches_to" });
      traceRiderExpiry(e.expiresOn, effId, nodes, edges, ids);
      return;
    }
    case "save_gate": {
      const effId = ids("sg");
      nodes.push({
        id: effId,
        category: "resolution",
        atomKind: "save_gate",
        label: `save_gate\n${e.ability.toUpperCase()} save\nDC: ${describeDc(e.dc)}`,
      });
      edges.push({ from: winId, to: effId, relation: "grants" });
      edges.push({ from: effId, to: targetId, relation: "attaches_to" });
      traceSaveGateResult(
        e.onFail,
        effId,
        targetId,
        "on fail",
        nodes,
        edges,
        ids,
      );
      traceSaveGateResult(
        e.onSuccess,
        effId,
        targetId,
        "on success",
        nodes,
        edges,
        ids,
      );
      return;
    }
    case "grant_weapon_attack": {
      // Cleave — nested attack_roll against a secondary target.
      const secondaryAttId = ids("att");
      nodes.push({
        id: secondaryAttId,
        category: "attachment",
        atomKind: "target",
        label: `target\n(secondary: ${e.secondaryTarget.constraint})`,
      });
      const nestedResId = ids("res");
      nodes.push({
        id: nestedResId,
        category: "resolution",
        atomKind: "attack_roll",
        label: `attack_roll\n(nested, ${e.attackKind.replaceAll("_", " ")})`,
      });
      edges.push({ from: winId, to: nestedResId, relation: "grants" });
      edges.push({
        from: nestedResId,
        to: secondaryAttId,
        relation: "attaches_to",
      });

      const dmgId = ids("dmg");
      nodes.push({
        id: dmgId,
        category: "effect",
        atomKind: "damage",
        label: `damage: weapon damage\nability modifier: ${e.onHit.abilityModifier}`,
      });
      edges.push({ from: nestedResId, to: dmgId, relation: "grants" });
      edges.push({ from: dmgId, to: secondaryAttId, relation: "attaches_to" });
      return;
    }
    case "reroll_weapon_damage_dice": {
      const rerollId = ids("rr");
      nodes.push({
        id: rerollId,
        category: "effect",
        atomKind: "reroll_weapon_damage_dice",
        label: `reroll_weapon_damage_dice\nscope=${e.diceScope}\nchoose=${e.choose}`,
      });
      edges.push({ from: winId, to: rerollId, relation: "grants" });
      edges.push({ from: rerollId, to: targetId, relation: "attaches_to" });
      return;
    }
    case "add_attack_damage_dice": {
      const damageId = ids("dmg");
      nodes.push({
        id: damageId,
        category: "effect",
        atomKind: "damage",
        label:
          `add_attack_damage_dice\n` +
          `class level table d${e.dice.dieSize}\n` +
          `type ${e.damageType}`,
      });
      edges.push({ from: winId, to: damageId, relation: "grants" });
      edges.push({ from: damageId, to: targetId, relation: "attaches_to" });
      return;
    }
    default: {
      const _: never = e;
      throw new Error(`unhandled on-hit rider effect: ${String(_)}`);
    }
  }
}

function describeDc(d: DcSource): string {
  switch (d.kind) {
    case "caster_spell_save_dc":
      return "caster spell save DC";
    case "fixed":
      return `fixed DC ${d.dc}`;
    case "weapon_attack_dc":
      return `${d.base} + ability mod + PB (weapon attack)`;
    case "innate_dc":
      return `${d.base} + ${d.ability.toUpperCase()} mod + PB`;
    default: {
      const _: never = d;
      throw new Error(`unhandled dc source: ${String(_)}`);
    }
  }
}

function traceSaveGateResult(
  r: SaveGateRiderResult,
  saveId: string,
  targetId: string,
  branchLabel: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (r.kind) {
    case "none":
      return;
    case "apply_condition": {
      const eId = ids("cond");
      nodes.push({
        id: eId,
        category: "effect",
        atomKind: "apply_condition",
        label: `apply_condition\n${r.condition} (${branchLabel})`,
      });
      edges.push({ from: saveId, to: eId, relation: "branches_on_save" });
      edges.push({ from: eId, to: targetId, relation: "attaches_to" });
      return;
    }
    default: {
      const _: never = r;
      throw new Error(`unhandled save gate result: ${String(_)}`);
    }
  }
}

function traceRiderExpiry(
  x: RiderExpiry,
  effId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const winId = ids("win");
  switch (x.kind) {
    case "target_uses_or_turn_start":
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_start_window",
        label: "turn_start_window\n(attacker, OR target uses rolled-on)",
      });
      break;
    case "end_of_next_turn":
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_end_window",
        label: "turn_end_window\n(attacker's next turn)",
      });
      break;
    case "caster_turn_start":
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_start_window",
        label: "turn_start_window\n(caster's next turn)",
      });
      break;
    default: {
      const _: never = x;
      throw new Error(`unhandled rider expiry: ${String(_)}`);
    }
  }
  edges.push({ from: effId, to: winId, relation: "persists_until" });
}

// ============================================================
// Shared helpers
// ============================================================

type IdGen = (prefix: string) => string;

function idGen(): IdGen {
  let n = 0;
  return (prefix: string) => `${prefix}${++n}`;
}

function describeScaling(
  s: number | SlotScaling<number> | ThresholdTiers<number>,
): string {
  if (typeof s === "number") return `${s} (fixed)`;
  if (s.kind === "threshold_tiers") {
    const tiers = s.tiers
      .map((tier) => `${tier.value} @ ${s.axis} ${tier.atLevel}`)
      .join(", ");
    return `${s.base} base; ${tiers}`;
  }
  return `${s.base} + ${s.perSlotAboveBase} per slot above ${s.baseLevel}`;
}

// §A14: grant_speed.feet may link to another speed stat instead of a
// fixed distance. Spider Climb: Climb Speed equal to walk Speed.
function describeLinkedSpeed(l: LinkedSpeed): string {
  switch (l.kind) {
    case "walk_speed":
      return "= walk speed";
    default: {
      const _exhaustive: never = l.kind;
      throw new Error(`unhandled linked speed: ${String(_exhaustive)}`);
    }
  }
}

function describeRange(r: Range): string {
  switch (r.kind) {
    case "self":
      return "Self";
    case "touch":
      return "Touch";
    case "point":
      return `${r.feet} ft`;
    default: {
      const _exhaustive: never = r;
      throw new Error(`unhandled range: ${String(_exhaustive)}`);
    }
  }
}

function describeDurationValue(d: {
  readonly unit: string;
  readonly amount: number;
  readonly upcastTiers?: ReadonlyArray<{
    readonly atSlot: number;
    readonly amount: number;
  }>;
}): string {
  const duration = timeSpanDuration(d);
  const base = Either.isRight(duration)
    ? formatTimeSpanDuration(duration.right)
    : `${d.amount} ${d.unit}${d.amount === 1 ? "" : "s"}`;
  if (d.upcastTiers === undefined || d.upcastTiers.length === 0) return base;
  const tiers = d.upcastTiers
    .map(
      (t) =>
        `${t.amount} ${d.unit}${t.amount === 1 ? "" : "s"} @ slot ≥ ${t.atSlot}`,
    )
    .join(", ");
  return `${base}\nupcast: ${tiers}`;
}

function formatElapsedHours(hours: number): string {
  const ticks = elapsedTimeTicksFromHours(hours);
  return Either.isRight(ticks)
    ? formatElapsedTimeTicks(ticks.right)
    : `${hours} hour${hours === 1 ? "" : "s"}`;
}

function describeConditionChoice(
  c:
    | string
    | ReadonlyArray<string>
    | { readonly kind: "choose"; readonly from: ReadonlyArray<string> },
): string {
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return `${c.join(", ")} (all)`;
  const choose = c as { kind: "choose"; from: ReadonlyArray<string> };
  return `${choose.from.join(" OR ")} (caster choice)`;
}

function describeConditionList(conditions: ReadonlyArray<string>): string {
  return conditions.length === 1 ? conditions[0] : `[${conditions.join(", ")}]`;
}

function describeOngoingPredicate(
  p: import("../surface/types.ts").OngoingPredicate,
): string {
  switch (p.kind) {
    case "at_hp_threshold":
      switch (p.comparison) {
        case "lte":
          return `HP <= ${p.threshold}`;
        case "eq":
          return `HP = ${p.threshold}`;
        case "gte":
          return `HP >= ${p.threshold}`;
        default: {
          const _exhaustive: never = p.comparison;
          throw new Error(`unhandled HP comparison: ${String(_exhaustive)}`);
        }
      }
    case "has_condition":
      return `has condition: ${p.condition}`;
    default: {
      const _exhaustive: never = p;
      throw new Error(`unhandled ongoing predicate: ${String(_exhaustive)}`);
    }
  }
}

function describeEarlyEnd(
  triggers: ReadonlyArray<DurationEndTrigger> | undefined,
): string {
  if (triggers === undefined || triggers.length === 0) return "";
  const names = triggers.map((t) => t.kind).join(", ");
  return `\nor early on: ${names}`;
}

function describeSpellAccessMode(m: SpellAccessMode): string {
  if (typeof m === "string") {
    switch (m) {
      case "prepared_once_per_long_rest":
        return "prepared + 1/long rest free cast";
      case "known_once_per_long_rest":
        return "known + 1/long rest free cast";
      default:
        return m;
    }
  }
  switch (m.kind) {
    case "charge_cast": {
      const chargesAt = (k: number): number =>
        m.baseCharges + m.perLevelCharges * (k - m.minLevel);
      if (m.minLevel === m.maxLevel) {
        const n = chargesAt(m.minLevel);
        const label = n === 1 ? "1 charge" : `${n} charges`;
        return `charge_cast L${m.minLevel}, ${label} per cast`;
      }
      const lo = chargesAt(m.minLevel);
      const hi = chargesAt(m.maxLevel);
      return (
        `charge_cast L${m.minLevel}–L${m.maxLevel}, ` +
        `${lo}–${hi} charges (${m.baseCharges} + ${m.perLevelCharges}/level)`
      );
    }
    default: {
      const _exhaustive: never = m.kind;
      throw new Error(`unhandled spell access mode: ${String(_exhaustive)}`);
    }
  }
}

function describeGrantedSpellTargetRestriction(
  restriction: GrantedSpellTargetRestriction | undefined,
): string {
  if (restriction === undefined) return "";
  switch (restriction.kind) {
    case "self_only":
      return "\ntarget: self only";
    case "visible_target_within_feet":
      return `\ntarget: visible target within ${restriction.feet} ft of ${restriction.origin === "caster" ? "caster" : "spell sensor"}`;
    default: {
      const _exhaustive: never = restriction;
      return _exhaustive;
    }
  }
}

function describeGrantedSpellDurationOverride(
  durationOverride: GrantedSpellDurationOverride | undefined,
): string {
  if (durationOverride === undefined) return "";
  const lines: string[] = [];
  if (durationOverride.removeConcentration === true) {
    lines.push("duration override: no concentration");
  }
  if (durationOverride.endsWhenGrantedSpellEnds !== undefined) {
    lines.push(
      `duration override: ends when ${durationOverride.endsWhenGrantedSpellEnds} ends`,
    );
  }
  return lines.length === 0 ? "" : `\n${lines.join("\n")}`;
}

function describeGrantedSpellDcOverride(
  dcOverride: DcSource | undefined,
): string {
  return dcOverride === undefined
    ? ""
    : `\nDC override: ${describeDc(dcOverride)}`;
}

function describeGrantedSpellAreaOverride(
  areaOverride: AreaShapeSpec | undefined,
): string {
  return areaOverride === undefined
    ? ""
    : `\narea override: ${describeAreaShape(areaOverride)}`;
}

function describeWeaponFilter(f: WeaponFilter | undefined): string {
  if (!f) return "";
  switch (f.kind) {
    case "source_item":
      return " [source item only]";
    case "weapon_category":
      return ` [${f.category} weapons only]`;
    case "weapon_property":
      return ` [${f.property} weapons only]`;
    case "specific_item":
      return ` [item only: ${f.itemId}]`;
    default: {
      const _exhaustive: never = f;
      return _exhaustive;
    }
  }
}

function describeSkillFilter(f: SkillFilter | undefined): string {
  if (!f) return "";
  switch (f.kind) {
    case "fixed":
      return ` [${f.skills.join(", ")} only]`;
    case "choice":
      return ` [choice: ${f.options.join(", ")}]`;
    default: {
      const _exhaustive: never = f;
      return _exhaustive;
    }
  }
}

function describeResistanceSourceFilter(
  f: ResistanceSourceFilter | undefined,
): string {
  if (!f) return "";
  const magicality = f.magicality === undefined ? "" : `, ${f.magicality} only`;
  const weapon = describeWeaponFilter(f.weaponFilter);
  return `\nfrom: attacks${weapon}${magicality}`;
}

function describeSavingThrowSourceFilter(
  f: SavingThrowSourceFilter | undefined,
): string {
  if (!f) return "";
  return "\nsource: spells or other magical effects";
}

function describeCriticalRangeAttackFilter(
  filter: "weapon_or_unarmed_strike",
): string {
  return filter === "weapon_or_unarmed_strike"
    ? "weapons and Unarmed Strikes"
    : (filter satisfies never);
}

function describeDelta(d: DiceDelta): string {
  switch (d.kind) {
    case "fixed_number":
      return `${d.sign}${d.amount}`;
    case "fixed_dice":
      // dieSize=1 collapses to a flat bonus (N × 1 = N).
      if (d.dieSize === 1) return `${d.sign}${d.dice}`;
      return `${d.sign}${d.dice}d${d.dieSize}`;
    case "proficiency_bonus":
      return d.scale === "half" ? `${d.sign}½ PB` : `${d.sign}PB`;
    case "ability_modifier":
      return `${d.sign}${d.ability.toUpperCase()} mod${d.minimum === undefined ? "" : ` (min ${d.minimum})`}`;
    case "threshold_tiers":
      return `${d.sign}${d.base} (${d.axis} tiers ${d.tiers
        .map((t) => `L${t.atLevel}:${t.value}`)
        .join(", ")})`;
    case "magic_item_rarity_bonus":
      return `${d.sign}bonus by item rarity (${Object.entries(d.byRarity)
        .map(([rarity, bonus]) => `${rarity}=${bonus}`)
        .join(", ")})`;
    default: {
      const _exhaustive: never = d;
      return _exhaustive;
    }
  }
}

function describeSignedNumber(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function capitalizeWords(value: string): string {
  return value.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function describeAbilityScoreBounds(
  minimum: number | undefined,
  maximum: number | undefined,
): string {
  return describeNumericBounds(minimum, maximum);
}

function describeNumericBounds(
  minimum: number | undefined,
  maximum: number | undefined,
): string {
  const parts: string[] = [];
  if (minimum !== undefined) parts.push(`min ${minimum}`);
  if (maximum !== undefined) parts.push(`max ${maximum}`);
  return parts.length === 0 ? "" : `\n${parts.join(", ")}`;
}

function describeDiceAmount(a: DiceAmount): string {
  switch (a.kind) {
    case "fixed":
      return describeExpr(a.expr);
    case "threshold_tiers":
      return `${describeExpr(a.base)} (tiered by ${a.axis} level)`;
    case "linear_per_level":
      return `${describeExpr(a.base)} (linear per ${a.axis} level)`;
    case "resource_spent":
      return "= charges spent (player choice)";
    case "proficiency_bonus":
      return "= proficiency bonus";
    case "resource_spent_linear": {
      const maxText =
        a.maximum === undefined ? "" : `, max ${describeExpr(a.maximum)}`;
      return (
        `${describeExpr(a.base)} + ` +
        `${describeDelta_(a.perResource, a.base)} per resource spent${maxText}`
      );
    }
    case "linked": {
      const scale = a.link.scale === "half" ? "half " : "";
      const source =
        a.link.kind === "damage_taken" ? "damage taken" : "damage dealt";
      return `= ${scale}${source}`;
    }
    default: {
      const _exhaustive: never = a;
      throw new Error(`unhandled dice amount: ${String(_exhaustive)}`);
    }
  }
}

function describeExpr(e: DiceExpr): string {
  const hasDice = e.dice > 0;
  const flat =
    e.flat !== undefined && e.flat !== 0
      ? hasDice
        ? `+${e.flat}`
        : `${e.flat}`
      : "";
  const modLabel =
    e.spellcastingMod === true
      ? "spellcasting mod"
      : e.abilityModifier !== undefined
        ? `${e.abilityModifier.toUpperCase()} mod`
        : "";
  const mod =
    modLabel === "" ? "" : hasDice || flat ? `+${modLabel}` : modLabel;
  const diceStr = hasDice ? `${e.dice}d${e.dieSize}` : "";
  return `${diceStr}${flat}${mod}` || "0";
}

// §C4b — reanimated_creature payload family (Animate Dead, Create
// Undead). Spawns a `companion` attachment via catalog reference +
// one `create_companion` per slot-option, plus `command_companion`
// for the Bonus Action mental command.
function traceReanimatedCreature(
  m: ReanimatedCreatureMechanics,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const compId = ids("cmp");
  const nightTag = m.nightOnly === true ? "\n(night only)" : "";
  nodes.push({
    id: compId,
    category: "attachment",
    atomKind: "companion",
    label: `companion\ntarget: ${m.targetKind}\nrange ${describeRange(ctx.range)}${nightTag}`,
  });
  edges.push({ from: ctx.procId, to: compId, relation: "attaches_to" });

  // One `choose` node per slot-level tier, enumerating monster-id +
  // count options. The caster picks one entry per cast; the caller
  // resolves monsterId against the external catalog.
  for (const entry of m.menu) {
    const chzId = ids("chz");
    const opts = entry.options
      .map((o) => `${o.count}× ${o.monsterId}`)
      .join(" | ");
    nodes.push({
      id: chzId,
      category: "procedure",
      atomKind: "choose",
      label: `choose [slot ${entry.slotLevel}]\n${opts}`,
    });
    edges.push({ from: ctx.procId, to: chzId, relation: "prompts" });
    edges.push({ from: chzId, to: compId, relation: "modifies" });
  }

  const createId = ids("eff");
  nodes.push({
    id: createId,
    category: "effect",
    atomKind: "create_companion",
    label: `create_companion\n(catalog-ref, slot-tier menu)`,
  });
  edges.push({ from: ctx.procId, to: createId, relation: "grants" });
  edges.push({ from: createId, to: compId, relation: "attaches_to" });

  const cmdId = ids("eff");
  nodes.push({
    id: cmdId,
    category: "effect",
    atomKind: "command_companion",
    label: `command_companion\ncost: ${describeCommandCost(m.control)}\n${describeCommandRange(m.control)}\nreassert within ${formatElapsedHours(m.reassertWindow.hours)} (up to ${m.reassertWindow.maxReassertPerCast})`,
  });
  edges.push({ from: ctx.procId, to: cmdId, relation: "grants" });
  edges.push({ from: cmdId, to: compId, relation: "attaches_to" });
}

// §C4c — templated_multi_spawn (Animate Objects). Emits one
// `companion` attachment + per-size `choose` nodes + a single
// create_companion + command_companion with capacity annotation.
function traceTemplatedMultiSpawn(
  m: TemplatedMultiSpawnMechanics,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const compId = ids("cmp");
  nodes.push({
    id: compId,
    category: "attachment",
    atomKind: "companion",
    label: `companion\n${m.baseStatBlock.displayName}\nrange ${describeRange(ctx.range)}`,
  });
  edges.push({ from: ctx.procId, to: compId, relation: "attaches_to" });

  const capId = ids("chz");
  const tiers = m.sizeTiers.map((t) => `${t.size}(w=${t.weight})`).join(" | ");
  nodes.push({
    id: capId,
    category: "procedure",
    atomKind: "choose",
    label: `choose (capacity = ${m.capacity.ability.toUpperCase()} mod)\n${tiers}`,
  });
  edges.push({ from: ctx.procId, to: capId, relation: "prompts" });
  edges.push({ from: capId, to: compId, relation: "modifies" });

  const createId = ids("eff");
  nodes.push({
    id: createId,
    category: "effect",
    atomKind: "create_companion",
    label: `create_companion\n${m.baseStatBlock.displayName} (size-tiered)`,
  });
  edges.push({ from: ctx.procId, to: createId, relation: "grants" });
  edges.push({ from: createId, to: compId, relation: "attaches_to" });

  const cmdId = ids("eff");
  nodes.push({
    id: cmdId,
    category: "effect",
    atomKind: "command_companion",
    label: `command_companion\ncost: ${describeCommandCost(m.control)}\n${describeCommandRange(m.control)}`,
  });
  edges.push({ from: ctx.procId, to: cmdId, relation: "grants" });
  edges.push({ from: cmdId, to: compId, relation: "attaches_to" });
}
