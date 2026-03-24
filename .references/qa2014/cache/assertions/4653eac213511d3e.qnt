// Source: https://rpg.stackexchange.com/q/147693
module _qa_4653eac213511d3e {
  import dnd.* from "./dnd"

  // Do ranged weapon attacks against creatures restrained in a Watery Sphere have advantage?
  run qa_watery_sphere_restrained_ranged_outside_water = {
    // Attacker not underwater; target restrained by sphere → advantage applies, no underwater disadv
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
      targetRestrained: true,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: true,
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
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // Do ranged weapon attacks against creatures restrained in a Watery Sphere have advantage?
  run qa_watery_sphere_restrained_ranged_underwater_cancels = {
    // If DM rules attacker IS underwater: restrained adv + underwater ranged disadv cancel to neither
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
      targetRestrained: true,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: true,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      squeezing: false,
      underwater: true,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
  
  // Do ranged weapon attacks against creatures restrained in a Watery Sphere have advantage?
  run qa_watery_sphere_beyond_normal_range_auto_miss = {
    // Beyond normal range underwater → autoMiss regardless of restrained advantage
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
      targetRestrained: true,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: true,
      beyondNormalRange: true,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      squeezing: false,
      underwater: true,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.autoMiss)
  }
}
