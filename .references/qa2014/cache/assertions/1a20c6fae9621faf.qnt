// Source: https://rpg.stackexchange.com/q/111231
module _qa_1a20c6fae9621faf {
  import dnd.* from "./dnd"

  // Ring of Water Walking does not render acid harmless (unlike Water Walk spell): acid damage still applies
  run qa_ring_of_water_walking_no_acid_immunity = {
    val creature = freshCreature(30)
    // Ring grants no immunity/resistance to Acid — damage goes through unmodified
    val afterDamage = pTakeDamage(creature, 10, Acid, Set(), Set(), Set(), false)
    assert(afterDamage.hp == 20)
  }
  
  // Water Walk spell explicitly grants harmless traversal — modelled as Acid immunity; no damage taken
  run qa_water_walk_spell_acid_immunity = {
    val creature = freshCreature(30)
    // Water Walk says "harmless solid ground" — Acid immunity represents that protection
    val afterDamage = pTakeDamage(creature, 10, Acid, Set(), Set(), Set(Acid), false)
    assert(afterDamage.hp == 30)
  }
}
