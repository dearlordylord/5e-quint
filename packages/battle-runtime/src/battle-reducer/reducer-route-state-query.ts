import type {
  BattleActiveEffect,
  BattleState,
} from "../battle-state-execution.ts";

export function battleActiveEffects(
  state: BattleState,
): readonly BattleActiveEffect[] {
  return [...state.combatants.values()].flatMap(
    (combatant) => combatant.activeEffects,
  );
}
