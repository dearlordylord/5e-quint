import type { BattleFill } from "@dnd/battle-runtime";

export function targetIdFromFills(fills: readonly BattleFill[]): string | null {
  for (const fill of fills) {
    if (fill.kind === "targetChoice") return fill.value;
    if (fill.kind === "spellTargetAllocation") {
      return fill.value.allocations[0]?.targetId ?? null;
    }
  }
  return null;
}

export function hasFillKind(
  fills: readonly BattleFill[],
  kind: BattleFill["kind"],
): boolean {
  return fills.some((fill) => fill.kind === kind);
}
