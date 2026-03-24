// Source: https://rpg.stackexchange.com/q/213277
module _qa_70b5e3d804e5b3b2 {
  import dnd.* from "./dnd"

  // Attack Action: Can you equip or unequip more than one weapon using the Extra Attack feature or free object interaction?
  run qa_free_interaction_not_consumed_by_attack_or_extra_attack = {
    // The per-attack equip/unequip and the free object interaction are tracked separately.
    // After using the Attack action and burning the extra attack (2 total attacks),
    // freeInteractionUsed must still be false — the turn-level free interaction is untouched.
    val creature = freshCreature(20)
    val t0 = FRESH_TURN   // extraAttacksRemaining: 1, freeInteractionUsed: false
    val t1 = pUseAction(t0, creature, AAttack)   // base attack
    val t2 = pUseExtraAttack(t1)                 // extra attack (Fighter 5 / FExtraAttack)
    assert(
      t2.attackActionUsed      == true  and
      t2.extraAttacksRemaining == 0     and
      t2.freeInteractionUsed   == false           // free interaction is separate
    )
  }
  
  // Attack Action: The free object interaction is usable on top of both attacks (the "third manipulation")
  run qa_free_interaction_usable_after_both_attacks = {
    // Accepted answer: draw + throw dagger (2 per-attack manipulations) then draw longsword again
    // (free object interaction) — all three are legal in one turn.
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AAttack)
    val t2 = pUseExtraAttack(t1)
    val t3 = pUseObjectInteraction(t2)   // third manipulation: free interaction
    assert(
      t3.attackActionUsed      == true  and
      t3.extraAttacksRemaining == 0     and
      t3.freeInteractionUsed   == true
    )
  }
  
  // Attack Action: Only one free interaction per turn; second attempt is blocked (requires Use Object action)
  run qa_only_one_free_interaction_per_turn = {
    // PHB: "one free interaction per turn; additional interactions require the Utilize action."
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseObjectInteraction(t0)   // first: free
    val t2 = pUseObjectInteraction(t1)   // second: no-op — blocked, would cost Use Object action
    assert(t1.freeInteractionUsed == true and t2 == t1)
  }
}
