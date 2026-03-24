// Source: https://rpg.stackexchange.com/q/178360
module _qa_0cecedad34ed8ebc {
  import dnd.* from "./dnd"

  // If I attack with the Fathomless' tentacles on a creature that is unaware of where I am, will it become aware of my warlock?
  run qa_unseen_attacker_advantage_then_revealed = {
    // RAW: caster is the attacker; attacking while hidden gives advantage (target can't see attacker),
    // but making the attack reveals position — afterward the target can see the caster.
    val ctxHidden: AttackContext = {
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
      targetCanSeeAttacker: false, // target cannot see the hidden warlock
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
    val modsHidden = pAggregateAttackMods(ctxHidden)
    // After the melee spell attack is made, caster (the attacker RAW) reveals their position.
    val ctxRevealed: AttackContext = {
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
      targetCanSeeAttacker: true, // position revealed: target now sees the warlock
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
    val modsRevealed = pAggregateAttackMods(ctxRevealed)
    assert(
      // PHB p.195: unseen attacker has advantage on attack rolls against the target
      modsHidden.hasAdvantage == true
      and modsHidden.hasDisadvantage == false
      // once position is revealed (hidden status lost), advantage from being unseen is gone
      and modsRevealed.hasAdvantage == false
      and modsRevealed.hasDisadvantage == false
    )
  }
}
