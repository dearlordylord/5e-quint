// -*- mode: Bluespec; -*-

module battleRuntimeDangerSenseSelectedIdentityMbt {
  var qLastResult: str
  var qSourceUnitId: str
  var qDexterityRollModeCount: int
  var qConstitutionRollModeCount: int
  var qSuppressed: bool
  var qAccepted: bool

  action recordProjection(
    lastResult: str,
    sourceUnitId: str,
    dexterityRollModeCount: int,
    constitutionRollModeCount: int,
    suppressed: bool,
    accepted: bool,
  ): bool = all {
    qLastResult' = lastResult,
    qSourceUnitId' = sourceUnitId,
    qDexterityRollModeCount' = dexterityRollModeCount,
    qConstitutionRollModeCount' = constitutionRollModeCount,
    qSuppressed' = suppressed,
    qAccepted' = accepted,
  }

  action init =
    recordProjection("init", "none", 0, 0, false, false)

  action doProjectDangerSenseDexterityAdvantage = all {
    qLastResult == "init",
    recordProjection("danger-sense-dexterity-advantage", "barbarian_danger_sense", 1, 0, false, true),
  }

  action doSuppressDangerSenseWhileIncapacitated = all {
    qLastResult == "init",
    recordProjection("danger-sense-incapacitated-suppressed", "barbarian_danger_sense", 0, 0, true, true),
  }

  action step = any {
    doProjectDangerSenseDexterityAdvantage,
    doSuppressDangerSenseWhileIncapacitated,
  }
}
