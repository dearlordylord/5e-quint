// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: bridge-owner BATTLE.STAT_BLOCK.LEGENDARY_ACTION_LIFECYCLE
module battleRuntimeLegendaryActions {
  import battleRuntimeStatBlockLegendaryActionBridge.* from "./battle-runtime-stat-block-legendary-action-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  pure def goblinLegendaryActionWindowIsOpen(state: BattleState): bool =
    state.lastTurnActor == LastTurnFighter and currentActor(state) != Goblin and not(state.legendaryActionWindowConsumed)

  pure def goblinLegendaryActionAvailable(state: BattleState): bool =
    battleRuntimeCanUseLegendaryAction(
      state.goblin.hp > 0,
      not(state.goblin.incapacitated) and not(state.goblin.unconscious),
      goblinLegendaryActionWindowIsOpen(state),
      state.legendaryActionWindowConsumed,
      state.goblin.legendaryUsesRemaining,
      2,
    )

  pure def spendGoblinLegendaryAction(state: BattleState): BattleState =
    if (goblinLegendaryActionAvailable(state))
      {
        ...state,
        goblin: { ...state.goblin, legendaryUsesRemaining: battleRuntimeLegendaryUsesAfterUse(
          state.goblin.legendaryUsesRemaining,
          2,
          goblinLegendaryActionWindowIsOpen(state),
          state.goblin.incapacitated or state.goblin.unconscious,
        ) },
        legendaryActionWindowConsumed: true,
      }
    else
      state
}
