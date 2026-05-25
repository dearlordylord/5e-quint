// -*- mode: Bluespec; -*-

module unitFeaturePoolCostCoreExamples {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import unitFeaturePoolCostCore.* from "./unit-feature-pool-cost-core"

  run test_second_wind_spends_bonus_action_and_heals = {
    val result = resolveSecondWind(
      initialTurnProcedureState,
      { usesRemaining: 2, maximumUses: 2 },
      {
        kind: PlayerCharacter,
        hitPoints: 3,
        hitPointMaximum: 20,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      resetDeathSavingThrowLifecycle,
      NoPositiveHitPointUnconsciousRecovery,
      { healingRoll: 6, fighterLevel: 4 }
    )
    all {
      assert(not(result.turn.bonusActionAvailable)),
      assert(result.pool.usesRemaining == 1),
      assert(result.recovery.vitals.hitPoints == 13),
      assert(legalHitPointRecoveryState(
        result.recovery.vitals,
        result.recovery.deathSavingThrows,
        result.recovery.positiveHitPointUnconsciousRecovery
      )),
    }
  }

  run test_second_wind_non_admission_preserves_recovery_lifecycle = {
    val lifecycle = {
      successes: 0,
      failures: 0,
      stable: false,
      hpRegained: false,
    }
    val result = resolveSecondWind(
      initialTurnProcedureState,
      { usesRemaining: 0, maximumUses: 2 },
      {
        kind: PlayerCharacter,
        hitPoints: 5,
        hitPointMaximum: 20,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: true,
      },
      lifecycle,
      EndsWhenHitPointsRegained,
      { healingRoll: 6, fighterLevel: 4 }
    )
    all {
      assert(result.turn == initialTurnProcedureState),
      assert(result.pool.usesRemaining == 0),
      assert(result.recovery.vitals.hitPoints == 5),
      assert(result.recovery.deathSavingThrows == lifecycle),
      assert(result.recovery.positiveHitPointUnconsciousRecovery == EndsWhenHitPointsRegained),
      assert(result.recovery.hitPointsRegained == 0),
    }
  }

  run test_tactical_mind_spends_second_wind_only_on_converted_success = {
    val converted = resolveFailedAbilityCheckResourceBoost(
      { usesRemaining: 2, maximumUses: 2 },
      { originalTotal: 13, dc: 15, boostRoll: 3 }
    )
    val stillFailed = resolveFailedAbilityCheckResourceBoost(
      { usesRemaining: 2, maximumUses: 2 },
      { originalTotal: 10, dc: 15, boostRoll: 4 }
    )
    all {
      assert(not(converted.originalSucceeded)),
      assert(converted.boostedSucceeded),
      assert(converted.boostedTotal == 16),
      assert(converted.pool.usesRemaining == 1),
      assert(not(stillFailed.originalSucceeded)),
      assert(not(stillFailed.boostedSucceeded)),
      assert(stillFailed.boostedTotal == 14),
      assert(stillFailed.pool.usesRemaining == 2),
    }
  }

  run test_tactical_mind_requires_failed_ability_check_and_second_wind_use = {
    val originalSuccess = resolveFailedAbilityCheckResourceBoost(
      { usesRemaining: 2, maximumUses: 2 },
      { originalTotal: 15, dc: 15, boostRoll: 1 }
    )
    val depleted = resolveFailedAbilityCheckResourceBoost(
      { usesRemaining: 0, maximumUses: 2 },
      { originalTotal: 14, dc: 15, boostRoll: 1 }
    )
    all {
      assert(originalSuccess.originalSucceeded),
      assert(originalSuccess.boostedSucceeded),
      assert(originalSuccess.pool.usesRemaining == 2),
      assert(not(depleted.originalSucceeded)),
      assert(depleted.boostedSucceeded),
      assert(depleted.pool.usesRemaining == 0),
    }
  }

  run test_cunning_action_spends_bonus_action_for_dash_disengage_or_hide = {
    val dash = resolveCunningAction(initialTurnProcedureState, {
      choice: CunningDash,
      speedFeet: 30,
      hideFacts: { prerequisiteSatisfied: false, checkTotal: 0, dc: 10 },
    })
    val disengage = resolveCunningAction(initialTurnProcedureState, {
      choice: CunningDisengage,
      speedFeet: 30,
      hideFacts: { prerequisiteSatisfied: false, checkTotal: 0, dc: 10 },
    })
    val hide = resolveCunningAction(initialTurnProcedureState, {
      choice: CunningHide,
      speedFeet: 30,
      hideFacts: { prerequisiteSatisfied: true, checkTotal: 18, dc: 15 },
    })
    all {
      assert(not(dash.bonusActionAvailable)),
      assert(dash.dashMovementBonusFeet == 30),
      assert(not(disengage.bonusActionAvailable)),
      assert(disengage.disengaged),
      assert(not(hide.bonusActionAvailable)),
      assert(hide.hidden),
    }
  }

  run test_innate_sorcery_spends_bonus_action_and_long_rest_use = {
    val state = {
      turn: initialTurnProcedureState,
      pool: { usesRemaining: 2, maximumUses: 2 },
      occurrence: NoInnateSorceryOccurrence,
    }
    val active = activateInnateSorcery(state)
    val exhausted = activateInnateSorcery(state.with("pool", { usesRemaining: 0, maximumUses: 2 }))
    val alreadyActive = activateInnateSorcery(active)
    all {
      assert(not(active.turn.bonusActionAvailable)),
      assert(active.pool.usesRemaining == 1),
      assert(active.occurrence == InnateSorceryOneMinuteDuration),
      assert(exhausted.occurrence == NoInnateSorceryOccurrence),
      assert(exhausted.pool.usesRemaining == 0),
      assert(alreadyActive.pool.usesRemaining == 1),
    }
  }

  run test_adrenaline_rush_spends_bonus_action_dash_use_and_applies_temporary_hit_points = {
    val result = resolveBonusActionDashTemporaryHitPoints(
      initialTurnProcedureState,
      { usesRemaining: 2, maximumUses: 2 },
      {
        speedFeet: 30,
        proficiencyBonus: 3,
        existingTemporaryHitPoints: 1,
        chooseNewTemporaryHitPoints: true,
      }
    )
    all {
      assert(not(result.turn.bonusActionAvailable)),
      assert(result.turn.dashMovementBonusFeet == 30),
      assert(result.pool.usesRemaining == 1),
      assert(result.temporaryHitPoints == 3),
    }
  }

  run test_adrenaline_rush_can_keep_higher_existing_temporary_hit_points = {
    val result = resolveBonusActionDashTemporaryHitPoints(
      initialTurnProcedureState,
      { usesRemaining: 1, maximumUses: 2 },
      {
        speedFeet: 30,
        proficiencyBonus: 2,
        existingTemporaryHitPoints: 5,
        chooseNewTemporaryHitPoints: false,
      }
    )
    all {
      assert(result.turn.dashMovementBonusFeet == 30),
      assert(result.pool.usesRemaining == 0),
      assert(result.temporaryHitPoints == 5),
    }
  }

  run test_adrenaline_rush_requires_available_bonus_action = {
    val turn = initialTurnProcedureState.with("bonusActionAvailable", false)
    val result = resolveBonusActionDashTemporaryHitPoints(
      turn,
      { usesRemaining: 2, maximumUses: 2 },
      {
        speedFeet: 30,
        proficiencyBonus: 3,
        existingTemporaryHitPoints: 1,
        chooseNewTemporaryHitPoints: true,
      }
    )
    all {
      assert(result.turn == turn),
      assert(result.pool.usesRemaining == 2),
      assert(result.temporaryHitPoints == 1),
    }
  }
}
