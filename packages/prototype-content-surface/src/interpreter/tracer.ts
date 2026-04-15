// Tracer — an interpreter over the authored spell ADT that produces a
// dependency graph (not a runtime effect). Walks the SpellRecord and
// records every surface atom referenced, plus the typed relations
// between them. Output feeds into the mermaid renderer.
//
// The tracer is the simplest non-trivial interpreter over the closed
// atom algebra. It demonstrates that multiple interpreters (tracer,
// future runtime projector, future Quint generator) can all read the
// same authored term.

import type {
  SpellRecord,
  SpellMechanics,
  OngoingEffectMechanics,
  CastingTime,
  Operation,
  Attachment,
  Lifecycle,
  Cleanup,
  Duration,
  DiceDelta,
  SlotScaling,
} from "../surface/types.ts";

// ---------- trace output ----------

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
  readonly atomKind: string; // name of the surface atom used
  readonly label: string; // renderable label (may contain newlines)
};

export type TraceEdge = {
  readonly from: string;
  readonly to: string;
  readonly relation: string;
};

export type Trace = {
  readonly spellId: string;
  readonly spellName: string;
  readonly nodes: ReadonlyArray<TraceNode>;
  readonly edges: ReadonlyArray<TraceEdge>;
  readonly atomKinds: ReadonlyArray<string>; // deduped list for the summary
};

// ---------- tracer ----------

export function traceSpell(spell: SpellRecord): Trace {
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

  const mechanicsRoot = traceMechanics(spell.mechanics, nodes, edges, ids);
  edges.push({ from: rootId, to: mechanicsRoot, relation: "roots" });

  const atomKinds = [...new Set(nodes.map((n) => n.atomKind))].sort();

  return {
    spellId: spell.id,
    spellName: spell.name,
    nodes,
    edges,
    atomKinds,
  };
}

function traceMechanics(
  mech: SpellMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  // Header-level handling — every spell family intersects
  // `SpellMechanicsHeader`, so `castingTime` is uniformly present here
  // regardless of which family is active. Family-specific tracers handle
  // only family-specific atoms below.
  const procedureId = traceMechanicsBody(mech, nodes, edges, ids);

  // Casting Time → Quota consumption.
  // The SRD-facing `castingTime` field drives a `consumes` edge to the
  // corresponding Quota atom (`action_quota`, `bonus_action_quota`,
  // `reaction_quota`). Quota is UBIQUITOUS_LANGUAGE's term for per-turn
  // allowances that auto-reset. Distinct from the Pool-shape resources
  // like `spell_slot` which reset on rests.
  const quotaId = traceCastingTimeQuota(mech.castingTime, nodes, ids);
  edges.push({ from: procedureId, to: quotaId, relation: "consumes" });

  return procedureId;
}

function traceMechanicsBody(
  mech: SpellMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  switch (mech.family) {
    case "ongoing_effect":
      return traceOngoingEffect(mech, nodes, edges, ids);
    default: {
      const _exhaustive: never = mech.family;
      throw new Error(`unhandled mechanics family: ${String(_exhaustive)}`);
    }
  }
}

function traceOngoingEffect(
  m: OngoingEffectMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  // The casting procedure. Atom: `activate`. `castingTime` is handled
  // one level up in `traceMechanics` — family-specific tracers focus
  // only on family-specific atoms.
  const actId = ids("act");
  nodes.push({
    id: actId,
    category: "procedure",
    atomKind: "activate",
    label: "activate",
  });

  // Pool resource consumption (spell slot etc.).
  const resId = traceResource(m, nodes, ids);
  edges.push({ from: actId, to: resId, relation: "consumes" });

  // Attachment.
  const attId = traceAttachment(m.attachment, nodes, ids);
  edges.push({ from: actId, to: attId, relation: "attaches_to" });

  // Scaling — wired from the resource to the scaled field.
  traceAttachmentScaling(m.attachment, resId, attId, nodes, edges, ids);

  // Lifecycle + cleanup.
  traceLifecycleAndCleanup(m.lifecycle, m.cleanup, actId, nodes, edges, ids);

  // Operation (effect) — re-attached to the target scope.
  const opId = traceOperation(m.operation, nodes, ids);
  edges.push({ from: actId, to: opId, relation: "grants" });
  edges.push({ from: opId, to: attId, relation: "attaches_to" });

  return actId;
}

function traceCastingTimeQuota(
  ct: CastingTime,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const id = ids("q");
  switch (ct.kind) {
    case "action": {
      nodes.push({
        id,
        category: "resource",
        atomKind: "action_quota",
        label: "action_quota\n(Casting Time: Action)",
      });
      return id;
    }
    default: {
      const _exhaustive: never = ct.kind;
      throw new Error(`unhandled casting time: ${String(_exhaustive)}`);
    }
  }
}

function traceResource(
  m: OngoingEffectMechanics,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const id = ids("res");
  nodes.push({
    id,
    category: "resource",
    atomKind: "spell_slot",
    label: `spell_slot\n≥ level ${m.resource.minLevel}`,
  });
  return id;
}

function traceAttachment(
  a: Attachment,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const id = ids("att");
  switch (a.kind) {
    case "target": {
      const countLabel = describeScaling(a.selection.count);
      nodes.push({
        id,
        category: "attachment",
        atomKind: "target",
        label: `target\n${a.selection.mode}: ${countLabel}\nrange ${a.selection.range.feet} ft`,
      });
      return id;
    }
    default: {
      const _exhaustive: never = a.kind;
      throw new Error(`unhandled attachment kind: ${String(_exhaustive)}`);
    }
  }
}

function traceAttachmentScaling(
  a: Attachment,
  resId: string,
  attId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  if (a.kind === "target" && a.selection.count.kind === "linear") {
    const scId = ids("sc");
    nodes.push({
      id: scId,
      category: "scaling",
      atomKind: "scale_target_count",
      label: `scale_target_count\n+${a.selection.count.perSlotAboveBase}/slot above ${a.selection.count.baseLevel}`,
    });
    edges.push({ from: resId, to: scId, relation: "modifies" });
    edges.push({ from: scId, to: attId, relation: "modifies" });
  }
}

function traceLifecycleAndCleanup(
  life: Lifecycle,
  clean: Cleanup,
  actId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (life.kind) {
    case "concentration": {
      const concId = ids("conc");
      nodes.push({
        id: concId,
        category: "lifecycle",
        atomKind: "concentrate",
        label: "concentrate",
      });
      edges.push({ from: actId, to: concId, relation: "grants" });

      // `expire` atom keyed by the max duration.
      const expId = ids("exp");
      nodes.push({
        id: expId,
        category: "lifecycle",
        atomKind: "expire",
        label: `expire\n≤ ${describeDuration(life.maxDuration)}`,
      });
      edges.push({ from: concId, to: expId, relation: "persists_until" });

      // Cleanup on concentration end shares the `expire` node — no separate
      // node needed until we encounter a spell whose cleanup is distinct
      // from the concentration boundary.
      switch (clean.kind) {
        case "concentration_end":
          return;
        default: {
          const _exhaustive: never = clean.kind;
          throw new Error(`unhandled cleanup kind: ${String(_exhaustive)}`);
        }
      }
    }
    default: {
      const _exhaustive: never = life.kind;
      throw new Error(`unhandled lifecycle kind: ${String(_exhaustive)}`);
    }
  }
}

function traceOperation(op: Operation, nodes: TraceNode[], ids: IdGen): string {
  const id = ids("op");
  switch (op.kind) {
    case "roll_modifier": {
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_roll_numeric",
        label: `modify_roll_numeric\n${describeDelta(op.delta)}\non ${op.on.join(", ")}`,
      });
      return id;
    }
    default: {
      const _exhaustive: never = op.kind;
      throw new Error(`unhandled operation kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------- small helpers ----------

type IdGen = (prefix: string) => string;

function idGen(): IdGen {
  let n = 0;
  return (prefix: string) => `${prefix}${++n}`;
}

function describeScaling(s: SlotScaling<number>): string {
  switch (s.kind) {
    case "linear":
      return `${s.base} + ${s.perSlotAboveBase} per slot above ${s.baseLevel}`;
    default: {
      const _exhaustive: never = s.kind;
      throw new Error(`unhandled scaling kind: ${String(_exhaustive)}`);
    }
  }
}

function describeDuration(d: Duration): string {
  return `${d.amount} ${d.unit}${d.amount === 1 ? "" : "s"}`;
}

function describeDelta(d: DiceDelta): string {
  return `${d.sign}${d.dice}d${d.dieSize}`;
}
