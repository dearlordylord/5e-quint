import type { BattleSavingThrowRollModeProjection } from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";

export function uniqueSavingThrowRollModeProjections(
  projections: readonly BattleSavingThrowRollModeProjection[],
): readonly BattleSavingThrowRollModeProjection[] {
  const targetOrder: CombatantId[] = [];
  const rollModeSources = new Map<
    CombatantId,
    { readonly advantage: boolean; readonly disadvantage: boolean }
  >();
  for (const projection of projections) {
    const existing = rollModeSources.get(projection.targetId);
    if (existing === undefined) {
      targetOrder.push(projection.targetId);
    }
    rollModeSources.set(projection.targetId, {
      advantage:
        existing?.advantage === true || projection.rollMode === "advantage",
      disadvantage:
        existing?.disadvantage === true ||
        projection.rollMode === "disadvantage",
    });
  }
  return targetOrder.flatMap((targetId) => {
    const sources = rollModeSources.get(targetId);
    if (sources === undefined || sources.advantage === sources.disadvantage) {
      return [];
    }
    return [
      {
        targetId,
        rollMode: sources.advantage ? "advantage" : "disadvantage",
      },
    ] satisfies readonly BattleSavingThrowRollModeProjection[];
  });
}
