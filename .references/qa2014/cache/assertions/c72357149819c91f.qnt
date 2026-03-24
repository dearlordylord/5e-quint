// Source: https://rpg.stackexchange.com/q/67356
module _qa_c72357149819c91f {
  import dnd.* from "./dnd"

  // The Hiding Rules Contradict Themselves. What Can I Make Of This?
  // Unseen attacker (hidden via Hide action) gets advantage on attacks against creatures that cannot see them (PHB p.195)
  run qa_unseen_attacker_has_advantage = {
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
      targetCanSeeAttacker: false,  // target cannot see attacker (hidden/unseen)
      attackerCanSeeTarget: true,   // attacker can see target
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
    assert(mods.hasAdvantage and not(mods.hasDisadvantage) and not(mods.autoMiss))
  }
  
  // The Hiding Rules Contradict Themselves. What Can I Make Of This?
  // Visible attacker (target can see clearly) does NOT gain advantage from the unseen-attacker rule (PHB p.177 errata)
  run qa_visible_attacker_no_unseen_advantage = {
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
      targetCanSeeAttacker: true,   // target CAN see attacker clearly — not hidden
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
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
  
  // The Hiding Rules Contradict Themselves. What Can I Make Of This?
  // Hide action consumes the action slot — hiding requires using the Hide action (PHB p.192)
  run qa_hide_action_uses_action_slot = {
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, AHide)
    assert(t1.actionUsed and not(t1.attackActionUsed) and not(t1.dodging) and not(t1.disengaged))
  }
  
  // The Hiding Rules Contradict Themselves. What Can I Make Of This?
  // Adv and disadv cancel even when attacker is unseen: e.g. blinded attacker hidden from target (PHB adv/disadv rules)
  run qa_unseen_plus_blinded_attacker_cancels = {
    val ctx: AttackContext = {
      attackerBlinded: true,        // attacker is blinded => disadv on its own rolls
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
      targetCanSeeAttacker: false,  // target can't see blinded attacker => adv
      attackerCanSeeTarget: false,  // blinded attacker can't see target => disadv
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
    // adv (unseen) + disadv (blinded, can't see target) => cancel to neither
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
}
