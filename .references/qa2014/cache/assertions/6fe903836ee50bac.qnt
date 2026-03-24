// Source: https://rpg.stackexchange.com/q/123421
module _qa_6fe903836ee50bac {
  import dnd.* from "./dnd"

  // How to increase survivability in Wild Shape? — Barbarian Rage resistance halves bludgeoning/piercing/slashing
  run qa_wild_shape_rage_resistance_halves_bps = {
    val creature = freshCreature(40)
    val rageResistances = Set(Bludgeoning, Piercing, Slashing)
    val afterBludgeoning = pTakeDamage(creature, 20, Bludgeoning, rageResistances, Set(), Set(), false)
    val afterSlashing    = pTakeDamage(creature, 20, Slashing,    rageResistances, Set(), Set(), false)
    val afterPiercing    = pTakeDamage(creature, 20, Piercing,    rageResistances, Set(), Set(), false)
    // 20 damage halved to 10 each; 40 - 10 = 30
    assert(afterBludgeoning.hp == 30 and afterSlashing.hp == 30 and afterPiercing.hp == 30)
  }
  
  // How to increase survivability in Wild Shape? — Bear Totem (Path of Totem Warrior 3) resists all except psychic
  run qa_wild_shape_bear_totem_resists_all_except_psychic = {
    val creature = freshCreature(30)
    // Bear totem grants resistance to all damage types except psychic
    val bearResistances = Set(Acid, Bludgeoning, Cold, Fire, Force,
                              Lightning, Necrotic, Piercing, Radiant, Slashing, Thunder)
    val afterFire    = pTakeDamage(creature, 10, Fire,    bearResistances, Set(), Set(), false)
    val afterPsychic = pTakeDamage(creature, 10, Psychic, bearResistances, Set(), Set(), false)
    // Fire is resisted: 10/2=5 damage → 30-5=25 HP
    // Psychic is NOT resisted: 10 damage → 30-10=20 HP
    assert(afterFire.hp == 25 and afterPsychic.hp == 20)
  }
  
  // How to increase survivability in Wild Shape? — Resistance and vulnerability on same type cancel to normal damage
  run qa_wild_shape_resist_vuln_cancel = {
    val creature = freshCreature(30)
    // If a beast somehow had both resistance and vulnerability to fire (edge case)
    val result = pTakeDamage(creature, 10, Fire, Set(Fire), Set(Fire), Set(), false)
    // resist: 10/2=5, then vuln: 5*2=10 → net normal damage, 30-10=20
    assert(result.hp == 20)
  }
}
