// -*- mode: Bluespec; -*-

module battleRuntimeWeaponMasterySelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  var qPrimaryTargetHp: int
  var qSecondTargetHp: int
  var qActionAvailable: bool
  var qPrimaryTargetHasSapEffect: bool
  var qPrimaryTargetProne: bool
  var qCleaveUsed: bool
  var qScenarioResult: str
  var qProtocol: WitnessProtocol[WitnessHole]

  pure def qLastResult: str = qScenarioResult

  pure def witnessProtocolForProjection(
    scenarioResult: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (scenarioResult == "needsHoles") witnessNeedsHoles(Set(WitnessProtocolHole))
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    primaryTargetHp: int,
    secondTargetHp: int,
    actionAvailable: bool,
    primaryTargetHasSapEffect: bool,
    primaryTargetProne: bool,
    cleaveUsed: bool,
    lastResult: str,
  ): bool = all {
    qPrimaryTargetHp' = primaryTargetHp,
    qSecondTargetHp' = secondTargetHp,
    qActionAvailable' = actionAvailable,
    qPrimaryTargetHasSapEffect' = primaryTargetHasSapEffect,
    qPrimaryTargetProne' = primaryTargetProne,
    qCleaveUsed' = cleaveUsed,
    qScenarioResult' = lastResult,
    qProtocol' = witnessProtocolForProjection(lastResult),
  }

  action init = recordProjection(13, 13, true, false, false, false, "init")

  action doResolveSapMasteryPropertyHit = all {
    qLastResult == "init",
    recordProjection(9, 13, false, true, false, false, "resolved"),
  }

  action doResolveToppleMasteryPropertyFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(13, 13, true, false, true, false, "needsHoles"),
  }

  action doResolveCleaveMasteryPropertySecondTargetHit = all {
    qLastResult == "init",
    recordProjection(9, 9, false, false, false, true, "resolved"),
  }

  action step = any {
    doResolveSapMasteryPropertyHit,
    doResolveToppleMasteryPropertyFailedSavingThrow,
    doResolveCleaveMasteryPropertySecondTargetHit,
  }
}
