// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.FEATURE_RESOURCES.TRANSITIONS
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.healing-resource-action

module layOnHandsResource {
  import featureResourceHitPointHealing.* from "./feature-resource-hit-point-healing"
  import featureResourcePool.* from "./feature-resource-pool"

  type LayOnHandsResourceProjection = {
    healingPool: ResourcePoolFacts,
    targetHitPoints: FeatureResourceHitPointFacts,
    conditionRemoved: bool,
  }

  pure def layOnHandsConditionRemovalCost: int = 5

  pure def layOnHandsPoolSpend(
    restoredHitPoints: int,
    removedConditionCount: int,
  ): int =
    restoredHitPoints + (removedConditionCount * layOnHandsConditionRemovalCost)

  pure def canApplyLayOnHandsResource(
    healingPool: ResourcePoolFacts,
    restoredHitPoints: int,
    removedConditionCount: int,
  ): bool = all {
    restoredHitPoints >= 0,
    removedConditionCount >= 0,
    canSpendResourcePool(healingPool, layOnHandsPoolSpend(restoredHitPoints, removedConditionCount)),
  }

  pure def applyLayOnHandsResource(
    healingPool: ResourcePoolFacts,
    targetHitPoints: FeatureResourceHitPointFacts,
    restoredHitPoints: int,
    removedConditionCount: int,
  ): LayOnHandsResourceProjection = {
    val poolSpend = layOnHandsPoolSpend(restoredHitPoints, removedConditionCount)
    {
      healingPool: spendResourcePool(healingPool, poolSpend),
      targetHitPoints: applyFeatureResourceHitPointHealing(targetHitPoints, restoredHitPoints),
      conditionRemoved: removedConditionCount > 0,
    }
  }
}
