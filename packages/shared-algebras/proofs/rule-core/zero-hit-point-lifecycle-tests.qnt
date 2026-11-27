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
      assert(deathSavingThrowFailures(result.deathSavingThrows) == 1),
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
      assert(deathSavingThrowFailures(result.deathSavingThrows) == 2),
      assert(not(result.vitals.dead)),
      assert(legalPlayerCharacterDeathSavingThrowState(result.vitals, result.deathSavingThrows)),
    }
  }

  pure def zeroHitPointVitalsWithTemporaryHitPoints(temporaryHitPoints: int): CreatureVitals = {
    kind: PlayerCharacter,
    hitPoints: 0,
    hitPointMaximum: 10,
    temporaryHitPoints: temporaryHitPoints,
    dead: false,
    unconscious: true,
  }

  run test_temporary_hit_points_absorbed_damage_at_zero_still_fails = {
    val vitals = zeroHitPointVitalsWithTemporaryHitPoints(5)
    val absorbed = applyDamageToZeroHitPointCreature(vitals, resetDeathSavingThrowLifecycle, 4, false)
    val criticalOverflow = applyDamageToZeroHitPointCreature(vitals, resetDeathSavingThrowLifecycle, 7, true)
    all {
      assert(absorbed.vitals.temporaryHitPoints == 1),
      assert(absorbed.vitals.hitPoints == 0),
      assert(deathSavingThrowFailures(absorbed.deathSavingThrows) == 1),
      assert(criticalOverflow.vitals.temporaryHitPoints == 0),
      assert(deathSavingThrowFailures(criticalOverflow.deathSavingThrows) == 2),
      assert(legalPlayerCharacterDeathSavingThrowState(absorbed.vitals, absorbed.deathSavingThrows)),
      assert(legalPlayerCharacterDeathSavingThrowState(criticalOverflow.vitals, criticalOverflow.deathSavingThrows)),
    }
  }

  run test_damage_at_zero_tests_incoming_damage_against_maximum = {
    val result = applyDamageToZeroHitPointCreature(
      zeroHitPointVitalsWithTemporaryHitPoints(5),
      resetDeathSavingThrowLifecycle,
      12,
      false
    )
    all {
      assert(result.vitals.temporaryHitPoints == 0),
      assert(result.vitals.dead),
      assert(result.deathSavingThrows == Dead),
      assert(legalPlayerCharacterDeathSavingThrowState(result.vitals, result.deathSavingThrows)),
    }
  }

  run test_temporary_hit_points_absorbed_damage_ends_stable = {
    val result = applyDamageToZeroHitPointCreature(
      zeroHitPointVitalsWithTemporaryHitPoints(5),
      Stable,
      3,
      false
    )
    all {
      assert(result.vitals.temporaryHitPoints == 2),
      assert(result.deathSavingThrows == Dying({ successes: 0, failures: 1 })),
      assert(legalPlayerCharacterDeathSavingThrowState(result.vitals, result.deathSavingThrows)),
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
      assert(deathSavingThrowFailures(result.deathSavingThrows) == 3),
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
    val lifecycle = Dying({ successes: 2, failures: 1 })
    val result = resolveStartTurnDeathSavingThrow(vitals, lifecycle, 10)
    all {
      assert(result.deathSavingThrows == Stable),
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
      assert(result.deathSavingThrows == resetDeathSavingThrowLifecycle),
      assert(result.deathSavingThrowOutcome == DeathSavingThrowRegainedHitPoint),
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

  run test_legal_death_saving_throw_lifecycles_enumerates_the_legal_lifecycles = all {
    assert(legalDeathSavingThrowLifecycles.size() == 11),
    assert(legalDeathSavingThrowLifecycles.forall(lifecycle => legalDeathSavingThrowLifecycle(lifecycle))),
    assert(0.to(3).forall(successes => 0.to(3).forall(failures =>
      legalDeathSavingThrowLifecycles.contains(Dying({ successes: successes, failures: failures }))
        == legalDeathSavingThrowLifecycle(Dying({ successes: successes, failures: failures }))
    ))),
  }

}
