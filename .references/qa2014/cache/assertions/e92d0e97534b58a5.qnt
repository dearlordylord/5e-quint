// Source: https://rpg.stackexchange.com/q/151315
module _qa_e92d0e97534b58a5 {
  import dnd.* from "./dnd"

  // Flanking grants advantage but does not constitute surprise; Assassinate crit needs actual surprised flag
  run qa_flanking_advantage_not_surprised = {
    val config = TEST_CONFIG
    val creature = freshCreature(20)
    // Non-surprised turn: target has NOT been surprised, Assassinate auto-crit does not apply
    val t = pStartTurn(config, creature, Unarmored, false, 0, false, false)
    // Advantage from flanking modeled via targetRestrained (a clean non-surprise advantage source)
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: true,
      targetProne: false, attackerWithin5ft: true, targetDodging: false,
      targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false, squeezing: false,
      underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    // Attacker has advantage (as flanking would grant) but target is NOT surprised — Assassinate auto-crit blocked
    assert(mods.hasAdvantage == true and t.surprised == false)
  }
  
  // Surprised creature on first turn: surprised flag set, cannot act — Assassinate auto-crit condition met
  run qa_surprised_creature_cannot_act = {
    val config = TEST_CONFIG
    val creature = freshCreature(20)
    val t = pStartTurn(config, creature, Unarmored, true, 0, false, false)
    assert(t.surprised == true and t.actionsRemaining == 0 and t.bonusActionUsed == true)
  }
  
  // Surprise is a first-turn condition only: surprised flag clears after end of surprise turn
  run qa_surprise_limited_to_first_turn = {
    val config = TEST_CONFIG
    val creature = freshCreature(20)
    val surprisedTurn = pStartTurn(config, creature, Unarmored, true, 0, false, false)
    val afterSurprise = pEndSurpriseTurn(surprisedTurn)
    // Assassinate auto-crit applies only while surprised = true; cleared after first turn
    assert(surprisedTurn.surprised == true and afterSurprise.surprised == false)
  }
}
