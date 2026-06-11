// -*- mode: Bluespec; -*-

module battleRuntimeFindFamiliarSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type FindFamiliarSelectedIdentityWitnessState = {
    qFamiliarStatus: str,
    qFormId: str,
    qFamiliarCombatantPresent: bool,
    qReplacementCombatantPresent: bool,
    qFamiliarReactionAvailable: bool,
    qOwnerActionAvailable: bool,
    qOwnerSpellSlotCommitted: bool,
    qTargetHp: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: FindFamiliarSelectedIdentityWitnessState

  pure def qFamiliarStatus: str = qState.qFamiliarStatus
  pure def qFormId: str = qState.qFormId
  pure def qFamiliarCombatantPresent: bool = qState.qFamiliarCombatantPresent
  pure def qReplacementCombatantPresent: bool = qState.qReplacementCombatantPresent
  pure def qFamiliarReactionAvailable: bool = qState.qFamiliarReactionAvailable
  pure def qOwnerActionAvailable: bool = qState.qOwnerActionAvailable
  pure def qOwnerSpellSlotCommitted: bool = qState.qOwnerSpellSlotCommitted
  pure def qTargetHp: int = qState.qTargetHp
  pure def qLastResult: str = qState.qScenarioResult

  pure def findFamiliarSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordFindFamiliarState(
    familiarStatus: str,
    formId: str,
    familiarCombatantPresent: bool,
    replacementCombatantPresent: bool,
    familiarReactionAvailable: bool,
    ownerActionAvailable: bool,
    ownerSpellSlotCommitted: bool,
    targetHp: int,
    lastResult: str,
  ): bool = all {
    qState' = {
      qFamiliarStatus: familiarStatus,
      qFormId: formId,
      qFamiliarCombatantPresent: familiarCombatantPresent,
      qReplacementCombatantPresent: replacementCombatantPresent,
      qFamiliarReactionAvailable: familiarReactionAvailable,
      qOwnerActionAvailable: ownerActionAvailable,
      qOwnerSpellSlotCommitted: ownerSpellSlotCommitted,
      qTargetHp: targetHp,
      qScenarioResult: lastResult,
      protocol: findFamiliarSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordFindFamiliarState(
    "none",
    "none",
    false,
    false,
    false,
    true,
    false,
    1,
    "init",
  )

  action doCastFindFamiliar = all {
    qLastResult == "init",
    recordFindFamiliarState(
      "present",
      "cat",
      true,
      false,
      true,
      true,
      false,
      1,
      "cast",
    ),
  }

  action doRecastFindFamiliarReplacement = all {
    qLastResult == "init",
    recordFindFamiliarState(
      "present",
      "rat",
      true,
      false,
      true,
      true,
      false,
      1,
      "recast",
    ),
  }

  action doDismissAndReappearFindFamiliar = all {
    qLastResult == "init",
    recordFindFamiliarState(
      "present",
      "cat",
      true,
      false,
      true,
      false,
      false,
      1,
      "dismissedAndReappeared",
    ),
  }

  action doDeliverTouchSpellThroughFindFamiliar = all {
    qLastResult == "init",
    recordFindFamiliarState(
      "present",
      "cat",
      true,
      false,
      false,
      false,
      true,
      12,
      "touchDelivered",
    ),
  }

  action step = any {
    doCastFindFamiliar,
    doRecastFindFamiliarReplacement,
    doDismissAndReappearFindFamiliar,
    doDeliverTouchSpellThroughFindFamiliar,
  }
}
