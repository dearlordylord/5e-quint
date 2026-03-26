// Source: https://rpg.stackexchange.com/q/151010
module _qa_956e1eb386527334 {
  import dnd.* from "./dnd"

  // Can you take the Dodge action while prone?
  run qa_prone_creature_can_dodge = {
    // Prone is not incapacitated; pUseAction only blocks on isIncapacitated
    val proneState = pApplyCondition(freshCreature(20), CProne)
    val t1 = pUseAction(FRESH_TURN, proneState, ADodge)
    assert(t1.dodging and t1.actionsRemaining == 0)
  }
  
  // Can you take the Dodge action while prone? - melee attacker within 5ft: prone advantage + dodge disadvantage cancel
  run qa_prone_dodge_melee_adv_disadv_cancel = {
    // targetProne + attackerWithin5ft → advantage; targetDodging + targetCanSeeAttacker → disadvantage; net = neither
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: true, attackerWithin5ft: true,
      targetDodging: true, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false, squeezing: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
  
  // Can you take the Dodge action while prone? - ranged attacker beyond 5ft: disadvantage from prone persists despite dodge
  run qa_prone_dodge_ranged_still_disadvantage = {
    // disadv_targetProneBeyond5ft + disadv_dodging both true; anyAdvantage = false → disadvantage
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: true, attackerWithin5ft: false,
      targetDodging: true, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: true, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false, squeezing: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and mods.hasDisadvantage)
  }
}
