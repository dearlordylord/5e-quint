// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL
module battleRuntimeLegendaryActions {
  import battleRuntimeStatBlockBridge.* from "./battle-runtime-stat-block-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  pure def goblinLegendaryActionWindowIsOpen(state: BattleState): bool =
    state.lastTurnActor == LastTurnFighter and currentActor(state) != Goblin and not(state.legendaryActionWindowConsumed)

  pure def goblinLegendaryActionAvailable(state: BattleState): bool =
    battleRuntimeCanUseLegendaryAction(
      state.goblin.hp > 0,
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
          state.goblin.incapacitated,
        ) },
        legendaryActionWindowConsumed: true,
      }
    else
      state
}
