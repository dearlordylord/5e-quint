// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-dancing-lights-movable-dim-light spell.invocation-held-light-emitter spell.invocation-object-light spell.invocation-sanctuary-targeting-interdiction spell.invocation-spell-created-held-object spell.reaction-hellish-rebuke

module battleRuntimeLightConcentrationMovementReactionTests {
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
  // Continuation-kind variants (e.g. BattleRuntimeMovementContinuation) live in
  // this leaf; used directly in the module body below, so import it directly —
  // Quint `.*` imports are not re-exported transitively through battleRuntime.
  import battleRuntimeReactionKinds.* from "./battle-runtime-reaction-kinds"
  import battleRuntimeFindFamiliar.* from "./battle-runtime-find-familiar"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeOngoingSpellDispel.* from "./battle-runtime-ongoing-spell-dispel"
  import battleRuntimeCreatureTypeProtection.* from "./battle-runtime-creature-type-protection"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeThaumaturgy.* from "./battle-runtime-thaumaturgy"
  import battleRuntimeBardicInspiration.* from "./battle-runtime-bardic-inspiration"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeReactionResolution.* from "./battle-runtime-reaction-resolution"
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
  import battleRuntimeConditionSpellResolution.* from "./battle-runtime-condition-spell-resolution"
  import battleRuntimeFeatherFall.* from "./battle-runtime-feather-fall"
  import battleRuntimeJumpMovement.* from "./battle-runtime-jump-movement"
  import battleRuntimeWeaponHitSpellRiders.* from "./battle-runtime-weapon-hit-spell-riders"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeProneMovement.* from "./battle-runtime-prone-movement"
  import battleRuntimeRestorationAndBuffs.* from "./battle-runtime-restoration-and-buffs"
  import battleRuntimeSleepHideousLaughter.* from "./battle-runtime-sleep-hideous-laughter"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeGroundCommand.* from "./battle-runtime-ground-command"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"

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

  run test_flame_blade_creation_spends_slot_bonus_action_and_projects_held_light = {
    val noFreeHandState = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        leftHandUse: HShield,
        rightHandUse: HMainWeapon,
      },
    }
    val noFreeHand = resolveFlameBlade(noFreeHandState, 2, 3)
    val tooLow = resolveFlameBlade(initialState, 1, 3)
    val result = resolveFlameBlade(initialState, 2, 3)
    all {
      assert(noFreeHand == noFreeHandState),
      assert(tooLow == initialState),
      assert(not(result.bonusActionAvailable)),
      assert(result.actionAvailable),
      assert(result.fighter.concentrating),
      assert(result.fighter.leftHandUse == HSpellCreatedHeldObject),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.activeEffects.contains(flameBladeActiveEffect(2, 3, FlameBladeHeldObject))),
      assert(flameBladeBrightLightRadiusFeet == 10),
      assert(flameBladeDimLightAdditionalFeet == 10),
      assert(flameBladeDamageDice(2) == 3),
      assert(flameBladeDamageDice(5) == 6),
      assert(flameBladeDamage(6, 3) == 9),
      assert(battleRuntimeLightEmitters(result).contains(flameBladeHeldLightEmitter)),
      assert(spellInvocationSpendsSpellSlot(FlameBlade)),
    }
  }

  run test_flame_blade_attack_uses_magic_action_without_second_slot_or_cleanup = {
    val blade = resolveFlameBlade(initialState, 2, 3)
    val nextTurn = {
      ...endTurn(endTurn(blade)),
      goblin: { ...blade.goblin, reactionAvailable: false },
    }
    val unheld = releaseFlameBlade(nextTurn)
    val blocked = resolveFlameBladeAttack(unheld, 15, 10, 6, true)
    val hit = resolveFlameBladeAttack(nextTurn, 15, 10, 6, true)
    all {
      assert(blocked == unheld),
      assert(hit.goblin.hp == 1),
      assert(not(hit.actionAvailable)),
      assert(not(battleActorHasSpellSlotUse(hit, Fighter))),
      assert(activeEffectsContainHeldFlameBlade(hit.fighter.activeEffects)),
      assert(battleRuntimeLightEmitters(hit).contains(flameBladeHeldLightEmitter)),
    }
  }

  run test_flame_blade_release_and_re_evoke_use_same_occurrence_without_slot = {
    val blade = resolveFlameBlade(initialState, 3, 3)
    val released = releaseFlameBlade(blade)
    val nextTurn = endTurn(endTurn(released))
    val noFreeHandState = {
      ...nextTurn,
      fighter: {
        ...nextTurn.fighter,
        leftHandUse: HShield,
        rightHandUse: HMainWeapon,
      },
    }
    val blocked = reEvokeFlameBlade(noFreeHandState)
    val reEvoked = reEvokeFlameBlade(nextTurn)
    all {
      assert(activeEffectsContainReleasedFlameBlade(released.fighter.activeEffects)),
      assert(released.fighter.leftHandUse == HFree),
      assert(not(battleRuntimeLightEmitters(released).contains(flameBladeHeldLightEmitter))),
      assert(blocked == noFreeHandState),
      assert(activeEffectsContainHeldFlameBlade(reEvoked.fighter.activeEffects)),
      assert(reEvoked.fighter.leftHandUse == HSpellCreatedHeldObject),
      assert(not(reEvoked.bonusActionAvailable)),
      assert(not(battleActorHasSpellSlotUse(reEvoked, Fighter))),
      assert(battleRuntimeLightEmitters(reEvoked).contains(flameBladeHeldLightEmitter)),
    }
  }

  run test_flame_blade_concentration_and_duration_cleanup_remove_blade = {
    val blade = resolveFlameBlade(initialState, 2, 3)
    val broken = breakConcentrationSpellEffects(blade, Fighter)
    val nearlyExpired = {
      ...blade,
      fighter: {
        ...blade.fighter,
        activeEffects: Set(FlameBladeEffect({
          durationTicks: 1,
          slotLevel: 2,
          spellcastingAbilityModifier: 3,
          objectState: FlameBladeHeldObject,
        })),
      },
    }
    val nextRound = endTurn(endTurn(nearlyExpired))
    all {
      assert(not(activeEffectsContainHeldFlameBlade(broken.fighter.activeEffects))),
      assert(broken.fighter.leftHandUse == HFree),
      assert(not(battleRuntimeLightEmitters(broken).contains(flameBladeHeldLightEmitter))),
      assert(not(activeEffectsContainHeldFlameBlade(nextRound.fighter.activeEffects))),
      assert(nextRound.fighter.leftHandUse == HFree),
      assert(not(nextRound.fighter.concentrating)),
      assert(not(battleRuntimeLightEmitters(nextRound).contains(flameBladeHeldLightEmitter))),
    }
  }

  run test_flame_blade_attack_hit_reaction_window_keeps_held_blade = {
    val blade = resolveFlameBlade(initialState, 2, 3)
    val nextTurn = endTurn(endTurn(blade))
    val awaiting = resolveFlameBladeAttack(nextTurn, 15, 10, 6, true)
    all {
      assert(awaiting.interruptStack.length() == 1),
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeFlameBladeAttack,
      })),
      assert(activeEffectsContainHeldFlameBlade(awaiting.fighter.activeEffects)),
      assert(battleRuntimeLightEmitters(awaiting).contains(flameBladeHeldLightEmitter)),
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

  run test_scalar_buff_shield_of_faith_ends_when_caster_concentration_breaks = {
    val concentrating = {
      ...endTurn(initialState),
      fighter: { ...initialState.fighter, concentrating: true },
      goblin: { ...initialState.goblin, activeEffects: Set(ShieldOfFaithArmorClassBonus) },
    }
    val result = resolveGoblinAttack(concentrating, 20, 18, 5, false)
    all {
      assert(not(result.fighter.concentrating)),
      assert(not(result.goblin.activeEffects.contains(ShieldOfFaithArmorClassBonus))),
    }
  }

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

  run test_attack_action_can_break_target_concentration = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val result = resolveAttack(concentratingGoblin, 15, 10, fighterWeaponAttackDamageRoll(4), false)
    all {
      assert(result.goblin.hp == 3),
      assert(not(result.goblin.concentrating)),
      assert(result.goblin.activeEffects == Set()),
    }
  }

  run test_goblin_attack_action_can_break_target_concentration = {
    val concentratingFighter = { ...endTurn(initialState), fighter: { ...initialState.fighter, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val result = resolveGoblinAttack(concentratingFighter, 20, 18, 5, false)
    all {
      assert(result.fighter.hp == 5),
      assert(not(result.fighter.concentrating)),
      assert(result.fighter.activeEffects == Set()),
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

  run test_movement_spends_budget = {
    val moved = moveFighter(initialState, 10, 4 > 5)
    all {
      assert(moved.fighter.movementSpent == 10),
      assert(movementRemaining(moved.fighter) == 20),
    }
  }

  run test_roving_speed_kind_movement_and_dash_use_chosen_speed = {
    val roving = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        speed: 40,
        hasRovingSpeedKindGrants: true,
      },
    }
    val climbed = moveFighterWithSpeedKind(roving, ClimbSpeedKind, 15, false)
    val swam = moveFighterWithSpeedKind(climbed, SwimSpeedKind, 25, false)
    val dashed = dashFighterWithSpeedKind(roving, SwimSpeedKind)
    val unsupportedClimb = moveFighterWithSpeedKind(initialState, ClimbSpeedKind, 1, false)
    all {
      assert(movementSpeed(roving.fighter, ClimbSpeedKind) == 40),
      assert(climbed.fighter.movementSpent == 15),
      assert(movementRemainingForFighterWithSpeedKind(climbed, SwimSpeedKind) == 25),
      assert(swam.fighter.movementSpent == 40),
      assert(dashed.dashMovementBonus == 40),
      assert(unsupportedClimb == initialState),
    }
  }

  run test_generic_combat_actions_update_turn_state = {
    val dashed = dashFighter(initialState)
    val disengaged = disengageFighter(initialState)
    val dodged = dodgeFighter(initialState)
    val readied = readyFighter(initialState)
    val helped = helpFighterAttack(initialState)
    all {
      assert(not(dashed.actionAvailable)),
      assert(dashed.dashMovementBonus == 30),
      assert(movementRemainingForFighter(dashed) == 60),
      assert(disengaged.disengaged),
      assert(dodged.fighter.dodging),
      assert(readied.fighter.readiedMovementHeld),
      assert(helped.fighterHelpAttackGoblinForGoblin),
    }
  }

  run test_adrenaline_rush_bonus_action_dash_grants_temporary_hit_points_and_spends_use = {
    val result = bonusActionDashTemporaryHitPointsFighter(
      { ...initialState, fighter: { ...initialState.fighter, tempHp: 1 } },
      3,
      3,
      WalkSpeedKind
    )
    val higherExisting = bonusActionDashTemporaryHitPointsFighter(
      { ...initialState, fighter: { ...initialState.fighter, tempHp: 5 } },
      3,
      3,
      WalkSpeedKind
    )
    val noUses = bonusActionDashTemporaryHitPointsFighter(initialState, 0, 3, WalkSpeedKind)
    all {
      assert(not(result.state.bonusActionAvailable)),
      assert(result.state.dashMovementBonus == 30),
      assert(result.state.fighter.tempHp == 3),
      assert(result.usesRemaining == 2),
      assert(higherExisting.state.fighter.tempHp == 5),
      assert(noUses.state == initialState),
      assert(noUses.usesRemaining == 0),
    }
  }

  run test_stand_from_prone_spends_half_speed_movement = {
    val prone = { ...initialState, fighter: { ...initialState.fighter, prone: true } }
    val stood = standFighterFromProneUnlessHideousLaughter(prone)
    all {
      assert(stood.fighter.movementSpent == 15),
      assert(not(stood.fighter.prone)),
      assert(movementRemainingForFighter(stood) == 15),
    }
  }

  run test_disengage_suppresses_opportunity_attack_window = {
    val disengaged = disengageFighter({ ...initialState, actionAvailable: true })
    val moved = moveFighter(disengaged, 5, 10 > 5)
    all {
      assert(moved.interruptStack == []),
      assert(moved.fighter.movementSpent == 5),
    }
  }

  run test_movement_over_budget_is_rejected = {
    assert(moveFighter(initialState, 35, 40 > 5) == initialState)
  }

  run test_grapple_release_and_escape_update_link_state = {
    val grappled = grappleFighterGoblin(initialState, 12)
    val released = releaseFighterGrapple(grappled)
    val escaped = escapeFighterGrapple(endTurn(grappled), 13)
    all {
      assert(fighterGoblinGrappleExists(grappled)),
      assert(grappled.fighter.leftHandUse == HGrapple),
      assert(not(fighterGoblinGrappleExists(released))),
      assert(not(fighterGoblinGrappleExists(escaped))),
    }
  }

  run test_off_hand_requires_prior_light_attack_and_spends_bonus_action = {
    val rejected = offHandAttackFighter(initialState, 15, 10, 4)
    val afterAttack = resolveAttack(initialState, 1, 1, fighterWeaponAttackDamageRoll(4), false)
    val offHand = offHandAttackFighter(afterAttack, 15, 10, 4)
    all {
      assert(rejected == initialState),
      assert(afterAttack.lightWeaponAttackMade),
      assert(not(offHand.bonusActionAvailable)),
      assert(offHand.goblin.hp == 6),
    }
  }

  run test_grappled_attack_disadvantage_excludes_the_grappler = {
    val grappled = endTurn(grappleFighterGoblin(initialState, 12))
    all {
      assert(not(goblinAttackRequiresDisadvantage(grappled, true))),
      assert(goblinAttackRequiresDisadvantage(grappled, false)),
    }
  }

  run test_grapple_drag_cost_is_table_supplied = {
    val grappled = grappleFighterGoblin(initialState, 12)
    val oneFootCost = moveFighter(grappled, 1, false)
    val tenFootCost = moveFighter(grappled, 10, false)
    all {
      assert(oneFootCost.fighter.movementSpent == 1),
      assert(tenFootCost.fighter.movementSpent == 10),
    }
  }

  run test_movement_leaving_reach_opens_opportunity_attack_window_before_position_commit = {
    val awaiting = moveFighter(initialState, 5, 10 > 5)
    all {
      assert(awaiting.fighter.movementSpent == 0),
      assert(awaiting.interruptStack.length() == 1),
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: OpportunityAttack,
        procedure: OpportunityAttackReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeMovement({ speedKind: WalkSpeedKind, movementCost: 5 }),
      })),
    }
  }

  run test_reaction_continuations_have_battle_runtime_contract_kinds = {
    all {
      assert(reactionContinuationKind(ResumeAttack({ damage: 7 })) == BattleRuntimeAttackDamageContinuation),
      assert(reactionContinuationKind(ResumeRayOfFrost) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumePoisonSpray) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeChillTouch) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeTrueStrikeWeaponAttack) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeProduceFlameHurl) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeFlameBladeAttack) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeIceKnife) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeSaveGateDamage) == BattleRuntimeSaveGateContinuation),
      assert(reactionContinuationKind(ResumeAfterDamage) == BattleRuntimeAfterDamageContinuation),
      assert(reactionContinuationKind(ResumeHellishRebukeAfterDamage({ damager: Goblin, damaged: Fighter, slotLevel: 1 })) == BattleRuntimeAfterDamageContinuation),
      assert(reactionContinuationKind(ResumeMovement({ speedKind: WalkSpeedKind, movementCost: 5 })) == BattleRuntimeMovementContinuation),
      assert(reactionContinuationKind(ResumeDissonantWhispersMovementThenAfterDamage({ speedKind: WalkSpeedKind, movementCost: 5 })) == BattleRuntimeMovementContinuation),
    }
  }

  run test_hellish_rebuke_after_damage_reaction_opens_srd_window_with_continuation_facts = {
    val awaiting = openHellishRebukeAfterDamageReactionWindow(
      initialState,
      Goblin,
      Fighter,
      HellishRebukeDamageFromVisibleCreatureWithin60Feet,
      true,
      1,
    )
    all {
      assert(awaiting.interruptStack.length() == 1),
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AfterDamage,
        procedure: DamageInterruptionReactionProcedure,
        eligibleReactors: Set(Fighter),
        offeredReactors: Set(),
        continuation: ResumeHellishRebukeAfterDamage({
          damager: Goblin,
          damaged: Fighter,
          slotLevel: 1,
        }),
      })),
    }
  }

  run test_hellish_rebuke_after_damage_reaction_requires_srd_trigger_and_availability_facts = {
    val noReaction = {
      ...initialState,
      fighter: { ...initialState.fighter, reactionAvailable: false },
    }
    val noSlot = commitActorSpellSlotUse(initialState, Fighter)
    val goblinTurnSpentSlot = commitActorSpellSlotUse(endTurn(initialState), Goblin)
    val offTurnWindow = openHellishRebukeAfterDamageReactionWindow(
      goblinTurnSpentSlot,
      Goblin,
      Fighter,
      HellishRebukeDamageFromVisibleCreatureWithin60Feet,
      true,
      1,
    )
    val available = {
      hellishRebukeAvailable: true,
      reactionAvailable: true,
      spellSlotAvailable: true,
    }
    all {
      assert(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageFromVisibleCreatureWithin60Feet, available)),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeNoDamageTaken, available))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageNotFromCreature, available))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamagerNotVisible, available))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamagerOutside60Feet, available))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageFromVisibleCreatureWithin60Feet, { ...available, hellishRebukeAvailable: false }))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageFromVisibleCreatureWithin60Feet, { ...available, reactionAvailable: false }))),
      assert(not(hellishRebukeAfterDamageReactionEligible(HellishRebukeDamageFromVisibleCreatureWithin60Feet, { ...available, spellSlotAvailable: false }))),
      assert(openHellishRebukeAfterDamageReactionWindow(initialState, Goblin, Fighter, HellishRebukeNoDamageTaken, true, 1) == initialState),
      assert(openHellishRebukeAfterDamageReactionWindow(noReaction, Goblin, Fighter, HellishRebukeDamageFromVisibleCreatureWithin60Feet, true, 1) == noReaction),
      assert(openHellishRebukeAfterDamageReactionWindow(noSlot, Goblin, Fighter, HellishRebukeDamageFromVisibleCreatureWithin60Feet, true, 1) == noSlot),
      assert(openHellishRebukeAfterDamageReactionWindow(initialState, Goblin, Fighter, HellishRebukeDamageFromVisibleCreatureWithin60Feet, false, 1) == initialState),
      assert(offTurnWindow.interruptStack.length() == 1),
    }
  }

  run test_hellish_rebuke_after_damage_reaction_resolves_save_damage_and_spend = {
    val continuation = { damager: Goblin, damaged: Fighter, slotLevel: 2 }
    val failedSave = resolveHellishRebukeAfterDamage(initialState, continuation, false, 3, true)
    val successfulSave = resolveHellishRebukeAfterDamage(initialState, continuation, true, 5, true)
    val goblinTurnSpentSlot = commitActorSpellSlotUse(endTurn(initialState), Goblin)
    val offTurnResolved = resolveHellishRebukeAfterDamage(goblinTurnSpentSlot, continuation, false, 3, true)
    all {
      assert(hellishRebukeDamageDice(1) == 2),
      assert(hellishRebukeDamageDice(2) == 3),
      assert(failedSave.goblin.hp == 7),
      assert(failedSave.fighter.reactionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(failedSave, Fighter)),
      assert(successfulSave.goblin.hp == 8),
      assert(successfulSave.fighter.reactionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(successfulSave, Fighter)),
      assert(battleActorHasCommittedSpellSlotUse(offTurnResolved, Goblin)),
      assert(battleActorHasCommittedSpellSlotUse(offTurnResolved, Fighter)),
    }
  }

  run test_hellish_rebuke_after_damage_reaction_rejects_invalid_continuation = {
    val noReaction = {
      ...initialState,
      fighter: { ...initialState.fighter, reactionAvailable: false },
    }
    val noSlot = commitActorSpellSlotUse(initialState, Fighter)
    val continuation = { damager: Goblin, damaged: Fighter, slotLevel: 1 }
    all {
      assert(resolveHellishRebukeAfterDamage(noReaction, continuation, false, 3, true) == noReaction),
      assert(resolveHellishRebukeAfterDamage(noSlot, continuation, false, 3, true) == noSlot),
      assert(resolveHellishRebukeAfterDamage(initialState, { damager: Fighter, damaged: Fighter, slotLevel: 1 }, false, 3, true) == initialState),
      assert(resolveHellishRebukeAfterDamage(initialState, { damager: Goblin, damaged: Fighter, slotLevel: 0 }, false, 3, true) == initialState),
    }
  }

  run test_dissonant_whispers_forced_reaction_requires_movement_fill_when_available = {
    assert(
      resolveDissonantWhispersGoblinForcedReactionMovement(initialState, DissonantWhispersMovementMissing)
        == DissonantWhispersNeedsMovementFill
    )
  }

  run test_dissonant_whispers_forced_reaction_no_reaction_opens_after_damage = {
    val noReaction = {
      ...initialState,
      goblin: { ...initialState.goblin, reactionAvailable: false },
    }
    match resolveDissonantWhispersGoblinForcedReactionMovement(noReaction, DissonantWhispersMovementMissing) {
      | DissonantWhispersResolvedAfterDamage(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.interruptStack.length() == 1),
            assert(pendingReactionFrame(result.interruptStack[0]) == HasPendingReactionFrame({
              trigger: AfterDamage,
              procedure: DamageInterruptionReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeAfterDamage,
            })),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_forced_reaction_no_movement_spends_reaction_and_opens_after_damage = {
    val grappled = grappleFighterGoblin(initialState, 12)
    match resolveDissonantWhispersGoblinForcedReactionMovement(grappled, DissonantWhispersMovementMissing) {
      | DissonantWhispersResolvedAfterDamage(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.interruptStack.length() == 1),
            assert(pendingReactionFrame(result.interruptStack[0]) == HasPendingReactionFrame({
              trigger: AfterDamage,
              procedure: DamageInterruptionReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeAfterDamage,
            })),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_forced_reaction_rejects_movement_when_unavailable = {
    val grappled = grappleFighterGoblin(initialState, 12)
    assert(
      resolveDissonantWhispersGoblinForcedReactionMovement(
        grappled,
        DissonantWhispersMovementFilled({
          speedKind: WalkSpeedKind,
          movementCost: 5,
          provokesOpportunityAttack: false,
        })
      ) == DissonantWhispersInvalidMovementFill
    )
  }

  run test_dissonant_whispers_forced_reaction_movement_without_threat_spends_reaction_then_after_damage = {
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      initialState,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: false,
      })
    ) {
      | DissonantWhispersResolvedAfterDamage(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.goblin.movementSpent == 0),
            assert(result.interruptStack.length() == 1),
            assert(pendingReactionFrame(result.interruptStack[0]) == HasPendingReactionFrame({
              trigger: AfterDamage,
              procedure: DamageInterruptionReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeAfterDamage,
            })),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_forced_reaction_movement_with_threat_opens_opportunity_attack_first = {
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      initialState,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: true,
      })
    ) {
      | DissonantWhispersOpportunityAttackWindow(result) =>
          all {
            assert(not(result.goblin.reactionAvailable)),
            assert(result.interruptStack.length() == 1),
            assert(pendingReactionFrame(result.interruptStack[0]) == HasPendingReactionFrame({
              trigger: OpportunityAttack,
              procedure: OpportunityAttackReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeDissonantWhispersMovementThenAfterDamage({
                speedKind: WalkSpeedKind,
                movementCost: 10,
              }),
            })),
          }
      | _ => assert(false)
    }
  }

  run test_dissonant_whispers_declined_opportunity_attack_resumes_after_damage_sequence = {
    match resolveDissonantWhispersGoblinForcedReactionMovement(
      initialState,
      DissonantWhispersMovementFilled({
        speedKind: WalkSpeedKind,
        movementCost: 10,
        provokesOpportunityAttack: true,
      })
    ) {
      | DissonantWhispersOpportunityAttackWindow(awaiting) => {
          val resumed = declineReactionOfferAndResume(awaiting, Fighter)
          all {
            assert(resumed.fighter.reactionAvailable),
            assert(not(resumed.goblin.reactionAvailable)),
            assert(resumed.interruptStack.length() == 1),
            assert(pendingReactionFrame(resumed.interruptStack[0]) == HasPendingReactionFrame({
              trigger: AfterDamage,
              procedure: DamageInterruptionReactionProcedure,
              eligibleReactors: Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeAfterDamage,
            })),
          }
        }
      | _ => assert(false)
    }
  }

  run test_reaction_decision_contract_rejects_unavailable_reaction = {
    val awaiting = moveFighter({ ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }, 5, 10 > 5)
    all {
      assert(resolveReactionOffer(awaiting, Goblin) == awaiting),
      assert(declineReactionOfferAndResume(awaiting, Goblin).fighter.movementSpent == 5),
    }
  }

  run test_after_damage_reaction_resolves_through_damage_interruption_contract = {
    val awaitingReaction = openReactionWindow(initialState, {
      trigger: AfterDamage,
      procedure: DamageInterruptionReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeAfterDamage,
    })
    val resolved = resolveReactionOffer(awaitingReaction, Fighter)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.fighter.reactionAvailable)),
    }
  }

  run test_declined_opportunity_attack_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, 10 > 5)
    val resumed = declineReactionOfferAndResume(awaiting, Goblin)
    all {
      assert(resumed.interruptStack == []),
      assert(resumed.fighter.movementSpent == 5),
      assert(resumed.goblin.reactionAvailable),
    }
  }

  run test_resolved_opportunity_attack_spends_reaction_damages_then_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, 10 > 5)
    val resolved = resolveReactionOffer(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.reactionAvailable == false),
      assert(resolved.fighter.hp == 6),
      assert(resolved.fighter.movementSpent == 5),
    }
  }

  run test_goblin_opportunity_attack_can_knock_out = {
    val result = resolveGoblinOpportunityAttackWithDisposition(withFighterHp(initialState, 3, 0), 20, 18, 1, true, KnockOut)
    all {
      assert(result.fighter.hp == 1),
      assert(result.fighter.unconscious),
    }
  }

  run test_resolved_reaction_releases_readied_spell_and_resumes_attack_continuation = {
    val readied = { ...readyFighterReadiedSpell(initialState), actionAvailable: true }
    val awaitingReaction = openReactionWindow(readied, {
      trigger: AttackHit,
      procedure: ReadiedSpellReleaseReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeAttack({ damage: 7 }),
    })
    val resolved = resolveReactionOffer(awaitingReaction, Fighter)
    all {
      assert(not(resolved.fighter.readiedSpellHeld)),
      assert(not(resolved.fighter.concentrating)),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(resolved.goblin.hp == 3),
      assert(not(resolved.actionAvailable)),
      assert(resolved.interruptStack == []),
    }
  }

  run test_sanctuary_targeting_interdiction_trigger_scope = {
    val warded = resolveSanctuaryWardSpell(initialState, Goblin)
    all {
      assert(activeEffectsContainSanctuaryWard(warded.goblin.activeEffects)),
      assert(activeEffectsSanctuaryWardDurationTicks(warded.goblin.activeEffects) == 10),
      assert(activeEffectsSanctuaryWardDurationTicks(tickDurationActiveEffects(warded.goblin.activeEffects)) == 9),
      assert(wardTargetingInterdictionApplies(SanctuaryAttackRollTargeting)),
      assert(wardTargetingInterdictionApplies(SanctuaryDamagingSpellTargeting)),
      assert(not(wardTargetingInterdictionApplies(SanctuaryAreaOfEffectTargeting))),
      assert(sanctuaryTargetingInterdictionOutcomeApplies(
        warded,
        Goblin,
        SanctuaryAttackRollTargeting,
        SanctuarySaveSucceeded,
      )),
      assert(not(sanctuaryTargetingInterdictionOutcomeApplies(
        warded,
        Goblin,
        SanctuaryAreaOfEffectTargeting,
        SanctuarySaveSucceeded,
      ))),
    }
  }

  run test_sanctuary_targeting_interdiction_outcomes = {
    val warded = resolveSanctuaryWardSpell(initialState, Goblin)
    all {
      assert(wardInterdictionLosesAttackOrSpell(SanctuaryLoseAttackOrSpell)),
      assert(not(wardInterdictionLosesAttackOrSpell(SanctuarySaveSucceeded))),
      assert(not(sanctuaryTargetingInterdictionOutcomeApplies(
        warded,
        Goblin,
        SanctuaryAttackRollTargeting,
        SanctuaryLoseAttackOrSpell,
      ))),
      assert(sanctuaryTargetingInterdictionResolvedTarget(
        warded,
        Goblin,
        SanctuaryAttackRollTargeting,
        SanctuarySaveSucceeded,
      ) == Goblin),
      assert(sanctuaryTargetingInterdictionResolvedTarget(
        warded,
        Goblin,
        SanctuaryDamagingSpellTargeting,
        SanctuaryChooseNewTarget({ target: Fighter }),
      ) == Fighter),
    }
  }

  run test_sanctuary_early_end_lifecycle = {
    val fighterWarded = resolveSanctuaryWardSpell(initialState, Fighter)
    val afterAttackRoll = recordFighterAttackRoll(fighterWarded)
    val afterSpellCast = resolveSanctuaryWardSpell({ ...fighterWarded, bonusActionAvailable: true, spellSlotUsesThisTurn: Set() }, Goblin)
    val afterDamage = battleStateAfterSanctuaryEarlyEndForActor(fighterWarded, Fighter)
    all {
      assert(activeEffectsContainSanctuaryWard(fighterWarded.fighter.activeEffects)),
      assert(not(activeEffectsContainSanctuaryWard(afterAttackRoll.fighter.activeEffects))),
      assert(not(activeEffectsContainSanctuaryWard(afterSpellCast.fighter.activeEffects))),
      assert(activeEffectsContainSanctuaryWard(afterSpellCast.goblin.activeEffects)),
      assert(not(activeEffectsContainSanctuaryWard(afterDamage.fighter.activeEffects))),
    }
  }

  run test_invisibility_direct_condition_lifecycle = {
    val invisible = resolveInvisibilityConditionSpell(initialState, Set(Fighter, Goblin), 3)
    val afterAttackRoll = recordFighterAttackRoll(invisible)
    val afterSpellCast = resolveInvisibilityConditionSpell({ ...invisible, actionAvailable: true, spellSlotUsesThisTurn: Set() }, Set(Goblin), 2)
    val afterDamage = battleStateAfterTargetActionEarlyEndForActor(invisible, Fighter)
    val brokenConcentration = breakConcentrationSpellEffects(invisible, Fighter)
    val expired = tickRoundDurationSpellEffects({
      ...invisible,
      fighter: {
        ...invisible.fighter,
        activeEffects: Set(InvisibilityCondition({ source: Fighter, durationTicks: 1 })),
      },
      goblin: {
        ...invisible.goblin,
        activeEffects: Set(InvisibilityCondition({ source: Fighter, durationTicks: 1 })),
      },
    })
    all {
      assert(activeEffectsContainInvisibilityCondition(invisible.fighter.activeEffects)),
      assert(activeEffectsContainInvisibilityCondition(invisible.goblin.activeEffects)),
      assert(activeEffectsInvisibilityDurationTicks(tickDurationActiveEffects(invisible.goblin.activeEffects)) == 599),
      assert(not(activeEffectsContainInvisibilityCondition(afterAttackRoll.fighter.activeEffects))),
      assert(not(activeEffectsContainInvisibilityCondition(afterAttackRoll.goblin.activeEffects))),
      assert(not(afterAttackRoll.fighter.concentrating)),
      assert(not(activeEffectsContainInvisibilityCondition(afterSpellCast.fighter.activeEffects))),
      assert(activeEffectsContainInvisibilityCondition(afterSpellCast.goblin.activeEffects)),
      assert(afterSpellCast.fighter.concentrating),
      assert(not(activeEffectsContainInvisibilityCondition(afterDamage.fighter.activeEffects))),
      assert(not(activeEffectsContainInvisibilityCondition(afterDamage.goblin.activeEffects))),
      assert(not(afterDamage.fighter.concentrating)),
      assert(not(activeEffectsContainInvisibilityCondition(brokenConcentration.fighter.activeEffects))),
      assert(not(activeEffectsContainInvisibilityCondition(brokenConcentration.goblin.activeEffects))),
      assert(not(activeEffectsContainInvisibilityCondition(expired.fighter.activeEffects))),
      assert(not(activeEffectsContainInvisibilityCondition(expired.goblin.activeEffects))),
      assert(not(expired.fighter.concentrating)),
    }
  }
}
