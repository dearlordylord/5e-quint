// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.FEATURE_RESOURCES.TRANSITIONS
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.healing-resource-action character-sheet.monk-uncanny-metabolism-initiative-recovery

module featureResourceHitPointHealing {
  import hitPointDamage.* from "./hit-point-damage"
  import hitPointRecovery.* from "./hit-point-recovery"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"

  type FeatureResourceHitPointFacts = {
    currentHitPoints: int,
    hitPointMaximum: int,
    temporaryHitPoints: int,
  }

  pure def applyFeatureResourceHitPointHealing(
    hitPoints: FeatureResourceHitPointFacts,
    rawHealing: int,
  ): FeatureResourceHitPointFacts = {
    val healed = applyHitPointHealing({
      kind: PlayerCharacter,
      hitPoints: hitPoints.currentHitPoints,
      hitPointMaximum: hitPoints.hitPointMaximum,
      temporaryHitPoints: hitPoints.temporaryHitPoints,
      dead: false,
      unconscious: false,
    }, resetDeathSavingThrowLifecycle, NoPositiveHitPointUnconsciousRecovery, rawHealing)
    {
      currentHitPoints: healed.vitals.hitPoints,
      hitPointMaximum: healed.vitals.hitPointMaximum,
      temporaryHitPoints: healed.vitals.temporaryHitPoints,
    }
  }
}
