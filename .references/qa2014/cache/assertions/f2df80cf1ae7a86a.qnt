// Source: https://rpg.stackexchange.com/q/148187
module _qa_f2df80cf1ae7a86a {
  import dnd.* from "./dnd"

  // When an Adult Gold Dragon changes into an Archmage, what are its saving throw and skill bonuses?
  run qa_polymorph_proficiency_bonus_from_new_form = {
    // Rule: retained proficiencies indicate *where* the bonus applies, but the proficiency
    // bonus value itself comes from the new form, not the original form.
    // Adult Gold Dragon CR 17 → profBonus +6; Archmage CR 12 → profBonus +4.
    // Dragon retains INT/WIS/CHA scores and which saves/skills it is proficient in,
    // but uses the archmage's proficiency bonus for all calculations.
    val dragonProfBonus = proficiencyBonus(17)  // +6
    val archmageProf    = proficiencyBonus(12)  // +4
    val retainedWisMod  = 2                     // dragon WIS 15 → mod +2, retained
    val retainedChaMod  = 7                     // dragon CHA 24 → mod +7, retained
    // Correct bonuses in archmage form use the archmage's proficiency bonus:
    val wisSaveBonus = retainedWisMod + archmageProf   // 2 + 4 = 6  (not 2+6=8)
    val chaSaveBonus = retainedChaMod + archmageProf   // 7 + 4 = 11 (not 7+6=13)
    val insightBonus = retainedWisMod + archmageProf   // Insight is WIS-based: 2 + 4 = 6
    assert(
      dragonProfBonus == 6
      and archmageProf == 4
      and wisSaveBonus == 6
      and chaSaveBonus == 11
      and insightBonus == 6
      // saveSucceeds with archmage prof bonus: 10 + 2 + 4 = 16 >= DC 16 → true
      and saveSucceeds(10, retainedWisMod, true, archmageProf, 0, 16)
      // dragon's old +6 is NOT used; 10 + 2 + 4 = 16 < DC 17 → false
      and not(saveSucceeds(10, retainedWisMod, true, archmageProf, 0, 17))
      // skill check (Insight, WIS-based): proficient + archmage prof bonus
      and checkSucceeds(10, retainedWisMod, Proficient, archmageProf, 0, 16)
      and not(checkSucceeds(10, retainedWisMod, Proficient, archmageProf, 0, 17))
    )
  }
}
