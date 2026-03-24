// Source: https://rpg.stackexchange.com/q/193534
module _qa_d750623dc82a405e {
  import dnd.* from "./dnd"

  // Are Arcane Grimoires destructible? — magic items have resistance to all damage (DMG p.141 Magic Item Resilience)
  run qa_magic_item_resistance_all_damage = {
    val creature = freshCreature(20)
    // Magic item resilience: resistance to ALL damage types
    val afterFire     = pTakeDamage(creature, 10, Fire,     ALL_DAMAGE_TYPES, Set(), Set(), false)
    val afterCold     = pTakeDamage(creature, 10, Cold,     ALL_DAMAGE_TYPES, Set(), Set(), false)
    val afterSlashing = pTakeDamage(creature, 10, Slashing, ALL_DAMAGE_TYPES, Set(), Set(), false)
    // Resistance halves: floor(10/2)=5 damage each → 20-5=15 HP
    assert(afterFire.hp == 15 and afterCold.hp == 15 and afterSlashing.hp == 15)
  }
  
  // Are Arcane Grimoires destructible? — magic item resistance does not grant immunity; sufficient damage destroys it
  run qa_magic_item_still_destructible = {
    val creature = freshCreature(10)
    // 30 fire damage with resistance → floor(30/2)=15 > 10 HP: item reaches 0
    val afterDamage = pTakeDamage(creature, 30, Fire, ALL_DAMAGE_TYPES, Set(), Set(), false)
    assert(afterDamage.hp == 0)
  }
  
  // Are Arcane Grimoires destructible? — without magic item resilience, a normal spellbook takes full damage
  run qa_nonmagic_spellbook_takes_full_damage = {
    val creature = freshCreature(20)
    // No resistance (non-magic item): 10 fire → full 10 damage
    val afterDamage = pTakeDamage(creature, 10, Fire, Set(), Set(), Set(), false)
    assert(afterDamage.hp == 10)
  }
}
