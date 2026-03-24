// Source: https://rpg.stackexchange.com/q/154049
module _qa_be5a9c5c1d7f1dd0 {
  import dnd.* from "./dnd"

  // Can this multiclassed character build combine the Symbiotic Entity feature with unarmed strikes?
  run qa_symbiotic_entity_unarmed_multi_damage_stacks = {
    // Accepted answer: unarmed strikes count as melee weapon attacks, triggering Symbiotic Entity's
    // extra 1d6 poison. All four damage types (Bludgeoning/Poison/Fire/Necrotic) from one hit stack.
    val creature = freshCreature(100)
    // Turn 3 hit: 1d8=5 unarmed + modifier 11 (Dex +5 + prof +6 via Hexblade's Curse),
    // 1d6=4 Poison (Symbiotic Entity), 1d10=7 Fire (Fangs of the Fire Snake), 1d6=3 Necrotic (Hex)
    val dmgBludgeoning = normalDamage(5, 11) // 16
    val dmgPoison      = normalDamage(4, 0)  // 4
    val dmgFire        = normalDamage(7, 0)  // 7
    val dmgNecrotic    = normalDamage(3, 0)  // 3
    val s1 = pTakeDamage(creature, dmgBludgeoning, Bludgeoning, Set(), Set(), Set(), false)
    val s2 = pTakeDamage(s1,       dmgPoison,      Poison,      Set(), Set(), Set(), false)
    val s3 = pTakeDamage(s2,       dmgFire,        Fire,        Set(), Set(), Set(), false)
    val s4 = pTakeDamage(s3,       dmgNecrotic,    Necrotic,    Set(), Set(), Set(), false)
    assert(s4.hp == 100 - (dmgBludgeoning + dmgPoison + dmgFire + dmgNecrotic))
  }
  
  // Can this multiclassed character build combine the Symbiotic Entity feature with unarmed strikes?
  run qa_symbiotic_entity_poison_resistance_isolates_other_types = {
    // Resistance to one damage type (Poison) only halves that component; the other
    // three damage types from the same attack are unaffected — types are independent.
    val creature = freshCreature(100)
    val dmgBludgeoning = normalDamage(5, 11) // 16
    val dmgPoison      = normalDamage(4, 0)  // 4, halved to 2 by Poison resistance
    val dmgFire        = normalDamage(7, 0)  // 7
    val dmgNecrotic    = normalDamage(3, 0)  // 3
    val resistances    = Set(Poison)
    val s1 = pTakeDamage(creature, dmgBludgeoning, Bludgeoning, resistances, Set(), Set(), false)
    val s2 = pTakeDamage(s1,       dmgPoison,      Poison,      resistances, Set(), Set(), false)
    val s3 = pTakeDamage(s2,       dmgFire,        Fire,        resistances, Set(), Set(), false)
    val s4 = pTakeDamage(s3,       dmgNecrotic,    Necrotic,    resistances, Set(), Set(), false)
    // Poison halved (4/2=2), others full: 16+2+7+3=28
    assert(s4.hp == 100 - (dmgBludgeoning + dmgPoison / 2 + dmgFire + dmgNecrotic))
  }
  
  // Can this multiclassed character build combine the Symbiotic Entity feature with unarmed strikes?
  run qa_hexblade_curse_proficiency_bonus_level20 = {
    // Accepted answer: Hexblade's Curse adds proficiency bonus to damage rolls.
    // At total level 20 (5 Druid + 13 Monk + 2 Warlock), proficiency bonus is +6.
    assert(proficiencyBonus(20) == 6)
  }
}
