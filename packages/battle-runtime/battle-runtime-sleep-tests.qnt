// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-sleep-target-admission
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-sleep-repeat-save-lifecycle

module battleRuntimeSleepTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSleepHideousLaughter.* from "./battle-runtime-sleep-hideous-laughter"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_sleep_failed_initial_save_adds_pending_repeat_save_until_concentration = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val broken = breakConcentrationSpellEffects(slept, Fighter)
    all {
      assert(not(slept.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(slept, Fighter)),
      assert(slept.fighter.concentrating),
      assert(slept.goblin.incapacitated),
      assert(slept.goblin.activeEffects.contains(SleepPendingRepeatSave({
        source: Fighter,
        repeatAtActor: Goblin,
        repeatAtRound: 1,
        hadIncapacitated: false,
      }))),
      assert(not(broken.fighter.concentrating)),
      assert(not(broken.goblin.incapacitated)),
      assert(not(sleepRepeatSaveDue(broken.goblin.activeEffects, Goblin, 1))),
    }
  }

  run test_sleep_non_sleeper_and_exhaustion_immunity_auto_success = {
    val nonSleeper = resolveSleepTargetAdmission(initialState, false, true, false)
    val exhaustionImmune = resolveSleepTargetAdmission(initialState, false, false, true)
    all {
      assert(not(nonSleeper.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(nonSleeper, Fighter)),
      assert(nonSleeper.fighter.concentrating),
      assert(not(nonSleeper.goblin.incapacitated)),
      assert(not(combatantHasSleepEffect(nonSleeper.goblin))),
      assert(not(exhaustionImmune.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(exhaustionImmune, Fighter)),
      assert(exhaustionImmune.fighter.concentrating),
      assert(not(exhaustionImmune.goblin.incapacitated)),
      assert(not(combatantHasSleepEffect(exhaustionImmune.goblin))),
    }
  }

  run test_sleep_repeat_save_success_removes_pending_effect = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val goblinTurn = endTurn(slept)
    val repeated = endTurnWithSleepRepeatSave(goblinTurn, true)
    all {
      assert(sleepRepeatSaveHoles(goblinTurn) == Set(SavingThrowOutcome)),
      assert(not(repeated.goblin.incapacitated)),
      assert(not(sleepRepeatSaveDue(repeated.goblin.activeEffects, Goblin, 1))),
    }
  }

  run test_sleep_failed_initial_save_breaks_target_concentration = {
    val concentratingGoblin = {
      ...initialState,
      goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) },
    }
    val slept = resolveSleepTargetAdmission(concentratingGoblin, false, false, false)
    all {
      assert(not(slept.goblin.concentrating)),
      assert(not(slept.goblin.activeEffects.contains(GuidanceAbilityCheckBonus({ skill: StealthSkill })))),
      assert(slept.goblin.activeEffects.contains(SleepPendingRepeatSave({
        source: Fighter,
        repeatAtActor: Goblin,
        repeatAtRound: 1,
        hadIncapacitated: false,
      }))),
    }
  }

  run test_sleep_repeat_save_failure_escalates_to_unconscious_until_concentration = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val goblinTurn = endTurn(slept)
    val repeated = endTurnWithSleepRepeatSave(goblinTurn, false)
    val broken = breakConcentrationSpellEffects(repeated, Fighter)
    all {
      assert(repeated.goblin.unconscious),
      assert(repeated.goblin.prone),
      assert(not(repeated.goblin.incapacitated)),
      assert(repeated.goblin.activeEffects.contains(SleepUnconscious({
        source: Fighter,
        hadUnconscious: false,
        hadIncapacitated: false,
      }))),
      assert(not(broken.goblin.unconscious)),
      assert(broken.goblin.prone),
      assert(not(broken.goblin.activeEffects.contains(SleepUnconscious({
        source: Fighter,
        hadUnconscious: false,
        hadIncapacitated: false,
      })))),
    }
  }

  run test_sleep_repeat_save_failure_breaks_target_concentration = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val goblinTurn = endTurn(slept)
    val concentratingGoblinTurn = {
      ...goblinTurn,
      goblin: { ...goblinTurn.goblin, concentrating: true, activeEffects: goblinTurn.goblin.activeEffects.union(Set(GuidanceAbilityCheckBonus({ skill: StealthSkill }))) },
    }
    val repeated = endTurnWithSleepRepeatSave(concentratingGoblinTurn, false)
    all {
      assert(not(repeated.goblin.concentrating)),
      assert(not(repeated.goblin.activeEffects.contains(GuidanceAbilityCheckBonus({ skill: StealthSkill })))),
      assert(repeated.goblin.activeEffects.contains(SleepUnconscious({
        source: Fighter,
        hadUnconscious: false,
        hadIncapacitated: false,
      }))),
    }
  }

  run test_sleep_damage_ends_pending_sleep_on_target = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val damaged = { ...slept, goblin: applyDamageFromSource(slept.goblin, 1, 1, true, OrdinaryDamage, Goblin) }
    all {
      assert(not(damaged.goblin.incapacitated)),
      assert(not(combatantHasSleepEffect(damaged.goblin))),
    }
  }

  run test_sleep_damage_ends_unconscious_sleep_and_leaves_prone = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val goblinTurn = endTurn(slept)
    val repeated = endTurnWithSleepRepeatSave(goblinTurn, false)
    val damaged = { ...repeated, goblin: applyDamageFromSource(repeated.goblin, 1, 1, true, OrdinaryDamage, Goblin) }
    all {
      assert(not(damaged.goblin.unconscious)),
      assert(damaged.goblin.prone),
      assert(not(combatantHasSleepEffect(damaged.goblin))),
    }
  }

  run test_sleep_adjacent_action_shakes_target_awake = {
    val slept = resolveSleepTargetAdmission(initialState, false, false, false)
    val nextRoundFighterTurn = {
      ...slept,
      initiative: { round: 2, alreadyActed: List(), stillToAct: { actor: Fighter, waiting: List(Goblin) } },
      actionAvailable: true,
    }
    val shaken = shakeAwakeFromSleep(nextRoundFighterTurn, Goblin, true)
    val notAdjacent = shakeAwakeFromSleep(nextRoundFighterTurn, Goblin, false)
    all {
      assert(not(shaken.actionAvailable)),
      assert(not(shaken.goblin.incapacitated)),
      assert(not(combatantHasSleepEffect(shaken.goblin))),
      assert(notAdjacent == nextRoundFighterTurn),
    }
  }

}
