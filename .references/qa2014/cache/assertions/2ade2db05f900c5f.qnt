// Source: https://rpg.stackexchange.com/q/212470
module _qa_2ade2db05f900c5f {
  import dnd.* from "./dnd"

  // Fireball or fire spells vs. Sleet Storm: instantaneous fire (Fireball) deals full damage, not suppressed
  run qa_sleet_storm_fireball_full_damage = {
    // Sleet Storm douses exposed flames but does not suppress instantaneous spells.
    // Fireball resolves instantly — no fire immunity or resistance from Sleet Storm applies.
    val creature = freshCreature(30)
    val result = pTakeDamage(creature, 20, Fire, Set(), Set(), Set(), false)
    assert(result.hp == 10)
  }
  
  // Fireball or fire spells vs. Sleet Storm: failed DEX save on entering/starting turn causes prone
  run qa_sleet_storm_failed_dex_save_causes_prone = {
    // Sleet Storm: creature starts turn in area, fails DEX save (roll 8, DEX +1, DC 15 → 9 < 15) → falls prone.
    val savePassed = saveSucceeds(8, 1, false, 2, 0, 15)
    val creature = freshCreature(20)
    val result = if (not(savePassed)) pApplyCondition(creature, CProne) else creature
    assert(not(savePassed) and result.prone)
  }
  
  // Fireball or fire spells vs. Sleet Storm: duration fire spell (Wall of Fire) concentration ends on failed CON save
  run qa_sleet_storm_concentration_broken_on_failed_save = {
    // Sleet Storm: creature concentrating on Wall of Fire starts turn in area, fails CON save → loses concentration.
    // This models the mechanism by which ongoing "exposed flame" duration spells are effectively extinguished.
    val slots = FRESH_SPELL_SLOTS.with("concentrationSpellId", "wall_of_fire")
    val afterCheck = pConcentrationCheck(slots, false)
    assert(not(isConcentrating(afterCheck)))
  }
}
