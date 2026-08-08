// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

module battleRuntimeInterruptStackResumeMbt {
  import battleRuntimeWeaponAttackInterruptionFrame.* from "./battle-runtime-weapon-attack-interruption-frame"
  import battleRuntimeReplayEquivalence.* from "./battle-runtime-replay-equivalence"
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type InterruptStackResumeScenarioOutcome =
    | Init
    | NestedDeclineResumedOuter
    | ActiveEffectMutationResumed
    | ReplayFromRootResolved
    | PrimaryAttackDamageDeclinedResumedFollowUp

  var qMaxStackDepthObserved: int
  var qFinalStackDepth: int
  var qPendingTrigger: str
  var qResumedHole: str
  var qActiveEffectMutationSeenOnResume: bool
  var qReplayFromRootEquivalent: bool
  var qResponderReactionAvailable: bool
  var qTargetHp: int
  var qPrimaryFollowUpResumed: bool
  var qScenarioOutcome: InterruptStackResumeScenarioOutcome
  var qProtocol: WitnessProtocol[WitnessHole]

  pure def scenarioOutcome: InterruptStackResumeScenarioOutcome = qScenarioOutcome

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

  pure def primaryDamageDeclineResumesFollowUp: bool =
    match declineWeaponAttackInterruption(
      offerWeaponAttackInterruption({
        participant: WeaponAttacker,
        target: WeaponTarget,
        attackResult: WeaponAttackHit({ total: 15, naturalD20: 10 }),
        damageInput: RolledWeaponDamage({ amount: 4 }),
        criticalConsequence: OrdinaryHitDeathFailureConsequence,
        phase: WeaponAttackDamagePhase,
        continuation: ApplyPrimaryWeaponAttackDamage({
          acceptedFillCount: 3,
        }),
      }),
    ) {
      | WeaponAttackInterruptionHandedOff(outcome) =>
          match outcome.continuation {
            | ApplyPrimaryWeaponAttackDamage(context) =>
                context.acceptedFillCount == 3
            | _ => false
          }
      | _ => false
    }

  action recordInterruptStackResumeState(
    maxStackDepthObserved: int,
    finalStackDepth: int,
    pendingTrigger: str,
    resumedHole: str,
    activeEffectMutationSeenOnResume: bool,
    replayFromRootEquivalent: bool,
    responderReactionAvailable: bool,
    targetHp: int,
    primaryFollowUpResumed: bool,
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
    qPrimaryFollowUpResumed' = primaryFollowUpResumed,
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
    false,
    Init,
  )

  action doNestedDeclineResumesOuterInterrupt = all {
    scenarioOutcome == Init,
    recordInterruptStackResumeState(
      2,
      1,
      attackHitTrigger,
      damageRollHole,
      false,
      false,
      true,
      nestedFixtureTargetHp,
      false,
      NestedDeclineResumedOuter,
    ),
  }

  action doShieldMutationResumesInterruptedAttack = all {
    scenarioOutcome == Init,
    recordInterruptStackResumeState(
      1,
      0,
      noTrigger,
      noResumedHole,
      true,
      false,
      false,
      initialHp,
      false,
      ActiveEffectMutationResumed,
    ),
  }

  action doReplayRecordedProcedureFromRoot = all {
    scenarioOutcome == Init,
    recordInterruptStackResumeState(
      0,
      0,
      noTrigger,
      noResumedHole,
      false,
      replayRecordedAttackFromRootEquivalent,
      true,
      replayFixtureTargetHp,
      false,
      ReplayFromRootResolved,
    ),
  }

  action doPrimaryAttackDamageDeclineResumesFollowUp = all {
    scenarioOutcome == Init,
    primaryDamageDeclineResumesFollowUp,
    recordInterruptStackResumeState(
      1,
      0,
      noTrigger,
      noResumedHole,
      false,
      false,
      true,
      6,
      true,
      PrimaryAttackDamageDeclinedResumedFollowUp,
    ),
  }

  action step = any {
    doNestedDeclineResumesOuterInterrupt,
    doShieldMutationResumesInterruptedAttack,
    doReplayRecordedProcedureFromRoot,
    doPrimaryAttackDamageDeclineResumesFollowUp,
  }
}
