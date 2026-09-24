// -*- mode: Bluespec; -*-

module attackDamageCompositionInductive {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import attackRollDamageDiceCore.* from "./attack-roll-damage-dice-core"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"

  var qHitPoints: int
  var qHitPointMaximum: int
  var qTemporaryHitPoints: int
  var qDead: bool
  var qUnconscious: bool
  var qDeathSavingThrows: DeathSavingThrowLifecycle
  var qPositiveRecovery: PositiveHitPointUnconsciousRecovery
  var qActionQuota: ActionQuota
  var qAttackRollOutcome: AttackRollOutcome

  pure def criticalDamageFixtureResult: AttackProcedureResult =
    resolveAttackProcedure(
      ActionAvailable,
      {
        capability: MeleeReachRangeCapability({ reachFeet: 5 }),
        distanceFeet: 5,
      },
      {
        naturalD20: 20,
        total: 8,
        armorClass: 20,
        criticalThreshold: 20,
      },
      { advantage: false, disadvantage: false },
      {
        kind: PlayerCharacter,
        hitPoints: 6,
        hitPointMaximum: 12,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      {
        attackKind: MeleeAttack,
        damageType: SlashingDamage,
        rolledDamage: 6,
        damageModifier: 0,
        targetAdjustments: noDamageAdjustmentFacts,
        disposition: OrdinaryAttackDamage,
      }
    )

  pure def missFixtureResult: AttackProcedureResult =
    resolveAttackProcedure(
      ActionAvailable,
      {
        capability: MeleeReachRangeCapability({ reachFeet: 5 }),
        distanceFeet: 5,
      },
      {
        naturalD20: 1,
        total: 30,
        armorClass: 10,
        criticalThreshold: 20,
      },
      { advantage: false, disadvantage: false },
      {
        kind: PlayerCharacter,
        hitPoints: 6,
        hitPointMaximum: 12,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      {
        attackKind: MeleeAttack,
        damageType: SlashingDamage,
        rolledDamage: 6,
        damageModifier: 0,
        targetAdjustments: noDamageAdjustmentFacts,
        disposition: OrdinaryAttackDamage,
      }
    )

  pure def invalidRangeFixtureResult: AttackProcedureResult =
    resolveAttackProcedure(
      ActionAvailable,
      {
        capability: MeleeReachRangeCapability({ reachFeet: 5 }),
        distanceFeet: 100,
      },
      {
        naturalD20: 20,
        total: 8,
        armorClass: 20,
        criticalThreshold: 20,
      },
      { advantage: false, disadvantage: false },
      {
        kind: PlayerCharacter,
        hitPoints: 6,
        hitPointMaximum: 12,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      {
        attackKind: MeleeAttack,
        damageType: SlashingDamage,
        rolledDamage: 6,
        damageModifier: 0,
        targetAdjustments: noDamageAdjustmentFacts,
        disposition: OrdinaryAttackDamage,
      }
    )

  pure def criticalDamageFixtureHitPoints: int =
    criticalDamageFixtureResult.damageResult.vitals.hitPoints
  pure def criticalDamageFixtureHitPointMaximum: int =
    criticalDamageFixtureResult.damageResult.vitals.hitPointMaximum
  pure def criticalDamageFixtureTemporaryHitPoints: int =
    criticalDamageFixtureResult.damageResult.vitals.temporaryHitPoints
  pure def criticalDamageFixtureDead: bool =
    criticalDamageFixtureResult.damageResult.vitals.dead
  pure def criticalDamageFixtureUnconscious: bool =
    criticalDamageFixtureResult.damageResult.vitals.unconscious
  pure def criticalDamageFixturePositiveRecovery: PositiveHitPointUnconsciousRecovery =
    criticalDamageFixtureResult.damageResult.positiveHitPointUnconsciousRecovery
  pure def criticalDamageFixtureActionQuota: ActionQuota =
    criticalDamageFixtureResult.actionQuota
  action init = all {
    qHitPoints' = 6,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = false,
    qDeathSavingThrows' = resetDeathSavingThrowLifecycle,
    qPositiveRecovery' = NoPositiveHitPointUnconsciousRecovery,
    qActionQuota' = ActionAvailable,
    qAttackRollOutcome' = Miss,
  }

  action recordAttackResult(result: AttackProcedureResult): bool = all {
    qHitPoints' = result.damageResult.vitals.hitPoints,
    qHitPointMaximum' = result.damageResult.vitals.hitPointMaximum,
    qTemporaryHitPoints' = result.damageResult.vitals.temporaryHitPoints,
    qDead' = result.damageResult.vitals.dead,
    qUnconscious' = result.damageResult.vitals.unconscious,
    qDeathSavingThrows' = result.damageResult.deathSavingThrows,
    qPositiveRecovery' = result.damageResult.positiveHitPointUnconsciousRecovery,
    qActionQuota' = result.actionQuota,
    qAttackRollOutcome' = result.attackRollOutcome,
  }

  action doRecordCriticalDamage = all {
    recordAttackResult(criticalDamageFixtureResult),
  }

  action doRecordMiss = all {
    recordAttackResult(missFixtureResult),
  }

  action doRecordInvalidRange = all {
    recordAttackResult(invalidRangeFixtureResult),
  }

  action doResetAvailable = all {
    qHitPoints' = 6,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = false,
    qDeathSavingThrows' = resetDeathSavingThrowLifecycle,
    qPositiveRecovery' = NoPositiveHitPointUnconsciousRecovery,
    qActionQuota' = ActionAvailable,
    qAttackRollOutcome' = Miss,
  }

  action doResetSpent = all {
    qHitPoints' = 6,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = false,
    qDeathSavingThrows' = resetDeathSavingThrowLifecycle,
    qPositiveRecovery' = NoPositiveHitPointUnconsciousRecovery,
    qActionQuota' = ActionSpent,
    qAttackRollOutcome' = Miss,
  }

  // Branch budget: three fixed reducer-derived attack-result fixtures plus two
  // reset choices.
  action step = any {
    doRecordCriticalDamage,
    doRecordMiss,
    doRecordInvalidRange,
    doResetAvailable,
    doResetSpent,
  }

  val invariant = all {
    qHitPointMaximum == 12,
    qHitPoints.in(0.to(12)),
    qTemporaryHitPoints.in(0.to(3)),
    qDead.in(Set(true, false)),
    qUnconscious.in(Set(true, false)),
    qDeathSavingThrows.in(deathSavingThrowLifecycleDomain),
    legalDeathSavingThrowLifecycle(qDeathSavingThrows),
    qPositiveRecovery.in(Set(NoPositiveHitPointUnconsciousRecovery, EndsWhenHitPointsRegained)),
    qActionQuota.in(Set(ActionAvailable, ActionSpent)),
    qAttackRollOutcome.in(Set(Miss, NormalHit, CriticalHit)),
    attackRollOutcomeIsCriticalHit(qAttackRollOutcome) implies
      attackRollOutcomeHits(qAttackRollOutcome),
    qHitPoints > 0 implies not(qUnconscious),
    qDead implies qUnconscious,
    qDeathSavingThrows != Stable,
    qPositiveRecovery == NoPositiveHitPointUnconsciousRecovery,
  }
}
