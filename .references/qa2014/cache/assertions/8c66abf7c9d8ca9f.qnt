// Source: https://rpg.stackexchange.com/q/192724
module _qa_8c66abf7c9d8ca9f {
  import dnd.* from "./dnd"

  // Can you attack while using Echo Avatar? - ruling: corporeal body is blinded, so attacks have disadvantage
  run qa_echo_avatar_blinded_attacker_has_disadvantage = {
    // Echo Avatar ruling: fighter's corporeal body is treated as blinded for resolving its own attacks
    val ctx: AttackContext = {
      attackerBlinded: true,
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
      attackerCanSeeTarget: false,
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
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // Can you attack while using Echo Avatar? - magical darkness: blinded(disadv) + unseen(adv) cancel to straight roll
  run qa_echo_avatar_darkness_adv_disadv_cancel = {
    // Fighter in magical darkness: blinded → disadvantage; target can't see fighter → advantage; they cancel
    val ctx: AttackContext = {
      attackerBlinded: true,
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
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: false,
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
  
  // Can you attack while using Echo Avatar? - CBlinded condition gives disadvantage on own attack rolls
  run qa_echo_avatar_blinded_condition_own_attack_mods = {
    val creature = freshCreature(20)
    val blinded = pApplyCondition(creature, CBlinded)
    val mods = pOwnAttackModifiers(blinded, false)
    assert(mods.hasDisadvantage)
  }
}
