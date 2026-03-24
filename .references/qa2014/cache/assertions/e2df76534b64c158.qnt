// Source: https://rpg.stackexchange.com/q/58672
module _qa_e2df76534b64c158 {
  import dnd.* from "./dnd"

  // Changing elements for spells: fire damage against fire-resistant creature takes half (no element-swap exists RAW)
  run qa_fire_resistance_halves_fire_damage = {
    assert(applyDamageModifiers(10, Fire, Set(), Set(Fire), Set()) == 5)
  }
  
  // Changing elements for spells: Elemental Adept (Fire) ignores resistance by passing no resistance set
  run qa_elemental_adept_ignores_fire_resistance = {
    assert(applyDamageModifiers(10, Fire, Set(), Set(), Set()) == 10)
  }
  
  // Changing elements for spells: fire damage is NOT mitigated by cold resistance (can't swap types)
  run qa_wrong_resistance_type_gives_no_mitigation = {
    assert(applyDamageModifiers(10, Fire, Set(), Set(Cold), Set()) == 10)
  }
  
  // Changing elements for spells: fire damage does NOT exploit cold vulnerability (can't swap types to fish for vuln)
  run qa_fire_not_boosted_by_cold_vulnerability = {
    assert(applyDamageModifiers(10, Fire, Set(), Set(), Set(Cold)) == 10)
  }
  
  // Changing elements for spells: fire damage against cold immunity is unblocked (immunity to wrong type is irrelevant)
  run qa_cold_immunity_does_not_block_fire = {
    assert(applyDamageModifiers(10, Fire, Set(Cold), Set(), Set()) == 10)
  }
}
