// Source: https://rpg.stackexchange.com/q/112178
module _qa_2dfa82954e729538 {
  import dnd.* from "./dnd"

  // With the crossbow expert feat can I still gain advantage from flanking?
  
  // Baseline: ranged attack within 5ft of a hostile imposes disadvantage (what crossbow expert removes)
  run qa_crossbow_ranged_close_quarters_disadv_baseline = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: true,
      beyondNormalRange: false,
      hostileWithin5ft: true,   // no crossbow expert feat
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // Hex flanking rule grants advantage on ALL attack rolls (not just melee); crossbow expert
  // removes close-quarters disadv (hostileWithin5ft=false); net result is advantage
  run qa_hex_flanking_crossbow_expert_ranged_has_advantage = {
    // Hex flanking: "advantage on attack rolls" (any attack).
    // Model: advantage source present, crossbow expert removes the only disadv source.
    val adv = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false })
    assert(adv.hasAdvantage and not(adv.hasDisadvantage))
  }
  
  // Square flanking rule grants advantage on MELEE attack rolls only; ranged gets no flanking adv;
  // crossbow expert (hostileWithin5ft=false) removes disadv => neutral normal roll
  run qa_square_flanking_crossbow_expert_ranged_neutral = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: true,
      beyondNormalRange: false,
      hostileWithin5ft: false,  // crossbow expert: close-quarters disadv negated
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    // Square flanking does not give ranged attacks advantage; no other sources => normal roll
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
  
  // Hex flanking WITHOUT crossbow expert: advantage (flanking) + disadvantage (within 5ft ranged)
  // cancel each other out => normal roll per PHB advantage rules
  run qa_hex_flanking_no_feat_adv_disadv_cancel = {
    val adv = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    assert(not(adv.hasAdvantage) and not(adv.hasDisadvantage))
  }
}
