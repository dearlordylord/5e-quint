// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR

// Typed source facts for generic mixed-target spell routes. These facts describe
// one spell invocation's target/outcome/damage/projection shape without authored
// spell identity or adapter-local list-position coupling.
module battleRuntimeMixedTargetOutcomeRouteFacts {
  type MixedTargetOutcomeRouteTargetFact =
    | PrimaryTarget
    | SecondaryTarget
    | ObjectTarget

  type MixedTargetOutcomeResolutionFact =
    | AttackHitOutcome
    | AttackMissOutcome
    | SavingThrowFailedOutcome
    | SavingThrowSucceededOutcome

  type MixedTargetOutcomeDamageProjectionFact =
    | AttackDamageProjection
    | FullSavingThrowDamageProjection
    | HalfSavingThrowDamageProjection
    | NoDamageProjection

  type MixedTargetOutcomeSharedSpendFact =
    | SharedSpellSlotSpend
    | SharedCantripActionSpend

  type MixedTargetOutcomeSharedDamageRollFact =
    | SharedSavingThrowDamageRoll

  type MixedTargetOutcomeSecondaryProjectionFact =
    | ObjectBoundaryProjection
    | LightProjection
    | ConditionProjection
    | NextAttackRollModeProjection
    | BurstSavingThrowProjection
    | ChainedAttackTargetProjection

  type MixedTargetOutcomeRouteFact =
    | RouteMixedTargetOutcomeTarget({
        target: MixedTargetOutcomeRouteTargetFact,
      })
    | RouteMixedTargetOutcomeResolution({
        target: MixedTargetOutcomeRouteTargetFact,
        outcome: MixedTargetOutcomeResolutionFact,
      })
    | RouteMixedTargetOutcomeDamageProjection({
        target: MixedTargetOutcomeRouteTargetFact,
        damage: MixedTargetOutcomeDamageProjectionFact,
      })
    | RouteMixedTargetOutcomeSharedSpend({
        spend: MixedTargetOutcomeSharedSpendFact,
      })
    | RouteMixedTargetOutcomeSharedDamageRoll({
        roll: MixedTargetOutcomeSharedDamageRollFact,
      })
    | RouteMixedTargetOutcomeSecondaryProjection({
        target: MixedTargetOutcomeRouteTargetFact,
        projection: MixedTargetOutcomeSecondaryProjectionFact,
      })
}
