// Source: https://rpg.stackexchange.com/q/103723
module _qa_67d084f2792ed3da {
  import dnd.* from "./dnd"

  // Does Aura of Warding protect you from Warding Bond? — Crawford RAI: Warding Bond damage retains original source type
  // Non-spell origin (sword strike, Slashing): "spell resistance" from Aura of Warding does NOT apply
  run qa_warding_bond_non_spell_no_resistance = {
    // Cleric bonded via Warding Bond; ward took 10 Slashing (sword).
    // Transferred damage is Slashing from a non-spell source.
    // Aura of Warding only covers spell damage → resistances set is empty for this transfer.
    val cleric = freshCreature(20)
    val s1 = pTakeDamage(cleric, 10, Slashing, Set(), Set(), Set(), false)
    // Full 10 damage: spell resistance gives no benefit when original source is not a spell
    assert(s1.hp == 10)
  }
  
  // Does Aura of Warding protect you from Warding Bond? — Crawford RAI: spell-sourced damage retains spell classification
  // Spell origin (Fireball, Fire): Aura of Warding resistance DOES apply because original damage was from a spell
  run qa_warding_bond_spell_origin_resistance_applies = {
    // Cleric bonded via Warding Bond; ward took 10 Fire (Fireball).
    // Transferred damage is Fire and retains its spell-source classification.
    // Caller passes Set(Fire) as resistances because Aura of Warding covers this spell-damage transfer.
    val cleric = freshCreature(20)
    val s1 = pTakeDamage(cleric, 10, Fire, Set(Fire), Set(), Set(), false)
    // 10 / 2 = 5 damage: spell resistance halves it
    assert(s1.hp == 15)
  }
}
