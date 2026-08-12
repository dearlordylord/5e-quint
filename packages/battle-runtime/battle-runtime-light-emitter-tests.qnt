// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-object-light spell.invocation-held-light-emitter spell.invocation-dancing-lights-movable-dim-light

module battleRuntimeLightEmitterTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeLightEmitters.* from "./battle-runtime-light-emitters"
  import battleRuntimeLightSpellLifecycle.* from "./battle-runtime-light-spell-lifecycle"
  import battleRuntimeLightSpellAttacks.* from "./battle-runtime-light-spell-attacks"
  import battleRuntimeOngoingSpellDispel.* from "./battle-runtime-ongoing-spell-dispel"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeTriggeredReactionResolution.* from "./battle-runtime-triggered-reaction-resolution"
  import battleRuntimeSpellAttackFacts.* from "./battle-runtime-spell-attack-facts"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_produce_flame_held_light_spends_bonus_action_and_records_light = {
    val result = resolveProduceFlameHeldLight(initialState)
    all {
      assert(result.fighter.activeEffects.contains(ProduceFlameHeldLight({ durationTicks: produceFlameDurationTicks }))),
      assert(not(result.bonusActionAvailable)),
      assert(result.actionAvailable),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
      assert(produceFlameBrightLightRadiusFeet == 20),
      assert(produceFlameDimLightAdditionalFeet == 20),
      assert(battleRuntimeLightEmitters(result).contains(produceFlameHeldLightEmitter(produceFlameDurationTicks))),
    }
  }

  run test_produce_flame_held_light_recast_keeps_one_flame = {
    val once = resolveProduceFlameHeldLight(initialState)
    val nextTurn = { ...once, bonusActionAvailable: true }
    val recast = resolveProduceFlameHeldLight(nextTurn)
    all {
      assert(recast.fighter.activeEffects.contains(ProduceFlameHeldLight({ durationTicks: produceFlameDurationTicks }))),
      assert(recast.fighter.activeEffects.size() == 1),
      assert(battleRuntimeLightEmitters(recast) == Set(produceFlameHeldLightEmitter(produceFlameDurationTicks))),
    }
  }

  run test_produce_flame_held_light_expires_after_duration_tick = {
    val nearlyExpired = {
      ...resolveProduceFlameHeldLight(initialState),
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(ProduceFlameHeldLight({ durationTicks: 1 })),
      },
    }
    val stillSameRound = endTurn(nearlyExpired)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(activeEffectsContainProduceFlameHeldLight(stillSameRound.fighter.activeEffects)),
      assert(not(activeEffectsContainProduceFlameHeldLight(nextRound.fighter.activeEffects))),
      assert(battleRuntimeLightEmitters(stillSameRound).contains(produceFlameHeldLightEmitter(1))),
      assert(not(battleRuntimeLightEmitters(nextRound).contains(produceFlameHeldLightEmitter(1)))),
    }
  }

  run test_dancing_lights_projects_dim_emitters_and_srd_bounds = {
    val cast = resolveDancingLightsSeparateCast(initialState, 3, 60, 20)
    val recast = resolveDancingLightsCombinedCast({ ...cast, actionAvailable: true }, 40)
    val moved = resolveDancingLightsReposition(cast, false, 3, 60, 20, 70)
    val partiallyElapsed = {
      ...cast,
      fighter: {
        ...cast.fighter,
        activeEffects: Set(dancingLightsActiveEffect(false, 3, 1, 2, 3, 4, 37)),
      },
    }
    val movedAfterElapsed = resolveDancingLightsReposition(partiallyElapsed, false, 3, 60, 20, 70)
    val vanished = resolveDancingLightsReposition(cast, false, 3, 60, 20, 121)
    val broken = breakConcentrationSpellEffects(cast, Fighter)
    val nearlyExpired = {
      ...cast,
      fighter: {
        ...cast.fighter,
        activeEffects: Set(dancingLightsActiveEffect(false, 3, 1, 2, 3, 4, 1)),
      },
    }
    val stillSameRound = endTurn(nearlyExpired)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(dancingLightsDimLightRadiusFeet == 10),
      assert(dancingLightsDurationTicks == 600),
      assert(dancingLightsCastPlacementAllowed(1, 120, 99)),
      assert(dancingLightsCastPlacementAllowed(3, 60, 20)),
      assert(not(dancingLightsCastPlacementAllowed(0, 60, 20))),
      assert(not(dancingLightsCastPlacementAllowed(5, 60, 20))),
      assert(not(dancingLightsCastPlacementAllowed(2, 121, 20))),
      assert(not(dancingLightsCastPlacementAllowed(2, 60, 21))),
      assert(dancingLightsRepositionAllowed(60, 20, 2)),
      assert(not(dancingLightsRepositionAllowed(61, 20, 2))),
      assert(dancingLightSurvivesRange(120)),
      assert(not(dancingLightSurvivesRange(121))),
      assert(dancingLightsEmitters(false, 1).size() == 1),
      assert(dancingLightsEmitters(false, 3).size() == 3),
      assert(dancingLightsEmitters(true, 1) == Set(dancingLightsEmitter(1, 1, true))),
      assert(cast.fighter.activeEffects.contains(dancingLightsActiveEffect(false, 3, 1, 2, 3, 4, dancingLightsDurationTicks))),
      assert(cast.fighter.concentrating),
      assert(not(cast.actionAvailable)),
      assert(battleRuntimeLightEmitters(cast) == dancingLightsEmitters(false, 3)),
      assert(recast.fighter.activeEffects == Set(dancingLightsActiveEffect(true, 1, 1, 0, 0, 0, dancingLightsDurationTicks))),
      assert(battleRuntimeLightEmitters(recast) == dancingLightsEmitters(true, 1)),
      assert(moved.fighter.activeEffects.contains(dancingLightsActiveEffect(false, 3, 11, 12, 13, 14, dancingLightsDurationTicks))),
      assert(movedAfterElapsed.fighter.activeEffects.contains(dancingLightsActiveEffect(false, 3, 11, 12, 13, 14, 37))),
      assert(not(moved.bonusActionAvailable)),
      assert(battleRuntimeLightEmitters(moved).contains(dancingLightsEmitter(1, 11, false))),
      assert(not(activeEffectsContainDancingLights(vanished.fighter.activeEffects))),
      assert(battleRuntimeLightEmitters(vanished) == Set()),
      assert(not(activeEffectsContainDancingLights(broken.fighter.activeEffects))),
      assert(battleRuntimeLightEmitters(broken) == Set()),
      assert(activeEffectsContainDancingLights(stillSameRound.fighter.activeEffects)),
      assert(not(activeEffectsContainDancingLights(nextRound.fighter.activeEffects))),
    }
  }

  run test_light_object_records_bright_and_dim_object_emitter = {
    val result = resolveLightObject(initialState, LightObjectTarget, ObjectLarge, ObjectNotWornOrCarriedBySomeoneElse)
    all {
      assert(result.lightEmitters.contains(lightObjectEmitter(LightObjectTarget))),
      assert(not(result.actionAvailable)),
      assert(result.bonusActionAvailable),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
      assert(result.fighter.activeEffects == Set()),
      assert(result.goblin.activeEffects == Set()),
      assert(lightBrightLightRadiusFeet == 20),
      assert(lightDimLightAdditionalFeet == 20),
      assert(lightDurationTicks == 600),
    }
  }

  run test_continual_flame_records_until_dispelled_object_emitter = {
    val result = resolveContinualFlameObject(initialState, LightObjectTarget)
    all {
      assert(result.lightEmitters.contains(continualFlameObjectEmitter(LightObjectTarget))),
      assert(not(result.actionAvailable)),
      assert(result.bonusActionAvailable),
      assert(battleActorHasSpellSlotUse(result, Fighter)),
      assert(result.fighter.activeEffects == Set()),
      assert(result.goblin.activeEffects == Set()),
      assert(continualFlameBrightLightRadiusFeet == 20),
      assert(continualFlameDimLightAdditionalFeet == 20),
    }
  }

  run test_dispel_magic_object_target_ends_tracked_continual_flame = {
    val emitters = Set(continualFlameObjectEmitter(LightObjectTarget))
    val dispelled = dispelMagicObjectTargetLightEmitters(emitters, LightObjectTarget, 3, Set())
    all {
      assert(dispelled == Set()),
      assert(dispelMagicEndsTrackedOngoingSpell(
        3,
        Set(),
        continualFlameSourceEffectId,
        continualFlameSpellLevel,
      )),
    }
  }

  run test_dispel_magic_higher_level_check_gate_for_tracked_light_emitter = {
    val higherSpellLevel = 4
    val higherEmitter =
      spellLightEmitterWithOngoingSpellTracking(
        continualFlameObjectEmitter(LightObjectTarget),
        alternateContinualFlameSourceEffectId,
        higherSpellLevel,
      )
    val emitters = Set(higherEmitter)
    val failedCheckIds =
      dispelMagicSuccessfulAbilityCheckEffectIds(
        alternateContinualFlameSourceEffectId,
        13,
        higherSpellLevel,
      )
    val succeededCheckIds =
      dispelMagicSuccessfulAbilityCheckEffectIds(
        alternateContinualFlameSourceEffectId,
        14,
        higherSpellLevel,
      )
    val failed = dispelMagicObjectTargetLightEmitters(emitters, LightObjectTarget, 3, failedCheckIds)
    val succeeded = dispelMagicObjectTargetLightEmitters(emitters, LightObjectTarget, 3, succeededCheckIds)
    val higherSlot = dispelMagicObjectTargetLightEmitters(emitters, LightObjectTarget, 4, Set())
    all {
      assert(failed == emitters),
      assert(succeeded == Set()),
      assert(higherSlot == Set()),
      assert(failedCheckIds == Set()),
      assert(succeededCheckIds == Set(alternateContinualFlameSourceEffectId)),
      assert(not(dispelMagicEndsTrackedOngoingSpell(
        3,
        failedCheckIds,
        alternateContinualFlameSourceEffectId,
        higherSpellLevel,
      ))),
      assert(dispelMagicEndsTrackedOngoingSpell(
        3,
        succeededCheckIds,
        alternateContinualFlameSourceEffectId,
        higherSpellLevel,
      )),
      assert(dispelMagicEndsTrackedOngoingSpell(
        4,
        Set(),
        alternateContinualFlameSourceEffectId,
        higherSpellLevel,
      )),
      assert(not(dispelMagicCheckSucceeds(13, higherSpellLevel))),
      assert(dispelMagicCheckSucceeds(14, higherSpellLevel)),
    }
  }

  run test_dispel_magic_object_target_resolves_mixed_tracked_spell_levels_per_emitter = {
    val lowEmitter = continualFlameObjectEmitter(LightObjectTarget)
    val higherEmitter =
      spellLightEmitterWithOngoingSpellTracking(
        continualFlameObjectEmitter(LightObjectTarget),
        alternateContinualFlameSourceEffectId,
        4,
      )
    val emitters = Set(lowEmitter, higherEmitter)
    val failedHigher = dispelMagicObjectTargetLightEmitters(emitters, LightObjectTarget, 3, Set())
    val succeededHigher =
      dispelMagicObjectTargetLightEmitters(
        emitters,
        LightObjectTarget,
        3,
        Set(alternateContinualFlameSourceEffectId),
      )
    all {
      assert(failedHigher == Set(higherEmitter)),
      assert(succeededHigher == Set()),
    }
  }

  run test_dispel_magic_magical_effect_target_uses_tracked_source_effect_id = {
    val selectedEmitter = continualFlameObjectEmitter(LightObjectTarget)
    val otherEmitter =
      spellLightEmitterWithOngoingSpellTracking(
        continualFlameObjectEmitter(LightObjectTarget),
        alternateContinualFlameSourceEffectId,
        continualFlameSpellLevel,
      )
    val emitters = Set(selectedEmitter, otherEmitter)
    val selectedDispelled =
      dispelMagicMagicalEffectTargetLightEmitters(
        emitters,
        continualFlameSourceEffectId,
        3,
        Set(),
      )
    val otherDispelled =
      dispelMagicMagicalEffectTargetLightEmitters(
        emitters,
        alternateContinualFlameSourceEffectId,
        3,
        Set(),
      )
    all {
      assert(selectedDispelled == Set(otherEmitter)),
      assert(otherDispelled == Set(selectedEmitter)),
    }
  }

  run test_light_visibility_projection = {
    val lit = resolveLightObject(initialState, LightObjectTarget, ObjectLarge, ObjectNotWornOrCarriedBySomeoneElse)
    val brightFact = ObjectLightEmitterProjectionFact({
      object: LightObjectTarget,
      distanceFeet: 20,
      opaqueCover: false,
    })
    val dimFact = ObjectLightEmitterProjectionFact({
      object: LightObjectTarget,
      distanceFeet: 40,
      opaqueCover: false,
    })
    val coveredFact = ObjectLightEmitterProjectionFact({
      object: LightObjectTarget,
      distanceFeet: 20,
      opaqueCover: true,
    })
    all {
      assert(battleIlluminationFromLightEmitters(lit.lightEmitters, Set(brightFact)) == BrightLightIllumination),
      assert(battleIlluminationFromLightEmitters(lit.lightEmitters, Set(dimFact)) == DimLightIllumination),
      assert(battleIlluminationFromLightEmitters(lit.lightEmitters, Set(coveredFact)) == DarknessIllumination),
      assert(sightObscurement(BrightLightIllumination, OrdinarySight) == UnobscuredSight),
      assert(sightObscurement(DimLightIllumination, OrdinarySight) == LightlyObscuredSight),
      assert(sightObscurement(DarknessIllumination, OrdinarySight) == HeavilyObscuredSight),
      assert(sightObscurement(DimLightIllumination, DarkvisionSight({ rangeFeet: 60, distanceFeet: 60 })) == UnobscuredSight),
      assert(sightObscurement(DarknessIllumination, DarkvisionSight({ rangeFeet: 60, distanceFeet: 60 })) == LightlyObscuredSight),
      assert(sightObscurement(DimLightIllumination, DarkvisionSight({ rangeFeet: 60, distanceFeet: 65 })) == LightlyObscuredSight),
    }
  }

  run test_light_object_rejects_too_large_or_worn_carried_by_someone_else = {
    all {
      assert(resolveLightObject(initialState, LightObjectTarget, ObjectHuge, ObjectNotWornOrCarriedBySomeoneElse) == initialState),
      assert(resolveLightObject(initialState, LightObjectTarget, ObjectMedium, ObjectWornBySomeoneElse) == initialState),
      assert(resolveLightObject(initialState, LightObjectTarget, ObjectMedium, ObjectCarriedBySomeoneElse) == initialState),
      assert(lightObjectTargetAllowed(ObjectTiny, ObjectWornOrCarriedByCaster)),
      assert(not(lightObjectTargetAllowed(ObjectGargantuan, ObjectWornOrCarriedByCaster))),
    }
  }

  run test_light_object_recast_replaces_prior_light_from_same_source = {
    val prior = {
      ...initialState,
      lightEmitters: Set(lightObjectEmitter(PriorLightObjectTarget)),
    }
    val recast = resolveLightObject(prior, LightObjectTarget, ObjectMedium, ObjectWornOrCarriedByCaster)
    all {
      assert(recast.lightEmitters == Set(lightObjectEmitter(LightObjectTarget))),
      assert(not(recast.lightEmitters.contains(lightObjectEmitter(PriorLightObjectTarget)))),
    }
  }

  run test_continual_flame_object_cast_preserves_prior_flames = {
    val prior = {
      ...initialState,
      lightEmitters: Set(continualFlameObjectEmitter(PriorLightObjectTarget)),
    }
    val recast = resolveContinualFlameObject(prior, LightObjectTarget)
    all {
      assert(recast.lightEmitters.contains(continualFlameObjectEmitter(PriorLightObjectTarget))),
      assert(recast.lightEmitters.contains(continualFlameObjectEmitter(LightObjectTarget))),
      assert(recast.lightEmitters.size() == 2),
    }
  }

  run test_light_object_emitter_expires_after_duration_tick = {
    val nearlyExpired = {
      ...initialState,
      lightEmitters: Set(SpellLightEmitter({
        source: Fighter,
        sourceSpell: Light,
        attachment: ObjectLightEmitter({ object: LightObjectTarget }),
        emission: BrightAndDimLightEmission({
          brightRadiusFeet: lightBrightLightRadiusFeet,
          dimAdditionalFeet: lightDimLightAdditionalFeet,
        }),
        opaqueCoverInteraction: LightEmitterBlocksOpaqueCover,
        ongoingSpellTracking: TrackedOngoingSpellLightEmitter({
          sourceEffectId: lightObjectSourceEffectId,
          sourceSpellLevel: lightSpellLevel,
        }),
        expiresAt: DurationLightEmitterExpiration({ durationTicks: 1 }),
      })),
    }
    val stillSameRound = endTurn(nearlyExpired)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(stillSameRound.lightEmitters.size() == 1),
      assert(nextRound.lightEmitters == Set()),
    }
  }

  run test_continual_flame_object_emitter_survives_duration_tick = {
    val ongoing = {
      ...initialState,
      lightEmitters: Set(continualFlameObjectEmitter(LightObjectTarget)),
    }
    val stillSameRound = endTurn(ongoing)
    val nextRound = endTurn(stillSameRound)
    all {
      assert(stillSameRound.lightEmitters == Set(continualFlameObjectEmitter(LightObjectTarget))),
      assert(nextRound.lightEmitters == Set(continualFlameObjectEmitter(LightObjectTarget))),
    }
  }

  run test_produce_flame_hurl_requires_held_light_and_deals_fire_damage = {
    val unlit = resolveProduceFlameHurl(initialState, 15, 10, 5, true)
    val lit = resolveProduceFlameHeldLight(initialState)
    val nextTurn = {
      ...lit,
      actionAvailable: true,
      bonusActionAvailable: true,
      goblin: { ...lit.goblin, reactionAvailable: false },
    }
    val hit = resolveProduceFlameHurl(nextTurn, 15, 10, 5, true)
    all {
      assert(unlit == initialState),
      assert(hit.goblin.hp == 5),
      assert(not(hit.actionAvailable)),
      assert(not(activeEffectsContainProduceFlameHeldLight(hit.fighter.activeEffects))),
      assert(not(battleRuntimeLightEmitters(hit).contains(produceFlameHeldLightEmitter(produceFlameDurationTicks)))),
      assert(spellAttackDamageType(ProduceFlameHurlSpellAttack) == Fire),
      assert(spellAttackDamageActiveEffects(ProduceFlameHurlSpellAttack) == Set()),
    }
  }

  run test_produce_flame_hurl_attack_hit_reaction_window_ends_held_light = {
    val lit = resolveProduceFlameHeldLight(initialState)
    val nextTurn = {
      ...lit,
      actionAvailable: true,
      bonusActionAvailable: true,
    }
    val awaiting = resolveProduceFlameHurl(nextTurn, 15, 10, 5, true)
    all {
      assert(awaiting.interruptStack.length() == 1),
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeProduceFlameHurl,
      })),
      assert(not(activeEffectsContainProduceFlameHeldLight(awaiting.fighter.activeEffects))),
      assert(not(battleRuntimeLightEmitters(awaiting).contains(produceFlameHeldLightEmitter(produceFlameDurationTicks)))),
    }
  }

  run test_produce_flame_hurl_cantrip_damage_dice_scale_by_character_level = {
    all {
      assert(produceFlameHurlDamageDice(1) == 1),
      assert(produceFlameHurlDamageDice(5) == 2),
      assert(produceFlameHurlDamageDice(11) == 3),
      assert(produceFlameHurlDamageDice(17) == 4),
    }
  }

}
