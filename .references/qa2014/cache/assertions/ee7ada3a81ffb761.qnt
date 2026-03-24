// Source: https://rpg.stackexchange.com/q/99973
module _qa_ee7ada3a81ffb761 {
  import dnd.* from "./dnd"

  // How do you receive damage when you're merged with your raven? - all damage applies to character HP (raven cannot take damage)
  run qa_raven_merge_damage_hits_character_hp = {
    val merged = freshCreature(20)
    val afterDamage = pTakeDamage(merged, 8, Fire, Set(), Set(), Set(), false)
    assert(afterDamage.hp == 12)
  }
  
  // How do you receive damage when you're merged with your raven? - lethal overflow to merged form kills character (raven vanishes on death)
  run qa_raven_merge_lethal_damage_kills_character = {
    val merged = freshCreature(10)
    // overflow (20 - 10 = 10) >= effectiveMaxHp (10) triggers instant death
    val afterDamage = pTakeDamage(merged, 20, Fire, Set(), Set(), Set(), false)
    assert(afterDamage.dead == true)
  }
}
