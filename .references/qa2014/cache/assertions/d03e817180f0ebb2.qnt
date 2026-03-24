// Source: https://rpg.stackexchange.com/q/167382
module _qa_d03e817180f0ebb2 {
  import dnd.* from "./dnd"

  // Can goblin food of poor quality cause some sort of damage?
  // PHB p.158: poor lifestyle food is sufficient but unpleasant — no poison, damage, or disease mechanics;
  // only squalid/wretched quality triggers disease. Poor quality food counts as eating.
  run qa_poor_quality_food_no_mechanical_effect = {
    val c = freshCreature(20)
    // Poor quality food satisfies the daily food requirement (hasEaten = true).
    // It does NOT apply CPoisoned, deal damage, or cause exhaustion.
    val afterRest = pLongRest(c, 5, true)
    assert(
      afterRest.hp == 20         and  // full HP restored — food caused no damage
      not(afterRest.poisoned)    and  // no poison condition from eating poor quality food
      afterRest.exhaustion == 0  and  // no exhaustion (starvation threshold not crossed)
      not(afterRest.dead)
    )
  }
  
  // Poor quality food vs. no food: only skipping meals triggers starvation exhaustion
  run qa_poor_quality_food_vs_starvation = {
    val c = freshCreature(20)
    // Eating poor quality food: exhaustion unchanged
    val afterEating = pLongRest(c, 5, true)
    // NOT eating at all: starvation exhaustion applies after threshold (modeled as pApplyStarvation)
    val afterStarving = pApplyStarvation(c)
    assert(
      afterEating.exhaustion == 0   and  // poor quality food → no exhaustion
      afterStarving.exhaustion == 1      // skipping food → exhaustion level added
    )
  }
}
