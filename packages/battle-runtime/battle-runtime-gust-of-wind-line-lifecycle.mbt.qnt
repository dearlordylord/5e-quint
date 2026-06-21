// -*- mode: Bluespec; -*-

module battleRuntimeGustOfWindLineLifecycleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type GustOfWindLineLifecycleScenarioOutcome = | Init | NeedsHoles | InitialSaveSucceeded | InitialSaveFailed | MovedCloser | EndTurnSaveSucceeded | EndTurnSaveFailed | DirectionChanged | DirectionChangeBlocked | EndCasterTurn | ConcentrationBroken

  type GustOfWindLineLifecycleWitnessState = {
    qCurrentTurnRole: str,
    qActionAvailable: bool,
    qBonusActionAvailable: bool,
    qSpellAvailable: bool,
    qLineActive: bool,
    qCasterConcentrating: bool,
    qLineDirection: str,
    qLineMovementCostFeet: int,
    qScenarioOutcome: GustOfWindLineLifecycleScenarioOutcome,
    protocol: WitnessProtocol[str],
  }

  var qState: GustOfWindLineLifecycleWitnessState

  pure def qCurrentTurnRole: str = qState.qCurrentTurnRole
  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qSpellAvailable: bool = qState.qSpellAvailable
  pure def qLineActive: bool = qState.qLineActive
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qLineDirection: str = qState.qLineDirection
  pure def qLineMovementCostFeet: int = qState.qLineMovementCostFeet
  pure def scenarioOutcome: GustOfWindLineLifecycleScenarioOutcome = qState.qScenarioOutcome
  pure def openHoles: Set[str] = qState.protocol.holes

  pure def gustOfWindLineLifecycleProtocolForProjection(
    holes: Set[str],
    scenarioOutcome: GustOfWindLineLifecycleScenarioOutcome,
  ): WitnessProtocol[str] =
    if (scenarioOutcome == Init) witnessInit("WitnessHole")
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved("WitnessHole")


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
    lastResult: GustOfWindLineLifecycleScenarioOutcome,
  ): bool = all {
    qState' = {
      qCurrentTurnRole: currentTurnRole,
      qActionAvailable: actionAvailable,
      qBonusActionAvailable: bonusActionAvailable,
      qSpellAvailable: spellAvailable,
      qLineActive: lineActive,
      qCasterConcentrating: casterConcentrating,
      qLineDirection: lineDirection,
      qLineMovementCostFeet: lineMovementCostFeet,
      qScenarioOutcome: lastResult,
      protocol: gustOfWindLineLifecycleProtocolForProjection(holes, lastResult),
    },
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
      Init,
    ),
  }

  action doDiscoverInitialLineSave = all {
    qCurrentTurnRole == casterTurnRole,
    qActionAvailable,
    qSpellAvailable,
    not(qLineActive),
    openHoles == noHoles,
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
      NeedsHoles,
    ),
  }

  action doCastInitialSaveSuccess = all {
    qCurrentTurnRole == casterTurnRole,
    openHoles == initialLineSaveHoles,
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
      InitialSaveSucceeded,
    ),
  }

  action doCastInitialSaveFailure = all {
    qCurrentTurnRole == casterTurnRole,
    openHoles == initialLineSaveHoles,
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
      InitialSaveFailed,
    ),
  }

  action doTrySameTurnDirectionChangeBlocked = all {
    qCurrentTurnRole == casterTurnRole,
    qLineActive,
    qBonusActionAvailable,
    openHoles == noHoles,
    scenarioOutcome.in(Set(InitialSaveSucceeded, InitialSaveFailed)),
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
      DirectionChangeBlocked,
    ),
  }

  action doEndCasterTurn = all {
    qCurrentTurnRole == casterTurnRole,
    qLineActive,
    qCasterConcentrating,
    openHoles == noHoles,
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
      EndCasterTurn,
    ),
  }

  action doDiscoverEndTurnLineSave = all {
    qCurrentTurnRole == targetTurnRole,
    qLineActive,
    openHoles == noHoles,
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
      NeedsHoles,
    ),
  }

  action doFillEndTurnSaveSuccess = all {
    qCurrentTurnRole == targetTurnRole,
    openHoles == endTurnLineSaveHoles,
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
      EndTurnSaveSucceeded,
    ),
  }

  action doFillEndTurnSaveFailure = all {
    qCurrentTurnRole == targetTurnRole,
    openHoles == endTurnLineSaveHoles,
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
      EndTurnSaveFailed,
    ),
  }

  action doMoveCloserThroughLine = all {
    qCurrentTurnRole == targetTurnRole,
    qLineActive,
    openHoles == noHoles,
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
      MovedCloser,
    ),
  }

  action doDiscoverDirectionChange = all {
    qCurrentTurnRole == casterTurnRole,
    qLineActive,
    qLineDirection == northDirection,
    qBonusActionAvailable,
    openHoles == noHoles,
    scenarioOutcome.in(Set(EndTurnSaveSucceeded, EndTurnSaveFailed)),
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
      NeedsHoles,
    ),
  }

  action doChangeDirectionEast = all {
    qCurrentTurnRole == casterTurnRole,
    openHoles == directionChoiceHoles,
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
      DirectionChanged,
    ),
  }

  action doBreakConcentration = all {
    qLineActive,
    qCasterConcentrating,
    openHoles == noHoles,
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
      ConcentrationBroken,
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
