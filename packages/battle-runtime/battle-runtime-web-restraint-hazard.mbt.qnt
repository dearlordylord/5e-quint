// -*- mode: Bluespec; -*-

module battleRuntimeWebRestraintHazardMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = str

  var qCurrentTurnRole: str
  var qActionAvailable: bool
  var qSpellAvailable: bool
  var qHazardActive: bool
  var qCasterConcentrating: bool
  var qTargetRestrained: bool
  var qEntrySavedThisTurn: bool
  var qStartTurnSavedThisTurn: bool
  var qMovementSpentFeet: int
  var qProtocol: WitnessProtocol[Hole]
  var qScenarioResult: str

  pure def qHoles: Set[Hole] = qProtocol.holes
  pure def qLastResult: str = qScenarioResult

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"
  pure val noHoles: Set[str] = Set()
  pure val entrySavingThrowOutcomeHoles: Set[str] = Set("EntrySavingThrowOutcome")
  pure val startTurnSavingThrowOutcomeHoles: Set[str] = Set("StartTurnSavingThrowOutcome")
  pure val webMovementSpentFeet: int = 15

  pure def webProtocolForProjection(
    holes: Set[Hole],
    scenarioResult: str,
  ): WitnessProtocol[Hole] =
    if (scenarioResult == "init") witnessInit("EntrySavingThrowOutcome")
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved("EntrySavingThrowOutcome")

  action recordWebState(
    currentTurnRole: str,
    actionAvailable: bool,
    spellAvailable: bool,
    hazardActive: bool,
    casterConcentrating: bool,
    targetRestrained: bool,
    entrySavedThisTurn: bool,
    startTurnSavedThisTurn: bool,
    movementSpentFeet: int,
    holes: Set[str],
    lastResult: str,
  ): bool = all {
    qCurrentTurnRole' = currentTurnRole,
    qActionAvailable' = actionAvailable,
    qSpellAvailable' = spellAvailable,
    qHazardActive' = hazardActive,
    qCasterConcentrating' = casterConcentrating,
    qTargetRestrained' = targetRestrained,
    qEntrySavedThisTurn' = entrySavedThisTurn,
    qStartTurnSavedThisTurn' = startTurnSavedThisTurn,
    qMovementSpentFeet' = movementSpentFeet,
    qProtocol' = webProtocolForProjection(holes, lastResult),
    qScenarioResult' = lastResult,
  }

  action init = all {
    recordWebState(
      casterTurnRole,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      0,
      noHoles,
      "init",
    ),
  }

  action doCastWeb = all {
    qCurrentTurnRole == casterTurnRole,
    qActionAvailable,
    qSpellAvailable,
    not(qHazardActive),
    qHoles == noHoles,
    recordWebState(
      casterTurnRole,
      false,
      false,
      true,
      true,
      false,
      false,
      false,
      qMovementSpentFeet,
      noHoles,
      "resolved",
    ),
  }

  action doEndCasterTurn = all {
    qCurrentTurnRole == casterTurnRole,
    qHazardActive,
    qCasterConcentrating,
    qHoles == noHoles,
    recordWebState(
      targetTurnRole,
      true,
      qSpellAvailable,
      true,
      true,
      qTargetRestrained,
      qEntrySavedThisTurn,
      qStartTurnSavedThisTurn,
      qMovementSpentFeet,
      noHoles,
      "resolved",
    ),
  }

  action doDiscoverEntrySave = all {
    qCurrentTurnRole == targetTurnRole,
    qHazardActive,
    not(qEntrySavedThisTurn),
    qHoles == noHoles,
    recordWebState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      qTargetRestrained,
      false,
      qStartTurnSavedThisTurn,
      qMovementSpentFeet,
      entrySavingThrowOutcomeHoles,
      "needsHoles",
    ),
  }

  action doDiscoverStartTurnSave = all {
    qCurrentTurnRole == targetTurnRole,
    qHazardActive,
    not(qStartTurnSavedThisTurn),
    qHoles == noHoles,
    recordWebState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      qTargetRestrained,
      qEntrySavedThisTurn,
      false,
      qMovementSpentFeet,
      startTurnSavingThrowOutcomeHoles,
      "needsHoles",
    ),
  }

  action doFillEntrySaveFailure = all {
    qCurrentTurnRole == targetTurnRole,
    qHoles == entrySavingThrowOutcomeHoles,
    recordWebState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      true,
      true,
      qStartTurnSavedThisTurn,
      qMovementSpentFeet,
      noHoles,
      "restrained",
    ),
  }

  action doFillEntrySaveSuccess = all {
    qCurrentTurnRole == targetTurnRole,
    qHoles == entrySavingThrowOutcomeHoles,
    recordWebState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      qTargetRestrained,
      true,
      qStartTurnSavedThisTurn,
      qMovementSpentFeet,
      noHoles,
      "saved",
    ),
  }

  action doFillStartTurnSaveFailure = all {
    qCurrentTurnRole == targetTurnRole,
    qHoles == startTurnSavingThrowOutcomeHoles,
    recordWebState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      true,
      qEntrySavedThisTurn,
      true,
      qMovementSpentFeet,
      noHoles,
      "restrained",
    ),
  }

  action doFillStartTurnSaveSuccess = all {
    qCurrentTurnRole == targetTurnRole,
    qHoles == startTurnSavingThrowOutcomeHoles,
    recordWebState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      qTargetRestrained,
      qEntrySavedThisTurn,
      true,
      qMovementSpentFeet,
      noHoles,
      "saved",
    ),
  }

  action doEscapeWebFailure = all {
    qCurrentTurnRole == targetTurnRole,
    qActionAvailable,
    qTargetRestrained,
    qHoles == noHoles,
    recordWebState(
      targetTurnRole,
      false,
      qSpellAvailable,
      qHazardActive,
      qCasterConcentrating,
      true,
      qEntrySavedThisTurn,
      qStartTurnSavedThisTurn,
      qMovementSpentFeet,
      noHoles,
      "escapeFailed",
    ),
  }

  action doEscapeWebSuccess = all {
    qCurrentTurnRole == targetTurnRole,
    qActionAvailable,
    qTargetRestrained,
    qHoles == noHoles,
    recordWebState(
      targetTurnRole,
      false,
      qSpellAvailable,
      qHazardActive,
      qCasterConcentrating,
      false,
      qEntrySavedThisTurn,
      qStartTurnSavedThisTurn,
      qMovementSpentFeet,
      noHoles,
      "escaped",
    ),
  }

  action doNoLongerInArea = all {
    qCurrentTurnRole == targetTurnRole,
    qHazardActive,
    qTargetRestrained,
    qHoles == noHoles,
    recordWebState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      false,
      qEntrySavedThisTurn,
      qStartTurnSavedThisTurn,
      qMovementSpentFeet,
      noHoles,
      "leftArea",
    ),
  }

  action doMoveWithDifficultTerrain = all {
    qCurrentTurnRole == targetTurnRole,
    qHazardActive,
    not(qTargetRestrained),
    qMovementSpentFeet == 0,
    qHoles == noHoles,
    recordWebState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      qTargetRestrained,
      qEntrySavedThisTurn,
      qStartTurnSavedThisTurn,
      webMovementSpentFeet,
      noHoles,
      "moved",
    ),
  }

  action doRemoveArea = all {
    qHazardActive,
    qHoles == noHoles,
    recordWebState(
      qCurrentTurnRole,
      qActionAvailable,
      qSpellAvailable,
      false,
      false,
      false,
      false,
      false,
      qMovementSpentFeet,
      noHoles,
      "removed",
    ),
  }

  action step = any {
    doCastWeb,
    doEndCasterTurn,
    doDiscoverEntrySave,
    doDiscoverStartTurnSave,
    doFillEntrySaveFailure,
    doFillEntrySaveSuccess,
    doFillStartTurnSaveFailure,
    doFillStartTurnSaveSuccess,
    doEscapeWebFailure,
    doEscapeWebSuccess,
    doNoLongerInArea,
    doMoveWithDifficultTerrain,
    doRemoveArea,
  }
}
