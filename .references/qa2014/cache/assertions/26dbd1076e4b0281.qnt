// Source: https://rpg.stackexchange.com/q/211012
module _qa_26dbd1076e4b0281 {
  import dnd.* from "./dnd"

  // Does Arcane Archer's "Magical Arrow" Ability work against antimagic field?
  run qa_magic_arrow_suppressed_by_antimagic_field = {
    // Antimagic field suppresses Magic Arrow's magic property; arrow reverts to nonmagical;
    // a creature immune to nonmagical Piercing (e.g. lich in antimagic field) takes 0 damage.
    val creature = freshCreature(30)
    // In antimagic field the arrow's conjured magic is suppressed → treated as ordinary nonmagical
    // Piercing. Model the immunity as Piercing immunity (immunity to nonmagical piercing attacks).
    val afterDamage = pTakeDamage(creature, 8, Piercing, Set(), Set(), Set(Piercing), false)
    assert(afterDamage.hp == 30)
  }
}
