// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-save

module battleRuntimeSaveConditionColorSprayTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSaveConditionColorSpray.* from "./battle-runtime-save-condition-color-spray"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_color_spray_area_save_applies_blinded_and_spends_slot = {
    val result = resolveColorSpray(initialState, false, true)
    val blinded = ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 })
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.activeEffects.contains(blinded)),
      assert(not(result.goblin.activeEffects.contains(blinded))),
    }
  }

  run test_color_spray_blinded_expires_at_end_of_caster_next_turn = {
    val hit = resolveColorSpray(initialState, true, false)
    val afterFighterTurn = endTurn(hit)
    val afterGoblinTurn = endTurn(afterFighterTurn)
    val afterFighterNextTurn = endTurn(afterGoblinTurn)
    val blinded = ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 })
    all {
      assert(hit.goblin.activeEffects.contains(blinded)),
      assert(afterFighterTurn.goblin.activeEffects.contains(blinded)),
      assert(afterGoblinTurn.goblin.activeEffects.contains(blinded)),
      assert(not(afterFighterNextTurn.goblin.activeEffects.contains(blinded))),
    }
  }

  run test_color_spray_empty_area_spends_slot_without_effect = {
    val result = resolveColorSprayEmptyArea(initialState)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(not(result.fighter.activeEffects.exists(effect => match effect {
        | ColorSprayBlinded(_) => true
        | _ => false
      }))),
      assert(not(result.goblin.activeEffects.exists(effect => match effect {
        | ColorSprayBlinded(_) => true
        | _ => false
      }))),
    }
  }

}
