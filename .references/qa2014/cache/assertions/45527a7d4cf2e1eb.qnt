// Source: https://rpg.stackexchange.com/q/190359
module _qa_45527a7d4cf2e1eb {
  import dnd.* from "./dnd"

  // Do creatures on a wall of stone bridge get a save when concentration drops? Absent a save, they simply fall.
  run qa_wall_of_stone_fall_no_save = {
    // DM rules no save (e.g., creature is mid-bridge with nothing to grab):
    // creature takes bludgeoning fall damage and lands prone, no prior save.
    val creature = freshCreature(20)
    // ~30 ft fall, dice pre-resolved to 10
    val s1 = pApplyFall(creature, 10, Set(), Set(), Set())
    assert(s1.hp == 10 and s1.prone)
  }
  
  // Creature at the edge might get a DM-granted save; if they fail (or no save given), same outcome.
  run qa_wall_of_stone_fall_unconscious = {
    // 30 damage on 20 maxHp: overflow=10 < maxHp=20, so unconscious not instant death
    val creature = freshCreature(20)
    val s1 = pApplyFall(creature, 30, Set(), Set(), Set())
    assert(s1.hp == 0 and s1.unconscious and s1.prone and not(s1.dead))
  }

  run qa_wall_of_stone_fall_instant_death = {
    // Instant death requires overflow >= maxHp (damage >= 40 for 20 HP creature)
    val creature = freshCreature(20)
    val s1 = pApplyFall(creature, 40, Set(), Set(), Set())
    assert(s1.dead and s1.hp == 0)
  }
}
