// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.monk-focus-battle-options
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.monk-focus-battle-options
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
module battleRuntimeMonkFocus {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  pure def monkFocusPointsAtMonkLevel(monkLevel: int): int =
    if (monkLevel < 2) 0 else monkLevel

  pure def monkFocusBattleOptionResult(
    state: BattleState,
    focusPointsRemaining: int,
    flurryStrikesRemaining: int,
  ): MonkFocusBattleOptionResult =
    {
      state: state,
      focusPointsRemaining: focusPointsRemaining,
      flurryStrikesRemaining: flurryStrikesRemaining,
    }

  pure def fighterCanUseMonkFocusBonusAction(state: BattleState): bool =
    currentActor(state) == Fighter
      and state.bonusActionAvailable
      and not(state.fighter.unconscious)
      and not(state.fighter.incapacitated)

  pure def fighterCanUseMonkFocusFlurryStrike(state: BattleState): bool =
    currentActor(state) == Fighter
      and not(state.fighter.unconscious)
      and not(state.fighter.incapacitated)

  pure def spendFighterMonkFocusBonusAction(state: BattleState): BattleState =
    stateWithFighterMovementStep(
      state,
      battleRuntimeSpendBonusAction(movementProjectionForFighter(state, WalkSpeedKind)),
    )

  pure def monkFocusFlurryOfBlowsFighter(
    state: BattleState,
    focusPointsRemaining: int,
  ): MonkFocusBattleOptionResult =
    if (fighterCanUseMonkFocusBonusAction(state) and focusPointsRemaining > 0)
      monkFocusBattleOptionResult(
        spendFighterMonkFocusBonusAction(state),
        focusPointsRemaining - 1,
        2,
      )
    else
      monkFocusBattleOptionResult(state, focusPointsRemaining, 0)

  pure def monkFocusFlurryOfBlowsStrike(
    state: BattleState,
    focusPointsRemaining: int,
    flurryStrikesRemaining: int,
  ): MonkFocusBattleOptionResult =
    if (fighterCanUseMonkFocusFlurryStrike(state) and flurryStrikesRemaining > 0)
      monkFocusBattleOptionResult(
        state,
        focusPointsRemaining,
        flurryStrikesRemaining - 1,
      )
    else
      monkFocusBattleOptionResult(
        state,
        focusPointsRemaining,
        flurryStrikesRemaining,
      )

  pure def monkFocusPatientDefenseFreeFighter(state: BattleState): BattleState =
    if (fighterCanUseMonkFocusBonusAction(state))
      { ...spendFighterMonkFocusBonusAction(state), disengaged: true }
    else
      state

  pure def monkFocusPatientDefenseFocusFighter(
    state: BattleState,
    focusPointsRemaining: int,
  ): MonkFocusBattleOptionResult =
    if (fighterCanUseMonkFocusBonusAction(state) and focusPointsRemaining > 0) {
      val spent = spendFighterMonkFocusBonusAction(state)
      monkFocusBattleOptionResult(
        {
          ...spent,
          disengaged: true,
          fighter: { ...spent.fighter, dodging: true },
        },
        focusPointsRemaining - 1,
        0,
      )
    } else {
      monkFocusBattleOptionResult(state, focusPointsRemaining, 0)
    }

  pure def monkFocusStepOfTheWindFreeFighter(
    state: BattleState,
    speedKind: MovementSpeedKind,
  ): BattleState =
    if (fighterCanUseMonkFocusBonusAction(state))
      stateWithFighterMovementStep(
        state,
        battleRuntimeBonusActionDash(
          movementProjectionForFighter(state, speedKind),
          movementSpeed(state.fighter, speedKind),
        ),
      )
    else
      state

  pure def monkFocusStepOfTheWindFocusFighter(
    state: BattleState,
    focusPointsRemaining: int,
    speedKind: MovementSpeedKind,
  ): MonkFocusBattleOptionResult =
    if (fighterCanUseMonkFocusBonusAction(state) and focusPointsRemaining > 0) {
      val dashed = monkFocusStepOfTheWindFreeFighter(state, speedKind)
      monkFocusBattleOptionResult(
        {
          ...dashed,
          disengaged: true,
        },
        focusPointsRemaining - 1,
        0,
      )
    } else {
      monkFocusBattleOptionResult(state, focusPointsRemaining, 0)
    }

  run monk_focus_points_equal_monk_level = all {
    assert(monkFocusPointsAtMonkLevel(1) == 0),
    assert(monkFocusPointsAtMonkLevel(2) == 2),
    assert(monkFocusPointsAtMonkLevel(3) == 3),
  }

  run monk_focus_patient_defense_free_spends_bonus_action_and_disengages = all {
    val result = monkFocusPatientDefenseFreeFighter(initialState)
    all {
      assert(not(result.bonusActionAvailable)),
      assert(result.disengaged),
      assert(not(result.fighter.dodging)),
    }
  }

  run monk_focus_patient_defense_focus_spends_bonus_action_and_focus = all {
    val result = monkFocusPatientDefenseFocusFighter(initialState, 2)
    all {
      assert(not(result.state.bonusActionAvailable)),
      assert(result.state.disengaged),
      assert(result.state.fighter.dodging),
      assert(result.focusPointsRemaining == 1),
    }
  }

  run monk_focus_step_of_the_wind_free_spends_bonus_action_and_dashes = all {
    val result = monkFocusStepOfTheWindFreeFighter(initialState, WalkSpeedKind)
    all {
      assert(not(result.bonusActionAvailable)),
      assert(not(result.disengaged)),
      assert(result.dashMovementBonus == 30),
    }
  }

  run monk_focus_step_of_the_wind_focus_spends_and_dashes = all {
    val result = monkFocusStepOfTheWindFocusFighter(initialState, 2, WalkSpeedKind)
    all {
      assert(result.state.dashMovementBonus == 30),
      assert(result.state.disengaged),
      assert(result.focusPointsRemaining == 1),
    }
  }

  run monk_focus_flurry_spends_once_and_grants_two_strikes = all {
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

  run monk_focus_flurry_strike_requires_action_eligible_fighter = all {
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
