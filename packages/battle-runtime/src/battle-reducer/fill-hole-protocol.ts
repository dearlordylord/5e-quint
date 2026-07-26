import type { BattleFill, BattleHoleId } from "../battle-state-execution.ts";
import { SPELL_CAST_REACTION_FACTS_HOLE_ID } from "./battle-runtime-protocol.ts";

export function fillsBelongToDeclaredHoles(
  fills: readonly BattleFill[],
  declaredHoleIds: readonly BattleHoleId[],
): boolean {
  const declaredHoles = new Set(declaredHoleIds);
  return fills.every((fill) => declaredHoles.has(fill.holeId));
}

export function fillsBelongToSpellCastHoles(
  fills: readonly BattleFill[],
  additionalHoleIds: readonly BattleHoleId[] = [],
): boolean {
  return fillsBelongToDeclaredHoles(fills, [
    SPELL_CAST_REACTION_FACTS_HOLE_ID,
    ...additionalHoleIds,
  ]);
}
