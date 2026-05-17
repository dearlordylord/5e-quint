import type {
  ReanimatedCreatureMechanics,
  TemplatedMultiSpawnMechanics,
} from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import { describeRange, formatElapsedHours } from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";
import type { SpellCtx } from "./tracer-spell-context.ts";

import {
  describeCommandCost,
  describeCommandRange,
} from "./tracer-creature-actions.ts";

// §C4b — reanimated_creature payload family (Animate Dead, Create
// Undead). Spawns a `companion` attachment via catalog reference +
// one `create_companion` per slot-option, plus `command_companion`
// for the Bonus Action mental command.
export function traceReanimatedCreature(
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
export function traceTemplatedMultiSpawn(
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
