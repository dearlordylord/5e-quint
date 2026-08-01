import type { BattleFill, BattleHoleId } from "../battle-state-execution.ts";
import { SPELL_CAST_REACTION_FACTS_HOLE_ID } from "./battle-runtime-protocol.ts";

export function fillsBelongToDeclaredHoles(
  fills: readonly BattleFill[],
  declaredHoleIds: readonly BattleHoleId[],
): boolean {
  const declaredHoles = new Set(declaredHoleIds);
  return fills.every((fill) => declaredHoles.has(fill.holeId));
}

export function savingThrowOutcomeFillForHole(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[],
  hole: { readonly holeId: BattleHoleId },
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

export function rolledDiceFillForHole(
  fills: readonly Extract<BattleFill, { readonly kind: "rolledDice" }>[],
  hole: { readonly holeId: BattleHoleId },
): Extract<BattleFill, { readonly kind: "rolledDice" }> | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

export function everyFillUsesHoleId(
  fills: readonly { readonly holeId: BattleHoleId }[],
  expectedHoleId: BattleHoleId,
): boolean {
  return fills.every((fill) => fill.holeId === expectedHoleId);
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
