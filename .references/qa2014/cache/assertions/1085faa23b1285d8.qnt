// Source: https://rpg.stackexchange.com/q/51266
module _qa_1085faa23b1285d8 {
  import dnd.* from "./dnd"

  // Why would I ever cast True Strike? — advantage from True Strike cancels pre-existing disadvantage (PHB: any adv + any disadv = neither)
  run qa_true_strike_cancels_disadvantage = {
    val resolved = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    assert(not(resolved.hasAdvantage) and not(resolved.hasDisadvantage))
  }
  
  // Why would I ever cast True Strike? — at breakeven threshold (need 9+): roll of 8 misses, roll of 9 hits; True Strike lets you use the higher die
  run qa_true_strike_breakeven_threshold = {
    // attack bonus +5, AC 14 → need exactly d20=9 to connect
    val miss = resolveAttackRoll(8, 5, 14, 0)
    val hit  = resolveAttackRoll(9, 5, 14, 0)
    assert(not(miss.hits) and hit.hits and not(hit.isCritical))
  }
  
  // Why would I ever cast True Strike? — True Strike advantage + poisoned disadvantage cancel; result is straight roll, not disadvantaged
  run qa_true_strike_overcomes_disadvantage_source = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: true,          // disadvantage source on attacker
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
      targetCanSeeAttacker: false,     // attacker unseen by target → advantage (True Strike equivalent source)
      attackerCanSeeTarget: true,
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
    // adv and disadv cancel: straight roll, not disadvantaged
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
}
