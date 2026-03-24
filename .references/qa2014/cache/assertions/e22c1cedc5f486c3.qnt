// Source: https://rpg.stackexchange.com/q/158806
module _qa_e22c1cedc5f486c3 {
  import dnd.* from "./dnd"

  // "If multiple sources grant advantage do you have advantage multiple times but still roll +1d20?"
  // Multiple advantage sources collapse to a single boolean; they do not stack mechanically.
  run qa_multiple_advantage_sources_no_stack = {
    // Two independent advantage sources (targetBlinded + targetRestrained) on the same roll
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: true,      // advantage source 1
      targetParalyzed: false, targetPetrified: false, targetStunned: false, targetUnconscious: false,
      targetRestrained: true,   // advantage source 2
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    // Having advantage from two sources still yields exactly one advantage (boolean, not additive)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage) and not(mods.autoMiss))
  }
  
  // "If multiple sources grant advantage do you have advantage multiple times but still roll +1d20?"
  // One disadvantage cancels even multiple advantage sources — PHB: "true even if multiple circumstances impose disadvantage and only one grants advantage or vice versa"
  run qa_one_disadv_cancels_multiple_adv_sources = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: true,   // disadvantage source (just one)
      attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: true,      // advantage source 1
      targetParalyzed: false, targetPetrified: false, targetStunned: false, targetUnconscious: false,
      targetRestrained: true,   // advantage source 2
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    // One disadv cancels all adv sources → neither advantage nor disadvantage
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
  
  // "If multiple sources grant advantage do you have advantage multiple times but still roll +1d20?"
  // resolveAdvantage core rule: any adv + any disadv = neither, regardless of how many sources
  run qa_resolve_advantage_any_plus_any_equals_neither = {
    val resolved = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    assert(not(resolved.hasAdvantage) and not(resolved.hasDisadvantage))
  }
}
