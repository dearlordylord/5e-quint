// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.hunters-prey
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.hunters-prey

module battleRuntimeHuntersPreyMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type HuntersPreyScenarioOutcome = | Init | ColossusSlayer | SkipThenUseColossusSlayer | HordeBreaker | HordeBreakerAfterPrimaryMiss | RejectMissingSelection | RejectSameTarget | RejectInvalidTargetPredicate | SecondHordeBreakerUnavailable

  type HuntersPreyWitnessState = {
    qColossusTargetHp: int,
    qHordeTargetHp: int,
    qColossusUsed: bool,
    qHordeBreakerUsed: bool,
    qScenarioOutcome: HuntersPreyScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: HuntersPreyWitnessState

  pure def qColossusTargetHp: int = qState.qColossusTargetHp
  pure def qHordeTargetHp: int = qState.qHordeTargetHp
  pure def qColossusUsed: bool = qState.qColossusUsed
  pure def qHordeBreakerUsed: bool = qState.qHordeBreakerUsed
  pure def qLastResult: HuntersPreyScenarioOutcome = qState.qScenarioOutcome

  pure def huntersPreyProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: HuntersPreyScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (scenarioResult.in(Set(RejectMissingSelection, RejectSameTarget, RejectInvalidTargetPredicate))) witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(
    colossusTargetHp: int,
    hordeTargetHp: int,
    colossusUsed: bool,
    hordeBreakerUsed: bool,
    lastResult: HuntersPreyScenarioOutcome,
  ): bool = all {
    qState' = {
      qColossusTargetHp: colossusTargetHp,
      qHordeTargetHp: hordeTargetHp,
      qColossusUsed: colossusUsed,
      qHordeBreakerUsed: hordeBreakerUsed,
      qScenarioOutcome: lastResult,
      protocol: huntersPreyProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordProjection(7, 10, false, false, Init)

  action doColossusSlayer = all {
    qLastResult == Init,
    recordProjection(1, 10, true, false, ColossusSlayer),
  }

  action doSkipThenUseColossusSlayer = all {
    qLastResult == Init,
    recordProjection(2, 10, true, false, SkipThenUseColossusSlayer),
  }

  action doHordeBreaker = all {
    qLastResult == Init,
    recordProjection(7, 6, false, true, HordeBreaker),
  }

  action doHordeBreakerAfterPrimaryMiss = all {
    qLastResult == Init,
    recordProjection(7, 6, false, true, HordeBreakerAfterPrimaryMiss),
  }

  action doRejectMissingSelection = all {
    qLastResult == Init,
    recordProjection(7, 10, false, false, RejectMissingSelection),
  }

  action doRejectSameTarget = all {
    qLastResult == Init,
    recordProjection(7, 10, false, false, RejectSameTarget),
  }

  action doRejectInvalidTargetPredicate = all {
    qLastResult == Init,
    recordProjection(7, 10, false, false, RejectInvalidTargetPredicate),
  }

  action doSecondHordeBreakerUnavailable = all {
    qLastResult == Init,
    recordProjection(7, 10, false, true, SecondHordeBreakerUnavailable),
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
