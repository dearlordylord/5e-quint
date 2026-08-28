// -*- mode: Bluespec; -*-

module battleRuntimeStatBlockRechargeBridgeExamples {
  import battleRuntimeStatBlockRechargeBridge.* from "./battle-runtime-stat-block-recharge-bridge"

  run test_recharge_roll_uses_stat_block_resource_contract = {
    all {
      assert(not(battleRuntimeRechargeAvailableAfterRoll(false, 5, 4))),
      assert(battleRuntimeRechargeAvailableAfterRoll(false, 5, 5)),
      assert(battleRuntimeRechargeAvailableAfterRoll(true, 5, 1)),
    }
  }
}
