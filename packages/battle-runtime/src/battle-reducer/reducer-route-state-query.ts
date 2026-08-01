import type {
  BattleActiveEffect,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";

export function battleActiveEffects(
  state: BattleState,
): readonly BattleActiveEffect[] {
  return [...state.combatants.values()].flatMap(
    (combatant) => combatant.activeEffects,
  );
}

export function combatantConcentrationChanged(
  before: BattleState,
  after: BattleState,
  combatantId: CombatantId,
): boolean {
  return (
    before.combatants.get(combatantId)?.concentration !==
    after.combatants.get(combatantId)?.concentration
  );
}

export function combatantsConcentrationChanged(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some((combatant) =>
    combatantConcentrationChanged(before, after, combatant.combatantId),
  );
}

export function combatantsActiveEffectsChanged(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some(
    (combatant) =>
      before.combatants.get(combatant.combatantId)?.activeEffects !==
      combatant.activeEffects,
  );
}

export function combatantsActiveEffectCountIncreased(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some(
    (combatant) =>
      combatant.activeEffects.length >
      (before.combatants.get(combatant.combatantId)?.activeEffects.length ?? 0),
  );
}

export function combatantsTemporaryHitPointsIncreased(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some(
    (combatant) =>
      Number(combatant.tempHp) >
      Number(before.combatants.get(combatant.combatantId)?.tempHp ?? 0),
  );
}

export function combatantsConditionsChanged(
  before: BattleState,
  after: BattleState,
): boolean {
  return [...after.combatants.values()].some((combatant) => {
    const beforeConditions = before.combatants.get(
      combatant.combatantId,
    )?.conditions;
    return (
      beforeConditions !== undefined &&
      !conditionStatesEqual(beforeConditions, combatant.conditions)
    );
  });
}

export function battleCombatantHasActiveEffectKind(
  state: BattleState,
  combatantId: CombatantId,
  kind: BattleActiveEffect["kind"],
): boolean {
  return (
    state.combatants
      .get(combatantId)
      ?.activeEffects.some((effect) => effect.kind === kind) ?? false
  );
}

export function targetDamagedByCasterOrAllySpellConditionRemoved(
  before: BattleState,
  after: BattleState,
): boolean {
  for (const beforeCombatant of before.combatants.values()) {
    const afterCombatant = after.combatants.get(beforeCombatant.combatantId);
    if (afterCombatant === undefined) {
      continue;
    }
    const beforeCount = targetDamagedByCasterOrAllySpellConditionCount(
      beforeCombatant.activeEffects,
    );
    const afterCount = targetDamagedByCasterOrAllySpellConditionCount(
      afterCombatant.activeEffects,
    );
    if (afterCount < beforeCount) {
      return true;
    }
  }
  return false;
}

function targetDamagedByCasterOrAllySpellConditionCount(
  activeEffects: readonly BattleActiveEffect[],
): number {
  return activeEffects.filter(
    (effect) =>
      effect.kind === "spellCondition" &&
      effect.condition === "charmed" &&
      effect.escape?.kind === "targetDamagedByCasterOrAlly",
  ).length;
}

import { conditionStatesEqual } from "@dnd/shared-algebras/conditions-algebra";
