// -*- mode: Bluespec; -*-

module battleRuntimeRemarkableAthleteSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type RemarkableAthleteSelectedIdentityWitnessState = {
    qInitiativeRollMode: str,
    qStrengthAthleticsRollMode: str,
    qStrengthAcrobaticsRollMode: str,
    qPlainStrengthRollMode: str,
    qDexterityAthleticsRollMode: str,
    qUnselectedStrengthAthleticsRollMode: str,
    qCriticalMovementOffered: bool,
    qCriticalMovementBudgetFeet: int,
    qCriticalMovementProvokesOpportunityAttacks: bool,
    qCriticalMovementAccepted: bool,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: RemarkableAthleteSelectedIdentityWitnessState

  pure def qInitiativeRollMode: str = qState.qInitiativeRollMode
  pure def qStrengthAthleticsRollMode: str = qState.qStrengthAthleticsRollMode
  pure def qStrengthAcrobaticsRollMode: str = qState.qStrengthAcrobaticsRollMode
  pure def qPlainStrengthRollMode: str = qState.qPlainStrengthRollMode
  pure def qDexterityAthleticsRollMode: str = qState.qDexterityAthleticsRollMode
  pure def qUnselectedStrengthAthleticsRollMode: str = qState.qUnselectedStrengthAthleticsRollMode
  pure def qCriticalMovementOffered: bool = qState.qCriticalMovementOffered
  pure def qCriticalMovementBudgetFeet: int = qState.qCriticalMovementBudgetFeet
  pure def qCriticalMovementProvokesOpportunityAttacks: bool = qState.qCriticalMovementProvokesOpportunityAttacks
  pure def qCriticalMovementAccepted: bool = qState.qCriticalMovementAccepted
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
    initiativeRollMode: str,
    strengthAthleticsRollMode: str,
    strengthAcrobaticsRollMode: str,
    plainStrengthRollMode: str,
    dexterityAthleticsRollMode: str,
    unselectedStrengthAthleticsRollMode: str,
    criticalMovementOffered: bool,
    criticalMovementBudgetFeet: int,
    criticalMovementProvokesOpportunityAttacks: bool,
    criticalMovementAccepted: bool,
    lastResult: str,
  ): bool = all {
    qState' = {
      qInitiativeRollMode: initiativeRollMode,
      qStrengthAthleticsRollMode: strengthAthleticsRollMode,
      qStrengthAcrobaticsRollMode: strengthAcrobaticsRollMode,
      qPlainStrengthRollMode: plainStrengthRollMode,
      qDexterityAthleticsRollMode: dexterityAthleticsRollMode,
      qUnselectedStrengthAthleticsRollMode: unselectedStrengthAthleticsRollMode,
      qCriticalMovementOffered: criticalMovementOffered,
      qCriticalMovementBudgetFeet: criticalMovementBudgetFeet,
      qCriticalMovementProvokesOpportunityAttacks: criticalMovementProvokesOpportunityAttacks,
      qCriticalMovementAccepted: criticalMovementAccepted,
      qScenarioResult: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }
  action init = recordProjection(
    "normal", "normal", "normal", "normal", "normal", "normal",
    false, 0, false, false, "init",
  )

  action doProjectRemarkableAthleteRollModes = all {
    qLastResult == "init",
    recordProjection(
      "advantage", "advantage", "normal", "normal", "normal", "normal",
      false, 0, false, false,
      "projected",
    ),
  }

  action doProjectRemarkableAthleteCriticalMovement = all {
    qLastResult == "init",
    recordProjection(
      "normal", "normal", "normal", "normal", "normal", "normal",
      true, 15, false, true,
      "criticalMovement",
    ),
  }

  action step = any {
    doProjectRemarkableAthleteRollModes,
    doProjectRemarkableAthleteCriticalMovement,
  }
}
