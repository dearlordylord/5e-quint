// -*- mode: Bluespec; -*-

module battleRuntimeSleepRepeatSaveMbt {
  import battleRuntime.* from "./battle-runtime"

  var qCurrentTurnRole: str
  var qTargetIncapacitated: bool
  var qTargetUnconscious: bool
  var qTargetProne: bool
  var qCasterConcentrating: bool
  var qActionAvailable: bool
  var qHoles: Set[Hole]
  var qLastResult: str
  var qLastInvalidReason: str

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"

  pure val slept: BattleState = resolveSleepTargetAdmission(initialState, false)
  pure val concentrationBroken: BattleState = breakConcentrationSpellEffects(slept, Fighter)
  pure val concentrationBrokenTargetTurn: BattleState = endTurn(concentrationBroken)
  pure val concentrationBrokenNextRound: BattleState = endTurn(concentrationBrokenTargetTurn)
  pure val targetTurn: BattleState = endTurn(slept)
  pure val repeatSucceeded: BattleState = endTurnWithSleepRepeatSave(targetTurn, true)
  pure val repeatFailed: BattleState = endTurnWithSleepRepeatSave(targetTurn, false)

  pure def projectedIncapacitated(target: Combatant): bool =
    target.incapacitated or target.unconscious

  action init = all {
    qCurrentTurnRole' = casterTurnRole,
    qTargetIncapacitated' = projectedIncapacitated(initialState.goblin),
    qTargetUnconscious' = initialState.goblin.unconscious,
    qTargetProne' = initialState.goblin.prone,
    qCasterConcentrating' = initialState.fighter.concentrating,
    qActionAvailable' = initialState.actionAvailable,
    qHoles' = Set(SavingThrowOutcome),
    qLastResult' = "init",
    qLastInvalidReason' = "",
  }

  action doFillInitialSaveFailure = all {
    qCurrentTurnRole == casterTurnRole,
    qActionAvailable,
    qHoles == Set(SavingThrowOutcome),
    qCurrentTurnRole' = casterTurnRole,
    qTargetIncapacitated' = projectedIncapacitated(slept.goblin),
    qTargetUnconscious' = slept.goblin.unconscious,
    qTargetProne' = slept.goblin.prone,
    qCasterConcentrating' = slept.fighter.concentrating,
    qActionAvailable' = slept.actionAvailable,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doBreakConcentrationBeforeRepeat = all {
    qCurrentTurnRole == casterTurnRole,
    not(qActionAvailable),
    qCasterConcentrating,
    qHoles == Set(),
    qCurrentTurnRole' = casterTurnRole,
    qTargetIncapacitated' = projectedIncapacitated(concentrationBroken.goblin),
    qTargetUnconscious' = concentrationBroken.goblin.unconscious,
    qTargetProne' = concentrationBroken.goblin.prone,
    qCasterConcentrating' = concentrationBroken.fighter.concentrating,
    qActionAvailable' = concentrationBroken.actionAvailable,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doEndCasterTurn = all {
    qCurrentTurnRole == casterTurnRole,
    not(qActionAvailable),
    qCasterConcentrating,
    qHoles == Set(),
    qCurrentTurnRole' = targetTurnRole,
    qTargetIncapacitated' = projectedIncapacitated(targetTurn.goblin),
    qTargetUnconscious' = targetTurn.goblin.unconscious,
    qTargetProne' = targetTurn.goblin.prone,
    qCasterConcentrating' = targetTurn.fighter.concentrating,
    qActionAvailable' = targetTurn.actionAvailable,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doEndCasterTurnAfterConcentrationBreak = all {
    qCurrentTurnRole == casterTurnRole,
    not(qActionAvailable),
    not(qCasterConcentrating),
    qHoles == Set(),
    qCurrentTurnRole' = targetTurnRole,
    qTargetIncapacitated' = projectedIncapacitated(concentrationBrokenTargetTurn.goblin),
    qTargetUnconscious' = concentrationBrokenTargetTurn.goblin.unconscious,
    qTargetProne' = concentrationBrokenTargetTurn.goblin.prone,
    qCasterConcentrating' = concentrationBrokenTargetTurn.fighter.concentrating,
    qActionAvailable' = concentrationBrokenTargetTurn.actionAvailable,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doEndTargetTurnAfterConcentrationBreak = all {
    qCurrentTurnRole == targetTurnRole,
    qActionAvailable,
    not(qTargetIncapacitated),
    not(qCasterConcentrating),
    qHoles == Set(),
    qCurrentTurnRole' = casterTurnRole,
    qTargetIncapacitated' = projectedIncapacitated(concentrationBrokenNextRound.goblin),
    qTargetUnconscious' = concentrationBrokenNextRound.goblin.unconscious,
    qTargetProne' = concentrationBrokenNextRound.goblin.prone,
    qCasterConcentrating' = concentrationBrokenNextRound.fighter.concentrating,
    qActionAvailable' = concentrationBrokenNextRound.actionAvailable,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doDiscoverRepeatSave = all {
    qCurrentTurnRole == targetTurnRole,
    qTargetIncapacitated,
    qCasterConcentrating,
    qHoles == Set(),
    qCurrentTurnRole' = targetTurnRole,
    qTargetIncapacitated' = qTargetIncapacitated,
    qTargetUnconscious' = qTargetUnconscious,
    qTargetProne' = qTargetProne,
    qCasterConcentrating' = qCasterConcentrating,
    qActionAvailable' = qActionAvailable,
    qHoles' = Set(SavingThrowOutcome),
    qLastResult' = "needsHoles",
    qLastInvalidReason' = "",
  }

  action doFillRepeatSaveSuccess = all {
    qCurrentTurnRole == targetTurnRole,
    qHoles == Set(SavingThrowOutcome),
    qCurrentTurnRole' = casterTurnRole,
    qTargetIncapacitated' = projectedIncapacitated(repeatSucceeded.goblin),
    qTargetUnconscious' = repeatSucceeded.goblin.unconscious,
    qTargetProne' = repeatSucceeded.goblin.prone,
    qCasterConcentrating' = repeatSucceeded.fighter.concentrating,
    qActionAvailable' = repeatSucceeded.actionAvailable,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action doFillRepeatSaveFailure = all {
    qCurrentTurnRole == targetTurnRole,
    qHoles == Set(SavingThrowOutcome),
    qCurrentTurnRole' = casterTurnRole,
    qTargetIncapacitated' = projectedIncapacitated(repeatFailed.goblin),
    qTargetUnconscious' = repeatFailed.goblin.unconscious,
    qTargetProne' = repeatFailed.goblin.prone,
    qCasterConcentrating' = repeatFailed.fighter.concentrating,
    qActionAvailable' = repeatFailed.actionAvailable,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  action step = any {
    doFillInitialSaveFailure,
    doBreakConcentrationBeforeRepeat,
    doEndCasterTurn,
    doEndCasterTurnAfterConcentrationBreak,
    doEndTargetTurnAfterConcentrationBreak,
    doDiscoverRepeatSave,
    doFillRepeatSaveSuccess,
    doFillRepeatSaveFailure,
  }
}
