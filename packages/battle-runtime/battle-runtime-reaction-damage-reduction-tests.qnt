// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.light-extra-attack-damage-ability-modifier

module battleRuntimeReactionDamageReductionTests {
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeBardicInspiration.* from "./battle-runtime-bardic-inspiration"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"


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
    val twoWeaponFighting = offHandAttackFighterWithDamageAbilityModifierFacts(
      afterAttack,
      15,
      10,
      4,
      3,
      LightExtraAttackNoExistingDamageAbilityModifier,
      true,
      ApplyLightExtraAttackDamageAbilityModifier
    )
    val twoWeaponFightingDeclined = offHandAttackFighterWithDamageAbilityModifierFacts(
      afterAttack,
      15,
      10,
      4,
      3,
      LightExtraAttackNoExistingDamageAbilityModifier,
      true,
      DeclineLightExtraAttackDamageAbilityModifier
    )
    val alreadyAdding = offHandAttackFighterWithDamageAbilityModifierFacts(
      afterAttack,
      15,
      10,
      4,
      3,
      LightExtraAttackExistingDamageAbilityModifier(2),
      true,
      DeclineLightExtraAttackDamageAbilityModifier
    )
    all {
      assert(positive.goblin.hp == 6),
      assert(negative.goblin.hp == 7),
      assert(twoWeaponFighting.goblin.hp == 3),
      assert(twoWeaponFightingDeclined.goblin.hp == 6),
      assert(alreadyAdding.goblin.hp == 4),
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
}
