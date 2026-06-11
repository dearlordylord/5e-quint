// -*- mode: Bluespec; -*-

module battleRuntimeReactionSpellSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type ReactionSpellSelectedIdentityWitnessState = {
    qReactorHp: int,
    qTriggerCreatureHp: int,
    qReactorArmorClass: int,
    qReactorReactionAvailable: bool,
    qTriggerCreatureFirstLevelSlotsExpended: int,
    qFirstLevelSlotsExpended: int,
    qSecondLevelSlotsExpended: int,
    qThirdLevelSlotsExpended: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: ReactionSpellSelectedIdentityWitnessState

  pure def qReactorHp: int = qState.qReactorHp
  pure def qTriggerCreatureHp: int = qState.qTriggerCreatureHp
  pure def qReactorArmorClass: int = qState.qReactorArmorClass
  pure def qReactorReactionAvailable: bool = qState.qReactorReactionAvailable
  pure def qTriggerCreatureFirstLevelSlotsExpended: int = qState.qTriggerCreatureFirstLevelSlotsExpended
  pure def qFirstLevelSlotsExpended: int = qState.qFirstLevelSlotsExpended
  pure def qSecondLevelSlotsExpended: int = qState.qSecondLevelSlotsExpended
  pure def qThirdLevelSlotsExpended: int = qState.qThirdLevelSlotsExpended
  pure def qLastResult: str = qState.qScenarioResult

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    reactorHp: int,
    triggerCreatureHp: int,
    reactorArmorClass: int,
    reactorReactionAvailable: bool,
    triggerCreatureFirstLevelSlotsExpended: int,
    firstLevelSlotsExpended: int,
    secondLevelSlotsExpended: int,
    thirdLevelSlotsExpended: int,
    lastResult: str,
  ): bool = all {
    qState' = {
      qReactorHp: reactorHp,
      qTriggerCreatureHp: triggerCreatureHp,
      qReactorArmorClass: reactorArmorClass,
      qReactorReactionAvailable: reactorReactionAvailable,
      qTriggerCreatureFirstLevelSlotsExpended: triggerCreatureFirstLevelSlotsExpended,
      qFirstLevelSlotsExpended: firstLevelSlotsExpended,
      qSecondLevelSlotsExpended: secondLevelSlotsExpended,
      qThirdLevelSlotsExpended: thirdLevelSlotsExpended,
      qScenarioResult: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }
  action init = recordProjection(12, 12, 10, true, 0, 0, 0, 0, "init")

  action doResolveShieldReactionSpellHit = all {
    qLastResult == "init",
    recordProjection(12, 12, 15, false, 0, 1, 0, 0, "resolved"),
  }

  action doResolveHellishRebukeFailedSavingThrow = all {
    qLastResult == "init",
    recordProjection(11, 9, 10, false, 0, 0, 1, 0, "resolved"),
  }

  action doResolveCounterspellMagicMissileCast = all {
    qLastResult == "init",
    recordProjection(12, 12, 10, false, 0, 0, 0, 1, "resolved"),
  }

  action step = any {
    doResolveShieldReactionSpellHit,
    doResolveHellishRebukeFailedSavingThrow,
    doResolveCounterspellMagicMissileCast,
  }
}
