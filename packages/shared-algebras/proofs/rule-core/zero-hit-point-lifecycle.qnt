// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE
module zeroHitPointLifecycle {
  import hitPointDamage.* from "./hit-point-damage"

  type DeathSavingThrowLifecycle =
    | Dying({ successes: int, failures: int })
    | Stable
    | Dead

  type DeathSavingThrowOutcome =
    | DeathSavingThrowNoHitPointRecovery
    | DeathSavingThrowRegainedHitPoint

  type ZeroHitPointLifecycleResult = {
    vitals: CreatureVitals,
    deathSavingThrows: DeathSavingThrowLifecycle,
    deathSavingThrowFailuresAdded: int,
    deathSavingThrowOutcome: DeathSavingThrowOutcome,
  }

  pure def resetDeathSavingThrowLifecycle: DeathSavingThrowLifecycle = {
    Dying({ successes: 0, failures: 0 })
  }

  pure def deathSavingThrowCount(value: int): int =
    if (value < 0) 0 else if (value > 3) 3 else value

  pure def deathSavingThrowLifecycleIsDying(lifecycle: DeathSavingThrowLifecycle): bool =
    match lifecycle {
      | Dying(_) => true
      | Stable => false
      | Dead => false
    }

  pure def deathSavingThrowSuccesses(lifecycle: DeathSavingThrowLifecycle): int =
    match lifecycle {
      | Dying(data) => data.successes
      | Stable => 0
      | Dead => 0
    }

  pure def deathSavingThrowFailures(lifecycle: DeathSavingThrowLifecycle): int =
    match lifecycle {
      | Dying(data) => data.failures
      | Stable => 0
      | Dead => 3
    }

  pure def legalDeathSavingThrowLifecycle(lifecycle: DeathSavingThrowLifecycle): bool =
    match lifecycle {
      | Dying(data) => all {
          data.successes >= 0,
          data.successes < 3,
          data.failures >= 0,
          data.failures < 3,
        }
      | Stable => true
      | Dead => true
    }

  pure def legalPlayerCharacterDeathSavingThrowState(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle
  ): bool = all {
    legalVitals(vitals),
    vitals.kind == PlayerCharacter,
    legalDeathSavingThrowLifecycle(lifecycle),
    vitals.dead implies vitals.hitPoints == 0 and lifecycle == Dead,
    lifecycle == Dead implies vitals.hitPoints == 0 and vitals.dead,
    lifecycle == Stable implies vitals.hitPoints == 0 and vitals.unconscious and not(vitals.dead),
    (vitals.hitPoints == 0 and not(vitals.dead)) implies vitals.unconscious,
  }

  pure def canUseDeathSavingThrowLifecycle(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle
  ): bool = all {
    legalPlayerCharacterDeathSavingThrowState(vitals, lifecycle),
    vitals.hitPoints == 0,
    not(vitals.dead),
    lifecycle != Dead,
  }

  pure def addDeathSavingThrowFailures(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    rawCount: int
  ): ZeroHitPointLifecycleResult =
    if (vitals.dead or lifecycle == Dead) {
      vitals: vitals,
      deathSavingThrows: lifecycle,
      deathSavingThrowFailuresAdded: 0,
      deathSavingThrowOutcome: DeathSavingThrowNoHitPointRecovery,
    } else {
      val count = deathSavingThrowCount(rawCount)
      val previousFailures = deathSavingThrowFailures(lifecycle)
      val nextFailures = deathSavingThrowCount(previousFailures + count)
      val nextDead = nextFailures >= 3
      {
        vitals: {
          kind: vitals.kind,
          hitPoints: vitals.hitPoints,
          hitPointMaximum: vitals.hitPointMaximum,
          temporaryHitPoints: vitals.temporaryHitPoints,
          dead: nextDead,
          unconscious: vitals.unconscious,
        },
        deathSavingThrows:
          if (nextDead) Dead
          else Dying({
            successes: deathSavingThrowSuccesses(lifecycle),
            failures: nextFailures,
          }),
        deathSavingThrowFailuresAdded: count,
        deathSavingThrowOutcome: DeathSavingThrowNoHitPointRecovery,
      }
    }

  pure def applyDamageAtZeroHitPoints(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    rawDamage: int,
    criticalHitDamage: bool
  ): ZeroHitPointLifecycleResult =
    if (not(canUseDeathSavingThrowLifecycle(vitals, lifecycle)) or rawDamage <= 0) {
      vitals: vitals,
      deathSavingThrows: lifecycle,
      deathSavingThrowFailuresAdded: 0,
      deathSavingThrowOutcome: DeathSavingThrowNoHitPointRecovery,
    } else if (rawDamage >= vitals.hitPointMaximum) {
      addDeathSavingThrowFailures(vitals, lifecycle, 3)
    } else {
      addDeathSavingThrowFailures(vitals, lifecycle, if (criticalHitDamage) 2 else 1)
    }

  // playing-the-game.md:1241, "Damage at 0 Hit Points": if you take any damage
  // while you have 0 Hit Points, you suffer a Death Saving Throw failure.
  // "Take damage" here means damage that actually reduces Hit Points after
  // Temporary Hit Point absorption (playing-the-game.md:1255, "Temporary Hit
  // Points"); temp HP offset incoming damage and do not restore Hit Points, so
  // fully temp-HP-absorbed damage adds no failure.
  pure def applyDamageToZeroHitPointCreature(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    rawDamage: int,
    criticalHitDamage: bool
  ): ZeroHitPointLifecycleResult =
    if (not(canUseDeathSavingThrowLifecycle(vitals, lifecycle)) or rawDamage <= 0) {
      vitals: vitals,
      deathSavingThrows: lifecycle,
      deathSavingThrowFailuresAdded: 0,
      deathSavingThrowOutcome: DeathSavingThrowNoHitPointRecovery,
    } else {
      val resolvedDamage = nonnegative(rawDamage)
      val absorbedByTemporaryHitPoints = absorbTemporaryHitPoints(vitals, resolvedDamage)
      val damageAfterTemporaryHitPoints = resolvedDamage - absorbedByTemporaryHitPoints
      val nextVitals = {
        kind: vitals.kind,
        hitPoints: vitals.hitPoints,
        hitPointMaximum: vitals.hitPointMaximum,
        temporaryHitPoints: vitals.temporaryHitPoints - absorbedByTemporaryHitPoints,
        dead: vitals.dead,
        unconscious: vitals.unconscious,
      }
      if (damageAfterTemporaryHitPoints <= 0) {
        vitals: nextVitals,
        deathSavingThrows: lifecycle,
        deathSavingThrowFailuresAdded: 0,
        deathSavingThrowOutcome: DeathSavingThrowNoHitPointRecovery,
      } else {
        applyDamageAtZeroHitPoints(nextVitals, lifecycle, damageAfterTemporaryHitPoints, criticalHitDamage)
      }
    }

  // playing-the-game.md:1233: a creature starting its turn at 0 Hit Points rolls
  // a Death Saving Throw. The guard is state only — at 0, not Stable, not dead —
  // so once per turn is the caller's invariant, not enforced here.
  pure def resolveStartTurnDeathSavingThrow(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    d20Roll: int
  ): ZeroHitPointLifecycleResult =
    if (not(canUseDeathSavingThrowLifecycle(vitals, lifecycle)) or
      not(deathSavingThrowLifecycleIsDying(lifecycle)) or d20Roll <= 0) {
      vitals: vitals,
      deathSavingThrows: lifecycle,
      deathSavingThrowFailuresAdded: 0,
      deathSavingThrowOutcome: DeathSavingThrowNoHitPointRecovery,
    } else if (d20Roll == 20) {
      {
        vitals: {
          kind: vitals.kind,
          hitPoints: 1,
          hitPointMaximum: vitals.hitPointMaximum,
          temporaryHitPoints: vitals.temporaryHitPoints,
          dead: false,
          unconscious: false,
        },
        deathSavingThrows: resetDeathSavingThrowLifecycle,
        deathSavingThrowFailuresAdded: 0,
        deathSavingThrowOutcome: DeathSavingThrowRegainedHitPoint,
      }
    } else if (d20Roll == 1) {
      addDeathSavingThrowFailures(vitals, lifecycle, 2)
    } else if (d20Roll >= 10) {
      val nextSuccesses = deathSavingThrowCount(deathSavingThrowSuccesses(lifecycle) + 1)
      if (nextSuccesses >= 3) {
        {
          vitals: vitals,
          deathSavingThrows: Stable,
          deathSavingThrowFailuresAdded: 0,
          deathSavingThrowOutcome: DeathSavingThrowNoHitPointRecovery,
        }
      } else {
        {
          vitals: vitals,
          deathSavingThrows: Dying({
            successes: nextSuccesses,
            failures: deathSavingThrowFailures(lifecycle),
          }),
          deathSavingThrowFailuresAdded: 0,
          deathSavingThrowOutcome: DeathSavingThrowNoHitPointRecovery,
        }
      }
    } else {
      addDeathSavingThrowFailures(vitals, lifecycle, 1)
    }

  pure def deathSavingThrowLifecycleAfterPositiveHitPointDamage(
    previous: DeathSavingThrowLifecycle,
    damageResult: DamageResult
  ): DeathSavingThrowLifecycle =
    if (damageResult.vitals.kind == PlayerCharacter and damageResult.vitals.hitPoints == 0) {
      if (damageResult.vitals.dead) {
        Dead
      } else {
        resetDeathSavingThrowLifecycle
      }
    } else {
      previous
    }

}
