import type { BattleCreatureState, BattleState } from "@dnd/battle-runtime";

export function battleStateProjection(state: BattleState) {
  return {
    battleId: state.battleId,
    initiative: state.initiative,
    combatants: Array.from(state.combatants.values()).map(
      battleCreatureStateProjection,
    ),
    currentTurnResources: state.currentTurnResources,
  };
}

function battleCreatureStateProjection(combatant: BattleCreatureState) {
  return {
    combatantId: combatant.combatantId,
    displayName: combatant.displayName,
    initiative: combatant.initiative,
    hp: combatant.hp,
    maxHp: combatant.maxHp,
    tempHp: combatant.tempHp,
    originKind: combatant.origin.kind,
    zeroHpLifecycle: combatant.zeroHpLifecycle,
  };
}
