import type {
  GrazeMasteryMechanics,
  MasteryRecord,
  NickMasteryMechanics,
  OnHitRiderEffect,
  OnHitTriggerMechanics,
  RiderExpiry,
  SaveGateRiderResult,
} from "../surface/types.ts";
import { Match } from "effect";
import type { Trace, TraceEdge, TraceNode } from "./tracer-model.ts";
import { describeDc } from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";
import { traceRoot } from "./tracer-root.ts";

import { traceUsageLimit } from "./tracer-effect-scaling.ts";

// ============================================================
// Mastery tracer
// ============================================================

export function traceMasteryUnit(mastery: MasteryRecord): Trace {
  const { rootId, nodes, edges, ids } = traceRoot(
    "mastery_root",
    `mastery_root\n${mastery.name}`,
  );

  const resolutionId = Match.value(mastery.mechanics).pipe(
    Match.when({ family: "on_hit_trigger" }, (mechanics) =>
      traceOnHitTriggerMechanics(mechanics, nodes, edges, ids),
    ),
    Match.when({ family: "weapon_attack_miss_damage" }, (mechanics) =>
      traceGrazeMasteryMechanics(mechanics, nodes, edges, ids),
    ),
    Match.when({ family: "light_property_extra_attack_timing" }, (mechanics) =>
      traceNickMasteryMechanics(mechanics, nodes, edges, ids),
    ),
    Match.exhaustive,
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

function traceGrazeMasteryMechanics(
  mechanics: GrazeMasteryMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const resolutionId = ids("miss");
  nodes.push({
    id: resolutionId,
    category: "resolution",
    atomKind: "attack_roll",
    label: "attack_roll\nweapon attack miss",
  });

  const windowId = ids("win");
  nodes.push({
    id: windowId,
    category: "window",
    atomKind: "on_miss_window",
    label: mechanics.optional
      ? "on_miss_window\n(wielder choice)"
      : "on_miss_window",
  });
  edges.push({ from: resolutionId, to: windowId, relation: "opens_window" });

  const targetId = ids("att");
  nodes.push({
    id: targetId,
    category: "attachment",
    atomKind: "target",
    label: "target\n(primary)",
  });
  edges.push({ from: resolutionId, to: targetId, relation: "attaches_to" });

  const damageId = ids("damage");
  nodes.push({
    id: damageId,
    category: "effect",
    atomKind: "damage",
    label:
      `damage\n${mechanics.effect.amount.kind}\n` +
      `${mechanics.effect.damageType.kind}\n${mechanics.effect.increaseLimit}`,
  });
  edges.push({ from: windowId, to: damageId, relation: "grants" });
  edges.push({ from: damageId, to: targetId, relation: "attaches_to" });
  return resolutionId;
}

function traceNickMasteryMechanics(
  mechanics: NickMasteryMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const triggerId = ids("light-extra-attack");
  nodes.push({
    id: triggerId,
    category: "window",
    atomKind: "light_property_extra_attack",
    label: `${mechanics.trigger.kind}\noptional ${mechanics.optional}`,
  });

  const timingId = ids("timing");
  nodes.push({
    id: timingId,
    category: "effect",
    atomKind: "action_timing_replacement",
    label: `action_timing_replacement\n${mechanics.replacement.from} -> ${mechanics.replacement.to}`,
  });
  edges.push({ from: triggerId, to: timingId, relation: "replaces_with" });
  traceUsageLimit(
    mechanics.usageLimit,
    timingId,
    "consumes",
    nodes,
    edges,
    ids,
  );
  return triggerId;
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
      return "weaponFilter" in t
        ? `(hit with attack roll, ${t.weaponFilter}, ${t.eligibility})`
        : `(hit with attack roll, ${t.attackFilter}, ${t.prerequisite}, ${t.hitLimit})`;
    /* v8 ignore start -- @preserve -- the decoded on-hit trigger union is exhausted above */
    default: {
      const _: never = t;
      throw new Error(`unhandled on-hit trigger: ${String(_)}`);
    }
    /* v8 ignore stop -- @preserve */
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
    case "push_creature": {
      const pushId = ids("push");
      nodes.push({
        id: pushId,
        category: "effect",
        atomKind: "push_creature",
        label: `push_creature\nup to ${e.maxDistanceFeet} ft\n${e.direction}\nmax size ${e.maximumTargetSize}`,
      });
      edges.push({ from: winId, to: pushId, relation: "grants" });
      edges.push({ from: pushId, to: targetId, relation: "attaches_to" });
      return;
    }
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
    case "speed_delta": {
      const speedId = ids("spd");
      nodes.push({
        id: speedId,
        category: "effect",
        atomKind: "speed_delta",
        label: `speed_delta\n${e.deltaFeet} ft\nmax reduction ${e.maximumReductionFeet} ft`,
      });
      edges.push({ from: winId, to: speedId, relation: "grants" });
      edges.push({ from: speedId, to: targetId, relation: "attaches_to" });
      traceRiderExpiry(e.expiresOn, speedId, nodes, edges, ids);
      return;
    }
    /* v8 ignore start -- @preserve -- OnHitRiderEffect is a decoded tagged union exhausted above */
    default: {
      const _: never = e;
      throw new Error(`unhandled on-hit rider effect: ${String(_)}`);
    }
    /* v8 ignore stop -- @preserve */
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
    /* v8 ignore start -- @preserve -- SaveGateRiderResult is a decoded tagged union exhausted above */
    default: {
      const _: never = r;
      throw new Error(`unhandled save gate result: ${String(_)}`);
    }
    /* v8 ignore stop -- @preserve */
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
    case "start_of_attacker_next_turn":
      nodes.push({
        id: winId,
        category: "window",
        atomKind: "turn_start_window",
        label: "turn_start_window\n(attacker's next turn)",
      });
      break;
    /* v8 ignore start -- @preserve -- RiderExpiry is a decoded tagged union exhausted above */
    default: {
      const _: never = x;
      throw new Error(`unhandled rider expiry: ${String(_)}`);
    }
    /* v8 ignore stop -- @preserve */
  }
  edges.push({ from: effId, to: winId, relation: "persists_until" });
}
