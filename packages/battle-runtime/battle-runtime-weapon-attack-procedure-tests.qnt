// -*- mode: Bluespec; -*-

module battleRuntimeWeaponAttackProcedureTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import attackActionAdditionalAttacks.* from "../shared-algebras/proofs/rule-core/attack-action-additional-attacks"

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
}
