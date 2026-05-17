import type {
  AnchorTarget,
  AnchoredEvent,
  AnchoredFilter,
  AnchoredSignal,
  AnchoredTriggerMechanics,
  Range,
  TriggeredReactionMechanics,
} from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  describeRange,
  describeReactionTrigger,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";
import type { SpellCtx } from "./tracer-spell-context.ts";

import { tracePhase } from "./tracer-activation.ts";

export function traceTriggeredReaction(
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
export function traceAnchoredTrigger(
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

export function traceAnchorTarget(
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

export function describeAnchoredEvent(e: AnchoredEvent): string {
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

export function describeAnchoredFilter(f: AnchoredFilter): string {
  switch (f.kind) {
    case "creature_exemption_list":
      return "creature exemption list\n(chosen at cast)";
    default: {
      const _: never = f.kind;
      throw new Error(`unhandled anchored filter: ${String(_)}`);
    }
  }
}

export function describeAnchoredSignal(s: AnchoredSignal): string {
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
