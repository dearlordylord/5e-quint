// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE

module spellStagedSaveConditionLifecycleCore {
  type StagedSaveConditionLifecycle =
    | NoStagedSaveConditionLifecycle
    | PendingStagedSaveConditionLifecycle({ hadCondition: bool })
    | AppliedStagedSaveConditionLifecycle({
        hadCondition: bool,
        hadEscalatedCondition: bool,
      })

  pure def stagedSaveConditionInitialLifecycle(
    savingThrowSucceeded: bool,
    hadCondition: bool,
  ): StagedSaveConditionLifecycle =
    if (savingThrowSucceeded)
      NoStagedSaveConditionLifecycle
    else
      PendingStagedSaveConditionLifecycle({ hadCondition: hadCondition })

  pure def stagedSavingThrowAutomaticallySucceeds(
    targetExcludedByNature: bool,
    targetHasRelevantImmunity: bool,
  ): bool =
    targetExcludedByNature or targetHasRelevantImmunity

  pure def stagedSaveConditionAfterRepeatSave(
    pending: StagedSaveConditionLifecycle,
    savingThrowSucceeded: bool,
    hadEscalatedCondition: bool,
  ): StagedSaveConditionLifecycle =
    match pending {
      | PendingStagedSaveConditionLifecycle(data) =>
          if (savingThrowSucceeded)
            NoStagedSaveConditionLifecycle
          else
            AppliedStagedSaveConditionLifecycle({
              hadCondition: data.hadCondition,
              hadEscalatedCondition: hadEscalatedCondition,
            })
      | NoStagedSaveConditionLifecycle => NoStagedSaveConditionLifecycle
      | AppliedStagedSaveConditionLifecycle(data) => AppliedStagedSaveConditionLifecycle(data)
    }

  pure def stagedConditionEndsOnDamage: bool = true
  pure def stagedConditionEndsOnAdjacentAction: bool = true
}
