import type {
  Attachment,
  MarkTransfer,
  OngoingActionCost,
  OngoingEffectMechanics,
  OngoingOperation,
  Range,
} from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  describeAbilityCheck,
  describeDc,
  describeOngoingPredicate,
  describeRandomTableOutcomeRange,
  describeRandomTableRoll,
  describeTransferEvent,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";
import type { OngoingTriggerCtx, SpellCtx } from "./tracer-spell-context.ts";

import { traceEffectAtom } from "./tracer-effect-atom.ts";

import {
  traceEffectAtomScaling,
  traceUsageLimit,
} from "./tracer-effect-scaling.ts";

import { tracePhase } from "./tracer-activation.ts";

import {
  describeOngoingActionCost,
  traceAttachment,
} from "./tracer-attachments.ts";

import {
  traceDiceAmountScaling,
  traceTargetCountScaling,
} from "./tracer-scaling.ts";

export function traceOngoingEffect(
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
    traceOngoingOperation(
      op,
      ctx.procId,
      attId,
      ctx.slotId,
      ctx.range,
      nodes,
      edges,
      ids,
    );
  }
}

// If the attachment is a v4 `mark`, emit the mark_target effect (and,
// if configured, the transfer_mark effect with its transfers_to edge
// back onto the mark attachment node).
export function traceMarkAttachmentEffects(
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

export function traceMarkTransfer(
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

export function traceOngoingOperation(
  op: OngoingOperation,
  procId: string,
  attId: string,
  slotId: string | null,
  range: Range,
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
  traceUsageLimit(op.usageLimit, hostId, "limits", nodes, edges, ids);
  const effectHostId =
    op.predicate === undefined
      ? hostId
      : traceOngoingPredicateGate(op.predicate, hostId, nodes, edges, ids);
  const effectHostRelation =
    op.predicate === undefined ? hostRelation : "grants";
  if (op.targetLimit !== undefined) {
    const limitId = ids("limit");
    const targetTypes = op.targetLimit.targetTypes.join("/");
    const distinct = op.targetLimit.distinct === true ? " distinct" : "";
    nodes.push({
      id: limitId,
      category: "resolution",
      atomKind: "target_limit",
      label: `target_limit\n${op.targetLimit.count}${distinct} ${targetTypes}`,
    });
    edges.push({ from: hostId, to: limitId, relation: "limits" });
  }
  traceOngoingOpEffect(
    op.effect,
    effectHostId,
    effectHostRelation,
    attId,
    slotId,
    range,
    nodes,
    edges,
    ids,
  );
}

function ongoingActionWindowAtomKind(
  cost: OngoingActionCost,
): "action_window" | "bonus_action_window" {
  return cost.kind === "bonus_action" ? "bonus_action_window" : "action_window";
}

export function traceOngoingPredicateGate(
  predicate: import("../surface/types.ts").OngoingPredicate,
  hostId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const id = ids("pred");
  nodes.push({
    id,
    category: "resolution",
    atomKind: "ongoing_predicate",
    label: `ongoing_predicate\n${describeOngoingPredicate(predicate)}`,
  });
  edges.push({ from: hostId, to: id, relation: "gates" });
  return id;
}

export function traceOngoingTrigger(
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
    case "on_effect_starts": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "effect_start_window",
        label: "effect_start_window",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
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
    case "on_caster_deals_damage_to_attachment": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "damage_window",
        label: `damage_window\n(caster damages attachment)\nsource: ${trigger.damageSource.join(" or ")}`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_attached_hit_by_attack_roll": {
      const winId = ids("win");
      const attack =
        trigger.attackKind === undefined
          ? ""
          : `\nattack: ${trigger.attackKind}`;
      const range =
        trigger.attackerWithinFeet === undefined
          ? ""
          : `\nattacker within ${trigger.attackerWithinFeet} ft`;
      const attackerTypes =
        trigger.attackerTypeFilter === undefined
          ? ""
          : `\nattacker type: ${trigger.attackerTypeFilter.join("/")}`;
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "on_hit_window",
        label: `on_hit_window\n(attached hit by attack roll)${attack}${range}${attackerTypes}`,
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
    case "on_attached_turn_end": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_end_window",
        label: "turn_end_window\n(attached creature)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_caster_turn_start": {
      const winId = ids("win");
      const turn =
        trigger.turnWindow === undefined
          ? ""
          : `\n${describeOngoingTurnWindow(trigger.turnWindow)}`;
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_start_window",
        label: `turn_start_window\n(caster)${turn}`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_caster_turn_end": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_end_window",
        label: "turn_end_window\n(caster)",
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
    case "on_attached_targeted": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "targeting_window",
        label: `targeting_window\nattached targeted by ${trigger.targeting.join(" or ")}\nexcludes: ${trigger.excludes}`,
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
    case "on_creature_starts_turn_in_area": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_start_window",
        label: "turn_start_window\n(creature in area)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_moves_through_area": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: "post_action_window\n(creature moves through area)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_moves_within_area": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: `post_action_window\n(creature moves within ${trigger.distanceFeet} ft of area)`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_starts_turn_within_area": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_start_window",
        label: `turn_start_window\n(creature within ${trigger.distanceFeet} ft of area)`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_attempts_magical_escape": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "escape_attempt_window",
        label: `escape_attempt_window\n${trigger.methods.join(", ")}`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_object_section_destroyed": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: "post_action_window\n(object section destroyed)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_area_moves_into_creature_space": {
      const winId = ids("win");
      const size =
        trigger.maxCreatureSize === undefined
          ? ""
          : `\nmax size: ${trigger.maxCreatureSize}`;
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: `post_action_window\n(area moves into creature space)${size}`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_exits_area": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: "post_action_window\n(creature exits area)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_caster_spends_action": {
      const winId = ids("win");
      const atomKind = ongoingActionWindowAtomKind(trigger.cost);
      const laterSuffix =
        trigger.laterTurnsOnly === true ? ", later turns only" : "";
      nodes.push({
        id: winId,
        category: "window",
        atomKind,
        label: `${atomKind}\n(caster spends ${describeOngoingActionCost(trigger.cost)}${laterSuffix})`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_attached_spends_action": {
      const winId = ids("win");
      const atomKind = ongoingActionWindowAtomKind(trigger.cost);
      nodes.push({
        id: winId,
        category: "window",
        atomKind,
        label: `${atomKind}\n(attached creature spends ${describeOngoingActionCost(trigger.cost)})`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_affected_creature_spends_action": {
      const winId = ids("win");
      const atomKind = ongoingActionWindowAtomKind(trigger.cost);
      nodes.push({
        id: winId,
        category: "window",
        atomKind,
        label: `${atomKind}\n(affected creature spends ${describeOngoingActionCost(trigger.cost)})`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_studies": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "action_window",
        label: "action_window\n(creature Study action on attachment)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_ends_turn_in_area": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: "post_action_window\n(creature ends turn in area)",
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_creature_ends_turn_within_distance_of_area": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: `post_action_window\n(creature ends turn within ${trigger.distanceFeet} ft of area)`,
      });
      edges.push({ from: procId, to: winId, relation: "opens_window" });
      return { hostId: winId, hostRelation: "grants" };
    }
    case "on_structure_collapses": {
      const winId = ids("win");
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "post_action_window",
        label: `post_action_window\n(structure collapses, affected within ${trigger.affectedWithin})`,
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

export function describeOngoingTurnWindow(
  turnWindow: NonNullable<
    Extract<
      import("../surface/types.ts").OngoingTrigger,
      { readonly kind: "on_caster_turn_start" }
    >["turnWindow"]
  >,
): string {
  switch (turnWindow.kind) {
    case "effect_turn":
      return `effect turn ${turnWindow.turn}`;
    case "effect_turn_range":
      return `effect turns ${turnWindow.from}-${turnWindow.to}`;
    default: {
      const _: never = turnWindow;
      throw new Error(`unhandled ongoing turn window: ${String(_)}`);
    }
  }
}

export function traceOngoingOpEffect(
  eff: import("../surface/types.ts").OngoingEffect,
  hostId: string,
  hostRelation: "grants" | "opens_window",
  attId: string,
  slotId: string | null,
  range: Range,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  switch (eff.kind) {
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
    case "random_table": {
      const resId = ids("res");
      nodes.push({
        id: resId,
        category: "resolution",
        atomKind: "random_table",
        label: `random_table\nroll: ${describeRandomTableRoll(eff.roll)}`,
      });
      edges.push({ from: hostId, to: resId, relation: hostRelation });
      edges.push({ from: resId, to: attId, relation: "attaches_to" });

      for (const outcome of eff.outcomes) {
        const branchId = ids("tbl");
        nodes.push({
          id: branchId,
          category: "resolution",
          atomKind: "table_result",
          label:
            `table_result\n${describeRandomTableOutcomeRange(outcome)}` +
            `\n${outcome.label}`,
        });
        edges.push({ from: resId, to: branchId, relation: "branches_on_roll" });

        for (const effect of outcome.effects ?? []) {
          traceOngoingOpEffect(
            effect,
            branchId,
            "grants",
            attId,
            slotId,
            range,
            nodes,
            edges,
            ids,
          );
        }
      }
      return;
    }
    case "save_gate": {
      // §A9 — damage-triggered or turn-start save inside an ongoing
      // effect. Reuses the activation save_gate atom.
      const saveAttachmentId =
        eff.attachment === undefined
          ? attId
          : traceAttachment(eff.attachment, range, nodes, ids);
      const sgId = ids("sg");
      nodes.push({
        id: sgId,
        category: "resolution",
        atomKind: "save_gate",
        label: `save_gate\n${eff.ability.toUpperCase()} vs ${describeDc(eff.dc)}`,
      });
      edges.push({ from: hostId, to: sgId, relation: hostRelation });
      edges.push({ from: sgId, to: saveAttachmentId, relation: "attaches_to" });
      const failId = traceEffectAtom(eff.onFail, nodes, ids, edges);
      if (failId !== null) {
        edges.push({ from: sgId, to: failId, relation: "branches_on_save" });
        traceEffectAtomScaling(eff.onFail, failId, slotId, nodes, edges, ids);
      }
      if (
        eff.onSuccess.kind !== "none" &&
        eff.onSuccess.kind !== "half_damage"
      ) {
        const sucId = traceEffectAtom(eff.onSuccess, nodes, ids, edges);
        if (sucId !== null) {
          edges.push({ from: sgId, to: sucId, relation: "branches_on_save" });
          traceEffectAtomScaling(
            eff.onSuccess,
            sucId,
            slotId,
            nodes,
            edges,
            ids,
          );
        }
      }
      return;
    }
    case "attack_roll": {
      const arId = ids("ar");
      nodes.push({
        id: arId,
        category: "resolution",
        atomKind: "attack_roll",
        label: `attack_roll\n${eff.attackKind}`,
      });
      edges.push({ from: hostId, to: arId, relation: hostRelation });
      edges.push({ from: arId, to: attId, relation: "attaches_to" });
      if (eff.attachment !== undefined) {
        const targetId = traceAttachment(eff.attachment, range, nodes, ids);
        edges.push({ from: arId, to: targetId, relation: "targets" });
        traceTargetCountScaling(
          eff.attachment,
          targetId,
          slotId,
          nodes,
          edges,
          ids,
        );
      }
      for (const hit of eff.onHit) {
        const hitId = traceEffectAtom(hit, nodes, ids, edges);
        if (hitId !== null) {
          edges.push({ from: arId, to: hitId, relation: "branches_on_hit" });
          traceEffectAtomScaling(hit, hitId, slotId, nodes, edges, ids);
        }
      }
      for (const miss of eff.onMiss) {
        const missId = traceEffectAtom(miss, nodes, ids, edges);
        if (missId !== null) {
          edges.push({ from: arId, to: missId, relation: "branches_on_miss" });
          traceEffectAtomScaling(miss, missId, slotId, nodes, edges, ids);
        }
      }
      return;
    }
    case "composite_ongoing": {
      const id = ids("op");
      nodes.push({
        id,
        category: "effect",
        atomKind: "composite_ongoing",
        label: `composite_ongoing\n(${eff.effects.length} effects)`,
      });
      edges.push({ from: hostId, to: id, relation: hostRelation });
      edges.push({ from: id, to: attId, relation: "attaches_to" });
      for (const child of eff.effects) {
        traceOngoingOpEffect(
          child,
          id,
          "grants",
          attId,
          slotId,
          range,
          nodes,
          edges,
          ids,
        );
      }
      return;
    }
    case "ability_check_gate": {
      const acgId = ids("acg");
      nodes.push({
        id: acgId,
        category: "resolution",
        atomKind: "ability_check_gate",
        label: `ability_check_gate\n${describeAbilityCheck(eff.ability, eff.skill)} vs ${describeDc(eff.dc)}`,
      });
      edges.push({ from: hostId, to: acgId, relation: hostRelation });
      edges.push({ from: acgId, to: attId, relation: "attaches_to" });
      const passId = traceEffectAtom(eff.onPass, nodes, ids, edges);
      if (passId !== null) {
        edges.push({ from: acgId, to: passId, relation: "branches_on_pass" });
      }
      if (eff.onFail !== undefined) {
        const failId = traceEffectAtom(eff.onFail, nodes, ids, edges);
        if (failId !== null) {
          edges.push({
            from: acgId,
            to: failId,
            relation: "branches_on_fail",
          });
        }
      }
      return;
    }
    case "choose_effect_mode": {
      const id = ids("choice");
      nodes.push({
        id,
        category: "resolution",
        atomKind: "choose_effect_mode",
        label: `choose_effect_mode\n${eff.label}`,
      });
      edges.push({ from: hostId, to: id, relation: hostRelation });
      edges.push({ from: id, to: attId, relation: "attaches_to" });
      for (const option of eff.options) {
        const optionId = ids("opt");
        nodes.push({
          id: optionId,
          category: "resolution",
          atomKind: "effect_mode_option",
          label: `mode: ${option.displayName}`,
        });
        edges.push({ from: id, to: optionId, relation: "offers" });
        for (const effect of option.effects) {
          traceOngoingOpEffect(
            effect,
            optionId,
            "grants",
            attId,
            slotId,
            range,
            nodes,
            edges,
            ids,
          );
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
