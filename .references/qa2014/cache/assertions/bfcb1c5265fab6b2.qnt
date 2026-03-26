// Source: https://rpg.stackexchange.com/q/79198
module _qa_bfcb1c5265fab6b2 {
  import dnd.* from "./dnd"

  // Can a character be surprised mid-combat?
  // Surprise only occurs at start of encounter; hidden attacker can still gain advantage mid-combat.
  
  // A creature whose turn starts normally in ongoing combat (not surprised) retains full action economy
  run qa_no_surprise_mid_combat_full_turn = {
    val monster = freshCreature(20)
    // mid-combat turn: isSurprised = false — monster was never surprised this encounter
    val t = pStartTurn(TEST_CONFIG, monster, Unarmored, false, 0, false, false)
    assert(
      not(t.surprised)
      and t.actionsRemaining > 0
      and not(t.bonusActionUsed)
      and t.reactionAvailable
      and t.movementRemaining > 0
    )
  }
  
  // Contrast: a creature that IS surprised at encounter start loses its action, bonus action, movement, and reaction
  run qa_surprise_only_at_encounter_start = {
    val creature = freshCreature(20)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, true, 0, false, false)
    assert(
      t.surprised
      and t.actionsRemaining == 0
      and t.bonusActionUsed
      and t.movementRemaining == 0
      and not(t.reactionAvailable)
    )
  }
  
  // Hidden attacker emerging from wagon: monster can't see attacker → advantage on attack roll
  run qa_hidden_wagon_attacker_gets_advantage = {
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
      targetCanSeeAttacker: false, // monster has no line of sight to wagon-hidden attacker
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
    assert(mods.hasAdvantage and not(mods.hasDisadvantage) and not(mods.autoMiss))
  }
  
  // With advantage, hidden wagon attacker's attack hits at roll 11 vs AC 16 + STR bonus
  run qa_hidden_attacker_advantage_roll_hits = {
    // Advantage roll: picked the higher of two dice (e.g. 15 out of [15, 8])
    val result = resolveAttackRoll(15, 3, 16, 0)
    assert(result.hits and not(result.isCritical))
  }
}
