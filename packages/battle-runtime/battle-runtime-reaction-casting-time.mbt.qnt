// -*- mode: Bluespec; -*-

module battleRuntimeReactionCastingTimeMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type ReactionCastingTimeScenarioOutcome = | Init | CounterspellEndedSpellCast | CounterspellAllowedSpellCastResume | HellishRebukeAfterDamage


  type ReactionCastingTimeWitnessState = {
    qTriggerKind: str,
    qContinuationKind: str,
    qReactorHp: int,
    qTriggerCreatureHp: int,
    qReactorReactionAvailable: bool,
    qTriggerCreatureFirstLevelSlotsExpended: int,
    qTriggerCreatureFourthLevelSlotsExpended: int,
    qReactorSecondLevelSlotsExpended: int,
    qReactorThirdLevelSlotsExpended: int,
    qReactionWindowCleared: bool,
    qScenarioOutcome: ReactionCastingTimeScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: ReactionCastingTimeWitnessState

  pure def qTriggerKind: str = qState.qTriggerKind
  pure def qContinuationKind: str = qState.qContinuationKind
  pure def qReactorHp: int = qState.qReactorHp
  pure def qTriggerCreatureHp: int = qState.qTriggerCreatureHp
  pure def qReactorReactionAvailable: bool = qState.qReactorReactionAvailable
  pure def qTriggerCreatureFirstLevelSlotsExpended: int = qState.qTriggerCreatureFirstLevelSlotsExpended
  pure def qTriggerCreatureFourthLevelSlotsExpended: int = qState.qTriggerCreatureFourthLevelSlotsExpended
  pure def qReactorSecondLevelSlotsExpended: int = qState.qReactorSecondLevelSlotsExpended
  pure def qReactorThirdLevelSlotsExpended: int = qState.qReactorThirdLevelSlotsExpended
  pure def qReactionWindowCleared: bool = qState.qReactionWindowCleared
  pure def qLastResult: ReactionCastingTimeScenarioOutcome = qState.qScenarioOutcome

  pure val noTrigger: str = "none"
  pure val spellCastTrigger: str = "spellCast"
  pure val afterDamageTrigger: str = "afterDamage"
  pure val noContinuation: str = "none"
  pure val spellCastEnded: str = "spellCastEnded"
  pure val spellCastResumed: str = "spellCastResumed"
  pure val afterDamageResolved: str = "afterDamageResolved"
  pure val initialHp: int = 30
  pure val magicMissileFourthLevelDamage: int = 12
  pure val unarmedStrikeDamage: int = 1
  pure val hellishRebukeDamage: int = 3

  pure def witnessProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: ReactionCastingTimeScenarioOutcome,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (scenarioInvalidReason == "staleSubject") witnessInvalid(WitnessProtocolHole, WStaleSubject)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordReactionCastingTimeState(
    triggerKind: str,
    continuationKind: str,
    reactorHp: int,
    triggerCreatureHp: int,
    reactorReactionAvailable: bool,
    triggerCreatureFirstLevelSlotsExpended: int,
    triggerCreatureFourthLevelSlotsExpended: int,
    reactorSecondLevelSlotsExpended: int,
    reactorThirdLevelSlotsExpended: int,
    reactionWindowCleared: bool,
    lastResult: ReactionCastingTimeScenarioOutcome,
  ): bool = all {
    qState' = {
      qTriggerKind: triggerKind,
      qContinuationKind: continuationKind,
      qReactorHp: reactorHp,
      qTriggerCreatureHp: triggerCreatureHp,
      qReactorReactionAvailable: reactorReactionAvailable,
      qTriggerCreatureFirstLevelSlotsExpended: triggerCreatureFirstLevelSlotsExpended,
      qTriggerCreatureFourthLevelSlotsExpended: triggerCreatureFourthLevelSlotsExpended,
      qReactorSecondLevelSlotsExpended: reactorSecondLevelSlotsExpended,
      qReactorThirdLevelSlotsExpended: reactorThirdLevelSlotsExpended,
      qReactionWindowCleared: reactionWindowCleared,
      qScenarioOutcome: lastResult,
      protocol: witnessProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordReactionCastingTimeState(
    noTrigger,
    noContinuation,
    initialHp,
    initialHp,
    true,
    0,
    0,
    0,
    0,
    false,
    Init,
  )

  action doCounterspellEndsSpellCast = all {
    qLastResult == Init,
    recordReactionCastingTimeState(
      spellCastTrigger,
      spellCastEnded,
      initialHp,
      initialHp,
      false,
      0,
      0,
      0,
      1,
      true,
      CounterspellEndedSpellCast,
    ),
  }

  action doCounterspellAllowsSpellCastResume = all {
    qLastResult == Init,
    recordReactionCastingTimeState(
      spellCastTrigger,
      spellCastResumed,
      initialHp - magicMissileFourthLevelDamage,
      initialHp,
      false,
      0,
      1,
      0,
      1,
      true,
      CounterspellAllowedSpellCastResume,
    ),
  }

  action doHellishRebukeAfterDamage = all {
    qLastResult == Init,
    recordReactionCastingTimeState(
      afterDamageTrigger,
      afterDamageResolved,
      initialHp - unarmedStrikeDamage,
      initialHp - hellishRebukeDamage,
      false,
      0,
      0,
      1,
      0,
      true,
      HellishRebukeAfterDamage,
    ),
  }

  action step = any {
    doCounterspellEndsSpellCast,
    doCounterspellAllowsSpellCastResume,
    doHellishRebukeAfterDamage,
  }
}
