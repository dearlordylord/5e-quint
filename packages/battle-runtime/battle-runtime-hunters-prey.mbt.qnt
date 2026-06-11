// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.hunters-prey
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.hunters-prey

module battleRuntimeHuntersPreyMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type HuntersPreyWitnessState = {
    qColossusTargetHp: int,
    qHordeTargetHp: int,
    qColossusUsed: bool,
    qHordeBreakerUsed: bool,
    qScenarioResult: str,
    qScenarioInvalidReason: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: HuntersPreyWitnessState

  pure def qColossusTargetHp: int = qState.qColossusTargetHp
  pure def qHordeTargetHp: int = qState.qHordeTargetHp
  pure def qColossusUsed: bool = qState.qColossusUsed
  pure def qHordeBreakerUsed: bool = qState.qHordeBreakerUsed
  pure def qLastResult: str = qState.qScenarioResult
  pure def qLastInvalidReason: str = qState.qScenarioInvalidReason

  pure def huntersPreyProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (scenarioInvalidReason == "staleSubject") witnessInvalid(WitnessProtocolHole, WStaleSubject)
    else if (scenarioInvalidReason == "wrongActor") witnessInvalid(WitnessProtocolHole, WWrongActor)
    else if (scenarioInvalidReason == "missingCombatant") witnessInvalid(WitnessProtocolHole, WMissingCombatant)
    else if (scenarioInvalidReason == "unsupportedSubject") witnessInvalid(WitnessProtocolHole, WUnsupportedSubject)
    else if (scenarioInvalidReason == "unsupportedActOption") witnessInvalid(WitnessProtocolHole, WUnsupportedActOption)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(
    colossusTargetHp: int,
    hordeTargetHp: int,
    colossusUsed: bool,
    hordeBreakerUsed: bool,
    lastResult: str,
    lastInvalidReason: str,
  ): bool = all {
    qState' = {
      qColossusTargetHp: colossusTargetHp,
      qHordeTargetHp: hordeTargetHp,
      qColossusUsed: colossusUsed,
      qHordeBreakerUsed: hordeBreakerUsed,
      qScenarioResult: lastResult,
      qScenarioInvalidReason: lastInvalidReason,
      protocol: huntersPreyProtocolForProjection(Set(), lastResult, lastInvalidReason),
    },
  }

  action init = recordProjection(7, 10, false, false, "init", "")

  action doColossusSlayer = all {
    qLastResult == "init",
    recordProjection(1, 10, true, false, "colossusSlayer", ""),
  }

  action doSkipThenUseColossusSlayer = all {
    qLastResult == "init",
    recordProjection(2, 10, true, false, "skipThenUseColossusSlayer", ""),
  }

  action doHordeBreaker = all {
    qLastResult == "init",
    recordProjection(7, 6, false, true, "hordeBreaker", ""),
  }

  action doHordeBreakerAfterPrimaryMiss = all {
    qLastResult == "init",
    recordProjection(7, 6, false, true, "hordeBreakerAfterPrimaryMiss", ""),
  }

  action doRejectMissingSelection = all {
    qLastResult == "init",
    recordProjection(7, 10, false, false, "rejectMissingSelection", "invalidFill"),
  }

  action doRejectSameTarget = all {
    qLastResult == "init",
    recordProjection(7, 10, false, false, "rejectSameTarget", "invalidFill"),
  }

  action doRejectInvalidTargetPredicate = all {
    qLastResult == "init",
    recordProjection(7, 10, false, false, "rejectInvalidTargetPredicate", "invalidFill"),
  }

  action doSecondHordeBreakerUnavailable = all {
    qLastResult == "init",
    recordProjection(7, 10, false, true, "secondHordeBreakerUnavailable", ""),
  }

  action step = any {
    doColossusSlayer,
    doSkipThenUseColossusSlayer,
    doHordeBreaker,
    doHordeBreakerAfterPrimaryMiss,
    doRejectMissingSelection,
    doRejectSameTarget,
    doRejectInvalidTargetPredicate,
    doSecondHordeBreakerUnavailable,
  }
}
