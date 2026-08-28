// -*- mode: Bluespec; -*-

module battleRuntimeStatBlockLegendaryActionBridgeExamples {
  import battleRuntimeStatBlockLegendaryActionBridge.* from "./battle-runtime-stat-block-legendary-action-bridge"

  run test_legendary_action_use_spends_one_resource = {
    all {
      assert(battleRuntimeCanUseLegendaryAction(true, true, true, false, 2, 2)),
      assert(not(battleRuntimeCanUseLegendaryAction(true, false, true, false, 2, 2))),
      assert(battleRuntimeLegendaryUsesAfterUse(2, 2, true, false) == 1),
      assert(battleRuntimeLegendaryUsesAfterUse(2, 2, true, true) == 2),
      assert(battleRuntimeLegendaryUsesAfterUse(2, 2, false, false) == 2),
    }
  }
}
