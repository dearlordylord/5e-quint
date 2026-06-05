// -*- mode: Bluespec; -*-

module battleRuntimeRemarkableAthleteSelectedIdentityMbt {
  var qInitiativeRollMode: str
  var qStrengthAthleticsRollMode: str
  var qStrengthAcrobaticsRollMode: str
  var qPlainStrengthRollMode: str
  var qDexterityAthleticsRollMode: str
  var qUnselectedStrengthAthleticsRollMode: str
  var qCriticalMovementOffered: bool
  var qCriticalMovementBudgetFeet: int
  var qCriticalMovementProvokesOpportunityAttacks: bool
  var qCriticalMovementAccepted: bool
  var qLastResult: str

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
    qInitiativeRollMode' = initiativeRollMode,
    qStrengthAthleticsRollMode' = strengthAthleticsRollMode,
    qStrengthAcrobaticsRollMode' = strengthAcrobaticsRollMode,
    qPlainStrengthRollMode' = plainStrengthRollMode,
    qDexterityAthleticsRollMode' = dexterityAthleticsRollMode,
    qUnselectedStrengthAthleticsRollMode' = unselectedStrengthAthleticsRollMode,
    qCriticalMovementOffered' = criticalMovementOffered,
    qCriticalMovementBudgetFeet' = criticalMovementBudgetFeet,
    qCriticalMovementProvokesOpportunityAttacks' = criticalMovementProvokesOpportunityAttacks,
    qCriticalMovementAccepted' = criticalMovementAccepted,
    qLastResult' = lastResult,
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
