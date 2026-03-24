module _qa_cfca21b2eb7752a9 {
  import dnd.* from "./dnd"

  // Mage Slayer: RAW — advantage on saves vs. ongoing spells applies when caster is within 5 ft at save time, not cast time
  run qa_mage_slayer_advantage_at_save_time = {
    // Creature making a WIS save against an ongoing spell (e.g. Evard's Black Tentacles)
    // Level 5, WIS mod +2, not proficient in WIS saves, DC 14
    val wisMod    = 2
    val profBonus = 3
    val dc        = 14
  
    // Two pre-resolved d20 rolls (advantage = caller takes the higher one)
    val rollLow  = 9   // 9  + 2 = 11 — fails DC 14
    val rollHigh = 13  // 13 + 2 = 15 — meets DC 14
  
    // Scenario A: caster NOT within 5 ft at the moment the save is made
    // → no Mage Slayer advantage; single roll used
    val saveNoAdv = saveSucceeds(rollLow, wisMod, false, profBonus, 0, dc)
  
    // Scenario B: caster IS within 5 ft at the moment the save is made (RAW)
    // Even though the spell was cast from range on a prior round,
    // proximity at save-time is what triggers Mage Slayer advantage.
    // E.g. allies dragged the caster adjacent before this round's save.
    val saveWithAdv = saveSucceeds(intMax(rollLow, rollHigh), wisMod, false, profBonus, 0, dc)
  
    assert(not(saveNoAdv) and saveWithAdv)
  }
}
