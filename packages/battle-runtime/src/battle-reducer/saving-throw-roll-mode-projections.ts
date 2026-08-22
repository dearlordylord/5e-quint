import type { BattleSavingThrowRollModeProjection } from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { mechanicalD20TestRollMode } from "../d20-test-circumstance.ts";

type SavingThrowRollModeSources = Readonly<{
  readonly advantage: boolean;
  readonly disadvantage: boolean;
}>;

function addSavingThrowRollModeSource(
  existing: SavingThrowRollModeSources | undefined,
  rollMode: BattleSavingThrowRollModeProjection["rollMode"],
): SavingThrowRollModeSources {
  return {
    advantage:
      existing?.advantage === true ||
      rollMode === "advantage" ||
      rollMode === "normal",
    disadvantage:
      existing?.disadvantage === true ||
      rollMode === "disadvantage" ||
      rollMode === "normal",
  };
}

function savingThrowRollModeProjection(
  targetId: CombatantId,
  sources: SavingThrowRollModeSources | undefined,
): readonly BattleSavingThrowRollModeProjection[] {
  if (sources === undefined) return [];
  const rollMode = mechanicalD20TestRollMode(sources);
  return rollMode === undefined ? [] : [{ targetId, rollMode }];
}

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
    rollModeSources.set(
      projection.targetId,
      addSavingThrowRollModeSource(existing, projection.rollMode),
    );
  }
  return targetOrder.flatMap((targetId) =>
    savingThrowRollModeProjection(targetId, rollModeSources.get(targetId)),
  );
}
