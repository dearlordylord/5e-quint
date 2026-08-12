// -*- mode: Bluespec; -*-

module battleRuntimeConcentrationTests {
  import battleRuntimeSavingThrowRollMode.* from "./battle-runtime-saving-throw-roll-mode"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_concentration_damage_dc_is_capped = {
    all {
      assert(concentrationSavingThrowDc(24) == 12),
      assert(concentrationSavingThrowDc(80) == 30),
    }
  }

  run test_eldritch_mind_only_changes_concentration_saving_throw_mode = {
    all {
      assert(eldritchMindConcentrationSavingThrowMode(true) == AdvantageSavingThrow),
      assert(eldritchMindConcentrationSavingThrowMode(false) == NormalSavingThrow),
    }
  }

  run test_danger_sense_changes_dexterity_saving_throw_mode_until_incapacitated = {
    all {
      assert(dangerSenseSavingThrowMode(DexAbility, false) == AdvantageSavingThrow),
      assert(dangerSenseSavingThrowMode(DexAbility, true) == NormalSavingThrow),
      assert(dangerSenseSavingThrowMode(ConAbility, false) == NormalSavingThrow),
    }
  }

  run test_concentration_breaks_on_failed_damage_save = {
    val concentrating = { ...initialState.fighter, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) }
    val result = applyDamage(concentrating, 5, 1, false)
    all {
      assert(not(result.concentrating)),
      assert(result.activeEffects == Set()),
    }
  }

  run test_readied_spell_uses_concentration_until_release_or_next_turn = {
    val readied = readyFighterReadiedSpell(initialState)
    val released = releaseFighterReadiedSpell(readied)
    val expired = endTurn(endTurn(readied))
    all {
      assert(readied.fighter.concentrating),
      assert(readied.fighter.readiedSpellHeld),
      assert(not(released.fighter.concentrating)),
      assert(not(released.fighter.readiedSpellHeld)),
      assert(not(expired.fighter.readiedSpellHeld)),
    }
  }

}
}

