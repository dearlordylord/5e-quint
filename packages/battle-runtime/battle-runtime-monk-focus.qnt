// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.monk-focus-battle-options
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
module battleRuntimeMonkFocus {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  // RAW anchors:
  // - Classes/Monk.md Level 2: Monk's Focus, Flurry of Blows, Patient Defense,
  //   and Step of the Wind.
  // - UBIQUITOUS_LANGUAGE.md: Bonus Action, Unarmed Strike, Movement, Long
  //   Jump, and High Jump.

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
          jumpDistanceMultiplier: 2,
        },
        focusPointsRemaining - 1,
        0,
      )
    } else {
      monkFocusBattleOptionResult(state, focusPointsRemaining, 0)
    }
}
