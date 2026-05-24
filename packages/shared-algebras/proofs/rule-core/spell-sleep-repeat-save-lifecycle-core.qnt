// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellSleepRepeatSaveLifecycleCore {
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
    if (savingThrowSucceeded)
      NoSleepRepeatSaveLifecycle
    else
      PendingSleepRepeatSaveLifecycle({ hadIncapacitated: hadIncapacitated })

  pure def sleepSavingThrowAutomaticallySucceeds(
    targetDoesNotSleep: bool,
    targetHasExhaustionImmunity: bool,
  ): bool =
    targetDoesNotSleep or targetHasExhaustionImmunity

  pure def sleepRepeatSaveLifecycle(
    pending: SleepRepeatSaveLifecycle,
    savingThrowSucceeded: bool,
    hadUnconscious: bool,
  ): SleepRepeatSaveLifecycle =
    match pending {
      | PendingSleepRepeatSaveLifecycle(data) =>
          if (savingThrowSucceeded)
            NoSleepRepeatSaveLifecycle
          else
            UnconsciousSleepRepeatSaveLifecycle({
              hadIncapacitated: data.hadIncapacitated,
              hadUnconscious: hadUnconscious,
            })
      | _ => pending
    }

  pure def sleepEffectEndsOnDamage: bool = true

  pure def sleepEffectEndsOnAdjacentShakeAwakeAction: bool = true
}
