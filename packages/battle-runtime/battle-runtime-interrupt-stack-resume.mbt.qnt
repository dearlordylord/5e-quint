// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

module battleRuntimeInterruptStackResumeMbt {
  import battleRuntimeReplayEquivalence.* from "./battle-runtime-replay-equivalence"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type InterruptStackResumeScenarioOutcome = | Init | NestedDeclineResumedOuter | ActiveEffectMutationResumed | ReplayFromRootResolved

  var qMaxStackDepthObserved: int
  var qFinalStackDepth: int
  var qPendingTrigger: str
  var qResumedHole: str
  var qActiveEffectMutationSeenOnResume: bool
  var qReplayFromRootEquivalent: bool
  var qResponderReactionAvailable: bool
  var qTargetHp: int
  var qScenarioOutcome: InterruptStackResumeScenarioOutcome
  var qProtocol: WitnessProtocol[WitnessHole]

  pure def qLastResult: InterruptStackResumeScenarioOutcome = qScenarioOutcome

  pure def witnessProtocolForProjection(
    result: InterruptStackResumeScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (result == Init) witnessInit(WitnessProtocolHole)
    else witnessResolved(WitnessProtocolHole)

  pure def noTrigger: str = "none"
  pure def attackHitTrigger: str = "attackHit"
  pure def noResumedHole: str = "none"
  pure def damageRollHole: str = "rolledDice"
  pure def initialHp: int = 12
  pure def nestedFixtureTargetHp: int = 10
  pure def replayFixtureTargetHp: int = 3
  pure def replayRecordedAttackFromRootEquivalent: bool =
    battleRuntimeReplayFromRootEquivalent(
      independentRecordedWeaponAttackReplayProjection(replayFixtureTargetHp),
      recordedWeaponAttackReplayRoot(initialHp),
      recordedWeaponAttackReplayContinuation,
      recordedWeaponAttackReplaySuffixFills,
      replayFixtureTargetHp,
    )

  action recordInterruptStackResumeState(
    maxStackDepthObserved: int,
    finalStackDepth: int,
    pendingTrigger: str,
    resumedHole: str,
    activeEffectMutationSeenOnResume: bool,
    replayFromRootEquivalent: bool,
    responderReactionAvailable: bool,
    targetHp: int,
    lastResult: InterruptStackResumeScenarioOutcome,
  ): bool = all {
    qMaxStackDepthObserved' = maxStackDepthObserved,
    qFinalStackDepth' = finalStackDepth,
    qPendingTrigger' = pendingTrigger,
    qResumedHole' = resumedHole,
    qActiveEffectMutationSeenOnResume' = activeEffectMutationSeenOnResume,
    qReplayFromRootEquivalent' = replayFromRootEquivalent,
    qResponderReactionAvailable' = responderReactionAvailable,
    qTargetHp' = targetHp,
    qScenarioOutcome' = lastResult,
    qProtocol' = witnessProtocolForProjection(lastResult),
  }

  action init = recordInterruptStackResumeState(
    0,
    0,
    noTrigger,
    noResumedHole,
    false,
    false,
    true,
    initialHp,
    Init,
  )

  action doNestedDeclineResumesOuterInterrupt = all {
    qLastResult == Init,
    recordInterruptStackResumeState(
      2,
      1,
      attackHitTrigger,
      damageRollHole,
      false,
      false,
      true,
      nestedFixtureTargetHp,
      NestedDeclineResumedOuter,
    ),
  }

  action doShieldMutationResumesInterruptedAttack = all {
    qLastResult == Init,
    recordInterruptStackResumeState(
      1,
      0,
      noTrigger,
      noResumedHole,
      true,
      false,
      false,
      initialHp,
      ActiveEffectMutationResumed,
    ),
  }

  action doReplayRecordedProcedureFromRoot = all {
    qLastResult == Init,
    recordInterruptStackResumeState(
      0,
      0,
      noTrigger,
      noResumedHole,
      false,
      replayRecordedAttackFromRootEquivalent,
      true,
      replayFixtureTargetHp,
      ReplayFromRootResolved,
    ),
  }

  action step = any {
    doNestedDeclineResumesOuterInterrupt,
    doShieldMutationResumesInterruptedAttack,
    doReplayRecordedProcedureFromRoot,
  }
}
