// Source: https://rpg.stackexchange.com/q/207285
module _qa_49f1b4c438b8ec1e {
  import dnd.* from "./dnd"

  // What are the effects of magical sleep for a long rest?
  // Magical sleep (8h, ≥1 HP) qualifies: HP is restored to max, no natural-sleep requirement exists
  run qa_magical_sleep_long_rest_restores_hp = {
    val creature = freshCreature(20).with("hp", 8).with("hitDiceRemaining", 2)
    val afterRest = pLongRest(creature, 5, true)
    assert(afterRest.hp == 20)
  }
  
  // What are the effects of magical sleep for a long rest?
  // PHB p.186: "a character must have at least 1 hit point at the start of the rest to gain its benefits"
  run qa_magical_sleep_long_rest_zero_hp_no_benefit = {
    val creature = freshCreature(20).with("hp", 0)
    val afterRest = pLongRest(creature, 5, true)
    assert(afterRest.hp == 0 and afterRest.hitDiceRemaining == 0)
  }
  
  // What are the effects of magical sleep for a long rest?
  // Sleeping creature with ≥1 HP also recovers hit dice (up to half total)
  run qa_magical_sleep_long_rest_hit_dice_recovery = {
    val creature = freshCreature(20).with("hp", 10).with("hitDiceRemaining", 1)
    // totalHitDice=5, remaining=1 → spent=4, maxRecover=max(1,2)=2, recovery=min(4,2)=2
    val afterRest = pLongRest(creature, 5, true)
    assert(afterRest.hitDiceRemaining == 3)
  }
  
  // What are the effects of magical sleep for a long rest?
  // Long rest without food (hasEaten=false) does not reduce exhaustion
  run qa_magical_sleep_long_rest_no_food_no_exhaustion_reduction = {
    val creature = freshCreature(20).with("hp", 15).with("exhaustion", 2).with("hitDiceRemaining", 5)
    val afterRest = pLongRest(creature, 5, false)
    assert(afterRest.exhaustion == 2)
  }
}
