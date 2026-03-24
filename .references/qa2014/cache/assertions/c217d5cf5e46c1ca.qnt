// Source: https://rpg.stackexchange.com/q/181662
module _qa_c217d5cf5e46c1ca {
  import dnd.* from "./dnd"

  // Are there any penalties for fighting in the same 5ft space?
  run qa_squeezing_costs_extra_movement = {
    // PHB: while squeezing, spend 1 extra foot for every foot moved (multiplier = 2)
    val cost = pMovementCost(false, false, false, false, true)
    assert(cost == 2)
  }
  
  // Are there any penalties for fighting in the same 5ft space?
  run qa_squeezing_gives_attack_disadvantage = {
    // PHB: squeezing creature has disadvantage on attack rolls
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
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      squeezing: true,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // Are there any penalties for fighting in the same 5ft space?
  run qa_squeezing_mutual_adv_disadv_cancel = {
    // Both creatures squeezing and attacking each other:
    // each has disadv (squeezing) + adv (attacks against a squeezing target).
    // PHB: any source of adv + any source of disadv = neither, regardless of how many sources.
    val resolved = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    assert(not(resolved.hasAdvantage) and not(resolved.hasDisadvantage))
  }
}
