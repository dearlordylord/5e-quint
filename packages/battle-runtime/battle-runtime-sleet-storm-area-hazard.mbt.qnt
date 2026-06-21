// -*- mode: Bluespec; -*-

module battleRuntimeSleetStormAreaHazardMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = str

  type SleetStormAreaHazardScenarioOutcome =
    | Init
    | Resolved
    | NeedsHoles
    | Prone
    | Saved
    | Moved
    | Reset

  var qCurrentTurnRole: str
  var qActionAvailable: bool
  var qSpellAvailable: bool
  var qHazardActive: bool
  var qCasterConcentrating: bool
  var qTargetConcentrating: bool
  var qTargetProne: bool
  var qSavedThisTurn: bool
  var qMovementSpentFeet: int
  var qHeavilyObscured: bool
  var qProtocol: WitnessProtocol[Hole]
  var qScenarioOutcome: SleetStormAreaHazardScenarioOutcome

  pure def openHoles: Set[Hole] = qProtocol.holes
  pure def scenarioOutcome: SleetStormAreaHazardScenarioOutcome = qScenarioOutcome

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"
  pure val noHoles: Set[str] = Set()
  pure val entrySavingThrowOutcomeHoles: Set[str] = Set("EntrySavingThrowOutcome")
  pure val startTurnSavingThrowOutcomeHoles: Set[str] = Set("StartTurnSavingThrowOutcome")
  pure val sleetStormMovementSpentFeet: int = 15

  pure def sleetStormProtocolForProjection(
    holes: Set[Hole],
    scenarioOutcome: SleetStormAreaHazardScenarioOutcome,
  ): WitnessProtocol[Hole] =
    if (scenarioOutcome == Init) witnessInit("EntrySavingThrowOutcome")
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved("EntrySavingThrowOutcome")

  action recordSleetStormState(
    currentTurnRole: str,
    actionAvailable: bool,
    spellAvailable: bool,
    hazardActive: bool,
    casterConcentrating: bool,
    targetConcentrating: bool,
    targetProne: bool,
    savedThisTurn: bool,
    movementSpentFeet: int,
    heavilyObscured: bool,
    holes: Set[str],
    lastResult: SleetStormAreaHazardScenarioOutcome,
  ): bool = all {
    qCurrentTurnRole' = currentTurnRole,
    qActionAvailable' = actionAvailable,
    qSpellAvailable' = spellAvailable,
    qHazardActive' = hazardActive,
    qCasterConcentrating' = casterConcentrating,
    qTargetConcentrating' = targetConcentrating,
    qTargetProne' = targetProne,
    qSavedThisTurn' = savedThisTurn,
    qMovementSpentFeet' = movementSpentFeet,
    qHeavilyObscured' = heavilyObscured,
    qProtocol' = sleetStormProtocolForProjection(holes, lastResult),
    qScenarioOutcome' = lastResult,
  }

  action init = all {
    recordSleetStormState(
      casterTurnRole,
      true,
      true,
      false,
      false,
      true,
      false,
      false,
      0,
      false,
      noHoles,
      Init,
    ),
  }

  action doCastSleetStorm = all {
    qCurrentTurnRole == casterTurnRole,
    qActionAvailable,
    qSpellAvailable,
    not(qHazardActive),
    openHoles == noHoles,
    recordSleetStormState(
      casterTurnRole,
      false,
      false,
      true,
      true,
      qTargetConcentrating,
      qTargetProne,
      false,
      qMovementSpentFeet,
      true,
      noHoles,
      Resolved,
    ),
  }

  action doEndCasterTurn = all {
    qCurrentTurnRole == casterTurnRole,
    qHazardActive,
    qCasterConcentrating,
    openHoles == noHoles,
    recordSleetStormState(
      targetTurnRole,
      true,
      qSpellAvailable,
      true,
      true,
      qTargetConcentrating,
      qTargetProne,
      qSavedThisTurn,
      qMovementSpentFeet,
      true,
      noHoles,
      Resolved,
    ),
  }

  action doSupplyEntryTriggerFact = all {
    qCurrentTurnRole == targetTurnRole,
    qHazardActive,
    not(qSavedThisTurn),
    openHoles == noHoles,
    recordSleetStormState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      qTargetConcentrating,
      qTargetProne,
      qSavedThisTurn,
      qMovementSpentFeet,
      true,
      entrySavingThrowOutcomeHoles,
      NeedsHoles,
    ),
  }

  action doSupplyStartTurnTriggerFact = all {
    qCurrentTurnRole == targetTurnRole,
    qHazardActive,
    not(qSavedThisTurn),
    openHoles == noHoles,
    recordSleetStormState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      qTargetConcentrating,
      qTargetProne,
      qSavedThisTurn,
      qMovementSpentFeet,
      true,
      startTurnSavingThrowOutcomeHoles,
      NeedsHoles,
    ),
  }

  action doFillEntrySaveFailure = all {
    qCurrentTurnRole == targetTurnRole,
    openHoles == entrySavingThrowOutcomeHoles,
    recordSleetStormState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      false,
      true,
      true,
      qMovementSpentFeet,
      true,
      noHoles,
      Prone,
    ),
  }

  action doFillEntrySaveSuccess = all {
    qCurrentTurnRole == targetTurnRole,
    openHoles == entrySavingThrowOutcomeHoles,
    recordSleetStormState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      qTargetConcentrating,
      qTargetProne,
      true,
      qMovementSpentFeet,
      true,
      noHoles,
      Saved,
    ),
  }

  action doFillStartTurnSaveFailure = all {
    qCurrentTurnRole == targetTurnRole,
    openHoles == startTurnSavingThrowOutcomeHoles,
    recordSleetStormState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      false,
      true,
      true,
      qMovementSpentFeet,
      true,
      noHoles,
      Prone,
    ),
  }

  action doFillStartTurnSaveSuccess = all {
    qCurrentTurnRole == targetTurnRole,
    openHoles == startTurnSavingThrowOutcomeHoles,
    recordSleetStormState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      qTargetConcentrating,
      qTargetProne,
      true,
      qMovementSpentFeet,
      true,
      noHoles,
      Saved,
    ),
  }

  action doMoveWithDifficultTerrain = all {
    qCurrentTurnRole == targetTurnRole,
    qHazardActive,
    not(qTargetProne),
    qMovementSpentFeet == 0,
    openHoles == noHoles,
    recordSleetStormState(
      targetTurnRole,
      qActionAvailable,
      qSpellAvailable,
      true,
      true,
      qTargetConcentrating,
      false,
      qSavedThisTurn,
      sleetStormMovementSpentFeet,
      true,
      noHoles,
      Moved,
    ),
  }

  action doEndTargetTurn = all {
    qCurrentTurnRole == targetTurnRole,
    qHazardActive,
    openHoles == noHoles,
    recordSleetStormState(
      casterTurnRole,
      true,
      qSpellAvailable,
      true,
      true,
      qTargetConcentrating,
      qTargetProne,
      false,
      qMovementSpentFeet,
      true,
      noHoles,
      Reset,
    ),
  }

  action step = any {
    doCastSleetStorm,
    doEndCasterTurn,
    doSupplyEntryTriggerFact,
    doSupplyStartTurnTriggerFact,
    doFillEntrySaveFailure,
    doFillEntrySaveSuccess,
    doFillStartTurnSaveFailure,
    doFillStartTurnSaveSuccess,
    doMoveWithDifficultTerrain,
    doEndTargetTurn,
  }
}
