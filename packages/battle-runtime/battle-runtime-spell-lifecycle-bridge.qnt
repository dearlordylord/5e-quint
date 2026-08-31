// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS BATTLE.SPELL.READIED_RESPONSE_PROCEDURE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-damage-reduction

module battleRuntimeSpellLifecycleBridge {
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import spellTurnHookCore.* from "../shared-algebras/proofs/rule-core/spell-turn-hook-core"
  import spellObjectHitPointDamageCore.* from "../shared-algebras/proofs/rule-core/spell-object-hit-point-damage-core"
  import spellSleepRepeatSaveLifecycleCore.* from "../shared-algebras/proofs/rule-core/spell-sleep-repeat-save-lifecycle-core"
  import battleRuntimeModel.* from "./battle-runtime-model"

  type BattleRuntimeSleepRepeatSaveLifecycle =
    | BattleRuntimeNoSleepRepeatSaveLifecycle
    | BattleRuntimePendingSleepRepeatSaveLifecycle({ hadIncapacitated: bool })
    | BattleRuntimeUnconsciousSleepRepeatSaveLifecycle({
        hadIncapacitated: bool,
        hadUnconscious: bool,
      })
  type BattleRuntimeObjectHitPointDamageResult = {
    effectiveDamage: int,
    priorHitPoints: int,
    nextHitPoints: int,
    destroyed: bool,
  }
  pure def battleRuntimeSleepRepeatSaveLifecycle(
    lifecycle: SleepRepeatSaveLifecycle
  ): BattleRuntimeSleepRepeatSaveLifecycle =
    match lifecycle {
      | NoSleepRepeatSaveLifecycle => BattleRuntimeNoSleepRepeatSaveLifecycle
      | PendingSleepRepeatSaveLifecycle(data) => BattleRuntimePendingSleepRepeatSaveLifecycle(data)
      | UnconsciousSleepRepeatSaveLifecycle(data) => BattleRuntimeUnconsciousSleepRepeatSaveLifecycle(data)
    }
  pure def battleRuntimeSleepInitialSaveLifecycle(
    savingThrowSucceeded: bool,
    hadIncapacitated: bool,
  ): BattleRuntimeSleepRepeatSaveLifecycle =
    battleRuntimeSleepRepeatSaveLifecycle(
      sleepInitialSaveLifecycle(savingThrowSucceeded, hadIncapacitated)
    )
  pure def battleRuntimeSleepSavingThrowAutomaticallySucceeds(
    targetDoesNotSleep: bool,
    targetHasExhaustionImmunity: bool,
  ): bool =
    sleepSavingThrowAutomaticallySucceeds(targetDoesNotSleep, targetHasExhaustionImmunity)
  pure def battleRuntimeSleepRepeatSaveLifecycleAfterSave(
    lifecycle: BattleRuntimeSleepRepeatSaveLifecycle,
    savingThrowSucceeded: bool,
    hadUnconscious: bool,
  ): BattleRuntimeSleepRepeatSaveLifecycle =
    match lifecycle {
      | BattleRuntimePendingSleepRepeatSaveLifecycle(data) =>
          battleRuntimeSleepRepeatSaveLifecycle(
            sleepRepeatSaveLifecycle(
              PendingSleepRepeatSaveLifecycle(data),
              savingThrowSucceeded,
              hadUnconscious,
            )
          )
      | _ => lifecycle
    }
  pure def battleRuntimeSleepEffectEndsOnDamage: bool =
    sleepEffectEndsOnDamage
  pure def battleRuntimeSleepEffectEndsOnAdjacentShakeAwakeAction: bool =
    sleepEffectEndsOnAdjacentShakeAwakeAction
  pure def battleRuntimeObjectDamageThreshold(damageThreshold: int): ObjectDamageThreshold =
    if (damageThreshold <= 0)
      ObjectWithoutDamageThreshold
    else
      ObjectWithDamageThreshold({ amount: damageThreshold })
  pure def battleRuntimeObjectHitPointDamageResult(
    damageType: RuleDamageType,
    rolledDamage: int,
    priorHitPoints: int,
    damageThreshold: int
  ): BattleRuntimeObjectHitPointDamageResult = {
    val damageAfterObjectImmunity = if (battleRuntimeObjectDamageTypeIsImmune(damageType)) 0 else rolledDamage
    val result = objectHitPointDamageResult({
      rolledDamage: damageAfterObjectImmunity,
      priorHitPoints: priorHitPoints,
      damageThreshold: battleRuntimeObjectDamageThreshold(damageThreshold),
    })
    {
      effectiveDamage: result.effectiveDamage,
      priorHitPoints: result.priorHitPoints,
      nextHitPoints: result.nextHitPoints,
      destroyed: result.destroyed,
    }
  }
  pure def battleRuntimeObjectDamageTypeIsImmune(damageType: RuleDamageType): bool =
    damageType == PoisonDamage or damageType == PsychicDamage
  pure def battleRuntimeTurnStartTemporaryHitPoints(
    existingTemporaryHitPoints: int,
    grantedTemporaryHitPoints: int
  ): int =
    turnStartTemporaryHitPoints(existingTemporaryHitPoints, grantedTemporaryHitPoints)
  pure def battleRuntimeOncePerTurnSpellEffectUsedAtTurnStart: bool =
    oncePerTurnSpellEffectUsedAtTurnStart
  pure def resetResistanceDamageReductions(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.map(effect => match effect {
      | ResistanceDamageReduction(data) => ResistanceDamageReduction({
          ...data,
          usedThisTurn: battleRuntimeOncePerTurnSpellEffectUsedAtTurnStart,
        })
      | _ => effect
    })
  pure def battleRuntimeOneRoundShieldArmorClassBonusExpiresAtStartOfNextTurn: bool =
    oneRoundTriggeredDefenseExpiresAtStartOfNextTurn
  pure def battleRuntimeTimedSpellEffectDurationAfterRoundTick(durationTicks: int): int =
    timedSpellEffectDurationAfterRoundTick(durationTicks)
  pure def battleRuntimeTimedSpellEffectRemainsActive(durationTicks: int): bool =
    timedSpellEffectRemainsActive(durationTicks)
}
