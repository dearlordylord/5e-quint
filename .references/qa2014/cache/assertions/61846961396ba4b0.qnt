// Source: https://rpg.stackexchange.com/q/92092
module _qa_61846961396ba4b0 {
  import dnd.* from "./dnd"

  // Does sneak attack work against an invisible enemy?
  // Case 1: invisible target only → disadvantage persists → cannot sneak attack despite ally adjacent
  run qa_sneak_attack_invisible_disadv_blocks = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,       // target can see the rogue
      attackerCanSeeTarget: false,      // target is invisible → rogue can't see it
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      squeezing: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    // PHB p.96: sneak attack requires advantage OR (ally adjacent AND no disadvantage on the roll)
    val allyAdjacent = true
    val canSneakAttack = mods.hasAdvantage or (allyAdjacent and not(mods.hasDisadvantage))
    // invisible target → disadvantage with no countervailing advantage → sneak attack blocked
    assert(mods.hasDisadvantage and not(mods.hasAdvantage) and not(canSneakAttack))
  }
  
  // Does sneak attack work against an invisible enemy?
  // Case 2: invisible target + rogue hidden (advantage) + ally adjacent → adv+disadv cancel → sneak attack allowed
  run qa_sneak_attack_invisible_hidden_cancels = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,      // rogue is hidden → target can't see attacker → advantage
      attackerCanSeeTarget: false,      // target is invisible → rogue can't see target → disadvantage
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      squeezing: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    // PHB p.173: adv + disadv cancel to neither
    // PHB p.96: ally adjacent AND no disadvantage → sneak attack allowed
    val allyAdjacent = true
    val canSneakAttack = mods.hasAdvantage or (allyAdjacent and not(mods.hasDisadvantage))
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage) and canSneakAttack)
  }
}
