// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-flaming-sphere-hazard-ram spell.invocation-fog-cloud-obscurement spell.invocation-grease-ground-hazard spell.invocation-magical-darkness-point-origin spell.invocation-moonbeam-movable-zone spell.invocation-web-restraint-hazard

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-spike-growth-movement-hazard

module battleRuntimeGroundCommandTests {
  import battleRuntimeFlamingSphereHazardRam.* from "./battle-runtime-flaming-sphere-hazard-ram"
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import hitPointRecovery.* from "../shared-algebras/proofs/rule-core/hit-point-recovery"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeStatBlockBridge.* from "./battle-runtime-stat-block-bridge"
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeFindFamiliar.* from "./battle-runtime-find-familiar"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeCreatureTypeProtection.* from "./battle-runtime-creature-type-protection"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeThaumaturgy.* from "./battle-runtime-thaumaturgy"
  import battleRuntimeBardicInspiration.* from "./battle-runtime-bardic-inspiration"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeSpellAttack.* from "./battle-runtime-spell-attack"
  import battleRuntimeChainedSpellAttack.* from "./battle-runtime-chained-spell-attack"
  import battleRuntimeSaveGatedSpell.* from "./battle-runtime-save-gated-spell"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"
  import battleRuntimeMarkedSpells.* from "./battle-runtime-marked-spells"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeCombatantSide.* from "./battle-runtime-combatant-side"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"
  import battleRuntimeFeatherFall.* from "./battle-runtime-feather-fall"
  import battleRuntimeJumpMovement.* from "./battle-runtime-jump-movement"
  import battleRuntimeAntimagicSuppression.* from "./battle-runtime-antimagic-suppression"
  import battleRuntimeWeaponHitSpellRiders.* from "./battle-runtime-weapon-hit-spell-riders"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeRestorationAndBuffs.* from "./battle-runtime-restoration-and-buffs"
  import battleRuntimeSleepHideousLaughter.* from "./battle-runtime-sleep-hideous-laughter"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeGroundCommand.* from "./battle-runtime-ground-command"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"
  import battleRuntimeShapeShifting.* from "./battle-runtime-shape-shifting"

  run test_grease_records_ground_hazard_and_prones_failed_appearance_save = {
    val resolved = resolveGrease(initialState, true, false)
    all {
      assert(resolved.fighter.activeEffects.contains(greaseGroundHazard(greaseAreaId, noHeightenedSpellTarget))),
      assert(resolved.goblin.prone),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_grease_empty_area_records_hazard_without_target_membership_state = {
    val resolved = resolveGrease(initialState, false, true)
    all {
      assert(resolved.fighter.activeEffects.contains(greaseGroundHazard(greaseAreaId, noHeightenedSpellTarget))),
      assert(not(resolved.goblin.prone)),
    }
  }

  run test_grease_ground_hazard_entry_save_applies_prone = {
    val resolved = resolveGrease(initialState, false, true)
    val entryFailed = resolveGreaseGroundHazardSave(resolved, Goblin, greaseAreaId, false)
    all {
      assert(entryFailed.goblin.prone),
      assert(currentActor(entryFailed) == Fighter),
    }
  }

  run test_heightened_grease_ground_hazard_entry_save_roll_mode_is_selected_target_only = {
    val resolved = resolveGreaseWithHeightenedTarget(initialState, false, true, HeightenedSpellTarget({ target: Goblin }))
    all {
      assert(greaseGroundHazardSaveRollMode(resolved, Goblin, greaseAreaId) == DisadvantageSavingThrow),
      assert(greaseGroundHazardSaveRollMode(resolved, Fighter, greaseAreaId) == NormalSavingThrow),
    }
  }

  run test_grease_difficult_terrain_movement_cost_adds_extra_grease_distance = {
    val resolved = resolveGrease(initialState, false, true)
    val moved = moveFighterThroughGreaseGroundDifficultTerrain(resolved, greaseAreaId, 10, 5, false)
    val expired = { ...resolved, fighter: { ...resolved.fighter, activeEffects: Set() } }
    all {
      assert(areaDifficultTerrainMovementCost(resolved, greaseAreaId, 10, 5) == 15),
      assert(moved.fighter.movementSpent == 15),
      assert(areaDifficultTerrainMovementCost(expired, greaseAreaId, 10, 5) == 0),
    }
  }

  run test_spike_growth_records_hazard_and_spends_spell_slot = {
    val resolved = resolveSpikeGrowth(initialState, spikeGrowthAreaId, 2)
    all {
      assert(resolved.fighter.activeEffects.contains(SpikeGrowthMovementHazard({
        areaId: spikeGrowthAreaId,
        damageDice: 2,
        damagePerFeet: spikeGrowthDamagePerFeet,
        durationTicks: spikeGrowthDurationTicks,
      }))),
      assert(resolved.fighter.concentrating),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_spike_growth_difficult_terrain_movement_cost_adds_extra_distance = {
    val resolved = resolveSpikeGrowth(initialState, spikeGrowthAreaId, 2)
    val moved = moveFighterThroughSpikeGrowthDifficultTerrain(resolved, spikeGrowthAreaId, 10, 5, false)
    val expired = { ...resolved, fighter: { ...resolved.fighter, activeEffects: Set() } }
    all {
      assert(areaDifficultTerrainMovementCost(resolved, spikeGrowthAreaId, 10, 5) == 15),
      assert(moved.fighter.movementSpent == 15),
      assert(areaDifficultTerrainMovementCost(expired, spikeGrowthAreaId, 10, 5) == 0),
    }
  }

  run test_spike_growth_movement_damage_scales_per_five_feet = {
    val resolved = resolveSpikeGrowth(initialState, spikeGrowthAreaId, 2)
    val damaged = resolveSpikeGrowthMovementDamage(resolved, Goblin, spikeGrowthAreaId, 4, 10)
    val unchanged = resolveSpikeGrowthMovementDamage(resolved, Goblin, spikeGrowthAreaId, 4, 0)
    all {
      assert(damaged.goblin.hp == initialState.goblin.hp - 8),
      assert(unchanged.goblin.hp == initialState.goblin.hp),
    }
  }

  run test_spike_growth_concentration_break_removes_hazard = {
    val resolved = resolveSpikeGrowth(initialState, spikeGrowthAreaId, 2)
    val broken = breakConcentrationSpellEffects(resolved, Fighter)
    all {
      assert(not(spikeGrowthMovementHazardActive(broken, spikeGrowthAreaId))),
      assert(not(broken.fighter.concentrating)),
    }
  }

  run test_spike_growth_duration_expiration_removes_hazard_and_concentration = {
    val expiring = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(SpikeGrowthMovementHazard({
          areaId: spikeGrowthAreaId,
          damageDice: 2,
          damagePerFeet: spikeGrowthDamagePerFeet,
          durationTicks: 1,
        })),
      },
    }
    val ticked = tickRoundDurationSpellEffects(expiring)
    all {
      assert(not(spikeGrowthMovementHazardActive(ticked, spikeGrowthAreaId))),
      assert(not(ticked.fighter.concentrating)),
    }
  }

  run test_grease_ground_hazard_end_turn_save_advances_turn = {
    val resolved = resolveGrease(initialState, false, true)
    val goblinTurn = endTurn(resolved)
    val endTurnFailed = endTurnWithGreaseGroundHazardSave(goblinTurn, Goblin, greaseAreaId, false)
    all {
      assert(endTurnFailed.goblin.prone),
      assert(currentActor(endTurnFailed) == Fighter),
    }
  }

  run test_heightened_grease_ground_hazard_end_turn_save_roll_mode_is_selected_target_only = {
    val resolved = resolveGreaseWithHeightenedTarget(initialState, false, true, HeightenedSpellTarget({ target: Goblin }))
    val goblinTurn = endTurn(resolved)
    all {
      assert(greaseGroundHazardSaveRollMode(goblinTurn, Goblin, greaseAreaId) == DisadvantageSavingThrow),
      assert(greaseGroundHazardSaveRollMode(goblinTurn, Fighter, greaseAreaId) == NormalSavingThrow),
    }
  }

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

  run test_flaming_sphere_records_movable_fire_hazard = {
    val resolved = resolveFlamingSphere(initialState, flamingSphereAreaId, 2)
    all {
      assert(resolved.fighter.activeEffects.contains(FlamingSphere({
        areaId: flamingSphereAreaId,
        damageDice: 2,
        durationTicks: flamingSphereDurationTicks,
        ramMaxMoveFeet: flamingSphereRamMaxMoveFeet,
      }))),
      assert(flamingSphereDiameterFeet == 5),
      assert(resolved.fighter.concentrating),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_flaming_sphere_slot_scaling_increases_damage_dice = {
    val resolved = resolveFlamingSphere(initialState, flamingSphereAreaId, 3)
    all {
      assert(flamingSphereDamageDice(2) == 2),
      assert(flamingSphereDamageDice(3) == 3),
      assert(flamingSphereActiveDamageDice(resolved, flamingSphereAreaId) == 3),
    }
  }

  run test_flaming_sphere_end_within_five_feet_save_damages_before_turn_advance = {
    val resolved = resolveFlamingSphere(initialState, flamingSphereAreaId, 2)
    val goblinTurn = endTurn(resolved)
    val endWithinFiveFeetFailed = endTurnWithFlamingSphereEndWithinFiveFeetSave(goblinTurn, Goblin, flamingSphereAreaId, false, 7)
    all {
      assert(endWithinFiveFeetFailed.goblin.hp == 3),
      assert(currentActor(endWithinFiveFeetFailed) == Fighter),
    }
  }

  run test_flaming_sphere_ram_spends_bonus_action_and_halves_success_damage = {
    val resolved = resolveFlamingSphere(initialState, flamingSphereAreaId, 2)
    val rammed = resolveFlamingSphereRam(resolved, Goblin, flamingSphereAreaId, true, 6, 30)
    val tooFar = resolveFlamingSphereRam(resolved, Goblin, flamingSphereAreaId, true, 6, 31)
    all {
      assert(rammed.goblin.hp == 7),
      assert(not(rammed.bonusActionAvailable)),
      assert(tooFar.goblin.hp == initialState.goblin.hp),
      assert(tooFar.bonusActionAvailable),
    }
  }

  run test_flaming_sphere_reposition_spends_bonus_action_without_damage = {
    val resolved = resolveFlamingSphere(initialState, flamingSphereAreaId, 2)
    val moved = resolveFlamingSphereReposition(resolved, flamingSphereAreaId, 30)
    val tooFar = resolveFlamingSphereReposition(resolved, flamingSphereAreaId, 31)
    all {
      assert(moved.goblin.hp == initialState.goblin.hp),
      assert(not(moved.bonusActionAvailable)),
      assert(tooFar.goblin.hp == initialState.goblin.hp),
      assert(tooFar.bonusActionAvailable),
    }
  }

  run test_moonbeam_records_movable_zone_and_concentration = {
    val resolved = resolveMoonbeam(initialState, moonbeamAreaId, 2)
    all {
      assert(resolved.fighter.activeEffects.contains(MoonbeamMovableZone({
        areaId: moonbeamAreaId,
        damageDice: 2,
        durationTicks: moonbeamDurationTicks,
        repositionMaxMoveFeet: moonbeamRepositionMaxMoveFeet,
        savedThisTurn: Set(),
        shapeShiftSuppressed: Set(),
      }))),
      assert(moonbeamRadiusFeet == 5),
      assert(moonbeamHeightFeet == 40),
      assert(resolved.fighter.concentrating),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_moonbeam_slot_scaling_and_save_damage = {
    val resolved = resolveMoonbeam(initialState, moonbeamAreaId, 4)
    val failed = resolveMoonbeamSave(resolved, Goblin, moonbeamAreaId, false, 8)
    val succeeded = resolveMoonbeamSave(resolved, Goblin, moonbeamAreaId, true, 8)
    all {
      assert(moonbeamDamageDice(2) == 2),
      assert(moonbeamDamageDice(4) == 4),
      assert(moonbeamActiveDamageDice(resolved, moonbeamAreaId) == 4),
      assert(failed.goblin.hp == 2),
      assert(succeeded.goblin.hp == 6),
    }
  }

  run test_moonbeam_failed_save_reverts_shape_shift_and_suppresses_until_exit = {
    val resolved = resolveMoonbeam(initialState, moonbeamAreaId, 2)
    val shifted = ClassFeatureShapeShifted({
      source: {
        sourceCombatantId: "synthetic_druid",
        sourceUnitId: "synthetic_shape_feature",
      },
      replacementForm: syntheticLargeFastFormFacts,
    })
    val failed = resolveMoonbeamSaveWithShapeShift(resolved, Goblin, moonbeamAreaId, false, 8, shifted)
    val succeeded = resolveMoonbeamSaveWithShapeShift(resolved, Goblin, moonbeamAreaId, true, 8, shifted)
    val exited = clearMoonbeamShapeShiftSuppressed(failed.state, Goblin, moonbeamAreaId)
    val broken = breakConcentrationSpellEffects(failed.state, Fighter)
    all {
      assert(failed.targetShapeShiftState == TrueForm),
      assert(succeeded.targetShapeShiftState == shifted),
      assert(moonbeamShapeShiftSuppressed(failed.state, Goblin, moonbeamAreaId)),
      assert(not(moonbeamShapeShiftSuppressed(succeeded.state, Goblin, moonbeamAreaId))),
      assert(not(moonbeamShapeShiftSuppressed(exited, Goblin, moonbeamAreaId))),
      assert(not(moonbeamShapeShiftSuppressed(broken, Goblin, moonbeamAreaId))),
    }
  }

  run test_moonbeam_save_limited_once_per_turn_and_resets_on_turn_advance = {
    val resolved = resolveMoonbeam(initialState, moonbeamAreaId, 2)
    val firstSave = resolveMoonbeamSave(resolved, Goblin, moonbeamAreaId, false, 4)
    val duplicateSave = resolveMoonbeamSave(firstSave, Goblin, moonbeamAreaId, false, 4)
    val nextTurn = endTurnWithMoonbeamSave(firstSave, Goblin, moonbeamAreaId, false, 4)
    all {
      assert(firstSave.goblin.hp == 6),
      assert(duplicateSave.goblin.hp == 6),
      assert(not(moonbeamSavedThisTurn(nextTurn, Goblin, moonbeamAreaId))),
      assert(currentActor(nextTurn) == Goblin),
    }
  }

  run test_moonbeam_reposition_spends_magic_action_without_damage = {
    val resolved = resolveMoonbeam(initialState, moonbeamAreaId, 2)
    val casterLaterTurn = endTurn(endTurn(resolved))
    val moved = resolveMoonbeamReposition(casterLaterTurn, moonbeamAreaId, 60)
    val tooFar = resolveMoonbeamReposition(casterLaterTurn, moonbeamAreaId, 61)
    all {
      assert(moved.goblin.hp == initialState.goblin.hp),
      assert(not(moved.actionAvailable)),
      assert(tooFar.goblin.hp == initialState.goblin.hp),
      assert(tooFar.actionAvailable),
    }
  }

  run test_moonbeam_concentration_break_removes_zone = {
    val resolved = resolveMoonbeam(initialState, moonbeamAreaId, 2)
    val broken = breakConcentrationSpellEffects(resolved, Fighter)
    all {
      assert(not(moonbeamActive(broken, moonbeamAreaId))),
      assert(not(broken.fighter.concentrating)),
    }
  }

  run test_web_records_restraint_hazard_and_concentration = {
    val resolved = resolveWeb(initialState, webAreaId, 2)
    all {
      assert(resolved.fighter.activeEffects.contains(WebRestraintHazard({
        areaId: webAreaId,
        sideFeet: webSideFeet,
        durationTicks: webDurationTicks,
        entrySavedThisTurn: Set(),
        startTurnSavedThisTurn: Set(),
      }))),
      assert(resolved.fighter.concentrating),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_web_area_difficult_terrain_movement_cost_uses_active_web_area = {
    val resolved = resolveWeb(initialState, webAreaId, 2)
    val removedArea = removeWebArea(resolved, webAreaId)
    all {
      assert(areaDifficultTerrainMovementCost(resolved, webAreaId, 10, 5) == 15),
      assert(areaDifficultTerrainMovementCost(removedArea, webAreaId, 10, 5) == 0),
    }
  }

  run test_web_area_sight_obscurement_uses_active_web_area = {
    val resolved = resolveWeb(initialState, webAreaId, 2)
    val removedArea = removeWebArea(resolved, webAreaId)
    all {
      assert(webRestraintHazardSightObscurement(resolved, webAreaId) == LightlyObscuredSight),
      assert(webRestraintHazardSightObscurement(removedArea, webAreaId) == UnobscuredSight),
    }
  }

  run test_web_entry_save_restrains_once_per_turn_and_resets_next_turn = {
    val resolved = resolveWeb(initialState, webAreaId, 2)
    val entryFailed = resolveWebRestraintSave(resolved, Goblin, webAreaId, true, false)
    val duplicateEntry = resolveWebRestraintSave(entryFailed, Goblin, webAreaId, true, false)
    val goblinTurn = endTurn(entryFailed)
    all {
      assert(entryFailed.goblin.activeEffects.contains(WebRestrained({ source: Fighter, durationTicks: webDurationTicks }))),
      assert(webEntrySaveAlreadyResolved(entryFailed, Goblin, webAreaId)),
      assert(duplicateEntry.goblin.activeEffects == entryFailed.goblin.activeEffects),
      assert(not(webEntrySaveAlreadyResolved(goblinTurn, Goblin, webAreaId))),
      assert(not(webStartTurnSaveAlreadyResolved(goblinTurn, Goblin, webAreaId))),
    }
  }

  run test_web_start_turn_save_restrains_and_escape_removes_condition = {
    val resolved = resolveWeb(initialState, webAreaId, 2)
    val goblinTurn = endTurn(resolved)
    val startTurnFailed = resolveWebRestraintSave(goblinTurn, Goblin, webAreaId, false, false)
    val duplicateStartTurn = resolveWebRestraintSave(startTurnFailed, Goblin, webAreaId, false, false)
    val escaped = escapeWebRestrained(startTurnFailed, Goblin, true)
    all {
      assert(startTurnFailed.goblin.activeEffects.contains(WebRestrained({ source: Fighter, durationTicks: webDurationTicks }))),
      assert(webStartTurnSaveAlreadyResolved(startTurnFailed, Goblin, webAreaId)),
      assert(duplicateStartTurn.fighter.activeEffects == startTurnFailed.fighter.activeEffects),
      assert(not(escaped.goblin.activeEffects.contains(WebRestrained({ source: Fighter, durationTicks: webDurationTicks })))),
      assert(not(escaped.actionAvailable)),
      assert(webRestraintHazardActive(escaped, webAreaId)),
    }
  }

  run test_web_no_longer_in_area_and_area_removal_cleanup = {
    val resolved = resolveWeb(initialState, webAreaId, 2)
    val restrained = resolveWebRestraintSave(resolved, Goblin, webAreaId, true, false)
    val leftArea = webRestrainedNoLongerInArea(restrained, Goblin, webAreaId)
    val restrainedAgain = resolveWebRestraintSave(resolved, Goblin, webAreaId, false, false)
    val removedArea = removeWebArea(restrainedAgain, webAreaId)
    all {
      assert(not(leftArea.goblin.activeEffects.contains(WebRestrained({ source: Fighter, durationTicks: webDurationTicks })))),
      assert(webRestraintHazardActive(leftArea, webAreaId)),
      assert(not(webRestraintHazardActive(removedArea, webAreaId))),
      assert(not(removedArea.goblin.activeEffects.contains(WebRestrained({ source: Fighter, durationTicks: webDurationTicks })))),
      assert(not(removedArea.fighter.concentrating)),
    }
  }

  run test_web_duration_expiration_clears_hazard_restraint_and_concentration = {
    val expiring = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(WebRestraintHazard({
          areaId: webAreaId,
          sideFeet: webSideFeet,
          durationTicks: 1,
          entrySavedThisTurn: Set(Goblin),
          startTurnSavedThisTurn: Set(Goblin),
        })),
      },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(WebRestrained({ source: Fighter, durationTicks: 1 })),
      },
    }
    val ticked = tickRoundDurationSpellEffects(expiring)
    all {
      assert(not(webRestraintHazardActive(ticked, webAreaId))),
      assert(not(ticked.goblin.activeEffects.contains(WebRestrained({ source: Fighter, durationTicks: 1 })))),
      assert(not(ticked.fighter.concentrating)),
    }
  }

  run test_command_grovel_records_next_turn_pending_effect_on_failed_save = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandGrovelOption)
    all {
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandGrovelOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      }))),
      assert(not(resolved.goblin.prone)),
    }
  }

  run test_command_grovel_target_turn_applies_prone_and_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandGrovelOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandGrovel(goblinTurn)
    all {
      assert(followed.goblin.prone),
      assert(currentActor(followed) == Fighter),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandGrovelOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_halt_target_turn_suppresses_action_bonus_action_and_movement = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandHaltOption)
    val goblinTurn = endTurn(resolved)
    val halted = followCommandHalt(goblinTurn)
    val ended = endCommandHaltTurn(halted)
    all {
      assert(resolved.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandHaltOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      }))),
      assert(not(halted.actionAvailable)),
      assert(not(halted.bonusActionAvailable)),
      assert(halted.goblin.movementSpent == halted.goblin.speed),
      assert(not(ended.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandHaltOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_drop_target_turn_emits_held_object_outcomes_and_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandDropOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandDrop(goblinTurn, 2)
    all {
      assert(commandDropOutcomeCount(goblinTurn, 2) == 2),
      assert(currentActor(followed) == Fighter),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandDropOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_drop_known_empty_held_objects_still_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandDropOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandDrop(goblinTurn, 0)
    all {
      assert(commandDropOutcomeCount(goblinTurn, 0) == 0),
      assert(currentActor(followed) == Fighter),
    }
  }

  run test_command_approach_spends_supplied_movement_and_continues_when_not_within_five_feet = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandApproachOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandApproach(goblinTurn, WalkSpeedKind, 10, false)
    all {
      assert(currentActor(followed) == Goblin),
      assert(followed.goblin.movementSpent == 10),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandApproachOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_approach_ends_turn_when_supplied_proximity_reached = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandApproachOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandApproach(goblinTurn, WalkSpeedKind, 10, true)
    all {
      assert(currentActor(followed) == Fighter),
      assert(followed.goblin.movementSpent == 10),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandApproachOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_approach_no_movement_clears_pending_and_continues_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandApproachOption)
    val goblinTurn = endTurn(resolved)
    val immobile = { ...goblinTurn, goblin: { ...goblinTurn.goblin, speed: 0 } }
    val followed = followCommandApproach(immobile, WalkSpeedKind, 10, false)
    all {
      assert(currentActor(followed) == Goblin),
      assert(followed.goblin.movementSpent == 0),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandApproachOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_flee_spends_full_supplied_movement_and_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandFleeOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandFlee(goblinTurn, WalkSpeedKind, 30, false)
    all {
      assert(currentActor(followed) == Fighter),
      assert(followed.goblin.movementSpent == 30),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandFleeOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_flee_rejects_partial_movement_budget = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandFleeOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandFlee(goblinTurn, WalkSpeedKind, 10, false)
    all {
      assert(currentActor(followed) == Goblin),
      assert(followed.goblin.movementSpent == 0),
      assert(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandFleeOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      }))),
    }
  }

  run test_command_flee_no_movement_clears_pending_and_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandFleeOption)
    val goblinTurn = endTurn(resolved)
    val immobile = { ...goblinTurn, goblin: { ...goblinTurn.goblin, speed: 0 } }
    val followed = followCommandFlee(immobile, WalkSpeedKind, 30, false)
    all {
      assert(currentActor(followed) == Fighter),
      assert(followed.goblin.movementSpent == 0),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandFleeOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_flee_movement_threat_opens_opportunity_attack_window = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandFleeOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandFlee(goblinTurn, WalkSpeedKind, 30, true)
    all {
      assert(currentActor(followed) == Goblin),
      assert(followed.interruptStack.length() == 1),
      assert(pendingReactionFrame(followed.interruptStack[0]) == HasPendingReactionFrame({
        trigger: OpportunityAttack,
        procedure: OpportunityAttackReactionProcedure,
        eligibleReactors: Set(Fighter),
        offeredReactors: Set(),
        continuation: ResumeCommandFleeMovement({
          speedKind: WalkSpeedKind,
          movementCost: 30,
        }),
      })),
    }
  }

  run test_direct_hit_point_restoration_spends_action_cost_slot_and_heals = {
    val wounded = { ...initialState, fighter: { ...initialState.fighter, hp: 4 } }
    val cure = resolveDirectHitPointRestoration(wounded, CureWoundsRestoration, 1, 7, 3)
    val massWord = resolveDirectHitPointRestoration(wounded, MassHealingWordRestoration, 6, 7, 3)
    all {
      assert(cure.fighter.hp == 12),
      assert(not(cure.actionAvailable)),
      assert(cure.bonusActionAvailable),
      assert(battleActorHasCommittedSpellSlotUse(cure, Fighter)),
      assert(massWord.fighter.hp == 12),
      assert(massWord.actionAvailable),
      assert(not(massWord.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(massWord, Fighter)),
    }
  }

  run test_direct_hit_point_restoration_rejects_second_slot_spell_in_same_turn = {
    val wounded = commitActorSpellSlotUse({ ...initialState, fighter: { ...initialState.fighter, hp: 4 } }, Fighter)
    assert(resolveDirectHitPointRestoration(wounded, CureWoundsRestoration, 1, 7, 3) == wounded)
  }

  run test_mass_healing_word_rejects_adjacent_invalid_target_counts = {
    val wounded = { ...initialState, fighter: { ...initialState.fighter, hp: 4 } }
    all {
      assert(resolveDirectHitPointRestoration(wounded, MassHealingWordRestoration, 0, 7, 3) == wounded),
      assert(resolveDirectHitPointRestoration(wounded, MassHealingWordRestoration, 7, 7, 3) == wounded),
    }
  }

  run test_spell_act_discovery_respects_spellcasting_gate = {
    all {
      assert(canDiscoverSpellActs(true, false)),
      assert(not(canDiscoverSpellActs(false, false))),
      assert(not(canDiscoverSpellActs(true, true))),
    }
  }

}
