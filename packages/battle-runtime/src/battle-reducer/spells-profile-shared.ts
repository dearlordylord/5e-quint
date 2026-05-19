import type { SpellSlotLevel } from "@dnd/shared/types";
import type {
  DiceExpr,
  TargetSelection,
} from "@dnd/surface/surface/types";

export function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value) => right.includes(value)) &&
    right.every((value) => left.includes(value))
  );
}

export function sameDiceExpr(left: DiceExpr, right: DiceExpr): boolean {
  return (
    left.dice === right.dice &&
    left.dieSize === right.dieSize &&
    (left.flat ?? 0) === (right.flat ?? 0)
  );
}

export function spellAttackSequencePartName(): "attack" {
  return "attack";
}

export function scalarBuffSpellTargetCount(
  selection: TargetSelection,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
): number | null {
  const countBySlot = targetCountBySlot(selection, spellLevel);
  return countBySlot === null ? null : countBySlot(slotLevel);
}

export function scalarBuffSpellTargetCountBySlot(
  selection: TargetSelection,
  spellLevel: number,
): ((slotLevel: SpellSlotLevel) => number) | null {
  return targetCountBySlot(selection, spellLevel);
}

export function targetCountBySlot(
  selection: TargetSelection,
  spellLevel: number,
): ((slotLevel: SpellSlotLevel) => number) | null {
  if (selection.mode === "one") {
    return () => 1;
  }
  if (selection.mode !== "choose_up_to" || selection.count === undefined) {
    return null;
  }
  const count = selection.count;
  if (typeof count === "number") {
    return () => count;
  }
  if (count.kind !== "linear") {
    return null;
  }
  const baseLevel = count.baseLevel ?? spellLevel;
  return (slotLevel) =>
    count.base +
    Math.max(0, Number(slotLevel) - baseLevel) * count.perSlotAboveBase;
}
