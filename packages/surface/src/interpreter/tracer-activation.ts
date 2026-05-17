import type {
  ActivationMechanics,
  ActivationPhase,
  CastTimeEffectModeChoice,
  EffectAtom,
} from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  describeDc,
  describeRandomTableOutcomeRange,
  describeRandomTableRoll,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";
import type { SpellCtx } from "./tracer-spell-context.ts";

import { traceEffectAtom } from "./tracer-effect-atom.ts";

import { traceEffectAtomScaling } from "./tracer-effect-scaling.ts";

import { traceAttachment } from "./tracer-attachments.ts";

import { traceTargetCountScaling } from "./tracer-scaling.ts";

export function traceActivation(
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

export function tracePhase(
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
      if (phase.continue !== undefined) {
        tracePhaseContinuation(phase.continue, resId, ctx, nodes, edges, ids);
      }
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

      const autoLabel =
        phase.autoSuccessIfCasterSlotGte !== undefined
          ? `\nauto-success if caster slot ≥ ${phase.autoSuccessIfCasterSlotGte}`
          : "";
      const gateLabel =
        phase.saveAppliesIf !== undefined
          ? `\nsave only if ${phase.saveAppliesIf}`
          : "";
      const resId = ids("res");
      nodes.push({
        id: resId,
        category: "resolution",
        atomKind: "save_gate",
        label: `save_gate [phase ${phaseNumber}]\n${phase.ability.toUpperCase()} save\nDC: ${describeDc(phase.dc)}${autoLabel}${gateLabel}`,
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
      if (phase.onSuccess.kind === "half_damage") {
        const halfId = ids("eff");
        nodes.push({
          id: halfId,
          category: "effect",
          atomKind: "half_damage",
          label: "half_damage\n(½ of onFail damage)",
        });
        edges.push({
          from: resId,
          to: halfId,
          relation: "branches_on_save",
        });
        edges.push({ from: halfId, to: attId, relation: "attaches_to" });
      } else {
        traceSaveBranch(
          phase.onSuccess,
          resId,
          attId,
          ctx.slotId,
          nodes,
          edges,
          ids,
        );
      }
      for (const repeatSave of phase.repeatSaves ?? []) {
        const repId = ids("rep");
        const rollMode =
          repeatSave.rollMode === undefined
            ? ""
            : `\nroll mode: ${repeatSave.rollMode}`;
        nodes.push({
          id: repId,
          category: "resolution",
          atomKind: "repeat_save",
          label: `repeat_save\ncadence: ${repeatSave.cadence}${rollMode}\non success: ${repeatSave.onSuccess}`,
        });
        edges.push({ from: resId, to: repId, relation: "repeats_as" });
        edges.push({ from: repId, to: attId, relation: "attaches_to" });
        if (repeatSave.onFailAgain !== undefined) {
          const escId = traceEffectAtom(
            repeatSave.onFailAgain,
            nodes,
            ids,
            edges,
          );
          if (escId !== null) {
            edges.push({
              from: repId,
              to: escId,
              relation: "branches_on_save",
            });
            edges.push({ from: escId, to: attId, relation: "attaches_to" });
          }
        }
      }
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

      if (phase.effects !== undefined) {
        for (const eff of phase.effects) {
          const effId = traceEffectAtom(eff, nodes, ids, edges);
          if (effId === null) continue;
          edges.push({ from: directId, to: effId, relation: "grants" });
          edges.push({ from: effId, to: attId, relation: "attaches_to" });
          traceEffectAtomScaling(eff, effId, ctx.slotId, nodes, edges, ids);
        }
      }
      if (phase.mode !== undefined) {
        traceEffectModeChoice(
          phase.mode,
          directId,
          attId,
          ctx.slotId,
          nodes,
          edges,
          ids,
        );
      }
      return directId;
    }
    case "ability_check_gate": {
      const attId = traceAttachment(phase.attachment, ctx.range, nodes, ids);
      edges.push({ from: ctx.procId, to: attId, relation: "attaches_to" });

      const autoLabel =
        phase.autoSuccessIfCasterSlotGte !== undefined
          ? `\nauto-success if caster slot ≥ ${phase.autoSuccessIfCasterSlotGte}`
          : "";
      const resId = ids("res");
      nodes.push({
        id: resId,
        category: "resolution",
        atomKind: "ability_check",
        label: `ability_check_gate [phase ${phaseNumber}]\n${phase.ability.toUpperCase()} check\nDC ${phase.dc}${autoLabel}`,
      });
      edges.push({ from: ctx.procId, to: resId, relation: "grants" });
      edges.push({ from: resId, to: attId, relation: "attaches_to" });

      const passId = traceEffectAtom(phase.onPass, nodes, ids, edges);
      if (passId !== null) {
        edges.push({
          from: resId,
          to: passId,
          relation: "branches_on_completion",
        });
        edges.push({ from: passId, to: attId, relation: "attaches_to" });
      }
      if (phase.onFail !== undefined) {
        const failId = traceEffectAtom(phase.onFail, nodes, ids, edges);
        if (failId !== null) {
          edges.push({
            from: resId,
            to: failId,
            relation: "branches_on_completion",
          });
          edges.push({ from: failId, to: attId, relation: "attaches_to" });
        }
      }
      return resId;
    }
    case "random_table": {
      const resId = ids("res");
      nodes.push({
        id: resId,
        category: "resolution",
        atomKind: "random_table",
        label: `random_table [phase ${phaseNumber}]\nroll: ${describeRandomTableRoll(phase.roll)}`,
      });
      edges.push({ from: ctx.procId, to: resId, relation: "grants" });

      for (const outcome of phase.outcomes) {
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

        if (outcome.phases === undefined) continue;

        const branchCtx: SpellCtx = { ...ctx, procId: branchId };
        let previousResolutionId: string | null = null;
        outcome.phases.forEach((nestedPhase, idx) => {
          const nestedResolutionId = tracePhase(
            nestedPhase,
            idx + 1,
            branchCtx,
            nodes,
            edges,
            ids,
          );
          if (previousResolutionId !== null) {
            edges.push({
              from: previousResolutionId,
              to: nestedResolutionId,
              relation: "branches_on_completion",
            });
          }
          previousResolutionId = nestedResolutionId;
        });
      }
      return resId;
    }
    default: {
      const _exhaustive: never = phase;
      throw new Error(`unhandled phase: ${String(_exhaustive)}`);
    }
  }
}

export function tracePhaseContinuation(
  continuation: import("../surface/types.ts").PhaseContinuation,
  hostId: string,
  ctx: SpellCtx,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const continuationId = ids("cont");
  nodes.push({
    id: continuationId,
    category: "window",
    atomKind: "repeat_continuation",
    label:
      continuation.when.kind === "damage_roll_has_duplicate_faces"
        ? `repeat_continuation\nwhen damage roll has duplicate faces (${continuation.when.minimumMultiplicity}+)`
        : "repeat_continuation",
  });
  edges.push({ from: hostId, to: continuationId, relation: "opens_window" });

  for (const limit of continuation.limits) {
    const limitId = ids("lim");
    nodes.push({
      id: limitId,
      category: "lifecycle",
      atomKind: "continuation_limit",
      label:
        limit.kind === "max_leaps_from_slot_level"
          ? "continuation_limit\nmax leaps from slot level"
          : "continuation_limit\nexclude already targeted in same cast",
    });
    edges.push({ from: continuationId, to: limitId, relation: "bounded_by" });
  }

  const branchCtx: SpellCtx = { ...ctx, procId: continuationId };
  let previousResolutionId: string | null = null;
  continuation.next.forEach((nestedPhase: ActivationPhase, idx: number) => {
    const nestedResolutionId = tracePhase(
      nestedPhase,
      idx + 1,
      branchCtx,
      nodes,
      edges,
      ids,
    );
    if (previousResolutionId !== null) {
      edges.push({
        from: previousResolutionId,
        to: nestedResolutionId,
        relation: "branches_on_completion",
      });
    }
    previousResolutionId = nestedResolutionId;
  });
}

export function traceEffectModeChoice(
  mode: CastTimeEffectModeChoice,
  procId: string,
  attId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const chooseId = ids("chz");
  const switchTag =
    mode.allowsMidDurationSwitchAs === "magic_action"
      ? "\nswitch: Magic action"
      : "";
  nodes.push({
    id: chooseId,
    category: "procedure",
    atomKind: "choose",
    label: `choose\n${mode.label}\n${mode.options
      .map((option) =>
        option.effects === undefined
          ? `${option.displayName} (DM-owned)`
          : option.displayName,
      )
      .join(" | ")}${switchTag}`,
  });
  edges.push({ from: procId, to: chooseId, relation: "prompts" });

  if (mode.allowsMidDurationSwitchAs === "magic_action") {
    const replaceId = ids("repl");
    nodes.push({
      id: replaceId,
      category: "procedure",
      atomKind: "replace",
      label: "replace\nmode via Magic action",
    });
    edges.push({ from: procId, to: replaceId, relation: "grants" });

    const quotaId = ids("q");
    nodes.push({
      id: quotaId,
      category: "resource",
      atomKind: "action_quota",
      label: "action_quota\n(mode switch)",
    });
    edges.push({ from: replaceId, to: quotaId, relation: "consumes" });
    edges.push({ from: replaceId, to: chooseId, relation: "prompts" });
  }

  for (const option of mode.options) {
    if (option.effects === undefined) continue;
    const modeId = ids("eff");
    nodes.push({
      id: modeId,
      category: "effect",
      atomKind: "composite",
      label: `mode\n${option.displayName}\n(${option.effects.length} effect${option.effects.length === 1 ? "" : "s"})`,
    });
    edges.push({ from: chooseId, to: modeId, relation: "modifies" });
    edges.push({ from: modeId, to: attId, relation: "attaches_to" });
    for (const effect of option.effects) {
      const effectId = traceEffectAtom(effect, nodes, ids, edges);
      if (effectId === null) continue;
      edges.push({ from: modeId, to: effectId, relation: "grants" });
      edges.push({ from: effectId, to: attId, relation: "attaches_to" });
      traceEffectAtomScaling(effect, effectId, slotId, nodes, edges, ids);
    }
  }
}

export function traceSaveBranch(
  e: EffectAtom,
  fromResolutionId: string,
  attId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const eId = traceEffectAtom(e, nodes, ids, edges);
  if (eId === null) return;
  edges.push({ from: fromResolutionId, to: eId, relation: "branches_on_save" });
  edges.push({ from: eId, to: attId, relation: "attaches_to" });
  traceEffectAtomScaling(e, eId, slotId, nodes, edges, ids);
}

export function traceAttackWindow(
  effects: ReadonlyArray<EffectAtom>,
  windowAtom: "on_hit_window" | "on_miss_window",
  attackRollId: string,
  attId: string,
  slotId: string | null,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const effectIds: string[] = [];
  for (const e of effects) {
    const effectId = traceEffectAtom(e, nodes, ids, edges);
    if (effectId === null) continue;
    effectIds.push(effectId);
  }
  if (effectIds.length === 0) return;
  const winId = ids("win");
  nodes.push({
    id: winId,
    category: "window",
    atomKind: windowAtom,
    label: windowAtom,
  });
  edges.push({ from: attackRollId, to: winId, relation: "opens_window" });
  for (let i = 0; i < effectIds.length; i++) {
    const effectId = effectIds[i]!;
    edges.push({ from: winId, to: effectId, relation: "grants" });
    edges.push({ from: effectId, to: attId, relation: "attaches_to" });
    traceEffectAtomScaling(effects[i]!, effectId, slotId, nodes, edges, ids);
  }
}
