// -*- mode: Bluespec; -*-

module battleRuntimeFindFamiliarSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type FindFamiliarSelectedIdentityScenarioOutcome = | Init | Cast | Recast | DismissedAndReappeared | TouchDelivered

  type FindFamiliarSelectedIdentityWitnessState = {
    qFamiliarStatus: str,
    qFormId: str,
    qFamiliarCombatantPresent: bool,
    qReplacementCombatantPresent: bool,
    qFamiliarReactionAvailable: bool,
    qOwnerActionAvailable: bool,
    qOwnerSpellSlotCommitted: bool,
    qTargetHp: int,
    qScenarioOutcome: FindFamiliarSelectedIdentityScenarioOutcome,
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
  pure def qLastResult: FindFamiliarSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def findFamiliarSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: FindFamiliarSelectedIdentityScenarioOutcome,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
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
    lastResult: FindFamiliarSelectedIdentityScenarioOutcome,
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
      qScenarioOutcome: lastResult,
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
    Init,
  )

  action doCastFindFamiliar = all {
    qLastResult == Init,
    recordFindFamiliarState(
      "present",
      "cat",
      true,
      false,
      true,
      true,
      false,
      1,
      Cast,
    ),
  }

  action doRecastFindFamiliarReplacement = all {
    qLastResult == Init,
    recordFindFamiliarState(
      "present",
      "rat",
      true,
      false,
      true,
      true,
      false,
      1,
      Recast,
    ),
  }

  action doDismissAndReappearFindFamiliar = all {
    qLastResult == Init,
    recordFindFamiliarState(
      "present",
      "cat",
      true,
      false,
      true,
      false,
      false,
      1,
      DismissedAndReappeared,
    ),
  }

  action doDeliverTouchSpellThroughFindFamiliar = all {
    qLastResult == Init,
    recordFindFamiliarState(
      "present",
      "cat",
      true,
      false,
      false,
      false,
      true,
      12,
      TouchDelivered,
    ),
  }

  action step = any {
    doCastFindFamiliar,
    doRecastFindFamiliarReplacement,
    doDismissAndReappearFindFamiliar,
    doDeliverTouchSpellThroughFindFamiliar,
  }
}
