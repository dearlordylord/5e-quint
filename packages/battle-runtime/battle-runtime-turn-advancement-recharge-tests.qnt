// -*- mode: Bluespec; -*-

module battleRuntimeTurnAdvancementRechargeTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnAdvancementRecharge.* from "./battle-runtime-turn-advancement-recharge"

  run test_goblin_recharge_roll_restores_available_part_on_success = {
    val spentRecharge = { ...initialState, goblin: { ...initialState.goblin, rechargeAvailable: false } }
    val failed = endTurnWithGoblinRechargeRoll(spentRecharge, 4)
    val succeeded = endTurnWithGoblinRechargeRoll(spentRecharge, 5)
    all {
      assert(not(failed.goblin.rechargeAvailable)),
      assert(succeeded.goblin.rechargeAvailable),
    }
  }
}
