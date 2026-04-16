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
  CastingTime,
  Duration,
  Range,
  Attachment,
  EffectAtom,
  OngoingOperation,
  DiceAmount,
  DiceExpr,
  DiceExprDelta,
  DiceDelta,
  SlotScaling,
  SpellLevel,
  ClassFeatureMechanics,
  ClassFeatureActivationMechanics,
  ClassFeatureActivationCost,
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
  AreaShapeDescriptor,
  SaveGateRiderResult,
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
// id, or null for the `none` sentinel.
function traceEffectAtom(
  e: EffectAtom,
  nodes: TraceNode[],
  ids: IdGen,
): string | null {
  switch (e.kind) {
    case "none":
      return null;
    case "damage": {
      const id = ids("dmg");
      nodes.push({
        id,
        category: "effect",
        atomKind: "damage",
        label: `damage: ${describeDiceAmount(e.amount)} ${e.damageType}`,
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
    case "modify_ac": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_ac",
        label: `modify_ac\n+${e.delta}`,
      });
      return id;
    }
    case "apply_condition": {
      const id = ids("cond");
      nodes.push({
        id,
        category: "effect",
        atomKind: "apply_condition",
        label: `apply_condition\n${e.condition}`,
      });
      return id;
    }
    case "remove_condition": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "remove_condition",
        label: `remove_condition\n${e.condition}`,
      });
      return id;
    }
    case "grant_resistance": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "grant_resistance",
        label: `grant_resistance\n${e.damageType}`,
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
        label: `modify_roll_numeric\n${describeDelta(e.delta)}\non ${e.on.join(", ")}`,
      });
      return id;
    }
    case "modify_roll_advantage": {
      const id = ids("eff");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_roll_advantage",
        label: `modify_roll_advantage\n${e.mode} on ${e.on.join(", ")}`,
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
    case "none":
    case "modify_ac":
    case "apply_condition":
    case "remove_condition":
    case "grant_resistance":
    case "grant_extra_action":
    case "modify_roll_numeric":
    case "modify_roll_advantage":
    case "modify_speed":
    case "force_move":
    case "block_targeting":
    case "block_travel":
    case "negate_named_effect":
    case "grant_sense":
    case "deny_opportunity_attack":
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
        label: "action_quota\n(Casting Time: Action)",
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
      return "hit by attack roll";
    case "targeted_by_named_spell":
      return `targeted by ${t.spellId}`;
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

      const expId = ids("exp");
      nodes.push({
        id: expId,
        category: "lifecycle",
        atomKind: "expire",
        label: `expire\n≤ ${describeDurationValue(d.upTo)}`,
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
        label: `expire\n${describeDurationValue(d.value)}`,
      });
      edges.push({ from: persistId, to: expId, relation: "persists_until" });
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

  traceOngoingOperation(
    m.operation,
    ctx.procId,
    attId,
    ctx.slotId,
    nodes,
    edges,
    ids,
  );
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
  switch (op.kind) {
    case "roll_modifier": {
      const id = ids("op");
      nodes.push({
        id,
        category: "effect",
        atomKind: "modify_roll_numeric",
        label: `modify_roll_numeric\n${describeDelta(op.delta)}\non ${op.on.join(", ")}`,
      });
      edges.push({ from: procId, to: id, relation: "grants" });
      edges.push({ from: id, to: attId, relation: "attaches_to" });
      return;
    }
    case "damage_on_hit": {
      // Opens an on_hit_window on any attack-roll the caster makes
      // against a creature in the attachment's scope; the rider
      // grants a damage effect.
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "on_hit_window",
        label: "on_hit_window\n(caster hits attachment)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });

      const dmgId = ids("dmg");
      nodes.push({
        id: dmgId,
        category: "effect",
        atomKind: "damage",
        label: `damage: ${describeDiceAmount(op.amount)} ${op.damageType}`,
      });
      edges.push({ from: winId, to: dmgId, relation: "grants" });
      edges.push({ from: dmgId, to: attId, relation: "attaches_to" });
      traceDiceAmountScaling(op.amount, dmgId, slotId, nodes, edges, ids);
      return;
    }
    default: {
      const _: never = op;
      throw new Error(`unhandled ongoing operation: ${String(_)}`);
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

  // Attachment — typically self for Shield.
  const attId = traceAttachment(m.attachment, ctx.range, nodes, ids);
  edges.push({ from: commitId, to: attId, relation: "attaches_to" });

  // Interrupt the triggering resolution if the spell does so.
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

  // Commit grants each reaction effect — now unified EffectAtom.
  for (const eff of m.effects) {
    const effId = traceEffectAtom(eff, nodes, ids);
    if (effId === null) continue;
    edges.push({ from: commitId, to: effId, relation: "grants" });
    edges.push({ from: effId, to: attId, relation: "attaches_to" });
  }
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

      const resId = ids("res");
      nodes.push({
        id: resId,
        category: "resolution",
        atomKind: "save_gate",
        label: `save_gate [phase ${phaseNumber}]\n${phase.ability.toUpperCase()} save\nDC: caster spell save DC`,
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
      traceSaveBranch(
        phase.onSuccess,
        resId,
        attId,
        ctx.slotId,
        nodes,
        edges,
        ids,
      );
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

      for (const eff of phase.effects) {
        const effId = traceEffectAtom(eff, nodes, ids);
        if (effId === null) continue;
        edges.push({ from: directId, to: effId, relation: "grants" });
        edges.push({ from: effId, to: attId, relation: "attaches_to" });
        traceEffectAtomScaling(eff, effId, ctx.slotId, nodes, edges, ids);
      }
      return directId;
    }
    default: {
      const _exhaustive: never = phase;
      throw new Error(`unhandled phase: ${String(_exhaustive)}`);
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
  const eId = traceEffectAtom(e, nodes, ids);
  if (eId === null) return;
  edges.push({ from: fromResolutionId, to: eId, relation: "branches_on_save" });
  edges.push({ from: eId, to: attId, relation: "attaches_to" });
  traceEffectAtomScaling(e, eId, slotId, nodes, edges, ids);
}

function traceAttackWindow(
  e: EffectAtom,
  windowAtom: "on_hit_window" | "on_miss_window",
  attackRollId: string,
  attId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const effectId = traceEffectAtom(e, nodes, ids);
  if (effectId === null) return;
  const winId = ids("win");
  nodes.push({
    id: winId,
    category: "window",
    atomKind: windowAtom,
    label: windowAtom,
  });
  edges.push({ from: attackRollId, to: winId, relation: "opens_window" });
  edges.push({ from: winId, to: effectId, relation: "grants" });
  edges.push({ from: effectId, to: attId, relation: "attaches_to" });
  traceEffectAtomScaling(e, effectId, slotId, nodes, edges, ids);
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
      const selectionLabel =
        a.selection.mode === "one"
          ? "one"
          : `choose_up_to: ${describeScaling(a.selection.count)}`;
      nodes.push({
        id,
        category: "attachment",
        atomKind: "target",
        label: `target\n${selectionLabel}\nrange ${describeRange(range)}`,
      });
      return id;
    }
    case "area": {
      const originLabel =
        a.origin.kind === "point_within_range"
          ? `origin: point within ${describeRange(range)}`
          : "origin: primary target";
      nodes.push({
        id,
        category: "attachment",
        atomKind: "area",
        label: `area\n${describeAreaShape(a.shape)}\n${originLabel}`,
      });
      return id;
    }
    case "mark": {
      const selectionLabel =
        a.selection.mode === "one"
          ? "one"
          : `choose_up_to: ${describeScaling(a.selection.count)}`;
      const transferLabel = a.transfer
        ? `\ntransfer on ${describeTransferEvent(a.transfer)} (${a.transfer.cost.kind})`
        : "";
      nodes.push({
        id,
        category: "attachment",
        atomKind: "mark",
        label: `mark\n${selectionLabel}\nrange ${describeRange(range)}${transferLabel}`,
      });
      return id;
    }
    default: {
      const _exhaustive: never = a;
      throw new Error(`unhandled attachment: ${String(_exhaustive)}`);
    }
  }
}

function describeAreaShape(s: AreaShapeDescriptor): string {
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
  if (
    selection === null ||
    selection.mode !== "choose_up_to" ||
    selection.count.kind !== "linear"
  ) {
    return;
  }
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

function traceClassFeatureMechanics(
  m: ClassFeatureMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  switch (m.family) {
    case "activation":
      return traceClassFeatureActivation(m, nodes, edges, ids);
    default: {
      const _exhaustive: never = m.family;
      throw new Error(`unhandled class-feature family: ${String(_exhaustive)}`);
    }
  }
}

function traceClassFeatureActivation(
  m: ClassFeatureActivationMechanics,
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
  const resId = traceUseCount(m.resource, nodes, edges, ids);
  edges.push({ from: procId, to: resId, relation: "consumes" });
  traceResetCadence(m.resetCadence, resId, nodes, edges, ids);

  // Effect — now a unified EffectAtom.
  traceClassFeatureEffect(m.effect, procId, nodes, edges, ids);

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
    default: {
      const _exhaustive: never = c;
      throw new Error(`unhandled activation cost: ${String(_exhaustive)}`);
    }
  }
}

function traceUseCount(
  r: UseCountResource,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const id = ids("use");
  const capLabel = describeUseCountCap(r.cap);
  nodes.push({
    id,
    category: "resource",
    atomKind: "use_count",
    label: `use_count\n${capLabel}`,
  });
  // If the cap is tiered, emit a scaling node that modifies the use_count.
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
  type RestEntry = { kind: "short" | "long"; refillLabel: string };
  let rests: ReadonlyArray<RestEntry>;
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

function traceClassFeatureEffect(
  e: EffectAtom,
  procId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  // Special handling for grant_extra_action to trace the action restriction.
  if (e.kind === "grant_extra_action") {
    const effId = traceEffectAtom(e, nodes, ids);
    if (effId === null) return;
    edges.push({ from: procId, to: effId, relation: "grants" });
    traceActionRestriction(e.restriction, effId, nodes, edges, ids);
    return;
  }

  // Special handling for heal_hp to trace DiceAmount scaling.
  if (e.kind === "heal_hp") {
    const effId = traceEffectAtom(e, nodes, ids);
    if (effId === null) return;
    edges.push({ from: procId, to: effId, relation: "grants" });
    traceDiceAmountScaling(e.amount, effId, null, nodes, edges, ids);
    return;
  }

  // General case: trace the atom and link it.
  const effId = traceEffectAtom(e, nodes, ids);
  if (effId === null) return;
  edges.push({ from: procId, to: effId, relation: "grants" });
  traceEffectAtomScaling(e, effId, null, nodes, edges, ids);
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
    case "weapon_attack_dc":
      return `${d.base} + ability mod + PB (weapon attack)`;
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

function describeScaling(s: SlotScaling<number>): string {
  return `${s.base} + ${s.perSlotAboveBase} per slot above ${s.baseLevel}`;
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
}): string {
  return `${d.amount} ${d.unit}${d.amount === 1 ? "" : "s"}`;
}

function describeDelta(d: DiceDelta): string {
  return `${d.sign}${d.dice}d${d.dieSize}`;
}

function describeDiceAmount(a: DiceAmount): string {
  switch (a.kind) {
    case "fixed":
      return describeExpr(a.expr);
    case "threshold_tiers":
      return `${describeExpr(a.base)} (tiered by ${a.axis} level)`;
    case "linear_per_level":
      return `${describeExpr(a.base)} (linear per ${a.axis} level)`;
    default: {
      const _exhaustive: never = a;
      throw new Error(`unhandled dice amount: ${String(_exhaustive)}`);
    }
  }
}

function describeExpr(e: DiceExpr): string {
  const flat = e.flat !== undefined && e.flat !== 0 ? `+${e.flat}` : "";
  return `${e.dice}d${e.dieSize}${flat}`;
}
