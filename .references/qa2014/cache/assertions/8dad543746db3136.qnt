// Source: https://rpg.stackexchange.com/q/147212
module _qa_8dad543746db3136 {
  import dnd.* from "./dnd"

  // Can PCs be Summoned? — Summoned creatures follow standard 0 HP rules; no special "return to plane" in 5e
  
  // A PC reduced to exactly 0 HP falls unconscious (not dead) and goes prone — standard rule applies to summoned PCs too
  run qa_pc_at_0hp_unconscious_not_dead = {
    val pc = freshCreature(10)
    val s1 = pTakeDamage(pc, 10, Slashing, Set(), Set(), Set(), false)
    assert(s1.hp == 0 and s1.unconscious and s1.prone and not(s1.dead))
  }
  
  // Three failed death saves kills the PC — summoning offers no special protection
  run qa_summoned_pc_dies_on_3_death_save_failures = {
    val pc = freshCreature(10)
    val at0 = pTakeDamage(pc, 10, Slashing, Set(), Set(), Set(), false)
    val s1 = pDeathSave(at0, 5)
    val s2 = pDeathSave(s1, 5)
    val s3 = pDeathSave(s2, 5)
    assert(s3.dead)
  }
  
  // Three successful death saves stabilises the PC — they remain on the field, not "returned to plane"
  run qa_summoned_pc_stabilises_on_3_successes = {
    val pc = freshCreature(10)
    val at0 = pTakeDamage(pc, 10, Slashing, Set(), Set(), Set(), false)
    val s1 = pDeathSave(at0, 15)
    val s2 = pDeathSave(s1, 12)
    val s3 = pDeathSave(s2, 11)
    assert(s3.stable and not(s3.dead) and s3.hp == 0)
  }
  
  // Nat 1 on a death save adds two failures — PCs summoned into combat face real risk
  run qa_summoned_pc_nat1_death_save_two_failures = {
    val pc = freshCreature(10)
    val at0 = pTakeDamage(pc, 10, Slashing, Set(), Set(), Set(), false)
    val s1 = pDeathSave(at0, 1)
    assert(s1.deathSaves.failures == 2 and not(s1.dead))
  }
  
  // Nat 20 on a death save restores 1 HP and consciousness — no planar-return shortcut
  run qa_summoned_pc_nat20_death_save_revives = {
    val pc = freshCreature(10)
    val at0 = pTakeDamage(pc, 10, Slashing, Set(), Set(), Set(), false)
    val s1 = pDeathSave(at0, 20)
    assert(s1.hp == 1 and not(s1.unconscious) and not(s1.dead) and s1.deathSaves.failures == 0)
  }
}
