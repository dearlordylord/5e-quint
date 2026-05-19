import type {
  CastingTime,
  Components,
  SpellLevel,
  SpellMechanics,
  SpellRecord,
} from "../surface/types.ts";
import type { Trace, TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  describeBonusActionTrigger,
  idGen,
  procedureForFamily,
  procedurePrefix,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

import { traceDuration } from "./tracer-duration.ts";
import type { SpellCtx } from "./tracer-spell-context.ts";
import { traceAttachment } from "./tracer-attachments.ts";

import { traceOngoingEffect } from "./tracer-spell-ongoing.ts";

import {
  traceAnchoredTrigger,
  traceTriggeredReaction,
} from "./tracer-spell-reactions-anchors.ts";

import {
  traceReanimatedCreature,
  traceTemplatedMultiSpawn,
} from "./tracer-spell-spawned-creatures.ts";

import { traceSpawnedCreature } from "./tracer-creature-actions.ts";

import { traceActivation } from "./tracer-activation.ts";

export function traceSpellUnit(spell: SpellRecord): Trace {
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

export function traceSpellMechanics(
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
  traceMaterialComponents(m.components, procId, nodes, edges, ids);

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
    case "passive_hit_intercept":
      tracePassiveHitIntercept(m, ctx, nodes, edges, ids);
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

function traceMaterialComponents(
  components: Components,
  procId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  if (components.m === false || typeof components.m === "string") return;
  switch (components.m.kind) {
    case "paired_worn_items": {
      const id = ids("mat");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "paired_worn_material_component",
        label:
          `paired_worn_material_component\n${components.m.material} ${components.m.itemKind}s` +
          `\n${components.m.minimumValueGpEach}+ GP each` +
          `\nworn by ${components.m.wornBy.join(" and ")}` +
          `\nrequired: ${components.m.requiredFor}`,
      });
      edges.push({ from: procId, to: id, relation: "requires" });
      return;
    }
    default: {
      const _exhaustive: never = components.m.kind;
      throw new Error(`unhandled material component: ${String(_exhaustive)}`);
    }
  }
}

function tracePassiveHitIntercept(
  m: Extract<SpellMechanics, { readonly family: "passive_hit_intercept" }>,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const attachmentId = traceAttachment(m.attachment, m.range, nodes, ids);
  edges.push({ from: ctx.procId, to: attachmentId, relation: "attaches" });

  const effectId = ids("eff");
  nodes.push({
    id: effectId,
    category: "effect",
    atomKind: "passive_hit_intercept",
    label: `hit intercept\n${m.duplicatePool.count} duplicates\n${m.duplicatePool.dicePerRemainingDuplicate}d${m.duplicatePool.dieSize} per duplicate, ${m.duplicatePool.successAtLeast}+`,
  });
  edges.push({ from: attachmentId, to: effectId, relation: "applies" });
}

export function traceCastingTimeQuota(
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

export function createSpellSlotNode(
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
