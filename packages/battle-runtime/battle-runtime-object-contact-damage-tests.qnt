// -*- mode: Bluespec; -*-

module battleRuntimeObjectContactDamageTests {
  import battleRuntime.* from "./battle-runtime"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeObjectContactDamage.* from "./battle-runtime-object-contact-damage"

  run test_heat_metal_records_object_contact_effect_and_immediate_damage = {
    val resolved = resolveHeatMetal(initialState, heatMetalObjectId, Set(Goblin), 2, 7, true, true)
    all {
      assert(resolved.fighter.activeEffects.contains(HeatMetalObjectContactDamage({
        objectId: heatMetalObjectId,
        damageDice: 2,
        durationTicks: heatMetalDurationTicks,
        startedRound: 1,
      }))),
      assert(resolved.fighter.concentrating),
      assert(resolved.goblin.hp == 3),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_heat_metal_slot_scaling_is_stored_for_later_repeat_damage = {
    val resolved = resolveHeatMetal(initialState, heatMetalObjectId, Set(), 3, 0, true, true)
    all {
      assert(heatMetalDamageDice(2) == 2),
      assert(heatMetalDamageDice(3) == 3),
      assert(heatMetalObjectContactDamageActiveDamageDice(resolved, heatMetalObjectId) == 3),
      assert(resolved.goblin.hp == initialState.goblin.hp),
    }
  }

  run test_heat_metal_self_contact_damage_can_break_new_concentration = {
    val resolved = resolveHeatMetal(initialState, heatMetalObjectId, Set(Fighter), 2, 7, false, true)
    all {
      assert(resolved.fighter.hp == 5),
      assert(not(resolved.fighter.concentrating)),
      assert(not(heatMetalObjectContactDamageActive(resolved, heatMetalObjectId))),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_heat_metal_later_turn_repeat_requires_range_and_spends_bonus_action = {
    val cast = resolveHeatMetal(initialState, heatMetalObjectId, Set(Goblin), 3, 4, true, true)
    val sameTurnBlocked = resolveHeatMetalRepeat(cast, heatMetalObjectId, true, Set(Goblin), 3, true, true)
    val goblinTurn = endTurn(cast)
    val fighterTurn = endTurn(goblinTurn)
    val rangeBlocked = resolveHeatMetalRepeat(fighterTurn, heatMetalObjectId, false, Set(Goblin), 3, true, true)
    val repeated = resolveHeatMetalRepeat(fighterTurn, heatMetalObjectId, true, Set(Goblin), 3, true, true)
    all {
      assert(sameTurnBlocked.goblin.hp == cast.goblin.hp),
      assert(sameTurnBlocked.bonusActionAvailable == cast.bonusActionAvailable),
      assert(rangeBlocked.goblin.hp == fighterTurn.goblin.hp),
      assert(rangeBlocked.bonusActionAvailable),
      assert(repeated.goblin.hp == 3),
      assert(not(repeated.bonusActionAvailable)),
    }
  }

  run test_heat_metal_concentration_break_removes_object_contact_effect = {
    val resolved = resolveHeatMetal(initialState, heatMetalObjectId, Set(), 2, 0, true, true)
    val broken = breakConcentrationSpellEffects(resolved, Fighter)
    all {
      assert(not(broken.fighter.concentrating)),
      assert(not(heatMetalObjectContactDamageActive(broken, heatMetalObjectId))),
    }
  }
}
