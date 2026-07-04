module zeroHitPointLifecycleTests {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"

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
