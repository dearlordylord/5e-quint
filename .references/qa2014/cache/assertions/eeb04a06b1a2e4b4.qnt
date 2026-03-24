// Source: https://rpg.stackexchange.com/q/214076
module _qa_eeb04a06b1a2e4b4 {
  import dnd.* from "./dnd"

  // "How does the Warlock's invocation Gaze of Two Minds interact with the Unseen rule?"
  // Accepted answer: unseen attacker condition keys on whether the target can see the ATTACKER (warlock),
  // not on where the spell originates — so advantage applies when target cannot see the warlock.
  run qa_unseen_attacker_advantage_gaze_of_two_minds = {
    // Warlock hides behind full cover, casts through fighter's space via GoTM.
    // Target can see the fighter (spell origin) but cannot see the warlock (the actual attacker).
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
      // Target sees the fighter's space but NOT the warlock — unseen attacker rule triggers
      targetCanSeeAttacker: false,
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
    val mods = pAggregateAttackMods(ctx)
    // PHB: "When a creature can't see you, you have Advantage on attack rolls against it."
    // The warlock is the attacker; target cannot see the warlock → advantage, no disadvantage.
    assert(mods.hasAdvantage and not(mods.hasDisadvantage) and not(mods.autoMiss))
  }
}
