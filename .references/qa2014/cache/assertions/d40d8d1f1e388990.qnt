// Source: https://rpg.stackexchange.com/q/92586
module _qa_d40d8d1f1e388990 {
  import dnd.* from "./dnd"

  // Can a caster use a vocal spell while restrained without disadvantage on attack rolls?
  run qa_restrained_spell_attack_has_disadvantage = {
    // Restrained condition imposes disadvantage on ALL attack rolls; no verbal-only exception.
    val creature = pApplyCondition(freshCreature(20), CRestrained)
    val mods = pOwnAttackModifiers(creature, false)
    assert(mods.hasDisadvantage)
  }
  
  // Restrained caster making a ranged spell attack: disadvantage not cancelled by any advantage source
  run qa_restrained_ranged_spell_attack_aggregate = {
    // Even a pure verbal ranged spell attack still has disadvantage; no component exception in PHB.
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: true,
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
    val result = pAggregateAttackMods(ctx)
    assert(result.hasDisadvantage and not(result.hasAdvantage) and not(result.autoMiss))
  }
}
