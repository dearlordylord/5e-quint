// Source: https://rpg.stackexchange.com/q/149531
module _qa_d96bf05513e648d9 {
  import dnd.* from "./dnd"

  // Does a warship make a Constitution saving throw against Shatter, or does it automatically take the damage?
  run qa_shatter_object_auto_damage_no_save = {
    // Non-creature objects (ship components) automatically take full thunder damage - no save allowed
    val shatterDamage = 18 // 3d8 thunder, e.g. 6+6+6
    val objectDamage = applyDamageModifiers(shatterDamage, Thunder, Set(), Set(), Set())
    assert(objectDamage == shatterDamage)
  }
  
  // Does a warship make a Constitution saving throw against Shatter, or does it automatically take the damage?
  run qa_shatter_creature_fails_save_full_damage = {
    // Creature that fails CON save (DC 13) takes full 3d8 thunder damage
    val shatterDamage = 18
    val saveRoll = 4
    val conMod = 1
    val profBonus = 2
    val dc = 13
    val saved = saveSucceeds(saveRoll, conMod, false, profBonus, 0, dc)
    val damageDealt = if (saved) shatterDamage / 2 else shatterDamage
    assert(not(saved) and damageDealt == 18)
  }
  
  // Does a warship make a Constitution saving throw against Shatter, or does it automatically take the damage?
  run qa_shatter_creature_passes_save_half_damage = {
    // Creature that succeeds CON save (DC 13) takes half of 3d8 thunder damage
    val shatterDamage = 18
    val saveRoll = 15
    val conMod = 1
    val profBonus = 2
    val dc = 13
    val saved = saveSucceeds(saveRoll, conMod, false, profBonus, 0, dc)
    val damageDealt = if (saved) shatterDamage / 2 else shatterDamage
    assert(saved and damageDealt == 9)
  }
  
  // Does a warship make a Constitution saving throw against Shatter, or does it automatically take the damage?
  run qa_shatter_component_threshold_exceeded_takes_damage = {
    // Ship component with damage threshold 10: 3d8=15 thunder exceeds threshold -> full damage lands
    val shatterDamage = 15
    val threshold = 10
    // Threshold exceeded: component is NOT immune; damage applies normally
    val effectiveDamage = if (shatterDamage >= threshold)
      applyDamageModifiers(shatterDamage, Thunder, Set(), Set(), Set())
    else
      applyDamageModifiers(shatterDamage, Thunder, Set(Thunder), Set(), Set())
    assert(effectiveDamage == 15)
  }
  
  // Does a warship make a Constitution saving throw against Shatter, or does it automatically take the damage?
  run qa_shatter_component_threshold_not_exceeded_immune = {
    // Ship component with damage threshold 10: 3d8=7 thunder below threshold -> component is immune, 0 damage
    val shatterDamage = 7
    val threshold = 10
    val effectiveDamage = if (shatterDamage >= threshold)
      applyDamageModifiers(shatterDamage, Thunder, Set(), Set(), Set())
    else
      applyDamageModifiers(shatterDamage, Thunder, Set(Thunder), Set(), Set())
    assert(effectiveDamage == 0)
  }
}
