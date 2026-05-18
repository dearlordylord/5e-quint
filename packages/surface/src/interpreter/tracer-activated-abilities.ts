import type {
  ActivatedAbilityMechanics,
  ActivationResource,
  ClassFeatureActivationCost,
  ClassFeatureMechanics,
  MagicItemSpawnedCreatureMechanics,
  ResetCadence,
  StandardActionKind,
  TriggeredReactionAbilityMechanics,
  UseCountResource,
  WeaponProficiency,
} from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  capitalizeWords,
  describeDiceAmount,
  describeReactionTrigger,
  formatElapsedHours,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

import { traceDuration } from "./tracer-duration.ts";

import { traceEquipmentPredicate } from "./tracer-equipment-predicates.ts";
import type { SpellCtx } from "./tracer-spell-context.ts";

import { traceUsageLimit } from "./tracer-effect-scaling.ts";

import { traceSpawnedCreature } from "./tracer-creature-actions.ts";

import { tracePhase } from "./tracer-activation.ts";

export function traceActivatedAbility(
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

  if (m.duration !== undefined) {
    traceDuration(m.duration, procId, nodes, edges, ids);
  }

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

export function traceTriggeredReactionAbility(
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

export function traceMagicItemSpawnedCreature(
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

export function traceActivationCost(
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

export function describeStandardActionCost(action: StandardActionKind): string {
  return `${capitalizeWords(action.replaceAll("_", " "))} action`;
}

export function traceActivationResource(
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

export function describeUseCountCap(cap: UseCountResource["cap"]): string {
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

export function describeWeaponMasteryEligibility(
  eligibility: Extract<
    ClassFeatureMechanics,
    { readonly family: "weapon_mastery_choice" }
  >["eligibleWeapons"],
): string {
  return eligibility.usage === undefined
    ? "class proficient weapons"
    : `class proficient ${eligibility.usage} weapons`;
}

export function describeClassWeaponProficiency(
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

export function traceResetCadence(
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
