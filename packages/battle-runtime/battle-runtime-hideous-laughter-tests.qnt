// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-save
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-hideous-laughter-repeat-save-lifecycle

module battleRuntimeHideousLaughterTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSleepHideousLaughter.* from "./battle-runtime-sleep-hideous-laughter"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"

  run test_hideous_laughter_failed_save_applies_conditions_and_concentration = {
    val laughed = resolveHideousLaughter(initialState, false, 1)
    all {
      assert(laughed.goblin.prone),
      assert(laughed.goblin.incapacitated),
      assert(laughed.fighter.concentrating),
      assert(laughed.goblin.activeEffects.contains(HideousLaughterEffect({
        source: Fighter,
        target: Goblin,
        hadProne: false,
        hadIncapacitated: false,
        heightenedRepeatSaveDisadvantage: false,
        durationTicks: hideousLaughterDurationTicks,
      }))),
      assert(hideousLaughterMaxTargets(1) == 1),
      assert(hideousLaughterMaxTargets(2) == 2),
      assert(hideousLaughterDurationTicks == 10),
    }
  }

  run test_hideous_laughter_expires_after_one_minute_duration = {
    val expiring = {
      ...initialState,
      fighter: { ...initialState.fighter, concentrating: true },
      goblin: {
        ...initialState.goblin,
        prone: true,
        incapacitated: true,
        activeEffects: Set(HideousLaughterEffect({
          source: Fighter,
          target: Goblin,
          hadProne: false,
          hadIncapacitated: false,
          heightenedRepeatSaveDisadvantage: false,
          durationTicks: 1,
        })),
      },
    }
    val expired = tickRoundDurationSpellEffects(expiring)
    all {
      assert(not(expired.fighter.concentrating)),
      assert(not(expired.goblin.prone)),
      assert(not(expired.goblin.incapacitated)),
      assert(not(combatantHasHideousLaughter(expired.goblin))),
    }
  }

  run test_hideous_laughter_repeat_and_damage_saves_end_effect = {
    val laughed = resolveHideousLaughter(initialState, false, 1)
    val goblinTurn = endTurn(laughed)
    val repeated = endTurnWithHideousLaughterRepeatSave(goblinTurn, true)
    val damaged = combatantAfterHideousLaughterDamageRepeatSave(laughed.goblin, Fighter, Goblin, 1, true)
    all {
      assert(hideousLaughterRepeatSaveHoles(goblinTurn) == Set(SavingThrowOutcome)),
      assert(not(repeated.goblin.prone)),
      assert(not(repeated.goblin.incapacitated)),
      assert(not(combatantHasHideousLaughter(repeated.goblin))),
      assert(hideousLaughterDamageRepeatSaveRollMode(laughed.goblin) == AdvantageSavingThrow),
      assert(not(damaged.prone)),
      assert(not(damaged.incapacitated)),
      assert(not(combatantHasHideousLaughter(damaged))),
    }
  }

  run test_heightened_hideous_laughter_repeat_save_roll_modes = {
    val target = hideousLaughterTarget(initialState.goblin, Goblin, false, Fighter, Goblin)
    all {
      assert(hideousLaughterEndTurnRepeatSaveRollMode(target) == DisadvantageSavingThrow),
      assert(hideousLaughterDamageRepeatSaveRollMode(target) == AdvantageSavingThrow),
      assert(hideousLaughterDamageRepeatSaveRollModeWithHeightened(target) == NormalSavingThrow),
    }
  }

}
