import type {
  Attachment,
  DiceAmount,
  DiceExpr,
  DiceExprDelta,
} from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import { describeDelta_, describeExpr } from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

export function traceTargetCountScaling(
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
  if (selection === null || selection.mode !== "choose_up_to") return;
  // Fixed count (Aid: "up to three creatures" — no upcast on count) has
  // no scaling node; the spell's upcast acts elsewhere.
  if (typeof selection.count === "number") return;
  if (selection.count.kind !== "linear") return;
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
export function traceDiceAmountScaling(
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
    case "threshold_tiers_exploding_max_die": {
      const scId = ids("sc");
      const tierText = amt.tiers
        .map((t) => `L${t.atLevel}:${t.dice}d${amt.dieSize}`)
        .join(" | ");
      nodes.push({
        id: scId,
        category: "scaling",
        atomKind: scalingAtomFor(amt),
        label:
          `${scalingAtomFor(amt)}\naxis=${amt.axis}\n` +
          `base ${amt.baseDice}d${amt.dieSize}; tiers: ${tierText}\n` +
          `explode on d${amt.dieSize} max; max extra dice=spellcasting ability modifier`,
      });
      edges.push({ from: scId, to: effectId, relation: "modifies" });
      if (amt.axis === "slot" && slotId !== null) {
        edges.push({ from: slotId, to: scId, relation: "modifies" });
      }
      return;
    }
    case "resource_spent":
      // No scaling node — the amount is determined by the activation's
      // resource expenditure, not a character or slot axis. The
      // describe side renders the label "= resource spent".
      return;
    case "proficiency_bonus": {
      const scId = ids("sc");
      nodes.push({
        id: scId,
        category: "scaling",
        atomKind: "scale_numeric_bonus",
        label: "scale_numeric_bonus\naxis=proficiency_bonus",
      });
      edges.push({ from: scId, to: effectId, relation: "modifies" });
      return;
    }
    case "resource_spent_linear": {
      const scId = ids("sc");
      const deltaText = describeDelta_(amt.perResource, amt.base);
      const maxText =
        amt.maximum === undefined ? "" : `\nmax ${describeExpr(amt.maximum)}`;
      nodes.push({
        id: scId,
        category: "scaling",
        atomKind: scalingAtomFor(amt),
        label:
          `${scalingAtomFor(amt)}\naxis=resource_spent\n` +
          `base ${describeExpr(amt.base)}\n` +
          `+${deltaText} per resource spent${maxText}`,
      });
      edges.push({ from: scId, to: effectId, relation: "modifies" });
      return;
    }
    case "linked":
      // §A14: no scaling node — the amount is derived from another
      // atom's resolved output in the same phase. Any slot/character
      // scaling already lives on the source damage atom and
      // propagates through the link.
      return;
    default: {
      const _exhaustive: never = amt;
      throw new Error(`unhandled dice amount: ${String(_exhaustive)}`);
    }
  }
}

// Pick the v4 scaling atom kind based on what this scaling actually
// changes. Die size changes → scale_die_size. Die count changes →
// scale_die_count. Only flat changes → scale_numeric_bonus.
export function scalingAtomFor(amt: DiceAmount): string {
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
  if (amt.kind === "threshold_tiers_exploding_max_die") {
    return "scale_die_count";
  }
  if (amt.kind === "resource_spent_linear") {
    if (amt.perResource.dieSize !== undefined) return "scale_die_size";
    if (amt.perResource.dice !== undefined) return "scale_die_count";
    return "scale_numeric_bonus";
  }
  return "scale_numeric_bonus";
}

export function describeTierOverride(d: DiceExprDelta, base: DiceExpr): string {
  const dice = d.dice ?? base.dice;
  const dieSize = d.dieSize ?? base.dieSize;
  const flat = d.flat ?? base.flat;
  return `${dice}d${dieSize}${flat !== undefined && flat !== 0 ? `+${flat}` : ""}`;
}
