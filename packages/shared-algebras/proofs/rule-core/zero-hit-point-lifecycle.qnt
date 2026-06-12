// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE
module zeroHitPointLifecycle {
  import hitPointDamage.* from "./hit-point-damage"

  type DeathSavingThrowLifecycle = {
    successes: int,
    failures: int,
    stable: bool,
    hpRegained: bool,
  }

  type ZeroHitPointLifecycleResult = {
    vitals: CreatureVitals,
    deathSavingThrows: DeathSavingThrowLifecycle,
    deathSavingThrowFailuresAdded: int,
  }

  pure def resetDeathSavingThrowLifecycle: DeathSavingThrowLifecycle = {
    successes: 0,
    failures: 0,
    stable: false,
    hpRegained: false,
  }

  pure def deathSavingThrowCount(value: int): int =
    if (value < 0) 0 else if (value > 3) 3 else value

  pure def legalDeathSavingThrowLifecycle(lifecycle: DeathSavingThrowLifecycle): bool = all {
    lifecycle.successes >= 0,
    lifecycle.successes <= 3,
    lifecycle.failures >= 0,
    lifecycle.failures <= 3,
    not(lifecycle.stable and lifecycle.hpRegained),
    lifecycle.stable implies lifecycle.successes == 0 and lifecycle.failures == 0,
    lifecycle.hpRegained implies lifecycle.successes == 0 and lifecycle.failures == 0,
  }

  pure def legalPlayerCharacterDeathSavingThrowState(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle
  ): bool = all {
    legalVitals(vitals),
    vitals.kind == PlayerCharacter,
    legalDeathSavingThrowLifecycle(lifecycle),
    vitals.dead implies vitals.hitPoints == 0 and lifecycle.failures == 3,
    lifecycle.hpRegained implies vitals.hitPoints == 1 and not(vitals.dead) and not(vitals.unconscious),
    lifecycle.stable implies vitals.hitPoints == 0 and vitals.unconscious and not(vitals.dead),
    (vitals.hitPoints == 0 and not(vitals.dead)) implies vitals.unconscious,
  }

  pure def canUseDeathSavingThrowLifecycle(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle
  ): bool = all {
    legalPlayerCharacterDeathSavingThrowState(vitals, lifecycle),
    vitals.hitPoints == 0,
    not(vitals.dead),
    not(lifecycle.hpRegained),
  }

  pure def addDeathSavingThrowFailures(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    rawCount: int
  ): ZeroHitPointLifecycleResult =
    if (vitals.dead or lifecycle.hpRegained) {
      vitals: vitals,
      deathSavingThrows: lifecycle,
      deathSavingThrowFailuresAdded: 0,
    } else {
      val count = deathSavingThrowCount(rawCount)
      val nextFailures = deathSavingThrowCount(lifecycle.failures + count)
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
        deathSavingThrows: {
          successes: lifecycle.successes,
          failures: nextFailures,
          stable: false,
          hpRegained: lifecycle.hpRegained,
        },
        deathSavingThrowFailuresAdded: count,
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
    } else if (rawDamage >= vitals.hitPointMaximum) {
      addDeathSavingThrowFailures(vitals, lifecycle, 3)
    } else {
      addDeathSavingThrowFailures(vitals, lifecycle, if (criticalHitDamage) 2 else 1)
    }

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
      } else {
        applyDamageAtZeroHitPoints(nextVitals, lifecycle, damageAfterTemporaryHitPoints, criticalHitDamage)
      }
    }

  pure def resolveStartTurnDeathSavingThrow(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    d20Roll: int
  ): ZeroHitPointLifecycleResult =
    if (not(canUseDeathSavingThrowLifecycle(vitals, lifecycle)) or lifecycle.stable or d20Roll <= 0) {
      vitals: vitals,
      deathSavingThrows: lifecycle,
      deathSavingThrowFailuresAdded: 0,
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
        deathSavingThrows: {
          successes: 0,
          failures: 0,
          stable: false,
          hpRegained: true,
        },
        deathSavingThrowFailuresAdded: 0,
      }
    } else if (d20Roll == 1) {
      addDeathSavingThrowFailures(vitals, lifecycle, 2)
    } else if (d20Roll >= 10) {
      val nextSuccesses = deathSavingThrowCount(lifecycle.successes + 1)
      if (nextSuccesses >= 3) {
        {
          vitals: vitals,
          deathSavingThrows: {
            successes: 0,
            failures: 0,
            stable: true,
            hpRegained: false,
          },
          deathSavingThrowFailuresAdded: 0,
        }
      } else {
        {
          vitals: vitals,
          deathSavingThrows: {
            successes: nextSuccesses,
            failures: lifecycle.failures,
            stable: lifecycle.stable,
            hpRegained: lifecycle.hpRegained,
          },
          deathSavingThrowFailuresAdded: 0,
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
        {
          successes: 0,
          failures: 3,
          stable: false,
          hpRegained: false,
        }
      } else {
        resetDeathSavingThrowLifecycle
      }
    } else {
      previous
    }

  run test_damage_at_zero_adds_one_failure = {
    val vitals = {
      kind: PlayerCharacter,
      hitPoints: 0,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: true,
    }
    val result = applyDamageAtZeroHitPoints(vitals, resetDeathSavingThrowLifecycle, 1, false)
    all {
      assert(result.deathSavingThrows.failures == 1),
      assert(not(result.vitals.dead)),
      assert(legalPlayerCharacterDeathSavingThrowState(result.vitals, result.deathSavingThrows)),
    }
  }

  run test_critical_damage_at_zero_adds_two_failures = {
    val vitals = {
      kind: PlayerCharacter,
      hitPoints: 0,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: true,
    }
    val result = applyDamageAtZeroHitPoints(vitals, resetDeathSavingThrowLifecycle, 1, true)
    all {
      assert(result.deathSavingThrows.failures == 2),
      assert(not(result.vitals.dead)),
      assert(legalPlayerCharacterDeathSavingThrowState(result.vitals, result.deathSavingThrows)),
    }
  }

  run test_temporary_hit_points_absorb_zero_hit_point_damage_before_failures = {
    val vitals = {
      kind: PlayerCharacter,
      hitPoints: 0,
      hitPointMaximum: 12,
      temporaryHitPoints: 5,
      dead: false,
      unconscious: true,
    }
    val absorbed = applyDamageToZeroHitPointCreature(vitals, resetDeathSavingThrowLifecycle, 4, true)
    val overflow = applyDamageToZeroHitPointCreature(vitals, resetDeathSavingThrowLifecycle, 7, true)
    all {
      assert(absorbed.vitals.temporaryHitPoints == 1),
      assert(absorbed.deathSavingThrows.failures == 0),
      assert(overflow.vitals.temporaryHitPoints == 0),
      assert(overflow.deathSavingThrows.failures == 2),
      assert(legalPlayerCharacterDeathSavingThrowState(absorbed.vitals, absorbed.deathSavingThrows)),
      assert(legalPlayerCharacterDeathSavingThrowState(overflow.vitals, overflow.deathSavingThrows)),
    }
  }

  run test_massive_damage_at_zero_kills = {
    val vitals = {
      kind: PlayerCharacter,
      hitPoints: 0,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: true,
    }
    val result = applyDamageAtZeroHitPoints(vitals, resetDeathSavingThrowLifecycle, 12, false)
    all {
      assert(result.vitals.dead),
      assert(result.deathSavingThrows.failures == 3),
      assert(legalPlayerCharacterDeathSavingThrowState(result.vitals, result.deathSavingThrows)),
    }
  }

  run test_three_successes_make_stable_and_reset_counters = {
    val vitals = {
      kind: PlayerCharacter,
      hitPoints: 0,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: true,
    }
    val lifecycle = {
      successes: 2,
      failures: 1,
      stable: false,
      hpRegained: false,
    }
    val result = resolveStartTurnDeathSavingThrow(vitals, lifecycle, 10)
    all {
      assert(result.deathSavingThrows.successes == 0),
      assert(result.deathSavingThrows.failures == 0),
      assert(result.deathSavingThrows.stable),
      assert(legalPlayerCharacterDeathSavingThrowState(result.vitals, result.deathSavingThrows)),
    }
  }

  run test_natural_20_regains_one_hit_point = {
    val vitals = {
      kind: PlayerCharacter,
      hitPoints: 0,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: true,
    }
    val result = resolveStartTurnDeathSavingThrow(vitals, resetDeathSavingThrowLifecycle, 20)
    all {
      assert(result.vitals.hitPoints == 1),
      assert(not(result.vitals.unconscious)),
      assert(result.deathSavingThrows.hpRegained),
      assert(legalPlayerCharacterDeathSavingThrowState(result.vitals, result.deathSavingThrows)),
    }
  }

  run test_positive_hit_point_damage_initializes_death_saving_throw_lifecycle = {
    val damageResult = applyResolvedDamageToPositiveHitPoints({
      kind: PlayerCharacter,
      hitPoints: 4,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    }, 5)
    val lifecycle =
      deathSavingThrowLifecycleAfterPositiveHitPointDamage(resetDeathSavingThrowLifecycle, damageResult)
    all {
      assert(damageResult.vitals.hitPoints == 0),
      assert(damageResult.vitals.unconscious),
      assert(lifecycle == resetDeathSavingThrowLifecycle),
      assert(legalPlayerCharacterDeathSavingThrowState(damageResult.vitals, lifecycle)),
    }
  }
}
