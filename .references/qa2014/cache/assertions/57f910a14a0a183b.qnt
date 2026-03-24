// Source: https://rpg.stackexchange.com/q/197169
module _qa_57f910a14a0a183b {
  import dnd.* from "./dnd"

  // What mechanics allow you to target an Unseen Servant?
  // Attacking an unseen target (e.g. unseen servant at a location) imposes disadvantage per PHB p.194
  run qa_attack_unseen_servant_location_gives_disadvantage = {
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
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: false, // servant is invisible/unseen
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
    assert(mods.hasDisadvantage and not(mods.hasAdvantage) and not(mods.autoMiss))
  }
  
  // What mechanics allow you to target an Unseen Servant?
  // Advantage (attacker unseen to servant) and disadvantage (attacker can't see servant) cancel out
  run qa_attack_unseen_servant_mutual_unseen_cancels = {
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
      targetCanSeeAttacker: false, // servant cannot see attacker -> advantage for attacker
      attackerCanSeeTarget: false, // attacker cannot see servant -> disadvantage
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
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
  
  // What mechanics allow you to target an Unseen Servant?
  // Even when targeting an unseen location, a nat 20 always hits and crits (PHB p.194)
  run qa_attack_unseen_servant_nat20_always_hits = {
    val result = resolveAttackRoll(20, 0, 30, 0)
    assert(result.hits and result.isCritical)
  }
  
  // What mechanics allow you to target an Unseen Servant?
  // A nat 1 always misses regardless of attack bonus (wrong location guess or any other miss)
  run qa_attack_unseen_servant_nat1_always_misses = {
    val result = resolveAttackRoll(1, 99, 10, 0)
    assert(not(result.hits) and not(result.isCritical))
  }
}
