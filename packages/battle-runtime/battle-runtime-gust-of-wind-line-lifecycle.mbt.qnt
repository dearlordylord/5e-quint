// -*- mode: Bluespec; -*-

module battleRuntimeGustOfWindLineLifecycleMbt {
  var qCurrentTurnRole: str
  var qActionAvailable: bool
  var qBonusActionAvailable: bool
  var qSpellAvailable: bool
  var qLineActive: bool
  var qCasterConcentrating: bool
  var qLineDirection: str
  var qLineMovementCostFeet: int
  var qHoles: Set[str]
  var qLastResult: str

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"
  pure val noDirection: str = "none"
  pure val northDirection: str = "north"
  pure val eastDirection: str = "east"
  pure val noHoles: Set[str] = Set()
  pure val initialLineSaveHoles: Set[str] = Set("InitialLineSave")
  pure val endTurnLineSaveHoles: Set[str] = Set("EndTurnLineSave")
  pure val directionChoiceHoles: Set[str] = Set("DirectionChoice")
  pure val movementTotalFeet: int = 5
  pure val movementCloserFeet: int = 5
  pure val movementCostFeet: int = 10

  action recordGustOfWindState(
    currentTurnRole: str,
    actionAvailable: bool,
    bonusActionAvailable: bool,
    spellAvailable: bool,
    lineActive: bool,
    casterConcentrating: bool,
    lineDirection: str,
    lineMovementCostFeet: int,
    holes: Set[str],
    lastResult: str,
  ): bool = all {
    qCurrentTurnRole' = currentTurnRole,
    qActionAvailable' = actionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qSpellAvailable' = spellAvailable,
    qLineActive' = lineActive,
    qCasterConcentrating' = casterConcentrating,
    qLineDirection' = lineDirection,
    qLineMovementCostFeet' = lineMovementCostFeet,
    qHoles' = holes,
    qLastResult' = lastResult,
  }

  action init = all {
    recordGustOfWindState(
      casterTurnRole,
      true,
      true,
      true,
      false,
      false,
      noDirection,
      0,
      noHoles,
      "init",
    ),
  }

  action doDiscoverInitialLineSave = all {
    qCurrentTurnRole == casterTurnRole,
    qActionAvailable,
    qSpellAvailable,
    not(qLineActive),
    qHoles == noHoles,
    recordGustOfWindState(
      casterTurnRole,
      true,
      true,
      true,
      false,
      false,
      noDirection,
      0,
      initialLineSaveHoles,
      "needsHoles",
    ),
  }

  action doCastInitialSaveSuccess = all {
    qCurrentTurnRole == casterTurnRole,
    qHoles == initialLineSaveHoles,
    recordGustOfWindState(
      casterTurnRole,
      false,
      true,
      false,
      true,
      true,
      northDirection,
      0,
      noHoles,
      "initialSaveSucceeded",
    ),
  }

  action doCastInitialSaveFailure = all {
    qCurrentTurnRole == casterTurnRole,
    qHoles == initialLineSaveHoles,
    recordGustOfWindState(
      casterTurnRole,
      false,
      true,
      false,
      true,
      true,
      northDirection,
      0,
      noHoles,
      "initialSaveFailed",
    ),
  }

  action doTrySameTurnDirectionChangeBlocked = all {
    qCurrentTurnRole == casterTurnRole,
    qLineActive,
    qBonusActionAvailable,
    qHoles == noHoles,
    qLastResult.in(Set("initialSaveSucceeded", "initialSaveFailed")),
    recordGustOfWindState(
      casterTurnRole,
      qActionAvailable,
      qBonusActionAvailable,
      qSpellAvailable,
      true,
      true,
      qLineDirection,
      0,
      noHoles,
      "directionChangeBlocked",
    ),
  }

  action doEndCasterTurn = all {
    qCurrentTurnRole == casterTurnRole,
    qLineActive,
    qCasterConcentrating,
    qHoles == noHoles,
    recordGustOfWindState(
      targetTurnRole,
      true,
      true,
      qSpellAvailable,
      true,
      true,
      qLineDirection,
      0,
      noHoles,
      "endCasterTurn",
    ),
  }

  action doDiscoverEndTurnLineSave = all {
    qCurrentTurnRole == targetTurnRole,
    qLineActive,
    qHoles == noHoles,
    recordGustOfWindState(
      targetTurnRole,
      qActionAvailable,
      qBonusActionAvailable,
      qSpellAvailable,
      true,
      true,
      qLineDirection,
      0,
      endTurnLineSaveHoles,
      "needsHoles",
    ),
  }

  action doFillEndTurnSaveSuccess = all {
    qCurrentTurnRole == targetTurnRole,
    qHoles == endTurnLineSaveHoles,
    recordGustOfWindState(
      casterTurnRole,
      true,
      true,
      qSpellAvailable,
      true,
      true,
      qLineDirection,
      0,
      noHoles,
      "endTurnSaveSucceeded",
    ),
  }

  action doFillEndTurnSaveFailure = all {
    qCurrentTurnRole == targetTurnRole,
    qHoles == endTurnLineSaveHoles,
    recordGustOfWindState(
      casterTurnRole,
      true,
      true,
      qSpellAvailable,
      true,
      true,
      qLineDirection,
      0,
      noHoles,
      "endTurnSaveFailed",
    ),
  }

  action doMoveCloserThroughLine = all {
    qCurrentTurnRole == targetTurnRole,
    qLineActive,
    qHoles == noHoles,
    qLineMovementCostFeet == 0,
    movementCostFeet == movementTotalFeet + movementCloserFeet,
    recordGustOfWindState(
      targetTurnRole,
      qActionAvailable,
      qBonusActionAvailable,
      qSpellAvailable,
      true,
      true,
      qLineDirection,
      movementCostFeet,
      noHoles,
      "movedCloser",
    ),
  }

  action doDiscoverDirectionChange = all {
    qCurrentTurnRole == casterTurnRole,
    qLineActive,
    qLineDirection == northDirection,
    qBonusActionAvailable,
    qHoles == noHoles,
    qLastResult.in(Set("endTurnSaveSucceeded", "endTurnSaveFailed")),
    recordGustOfWindState(
      casterTurnRole,
      qActionAvailable,
      qBonusActionAvailable,
      qSpellAvailable,
      true,
      true,
      northDirection,
      0,
      directionChoiceHoles,
      "needsHoles",
    ),
  }

  action doChangeDirectionEast = all {
    qCurrentTurnRole == casterTurnRole,
    qHoles == directionChoiceHoles,
    recordGustOfWindState(
      casterTurnRole,
      qActionAvailable,
      false,
      qSpellAvailable,
      true,
      true,
      eastDirection,
      0,
      noHoles,
      "directionChanged",
    ),
  }

  action doBreakConcentration = all {
    qLineActive,
    qCasterConcentrating,
    qHoles == noHoles,
    recordGustOfWindState(
      qCurrentTurnRole,
      qActionAvailable,
      qBonusActionAvailable,
      qSpellAvailable,
      false,
      false,
      noDirection,
      0,
      noHoles,
      "concentrationBroken",
    ),
  }

  action step = any {
    doDiscoverInitialLineSave,
    doCastInitialSaveSuccess,
    doCastInitialSaveFailure,
    doTrySameTurnDirectionChangeBlocked,
    doEndCasterTurn,
    doDiscoverEndTurnLineSave,
    doFillEndTurnSaveSuccess,
    doFillEndTurnSaveFailure,
    doMoveCloserThroughLine,
    doDiscoverDirectionChange,
    doChangeDirectionEast,
    doBreakConcentration,
  }
}
