import type {
  BattleActiveEffect,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";

export function replaceTargetActiveEffect(
  state: BattleState,
  targetId: CombatantId,
  replaces: (effect: BattleActiveEffect) => boolean,
  replacement: BattleActiveEffect,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter((effect) => !replaces(effect)),
        replacement,
      ],
    }),
  };
}
