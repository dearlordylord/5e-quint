// -*- mode: Bluespec; -*-

module battleRuntimeStatBlockRechargeBridgeExamples {
  import battleRuntimeStatBlockRechargeBridge.* from "./battle-runtime-stat-block-recharge-bridge"
  import statBlockResourceLifecycle.* from "../shared-algebras/proofs/rule-core/stat-block-resource-lifecycle"

  run test_recharge_roll_uses_stat_block_resource_contract = {
    all {
      assert(not(battleRuntimeRechargeAvailableAfterRoll(false, RechargeMinimumFive, RechargeD6One))),
      assert(not(battleRuntimeRechargeAvailableAfterRoll(false, RechargeMinimumFive, RechargeD6Two))),
      assert(not(battleRuntimeRechargeAvailableAfterRoll(false, RechargeMinimumFive, RechargeD6Three))),
      assert(not(battleRuntimeRechargeAvailableAfterRoll(false, RechargeMinimumFive, RechargeD6Four))),
      assert(battleRuntimeRechargeAvailableAfterRoll(false, RechargeMinimumFive, RechargeD6Five)),
      assert(battleRuntimeRechargeAvailableAfterRoll(false, RechargeMinimumFive, RechargeD6Six)),
      assert(battleRuntimeRechargeAvailableAfterRoll(true, RechargeMinimumFive, RechargeD6One)),
    }
  }
}
