// Source: https://rpg.stackexchange.com/q/148715
module _qa_dc44e15e4e290601 {
  import dnd.* from "./dnd"

  // What effect, if any, do water-creating spells have underwater? - creatures underwater have fire resistance
  run qa_underwater_fire_resistance = {
    val creature = freshCreature(20)
    val result = pTakeDamage(creature, 10, Fire, Set(Fire), Set(), Set(), false)
    assert(result.hp == 15) // 10 fire / 2 (resistance) = 5 damage
  }
  
  // What effect, if any, do water-creating spells have underwater? - melee without swim speed has disadvantage
  run qa_underwater_melee_disadvantage_no_swim_speed = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false, squeezing: false,
      underwater: true, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // What effect, if any, do water-creating spells have underwater? - swim speed negates underwater melee disadvantage
  run qa_underwater_melee_swim_speed_no_disadvantage = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false, squeezing: false,
      underwater: true, attackerHasSwimSpeed: true,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasDisadvantage) and not(mods.hasAdvantage))
  }
  
  // What effect, if any, do water-creating spells have underwater? - ranged attack beyond normal range auto-misses
  run qa_underwater_ranged_beyond_normal_range_auto_miss = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: true, beyondNormalRange: true, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false, squeezing: false,
      underwater: true, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.autoMiss)
  }
}
