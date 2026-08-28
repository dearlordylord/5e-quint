// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: bridge-owner BATTLE.STAT_BLOCK.RESOURCE_LIFECYCLE

module battleRuntimeStatBlockRechargeBridge {
  import statBlockResourceLifecycle.* from "../shared-algebras/proofs/rule-core/stat-block-resource-lifecycle"

  pure def battleRuntimeRechargeAvailableAfterRoll(
    available: bool,
    minimumRoll: StatBlockRechargeMinimumRoll,
    roll: StatBlockRechargeD6Result
  ): bool = {
    val recharge = { minimumRoll: minimumRoll, available: available }
    processStatBlockRechargeRoll(recharge, roll).available
  }
}
