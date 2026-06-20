import type {
  CastingTime,
  Components,
  ModalActivationMechanics,
  SpellLevel,
  SpellMechanics,
  SpellRecord,
} from "../surface/types.ts";
import { Match } from "effect";
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
  traceGlyphWarding,
  traceMagicCircleWard,
  traceStoneMerge,
  traceAnchoredTrigger,
  traceTriggeredReaction,
} from "./tracer-spell-reactions-anchors.ts";

import {
  traceReanimatedCreature,
  traceTemplatedMultiSpawn,
} from "./tracer-spell-spawned-creatures.ts";

import { traceSpawnedCreature } from "./tracer-creature-actions.ts";

import { traceActivation } from "./tracer-activation.ts";

import { traceEffectAtom } from "./tracer-effect-atom.ts";

import { traceEffectAtomScaling } from "./tracer-effect-scaling.ts";

import { traceTargetCountScaling } from "./tracer-scaling.ts";

const byFamily = Match.discriminator("family");

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

  if (m.family !== "modal_activation") {
    const quotaId = traceCastingTimeQuota(m.castingTime, nodes, ids);
    edges.push({ from: procId, to: quotaId, relation: "consumes" });
  }

  const slotId =
    m.level === 0 ? null : createSpellSlotNode(m.level, nodes, ids);
  if (slotId !== null)
    edges.push({ from: procId, to: slotId, relation: "consumes" });

  traceDuration(m.duration, procId, nodes, edges, ids);
  traceMaterialComponents(m.components, procId, nodes, edges, ids);

  const ctx: SpellCtx = { procId, slotId, range: m.range };

  Match.value(m).pipe(
    byFamily("ongoing_effect", (mechanics) =>
      traceOngoingEffect(mechanics, ctx, nodes, edges, ids),
    ),
    byFamily("activation", (mechanics) =>
      traceActivation(mechanics, ctx, nodes, edges, ids),
    ),
    byFamily("modal_activation", (mechanics) =>
      traceModalActivation(mechanics, ctx, nodes, edges, ids),
    ),
    byFamily("triggered_reaction", (mechanics) =>
      traceTriggeredReaction(mechanics, ctx, nodes, edges, ids),
    ),
    byFamily("passive_hit_intercept", (mechanics) =>
      tracePassiveHitIntercept(mechanics, ctx, nodes, edges, ids),
    ),
    byFamily("anchored_trigger", (mechanics) =>
      traceAnchoredTrigger(mechanics, ctx, nodes, edges, ids),
    ),
    byFamily("magic_circle_ward", (mechanics) =>
      traceMagicCircleWard(mechanics, ctx, nodes, edges, ids),
    ),
    byFamily("stone_merge", (mechanics) =>
      traceStoneMerge(mechanics, ctx, nodes, edges, ids),
    ),
    byFamily("glyph_warding", (mechanics) =>
      traceGlyphWarding(mechanics, ctx, nodes, edges, ids),
    ),
    byFamily("spawned_creature", (mechanics) =>
      traceSpawnedCreature(mechanics, ctx, nodes, edges, ids),
    ),
    byFamily("reanimated_creature", (mechanics) =>
      traceReanimatedCreature(mechanics, ctx, nodes, edges, ids),
    ),
    byFamily("templated_multi_spawn", (mechanics) =>
      traceTemplatedMultiSpawn(mechanics, ctx, nodes, edges, ids),
    ),
    Match.exhaustive,
  );

  return procId;
}

function traceModalActivation(
  m: ModalActivationMechanics,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const choiceId = ids("mode");
  nodes.push({
    id: choiceId,
    category: "resolution",
    atomKind: "modal_activation_choice",
    label: `choose\n${m.mode.label}\n${m.mode.options
      .map((option) => option.displayName)
      .join(" | ")}`,
  });
  edges.push({ from: ctx.procId, to: choiceId, relation: "prompts" });

  for (const option of m.mode.options) {
    const modeId = ids("mode");
    nodes.push({
      id: modeId,
      category: "procedure",
      atomKind: "modal_activation_mode",
      label: `mode\n${option.displayName}`,
    });
    edges.push({ from: choiceId, to: modeId, relation: "branches_to" });

    const quotaId = traceCastingTimeQuota(option.castingTime, nodes, ids);
    edges.push({ from: modeId, to: quotaId, relation: "consumes" });

    const attachmentId = traceAttachment(
      option.attachment,
      ctx.range,
      nodes,
      ids,
    );
    edges.push({ from: modeId, to: attachmentId, relation: "attaches_to" });
    traceTargetCountScaling(
      option.attachment,
      attachmentId,
      ctx.slotId,
      nodes,
      edges,
      ids,
    );

    for (const effect of option.effects) {
      const effectId = traceEffectAtom(effect, nodes, ids, edges);
      if (effectId === null) continue;
      edges.push({ from: modeId, to: effectId, relation: "grants" });
      edges.push({ from: effectId, to: attachmentId, relation: "attaches_to" });
      traceEffectAtomScaling(effect, effectId, ctx.slotId, nodes, edges, ids);
    }
  }
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
    case "hours":
      nodes.push({
        id,
        category: "resource",
        atomKind: "long_cast",
        label: `long_cast\n(Casting Time: ${ct.amount} hour${
          ct.amount === 1 ? "" : "s"
        }${ct.ritual ? " / Ritual" : ""})`,
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
