// -*- mode: Bluespec; -*-

module battleRuntimeWebRestraintHazardMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = str

  type WebRestraintHazardScenarioOutcome = | Init | Resolved | NeedsHoles | Restrained | Saved | EscapeFailed | Escaped | LeftArea | Moved | Removed


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
  var qScenarioOutcome: WebRestraintHazardScenarioOutcome

  pure def qHoles: Set[Hole] = qProtocol.holes
  pure def qLastResult: WebRestraintHazardScenarioOutcome = qScenarioOutcome

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"
  pure val noHoles: Set[str] = Set()
  pure val entrySavingThrowOutcomeHoles: Set[str] = Set("EntrySavingThrowOutcome")
  pure val startTurnSavingThrowOutcomeHoles: Set[str] = Set("StartTurnSavingThrowOutcome")
  pure val webMovementSpentFeet: int = 15

  pure def webProtocolForProjection(
    holes: Set[Hole],
    scenarioResult: WebRestraintHazardScenarioOutcome,
  ): WitnessProtocol[Hole] =
    if (scenarioResult == Init) witnessInit("EntrySavingThrowOutcome")
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
    lastResult: WebRestraintHazardScenarioOutcome,
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
    qScenarioOutcome' = lastResult,
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
      Init,
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
      Resolved,
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
      Resolved,
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
      NeedsHoles,
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
      NeedsHoles,
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
      Restrained,
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
      Saved,
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
      Restrained,
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
      Saved,
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
      EscapeFailed,
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
      Escaped,
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
      LeftArea,
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
      Moved,
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
      Removed,
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
