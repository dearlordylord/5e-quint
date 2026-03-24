// Source: https://rpg.stackexchange.com/q/103352
module _qa_eded0efc03e72ea5 {
  import dnd.* from "./dnd"

  // How does a Cloak of Displacement interact with surprise or hidden attacks?
  run qa_unseen_attacker_has_advantage = {
    // PHB p.194-5: when a creature can't see its attacker, the attacker has advantage.
    // A hidden rogue attacking a Cloak of Displacement wearer starts with advantage.
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,   // rogue is hidden — target cannot see attacker
      attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false, squeezing: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // How does a Cloak of Displacement interact with surprise or hidden attacks?
  run qa_hidden_attack_vs_cloak_of_displacement_cancels = {
    // Cloak of Displacement gives disadvantage on all attack rolls against the wearer.
    // Hidden/unseen attacker advantage + Cloak disadvantage cancel to a straight roll.
    // PHB p.173: any source of advantage + any source of disadvantage = neither.
    val resolved = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    assert(not(resolved.hasAdvantage) and not(resolved.hasDisadvantage))
  }
}
