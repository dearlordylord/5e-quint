// Source: https://rpg.stackexchange.com/q/132964
module _qa_b4ff8739568aec2f {
  import dnd.* from "./dnd"

  // Does Crossbow Expert let me fire a hand crossbow as a bonus action after using a one-handed weapon's versatile property?
  run qa_versatile_is_not_twohanded_property = {
    // PHB pp.146-7: Versatile and TwoHanded are distinct properties; wielding a
    // versatile weapon with two hands does not reclassify it as a two-handed weapon.
    val longsword: Weapon = {
      name: "longsword",
      damageDie: 8,
      versatileDie: 10,
      damageType: Slashing,
      properties: Set(Versatile),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    assert(
      longsword.properties.contains(Versatile) and
      not(longsword.properties.contains(TwoHanded))
    )
  }
  
  // Does Crossbow Expert let me fire a hand crossbow as a bonus action after using a one-handed weapon's versatile property?
  run qa_attack_action_does_not_consume_bonus_action = {
    // Taking the Attack action with a one-handed weapon leaves the bonus action untouched,
    // so the Crossbow Expert bonus action attack slot is still available.
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, AAttack)
    assert(t1.actionsRemaining == 0 and t1.attackActionUsed and not(t1.bonusActionUsed))
  }
  
  // Does Crossbow Expert let me fire a hand crossbow as a bonus action after using a one-handed weapon's versatile property?
  run qa_free_object_interaction_does_not_consume_bonus_action = {
    // Drawing the hand crossbow via free object interaction (after the Attack action) does
    // not spend the bonus action — but per the accepted answer the sequence still fails
    // because Crossbow Expert requires holding the crossbow WHEN the Attack action is taken,
    // not merely before the bonus action fires.  The spec does not model the holding
    // requirement directly; this test covers the action-economy side only.
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, AAttack)
    val t2 = pUseObjectInteraction(t1)           // "draw the loaded hand crossbow"
    assert(
      t2.attackActionUsed and
      t2.freeInteractionUsed and
      not(t2.bonusActionUsed)
    )
  }
}
