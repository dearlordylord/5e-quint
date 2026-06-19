import type {
  AnchorTarget,
  AnchoredEvent,
  AnchoredFilter,
  AnchoredSignal,
  AnchoredTriggerMechanics,
  GlyphWardingMechanics,
  Range,
  TriggeredReactionMechanics,
} from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  describeDamageTypeRef,
  describeRange,
  describeReactionTrigger,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";
import type { SpellCtx } from "./tracer-spell-context.ts";

import { tracePhase } from "./tracer-activation.ts";
import { traceDiceAmountScaling } from "./tracer-scaling.ts";

type ObjectAnchor = Extract<AnchorTarget, { kind: "object" }>;
type SpokenMessageSignal = Extract<AnchoredSignal, { kind: "spoken_message" }>;

const objectAnchorVisibilityLabels = {
  caster_can_see: "caster can see",
} as const satisfies Record<ObjectAnchor["visibility"], string>;

const objectAnchorCarryStateLabels = {
  not_worn_or_carried_by_another_creature:
    "not worn or carried by another creature",
} as const satisfies Record<ObjectAnchor["wornOrCarried"], string>;

const spokenMessageVoiceLabels = {
  caster_voice: "caster voice",
} as const satisfies Record<SpokenMessageSignal["voice"], string>;

const spokenMessageVolumeLabels = {
  same_as_spoken: "same spoken volume",
} as const satisfies Record<SpokenMessageSignal["volume"], string>;

const spokenMessageMouthPlacementLabels = {
  object_mouth_if_present: "object mouth if present",
} as const satisfies Record<SpokenMessageSignal["mouthPlacement"], string>;

const spokenMessageRepetitionLabels = {
  caster_choice_once_or_repeating: "caster chooses one delivery or repeating",
} as const satisfies Record<SpokenMessageSignal["repetition"], string>;

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
// cases: Alarm and Magic Mouth. Graph shape:
//   spell_root → store → anchor target + trigger_condition
//   trigger_condition → release (when matching event + filters fire)
//   release → signal
//   duration records the spell-owned persistence/expiry shape.
export function traceAnchoredTrigger(
  m: AnchoredTriggerMechanics,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  // Anchor node — the target the spell is planted on.
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
  // closest v4 window atom for later trigger observation around the anchor.
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

export function traceGlyphWarding(
  m: GlyphWardingMechanics,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const occurrenceId = ids("glyph");
  nodes.push({
    id: occurrenceId,
    category: "attachment",
    atomKind: "glyph_warding_occurrence",
    label: [
      "glyph_warding_occurrence",
      "anchor: surface or closeable object",
      `coverage: <= ${m.occurrence.coverage.maxDiameterFeet} ft diameter`,
      `notice: ${m.occurrence.concealment.notice.ability.toUpperCase()} (${m.occurrence.concealment.notice.skill}) vs Spell Save DC`,
      `breaks if moved > ${m.occurrence.movementInvalidation.moreThanFeet} ft from cast location`,
    ].join("\n"),
  });
  edges.push({ from: ctx.procId, to: occurrenceId, relation: "stores" });

  const triggerId = ids("evt");
  nodes.push({
    id: triggerId,
    category: "window",
    atomKind: "post_action_window",
    label: [
      "post_action_window",
      "caster-defined glyph trigger",
      `type filter: ${m.trigger.refinement.activationFilter.typeChoice.options.join(", ")}`,
      `exclusion: ${m.trigger.refinement.nonTriggerExclusion.kind}`,
    ].join("\n"),
  });
  edges.push({ from: occurrenceId, to: triggerId, relation: "opens_window" });

  const releaseId = ids("rel");
  nodes.push({
    id: releaseId,
    category: "procedure",
    atomKind: "release",
    label: "release\nexplosive rune or spell glyph\nspell ends on trigger",
  });
  edges.push({ from: ctx.procId, to: releaseId, relation: "stores" });
  edges.push({ from: triggerId, to: releaseId, relation: "prompts" });
  edges.push({ from: releaseId, to: occurrenceId, relation: "attaches_to" });

  const explosiveRune = m.release.explosiveRune;
  const explosiveId = ids("eff");
  nodes.push({
    id: explosiveId,
    category: "effect",
    atomKind: "glyph_explosive_rune",
    label: [
      "glyph_explosive_rune",
      `${explosiveRune.area.radiusFeet} ft ${explosiveRune.area.kind}`,
      `${explosiveRune.save.ability.toUpperCase()} save, half damage on success`,
      `${explosiveRune.damage.amount.base.dice}d${explosiveRune.damage.amount.base.dieSize} ${describeDamageTypeRef(explosiveRune.damage.damageType)}`,
    ].join("\n"),
  });
  edges.push({ from: releaseId, to: explosiveId, relation: "grants" });
  traceDiceAmountScaling(
    explosiveRune.damage.amount,
    explosiveId,
    ctx.slotId,
    nodes,
    edges,
    ids,
  );

  const spellGlyph = m.release.spellGlyph;
  const storedSpellId = ids("eff");
  nodes.push({
    id: storedSpellId,
    category: "effect",
    atomKind: "glyph_stored_spell_release",
    label: [
      "glyph_stored_spell_release",
      `${spellGlyph.storage.spellAccess}; no immediate effect`,
      `max level: ${spellGlyph.storage.maxStoredSpellLevel.baseMaxLevel} or cast slot`,
      "single target -> triggering creature",
      "area -> centered on triggering creature",
      "Concentration -> full duration",
      "hostile summons/objects/traps as close as possible",
    ].join("\n"),
  });
  edges.push({ from: releaseId, to: storedSpellId, relation: "grants" });
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
    case "object":
      nodes.push({
        id,
        category: "attachment",
        atomKind: "object",
        label: [
          "object",
          objectAnchorVisibilityLabels[a.visibility],
          objectAnchorCarryStateLabels[a.wornOrCarried],
          `range ${describeRange(range)}`,
        ].join("\n"),
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
    case "caster_defined_visual_or_audible_condition":
      return `caster-defined visual/audible condition\nwithin ${e.maxDistanceFeet} ft of anchor`;
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
    case "spoken_message":
      return [
        "spoken message",
        [
          spokenMessageVoiceLabels[s.voice],
          spokenMessageVolumeLabels[s.volume],
        ].join(", "),
        `${s.maxWords} words or fewer over ${s.maxDeliveryMinutes} min or less`,
        spokenMessageMouthPlacementLabels[s.mouthPlacement],
        spokenMessageRepetitionLabels[s.repetition],
      ].join("\n");
    default: {
      const _: never = s;
      throw new Error(`unhandled anchored signal: ${String(_)}`);
    }
  }
}
