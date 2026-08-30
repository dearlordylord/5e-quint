// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE

module spellSleepRepeatSaveLifecycleCore {
  import spellStagedSaveConditionLifecycleCore.* from "./spell-staged-save-condition-lifecycle-core"
  // RAW anchors:
  // - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Sleep:
  //   initial Wisdom Saving Throw, end-of-next-turn repeat save,
  //   failed-repeat Unconscious escalation, end on damage or adjacent
  //   shake-awake action, and automatic save success.
  // - Rules-Glossary.md: Saving Throw and Unconscious condition.
  // - UBIQUITOUS_LANGUAGE.md: Saving Throw and Unconscious.

  type SleepRepeatSaveLifecycle =
    | NoSleepRepeatSaveLifecycle
    | PendingSleepRepeatSaveLifecycle({ hadIncapacitated: bool })
    | UnconsciousSleepRepeatSaveLifecycle({
        hadIncapacitated: bool,
        hadUnconscious: bool,
      })

  pure def sleepInitialSaveLifecycle(
    savingThrowSucceeded: bool,
    hadIncapacitated: bool,
  ): SleepRepeatSaveLifecycle =
    match stagedSaveConditionInitialLifecycle(savingThrowSucceeded, hadIncapacitated) {
      | NoStagedSaveConditionLifecycle => NoSleepRepeatSaveLifecycle
      | PendingStagedSaveConditionLifecycle(data) =>
          PendingSleepRepeatSaveLifecycle({ hadIncapacitated: data.hadCondition })
      | AppliedStagedSaveConditionLifecycle(_) => NoSleepRepeatSaveLifecycle
    }

  pure def sleepSavingThrowAutomaticallySucceeds(
    targetDoesNotSleep: bool,
    targetHasExhaustionImmunity: bool,
  ): bool =
    stagedSavingThrowAutomaticallySucceeds(targetDoesNotSleep, targetHasExhaustionImmunity)

  pure def sleepRepeatSaveLifecycle(
    pending: SleepRepeatSaveLifecycle,
    savingThrowSucceeded: bool,
    hadUnconscious: bool,
  ): SleepRepeatSaveLifecycle =
    match pending {
      | PendingSleepRepeatSaveLifecycle(data) =>
          match stagedSaveConditionAfterRepeatSave(
            PendingStagedSaveConditionLifecycle({ hadCondition: data.hadIncapacitated }),
            savingThrowSucceeded,
            hadUnconscious,
          ) {
            | NoStagedSaveConditionLifecycle => NoSleepRepeatSaveLifecycle
            | PendingStagedSaveConditionLifecycle(next) =>
                PendingSleepRepeatSaveLifecycle({ hadIncapacitated: next.hadCondition })
            | AppliedStagedSaveConditionLifecycle(next) =>
                UnconsciousSleepRepeatSaveLifecycle({
                  hadIncapacitated: next.hadCondition,
                  hadUnconscious: next.hadEscalatedCondition,
                })
          }
      | NoSleepRepeatSaveLifecycle => NoSleepRepeatSaveLifecycle
      | UnconsciousSleepRepeatSaveLifecycle(data) => UnconsciousSleepRepeatSaveLifecycle(data)
    }

  pure def sleepEffectEndsOnDamage: bool = stagedConditionEndsOnDamage

  pure def sleepEffectEndsOnAdjacentShakeAwakeAction: bool = stagedConditionEndsOnAdjacentAction
}
