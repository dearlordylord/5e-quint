import type {
  CreatureActions,
  CreatureControl,
  CreatureNamedActionOption,
  CreatureNamedAttackRoll,
  CreatureNamedMultiattack,
  CreatureNamedSaveGate,
  CreatureNamedSupport,
  CreatureStatBlock,
  SpawnedCreaturePayload,
  SpawnedCreatureStatBlock,
  StatBlockValue,
} from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  describeAreaShapeFixed,
  describeDc,
  describeRange,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";
import type { SpellCtx } from "./tracer-spell-context.ts";

import { traceEffectAtom } from "./tracer-effect-atom.ts";

import { traceSaveBranch } from "./tracer-activation.ts";
import { traceEffectAtomScaling } from "./tracer-effect-scaling.ts";

export type CreatureActionsKind = "action" | "bonus_action" | "reaction";

export type CreatureCtx = {
  readonly procId: string;
  readonly compId: string;
  readonly slotId: string | null;
  readonly kind: CreatureActionsKind;
  readonly nodes: TraceNode[];
  readonly edges: TraceEdge[];
  readonly ids: IdGen;
};

export function traceSpawnedCreature(
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

  if (m.control !== undefined) {
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

export function traceCreatureActions(
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

export function maTag(count: StatBlockValue | undefined): string {
  return count !== undefined
    ? `\nmultiattack ×${describeStatBlockValue(count)}`
    : "";
}

export function traceCreatureAttack(
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
  traceCreatureAttackWindow(
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

function traceCreatureAttackWindow(
  effects: CreatureNamedAttackRoll["onHit"],
  windowAtom: "on_hit_window",
  attackRollId: string,
  attId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const effectEntries: {
    readonly effect: CreatureNamedAttackRoll["onHit"][number];
    readonly effectId: string;
  }[] = [];
  for (const effect of effects) {
    if (effect.kind === "apply_condition_if_target_size_at_most") {
      const effectId = ids("eff");
      nodes.push({
        id: effectId,
        category: "effect",
        atomKind: "apply_condition_if_target_size_at_most",
        label: `apply_condition_if_target_size_at_most\n${effect.condition}\ntarget size <= ${effect.maxCreatureSize}`,
      });
      effectEntries.push({ effect, effectId });
      continue;
    }
    const effectId = traceEffectAtom(effect, nodes, ids, edges);
    if (effectId !== null) {
      effectEntries.push({ effect, effectId });
    }
  }
  if (effectEntries.length === 0) return;

  const windowId = ids("win");
  nodes.push({
    id: windowId,
    category: "window",
    atomKind: windowAtom,
    label: windowAtom,
  });
  edges.push({ from: attackRollId, to: windowId, relation: "opens_window" });
  for (const { effect, effectId } of effectEntries) {
    edges.push({ from: windowId, to: effectId, relation: "grants" });
    edges.push({ from: effectId, to: attId, relation: "attaches_to" });
    if (effect.kind !== "apply_condition_if_target_size_at_most") {
      traceEffectAtomScaling(effect, effectId, slotId, nodes, edges, ids);
    }
  }
}

export function traceCreatureSaveGate(
  ctx: CreatureCtx,
  sg: CreatureNamedSaveGate,
  idx: number,
): void {
  const resId = ctx.ids("res");
  const targetLabel =
    "area" in sg
      ? `area: ${describeAreaShapeFixed(sg.area)}`
      : `target: one creature within ${sg.target.rangeFeet} ft.`;
  ctx.nodes.push({
    id: resId,
    category: "resolution",
    atomKind: "save_gate",
    label: `save_gate [${ctx.kind} ${idx}: ${sg.name}]\n${sg.ability.toUpperCase()} save\nDC: ${describeDc(sg.dc)}\n${targetLabel}${maTag(sg.multiattackCount)}`,
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

export function traceCreatureSupport(
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

export function traceCreatureActionOption(
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

export function traceMultiattack(
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

export function describeCommandCost(c: CreatureControl): string {
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

export function describeCommandRange(c: CreatureControl): string {
  return c.commandRangeFeet === undefined
    ? "range unspecified"
    : `range ${c.commandRangeFeet} ft`;
}

export function describeStatBlockValue(v: StatBlockValue): string {
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

export function describeCreatureStatBlock(sb: CreatureStatBlock): string {
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

export function describeSpawnedCreatureStatBlock(
  creature: SpawnedCreatureStatBlock,
): string {
  switch (creature.kind) {
    case "inline":
      return describeCreatureStatBlock(creature.statBlock);
    case "catalog_ref":
      return `${creature.displayName} / catalog_ref(${creature.monsterId})`;
    case "familiar_form_catalog":
      return `familiar forms / ${creature.normalForms
        .map((form) => `${form.displayName}:${form.statBlockId}`)
        .join(", ")} / ${creature.additionalNormalFormEligibility.kind}`;
    default: {
      const _exhaustive: never = creature;
      return _exhaustive;
    }
  }
}

export function describeSpawnedCreatureDisplayName(
  creature: SpawnedCreatureStatBlock,
): string {
  switch (creature.kind) {
    case "inline":
      return creature.statBlock.displayName;
    case "catalog_ref":
      return creature.displayName;
    case "familiar_form_catalog":
      return "Familiar";
    default: {
      const _exhaustive: never = creature;
      return _exhaustive;
    }
  }
}
