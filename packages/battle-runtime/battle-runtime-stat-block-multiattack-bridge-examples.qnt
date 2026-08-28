// -*- mode: Bluespec; -*-

module battleRuntimeStatBlockMultiattackBridgeExamples {
  import battleRuntimeStatBlockMultiattackBridge.* from "./battle-runtime-stat-block-multiattack-bridge"

  run test_synthetic_multiattack_dispatch_count_uses_stat_block_profile = {
    all {
      assert(battleRuntimeSyntheticMultiattackDispatchesAfterFirstAttack == 2),
      assert(battleRuntimeSyntheticMultiattackDispatchesAfterDispatch(2) == 1),
      assert(battleRuntimeSyntheticMultiattackDispatchesAfterDispatch(1) == 0),
    }
  }
}
