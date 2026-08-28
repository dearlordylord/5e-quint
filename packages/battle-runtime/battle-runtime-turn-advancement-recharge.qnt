// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-LIMITED-USAGE-001
// UNIT-PROFILE-COVERAGE: qnt-owner stat-block.resource-lifecycle
// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.RESOURCE_LIFECYCLE

module battleRuntimeTurnAdvancementRecharge {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeStatBlockBridge.* from "./battle-runtime-stat-block-bridge"

  pure def endTurnWithGoblinRechargeRoll(state: BattleState, roll: int): BattleState = {
    val advanced = endTurn(state)
    if (currentActor(advanced) == Goblin and not(advanced.goblin.rechargeAvailable))
      { ...advanced, goblin: { ...advanced.goblin, rechargeAvailable: battleRuntimeRechargeAvailableAfterRoll(advanced.goblin.rechargeAvailable, 5, roll) } }
    else
      advanced
  }
}
