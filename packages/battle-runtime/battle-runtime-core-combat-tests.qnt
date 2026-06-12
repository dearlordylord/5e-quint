// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.find-familiar-lifecycle spell.reaction-counterspell

module battleRuntimeCoreCombatTests {
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import attackActionAdditionalAttacks.* from "../shared-algebras/proofs/rule-core/attack-action-additional-attacks"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import hitPointRecovery.* from "../shared-algebras/proofs/rule-core/hit-point-recovery"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeStatBlockBridge.* from "./battle-runtime-stat-block-bridge"
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import spellInvocationResourceCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-resource-core"
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
  import battleRuntimeReactionResolution.* from "./battle-runtime-reaction-resolution"
  import battleRuntimeCombatHoles.* from "./battle-runtime-combat-holes"
  import battleRuntimeLegendaryActions.* from "./battle-runtime-legendary-actions"
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
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import battleRuntimeHideSearchFixture.* from "./battle-runtime-hide-search-fixture"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeRestorationAndBuffs.* from "./battle-runtime-restoration-and-buffs"
  import battleRuntimeSleepHideousLaughter.* from "./battle-runtime-sleep-hideous-laughter"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeGroundCommand.* from "./battle-runtime-ground-command"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"

  run test_initial_holes_cover_attack_target = {
    assert(combatOpenHoles(initialState).contains(TargetChoice))
  }

  run test_mirror_image_duplicate_roll_hole_precedes_attack_damage_hole = {
    val mirroredGoblin = {
      ...initialState,
      goblin: { ...initialState.goblin, activeEffects: Set(mirrorImageActiveEffect) },
    }
    val replay = AttackRollFilled({ attackTotal: 20, naturalD20: 18 })
    all {
      assert(combatAttackReplayHoles(mirroredGoblin, replay) == Set(MirrorImageDuplicateRoll)),
      assert(mirrorImageAttackRollHitReplayHoles(
        initialState.fighter.activeEffects,
        mirroredGoblin.goblin.activeEffects,
        false,
        true,
        3,
        false,
        DamageRoll,
      ) == Set()),
      assert(mirrorImageAttackRollHitReplayHoles(
        initialState.fighter.activeEffects,
        mirroredGoblin.goblin.activeEffects,
        false,
        true,
        2,
        false,
        DamageRoll,
      ) == Set(DamageRoll)),
    }
  }

  run test_mirror_image_intercepts_goblin_weapon_attack_hit = {
    val mirroredFighter = {
      ...endTurn(initialState),
      fighter: { ...initialState.fighter, activeEffects: Set(mirrorImageActiveEffect) },
    }
    val redirected = resolveGoblinAttackWithMirrorImageDuplicateRoll(mirroredFighter, 20, 18, 5, false, 3, false)
    val failedRoll = resolveGoblinAttackWithMirrorImageDuplicateRoll(mirroredFighter, 20, 18, 5, false, 2, false)
    all {
      assert(redirected.fighter.hp == 12),
      assert(activeEffectsMirrorImageRemainingDuplicates(redirected.fighter.activeEffects) == 2),
      assert(redirected.actionAvailable == false),
      assert(failedRoll.fighter.hp == 5),
      assert(activeEffectsMirrorImageRemainingDuplicates(failedRoll.fighter.activeEffects) == 3),
    }
  }

  run test_mirror_image_weapon_attack_bypasses_for_blinded_or_special_sense_attacker = {
    val mirroredFighter = {
      ...endTurn(initialState),
      fighter: { ...initialState.fighter, activeEffects: Set(mirrorImageActiveEffect) },
    }
    val blindedGoblin = {
      ...mirroredFighter,
      goblin: { ...mirroredFighter.goblin, activeEffects: Set(ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 })) },
    }
    val blindedBypass = resolveGoblinAttackWithMirrorImageDuplicateRoll(blindedGoblin, 20, 18, 5, false, 3, false)
    val sightBypass = resolveGoblinAttackWithMirrorImageDuplicateRoll(mirroredFighter, 20, 18, 5, false, 3, true)
    all {
      assert(blindedBypass.fighter.hp == 5),
      assert(activeEffectsMirrorImageRemainingDuplicates(blindedBypass.fighter.activeEffects) == 3),
      assert(sightBypass.fighter.hp == 5),
      assert(activeEffectsMirrorImageRemainingDuplicates(sightBypass.fighter.activeEffects) == 3),
    }
  }

  run test_mirror_image_intercepts_fighter_weapon_attack_hit = {
    val mirroredGoblin = {
      ...initialState,
      goblin: { ...initialState.goblin, activeEffects: Set(mirrorImageActiveEffect) },
    }
    val redirected = resolveAttackAtBarbarianLevelWithToppleChoiceAndMirrorImageDuplicateRoll(
      mirroredGoblin,
      20,
      18,
      fighterWeaponAttackDamageRoll(5),
      true,
      1,
      OrdinaryDamage,
      false,
      true,
      3,
      false,
    )
    all {
      assert(redirected.goblin.hp == 10),
      assert(activeEffectsMirrorImageRemainingDuplicates(redirected.goblin.activeEffects) == 2),
      assert(redirected.actionAvailable == false),
    }
  }

  run test_find_familiar_cast_and_recast_keeps_one_owner_record = {
    val cat = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      18
    )
    val rat = castFindFamiliarLifecycle(
      cat,
      Set(Fighter),
      Fighter,
      Fighter,
      FindFamiliarRat,
      FindFamiliarCelestial,
      12
    )

    all {
      assert(cat == PresentFindFamiliar({
        owner: Fighter,
        familiar: Goblin,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
        form: FindFamiliarCat,
        creatureTypeOverride: FindFamiliarFey,
        initiative: 18,
        placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
      })),
      assert(findFamiliarCombatants(cat) == Set(Goblin)),
      assert(battleCombatantsWithFindFamiliar(Set(Fighter), cat) == Set(Fighter, Goblin)),
      assert(rat == PresentFindFamiliar({
        owner: Fighter,
        familiar: Goblin,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
        form: FindFamiliarRat,
        creatureTypeOverride: FindFamiliarCelestial,
        initiative: 12,
        placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
      })),
    }
  }

  run test_find_familiar_turn_resources_and_no_attack_gate = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      11
    )

    all {
      assert(actorIsPresentFindFamiliar(present, Goblin)),
      assert(not(actorIsPresentFindFamiliar(present, Fighter))),
      assert(findFamiliarNonAttackActionAvailable(present, Goblin, true)),
      assert(not(findFamiliarNonAttackActionAvailable(present, Goblin, false))),
      assert(not(ordinaryAttackActionAvailableForActor(present, Goblin, true))),
      assert(ordinaryAttackActionAvailableForActor(present, Fighter, true)),
      assert(not(opportunityAttackAvailableForActor(present, Goblin, true))),
      assert(opportunityAttackAvailableForActor(present, Fighter, true)),
    }
  }

  run test_find_familiar_cast_rejects_ordinary_combatant_identity = {
    val ownerCollision = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Fighter,
      FindFamiliarCat,
      FindFamiliarFey,
      18
    )
    val ordinaryCombatantCollision = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter, Goblin),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      18
    )

    all {
      assert(ownerCollision == NoFindFamiliar),
      assert(ordinaryCombatantCollision == NoFindFamiliar),
    }
  }

  run test_find_familiar_dismiss_reappear_and_drop_events = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarBat,
      FindFamiliarFiend,
      16
    )
    val dismissed = temporarilyDismissFindFamiliarLifecycle(present, true, Set(1))
    val blockedReappearance = reappearFindFamiliarLifecycle(
      dismissed.lifecycle,
      Set(Fighter),
      Goblin,
      15,
      false
    )
    val blockedIdentityReappearance = reappearFindFamiliarLifecycle(
      dismissed.lifecycle,
      Set(Fighter, Goblin),
      Goblin,
      15,
      true
    )
    val reappeared = reappearFindFamiliarLifecycle(
      dismissed.lifecycle,
      Set(Fighter),
      Goblin,
      15,
      true
    )
    val forever = permanentlyDismissFindFamiliarLifecycle(reappeared.lifecycle)

    all {
      assert(dismissed.lifecycle == TemporarilyDismissedFindFamiliar({
        owner: Fighter,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
        form: FindFamiliarBat,
        creatureTypeOverride: FindFamiliarFiend,
      })),
      assert(dismissed.itemDropBoundaryEvents == Set({
        owner: Fighter,
        familiar: Goblin,
        objectId: 1,
      })),
      assert(dismissed.magicActionSpent),
      assert(blockedReappearance.lifecycle == dismissed.lifecycle),
      assert(not(blockedReappearance.magicActionSpent)),
      assert(blockedIdentityReappearance.lifecycle == dismissed.lifecycle),
      assert(not(blockedIdentityReappearance.magicActionSpent)),
      assert(reappeared.lifecycle == PresentFindFamiliar({
        owner: Fighter,
        familiar: Goblin,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
        form: FindFamiliarBat,
        creatureTypeOverride: FindFamiliarFiend,
        initiative: 15,
        placement: FindFamiliarUnoccupiedSpaceWithin30Feet,
      })),
      assert(reappeared.magicActionSpent),
      assert(forever.lifecycle == DismissedForeverFindFamiliar({
        owner: Fighter,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
      })),
      assert(not(forever.magicActionSpent)),
      assert(forever.itemDropBoundaryEvents == Set()),
    }
  }

  run test_retained_find_familiar_temporary_dismissal_preserves_identity_and_protocol = {
    val present = admitRetainedFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      Fighter,
      OwnerLongRestFamiliarLikeOneAtATime,
      FindFamiliarBat,
      FindFamiliarFey,
      16
    )
    val dismissed = temporarilyDismissFindFamiliarLifecycle(present, true, Set())

    all {
      assert(dismissed.lifecycle == TemporarilyDismissedFindFamiliar({
        owner: Fighter,
        identity: RetainedFindFamiliarIdentity({ durableCompanion: Fighter }),
        protocol: OwnerLongRestFamiliarLikeOneAtATime,
        form: FindFamiliarBat,
        creatureTypeOverride: FindFamiliarFey,
      })),
      assert(dismissed.magicActionSpent),
      assert(dismissed.itemDropBoundaryEvents == Set()),
    }
  }

  run test_find_familiar_zero_hit_points_disappears_until_recast = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      18
    )
    val disappeared = zeroHitPointDisappearFindFamiliarLifecycle(present, Set(3))
    val recast = castFindFamiliarLifecycle(
      disappeared.lifecycle,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarRat,
      FindFamiliarFey,
      17
    )

    all {
      assert(disappeared.lifecycle == DisappearedAtZeroHitPointsFindFamiliar({
        owner: Fighter,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
        form: FindFamiliarCat,
        creatureTypeOverride: FindFamiliarFey,
      })),
      assert(disappeared.itemDropBoundaryEvents == Set({
        owner: Fighter,
        familiar: Goblin,
        objectId: 3,
      })),
      assert(not(disappeared.magicActionSpent)),
      assert(recast == PresentFindFamiliar({
        owner: Fighter,
        familiar: Goblin,
        identity: BattleOnlyFindFamiliarIdentity,
        protocol: OrdinaryFamiliarLikeOneAtATime,
        form: FindFamiliarRat,
        creatureTypeOverride: FindFamiliarFey,
        initiative: 17,
        placement: FindFamiliarUnoccupiedSpaceWithinSpellRange,
      })),
    }
  }

  run test_find_familiar_telepathy_shared_senses_and_touch_delivery = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarBat,
      FindFamiliarFey,
      18
    )
    val connection = findFamiliarTelepathicConnection(present, Fighter, true)
    val outOfRangeConnection = findFamiliarTelepathicConnection(present, Fighter, false)
    val sharedSenses = shareFindFamiliarSenses(present, Fighter, true, true)
    val noBonusActionSharedSenses = shareFindFamiliarSenses(present, Fighter, true, false)
    val delivered = findFamiliarTouchSpellDelivery(present, Fighter, true, true, true)
    val nonTouch = findFamiliarTouchSpellDelivery(present, Fighter, false, true, true)
    val noReaction = findFamiliarTouchSpellDelivery(present, Fighter, true, true, false)

    all {
      assert(connection == Set({
        owner: Fighter,
        familiar: Goblin,
        rangeFeet: 100,
        sharedLanguageRequired: false,
      })),
      assert(outOfRangeConnection == Set()),
      assert(sharedSenses == Set({
        owner: Fighter,
        familiar: Goblin,
        expiresAtStartOfOwnerNextTurn: true,
        gainsSight: true,
        gainsHearing: true,
        gainsSpecialSenses: true,
      })),
      assert(noBonusActionSharedSenses == Set()),
      assert(delivered == { spellCast: true, familiarReactionSpent: true }),
      assert(nonTouch == { spellCast: false, familiarReactionSpent: false }),
      assert(noReaction == { spellCast: false, familiarReactionSpent: false }),
    }
  }

  run test_pact_of_the_chain_familiar_reaction_attack_requires_pact_owner_attack_and_reaction = {
    val present = castFindFamiliarLifecycle(
      NoFindFamiliar,
      Set(Fighter),
      Fighter,
      Goblin,
      FindFamiliarCat,
      FindFamiliarFey,
      11
    )
    val resolved = pactOfTheChainFamiliarReactionAttack(present, Fighter, true, true, true, true)
    val nonPact = pactOfTheChainFamiliarReactionAttack(present, Fighter, false, true, true, true)
    val noOwnerAttack = pactOfTheChainFamiliarReactionAttack(present, Fighter, true, false, true, true)
    val noReaction = pactOfTheChainFamiliarReactionAttack(present, Fighter, true, true, false, true)
    val unsupportedAttack = pactOfTheChainFamiliarReactionAttack(present, Fighter, true, true, true, false)
    val wrongOwner = pactOfTheChainFamiliarReactionAttack(present, Goblin, true, true, true, true)

    all {
      assert(resolved == PactFamiliarReactionAttackResolved),
      assert(nonPact == PactFamiliarReactionAttackRejected),
      assert(noOwnerAttack == PactFamiliarReactionAttackRejected),
      assert(noReaction == PactFamiliarReactionAttackRejected),
      assert(unsupportedAttack == PactFamiliarReactionAttackRejected),
      assert(wrongOwner == PactFamiliarReactionAttackRejected),
    }
  }

  run test_hide_records_discovery_dc = {
    val canHide = { ...initialState, fighter: { ...initialState.fighter, hidePrerequisite: true } }
    all {
      assert(hideHoles(initialState) == Set()),
      assert(hideHoles(canHide) == Set(AbilityCheck)),
      assert(hideFighter(initialState, 20).fighter.hidden == NotHidden),
      assert(fighterIsHidden(hideFighter(canHide, 15))),
      assert(hideFighter(canHide, 14).fighter.hidden == NotHidden),
    }
  }

  run test_search_finds_hidden_fighter = {
    val hidden = endTurn(hideFighter({ ...initialState, fighter: { ...initialState.fighter, hidePrerequisite: true } }, 18))
    all {
      assert(searchGoblinForFighter(hidden, 17).fighter.hidden == HiddenByDc(HiddenDc18)),
      assert(searchGoblinForFighter(hidden, 18).fighter.hidden == NotHidden),
    }
  }

  run test_attack_reveals_hidden_fighter = {
    val hidden = hideFighter({ ...initialState, fighter: { ...initialState.fighter, hidePrerequisite: true } }, 18)
    assert(resolveAttack({ ...hidden, actionAvailable: true }, 1, 1, fighterWeaponAttackDamageRoll(4), true).fighter.hidden == NotHidden)
  }

  run test_attack_replay_asks_for_attack_roll_after_target = {
    assert(combatAttackReplayHoles(initialState, AttackNeedsAttackRoll) == Set(AttackRoll))
  }

  run test_attack_replay_asks_for_damage_roll_after_hit = {
    assert(combatAttackReplayHoles(initialState, AttackRollFilled({ attackTotal: 15, naturalD20: 10 })) == Set(DamageRoll))
  }

  run test_goblin_turn_opens_stat_block_attack_target_hole = {
    assert(combatOpenHoles(endTurn(initialState)).contains(TargetChoice))
  }

  run test_goblin_turn_opens_stat_block_recharge_hole_before_attack = {
    val spentRecharge = { ...initialState, goblin: { ...initialState.goblin, rechargeAvailable: false } }
    assert(combatOpenHoles(endTurn(spentRecharge)) == Set(StatBlockRechargeRoll))
  }

  run test_goblin_recharge_roll_restores_available_part_on_success = {
    val spentRecharge = { ...initialState, goblin: { ...initialState.goblin, rechargeAvailable: false } }
    val failed = endTurnWithGoblinRechargeRoll(spentRecharge, 4)
    val succeeded = endTurnWithGoblinRechargeRoll(spentRecharge, 5)
    all {
      assert(not(failed.goblin.rechargeAvailable)),
      assert(succeeded.goblin.rechargeAvailable),
    }
  }

  run test_legendary_action_window_excludes_initial_and_own_turn = {
    val goblinTurn = endTurn(initialState)
    all {
      assert(not(goblinLegendaryActionAvailable(initialState))),
      assert(not(goblinLegendaryActionAvailable(goblinTurn))),
    }
  }

  run test_legendary_action_window_after_another_non_current_turn = {
    val afterFighterTurnWithThirdActor = endTurn({
      ...initialState,
      initiative: { round: 1, alreadyActed: [], stillToAct: { actor: Fighter, waiting: [Fighter, Goblin] } },
    })
    val spent = spendGoblinLegendaryAction(afterFighterTurnWithThirdActor)
    all {
      assert(goblinLegendaryActionAvailable(afterFighterTurnWithThirdActor)),
      assert(spent.goblin.legendaryUsesRemaining == 1),
      assert(not(goblinLegendaryActionAvailable(spent))),
    }
  }

  run test_caller_ordered_initiative_tie_selects_first_supplied_actor = {
    all {
      assert(currentActor(callerOrderedTieInitialState) == Goblin),
      assert(
        initiativeStillToActActors(endTurn(endTurn(callerOrderedTieInitialState)).initiative) == [Goblin, Fighter]
      ),
    }
  }

  run test_goblin_attack_replay_uses_fighter_armor_class = {
    assert(combatAttackReplayHoles(endTurn(initialState), AttackRollFilled({ attackTotal: 19, naturalD20: 10 })) == Set(DamageRoll))
  }

  run test_stat_block_multiattack_spends_one_attack_action_and_grants_dispatches = {
    val goblinTurn = endTurn(initialState)
    val multiattack = resolveGoblinMultiattack(goblinTurn)
    val recursive = resolveGoblinMultiattack(multiattack)
    val firstDispatch = resolveGoblinMultiattackDispatch(multiattack, 1, 1, 0, true)
    val secondDispatch = resolveGoblinMultiattackDispatch(firstDispatch, 1, 1, 0, true)
    val ended = endTurn(multiattack)
    all {
      assert(not(multiattack.actionAvailable)),
      assert(multiattack.goblin.multiattackDispatchesRemaining == 2),
      assert(goblinMultiattackDispatchContinuationOpen(multiattack)),
      assert(recursive.goblin.multiattackDispatchesRemaining == 2),
      assert(firstDispatch.goblin.multiattackDispatchesRemaining == 1),
      assert(secondDispatch.goblin.multiattackDispatchesRemaining == 0),
      assert(not(goblinMultiattackDispatchContinuationOpen(secondDispatch))),
      assert(ended.goblin.multiattackDispatchesRemaining == 0),
    }
  }

  run test_class_feature_extra_attack_spends_one_action_and_grants_one_slot = {
    val first = resolveAttack(withFighterExtraAttack(initialState), 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val second = resolveAttack(first, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val third = resolveAttack(second, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    all {
      assert(not(first.actionAvailable)),
      assert(attackActionAdditionalAttackCount(first.fighter.extraAttackSlotsRemaining) == 1),
      assert(attackActionAdditionalAttackCount(second.fighter.extraAttackSlotsRemaining) == 0),
      assert(third == second),
    }
  }

  run test_class_feature_extra_attack_allows_movement_between_slots = {
    val first = resolveAttack(withFighterExtraAttack(initialState), 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val moved = moveFighter(first, 5, false)
    val second = resolveAttack(moved, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    all {
      assert(attackActionAdditionalAttackCount(moved.fighter.extraAttackSlotsRemaining) == 1),
      assert(moved.fighter.movementSpent == 5),
      assert(attackActionAdditionalAttackCount(second.fighter.extraAttackSlotsRemaining) == 0),
    }
  }

  run test_class_feature_extra_attack_end_turn_closes_unspent_slot = {
    val first = resolveAttack(withFighterExtraAttack(initialState), 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val ended = endTurn(first)
    all {
      assert(attackActionAdditionalAttackCount(first.fighter.extraAttackSlotsRemaining) == 1),
      assert(attackActionAdditionalAttackCount(ended.fighter.extraAttackSlotsRemaining) == 0),
    }
  }

  run test_class_feature_extra_attack_preserves_two_additional_attacks = {
    val first = resolveAttack(withFighterExtraAttackAdditionalAttacks(initialState, TwoAdditionalAttacks), 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val second = resolveAttack(first, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val third = resolveAttack(second, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val fourth = resolveAttack(third, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    all {
      assert(attackActionAdditionalAttackCount(first.fighter.extraAttackSlotsRemaining) == 2),
      assert(attackActionAdditionalAttackCount(second.fighter.extraAttackSlotsRemaining) == 1),
      assert(attackActionAdditionalAttackCount(third.fighter.extraAttackSlotsRemaining) == 0),
      assert(fourth == third),
    }
  }

  run test_class_feature_extra_attack_preserves_three_additional_attacks = {
    val first = resolveAttack(withFighterExtraAttackAdditionalAttacks(initialState, ThreeAdditionalAttacks), 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val second = resolveAttack(first, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val third = resolveAttack(second, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val fourth = resolveAttack(third, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    val fifth = resolveAttack(fourth, 1, 1, fighterWeaponAttackDamageRoll(0), true)
    all {
      assert(attackActionAdditionalAttackCount(first.fighter.extraAttackSlotsRemaining) == 3),
      assert(attackActionAdditionalAttackCount(second.fighter.extraAttackSlotsRemaining) == 2),
      assert(attackActionAdditionalAttackCount(third.fighter.extraAttackSlotsRemaining) == 1),
      assert(attackActionAdditionalAttackCount(fourth.fighter.extraAttackSlotsRemaining) == 0),
      assert(fifth == fourth),
    }
  }

  run test_attack_miss_spends_action_without_damage = {
    val result = resolveAttack(initialState, 14, 9, fighterWeaponAttackDamageRoll(0), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 10),
      assert(result.goblin.tempHp == 0),
    }
  }

  run test_attack_hit_applies_damage_and_spends_action = {
    val result = resolveAttack(initialState, 15, 10, fighterWeaponAttackDamageRoll(4), true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 3),
    }
  }

  run test_sneak_attack_optional_rider_applies_once_per_turn = {
    val result = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 15, 10, 4, 6, true, true, false, false, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.goblin.hp == 0),
      assert(result.fighter.sneakAttackUsedThisTurn),
    }
  }

  run test_sneak_attack_adjacent_ally_branch_requires_no_disadvantage = {
    val eligible = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 15, 10, 4, 6, true, false, true, false, true)
    val disadvantaged = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 15, 10, 4, 6, true, false, true, true, true)
    all {
      assert(eligible.goblin.hp == 0),
      assert(eligible.fighter.sneakAttackUsedThisTurn),
      assert(disadvantaged.goblin.hp == 3),
      assert(not(disadvantaged.fighter.sneakAttackUsedThisTurn)),
    }
  }

  run test_sneak_attack_critical_uses_doubled_rider_dice_total = {
    val result = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 20, 20, 2, 9, true, true, false, false, true)
    all {
      assert(result.goblin.hp == 0),
      assert(result.fighter.sneakAttackUsedThisTurn),
    }
  }

  run test_sneak_attack_usage_resets_on_next_turn = {
    val used = resolveAttackWithOptionalSneakAttack(withFighterSneakAttack(initialState), 15, 10, 4, 6, true, true, false, false, true)
    assert(not(endTurn(used).fighter.sneakAttackUsedThisTurn))
  }

  run test_reaction_roll_or_damage_reductions = {
    all {
      assert(not(attackHits(cuttingWordsAttackRollTotal(12, 3), 10, 10, 20))),
      assert(not(abilityCheckSucceeds(cuttingWordsAbilityCheckTotal(15, 3), 14))),
      assert(uncannyDodgeDamage(9) == 4),
      assert(deflectAttacksDamage(8, 2, 3, 3) == 0),
    }
  }

  run test_deflect_attacks_zero_damage_redirect = {
    val reduced = deflectAttacksDamage(8, 5, 0, 3)
    val meleeTarget = deflectAttacksRedirectTargetEligible(true, true, true, false, true)
    val rangedBehindTotalCover = deflectAttacksRedirectTargetEligible(true, false, false, true, true)
    all {
      assert(reduced == 0),
      assert(meleeTarget),
      assert(not(rangedBehindTotalCover)),
      assert(deflectAttacksRedirectDamage(reduced, 3, meleeTarget, false, 5, 5, 0) == 10),
      assert(deflectAttacksRedirectFocusRemaining(reduced, 3, meleeTarget) == 2),
      assert(deflectAttacksRedirectDamage(1, 3, meleeTarget, false, 5, 5, 0) == 0),
    }
  }

  run test_off_hand_attack_host_accepts_damage_reduction = {
    val afterAttack = { ...initialState, lightWeaponAttackMade: true }
    val result = offHandAttackFighterWithDamageReduction(afterAttack, 15, 10, 6, 3)
    all {
      assert(result.bonusActionAvailable == false),
      assert(result.goblin.hp == 7),
    }
  }

  run test_off_hand_light_property_damage_omits_positive_modifier_and_keeps_negative = {
    val afterAttack = { ...initialState, lightWeaponAttackMade: true }
    val positive = offHandAttackFighterWithAbilityModifier(afterAttack, 15, 10, 4, 3)
    val negative = offHandAttackFighterWithAbilityModifier(afterAttack, 15, 10, 4, -1)
    all {
      assert(positive.goblin.hp == 6),
      assert(negative.goblin.hp == 7),
      assert(not(negative.bonusActionAvailable)),
    }
  }

  run test_opportunity_attack_host_accepts_hit_damage_reduction = {
    val result = resolveGoblinOpportunityAttackWithUncannyDodge(initialState, 20, 18, 6, true)
    all {
      assert(result.fighter.hp == 8),
      assert(result.fighter.movementSpent == 0),
    }
  }

  run test_attack_damage_concentration_interrupt_resolves_before_damage = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val pending = resumeBattleReactionContinuation(concentratingGoblin, ResumeAttack({ damage: 4 }))
    val resolved = resolveBattleAttackDamageConcentration(pending, false)
    all {
      assert(pending.interruptStack.length() == 1),
      assert(pendingReactionFrame(pending.interruptStack[0]) == NoPendingReactionFrame),
      assert(pending.goblin.hp == 10),
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.hp == 6),
      assert(not(resolved.goblin.concentrating)),
    }
  }

  run test_zero_damage_reaction_attack_continuation_does_not_open_concentration_interrupt = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val resolved = resumeBattleReactionContinuation(concentratingGoblin, ResumeAttack({ damage: 0 }))
    all {
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.hp == 10),
      assert(resolved.goblin.concentrating),
    }
  }

  run test_goblin_attack_hit_applies_stat_block_damage_to_fighter = {
    val result = resolveGoblinAttack(endTurn(initialState), 20, 18, 5, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.fighter.hp == 5),
    }
  }

  run test_skeleton_damage_adjustments_apply_vulnerability_and_immunity = {
    all {
      assert(
        damageAfterAdjustments(5, Bludgeoning, Set(), Set(Bludgeoning), Set(Poison)) == 10
      ),
      assert(damageAfterAdjustments(5, Poison, Set(), Set(Bludgeoning), Set(Poison)) == 0),
    }
  }

  run test_same_type_damage_adjustments_apply_resistance_after_combining_parts = {
    assert(
      sameTypeDamageAfterAdjustments([3, 1], Slashing, Set(Slashing), Set(), Set()) == 2
    )
  }

  run test_resistance_spell_reduces_matching_damage_once_per_turn = {
    val protected = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(ResistanceDamageReduction({ damageType: Slashing, usedThisTurn: false })) } }
    val reduced = applyResistanceSpellReductionToFighter(protected, Slashing, 4, 3)
    val second = applyResistanceSpellReductionToFighter(reduced, Slashing, 4, 3)
    all {
      assert(reduced.fighter.hp == 11),
      assert(reduced.fighter.activeEffects.contains(ResistanceDamageReduction({ damageType: Slashing, usedThisTurn: true }))),
      assert(second.fighter.hp == 7),
    }
  }

  run test_resistance_spell_ignores_nonmatching_damage_and_resets_next_turn = {
    val protected = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(ResistanceDamageReduction({ damageType: Piercing, usedThisTurn: true })) } }
    val nonmatching = applyResistanceSpellReductionToFighter(protected, Slashing, 4, 3)
    val reset = endTurn(endTurn(nonmatching))
    all {
      assert(nonmatching.fighter.hp == 8),
      assert(reset.fighter.activeEffects.contains(ResistanceDamageReduction({ damageType: Piercing, usedThisTurn: false }))),
    }
  }

  run test_action_surge_grants_one_extra_action_and_spends_use = {
    val result = grantFighterActionSurge({ ...initialState, actionAvailable: false }, 1, false)
    all {
      assert(result.state.actionAvailable),
      assert(result.usesRemaining == 0),
      assert(result.usedThisTurn),
      assert(grantFighterActionSurge(result.state, result.usesRemaining, result.usedThisTurn) == result),
    }
  }

  run test_second_wind_spends_bonus_action_use_and_heals = {
    val wounded = { ...initialState, fighter: { ...initialState.fighter, hp: 4 } }
    val result = resolveFighterSecondWind(wounded, 2, 6, 2)
    all {
      assert(result.state.fighter.hp == 12),
      assert(not(result.state.bonusActionAvailable)),
      assert(result.usesRemaining == 1),
    }
  }

  run test_rage_ongoing_feature_spends_bonus_action_applies_damage_and_resistance = {
    val raging = startRage(initialState, 2)
    val hit = resolveAttack({ ...raging.state, actionAvailable: true }, 15, 10, fighterWeaponAttackDamageRoll(4), true)
    val levelNineHit = resolveAttackAtBarbarianLevel({ ...raging.state, actionAvailable: true }, 15, 10, fighterWeaponAttackDamageRoll(4), true, 9)
    val goblinTurn = endTurn(raging.state)
    val resisted = resolveGoblinAttack(goblinTurn, 15, 10, 4, true)
    all {
      assert(raging.usesRemaining == 1),
      assert(not(raging.state.bonusActionAvailable)),
      assert(fighterHasRage(raging.state)),
      assert(hit.goblin.hp == 1),
      assert(levelNineHit.goblin.hp == 0),
      assert(resisted.fighter.hp == 9),
    }
  }

  run test_rage_heavy_armor_and_incapacitated_end = {
    val armored = { ...initialState, fighter: { ...initialState.fighter, wearingHeavyArmor: true } }
    val cannotStart = startRage(armored, 2)
    val raging = startRage(initialState, 2).state
    val incapacitated = { ...raging, fighter: { ...raging.fighter, incapacitated: true } }
    all {
      assert(not(fighterHasRage(cannotStart.state))),
      assert(not(fighterHasRage(endTurn(incapacitated)))),
    }
  }

  run test_rage_bonus_action_extension_preserves_uses = {
    val raging = startRage(initialState, 2)
    val nextFighterTurn = endTurn(endTurn(raging.state))
    val extended = extendRageWithBonusAction(nextFighterTurn, raging.usesRemaining)
    all {
      assert(fighterHasRage(extended.state)),
      assert(not(extended.state.bonusActionAvailable)),
      assert(extended.usesRemaining == 1),
    }
  }

  run test_persistent_rage_survives_incapacitated_but_not_unconscious = {
    val raging = startPersistentRage(initialState, 2).state
    val incapacitated = { ...raging, fighter: { ...raging.fighter, incapacitated: true } }
    val unconscious = { ...raging, fighter: { ...raging.fighter, unconscious: true } }
    all {
      assert(fighterHasRage(endTurn(incapacitated))),
      assert(not(fighterHasRage(endTurn(unconscious)))),
    }
  }

  run test_rage_extends_when_grapple_forces_enemy_save = {
    val raging = startRage(initialState, 2).state
    val nextFighterTurn = endTurn(endTurn(raging))
    val grappled = grappleFighterGoblin(nextFighterTurn, 12)
    val extendedToNextTurn = match fighterRageOccurrence(grappled) {
      | ActiveRoundExtendedOngoingFeature(data) =>
          data.expiresAtEndOfFighterTurnRound == nextFighterTurn.initiative.round + 1
      | _ => false
    }
    all {
      assert(fighterHasRage(grappled)),
      assert(extendedToNextTurn),
    }
  }

  run test_rage_breaks_concentration_and_blocks_spells = {
    val concentrating = { ...initialState, fighter: { ...initialState.fighter, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val raging = startRage(concentrating, 2).state
    all {
      assert(not(raging.fighter.concentrating)),
      assert(not(canDiscoverSpellActs(true, fighterHasRage(raging)))),
      assert(resolveRayOfFrost(raging, 15, 10, 4, true) == raging),
    }
  }

  run test_rage_breaks_readied_spell_hold = {
    val readied = readyFighterReadiedSpell(initialState)
    val raging = startRage(readied, 2).state
    all {
      assert(not(raging.fighter.concentrating)),
      assert(not(raging.fighter.readiedSpellHeld)),
      assert(releaseFighterReadiedSpell(raging) == raging),
    }
  }

  run test_spell_attack_roll_counts_for_first_attack_roll = {
    val afterSpellAttack = resolveRayOfFrost(initialState, 1, 1, 4, true)
    val recklessAfterSpell = activateRecklessAttackOnFirstAttackRoll(afterSpellAttack)
    all {
      assert(afterSpellAttack.attackRollMadeThisTurn),
      assert(not(fighterHasRecklessAttack(recklessAfterSpell))),
    }
  }

  run test_shield_reaction_spell_interrupts_spell_attack_hit = {
    val awaiting = resolveRayOfFrost(initialState, 15, 10, 4, true)
    val resolved = resolveReactionOffer(awaiting, Goblin)
    all {
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeRayOfFrost,
      })),
      assert(resolved.goblin.activeEffects.contains(ShieldArmorClassBonus)),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(resolved.goblin.hp == 10),
      assert(not(resolved.actionAvailable)),
    }
  }

  run test_shield_reaction_spell_negates_magic_missile_damage_to_target = {
    val shielded = applyShieldReactionSpell(initialState, Fighter)
    all {
      assert(magicMissileTargetDamage(initialState.fighter, 3, 3, 1) == 6),
      assert(magicMissileTargetDamage(shielded.fighter, 3, 3, 1) == 0),
      assert(expendedSlotsAfterInvocation(Shield, 0) == 1),
    }
  }

  run test_shield_reaction_spell_spends_turn_spell_slot = {
    val awaiting = openReactionWindow(initialState, {
      trigger: SpellCast,
      procedure: ShieldReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    val resolved = resolveReactionOffer(awaiting, Fighter)
    all {
      assert(resolved.fighter.activeEffects.contains(ShieldArmorClassBonus)),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_shield_reaction_spell_rejects_second_slot_spell_in_same_turn = {
    val awaiting = openReactionWindow({ ...initialState, spellSlotUsesThisTurn: Set(BattleCommittedSpellSlotUse(Fighter)) }, {
      trigger: SpellCast,
      procedure: ShieldReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    assert(resolveReactionOffer(awaiting, Fighter) == awaiting)
  }

  run test_counterspell_reaction_spell_ends_spell_cast_window_and_wastes_casting_action = {
    val awaiting = openReactionWindow(initialState, {
      trigger: SpellCast,
      procedure: CounterspellReactionProcedure({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellLevel: 1,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
      }),
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    val resolved = resolveReactionOffer(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(not(battleActorHasSpellSlotUse(resolved, Fighter))),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.hp == 10),
    }
  }

  run test_counterspell_reaction_spell_failed_save_gate_resumes_triggering_spell = {
    val awaiting = openReactionWindow(initialState, {
      trigger: SpellCast,
      procedure: CounterspellReactionProcedure({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellLevel: 4,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastNotCountered,
      }),
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    val resolved = resolveReactionOffer(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.hp == 6),
    }
  }

  run test_counterspell_reaction_spell_can_be_counterspelled_before_slot_commit = {
    val awaiting = openReactionWindow(initialState, {
      trigger: SpellCast,
      procedure: CounterspellReactionProcedure({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellMagicAction,
        triggeringSpellLevel: 1,
        triggeringSpellUsesSlot: false,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastCounteredByReaction({
          reactor: Fighter,
          counterspellSlotLevel: 3,
          counterspellCasterConSaveSucceeded: true,
        }),
      }),
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    val resolved = resolveReactionOffer(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(not(battleActorHasSpellSlotUse(resolved, Goblin))),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.hp == 6),
    }
  }

  run test_counterspell_nested_reaction_requires_reaction_availability = {
    val reactionSpellState = {
      ...initialState,
      fighter: { ...initialState.fighter, reactionAvailable: false },
    }
    val awaiting = openReactionWindow(reactionSpellState, {
      trigger: SpellCast,
      procedure: CounterspellReactionProcedure({
        triggeringCaster: Fighter,
        triggeringCastingResource: CounterspellReaction,
        triggeringSpellLevel: 3,
        triggeringSpellUsesSlot: true,
        counterspellSlotLevel: 3,
        triggeringCasterConSaveSucceeded: true,
        counterspellSpellCastReaction: CounterspellSpellCastCounteredByReaction({
          reactor: Fighter,
          counterspellSlotLevel: 3,
          counterspellCasterConSaveSucceeded: true,
        }),
      }),
      eligibleReactors: Set(Goblin),
      offeredReactors: Set(),
      continuation: ResumeRayOfFrost,
    })
    val resolved = resolveReactionOffer(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(not(resolved.goblin.reactionAvailable)),
      assert(not(battleActorHasSpellSlotUse(resolved, Fighter))),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Goblin)),
    }
  }

  run test_normal_rage_ends_when_drop_to_zero_sets_unconscious = {
    val raging = startRage(initialState, 2).state
    val dropped = { ...raging, fighter: applyDropToZeroHp(raging.fighter) }
    assert(not(fighterHasRage(endTurn(dropped))))
  }

  run test_reckless_attack_activates_on_first_attack_roll_boundary = {
    val reckless = resolveAttackRecklessly(initialState, 15, 10, fighterWeaponAttackDamageRoll(4), true)
    val goblinTurn = endTurn(reckless)
    val fighterTurn = endTurn(goblinTurn)
    all {
      assert(fighterHasRecklessAttack(reckless)),
      assert(goblinAttackAgainstFighterHasAdvantage(goblinTurn)),
      assert(not(fighterHasRecklessAttack(fighterTurn))),
    }
  }

  run test_spell_invocation_slot_spend_distinguishes_prepared_spell_from_cantrip = {
    val magicMissileResourceFacts = repeatedDamageAllocationInvocationResourceFacts({
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
      repeatedEffectCount: magicMissileDartCount(1),
    })
    all {
      assert(expendedSlotsAfterSpellInvocationResource(magicMissileResourceFacts, 0) == 1),
      assert(expendedSlotsAfterInvocation(RayOfFrost, 0) == 0),
      assert(expendedSlotsAfterInvocation(AcidSplash, 0) == 0),
      assert(expendedSlotsAfterInvocation(PoisonSpray, 0) == 0),
      assert(expendedSlotsAfterInvocation(ChillTouch, 0) == 0),
      assert(expendedSlotsAfterInvocation(StarryWisp, 0) == 0),
      assert(expendedSlotsAfterInvocation(SacredFlame, 0) == 0),
      assert(expendedSlotsAfterInvocation(InflictWounds, 0) == 1),
      assert(expendedSlotsAfterInvocation(BurningHands, 0) == 1),
      assert(expendedSlotsAfterInvocation(Fireball, 0) == 1),
      assert(expendedSlotsAfterInvocation(ColorSpray, 0) == 1),
      assert(expendedSlotsAfterInvocation(Entangle, 0) == 1),
      assert(expendedSlotsAfterInvocation(HealingWord, 0) == 1),
      assert(expendedSlotsAfterInvocation(CureWounds, 0) == 1),
      assert(expendedSlotsAfterInvocation(MassHealingWord, 0) == 1),
      assert(expendedSlotsAfterInvocation(Heroism, 0) == 1),
      assert(expendedSlotsAfterInvocation(Bane, 0) == 1),
      assert(expendedSlotsAfterInvocation(Bless, 0) == 1),
      assert(expendedSlotsAfterInvocation(Guidance, 0) == 0),
      assert(expendedSlotsAfterInvocation(Grease, 0) == 1),
      assert(expendedSlotsAfterInvocation(FogCloud, 0) == 1),
      assert(expendedSlotsAfterInvocation(Darkness, 0) == 1),
      assert(expendedSlotsAfterInvocation(Command, 0) == 1),
    }
  }

}
