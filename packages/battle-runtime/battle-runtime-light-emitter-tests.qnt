// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-object-light

module battleRuntimeLightEmitterTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeLightEmitters.* from "./battle-runtime-light-emitters"
  import battleRuntimeLightSpellLifecycle.* from "./battle-runtime-light-spell-lifecycle"
  import battleRuntimeOngoingSpellDispel.* from "./battle-runtime-ongoing-spell-dispel"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

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

}
