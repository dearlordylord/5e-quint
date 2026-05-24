// -*- mode: Bluespec; -*-

module hitPointRecoveryExamples {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"

  run test_healing_from_zero_resets_death_saving_throws_and_ends_unconscious = {
    val vitals = {
      kind: PlayerCharacter,
      hitPoints: 0,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: true,
    }
    val lifecycle = {
      successes: 1,
      failures: 2,
      stable: false,
      hpRegained: false,
    }
    val result =
      applyHitPointHealing(vitals, lifecycle, NoPositiveHitPointUnconsciousRecovery, 3)
    all {
      assert(result.vitals.hitPoints == 3),
      assert(not(result.vitals.unconscious)),
      assert(result.deathSavingThrows == resetDeathSavingThrowLifecycle),
      assert(legalHitPointRecoveryState(
        result.vitals,
        result.deathSavingThrows,
        result.positiveHitPointUnconsciousRecovery
      )),
    }
  }

  run test_positive_hit_point_knock_out_recovery_ends_when_hit_points_regained = {
    val vitals = {
      kind: PlayerCharacter,
      hitPoints: 1,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: true,
    }
    val result =
      applyHitPointHealing(vitals, resetDeathSavingThrowLifecycle, EndsWhenHitPointsRegained, 1)
    all {
      assert(result.vitals.hitPoints == 2),
      assert(not(result.vitals.unconscious)),
      assert(result.positiveHitPointUnconsciousRecovery == NoPositiveHitPointUnconsciousRecovery),
      assert(legalHitPointRecoveryState(
        result.vitals,
        result.deathSavingThrows,
        result.positiveHitPointUnconsciousRecovery
      )),
    }
  }

  run test_ordinary_positive_hit_point_unconscious_is_not_ended_by_healing = {
    val vitals = {
      kind: PlayerCharacter,
      hitPoints: 2,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: true,
    }
    val result =
      applyHitPointHealing(vitals, resetDeathSavingThrowLifecycle, NoPositiveHitPointUnconsciousRecovery, 1)
    all {
      assert(result.vitals.hitPoints == 3),
      assert(result.vitals.unconscious),
      assert(result.positiveHitPointUnconsciousRecovery == NoPositiveHitPointUnconsciousRecovery),
    }
  }

  run test_healing_after_natural_twenty_recovery_resets_lifecycle = {
    val vitals = {
      kind: PlayerCharacter,
      hitPoints: 1,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    }
    val lifecycle = {
      successes: 0,
      failures: 0,
      stable: false,
      hpRegained: true,
    }
    val result =
      applyHitPointHealing(vitals, lifecycle, NoPositiveHitPointUnconsciousRecovery, 1)
    all {
      assert(result.vitals.hitPoints == 2),
      assert(result.deathSavingThrows == resetDeathSavingThrowLifecycle),
      assert(legalHitPointRecoveryState(
        result.vitals,
        result.deathSavingThrows,
        result.positiveHitPointUnconsciousRecovery
      )),
    }
  }

  run test_knock_out_replaces_drop_to_zero_with_one_hit_point_unconscious = {
    val damageResult = applyResolvedDamageToPositiveHitPoints({
      kind: PlayerCharacter,
      hitPoints: 4,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    }, 4)
    val result = applyKnockOutDisposition(damageResult)
    all {
      assert(result.vitals.hitPoints == 1),
      assert(result.vitals.unconscious),
      assert(result.positiveHitPointUnconsciousRecovery == EndsWhenHitPointsRegained),
      assert(legalHitPointRecoveryState(
        result.vitals,
        result.deathSavingThrows,
        result.positiveHitPointUnconsciousRecovery
      )),
    }
  }

  run test_knock_out_can_replace_massive_damage = {
    val damageResult = applyResolvedDamageToPositiveHitPoints({
      kind: PlayerCharacter,
      hitPoints: 6,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    }, 18)
    val result = applyKnockOutDisposition(damageResult)
    all {
      assert(damageResult.vitals.dead),
      assert(result.vitals.hitPoints == 1),
      assert(not(result.vitals.dead)),
      assert(result.vitals.unconscious),
      assert(result.positiveHitPointUnconsciousRecovery == EndsWhenHitPointsRegained),
    }
  }

  run test_knock_out_can_apply_to_non_player_creature = {
    val damageResult = applyResolvedDamageToPositiveHitPoints({
      kind: MonsterCreature,
      hitPoints: 3,
      hitPointMaximum: 10,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    }, 3)
    val result = applyKnockOutDisposition(damageResult)
    all {
      assert(result.vitals.kind == MonsterCreature),
      assert(result.vitals.hitPoints == 1),
      assert(result.vitals.unconscious),
      assert(result.positiveHitPointUnconsciousRecovery == EndsWhenHitPointsRegained),
      assert(legalHitPointRecoveryState(
        result.vitals,
        result.deathSavingThrows,
        result.positiveHitPointUnconsciousRecovery
      )),
    }
  }

  run test_first_aid_ends_knock_out_unconscious_without_healing = {
    val vitals = {
      kind: PlayerCharacter,
      hitPoints: 1,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: true,
    }
    val result =
      applyFirstAidToKnockOutUnconscious(vitals, resetDeathSavingThrowLifecycle, EndsWhenHitPointsRegained, true)
    all {
      assert(result.vitals.hitPoints == 1),
      assert(not(result.vitals.unconscious)),
      assert(result.positiveHitPointUnconsciousRecovery == NoPositiveHitPointUnconsciousRecovery),
      assert(legalHitPointRecoveryState(
        result.vitals,
        result.deathSavingThrows,
        result.positiveHitPointUnconsciousRecovery
      )),
    }
  }
}
