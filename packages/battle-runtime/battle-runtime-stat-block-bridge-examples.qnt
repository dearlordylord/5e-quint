// -*- mode: Bluespec; -*-

module battleRuntimeStatBlockBridgeExamples {
  import statBlockControls.* from "../shared-algebras/proofs/rule-core/stat-block-controls"
  import battleRuntimeStatBlockBridge.* from "./battle-runtime-stat-block-bridge"

  run test_recharge_roll_uses_stat_block_resource_contract = {
    all {
      assert(not(battleRuntimeRechargeAvailableAfterRoll(false, 5, 4))),
      assert(battleRuntimeRechargeAvailableAfterRoll(false, 5, 5)),
      assert(battleRuntimeRechargeAvailableAfterRoll(true, 5, 1)),
    }
  }

  run test_legendary_action_use_spends_one_resource = {
    all {
      assert(battleRuntimeCanUseLegendaryAction(true, true, false, 2, 2)),
      assert(battleRuntimeLegendaryUsesAfterUse(2, 2, true, false) == 1),
      assert(battleRuntimeLegendaryUsesAfterUse(2, 2, false, false) == 2),
    }
  }

  run test_goblin_multiattack_dispatch_count_uses_stat_block_profile = {
    all {
      assert(battleRuntimeGoblinMultiattackDispatchesAfterFirstAttack == 2),
      assert(battleRuntimeGoblinMultiattackDispatchesAfterDispatch(2) == 1),
      assert(battleRuntimeGoblinMultiattackDispatchesAfterDispatch(1) == 0),
    }
  }
}
