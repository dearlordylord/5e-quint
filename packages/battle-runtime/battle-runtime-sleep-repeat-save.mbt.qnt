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
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Only the repeat Saving Throw hole is exercised by this witness.
  type Hole = | SavingThrowOutcome

  type SleepRepeatSaveWitnessState = {
    currentTurnRole: str,
    targetIncapacitated: bool,
    targetUnconscious: bool,
    targetProne: bool,
    casterConcentrating: bool,
    actionAvailable: bool,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SleepRepeatSaveWitnessState

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"

  action init = all {
    qState' = {
      currentTurnRole: casterTurnRole,
      targetIncapacitated: false,
      targetUnconscious: false,
      targetProne: false,
      casterConcentrating: false,
      actionAvailable: true,
      protocol: witnessInitWithHoles(Set(SavingThrowOutcome)),
    },
  }

  // Failing the initial save: the target is incapacitated and the caster is now
  // concentrating on Sleep; the casting spent the action.
  action doFillInitialSaveFailure = all {
    qState.currentTurnRole == casterTurnRole,
    qState.actionAvailable,
    qState.protocol.holes == Set(SavingThrowOutcome),
    qState' = {
      currentTurnRole: casterTurnRole,
      targetIncapacitated: true,
      targetUnconscious: false,
      targetProne: false,
      casterConcentrating: true,
      actionAvailable: false,
      protocol: witnessResolved(SavingThrowOutcome),
    },
  }

  // Breaking Concentration ends the Sleep effect: the target is no longer
  // incapacitated and the caster no longer concentrates.
  action doBreakConcentrationBeforeRepeat = all {
    qState.currentTurnRole == casterTurnRole,
    not(qState.actionAvailable),
    qState.casterConcentrating,
    qState.protocol.holes == Set(),
    qState' = {
      currentTurnRole: casterTurnRole,
      targetIncapacitated: false,
      targetUnconscious: false,
      targetProne: false,
      casterConcentrating: false,
      actionAvailable: false,
      protocol: witnessResolved(SavingThrowOutcome),
    },
  }

  // Ending the caster turn while Sleep persists: the target stays incapacitated,
  // Concentration continues, and the new turn refreshes the action.
  action doEndCasterTurn = all {
    qState.currentTurnRole == casterTurnRole,
    not(qState.actionAvailable),
    qState.casterConcentrating,
    qState.protocol.holes == Set(),
    qState' = {
      currentTurnRole: targetTurnRole,
      targetIncapacitated: true,
      targetUnconscious: false,
      targetProne: false,
      casterConcentrating: true,
      actionAvailable: true,
      protocol: witnessResolved(SavingThrowOutcome),
    },
  }

  // Ending the caster turn after Concentration broke: Sleep is gone, action refreshes.
  action doEndCasterTurnAfterConcentrationBreak = all {
    qState.currentTurnRole == casterTurnRole,
    not(qState.actionAvailable),
    not(qState.casterConcentrating),
    qState.protocol.holes == Set(),
    qState' = {
      currentTurnRole: targetTurnRole,
      targetIncapacitated: false,
      targetUnconscious: false,
      targetProne: false,
      casterConcentrating: false,
      actionAvailable: true,
      protocol: witnessResolved(SavingThrowOutcome),
    },
  }

  // Ending the target turn after Concentration broke advances to the next round
  // with Sleep still gone.
  action doEndTargetTurnAfterConcentrationBreak = all {
    qState.currentTurnRole == targetTurnRole,
    qState.actionAvailable,
    not(qState.targetIncapacitated),
    not(qState.casterConcentrating),
    qState.protocol.holes == Set(),
    qState' = {
      currentTurnRole: casterTurnRole,
      targetIncapacitated: false,
      targetUnconscious: false,
      targetProne: false,
      casterConcentrating: false,
      actionAvailable: true,
      protocol: witnessResolved(SavingThrowOutcome),
    },
  }

  action doDiscoverRepeatSave = all {
    qState.currentTurnRole == targetTurnRole,
    qState.targetIncapacitated,
    qState.casterConcentrating,
    qState.protocol.holes == Set(),
    qState' = qState.with(
      "protocol",
      witnessNeedsHoles(Set(SavingThrowOutcome))
    ),
  }

  // Succeeding the repeat save wakes the target while Concentration continues.
  action doFillRepeatSaveSuccess = all {
    qState.currentTurnRole == targetTurnRole,
    qState.protocol.holes == Set(SavingThrowOutcome),
    qState' = {
      currentTurnRole: casterTurnRole,
      targetIncapacitated: false,
      targetUnconscious: false,
      targetProne: false,
      casterConcentrating: true,
      actionAvailable: true,
      protocol: witnessResolved(SavingThrowOutcome),
    },
  }

  // Failing the repeat save keeps the target Unconscious and Prone.
  action doFillRepeatSaveFailure = all {
    qState.currentTurnRole == targetTurnRole,
    qState.protocol.holes == Set(SavingThrowOutcome),
    qState' = {
      currentTurnRole: casterTurnRole,
      targetIncapacitated: true,
      targetUnconscious: true,
      targetProne: true,
      casterConcentrating: true,
      actionAvailable: true,
      protocol: witnessResolved(SavingThrowOutcome),
    },
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
