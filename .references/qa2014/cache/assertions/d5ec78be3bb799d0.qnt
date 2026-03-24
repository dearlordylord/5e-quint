// Source: https://rpg.stackexchange.com/q/134751
module _qa_d5ec78be3bb799d0 {
  import dnd.* from "./dnd"

  // Does radiant damage work in magical darkness?
  // Darkness spell grants no immunity/resistance to radiant; creature takes full damage
  run qa_radiant_damage_in_magical_darkness = {
    val creature = freshCreature(20)
    // Magical darkness provides no radiant immunity, resistance, or vulnerability
    val damaged = pTakeDamage(creature, 10, Radiant, Set(), Set(), Set(), false)
    assert(damaged.hp == 10)
  }
  
  // Does radiant damage work in magical darkness? — damage modifier layer
  // applyDamageModifiers with no darkness-derived sets leaves radiant damage unchanged
  run qa_radiant_no_darkness_modifier = {
    val result = applyDamageModifiers(12, Radiant, Set(), Set(), Set())
    assert(result == 12)
  }
}
