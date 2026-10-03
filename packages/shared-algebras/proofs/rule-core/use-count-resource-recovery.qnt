// KERNEL-COVERAGE: qnt-owner SHEET.FEATURE_RESOURCES.USE_COUNT_RECOVERY
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.use-count-resource-recovery
// RAW: SRD 5.2.1 classes.md:908-912 (Font of Inspiration).
module useCountResourceRecovery {
  import featureResourcePool.* from "./feature-resource-pool"
  type RecoveryState = { usePool: ResourcePoolFacts, slotPool: ResourcePoolFacts }
  pure def canExchangeSlotForUse(state: RecoveryState): bool = all {
    canRecoverResourcePool(state.usePool, 1),
    canSpendResourcePool(state.slotPool, 1),
  }
  pure def exchangeSlotForUse(state: RecoveryState): RecoveryState =
    { usePool: recoverResourcePool(state.usePool, 1), slotPool: spendResourcePool(state.slotPool, 1) }
  pure def restRecovery(pool: ResourcePoolFacts, recoveryFeatureInstalled: bool, isLongRest: bool): ResourcePoolFacts =
    if (recoveryFeatureInstalled or isLongRest) recoverAllResourcePool(pool) else pool
}
