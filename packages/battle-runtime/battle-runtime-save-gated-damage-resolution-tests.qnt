// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-damage-save-or-attack

module battleRuntimeSaveGatedDamageResolutionTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSaveGatedDamageResolution.* from "./battle-runtime-save-gated-damage-resolution"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"

  run test_mind_spike_failed_save_starts_duration_bearing_concentration = {
    val spiked = resolveMindSpike(initialState, false, 8, true)
    all {
      assert(spiked.goblin.hp == initialState.goblin.hp - 8),
      assert(spiked.fighter.concentrating),
      assert(spiked.fighter.activeEffects.contains(MindSpikeConcentrationDuration({ durationTicks: mindSpikeDurationTicks }))),
      assert(spiked.goblin.activeEffects == initialState.goblin.activeEffects),
      assert(battleActorHasCommittedSpellSlotUse(spiked, Fighter)),
    }
  }

  run test_mind_spike_failed_save_concentration_expires_after_one_hour_duration = {
    val spiked = resolveMindSpike(initialState, false, 12, true)
    val expiring = {
      ...spiked,
      fighter: {
        ...spiked.fighter,
        activeEffects: Set(MindSpikeConcentrationDuration({ durationTicks: 1 })),
      },
    }
    val expired = tickRoundDurationSpellEffects(expiring)
    all {
      assert(not(expired.fighter.concentrating)),
      assert(expired.fighter.activeEffects == Set()),
    }
  }

  run test_mind_spike_successful_save_breaks_prior_concentration_without_starting_new_effect = {
    val concentrating = { ...initialState, fighter: { ...initialState.fighter, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val spiked = resolveMindSpike(concentrating, true, 12, true)
    all {
      assert(spiked.goblin.hp == initialState.goblin.hp - 6),
      assert(not(spiked.fighter.concentrating)),
      assert(spiked.fighter.activeEffects == Set()),
      assert(battleActorHasCommittedSpellSlotUse(spiked, Fighter)),
    }
  }

  run test_mind_spike_self_target_breaks_prior_concentration_before_damage_lifecycle = {
    val concentrating = { ...initialState, fighter: { ...initialState.fighter, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val spiked = resolveSelfMindSpike(concentrating, false, 4, false)
    all {
      assert(not(saveGatedSelfTargetDamageRequiresConcentrationSaveAfterCastBreak(concentrating, MindSpikeSaveGate, false, 4))),
      assert(spiked.fighter.hp == initialState.fighter.hp - 4),
      assert(spiked.fighter.concentrating),
      assert(spiked.fighter.activeEffects == Set(MindSpikeConcentrationDuration({ durationTicks: mindSpikeDurationTicks }))),
      assert(battleActorHasCommittedSpellSlotUse(spiked, Fighter)),
    }
  }

  run test_acid_splash_damage_applies_only_to_failed_saving_throw_targets = {
    val result = resolveAcidSplash(initialState, false, true, 4, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.fighter.hp == 12),
      assert(result.goblin.hp == 6),
    }
  }

  run test_burning_hands_area_save_damage_halves_success_and_spends_slot = {
    val result = resolveBurningHands(initialState, false, true, 6, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.hp == 6),
      assert(result.goblin.hp == 7),
    }
  }

  run test_burning_hands_empty_area_spends_slot_without_damage = {
    val result = resolveBurningHandsEmptyArea(initialState)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.hp == 12),
      assert(result.goblin.hp == 10),
    }
  }

  run test_fireball_area_save_damage_halves_success_and_spends_slot = {
    val result = resolveFireball(initialState, false, true, 8, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.hp == 4),
      assert(result.goblin.hp == 6),
    }
  }

  run test_fireball_empty_area_spends_slot_without_damage = {
    val result = resolveFireballEmptyArea(initialState)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.hp == 12),
      assert(result.goblin.hp == 10),
    }
  }

  run test_ice_knife_critical_doubles_only_primary_piercing_attack_damage = {
    val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
    val result = resolveIceKnife(noReaction, 20, 20, 5, false, false, false, 6, true, true)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.attackRollMadeThisTurn),
      assert(result.goblin.hp == 0),
      assert(result.fighter.hp == 12),
    }
  }

  run test_ice_knife_miss_still_resolves_primary_target_burst_save = {
    val failed = resolveIceKnife(initialState, 1, 1, 5, false, false, false, 6, true, true)
    val succeeded = resolveIceKnife(initialState, 1, 1, 5, true, false, false, 6, true, true)
    all {
      assert(failed.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(failed, Fighter)),
      assert(failed.goblin.hp == 4),
      assert(succeeded.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(succeeded, Fighter)),
      assert(succeeded.goblin.hp == 10),
    }
  }

  run test_ice_knife_burst_can_include_caster_but_primary_target_is_always_included = {
    val result = resolveIceKnife(initialState, 1, 1, 5, false, true, false, 6, true, true)
    val casterSucceeded = resolveIceKnife(initialState, 1, 1, 5, false, true, true, 6, true, true)
    all {
      assert(result.goblin.hp == 4),
      assert(result.fighter.hp == 6),
      assert(casterSucceeded.goblin.hp == 4),
      assert(casterSucceeded.fighter.hp == 12),
    }
  }

  run test_ice_knife_combines_attack_and_burst_damage_for_concentration = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, reactionAvailable: false, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val result = resolveIceKnife(concentratingGoblin, 15, 10, 4, false, false, false, 6, false, true)
    all {
      assert(result.goblin.hp == 0),
      assert(not(result.goblin.concentrating)),
      assert(not(result.goblin.activeEffects.contains(GuidanceAbilityCheckBonus({ skill: StealthSkill })))),
    }
  }

  run test_sacred_flame_applies_radiant_damage_only_on_failed_saving_throw = {
    val failed = resolveSacredFlame(initialState, false, 7, true)
    val succeeded = resolveSacredFlame(initialState, true, 7, true)
    all {
      assert(failed.actionAvailable == false),
      assert(failed.goblin.hp == 3),
      assert(not(battleActorHasSpellSlotUse(failed, Fighter))),
      assert(succeeded.actionAvailable == false),
      assert(succeeded.goblin.hp == 10),
      assert(not(battleActorHasSpellSlotUse(succeeded, Fighter))),
    }
  }

  run test_inflict_wounds_spends_slot_and_halves_damage_on_successful_saving_throw = {
    val failed = resolveInflictWounds(initialState, false, 10, true)
    val succeeded = resolveInflictWounds(initialState, true, 10, true)
    val alreadySpent = commitActorSpellSlotUse(initialState, Fighter)
    all {
      assert(failed.actionAvailable == false),
      assert(failed.goblin.hp == 0),
      assert(battleActorHasCommittedSpellSlotUse(failed, Fighter)),
      assert(succeeded.actionAvailable == false),
      assert(succeeded.goblin.hp == 5),
      assert(battleActorHasCommittedSpellSlotUse(succeeded, Fighter)),
      assert(resolveInflictWounds(alreadySpent, false, 10, true) == alreadySpent),
    }
  }

  run test_acid_splash_damage_can_break_target_concentration = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val result = resolveAcidSplash(concentratingGoblin, false, true, 4, true, false)
    all {
      assert(result.goblin.hp == 6),
      assert(not(result.goblin.concentrating)),
      assert(result.goblin.activeEffects == Set()),
    }
  }

}
