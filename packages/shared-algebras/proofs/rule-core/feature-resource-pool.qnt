// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.FEATURE_RESOURCES.TRANSITIONS

module featureResourcePool {
  type ResourcePoolFacts = {
    capacity: int,
    expended: int,
  }

  pure def legalResourcePool(pool: ResourcePoolFacts): bool = all {
    pool.capacity >= 0,
    pool.expended >= 0,
    pool.expended <= pool.capacity,
  }

  pure def resourcePoolRemaining(pool: ResourcePoolFacts): int =
    pool.capacity - pool.expended

  pure def canSpendResourcePool(pool: ResourcePoolFacts, spend: int): bool = all {
    legalResourcePool(pool),
    spend >= 0,
    spend <= resourcePoolRemaining(pool),
  }

  pure def spendResourcePool(pool: ResourcePoolFacts, spend: int): ResourcePoolFacts =
    pool.with("expended", pool.expended + spend)

  pure def canRecoverResourcePool(pool: ResourcePoolFacts, recovered: int): bool = all {
    legalResourcePool(pool),
    recovered >= 0,
    recovered <= pool.expended,
  }

  pure def recoverResourcePool(pool: ResourcePoolFacts, recovered: int): ResourcePoolFacts =
    pool.with("expended", if (pool.expended - recovered < 0) 0 else pool.expended - recovered)

  pure def recoverAllResourcePool(pool: ResourcePoolFacts): ResourcePoolFacts =
    pool.with("expended", 0)

  type FeatureResourceRestState = {
    layOnHandsPool: ResourcePoolFacts,
    wildShapeExpended: int,
    monkFocusExpended: int,
    sorceryPoints: ResourcePoolFacts,
    createdSpellSlots: ResourcePoolFacts,
    uncannyUsedSinceLongRest: bool,
  }

  pure def legalFeatureResourceRestState(state: FeatureResourceRestState): bool = all {
    legalResourcePool(state.layOnHandsPool),
    state.wildShapeExpended >= 0,
    state.monkFocusExpended >= 0,
    legalResourcePool(state.sorceryPoints),
    legalResourcePool(state.createdSpellSlots),
  }

  pure def recoverOneExpendedUse(expended: int): int =
    if (expended > 0) expended - 1 else 0

  pure def completeShortRestFeatureResourceRestState(state: FeatureResourceRestState): FeatureResourceRestState =
    state
      .with("wildShapeExpended", recoverOneExpendedUse(state.wildShapeExpended))
      .with("monkFocusExpended", 0)

  pure def completeLongRestFeatureResourceRestState(state: FeatureResourceRestState): FeatureResourceRestState =
    state
      .with("layOnHandsPool", recoverAllResourcePool(state.layOnHandsPool))
      .with("wildShapeExpended", 0)
      .with("monkFocusExpended", 0)
      .with("sorceryPoints", recoverAllResourcePool(state.sorceryPoints))
      .with("createdSpellSlots", { capacity: 0, expended: 0 })
      .with("uncannyUsedSinceLongRest", false)
}
