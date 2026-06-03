// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-independent-attack-sequence

module battleRuntimeSpellAttackTests {
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
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"

  run test_poison_spray_applies_poison_spell_attack_damage = {
    val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
    val result = resolvePoisonSpray(noReaction, 15, 10, 7, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 3),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
    }
  }

  run test_mirror_image_intercepts_spell_attack_damage = {
    val mirroredGoblin = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(mirrorImageActiveEffect),
        reactionAvailable: false,
      },
    }
    val redirected = resolveRayOfFrostWithMirrorImageDuplicateRoll(mirroredGoblin, 15, 10, 4, true, 3, false)
    val failedRoll = resolveRayOfFrostWithMirrorImageDuplicateRoll(mirroredGoblin, 15, 10, 4, true, 2, false)
    all {
      assert(redirected.goblin.hp == 10),
      assert(activeEffectsMirrorImageRemainingDuplicates(redirected.goblin.activeEffects) == 2),
      assert(not(redirected.goblin.activeEffects.contains(RayOfFrostSpeedDelta))),
      assert(redirected.actionAvailable == false),
      assert(failedRoll.goblin.hp == 6),
      assert(activeEffectsMirrorImageRemainingDuplicates(failedRoll.goblin.activeEffects) == 3),
      assert(failedRoll.goblin.activeEffects.contains(RayOfFrostSpeedDelta)),
    }
  }

  run test_mirror_image_intercepts_each_spell_attack_sequence_hit = {
    val mirroredGoblin = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(mirrorImageActiveEffect),
        reactionAvailable: false,
      },
    }
    val result = resolveEldritchBlastTwoBeamsWithMirrorImageDuplicateRolls(
      mirroredGoblin,
      15,
      10,
      4,
      true,
      3,
      false,
      16,
      11,
      6,
      true,
      3,
      false,
    )
    all {
      assert(result.goblin.hp == 10),
      assert(activeEffectsMirrorImageRemainingDuplicates(result.goblin.activeEffects) == 1),
      assert(result.actionAvailable == false),
    }
  }

  run test_chill_touch_applies_necrotic_spell_attack_damage = {
    val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
    val result = resolveChillTouch(noReaction, 15, 10, 6, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 4),
      assert(result.goblin.activeEffects.contains(ChillTouchHitPointRegainPrevented({ source: Fighter, expiresAtRound: 2 }))),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
    }
  }

  run test_chill_touch_prevents_hit_point_regain_until_end_of_caster_next_turn = {
    val noReaction = { ...initialState, goblin: { ...initialState.goblin, hp: 6, reactionAvailable: false } }
    val hit = resolveChillTouch(noReaction, 15, 10, 3, true)
    val blockedHealing = applyHealing(hit.goblin, 5)
    val afterGoblinTurn = endTurn(endTurn(hit))
    val afterFighterNextTurn = endTurn(afterGoblinTurn)
    all {
      assert(hit.goblin.hp == 3),
      assert(blockedHealing.hp == 3),
      assert(afterGoblinTurn.goblin.activeEffects.contains(ChillTouchHitPointRegainPrevented({ source: Fighter, expiresAtRound: 2 }))),
      assert(not(afterFighterNextTurn.goblin.activeEffects.exists(effect => match effect {
        | ChillTouchHitPointRegainPrevented(_) => true
        | _ => false
      }))),
      assert(applyHealing(afterFighterNextTurn.goblin, 5).hp == 8),
    }
  }

  run test_starry_wisp_dim_light_emitter_expires_at_end_of_caster_next_turn = {
    val hit = applyStarryWispDimLightEmitter(initialState, Fighter, CombatantLightEmitter({ actor: Goblin }))
    val afterFighterTurn = endTurn(hit)
    val afterGoblinTurn = endTurn(afterFighterTurn)
    val afterFighterNextTurn = endTurn(afterGoblinTurn)
    val emitter = starryWispDimLightEmitter(initialState, Fighter, CombatantLightEmitter({ actor: Goblin }))
    all {
      assert(hit.lightEmitters.contains(emitter)),
      assert(afterFighterTurn.lightEmitters.contains(emitter)),
      assert(afterGoblinTurn.lightEmitters.contains(emitter)),
      assert(not(afterFighterNextTurn.lightEmitters.contains(emitter))),
    }
  }

  run test_starry_wisp_invisible_benefit_denial_expires_at_end_of_caster_next_turn = {
    val hitGoblin = applyStarryWispInvisibleBenefitDenied(initialState, initialState.goblin, Fighter)
    val hit = { ...initialState, goblin: hitGoblin }
    val afterFighterTurn = endTurn(hit)
    val afterGoblinTurn = endTurn(afterFighterTurn)
    val afterFighterNextTurn = endTurn(afterGoblinTurn)
    val effect = StarryWispInvisibleBenefitDenied({ source: Fighter, expiresAtRound: 2 })
    all {
      assert(hit.goblin.activeEffects.contains(effect)),
      assert(activeEffectsDenyInvisibleBenefit(hit.goblin.activeEffects)),
      assert(afterFighterTurn.goblin.activeEffects.contains(effect)),
      assert(afterGoblinTurn.goblin.activeEffects.contains(effect)),
      assert(not(afterFighterNextTurn.goblin.activeEffects.contains(effect))),
      assert(not(activeEffectsDenyInvisibleBenefit(afterFighterNextTurn.goblin.activeEffects))),
    }
  }

  run test_starry_wisp_object_invisible_benefit_denial_projects_from_light_emitter = {
    val hit = applyStarryWispDimLightEmitter(initialState, Fighter, ObjectLightEmitter({ object: StarryWispObjectTarget }))
    val miss = initialState
    val afterFighterTurn = endTurn(hit)
    val afterGoblinTurn = endTurn(afterFighterTurn)
    val afterFighterNextTurn = endTurn(afterGoblinTurn)
    all {
      assert(objectInvisibleBenefitDenied(hit, StarryWispObjectTarget)),
      assert(not(objectInvisibleBenefitDenied(miss, StarryWispObjectTarget))),
      assert(objectInvisibleBenefitDenied(afterFighterTurn, StarryWispObjectTarget)),
      assert(objectInvisibleBenefitDenied(afterGoblinTurn, StarryWispObjectTarget)),
      assert(not(objectInvisibleBenefitDenied(afterFighterNextTurn, StarryWispObjectTarget))),
      assert(hit.objectOutlines == Set()),
    }
  }

  run test_eldritch_blast_resolves_two_independent_force_beams = {
    val result = resolveEldritchBlastTwoBeams(initialState, 15, 10, 4, true, 1, 1, 6, true)
    val twoHits = resolveEldritchBlastTwoBeams(initialState, 15, 10, 4, true, 16, 11, 6, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 6),
      assert(not(battleActorHasSpellSlotUse(result, Fighter))),
      assert(twoHits.actionAvailable == false),
      assert(twoHits.goblin.hp == 0),
      assert(not(battleActorHasSpellSlotUse(twoHits, Fighter))),
    }
  }

}
