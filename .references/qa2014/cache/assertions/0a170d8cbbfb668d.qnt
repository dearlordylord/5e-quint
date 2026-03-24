// Source: https://rpg.stackexchange.com/q/120418
module _qa_0a170d8cbbfb668d {
  import dnd.* from "./dnd"

  // How do I create an Accursed Specter? — warlock must deal the killing blow (reduce humanoid to dead)
  run qa_accursed_specter_killing_blow = {
    // Humanoid with maxHp 10 is at 1 HP; warlock deals 11 necrotic damage.
    // Overflow (10) >= maxHp (10) → instant death, satisfying the "slay" requirement.
    val humanoid = freshCreature(10).with("hp", 1)
    val afterBlow = pTakeDamage(humanoid, 11, Necrotic, Set(), Set(), Set(), false)
    assert(afterBlow.dead and afterBlow.hp == 0)
  }
}
