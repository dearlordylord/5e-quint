// Source: https://rpg.stackexchange.com/q/188610
module _qa_a5de9fc0b755bd27 {
  import dnd.* from "./dnd"

  // Can Dual Wielder feat sheathe/draw same weapon to free hand for somatic casting while TWF?
  
  // (1) Sheathing the rapier via free object interaction frees a hand for somatic components
  run qa_dual_wielder_somatic_free_hand = {
    val creature = freshCreature(20)
    // After sheathing rapier (free object interaction), hasFreeHand=true
    // pCanProvideComponents: somatic (S) component satisfied by free hand
    assert(pCanProvideComponents(creature, false, true, true))
  }
  
  // (2) Without a free hand (both occupied), somatic component fails
  run qa_dual_wielder_somatic_no_free_hand = {
    val creature = freshCreature(20)
    // Holding two weapons, no free hand — cannot provide somatic component
    assert(not(pCanProvideComponents(creature, false, true, false)))
  }
  
  // (3) Free object interaction is consumed by the sheathe maneuver
  run qa_dual_wielder_object_interaction_consumed = {
    val t1 = pUseObjectInteraction(FRESH_TURN)
    // First free interaction used; a second sheathe/draw would need Use Object action
    assert(t1.freeInteractionUsed and not(FRESH_TURN.freeInteractionUsed))
  }
  
  // (4) Attack action leaves bonus action available for TWF off-hand attack
  run qa_dual_wielder_attack_leaves_bonus_action = {
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, AAttack)
    // Bonus action not consumed by the Attack action; TWF off-hand is still possible
    assert(pCanTwoWeaponFighting(t1, creature))
  }
  
  // (5) Casting a cantrip as action does NOT mark nonCantripActionSpell,
  //     so bonus action for TWF weapon attack is still legal
  run qa_dual_wielder_cantrip_does_not_block_bonus = {
    // A cantrip uses the action slot (actionsRemaining=0) but does NOT call pMarkNonCantripActionSpell
    // Simulate: action used for cantrip (not AAttack, no attackActionUsed side-effect needed here)
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, ACastSpell)
    // nonCantripActionSpellCast is only set by pMarkNonCantripActionSpell, not by ACastSpell action
    // So canCastBonusActionSpell remains true, and bonus action is still unused
    assert(canCastBonusActionSpell(t1) and not(t1.bonusActionUsed))
  }
}
