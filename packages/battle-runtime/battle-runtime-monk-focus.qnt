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
  // - Classes/Monk.md Level 10: Heightened Focus modifies those existing
  //   options, including a willing carried creature for Step of the Wind.
  // - UBIQUITOUS_LANGUAGE.md: Bonus Action, Unarmed Strike, Movement, Long
  //   Jump, and High Jump.

  type MonkFocusStepOfTheWindCarryResult = {
    state: BattleState,
    focusPointsRemaining: int,
    carriedCreatureMovesWithFighter: bool,
    carriedCreatureOpportunityAttacksSuppressed: bool,
  }

  pure def monkFocusPointsAtMonkLevel(monkLevel: int): int =
    if (monkLevel < 2) 0 else monkLevel

  pure def monkFocusHasHeightenedFocus(monkLevel: int): bool =
    monkLevel >= 10

  pure def monkFocusFlurryStrikeCountAtMonkLevel(monkLevel: int): int =
    if (monkFocusHasHeightenedFocus(monkLevel)) 3 else 2

  pure def monkFocusMartialArtsDieSizeAtMonkLevel(monkLevel: int): int =
    if (monkLevel >= 17) 12
    else if (monkLevel >= 11) 10
    else if (monkLevel >= 5) 8
    else 6

  pure def monkFocusHeightenedPatientDefenseTemporaryHitPoints(
    state: BattleState,
    monkLevel: int,
    firstMartialArtsDieRoll: int,
    secondMartialArtsDieRoll: int,
  ): BattleState =
    if (monkFocusHasHeightenedFocus(monkLevel))
      {
        ...state,
        fighter: {
          ...state.fighter,
          tempHp: if (
            state.fighter.tempHp > firstMartialArtsDieRoll + secondMartialArtsDieRoll
          ) state.fighter.tempHp else firstMartialArtsDieRoll + secondMartialArtsDieRoll,
        },
      }
    else
      state

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

  pure def monkFocusStepOfTheWindCarryResult(
    state: BattleState,
    focusPointsRemaining: int,
    carriedCreatureMovesWithFighter: bool,
    carriedCreatureOpportunityAttacksSuppressed: bool,
  ): MonkFocusStepOfTheWindCarryResult =
    {
      state: state,
      focusPointsRemaining: focusPointsRemaining,
      carriedCreatureMovesWithFighter: carriedCreatureMovesWithFighter,
      carriedCreatureOpportunityAttacksSuppressed:
        carriedCreatureOpportunityAttacksSuppressed,
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
      battleRuntimeSpendBonusAction(movementProjectionForFighter(state, WalkSpeedKind)).step,
    )

  pure def monkFocusFlurryOfBlowsFighter(
    state: BattleState,
    focusPointsRemaining: int,
  ): MonkFocusBattleOptionResult =
    monkFocusFlurryOfBlowsFighterAtMonkLevel(state, focusPointsRemaining, 2)

  pure def monkFocusFlurryOfBlowsFighterAtMonkLevel(
    state: BattleState,
    focusPointsRemaining: int,
    monkLevel: int,
  ): MonkFocusBattleOptionResult =
    if (fighterCanUseMonkFocusBonusAction(state) and focusPointsRemaining > 0)
      monkFocusBattleOptionResult(
        spendFighterMonkFocusBonusAction(state),
        focusPointsRemaining - 1,
        monkFocusFlurryStrikeCountAtMonkLevel(monkLevel),
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
    monkFocusPatientDefenseFocusFighterAtMonkLevel(state, focusPointsRemaining, 2, 0, 0)

  pure def monkFocusPatientDefenseFocusFighterAtMonkLevel(
    state: BattleState,
    focusPointsRemaining: int,
    monkLevel: int,
    firstMartialArtsDieRoll: int,
    secondMartialArtsDieRoll: int,
  ): MonkFocusBattleOptionResult =
    if (fighterCanUseMonkFocusBonusAction(state) and focusPointsRemaining > 0) {
      val spent = spendFighterMonkFocusBonusAction(state)
      monkFocusBattleOptionResult(
        monkFocusHeightenedPatientDefenseTemporaryHitPoints({
          ...spent,
          disengaged: true,
          fighter: { ...spent.fighter, dodging: true },
        }, monkLevel, firstMartialArtsDieRoll, secondMartialArtsDieRoll),
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

  pure def monkFocusHeightenedStepOfTheWindCarryFighter(
    state: BattleState,
    focusPointsRemaining: int,
    speedKind: MovementSpeedKind,
    monkLevel: int,
    carryEligible: bool,
  ): MonkFocusStepOfTheWindCarryResult =
    if (
      fighterCanUseMonkFocusBonusAction(state)
        and focusPointsRemaining > 0
        and monkFocusHasHeightenedFocus(monkLevel)
    ) {
      val stepped =
        monkFocusStepOfTheWindFocusFighter(state, focusPointsRemaining, speedKind)
      monkFocusStepOfTheWindCarryResult(
        stepped.state,
        stepped.focusPointsRemaining,
        carryEligible,
        carryEligible,
      )
    } else {
      monkFocusStepOfTheWindCarryResult(state, focusPointsRemaining, false, false)
    }
}
