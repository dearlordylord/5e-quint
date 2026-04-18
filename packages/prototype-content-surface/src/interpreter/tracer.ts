// Tracer — interpreter over the authored unit ADT. Emits a dependency
// graph of atoms + typed relations; does not call the combat runtime.

import type {
  UnitRecord,
  SpellRecord,
  ClassFeatureRecord,
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
  EffectAtom,
  OngoingOperation,
  DiceAmount,
  DiceExpr,
  DiceExprDelta,
  DiceDelta,
  LinkedSpeed,
  WeaponFilter,
  TargetSelection,
  SlotScaling,
  SpellLevel,
  StandardActionKind,
  ClassFeatureMechanics,
  ActivatedAbilityMechanics,
  PassiveMechanics,
  CompositeMagicItemMechanics,
  EquipmentPredicate,
  FeatRecord,
  SpeciesTraitRecord,
  MagicItemRecord,
  ClassFeatureActivationCost,
  ActivationResource,
  UseCountResource,
  RestResetCadence,
  ActionRestriction,
  TriggeredReactionMechanics,
  ReactionTrigger,
  MarkTransfer,
  MasteryMechanics,
  MasteryTrigger,
  MasteryEffect,
  RiderExpiry,
  DcSource,
  AnchoredTriggerMechanics,
  AnchorTarget,
  AnchoredEvent,
  AnchoredFilter,
  AnchoredSignal,
  AreaOrigin,
  AreaShapeDescriptor,
  AreaShapeSpec,
  DamageTypeRef,
  ItemDestructionPolicy,
  SpellAccessMode,
  SaveGateRiderResult,
  SpawnedCreatureMechanics,
  CreatureStatBlock,
  CreatureActions,
  CreatureNamedAttackRoll,
  CreatureNamedSaveGate,
  CreatureNamedSupport,
  CreatureNamedMultiattack,
  CreatureControl,
  StatBlockValue,
  ReanimatedCreatureMechanics,
  TemplatedMultiSpawnMechanics,
  GrantedSpellTargetRestriction,
} from "../surface/types.ts";

export type AtomCategory =
  | "source"
  | "procedure"
  | "window"
  | "attachment"
  | "resolution"
  | "lifecycle"
  | "resource"
  | "scaling"
  | "effect";

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
    case "class_feature":
      return traceClassFeatureUnit(unit);
    case "mastery":
      return traceMasteryUnit(unit);
    case "feat":
      return traceFeatUnit(unit);
    case "species_trait":
      return traceSpeciesTraitUnit(unit);
    case "magic_item":
      return traceMagicItemUnit(unit);
    default: {
      const _exhaustive: never = unit;
      throw new Error(`unhandled unit kind: ${String(_exhaustive)}`);
    }
  }
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
    case "apply_condition": {
      const id = ids("cond");
      const label = `apply_condition\n${describeConditionChoice(e.condition)}`;
      nodes.push({
        id,
        category: "effect",
        atomKind: "apply_condition",
        label,
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
        label: `grant_resistance\n${describeDamageTypeRef(e.damageType)}`,
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
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_roll_advantage",
        label: `modify_roll_advantage\n${e.mode} on ${e.on.join(", ")}${by}`,
      });
      return id;
    }
    case "modify_crit_range": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_crit_range",
        label: `modify_crit_range\ncrits on ${e.threshold}-20${describeWeaponFilter(e.weaponFilter)}`,
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
    case "grant_feat": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_feat",
        label: `grant_feat\n${e.category}`,
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
          describeGrantedSpellTargetRestriction(e.targetRestriction),
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
        label: "negate_triggering_spell",
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
      traceDiceAmountScaling(e.amount, effectId, slotId, nodes, edges, ids);
      return;
    case "heal_hp":
    case "grant_temp_hp":
      traceDiceAmountScaling(e.amount, effectId, slotId, nodes, edges, ids);
      return;
    case "modify_max_hp":
      traceDiceAmountScaling(e.delta, effectId, slotId, nodes, edges, ids);
      return;
    case "grant_extra_action":
      traceActionRestriction(e.restriction, effectId, nodes, edges, ids);
      return;
    case "none":
    case "modify_ac":
    case "apply_condition":
    case "remove_condition":
    case "grant_resistance":
    case "modify_roll_numeric":
    case "modify_damage_numeric":
    case "modify_roll_advantage":
    case "modify_crit_range":
    case "scale_attack_count":
    case "modify_speed":
    case "force_move":
    case "block_targeting":
    case "block_travel":
    case "negate_named_effect":
    case "grant_sense":
    case "deny_opportunity_attack":
    case "grant_feat":
    case "grant_spell_access":
    case "grant_condition_immunity":
    case "grant_damage_immunity":
    case "block_max_hp_reduction":
    case "set_speed_ratio":
    case "set_ability_score":
    case "modify_ability_score":
    case "teleport":
    case "transport_exile":
    case "grant_speed":
    case "alter_item_kind":
    case "detect":
    case "set_speed":
    case "negate_triggering_spell":
    case "end_ongoing_spells":
    case "maximize_healing_received":
    case "transform_target":
    case "natural_weapons":
    case "water_breathing":
      return;
    case "composite":
      for (const child of e.effects) {
        traceEffectAtomScaling(child, effectId, slotId, nodes, edges, ids);
      }
      return;
    default: {
      const _exhaustive: never = e;
      throw new Error(`unhandled effect atom scaling: ${String(_exhaustive)}`);
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
      nodes.push({
        id,
        category: "resource",
        atomKind: "bonus_action_quota",
        label: "bonus_action_quota\n(Casting Time: Bonus Action)",
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

function describeReactionTrigger(t: ReactionTrigger): string {
  switch (t.kind) {
    case "hit_by_attack_roll":
      return `hit by attack roll${describeWeaponFilter(t.weaponFilter)}`;
    case "targeted_by_named_spell":
      return `targeted by ${t.spellId}`;
    case "creature_casts_spell":
      return `creature casts spell (${t.components.join("/")})`;
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
  traceOngoingOpEffect(
    op.effect,
    hostId,
    hostRelation,
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
    case "on_caster_turn_start": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_start_window",
        label: "turn_start_window\n(caster)",
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
    default: {
      const _: never = trigger;
      throw new Error(`unhandled ongoing trigger: ${String(_)}`);
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
    case "modify_ac_set_base": {
      const id = ids("op");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_ac",
        label: `modify_ac\nset base = ${eff.const} + ${eff.abilityMod.toUpperCase()} mod`,
      });
      edges.push({ from: hostId, to: id, relation: hostRelation });
      edges.push({ from: id, to: attId, relation: "attaches_to" });
      return;
    }
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
  m: SpawnedCreatureMechanics,
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
    label: `companion\n${describeCreatureStatBlock(m.statBlock)}\nrange ${describeRange(ctx.range)}`,
  });
  edges.push({ from: ctx.procId, to: compId, relation: "attaches_to" });

  const createId = ids("eff");
  nodes.push({
    id: createId,
    category: "effect",
    atomKind: "create_companion",
    label: `create_companion\n${m.statBlock.displayName}`,
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
    label: `command_companion\ncost: ${describeCommandCost(m.control)}\nrange ${m.control.commandRangeFeet} ft`,
  });
  edges.push({ from: ctx.procId, to: cmdId, relation: "grants" });
  edges.push({ from: cmdId, to: compId, relation: "attaches_to" });

  for (const [slot, kind] of [
    [m.statBlock.actions, "action"],
    [m.statBlock.bonusActions, "bonus_action"],
    [m.statBlock.reactions, "reaction"],
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
    default: {
      const _exhaustive: never = phase;
      throw new Error(`unhandled phase: ${String(_exhaustive)}`);
    }
  }
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
      nodes.push({
        id,
        category: "attachment",
        atomKind: "area",
        label: `area\n${describeAreaShape(a.shape)}\n${originLabel}`,
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
    default: {
      const _exhaustive: never = a;
      throw new Error(`unhandled attachment: ${String(_exhaustive)}`);
    }
  }
}

function describeDamageTypeRef(d: DamageTypeRef): string {
  if (typeof d === "string") return d;
  switch (d.kind) {
    case "choice":
      return `${d.label} (choose: ${d.options.join(" | ")})`;
    default: {
      const _: never = d.kind;
      throw new Error(`unhandled damage type ref: ${String(_)}`);
    }
  }
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

function describeAreaShape(s: AreaShapeSpec): string {
  switch (s.kind) {
    case "sphere":
      return `sphere r=${s.radiusFeet} ft`;
    case "cone":
      return `cone ${s.lengthFeet} ft`;
    case "cube":
      return `cube ${s.sideFeet} ft side`;
    case "cylinder":
      return `cylinder r=${s.radiusFeet} ft h=${s.heightFeet} ft`;
    case "emanation":
      return `emanation r=${s.radiusFeet} ft`;
    case "line":
      return `line ${s.lengthFeet} ft × ${s.widthFeet} ft`;
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
    case "cone":
      return `cone ${s.lengthFeet} ft`;
    case "cube":
      return `cube ${s.sideFeet} ft side`;
    case "cylinder":
      return `cylinder r=${s.radiusFeet} ft h=${s.heightFeet} ft`;
    case "emanation":
      return `emanation r=${s.radiusFeet} ft`;
    case "line":
      return `line ${s.lengthFeet} ft × ${s.widthFeet} ft`;
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

  const procedureId = traceClassFeatureMechanics(
    feat.mechanics,
    nodes,
    edges,
    ids,
  );
  edges.push({ from: rootId, to: procedureId, relation: "roots" });

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

function traceMagicItemMechanics(
  m: PassiveMechanics | ActivatedAbilityMechanics | CompositeMagicItemMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string[] {
  switch (m.family) {
    case "passive":
    case "activation":
      return [tracePassiveOrActivated(m, nodes, edges, ids)];
    case "composite":
      return m.parts.map((part) =>
        tracePassiveOrActivated(part, nodes, edges, ids),
      );
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

  const procId = tracePassiveOrActivated(feat.mechanics, nodes, edges, ids);
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

  const procId = tracePassiveOrActivated(trait.mechanics, nodes, edges, ids);
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
  const attun = item.requiresAttunement ? " [attunement]" : "";
  nodes.push({
    id: rootId,
    category: "source",
    atomKind: "magic_item_root",
    label: `magic_item_root\n${item.name}\n(${item.rarity})${attun}`,
  });

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

  // Item-level destruction lifecycle.
  traceItemDestruction(item.destruction, rootId, nodes, edges, ids);

  return {
    unitId: item.id,
    unitName: item.name,
    nodes,
    edges,
    atomKinds: [...new Set(nodes.map((n) => n.atomKind))].sort(),
  };
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
): string {
  switch (m.family) {
    case "activation":
      return traceActivatedAbility(m, nodes, edges, ids);
    case "passive":
      return tracePassiveMechanics(m, nodes, edges, ids);
    default: {
      const _exhaustive: never = m;
      throw new Error(
        `unhandled class-feature family: ${String((_exhaustive as { family: string }).family)}`,
      );
    }
  }
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
    const predId = traceEquipmentPredicate(m.condition, nodes, ids);
    edges.push({ from: procId, to: predId, relation: "requires" });
  }
  for (const atom of m.grants) {
    const effId = traceEffectAtom(atom, nodes, ids, edges);
    if (effId !== null) {
      edges.push({ from: procId, to: effId, relation: "grants" });
    }
  }
  return procId;
}

function traceEquipmentPredicate(
  p: Exclude<EquipmentPredicate, { kind: "always" }>,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  switch (p.kind) {
    case "wearing_armor": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "wearing_armor",
        label: `wearing_armor\n[${p.categories.join(", ")}]`,
      });
      return id;
    }
    case "wielding_weapon": {
      const id = ids("pred");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "wielding_weapon",
        label: `wielding_weapon\n${p.weaponKind}`,
      });
      return id;
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

  // Activation cost. `free` emits nothing — no quota consumed.
  traceActivationCost(m.activationCost, procId, nodes, edges, ids);

  // Resource consumption + reset cadence.
  const resId = traceActivationResource(m.resource, nodes, edges, ids);
  edges.push({ from: procId, to: resId, relation: "consumes" });
  traceResetCadence(m.resetCadence, resId, nodes, edges, ids);

  // Per-turn usage cap (Action Surge L17: once per turn).
  if (m.usageLimit?.kind === "once_per_turn") {
    const fenceId = ids("fence");
    nodes.push({
      id: fenceId,
      category: "resource",
      atomKind: "use_count",
      label: "use_count\nonce per turn",
    });
    edges.push({ from: procId, to: fenceId, relation: "consumes" });
  }

  // Phases — iterate in sequence, threading branches_on_completion
  // edges like spell activations.
  const ctx: SpellCtx = { procId, slotId: null, range: { kind: "self" } };
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
    case "action": {
      const id = ids("q");
      nodes.push({
        id,
        category: "resource",
        atomKind: "action_quota",
        label: "action_quota\n(Activation: Action)",
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
      nodes.push({
        id,
        category: "resource",
        atomKind: "bonus_action_quota",
        label: "bonus_action_quota\n(Activation: Bonus Action)",
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
  const atomKind = r.kind === "use_count" ? "use_count" : "charge_pool";
  const id = ids(r.kind === "use_count" ? "use" : "pool");
  const capLabel = describeUseCountCap(r.cap);
  nodes.push({
    id,
    category: "resource",
    atomKind,
    label: `${atomKind}\n${capLabel}`,
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
      return `max = ${cap.ability.toUpperCase()} modifier`;
    default: {
      const _: never = cap;
      throw new Error(`unhandled use count cap: ${String(_)}`);
    }
  }
}

function traceResetCadence(
  c: RestResetCadence,
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
        c.regain === null
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
    case "elapsed_days": {
      const did = ids("days");
      const refill =
        c.regain === null
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
        c.regain === null
          ? "refill all"
          : `refill ${describeDiceAmount(c.regain)}`;
      const hourLabel = c.hours === 1 ? "hour" : "hours";
      nodes.push({
        id: hid,
        category: "window",
        atomKind: "duration_window",
        label: `duration_window\n${c.hours} ${hourLabel} cooldown (${refill})`,
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

  const resolutionId = traceMasteryMechanics(
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

function traceMasteryMechanics(
  m: MasteryMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  // Subgraph G — On-Hit Rider. mastery_root roots an attack_roll
  // resolution; that resolution opens an on_hit_window which grants the
  // rider effect; the effect attaches to the primary target.
  const resId = ids("res");
  nodes.push({
    id: resId,
    category: "resolution",
    atomKind: "attack_roll",
    label: `attack_roll\n${describeMasteryTrigger(m.trigger)}`,
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

  traceMasteryEffect(m.effect, winId, targetId, nodes, edges, ids);

  if (m.usageLimit?.kind === "once_per_turn") {
    const fenceId = ids("fence");
    nodes.push({
      id: fenceId,
      category: "resource",
      atomKind: "use_count",
      label: "use_count\nonce per turn",
    });
    edges.push({ from: winId, to: fenceId, relation: "consumes" });
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

function describeMasteryTrigger(t: MasteryTrigger): string {
  switch (t.kind) {
    case "weapon_hit":
      return "(any weapon hit)";
    case "weapon_hit_melee_only":
      return "(melee weapon hit only)";
    default: {
      const _: never = t;
      throw new Error(`unhandled mastery trigger: ${String(_)}`);
    }
  }
}

function traceMasteryEffect(
  e: MasteryEffect,
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
    default: {
      const _: never = e;
      throw new Error(`unhandled mastery effect: ${String(_)}`);
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

function describeScaling(s: number | SlotScaling<number>): string {
  if (typeof s === "number") return `${s} (fixed)`;
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
  const base = `${d.amount} ${d.unit}${d.amount === 1 ? "" : "s"}`;
  if (d.upcastTiers === undefined || d.upcastTiers.length === 0) return base;
  const tiers = d.upcastTiers
    .map(
      (t) =>
        `${t.amount} ${d.unit}${t.amount === 1 ? "" : "s"} @ slot ≥ ${t.atSlot}`,
    )
    .join(", ");
  return `${base}\nupcast: ${tiers}`;
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

function describeEarlyEnd(
  triggers: ReadonlyArray<DurationEndTrigger> | undefined,
): string {
  if (triggers === undefined || triggers.length === 0) return "";
  const names = triggers.map((t) => t.kind).join(", ");
  return `\nor early on: ${names}`;
}

function describeSpellAccessMode(m: SpellAccessMode): string {
  if (typeof m === "string") return m;
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

function describeWeaponFilter(f: WeaponFilter | undefined): string {
  if (!f) return "";
  switch (f.kind) {
    case "weapon_category":
      return ` [${f.category} weapons only]`;
    case "specific_item":
      return ` [item only: ${f.itemId}]`;
    default: {
      const _exhaustive: never = f;
      return _exhaustive;
    }
  }
}

function describeDelta(d: DiceDelta): string {
  switch (d.kind) {
    case "fixed_dice":
      // dieSize=1 collapses to a flat bonus (N × 1 = N).
      if (d.dieSize === 1) return `${d.sign}${d.dice}`;
      return `${d.sign}${d.dice}d${d.dieSize}`;
    case "proficiency_bonus":
      return d.scale === "half" ? `${d.sign}½ PB` : `${d.sign}PB`;
    case "ability_modifier":
      return `${d.sign}${d.ability.toUpperCase()} mod`;
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
  const mod =
    e.spellcastingMod === true
      ? hasDice || flat
        ? "+spellcasting mod"
        : "spellcasting mod"
      : "";
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
    label: `command_companion\ncost: ${describeCommandCost(m.control)}\nrange ${m.control.commandRangeFeet} ft\nreassert within ${m.reassertWindow.hours}h (up to ${m.reassertWindow.maxReassertPerCast})`,
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
    label: `command_companion\ncost: ${describeCommandCost(m.control)}\nrange ${m.control.commandRangeFeet} ft`,
  });
  edges.push({ from: ctx.procId, to: cmdId, relation: "grants" });
  edges.push({ from: cmdId, to: compId, relation: "attaches_to" });
}
