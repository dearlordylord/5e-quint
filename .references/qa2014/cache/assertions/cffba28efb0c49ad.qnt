// Source: https://rpg.stackexchange.com/q/117301
module _qa_cffba28efb0c49ad {
  import dnd.* from "./dnd"

  // Can a Druid take a short rest while in wildshape form?
  run qa_druid_short_rest_while_wildshaped = {
    // Rule: nothing prevents short-resting while wildshaped; beast-form Hit Dice
    // may be spent to regain HP exactly as normal short-rest mechanics dictate.
    val beastForm = freshCreature(20).with("hp", 8).with("hitDiceRemaining", 3)
    // CON mod +2; roll a 6 on the hit die — heals 6 + 2 = 8 HP
    val afterRest = pShortRest(beastForm, 2, [6])
    assert(
      afterRest.hp == 16               // 8 + 8 = 16, within maxHp 20
      and afterRest.hitDiceRemaining == 2  // one hit die spent
      and afterRest.hp <= afterRest.maxHp  // never exceeds max
    )
  }
}
