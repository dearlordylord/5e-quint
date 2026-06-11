// -*- mode: Bluespec; -*-

module battleRuntimeWeaponMasterySelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type WeaponMasterySelectedIdentityScenarioOutcome = | Init | NeedsHoles | Resolved


  var qPrimaryTargetHp: int
  var qSecondTargetHp: int
  var qActionAvailable: bool
  var qPrimaryTargetHasSapEffect: bool
  var qPrimaryTargetProne: bool
  var qCleaveUsed: bool
  var qScenarioOutcome: WeaponMasterySelectedIdentityScenarioOutcome
  var qProtocol: WitnessProtocol[WitnessHole]

  pure def qLastResult: WeaponMasterySelectedIdentityScenarioOutcome = qScenarioOutcome

  pure def witnessProtocolForProjection(
    scenarioResult: WeaponMasterySelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (scenarioResult == NeedsHoles) witnessNeedsHoles(Set(WitnessProtocolHole))
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    primaryTargetHp: int,
    secondTargetHp: int,
    actionAvailable: bool,
    primaryTargetHasSapEffect: bool,
    primaryTargetProne: bool,
    cleaveUsed: bool,
    lastResult: WeaponMasterySelectedIdentityScenarioOutcome,
  ): bool = all {
    qPrimaryTargetHp' = primaryTargetHp,
    qSecondTargetHp' = secondTargetHp,
    qActionAvailable' = actionAvailable,
    qPrimaryTargetHasSapEffect' = primaryTargetHasSapEffect,
    qPrimaryTargetProne' = primaryTargetProne,
    qCleaveUsed' = cleaveUsed,
    qScenarioOutcome' = lastResult,
    qProtocol' = witnessProtocolForProjection(lastResult),
  }

  action init = recordProjection(13, 13, true, false, false, false, Init)

  action doResolveSapMasteryPropertyHit = all {
    qLastResult == Init,
    recordProjection(9, 13, false, true, false, false, Resolved),
  }

  action doResolveToppleMasteryPropertyFailedSavingThrow = all {
    qLastResult == Init,
    recordProjection(13, 13, true, false, true, false, NeedsHoles),
  }

  action doResolveCleaveMasteryPropertySecondTargetHit = all {
    qLastResult == Init,
    recordProjection(9, 9, false, false, false, true, Resolved),
  }

  action step = any {
    doResolveSapMasteryPropertyHit,
    doResolveToppleMasteryPropertyFailedSavingThrow,
    doResolveCleaveMasteryPropertySecondTargetHit,
  }
}
