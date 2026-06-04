// -*- mode: Bluespec; -*-

module battleRuntimeRemarkableAthleteSelectedIdentityMbt {
  var qInitiativeRollMode: str
  var qStrengthAthleticsRollMode: str
  var qStrengthAcrobaticsRollMode: str
  var qPlainStrengthRollMode: str
  var qDexterityAthleticsRollMode: str
  var qUnselectedStrengthAthleticsRollMode: str
  var qLastResult: str

  action recordProjection(
    initiativeRollMode: str,
    strengthAthleticsRollMode: str,
    strengthAcrobaticsRollMode: str,
    plainStrengthRollMode: str,
    dexterityAthleticsRollMode: str,
    unselectedStrengthAthleticsRollMode: str,
    lastResult: str,
  ): bool = all {
    qInitiativeRollMode' = initiativeRollMode,
    qStrengthAthleticsRollMode' = strengthAthleticsRollMode,
    qStrengthAcrobaticsRollMode' = strengthAcrobaticsRollMode,
    qPlainStrengthRollMode' = plainStrengthRollMode,
    qDexterityAthleticsRollMode' = dexterityAthleticsRollMode,
    qUnselectedStrengthAthleticsRollMode' = unselectedStrengthAthleticsRollMode,
    qLastResult' = lastResult,
  }

  action init = recordProjection(
    "normal", "normal", "normal", "normal", "normal", "normal", "init",
  )

  action doProjectRemarkableAthleteRollModes = all {
    qLastResult == "init",
    recordProjection(
      "advantage", "advantage", "normal", "normal", "normal", "normal",
      "projected",
    ),
  }

  action step = any {
    doProjectRemarkableAthleteRollModes,
  }
}
