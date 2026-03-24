// Source: https://rpg.stackexchange.com/q/172443
module _qa_bd0cf23bcb9833e7 {
  import dnd.* from "./dnd"

  // Ring of the Ram: what kind of attack does it make? — fixed +7 attack bonus hits when total meets AC
  run qa_ring_of_ram_plus7_hits_ac20_on_13 = {
    // 13 + 7 = 20, meets AC 20 exactly → hits (not a crit)
    val result = resolveAttackRoll(13, 7, 20, 0)
    assert(result.hits == true and result.isCritical == false)
  }
  
  // Ring of the Ram: what kind of attack does it make? — +7 bonus misses when total falls short
  run qa_ring_of_ram_plus7_misses_ac20_on_12 = {
    // 12 + 7 = 19 < AC 20 → misses
    val result = resolveAttackRoll(12, 7, 20, 0)
    assert(result.hits == false)
  }
  
  // Ring of the Ram: what kind of attack does it make? — not a ranged attack, so hostile within 5ft imposes no disadvantage
  run qa_ring_of_ram_not_ranged_no_close_quarters_disadv = {
    // Accepted answer: Ring of the Ram is NOT a ranged attack.
    // Ranged close-quarters penalty (PHB p.195) only applies to ranged attacks.
    // With isRangedAttack: false, even hostileWithin5ft: true must not cause disadvantage.
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
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: true,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      squeezing: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage == false and mods.hasAdvantage == false)
  }
  
  // Ring of the Ram: what kind of attack does it make? — nat20 is always a critical hit regardless of attack type
  run qa_ring_of_ram_nat20_is_crit = {
    val result = resolveAttackRoll(20, 7, 30, 0)
    assert(result.hits == true and result.isCritical == true)
  }
  
  // Ring of the Ram: what kind of attack does it make? — nat1 always misses regardless of bonus
  run qa_ring_of_ram_nat1_always_misses = {
    val result = resolveAttackRoll(1, 7, 1, 0)
    assert(result.hits == false and result.isCritical == false)
  }
}
