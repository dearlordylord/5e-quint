import type {
  MasteryRecord,
  OnHitRiderEffect,
  OnHitTriggerMechanics,
  RiderExpiry,
  SaveGateRiderResult,
} from "../surface/types.ts";
import type { Trace, TraceEdge, TraceNode } from "./tracer-model.ts";
import { describeDc, idGen } from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

import { traceUsageLimit } from "./tracer-effect-scaling.ts";

// ============================================================
// Mastery tracer
// ============================================================

export function traceMasteryUnit(mastery: MasteryRecord): Trace {
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

  const resolutionId = traceOnHitTriggerMechanics(
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

export function traceOnHitTriggerMechanics(
  m: OnHitTriggerMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  // Subgraph G — On-Hit Rider. The source roots an attack_roll resolution;
  // that resolution opens an on_hit_window which grants the rider effect.
  const resId = ids("res");
  nodes.push({
    id: resId,
    category: "resolution",
    atomKind: "attack_roll",
    label: `attack_roll\n${describeOnHitTrigger(m.trigger)}`,
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

  traceOnHitRiderEffect(m.effect, winId, targetId, nodes, edges, ids);

  const fenceId = traceUsageLimit(
    "usageLimit" in m ? m.usageLimit : undefined,
    winId,
    "consumes",
    nodes,
    edges,
    ids,
  );
  if (fenceId !== null) {
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

export function describeOnHitTrigger(
  t: OnHitTriggerMechanics["trigger"],
): string {
  switch (t.kind) {
    case "weapon_hit":
      return "(any weapon hit)";
    case "weapon_hit_melee_only":
      return "(melee weapon hit only)";
    case "weapon_hit_with_damage":
      return "(weapon hit with damage)";
    case "hit_with_attack_roll":
      return `(hit with attack roll, ${t.weaponFilter}, ${t.eligibility})`;
    default: {
      const _: never = t;
      throw new Error(`unhandled on-hit trigger: ${String(_)}`);
    }
  }
}

export function traceOnHitRiderEffect(
  e: OnHitRiderEffect,
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
    case "reroll_weapon_damage_dice": {
      const rerollId = ids("rr");
      nodes.push({
        id: rerollId,
        category: "effect",
        atomKind: "reroll_weapon_damage_dice",
        label: `reroll_weapon_damage_dice\nscope=${e.diceScope}\nchoose=${e.choose}`,
      });
      edges.push({ from: winId, to: rerollId, relation: "grants" });
      edges.push({ from: rerollId, to: targetId, relation: "attaches_to" });
      return;
    }
    case "add_attack_damage_dice": {
      const damageId = ids("dmg");
      nodes.push({
        id: damageId,
        category: "effect",
        atomKind: "damage",
        label:
          `add_attack_damage_dice\n` +
          `class level table d${e.dice.dieSize}\n` +
          `type ${e.damageType}`,
      });
      edges.push({ from: winId, to: damageId, relation: "grants" });
      edges.push({ from: damageId, to: targetId, relation: "attaches_to" });
      return;
    }
    default: {
      const _: never = e;
      throw new Error(`unhandled on-hit rider effect: ${String(_)}`);
    }
  }
}

export function traceSaveGateResult(
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

export function traceRiderExpiry(
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
    case "caster_turn_start":
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_start_window",
        label: "turn_start_window\n(caster's next turn)",
      });
      break;
    default: {
      const _: never = x;
      throw new Error(`unhandled rider expiry: ${String(_)}`);
    }
  }
  edges.push({ from: effId, to: winId, relation: "persists_until" });
}
