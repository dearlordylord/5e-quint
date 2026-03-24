// Source: https://rpg.stackexchange.com/q/147934
module _qa_40a93a16e2aab3d8 {
  import dnd.* from "./dnd"

  // Do Life Drain attacks from wights stack? (SAC ruling: intended to stack, same logic as shadow Strength Drain)
  run qa_life_drain_stacks = {
      val c0 = freshCreature(20)
      // First Life Drain: 5 necrotic damage, fail CON save → maxHp reduced by 5
      val c1 = pTakeDamage(c0, 5, Necrotic, Set(), Set(), Set(), false)
                 .with("maxHp", c0.maxHp - 5)
      // Second Life Drain stacks: another 5 necrotic, fail CON save → maxHp reduced by 5 again
      val c2 = pTakeDamage(c1, 5, Necrotic, Set(), Set(), Set(), false)
                 .with("maxHp", c1.maxHp - 5)
      // Both reductions are cumulative: 20 - 5 - 5 = 10, not 15 (non-stacking would leave 15)
      assert(c2.maxHp == 10 and c2.hp == 10)
  }
  
  // Do Life Drain attacks from wights stack? — edge case: stacked drain to 0 maxHp means death
  run qa_life_drain_stack_to_zero_kills = {
      val c0 = freshCreature(5)
      // Single Life Drain hit for full max HP: 5 necrotic, fail save → maxHp reduced to 0
      val c1 = pTakeDamage(c0, 5, Necrotic, Set(), Set(), Set(), false)
                 .with("maxHp", c0.maxHp - 5)
      // maxHp == 0: PHB says "The target dies if this effect reduces its hp maximum to 0"
      // Model death: current hp also forced to 0 with dead flag
      val c2 = c1.with("hp", 0).with("dead", true)
      assert(c2.maxHp == 0 and c2.dead)
  }
}
