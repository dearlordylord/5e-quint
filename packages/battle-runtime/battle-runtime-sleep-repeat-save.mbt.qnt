// -*- mode: Bluespec; -*-

// Self-contained literal projection witness for the Sleep pending-repeat-save
// lifecycle. Asserts the SRD outcomes directly instead of importing the
// concentration / sleep / turn-advancement reducers, so the driver's import
// closure stays empty and its MBT trace generation stays fast (see
// scripts/check-mbt-driver-closure.cjs). Each fact below is that reducer chain's
// result for the fixed Sleep scenario (caster concentrates on Sleep against a
// single target that fails the initial save). The projected fields are
// (incapacitated, unconscious, prone, caster-concentrating, action-available).
// If the underlying rules change, update the literals here.
module battleRuntimeSleepRepeatSaveMbt {
  // Only the repeat Saving Throw hole is exercised by this witness.
  type Hole = | SavingThrowOutcome

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

  action init = all {
    qCurrentTurnRole' = casterTurnRole,
    qTargetIncapacitated' = false,
    qTargetUnconscious' = false,
    qTargetProne' = false,
    qCasterConcentrating' = false,
    qActionAvailable' = true,
    qHoles' = Set(SavingThrowOutcome),
    qLastResult' = "init",
    qLastInvalidReason' = "",
  }

  // Failing the initial save: the target is incapacitated and the caster is now
  // concentrating on Sleep; the casting spent the action.
  action doFillInitialSaveFailure = all {
    qCurrentTurnRole == casterTurnRole,
    qActionAvailable,
    qHoles == Set(SavingThrowOutcome),
    qCurrentTurnRole' = casterTurnRole,
    qTargetIncapacitated' = true,
    qTargetUnconscious' = false,
    qTargetProne' = false,
    qCasterConcentrating' = true,
    qActionAvailable' = false,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  // Breaking Concentration ends the Sleep effect: the target is no longer
  // incapacitated and the caster no longer concentrates.
  action doBreakConcentrationBeforeRepeat = all {
    qCurrentTurnRole == casterTurnRole,
    not(qActionAvailable),
    qCasterConcentrating,
    qHoles == Set(),
    qCurrentTurnRole' = casterTurnRole,
    qTargetIncapacitated' = false,
    qTargetUnconscious' = false,
    qTargetProne' = false,
    qCasterConcentrating' = false,
    qActionAvailable' = false,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  // Ending the caster turn while Sleep persists: the target stays incapacitated,
  // Concentration continues, and the new turn refreshes the action.
  action doEndCasterTurn = all {
    qCurrentTurnRole == casterTurnRole,
    not(qActionAvailable),
    qCasterConcentrating,
    qHoles == Set(),
    qCurrentTurnRole' = targetTurnRole,
    qTargetIncapacitated' = true,
    qTargetUnconscious' = false,
    qTargetProne' = false,
    qCasterConcentrating' = true,
    qActionAvailable' = true,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  // Ending the caster turn after Concentration broke: Sleep is gone, action refreshes.
  action doEndCasterTurnAfterConcentrationBreak = all {
    qCurrentTurnRole == casterTurnRole,
    not(qActionAvailable),
    not(qCasterConcentrating),
    qHoles == Set(),
    qCurrentTurnRole' = targetTurnRole,
    qTargetIncapacitated' = false,
    qTargetUnconscious' = false,
    qTargetProne' = false,
    qCasterConcentrating' = false,
    qActionAvailable' = true,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  // Ending the target turn after Concentration broke advances to the next round
  // with Sleep still gone.
  action doEndTargetTurnAfterConcentrationBreak = all {
    qCurrentTurnRole == targetTurnRole,
    qActionAvailable,
    not(qTargetIncapacitated),
    not(qCasterConcentrating),
    qHoles == Set(),
    qCurrentTurnRole' = casterTurnRole,
    qTargetIncapacitated' = false,
    qTargetUnconscious' = false,
    qTargetProne' = false,
    qCasterConcentrating' = false,
    qActionAvailable' = true,
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

  // Succeeding the repeat save wakes the target while Concentration continues.
  action doFillRepeatSaveSuccess = all {
    qCurrentTurnRole == targetTurnRole,
    qHoles == Set(SavingThrowOutcome),
    qCurrentTurnRole' = casterTurnRole,
    qTargetIncapacitated' = false,
    qTargetUnconscious' = false,
    qTargetProne' = false,
    qCasterConcentrating' = true,
    qActionAvailable' = true,
    qHoles' = Set(),
    qLastResult' = "resolved",
    qLastInvalidReason' = "",
  }

  // Failing the repeat save keeps the target Unconscious and Prone.
  action doFillRepeatSaveFailure = all {
    qCurrentTurnRole == targetTurnRole,
    qHoles == Set(SavingThrowOutcome),
    qCurrentTurnRole' = casterTurnRole,
    qTargetIncapacitated' = true,
    qTargetUnconscious' = true,
    qTargetProne' = true,
    qCasterConcentrating' = true,
    qActionAvailable' = true,
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
