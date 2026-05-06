// -*- mode: Bluespec; -*-

module attackDamageCompositionInductive {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
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

  pure def qVitals: CreatureVitals = {
    kind: PlayerCharacter,
    hitPoints: qHitPoints,
    hitPointMaximum: qHitPointMaximum,
    temporaryHitPoints: qTemporaryHitPoints,
    dead: qDead,
    unconscious: qUnconscious,
  }

  pure def qDeathSavingThrows: DeathSavingThrowLifecycle = {
    successes: qDeathSuccesses,
    failures: qDeathFailures,
    stable: qStable,
    hpRegained: qHpRegained,
  }

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

  action doResolveAttackProcedure = {
    nondet naturalD20 = Set(1, 2, 12, 19, 20).oneOf()
    nondet total = Set(0, 8, 15, 30).oneOf()
    nondet armorClass = Set(10, 15, 20).oneOf()
    nondet criticalThreshold = Set(19, 20).oneOf()
    nondet rangeFact = Set(WithinMeleeReach, WithinNormalRange, BeyondRange).oneOf()
    nondet hitPoints = 1.to(6).oneOf()
    nondet temporaryHitPoints = 0.to(3).oneOf()
    nondet rolledDamage = 0.to(8).oneOf()
    nondet damageModifier = (-2).to(2).oneOf()
    nondet disposition = Set(OrdinaryAttackDamage, KnockOutAttackDamage).oneOf()
    val targetVitals = {
      kind: PlayerCharacter,
      hitPoints: hitPoints,
      hitPointMaximum: 12,
      temporaryHitPoints: temporaryHitPoints,
      dead: false,
      unconscious: false,
    }
    val damageFacts = {
      attackKind: MeleeAttack,
      damageType: SlashingDamage,
      rolledDamage: rolledDamage,
      damageModifier: damageModifier,
      targetAdjustments: noDamageAdjustmentFacts,
      disposition: disposition,
    }
    all {
      recordAttackResult(resolveAttackProcedure(
        qActionQuota,
        rangeFact,
        {
          naturalD20: naturalD20,
          total: total,
          armorClass: armorClass,
          criticalThreshold: criticalThreshold,
        },
        targetVitals,
        damageFacts
      )),
    }
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

  // Branch budget: 5 d20 samples * 4 totals * 3 ACs * 2 critical thresholds *
  // 3 range facts * 6 HP values * 4 Temporary HP values * 9 damage rolls *
  // 5 modifiers * 2 dispositions = 777,600 attack-procedure choices, plus
  // two reset choices. The machine owns only bounded scalar state, and invalid
  // target/disposition combinations collapse to no-damage outcomes.
  action step = any {
    doResolveAttackProcedure,
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
    legalHitPointRecoveryState(qVitals, qDeathSavingThrows, qPositiveRecovery),
  }
}
