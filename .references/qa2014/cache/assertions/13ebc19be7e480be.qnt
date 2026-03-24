// Source: https://rpg.stackexchange.com/q/119679
module _qa_13ebc19be7e480be {
  import dnd.* from "./dnd"

  // Does a monk with Extra Attack trigger Martial Arts if only one attack is unarmed?
  run qa_martial_arts_one_unarmed_with_extra_attack = {
    val creature = freshCreature(30)
    // Monk takes the Attack action — one Extra Attack slot used as a grapple (special melee,
    // not an unarmed strike), the other as an unarmed strike.
    // Martial Arts only requires using the Attack action *with* an unarmed strike;
    // it does not require ALL attacks to be unarmed strikes.
    val t1 = pUseAction(FRESH_TURN, creature, AAttack)
    // Consume one extra attack for the unarmed strike portion of the Attack action
    val t2 = pUseExtraAttack(t1)
    // Bonus action must still be free at this point — Martial Arts bonus unarmed strike is available
    val bonusStillFree = t2.attackActionUsed and not(t2.bonusActionUsed)
    // Use the bonus action (Martial Arts unarmed strike)
    val t3 = pUseBonusAction(t2, creature)
    assert(bonusStillFree and t3.bonusActionUsed)
  }
}
