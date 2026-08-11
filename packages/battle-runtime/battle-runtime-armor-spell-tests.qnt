// -*- mode: Bluespec; -*-

module battleRuntimeArmorSpellTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeArmorSpellResolution.* from "./battle-runtime-armor-spell-resolution"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_mage_armor_sets_base_ac_plus_dex = {
    all {
      assert(activeEffectArmorClass(10, 2, Set(mageArmorActiveEffect(mageArmorDurationTicks))) == 15),
      assert(activeEffectArmorClass(10, 2, Set(RayOfFrostSpeedDelta)) == 10),
    }
  }
  run test_armor_of_shadows_mage_armor_spends_action_not_spell_slot = {
    val result = resolveArmorOfShadowsMageArmorSpell(initialState)
    all {
      assert(result.fighter.activeEffects.contains(mageArmorActiveEffect(mageArmorDurationTicks))),
      assert(not(result.actionAvailable)),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
    }
  }
  run test_armor_of_shadows_mage_armor_rejects_heavy_armored_self = {
    val armored = { ...initialState, fighter: { ...initialState.fighter, wearingHeavyArmor: true } }
    val result = resolveArmorOfShadowsMageArmorSpell(armored)
    all {
      assert(not(activeEffectsContainMageArmor(result.fighter.activeEffects))),
      assert(result.actionAvailable),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
    }
  }
  run test_armor_of_shadows_mage_armor_replaces_existing_effect_duration = {
    val protected = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(mageArmorActiveEffect(1)) } }
    val result = resolveArmorOfShadowsMageArmorSpell(protected)
    all {
      assert(result.fighter.activeEffects == Set(mageArmorActiveEffect(mageArmorDurationTicks))),
      assert(not(result.actionAvailable)),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
    }
  }
  run test_mage_armor_expires_after_duration_tick = {
    val nearlyExpired = {
      ...resolveArmorOfShadowsMageArmorSpell(initialState),
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(mageArmorActiveEffect(1)),
      },
    }
    val stillSameRound = endTurn(nearlyExpired)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(activeEffectsContainMageArmor(stillSameRound.fighter.activeEffects)),
      assert(activeEffectsMageArmorDurationTicks(stillSameRound.fighter.activeEffects) == 1),
      assert(not(activeEffectsContainMageArmor(nextRound.fighter.activeEffects))),
      assert(combatantArmorClass(stillSameRound.fighter) == 13),
      assert(combatantArmorClass(nextRound.fighter) == 10),
    }
  }
}
