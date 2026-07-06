// -*- mode: Bluespec; -*-

module attackDamageCompositionInductive {
  import hitPointDamage.* from "./hit-point-damage"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"

  var qHitPoints: int
  var qHitPointMaximum: int
  var qTemporaryHitPoints: int
  var qDead: bool
  var qUnconscious: bool
  var qDeathSuccesses: int
  var qDeathFailures: int
  var qStable: bool
  var qHpRegained: bool
  var qPositiveRecovery: PositiveHitPointUnconsciousRecovery
  var qActionQuota: ActionQuota
  var qAttackHits: bool
  var qCriticalHit: bool

  pure def criticalDamageFixtureResult: AttackProcedureResult =
    resolveAttackProcedure(
      ActionAvailable,
      WithinMeleeReach,
      {
        naturalD20: 20,
        total: 8,
        armorClass: 20,
        criticalThreshold: 20,
      },
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
      WithinMeleeReach,
      {
        naturalD20: 1,
        total: 30,
        armorClass: 10,
        criticalThreshold: 20,
      },
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
      BeyondRange,
      {
        naturalD20: 20,
        total: 8,
        armorClass: 20,
        criticalThreshold: 20,
      },
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
  pure def criticalDamageFixtureDeathSuccesses: int =
    criticalDamageFixtureResult.damageResult.deathSavingThrows.successes
  pure def criticalDamageFixtureDeathFailures: int =
    criticalDamageFixtureResult.damageResult.deathSavingThrows.failures
  pure def criticalDamageFixtureStable: bool =
    criticalDamageFixtureResult.damageResult.deathSavingThrows.stable
  pure def criticalDamageFixtureHpRegained: bool =
    criticalDamageFixtureResult.damageResult.deathSavingThrows.hpRegained
  pure def criticalDamageFixturePositiveRecovery: PositiveHitPointUnconsciousRecovery =
    criticalDamageFixtureResult.damageResult.positiveHitPointUnconsciousRecovery
  pure def criticalDamageFixtureActionQuota: ActionQuota =
    criticalDamageFixtureResult.actionQuota
  pure def criticalDamageFixtureAttackHits: bool =
    criticalDamageFixtureResult.attackRollOutcome.hits
  pure def criticalDamageFixtureCriticalHit: bool =
    criticalDamageFixtureResult.attackRollOutcome.critical

  action init = all {
    qHitPoints' = 6,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = false,
    qDeathSuccesses' = 0,
    qDeathFailures' = 0,
    qStable' = false,
    qHpRegained' = false,
    qPositiveRecovery' = NoPositiveHitPointUnconsciousRecovery,
    qActionQuota' = ActionAvailable,
    qAttackHits' = false,
    qCriticalHit' = false,
  }

  action recordAttackResult(result: AttackProcedureResult): bool = all {
    qHitPoints' = result.damageResult.vitals.hitPoints,
    qHitPointMaximum' = result.damageResult.vitals.hitPointMaximum,
    qTemporaryHitPoints' = result.damageResult.vitals.temporaryHitPoints,
    qDead' = result.damageResult.vitals.dead,
    qUnconscious' = result.damageResult.vitals.unconscious,
    qDeathSuccesses' = result.damageResult.deathSavingThrows.successes,
    qDeathFailures' = result.damageResult.deathSavingThrows.failures,
    qStable' = result.damageResult.deathSavingThrows.stable,
    qHpRegained' = result.damageResult.deathSavingThrows.hpRegained,
    qPositiveRecovery' = result.damageResult.positiveHitPointUnconsciousRecovery,
    qActionQuota' = result.actionQuota,
    qAttackHits' = result.attackRollOutcome.hits,
    qCriticalHit' = result.attackRollOutcome.critical,
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
    qDeathSuccesses' = 0,
    qDeathFailures' = 0,
    qStable' = false,
    qHpRegained' = false,
    qPositiveRecovery' = NoPositiveHitPointUnconsciousRecovery,
    qActionQuota' = ActionAvailable,
    qAttackHits' = false,
    qCriticalHit' = false,
  }

  action doResetSpent = all {
    qHitPoints' = 6,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = false,
    qDeathSuccesses' = 0,
    qDeathFailures' = 0,
    qStable' = false,
    qHpRegained' = false,
    qPositiveRecovery' = NoPositiveHitPointUnconsciousRecovery,
    qActionQuota' = ActionSpent,
    qAttackHits' = false,
    qCriticalHit' = false,
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
    qDeathSuccesses.in(0.to(3)),
    qDeathFailures.in(0.to(3)),
    qStable.in(Set(true, false)),
    qHpRegained.in(Set(true, false)),
    qPositiveRecovery.in(Set(NoPositiveHitPointUnconsciousRecovery, EndsWhenHitPointsRegained)),
    qActionQuota.in(Set(ActionAvailable, ActionSpent)),
    qAttackHits.in(Set(true, false)),
    qCriticalHit.in(Set(true, false)),
    qHitPoints > 0 implies not(qUnconscious),
    qDead implies qUnconscious,
    not(qStable and qHpRegained),
    qPositiveRecovery == NoPositiveHitPointUnconsciousRecovery,
  }
}
