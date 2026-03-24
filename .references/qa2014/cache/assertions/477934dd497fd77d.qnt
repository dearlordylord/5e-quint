// Source: https://rpg.stackexchange.com/q/184171
module _qa_477934dd497fd77d {
  import dnd.* from "./dnd"

  // How are Fireball attacks on Iron Golems resolved? - failed save subjects golem to full fire damage, absorption heals full amount
  run qa_fire_absorption_failed_save_heals_full = {
    val golem = freshCreature(100).with("hp", 50)
    // Failed DEX save: golem is subjected to full 8d6 fire damage
    val fireballRoll = 28  // 8d6 result
    val fullDamage = normalDamage(fireballRoll, 0)  // = 28, no spell modifier
    // Fire Absorption: takes no damage, instead regains HP equal to fire damage dealt
    val result = pHeal(golem, fullDamage)
    assert(result.hp == 78)
  }
  
  // How are Fireball attacks on Iron Golems resolved? - successful save halves the damage *before* absorption, so golem heals less
  run qa_fire_absorption_successful_save_heals_half = {
    val golem = freshCreature(100).with("hp", 50)
    val fireballRoll = 28  // same 8d6 roll
    // Successful DEX save: subjected to half damage only; absorption converts that half to healing
    val halfDamage = normalDamage(fireballRoll, 0) / 2  // = 14
    val result = pHeal(golem, halfDamage)
    assert(result.hp == 64)
  }
  
  // How are Fireball attacks on Iron Golems resolved? - save outcome meaningfully changes healing amount (failed > successful)
  run qa_fire_absorption_save_outcome_affects_healing = {
    val golem = freshCreature(100).with("hp", 50)
    val fireballRoll = 28
    val fullDamage  = normalDamage(fireballRoll, 0)       // 28 — failed save
    val halfDamage  = normalDamage(fireballRoll, 0) / 2   // 14 — successful save
    val healedFull  = pHeal(golem, fullDamage)
    val healedHalf  = pHeal(golem, halfDamage)
    assert(healedFull.hp > healedHalf.hp and healedFull.hp == 78 and healedHalf.hp == 64)
  }
  
  // How are Fireball attacks on Iron Golems resolved? - specific (absorption) beats general (immunity): absorption path heals, immunity-only path does nothing
  run qa_fire_absorption_specific_beats_general_immunity = {
    val golem = freshCreature(100).with("hp", 50)
    val fireballRoll = 28
    val fullDamage = normalDamage(fireballRoll, 0)
    // General rule path: pure fire immunity → no HP change
    val immunityOnly = pTakeDamage(golem, fullDamage, Fire, Set(), Set(), Set(Fire), false)
    // Specific rule path: Fire Absorption → HP increases by damage amount
    val absorption   = pHeal(golem, fullDamage)
    assert(
      immunityOnly.hp == golem.hp              // immunity alone: no change
      and absorption.hp == golem.hp + fullDamage  // absorption: heals equal to damage dealt
    )
  }
}
