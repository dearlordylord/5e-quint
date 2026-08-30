// -*- mode: Bluespec; -*-

module battleRuntimeTurnAdvancementRechargeTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnAdvancementRecharge.* from "./battle-runtime-turn-advancement-recharge"
  import statBlockResourceLifecycle.* from "../shared-algebras/proofs/rule-core/stat-block-resource-lifecycle"

  run test_goblin_recharge_roll_restores_available_part_on_success = {
    val spentRecharge = { ...initialState, goblin: { ...initialState.goblin, rechargeAvailable: false } }
    val failed = endTurnWithGoblinRechargeRoll(spentRecharge, RechargeD6Four)
    val succeeded = endTurnWithGoblinRechargeRoll(spentRecharge, RechargeD6Five)
    all {
      assert(not(failed.goblin.rechargeAvailable)),
      assert(succeeded.goblin.rechargeAvailable),
    }
  }
}
