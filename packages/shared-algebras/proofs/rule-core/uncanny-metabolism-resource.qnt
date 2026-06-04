// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.FEATURE_RESOURCES.TRANSITIONS
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.class-feature-long-rest-use-state character-sheet.monk-uncanny-metabolism-initiative-recovery

module uncannyMetabolismResource {
  import featureResourceHitPointHealing.* from "./feature-resource-hit-point-healing"
  import featureResourcePool.* from "./feature-resource-pool"

  type UncannyMetabolismProjection = {
    focusPoints: ResourcePoolFacts,
    hitPoints: FeatureResourceHitPointFacts,
    usedSinceLongRest: bool,
  }

  pure def canUseUncannyMetabolism(usedSinceLongRest: bool): bool =
    not(usedSinceLongRest)

  pure def uncannyMetabolismHealing(
    monkLevel: int,
    martialArtsRoll: int,
  ): int =
    monkLevel + martialArtsRoll

  pure def applyUncannyMetabolism(
    focusPoints: ResourcePoolFacts,
    hitPoints: FeatureResourceHitPointFacts,
    monkLevel: int,
    martialArtsRoll: int,
  ): UncannyMetabolismProjection = {
    {
      focusPoints: recoverAllResourcePool(focusPoints),
      hitPoints: applyFeatureResourceHitPointHealing(hitPoints, uncannyMetabolismHealing(monkLevel, martialArtsRoll)),
      usedSinceLongRest: true,
    }
  }
}
