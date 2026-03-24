// Source: https://rpg.stackexchange.com/q/196896
module _qa_08e310ea9a75fc15 {
  import dnd.* from "./dnd"

  // What is highest Damage/GP poison? — Poison resistance halves damage (per DMG p.257 mechanics note)
  run qa_poison_resistance_halves_damage = {
    val result = applyDamageModifiers(10, Poison, Set(), Set(Poison), Set())
    assert(result == 5)
  }
  
  // What is highest Damage/GP poison? — Poison immunity negates damage entirely (most resisted damage type)
  run qa_poison_immunity_negates_damage = {
    val result = applyDamageModifiers(10, Poison, Set(Poison), Set(), Set())
    assert(result == 0)
  }
  
  // What is highest Damage/GP poison? — commoner (Con 10, no proficiency) fails DC 11 serpent venom save on roll of 10
  run qa_serpent_venom_dc11_commoner_fails_on_roll_10 = {
    val conMod = abilityModifier(10)
    val profBonus = proficiencyBonus(1)
    assert(not(saveSucceeds(10, conMod, false, profBonus, 0, 11)))
  }
  
  // What is highest Damage/GP poison? — same commoner succeeds DC 11 serpent venom save on roll of 11
  run qa_serpent_venom_dc11_commoner_succeeds_on_roll_11 = {
    val conMod = abilityModifier(10)
    val profBonus = proficiencyBonus(1)
    assert(saveSucceeds(11, conMod, false, profBonus, 0, 11))
  }
}
