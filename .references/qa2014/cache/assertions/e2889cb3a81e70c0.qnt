module _qa_e2889cb3a81e70c0 {
  import dnd.* from "./dnd"

  // How does damage from Arms of Hadar get assigned? — PHB p.196: roll damage once, apply same result to all targets
  run qa_area_spell_damage_rolled_once_for_all_targets = {
    val maxHp     = 20
    val damageRoll = 7 // single 2d6 roll, shared across all targets
    val c1 = freshCreature(maxHp)
    val c2 = freshCreature(maxHp)
    val c3 = freshCreature(maxHp)
    val c4 = freshCreature(maxHp)
    val c5 = freshCreature(maxHp)
    val s1 = pTakeDamage(c1, damageRoll, Necrotic, Set(), Set(), Set(), false)
    val s2 = pTakeDamage(c2, damageRoll, Necrotic, Set(), Set(), Set(), false)
    val s3 = pTakeDamage(c3, damageRoll, Necrotic, Set(), Set(), Set(), false)
    val s4 = pTakeDamage(c4, damageRoll, Necrotic, Set(), Set(), Set(), false)
    val s5 = pTakeDamage(c5, damageRoll, Necrotic, Set(), Set(), Set(), false)
    assert(
      s1.hp == s2.hp and s2.hp == s3.hp and s3.hp == s4.hp and s4.hp == s5.hp
      and s1.hp == maxHp - damageRoll
    )
  }
}
