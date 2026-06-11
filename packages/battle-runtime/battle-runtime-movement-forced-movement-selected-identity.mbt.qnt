// -*- mode: Bluespec; -*-

module battleRuntimeMovementForcedMovementSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type MovementForcedMovementSelectedIdentityWitnessState = {
    qCasterSpeedFeet: int,
    qCasterRemainingFeet: int,
    qCasterDashBonusFeet: int,
    qCasterBonusActionAvailable: bool,
    qCasterConcentrating: bool,
    qSpellSlotSpentThisTurn: bool,
    qLevel1SlotsRemaining: int,
    qSpellDashBonusActionEffectCount: int,
    qTargetHp: int,
    qTargetReactionAvailable: bool,
    qDissonantMovementFillRequired: bool,
    qTargetMovementSpentFeet: int,
    qCommandMovementFillRequired: bool,
    qCommandPendingEffectObserved: bool,
    qCommandPendingEffectCount: int,
    qClimbSpeedFeet: int,
    qSwimSpeedFeet: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: MovementForcedMovementSelectedIdentityWitnessState

  pure def qCasterSpeedFeet: int = qState.qCasterSpeedFeet
  pure def qCasterRemainingFeet: int = qState.qCasterRemainingFeet
  pure def qCasterDashBonusFeet: int = qState.qCasterDashBonusFeet
  pure def qCasterBonusActionAvailable: bool = qState.qCasterBonusActionAvailable
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qSpellSlotSpentThisTurn: bool = qState.qSpellSlotSpentThisTurn
  pure def qLevel1SlotsRemaining: int = qState.qLevel1SlotsRemaining
  pure def qSpellDashBonusActionEffectCount: int = qState.qSpellDashBonusActionEffectCount
  pure def qTargetHp: int = qState.qTargetHp
  pure def qTargetReactionAvailable: bool = qState.qTargetReactionAvailable
  pure def qDissonantMovementFillRequired: bool = qState.qDissonantMovementFillRequired
  pure def qTargetMovementSpentFeet: int = qState.qTargetMovementSpentFeet
  pure def qCommandMovementFillRequired: bool = qState.qCommandMovementFillRequired
  pure def qCommandPendingEffectObserved: bool = qState.qCommandPendingEffectObserved
  pure def qCommandPendingEffectCount: int = qState.qCommandPendingEffectCount
  pure def qClimbSpeedFeet: int = qState.qClimbSpeedFeet
  pure def qSwimSpeedFeet: int = qState.qSwimSpeedFeet
  pure def qLastResult: str = qState.qScenarioResult

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    casterSpeedFeet: int,
    casterRemainingFeet: int,
    casterDashBonusFeet: int,
    casterBonusActionAvailable: bool,
    casterConcentrating: bool,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    spellDashBonusActionEffectCount: int,
    targetHp: int,
    targetReactionAvailable: bool,
    dissonantMovementFillRequired: bool,
    targetMovementSpentFeet: int,
    commandMovementFillRequired: bool,
    commandPendingEffectObserved: bool,
    commandPendingEffectCount: int,
    climbSpeedFeet: int,
    swimSpeedFeet: int,
    lastResult: str,
  ): bool = all {
    qState' = {
      qCasterSpeedFeet: casterSpeedFeet,
      qCasterRemainingFeet: casterRemainingFeet,
      qCasterDashBonusFeet: casterDashBonusFeet,
      qCasterBonusActionAvailable: casterBonusActionAvailable,
      qCasterConcentrating: casterConcentrating,
      qSpellSlotSpentThisTurn: spellSlotSpentThisTurn,
      qLevel1SlotsRemaining: level1SlotsRemaining,
      qSpellDashBonusActionEffectCount: spellDashBonusActionEffectCount,
      qTargetHp: targetHp,
      qTargetReactionAvailable: targetReactionAvailable,
      qDissonantMovementFillRequired: dissonantMovementFillRequired,
      qTargetMovementSpentFeet: targetMovementSpentFeet,
      qCommandMovementFillRequired: commandMovementFillRequired,
      qCommandPendingEffectObserved: commandPendingEffectObserved,
      qCommandPendingEffectCount: commandPendingEffectCount,
      qClimbSpeedFeet: climbSpeedFeet,
      qSwimSpeedFeet: swimSpeedFeet,
      qScenarioResult: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }
  action init =
    recordProjection(
      30, 30, 0, true, false, false, 2, 0,
      12, true, false, 0, false, false, 0, 0, 0,
      "init",
    )

  action doDissonantWhispersForcedReactionMovement = all {
    qLastResult == "init",
    recordProjection(
      30, 30, 0, true, false, true, 1, 0,
      18, false, true, 0, false, false, 0, 0, 0,
      "dissonantWhispers",
    ),
  }

  action doCommandFleeTargetTurn = all {
    qLastResult == "init",
    recordProjection(
      30, 30, 0, true, false, false, 1, 0,
      12, true, false, 30, true, true, 0, 0, 0,
      "commandFlee",
    ),
  }

  action doExpeditiousRetreatImmediateDash = all {
    qLastResult == "init",
    recordProjection(
      30, 60, 30, false, true, true, 1, 1,
      12, true, false, 0, false, false, 0, 0, 0,
      "expeditiousRetreat",
    ),
  }

  action doRangerRovingClimbSwimMovement = all {
    qLastResult == "init",
    recordProjection(
      40, 0, 0, true, false, false, 0, 0,
      12, true, false, 0, false, false, 0, 40, 40,
      "rangerRoving",
    ),
  }

  action doBarbarianFastMovementDash = all {
    qLastResult == "init",
    recordProjection(
      40, 80, 40, true, false, false, 0, 0,
      12, true, false, 0, false, false, 0, 0, 0,
      "barbarianFastMovement",
    ),
  }

  action doMonkUnarmoredMovementDash = all {
    qLastResult == "init",
    recordProjection(
      40, 80, 40, true, false, false, 0, 0,
      12, true, false, 0, false, false, 0, 0, 0,
      "monkUnarmoredMovement",
    ),
  }

  action step = any {
    doDissonantWhispersForcedReactionMovement,
    doCommandFleeTargetTurn,
    doExpeditiousRetreatImmediateDash,
    doRangerRovingClimbSwimMovement,
    doBarbarianFastMovementDash,
    doMonkUnarmoredMovementDash,
  }
}
