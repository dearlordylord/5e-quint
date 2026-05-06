// -*- mode: Bluespec; -*-

module hitPointRecoveryInductive {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"

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
  var qLastHitPointsRegained: int

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
    qHitPoints' = 4,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = false,
    qDeathSuccesses' = 0,
    qDeathFailures' = 0,
    qStable' = false,
    qHpRegained' = false,
    qPositiveRecovery' = NoPositiveHitPointUnconsciousRecovery,
    qLastHitPointsRegained' = 0,
  }

  action recordRecoveryResult(result: HitPointRecoveryResult): bool = all {
    qHitPoints' = result.vitals.hitPoints,
    qHitPointMaximum' = result.vitals.hitPointMaximum,
    qTemporaryHitPoints' = result.vitals.temporaryHitPoints,
    qDead' = result.vitals.dead,
    qUnconscious' = result.vitals.unconscious,
    qDeathSuccesses' = result.deathSavingThrows.successes,
    qDeathFailures' = result.deathSavingThrows.failures,
    qStable' = result.deathSavingThrows.stable,
    qHpRegained' = result.deathSavingThrows.hpRegained,
    qPositiveRecovery' = result.positiveHitPointUnconsciousRecovery,
    qLastHitPointsRegained' = result.hitPointsRegained,
  }

  action doApplyHealing = {
    nondet amount = 0.to(12).oneOf()
    all {
      legalHitPointRecoveryState(qVitals, qDeathSavingThrows, qPositiveRecovery),
      recordRecoveryResult(
        applyHitPointHealing(qVitals, qDeathSavingThrows, qPositiveRecovery, amount)
      ),
    }
  }

  action doApplyKnockOutDisposition = {
    nondet amount = 0.to(18).oneOf()
    all {
      canApplyResolvedDamageToPositiveHitPoints(qVitals),
      recordRecoveryResult(
        applyKnockOutDisposition(applyResolvedDamageToPositiveHitPoints(qVitals, amount))
      ),
    }
  }

  action doApplyFirstAid = {
    nondet succeeded = Set(true, false).oneOf()
    all {
      legalHitPointRecoveryState(qVitals, qDeathSavingThrows, qPositiveRecovery),
      recordRecoveryResult(
        applyFirstAidToKnockOutUnconscious(qVitals, qDeathSavingThrows, qPositiveRecovery, succeeded)
      ),
    }
  }

  action doApplyZeroHitPointDamage = {
    nondet amount = 0.to(12).oneOf()
    nondet criticalHitDamage = Set(true, false).oneOf()
    val result = applyDamageAtZeroHitPoints(qVitals, qDeathSavingThrows, amount, criticalHitDamage)
    all {
      canUseDeathSavingThrowLifecycle(qVitals, qDeathSavingThrows),
      qPositiveRecovery == NoPositiveHitPointUnconsciousRecovery,
      qHitPoints' = result.vitals.hitPoints,
      qHitPointMaximum' = result.vitals.hitPointMaximum,
      qTemporaryHitPoints' = result.vitals.temporaryHitPoints,
      qDead' = result.vitals.dead,
      qUnconscious' = result.vitals.unconscious,
      qDeathSuccesses' = result.deathSavingThrows.successes,
      qDeathFailures' = result.deathSavingThrows.failures,
      qStable' = result.deathSavingThrows.stable,
      qHpRegained' = result.deathSavingThrows.hpRegained,
      qPositiveRecovery' = NoPositiveHitPointUnconsciousRecovery,
      qLastHitPointsRegained' = 0,
    }
  }

  action doResetPositiveHitPointCharacter = all {
    qHitPoints' = 4,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = false,
    qDeathSuccesses' = 0,
    qDeathFailures' = 0,
    qStable' = false,
    qHpRegained' = false,
    qPositiveRecovery' = NoPositiveHitPointUnconsciousRecovery,
    qLastHitPointsRegained' = 0,
  }

  action doResetZeroHitPointCharacter = all {
    qHitPoints' = 0,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = true,
    qDeathSuccesses' = 1,
    qDeathFailures' = 1,
    qStable' = false,
    qHpRegained' = false,
    qPositiveRecovery' = NoPositiveHitPointUnconsciousRecovery,
    qLastHitPointsRegained' = 0,
  }

  action doResetStableCharacter = all {
    qHitPoints' = 0,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = true,
    qDeathSuccesses' = 0,
    qDeathFailures' = 0,
    qStable' = true,
    qHpRegained' = false,
    qPositiveRecovery' = NoPositiveHitPointUnconsciousRecovery,
    qLastHitPointsRegained' = 0,
  }

  action doResetKnockOutRecovery = all {
    qHitPoints' = 1,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = true,
    qDeathSuccesses' = 0,
    qDeathFailures' = 0,
    qStable' = false,
    qHpRegained' = false,
    qPositiveRecovery' = EndsWhenHitPointsRegained,
    qLastHitPointsRegained' = 0,
  }

  // Branch budget: 13 healing amounts + 19 knock-out damage amounts +
  // 2 first-aid outcomes + 13 zero-HP damage amounts * 2 critical flags +
  // 4 reset actions = 64 transition choices.
  action step = any {
    doApplyHealing,
    doApplyKnockOutDisposition,
    doApplyFirstAid,
    doApplyZeroHitPointDamage,
    doResetPositiveHitPointCharacter,
    doResetZeroHitPointCharacter,
    doResetStableCharacter,
    doResetKnockOutRecovery,
  }

  val invariant = all {
    qHitPointMaximum == 12,
    qHitPoints.in(0.to(12)),
    qTemporaryHitPoints == 0,
    qDead.in(Set(true, false)),
    qUnconscious.in(Set(true, false)),
    qDeathSuccesses.in(0.to(3)),
    qDeathFailures.in(0.to(3)),
    qStable.in(Set(true, false)),
    qHpRegained.in(Set(true, false)),
    qPositiveRecovery.in(Set(NoPositiveHitPointUnconsciousRecovery, EndsWhenHitPointsRegained)),
    qLastHitPointsRegained.in(0.to(12)),
    legalHitPointRecoveryState(qVitals, qDeathSavingThrows, qPositiveRecovery),
    qDead implies qHitPoints == 0,
    qStable implies qHitPoints == 0 and qUnconscious,
    qPositiveRecovery == EndsWhenHitPointsRegained implies qHitPoints > 0 and qUnconscious,
  }
}
