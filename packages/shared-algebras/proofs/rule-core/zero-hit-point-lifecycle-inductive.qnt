// -*- mode: Bluespec; -*-

module zeroHitPointLifecycleInductive {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"

  var qHitPoints: int
  var qHitPointMaximum: int
  var qTemporaryHitPoints: int
  var qDead: bool
  var qUnconscious: bool
  var qDeathSuccesses: int
  var qDeathFailures: int
  var qStable: bool
  var qHpRegained: bool
  var qLastDeathSavingThrowFailuresAdded: int

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
    qLastDeathSavingThrowFailuresAdded' = 0,
  }

  action recordZeroHitPointLifecycleResult(result: ZeroHitPointLifecycleResult): bool = all {
    qHitPoints' = result.vitals.hitPoints,
    qHitPointMaximum' = result.vitals.hitPointMaximum,
    qTemporaryHitPoints' = result.vitals.temporaryHitPoints,
    qDead' = result.vitals.dead,
    qUnconscious' = result.vitals.unconscious,
    qDeathSuccesses' = result.deathSavingThrows.successes,
    qDeathFailures' = result.deathSavingThrows.failures,
    qStable' = result.deathSavingThrows.stable,
    qHpRegained' = result.deathSavingThrows.hpRegained,
    qLastDeathSavingThrowFailuresAdded' = result.deathSavingThrowFailuresAdded,
  }

  action recordPositiveHitPointDamageResult(result: DamageResult): bool = {
    val nextLifecycle =
      deathSavingThrowLifecycleAfterPositiveHitPointDamage(qDeathSavingThrows, result)
    all {
      qHitPoints' = result.vitals.hitPoints,
      qHitPointMaximum' = result.vitals.hitPointMaximum,
      qTemporaryHitPoints' = result.vitals.temporaryHitPoints,
      qDead' = result.vitals.dead,
      qUnconscious' = result.vitals.unconscious,
      qDeathSuccesses' = nextLifecycle.successes,
      qDeathFailures' = nextLifecycle.failures,
      qStable' = nextLifecycle.stable,
      qHpRegained' = nextLifecycle.hpRegained,
      qLastDeathSavingThrowFailuresAdded' = 0,
    }
  }

  action doApplyPositiveHitPointDamage = {
    nondet amount = 0.to(18).oneOf()
    all {
      canApplyResolvedDamageToPositiveHitPoints(qVitals),
      recordPositiveHitPointDamageResult(applyResolvedDamageToPositiveHitPoints(qVitals, amount)),
    }
  }

  action doApplyDamageAtZeroHitPoints = {
    nondet amount = 0.to(12).oneOf()
    nondet criticalHitDamage = Set(true, false).oneOf()
    all {
      canUseDeathSavingThrowLifecycle(qVitals, qDeathSavingThrows),
      recordZeroHitPointLifecycleResult(
        applyDamageAtZeroHitPoints(qVitals, qDeathSavingThrows, amount, criticalHitDamage)
      ),
    }
  }

  action doResolveStartTurnDeathSavingThrow = {
    nondet d20Roll = 1.to(20).oneOf()
    all {
      canUseDeathSavingThrowLifecycle(qVitals, qDeathSavingThrows),
      not(qStable),
      recordZeroHitPointLifecycleResult(
        resolveStartTurnDeathSavingThrow(qVitals, qDeathSavingThrows, d20Roll)
      ),
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
    qLastDeathSavingThrowFailuresAdded' = 0,
  }

  action doResetZeroHitPointCharacter = all {
    qHitPoints' = 0,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = true,
    qDeathSuccesses' = 0,
    qDeathFailures' = 0,
    qStable' = false,
    qHpRegained' = false,
    qLastDeathSavingThrowFailuresAdded' = 0,
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
    qLastDeathSavingThrowFailuresAdded' = 0,
  }

  // Branch budget: 19 positive-damage amounts + 13 zero-HP damage amounts * 2
  // critical flags + 20 death-save rolls + 3 reset actions = 68 transition choices.
  action step = any {
    doApplyPositiveHitPointDamage,
    doApplyDamageAtZeroHitPoints,
    doResolveStartTurnDeathSavingThrow,
    doResetPositiveHitPointCharacter,
    doResetZeroHitPointCharacter,
    doResetStableCharacter,
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
    qLastDeathSavingThrowFailuresAdded.in(0.to(3)),
    legalPlayerCharacterDeathSavingThrowState(qVitals, qDeathSavingThrows),
    qDead implies qHitPoints == 0 and qDeathFailures == 3,
    qStable implies qHitPoints == 0 and qUnconscious,
    qHpRegained implies qHitPoints == 1 and not(qUnconscious),
    (qHitPoints == 0 and not(qDead)) implies qUnconscious,
  }
}
