// Source: https://rpg.stackexchange.com/q/187928
module _qa_7dc372649f712a5c {
  import dnd.* from "./dnd"

  // Decanter of Endless Water: aiming geyser costs bonus action, not reaction
  run qa_decanter_aim_uses_bonus_not_reaction = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseBonusAction(t0, creature)
    assert(t1.bonusActionUsed == true and t1.reactionAvailable == true)
  }
  
  // Decanter of Endless Water: only one use per turn — second bonus action is blocked
  run qa_decanter_one_use_per_turn = {
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseBonusAction(t0, creature)
    val t2 = pUseBonusAction(t1, creature)
    // second call is a no-op: state identical to after first use
    assert(t1.bonusActionUsed == true and t2 == t1)
  }
  
  // Decanter of Endless Water: 30 cold damage (30 gallons × 1/5ft susceptibility) applies in full
  run qa_decanter_cold_damage_full = {
    val creature = freshCreature(50)
    val s1 = pTakeDamage(creature, 30, Cold, Set(), Set(), Set(), false)
    assert(s1.hp == 20)
  }
}
