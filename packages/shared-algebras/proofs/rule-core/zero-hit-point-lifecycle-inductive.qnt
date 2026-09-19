// -*- mode: Bluespec; -*-

module zeroHitPointLifecycleInductive {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"

  var qHitPoints: int
  var qHitPointMaximum: int
  var qTemporaryHitPoints: int
  var qDead: bool
  var qUnconscious: bool
  var qDeathSavingThrows: DeathSavingThrowLifecycle
  var qLastDeathSavingThrowFailuresAdded: int

  pure def qVitals: CreatureVitals = {
    kind: PlayerCharacter,
    hitPoints: qHitPoints,
    hitPointMaximum: qHitPointMaximum,
    temporaryHitPoints: qTemporaryHitPoints,
    dead: qDead,
    unconscious: qUnconscious,
  }

  pure def qStable: bool = qDeathSavingThrows == Stable

  action init = all {
    qHitPoints' = 4,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = false,
    qDeathSavingThrows' = resetDeathSavingThrowLifecycle,
    qLastDeathSavingThrowFailuresAdded' = 0,
  }

  action recordZeroHitPointLifecycleResult(result: ZeroHitPointLifecycleResult): bool = all {
    qHitPoints' = result.vitals.hitPoints,
    qHitPointMaximum' = result.vitals.hitPointMaximum,
    qTemporaryHitPoints' = result.vitals.temporaryHitPoints,
    qDead' = result.vitals.dead,
    qUnconscious' = result.vitals.unconscious,
    qDeathSavingThrows' = result.deathSavingThrows,
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
      qDeathSavingThrows' = nextLifecycle,
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
    qDeathSavingThrows' = resetDeathSavingThrowLifecycle,
    qLastDeathSavingThrowFailuresAdded' = 0,
  }

  action doResetZeroHitPointCharacter = all {
    qHitPoints' = 0,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = true,
    qDeathSavingThrows' = resetDeathSavingThrowLifecycle,
    qLastDeathSavingThrowFailuresAdded' = 0,
  }

  action doResetStableCharacter = all {
    qHitPoints' = 0,
    qHitPointMaximum' = 12,
    qTemporaryHitPoints' = 0,
    qDead' = false,
    qUnconscious' = true,
    qDeathSavingThrows' = Stable,
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
    qDeathSavingThrows.in(Set(
      Stable,
      Dead,
      Dying({ successes: 0, failures: 0 }),
      Dying({ successes: 0, failures: 1 }),
      Dying({ successes: 0, failures: 2 }),
      Dying({ successes: 1, failures: 0 }),
      Dying({ successes: 1, failures: 1 }),
      Dying({ successes: 1, failures: 2 }),
      Dying({ successes: 2, failures: 0 }),
      Dying({ successes: 2, failures: 1 }),
      Dying({ successes: 2, failures: 2 }),
    )),
    legalDeathSavingThrowLifecycle(qDeathSavingThrows),
    qLastDeathSavingThrowFailuresAdded.in(0.to(3)),
    legalPlayerCharacterDeathSavingThrowState(qVitals, qDeathSavingThrows),
    qDead implies qHitPoints == 0 and qDeathSavingThrows == Dead,
    qStable implies qHitPoints == 0 and qUnconscious,
    (qHitPoints == 0 and not(qDead)) implies qUnconscious,
  }
}
