// Source: https://rpg.stackexchange.com/q/209324
module _qa_c838b0c4a5deb5a0 {
  import dnd.* from "./dnd"

  // When is Animate Objects more effective than Fireball?
  
  // Animate Objects tiny objects attack at +8; minimum d20 roll to hit AC 20 is 12
  run qa_animate_objects_ac20_hit_threshold = {
    val hit  = resolveAttackRoll(12, 8, 20, 0)
    val miss = resolveAttackRoll(11, 8, 20, 0)
    assert(hit.hits == true and hit.isCritical == false
       and miss.hits == false)
  }
  
  // Each tiny Animate Objects object deals 1d4+4; damage range is 5–8 per hit
  run qa_animate_objects_per_attack_damage_range = {
    val minDmg = normalDamage(1, 4)
    val maxDmg = normalDamage(4, 4)
    assert(minDmg == 5 and maxDmg == 8)
  }
  
  // Fireball 5th level (10d6): full damage on failed DEX save, half on success
  run qa_fireball_5th_level_save_damage = {
    val avgRoll    = 35   // average 10d6
    val fullDamage = normalDamage(avgRoll, 0)
    val halfDamage = normalDamage(avgRoll / 2, 0)   // floor half on save
    assert(fullDamage == 35 and halfDamage == 17)
  }
  
  // Animate Objects requires concentration; starting it replaces existing concentration
  run qa_animate_objects_replaces_concentration = {
    val ss0 = FRESH_SPELL_SLOTS.with("concentrationSpellId", "bless")
    val ss1 = pStartConcentration(ss0, "animate_objects")
    assert(ss1.concentrationSpellId == "animate_objects" and isConcentrating(ss1))
  }
  
  // Taking damage while concentrating on Animate Objects: failed con save ends the spell
  run qa_animate_objects_concentration_check = {
    val ss0     = FRESH_SPELL_SLOTS.with("concentrationSpellId", "animate_objects")
    val ssPass  = pConcentrationCheck(ss0, true)
    val ssFail  = pConcentrationCheck(ss0, false)
    assert(
      ssPass.concentrationSpellId == "animate_objects"
      and ssFail.concentrationSpellId == ""
    )
  }
}
