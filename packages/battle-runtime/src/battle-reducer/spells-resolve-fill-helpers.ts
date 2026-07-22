// Small fill-selection helpers shared by spell resolution modules.

import type {
  BattleConcentrationSavingThrowHole,
  BattleFill,
} from "../battle-state-execution.ts";

export function concentrationSavingThrowFillFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[],
  hole: BattleConcentrationSavingThrowHole,
):
  | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
  | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}
