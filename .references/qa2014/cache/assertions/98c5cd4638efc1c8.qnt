// Source: https://rpg.stackexchange.com/q/200858
module _qa_98c5cd4638efc1c8 {
  import dnd.* from "./dnd"

  // What effect does reducing a Spelljamming Vessel to 0 hp have?
  // Accepted: per DMG object rules, objects at 0 HP lose structural integrity (disabled/destroyed)
  run qa_vessel_reduced_to_0hp_becomes_incapacitated = {
    // Ship modeled as creature; exactly-0-HP result = unconscious + incapacitated (non-functional)
    val vessel = freshCreature(20)
    val result = pTakeDamage(vessel, 20, Bludgeoning, Set(), Set(), Set(), false)
    assert(result.hp == 0 and result.unconscious == true and isIncapacitated(result))
  }
  
  // What effect does reducing a Spelljamming Vessel to 0 hp have?
  // Accepted: massive damage overflow >= maxHp destroys the object outright (no incapacitation — just dead)
  run qa_vessel_massive_damage_overflow_is_destroyed = {
    // freshCreature(10): maxHp=10; 20 damage → overflow=10 >= effMax=10 → dead, not merely unconscious
    val vessel = freshCreature(10)
    val result = pTakeDamage(vessel, 20, Bludgeoning, Set(), Set(), Set(), false)
    assert(result.dead == true and result.hp == 0 and not(result.unconscious))
  }
  
  // What effect does reducing a Spelljamming Vessel to 0 hp have?
  // Accepted: once destroyed, the ship cannot be further meaningfully damaged (absorbing state)
  run qa_vessel_destroyed_absorbs_further_damage = {
    val vessel = freshCreature(10)
    // Reduce to dead via overflow
    val destroyed = pTakeDamage(vessel, 20, Bludgeoning, Set(), Set(), Set(), false)
    // Additional damage on a dead object has no effect
    val afterMoreDamage = pTakeDamage(destroyed, 50, Fire, Set(), Set(), Set(), false)
    assert(destroyed.dead == true and afterMoreDamage == destroyed)
  }
}
