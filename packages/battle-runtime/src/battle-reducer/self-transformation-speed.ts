import type { BattleSpecialSpeedKind } from "../battle-subjects.ts";
import type { BattleActiveEffect } from "../battle-state-execution.ts";

export function selfTransformationModeSpecialSpeedKind(
  effect: BattleActiveEffect,
): BattleSpecialSpeedKind | null {
  return effect.kind === "selfTransformation" &&
    effect.mode === "aquaticAdaptation"
    ? "swim"
    : null;
}
