// Source: https://rpg.stackexchange.com/q/137980
module _qa_e81aa06b835cc3f2 {
  import dnd.* from "./dnd"

  // How to handle initiative for a sleeping creature? — unconscious creature is incapacitated and cannot act
  run qa_unconscious_is_incapacitated_cannot_act = {
    val sleeping = pApplyCondition(freshCreature(20), CUnconscious)
    assert(isIncapacitated(sleeping) and not(pCanAct(sleeping)))
  }
  
  // How to handle initiative for a sleeping creature? — melee attacker within 5ft vs unconscious target gets advantage and autoCrit
  run qa_unconscious_target_melee_advantage_autoCrit = {
    val sleeping = pApplyCondition(freshCreature(20), CUnconscious)
    val mods = pDefenseModifiers(sleeping, true)
    assert(mods.attackerAdvantage and mods.autoCrit)
  }
  
  // How to handle initiative for a sleeping creature? — ranged attacker beyond 5ft vs unconscious target gets advantage but no autoCrit
  run qa_unconscious_target_ranged_advantage_no_autoCrit = {
    val sleeping = pApplyCondition(freshCreature(20), CUnconscious)
    val mods = pDefenseModifiers(sleeping, false)
    assert(mods.attackerAdvantage and not(mods.autoCrit))
  }
  
  // How to handle initiative for a sleeping creature? — surprised creature cannot move, act, or use reaction on first turn
  run qa_surprised_first_turn_fully_locked = {
    val creature = freshCreature(20)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, true, 0, false, false)
    assert(t.actionUsed and t.bonusActionUsed and t.movementRemaining == 0 and not(t.reactionAvailable))
  }
  
  // How to handle initiative for a sleeping creature? — after surprised turn ends, reaction becomes available again
  run qa_end_surprise_turn_restores_reaction = {
    val creature = freshCreature(20)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, true, 0, false, false)
    val t2 = pEndSurpriseTurn(t)
    assert(t2.reactionAvailable and not(t2.surprised))
  }
  
  // How to handle initiative for a sleeping creature? — incapacitated creature's pUseAction is a no-op even with action available
  run qa_incapacitated_action_noop = {
    val sleeping = pApplyCondition(freshCreature(20), CUnconscious)
    val t2 = pUseAction(FRESH_TURN, sleeping, AAttack)
    assert(not(t2.actionUsed))
  }
  
  // How to handle initiative for a sleeping creature? — aggregate attack mods: rogue attacking prone unconscious goblin within 5ft gives advantage + autoCrit
  run qa_aggregate_mods_sleeping_goblin_melee = {
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
      targetUnconscious: true,
      targetRestrained: false,
      targetProne: true,
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: false,
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
    assert(mods.hasAdvantage and mods.autoCrit and not(mods.hasDisadvantage) and not(mods.autoMiss))
  }
}
