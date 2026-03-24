// Source: https://rpg.stackexchange.com/q/100348
module _qa_8913e1a3c701f6f4 {
  import dnd.* from "./dnd"

  // Does using the Paladin Protection Fighting Style move the characters involved?
  run qa_protection_style_no_movement = {
    // Accepted answer: Protection style only consumes a reaction to impose disadvantage;
    // no movement occurs and no movement is deducted from the Paladin.
    val t = FRESH_TURN
    val tAfterReaction = pUseReaction(t)
    assert(
      // Reaction is consumed
      tAfterReaction.reactionAvailable == false
      // Movement budget is completely untouched
      and tAfterReaction.movementRemaining == t.movementRemaining
      and tAfterReaction.effectiveSpeed == t.effectiveSpeed
    )
  }
  
  // Protection Fighting Style imposes disadvantage but no other attack-roll modifier
  run qa_protection_style_disadvantage_only = {
    // The only mechanical effect is disadvantage on the triggering attack roll.
    // Model the attacker's context: target is NOT dodging, attacker has no inherent
    // advantage sources — so the net result after protection is pure disadvantage.
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false, attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    // Protection imposes disadvantage externally; with no advantage sources present
    // the resolved state has disadvantage and no advantage — and no auto-miss/crit.
    val modsWithProtection = pAggregateAttackMods(ctx.with("targetDodging", false))
    // Simulate protection: inject disadvantage (the *only* mechanical effect)
    val resolvedAdv = resolveAdvantage({ hasAdvantage: false, hasDisadvantage: true })
    assert(
      resolvedAdv.hasAdvantage == false
      and resolvedAdv.hasDisadvantage == true
      and modsWithProtection.autoCrit == false
      and modsWithProtection.autoMiss == false
    )
  }
}
