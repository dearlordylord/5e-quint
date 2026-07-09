// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.monk-focus-battle-options
module battleRuntimeMonkFocusTests {
  import battleRuntimeMonkFocus.* from "./battle-runtime-monk-focus"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"

  run test_monk_focus_points_equal_monk_level = all {
    assert(monkFocusPointsAtMonkLevel(1) == 0),
    assert(monkFocusPointsAtMonkLevel(2) == 2),
    assert(monkFocusPointsAtMonkLevel(3) == 3),
  }

  run test_monk_focus_patient_defense_free_spends_bonus_action_and_disengages = all {
    val result = monkFocusPatientDefenseFreeFighter(initialState)
    all {
      assert(not(result.bonusActionAvailable)),
      assert(result.disengaged),
      assert(not(result.fighter.dodging)),
    }
  }

  run test_monk_focus_patient_defense_focus_spends_bonus_action_and_focus = all {
    val result = monkFocusPatientDefenseFocusFighter(initialState, 2)
    all {
      assert(not(result.state.bonusActionAvailable)),
      assert(result.state.disengaged),
      assert(result.state.fighter.dodging),
      assert(result.focusPointsRemaining == 1),
    }
  }

  run test_monk_focus_step_of_the_wind_free_spends_bonus_action_and_dashes = all {
    val result = monkFocusStepOfTheWindFreeFighter(initialState, WalkSpeedKind)
    all {
      assert(not(result.bonusActionAvailable)),
      assert(not(result.disengaged)),
      assert(result.dashMovementBonus == 30),
    }
  }

  run test_monk_focus_step_of_the_wind_focus_spends_and_dashes = all {
    val result = monkFocusStepOfTheWindFocusFighter(initialState, 2, WalkSpeedKind)
    all {
      assert(result.state.dashMovementBonus == 30),
      assert(result.state.disengaged),
      assert(result.state.jumpDistanceMultiplier == 2),
      assert(result.focusPointsRemaining == 1),
    }
  }

  run test_monk_focus_flurry_spends_once_and_grants_two_strikes = all {
    val activated = monkFocusFlurryOfBlowsFighter(initialState, 2)
    val firstStrike = monkFocusFlurryOfBlowsStrike(
      activated.state,
      activated.focusPointsRemaining,
      activated.flurryStrikesRemaining,
    )
    val secondStrike = monkFocusFlurryOfBlowsStrike(
      firstStrike.state,
      firstStrike.focusPointsRemaining,
      firstStrike.flurryStrikesRemaining,
    )
    all {
      assert(not(activated.state.bonusActionAvailable)),
      assert(activated.focusPointsRemaining == 1),
      assert(activated.flurryStrikesRemaining == 2),
      assert(firstStrike.flurryStrikesRemaining == 1),
      assert(secondStrike.flurryStrikesRemaining == 0),
    }
  }

  run test_heightened_focus_flurry_grants_three_strikes = all {
    val activated = monkFocusFlurryOfBlowsFighterAtMonkLevel(initialState, 10, 10)
    val firstStrike = monkFocusFlurryOfBlowsStrike(
      activated.state,
      activated.focusPointsRemaining,
      activated.flurryStrikesRemaining,
    )
    val secondStrike = monkFocusFlurryOfBlowsStrike(
      firstStrike.state,
      firstStrike.focusPointsRemaining,
      firstStrike.flurryStrikesRemaining,
    )
    val thirdStrike = monkFocusFlurryOfBlowsStrike(
      secondStrike.state,
      secondStrike.focusPointsRemaining,
      secondStrike.flurryStrikesRemaining,
    )
    all {
      assert(activated.focusPointsRemaining == 9),
      assert(activated.flurryStrikesRemaining == 3),
      assert(firstStrike.flurryStrikesRemaining == 2),
      assert(secondStrike.flurryStrikesRemaining == 1),
      assert(thirdStrike.flurryStrikesRemaining == 0),
    }
  }

  run test_heightened_focus_patient_defense_projects_temporary_hit_points = all {
    val result = monkFocusPatientDefenseFocusFighterAtMonkLevel(initialState, 10, 10, 3, 4)
    all {
      assert(result.state.fighter.dodging),
      assert(result.state.disengaged),
      assert(result.state.fighter.tempHp == 7),
      assert(result.focusPointsRemaining == 9),
    }
  }

  run test_heightened_focus_step_of_the_wind_carries_eligible_creature = all {
    val result =
      monkFocusHeightenedStepOfTheWindCarryFighter(initialState, 10, WalkSpeedKind, 10, true)
    all {
      assert(result.state.disengaged),
      assert(result.state.jumpDistanceMultiplier == 2),
      assert(result.focusPointsRemaining == 9),
      assert(result.carriedCreatureMovesWithFighter),
      assert(result.carriedCreatureOpportunityAttacksSuppressed),
    }
  }

  run test_heightened_focus_step_of_the_wind_rejects_ineligible_carry = all {
    val result =
      monkFocusHeightenedStepOfTheWindCarryFighter(initialState, 10, WalkSpeedKind, 10, false)
    all {
      assert(result.state.disengaged),
      assert(result.state.jumpDistanceMultiplier == 2),
      assert(result.focusPointsRemaining == 9),
      assert(not(result.carriedCreatureMovesWithFighter)),
      assert(not(result.carriedCreatureOpportunityAttacksSuppressed)),
    }
  }

  run test_monk_focus_flurry_strike_requires_action_eligible_fighter = all {
    val activated = monkFocusFlurryOfBlowsFighter(initialState, 2)
    val incapacitatedState = {
      ...activated.state,
      fighter: { ...activated.state.fighter, incapacitated: true },
    }
    val unconsciousState = {
      ...activated.state,
      fighter: { ...activated.state.fighter, unconscious: true },
    }
    val incapacitatedStrike = monkFocusFlurryOfBlowsStrike(
      incapacitatedState,
      activated.focusPointsRemaining,
      activated.flurryStrikesRemaining,
    )
    val unconsciousStrike = monkFocusFlurryOfBlowsStrike(
      unconsciousState,
      activated.focusPointsRemaining,
      activated.flurryStrikesRemaining,
    )
    all {
      assert(incapacitatedStrike.focusPointsRemaining == 1),
      assert(incapacitatedStrike.flurryStrikesRemaining == 2),
      assert(unconsciousStrike.focusPointsRemaining == 1),
      assert(unconsciousStrike.flurryStrikesRemaining == 2),
    }
  }
}
