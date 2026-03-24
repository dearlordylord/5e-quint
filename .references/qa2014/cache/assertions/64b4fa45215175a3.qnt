// Source: https://rpg.stackexchange.com/q/57711
module _qa_64b4fa45215175a3 {
  import dnd.* from "./dnd"

  // "What happens after T-Rex Grapples a creature in its mouth?" — restrained target gives attacker advantage; must still roll to hit (no auto-hit)
  run qa_restrained_target_grants_attacker_advantage = {
    // A creature grappled in the T-Rex's mouth is also restrained.
    // Restrained condition → attackers have advantage on rolls against it (PHB p.292).
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
      targetRestrained: true,   // grappled-in-mouth → restrained
      targetProne: false,
      attackerWithin5ft: false, // T-Rex reach is 10 ft
      targetDodging: false,
      targetCanSeeAttacker: true,
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
    assert(mods.hasAdvantage == true and mods.hasDisadvantage == false and mods.autoMiss == false and mods.autoCrit == false)
  }
  
  // "What happens after T-Rex Grapples a creature in its mouth?" — no auto-hit; T-Rex must still roll to hit (low roll misses)
  run qa_restrained_bite_still_requires_roll_to_hit = {
    // RAW: no auto-hit even when target is held in mouth. Roll 3 + 10 bonus = 13 vs AC 15 → miss.
    val result = resolveAttackRoll(3, 10, 15, 0)
    assert(result.hits == false and result.isCritical == false)
  }
  
  // "What happens after T-Rex Grapples a creature in its mouth?" — with advantage, a strong roll hits normally
  run qa_restrained_bite_hits_on_sufficient_roll = {
    // Roll 10 + 10 bonus = 20 vs AC 17 → hits (not a crit, not auto-miss)
    val result = resolveAttackRoll(10, 10, 17, 0)
    assert(result.hits == true and result.isCritical == false)
  }
}
