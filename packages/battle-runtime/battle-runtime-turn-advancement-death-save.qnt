// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE

module battleRuntimeTurnAdvancementDeathSave {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"

  pure def endTurnWithDeathSave(state: BattleState, deathSaveRoll: int): BattleState = {
    val advanced = endTurn(state)

    if (currentActor(advanced) == Fighter)
      { ...advanced, fighter: applyStartTurnDeathSave(advanced.fighter, deathSaveRoll) }
    else
      advanced
  }
}
