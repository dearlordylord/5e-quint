// -*- mode: Bluespec; -*-

module battleRuntimeRemarkableAthleteSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type RemarkableAthleteSelectedIdentityScenarioOutcome = | Init | Projected | CriticalMovement


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
    qScenarioOutcome: RemarkableAthleteSelectedIdentityScenarioOutcome,
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
  pure def scenarioOutcome: RemarkableAthleteSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: RemarkableAthleteSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
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
    lastResult: RemarkableAthleteSelectedIdentityScenarioOutcome,
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
      qScenarioOutcome: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }
  action init = recordProjection(
    "normal", "normal", "normal", "normal", "normal", "normal",
    false, 0, false, false, Init,
  )

  action doProjectRemarkableAthleteRollModes = all {
    scenarioOutcome == Init,
    recordProjection(
      "advantage", "advantage", "normal", "normal", "normal", "normal",
      false, 0, false, false,
      Projected,
    ),
  }

  action doProjectRemarkableAthleteCriticalMovement = all {
    scenarioOutcome == Init,
    recordProjection(
      "normal", "normal", "normal", "normal", "normal", "normal",
      true, 15, false, true,
      CriticalMovement,
    ),
  }

  action step = any {
    doProjectRemarkableAthleteRollModes,
    doProjectRemarkableAthleteCriticalMovement,
  }
}
