// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-fog-cloud-obscurement spell.invocation-magical-darkness-point-origin

module battleRuntimeObscuringAreaEffectsTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeAntimagicSuppression.* from "./battle-runtime-antimagic-suppression"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeObscuringAreaEffects.* from "./battle-runtime-obscuring-area-effects"
  run test_fog_cloud_records_heavily_obscured_area_and_concentration = {
    val resolved = resolveFogCloud(initialState, fogCloudAreaId, 1)
    all {
      assert(resolved.fighter.activeEffects.contains(FogCloudObscurement({
        areaId: fogCloudAreaId,
        radiusFeet: 20,
        durationTicks: fogCloudDurationTicks,
      }))),
      assert(resolved.fighter.concentrating),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_fog_cloud_slot_scaling_increases_radius_by_twenty_feet = {
    val resolved = resolveFogCloud(initialState, fogCloudAreaId, 3)
    all {
      assert(fogCloudRadiusFeet(1) == 20),
      assert(fogCloudRadiusFeet(3) == 60),
      assert(resolved.fighter.activeEffects.contains(FogCloudObscurement({
        areaId: fogCloudAreaId,
        radiusFeet: 60,
        durationTicks: fogCloudDurationTicks,
      }))),
    }
  }

  run test_fog_cloud_concentration_break_removes_obscurement = {
    val resolved = resolveFogCloud(initialState, fogCloudAreaId, 1)
    val broken = breakConcentrationSpellEffects(resolved, Fighter)
    all {
      assert(not(fogCloudObscurementActive(broken, fogCloudAreaId))),
      assert(not(broken.fighter.concentrating)),
    }
  }

  run test_fog_cloud_strong_wind_dispersal_removes_obscurement = {
    val resolved = resolveFogCloud(initialState, fogCloudAreaId, 1)
    val dispersed = disperseFogCloudByStrongWind(resolved, fogCloudAreaId)
    all {
      assert(not(fogCloudObscurementActive(dispersed, fogCloudAreaId))),
      assert(not(dispersed.fighter.concentrating)),
    }
  }

  run test_darkness_records_magical_darkness_area_and_concentration = {
    val resolved = resolveDarknessPointOrigin(initialState, darknessAreaId, 2)
    all {
      assert(resolved.fighter.activeEffects.contains(MagicalDarknessPointOrigin({
        areaId: darknessAreaId,
        radiusFeet: darknessRadiusFeet,
        durationTicks: darknessDurationTicks,
      }))),
      assert(resolved.fighter.concentrating),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_darkness_rejects_level_one_slot = {
    val resolved = resolveDarknessPointOrigin(initialState, darknessAreaId, 1)
    all {
      assert(not(magicalDarknessPointOriginActive(resolved, darknessAreaId))),
      assert(not(battleActorHasCommittedSpellSlotUse(resolved, Fighter))),
    }
  }

  run test_darkness_projection_blocks_darkvision_and_nonmagical_light = {
    val resolved = resolveDarknessPointOrigin(initialState, darknessAreaId, 2)
    all {
      assert(magicalDarknessPointOriginSightObscurement(resolved, darknessAreaId, OrdinarySight) == HeavilyObscuredSight),
      assert(magicalDarknessPointOriginSightObscurement(resolved, darknessAreaId, DarkvisionSight({ rangeFeet: 60, distanceFeet: 30 })) == HeavilyObscuredSight),
      assert(magicalDarknessPointOriginNonmagicalLightIllumination(resolved, darknessAreaId, BrightLightIllumination) == DarknessIllumination),
    }
  }

  run test_darkness_concentration_break_removes_area = {
    val resolved = resolveDarknessPointOrigin(initialState, darknessAreaId, 2)
    val broken = breakConcentrationSpellEffects(resolved, Fighter)
    all {
      assert(not(magicalDarknessPointOriginActive(broken, darknessAreaId))),
      assert(not(broken.fighter.concentrating)),
    }
  }

  run test_darkness_duration_expiration_removes_area_and_concentration = {
    val expiring = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(MagicalDarknessPointOrigin({
          areaId: darknessAreaId,
          radiusFeet: darknessRadiusFeet,
          durationTicks: 1,
        })),
      },
    }
    val ticked = tickRoundDurationSpellEffects(expiring)
    all {
      assert(not(magicalDarknessPointOriginActive(ticked, darknessAreaId))),
      assert(not(ticked.fighter.concentrating)),
    }
  }

  run test_darkness_dispels_overlapping_level_two_or_lower_spell_created_light = {
    val levelTwo = continualFlameObjectEmitter(LightObjectTarget)
    val levelThree =
      spellLightEmitterWithOngoingSpellTracking(
        continualFlameObjectEmitter(PriorLightObjectTarget),
        alternateContinualFlameSourceEffectId,
        3,
      )
    val emitters = Set(levelTwo, levelThree)
    val resolved =
      darknessAreaDispelledSpellCreatedLightEmitters(
        emitters,
        Set(continualFlameSourceEffectId, alternateContinualFlameSourceEffectId),
        2,
      )
    all {
      assert(resolved == Set(levelThree)),
      assert(darknessAreaDispelledSpellCreatedLightEmitters(
        emitters,
        Set(),
        2,
      ) == emitters),
    }
  }

  run test_antimagic_field_suppresses_tracked_spell_light_without_deleting_it = {
    val initial = {
      ...initialState,
      lightEmitters: Set(continualFlameObjectEmitter(LightObjectTarget)),
    }
    val resolved =
      resolveAntimagicFieldOngoingSpellSuppression(
        initial,
        antimagicFieldAreaId,
        Set(OngoingSpellLightEffectRef({ sourceEffectId: continualFlameSourceEffectId })),
        8,
      )
    val broken = breakConcentrationSpellEffects(resolved, Fighter)
    all {
      assert(antimagicFieldOngoingSpellSuppressionActive(resolved, antimagicFieldAreaId)),
      assert(resolved.lightEmitters == Set(continualFlameObjectEmitter(LightObjectTarget))),
      assert(battleRuntimeLightEmitters(resolved) == Set()),
      assert(battleRuntimeLightEmitters(broken) == Set(continualFlameObjectEmitter(LightObjectTarget))),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_antimagic_field_rejects_below_level_eight_slot = {
    val resolved =
      resolveAntimagicFieldOngoingSpellSuppression(
        initialState,
        antimagicFieldAreaId,
        Set(),
        7,
      )
    all {
      assert(not(antimagicFieldOngoingSpellSuppressionActive(resolved, antimagicFieldAreaId))),
      assert(not(battleActorHasCommittedSpellSlotUse(resolved, Fighter))),
    }
  }

}

