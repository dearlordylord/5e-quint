// Source: https://rpg.stackexchange.com/q/185674
module _qa_91fe3a56ab3d4fec {
  import dnd.* from "./dnd"

  // Can a rest be taken in a moving cart? — short rest as cart passenger spends hit dice and heals normally
  run qa_short_rest_in_moving_cart = {
    // Passenger in cart has no combat conditions; pShortRest has no strenuous-activity guard.
    // Ruling: sitting in a cart is not strenuous, so short rest proceeds normally.
    val creature = freshCreature(20).with("hp", 10).with("hitDiceRemaining", 3)
    // conMod +2, rolls 6 and 4: heal max(0,6+2)=8 then max(0,4+2)=6 → hp min(10+8,20)=18 → min(18+6,20)=20; hdr 3→1
    val afterRest = pShortRest(creature, 2, [6, 4])
    assert(
      afterRest.hp == 20 and
      afterRest.hitDiceRemaining == 1
    )
  }
  
  // Can a rest be taken in a moving cart? — long rest as cart passenger restores full HP and hit dice
  run qa_long_rest_in_moving_cart = {
    // Passenger in cart performs no strenuous activity; pLongRest has no travel-interruption guard.
    // Ruling: being a passive rider is not strenuous, so long rest proceeds normally.
    val creature = freshCreature(30).with("hp", 12).with("hitDiceRemaining", 2)
    // totalHitDice=5, hasEaten=true; recovery = min(spent=3, maxRecover=2) = 2; hdr 2→4
    val afterRest = pLongRest(creature, 5, true)
    assert(
      afterRest.hp == 30 and
      afterRest.hitDiceRemaining == 4 and
      afterRest.tempHp == 0
    )
  }
}
