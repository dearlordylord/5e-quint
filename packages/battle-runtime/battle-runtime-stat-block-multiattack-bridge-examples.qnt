// -*- mode: Bluespec; -*-

module battleRuntimeStatBlockMultiattackBridgeExamples {
  import battleRuntimeStatBlockMultiattackBridge.* from "./battle-runtime-stat-block-multiattack-bridge"

  run test_synthetic_multiattack_dispatch_count_uses_stat_block_profile = {
    val afterActivation = battleRuntimeSyntheticMultiattackDispatchCountAfterActivation
    val afterFirstDispatch = battleRuntimeStatBlockMultiattackDispatchCountAfterDispatch(afterActivation)
    val afterSecondDispatch = battleRuntimeStatBlockMultiattackDispatchCountAfterDispatch(afterFirstDispatch)
    val afterThirdDispatch = battleRuntimeStatBlockMultiattackDispatchCountAfterDispatch(afterSecondDispatch)
    all {
      assert(afterActivation == 3),
      assert(afterFirstDispatch == 2),
      assert(afterSecondDispatch == 1),
      assert(afterThirdDispatch == 0),
      assert(battleRuntimeStatBlockMultiattackDispatchCountAfterDispatch(afterThirdDispatch) == 0),
    }
  }
}
