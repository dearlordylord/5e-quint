// -*- mode: Bluespec; -*-

module battleRuntimeReactionCastingTimeMbt {
  var qTriggerKind: str
  var qContinuationKind: str
  var qReactorHp: int
  var qTriggerCreatureHp: int
  var qReactorReactionAvailable: bool
  var qTriggerCreatureFirstLevelSlotsExpended: int
  var qTriggerCreatureFourthLevelSlotsExpended: int
  var qReactorSecondLevelSlotsExpended: int
  var qReactorThirdLevelSlotsExpended: int
  var qReactionWindowCleared: bool
  var qLastResult: str

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
    lastResult: str,
  ): bool = all {
    qTriggerKind' = triggerKind,
    qContinuationKind' = continuationKind,
    qReactorHp' = reactorHp,
    qTriggerCreatureHp' = triggerCreatureHp,
    qReactorReactionAvailable' = reactorReactionAvailable,
    qTriggerCreatureFirstLevelSlotsExpended' = triggerCreatureFirstLevelSlotsExpended,
    qTriggerCreatureFourthLevelSlotsExpended' = triggerCreatureFourthLevelSlotsExpended,
    qReactorSecondLevelSlotsExpended' = reactorSecondLevelSlotsExpended,
    qReactorThirdLevelSlotsExpended' = reactorThirdLevelSlotsExpended,
    qReactionWindowCleared' = reactionWindowCleared,
    qLastResult' = lastResult,
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
    "init",
  )

  action doCounterspellEndsSpellCast = all {
    qLastResult == "init",
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
      "counterspellEndedSpellCast",
    ),
  }

  action doCounterspellAllowsSpellCastResume = all {
    qLastResult == "init",
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
      "counterspellAllowedSpellCastResume",
    ),
  }

  action doHellishRebukeAfterDamage = all {
    qLastResult == "init",
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
      "hellishRebukeAfterDamage",
    ),
  }

  action step = any {
    doCounterspellEndsSpellCast,
    doCounterspellAllowsSpellCastResume,
    doHellishRebukeAfterDamage,
  }
}
