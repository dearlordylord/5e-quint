// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

module battleRuntimeInterruptStackResumeMbt {
  var qMaxStackDepthObserved: int
  var qFinalStackDepth: int
  var qPendingTrigger: str
  var qResumedHole: str
  var qActiveEffectMutationSeenOnResume: bool
  var qResponderReactionAvailable: bool
  var qTargetHp: int
  var qLastResult: str

  pure def noTrigger: str = "none"
  pure def attackHitTrigger: str = "attackHit"
  pure def noResumedHole: str = "none"
  pure def damageRollHole: str = "rolledDice"
  pure def initialHp: int = 12
  pure def nestedFixtureTargetHp: int = 10

  action recordInterruptStackResumeState(
    maxStackDepthObserved: int,
    finalStackDepth: int,
    pendingTrigger: str,
    resumedHole: str,
    activeEffectMutationSeenOnResume: bool,
    responderReactionAvailable: bool,
    targetHp: int,
    lastResult: str,
  ): bool = all {
    qMaxStackDepthObserved' = maxStackDepthObserved,
    qFinalStackDepth' = finalStackDepth,
    qPendingTrigger' = pendingTrigger,
    qResumedHole' = resumedHole,
    qActiveEffectMutationSeenOnResume' = activeEffectMutationSeenOnResume,
    qResponderReactionAvailable' = responderReactionAvailable,
    qTargetHp' = targetHp,
    qLastResult' = lastResult,
  }

  action init = recordInterruptStackResumeState(
    0,
    0,
    noTrigger,
    noResumedHole,
    false,
    true,
    initialHp,
    "init",
  )

  action doNestedDeclineResumesOuterInterrupt = all {
    qLastResult == "init",
    recordInterruptStackResumeState(
      2,
      1,
      attackHitTrigger,
      damageRollHole,
      false,
      true,
      nestedFixtureTargetHp,
      "nestedDeclineResumedOuter",
    ),
  }

  action doShieldMutationResumesInterruptedAttack = all {
    qLastResult == "init",
    recordInterruptStackResumeState(
      1,
      0,
      noTrigger,
      noResumedHole,
      true,
      false,
      initialHp,
      "activeEffectMutationResumed",
    ),
  }

  action step = any {
    doNestedDeclineResumesOuterInterrupt,
    doShieldMutationResumesInterruptedAttack,
  }
}
