// -*- mode: Bluespec; -*-

module battleRuntimeMovementForcedMovementSelectedIdentityMbt {
  var qCasterSpeedFeet: int
  var qCasterRemainingFeet: int
  var qCasterDashBonusFeet: int
  var qCasterBonusActionAvailable: bool
  var qCasterConcentrating: bool
  var qSpellSlotSpentThisTurn: bool
  var qLevel1SlotsRemaining: int
  var qSpellDashBonusActionEffectCount: int
  var qTargetHp: int
  var qTargetReactionAvailable: bool
  var qDissonantMovementFillRequired: bool
  var qTargetMovementSpentFeet: int
  var qCommandMovementFillRequired: bool
  var qCommandPendingEffectObserved: bool
  var qCommandPendingEffectCount: int
  var qClimbSpeedFeet: int
  var qSwimSpeedFeet: int
  var qLastResult: str

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
    qCasterSpeedFeet' = casterSpeedFeet,
    qCasterRemainingFeet' = casterRemainingFeet,
    qCasterDashBonusFeet' = casterDashBonusFeet,
    qCasterBonusActionAvailable' = casterBonusActionAvailable,
    qCasterConcentrating' = casterConcentrating,
    qSpellSlotSpentThisTurn' = spellSlotSpentThisTurn,
    qLevel1SlotsRemaining' = level1SlotsRemaining,
    qSpellDashBonusActionEffectCount' = spellDashBonusActionEffectCount,
    qTargetHp' = targetHp,
    qTargetReactionAvailable' = targetReactionAvailable,
    qDissonantMovementFillRequired' = dissonantMovementFillRequired,
    qTargetMovementSpentFeet' = targetMovementSpentFeet,
    qCommandMovementFillRequired' = commandMovementFillRequired,
    qCommandPendingEffectObserved' = commandPendingEffectObserved,
    qCommandPendingEffectCount' = commandPendingEffectCount,
    qClimbSpeedFeet' = climbSpeedFeet,
    qSwimSpeedFeet' = swimSpeedFeet,
    qLastResult' = lastResult,
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

  action step = any {
    doDissonantWhispersForcedReactionMovement,
    doCommandFleeTargetTurn,
    doExpeditiousRetreatImmediateDash,
    doRangerRovingClimbSwimMovement,
    doBarbarianFastMovementDash,
  }
}
