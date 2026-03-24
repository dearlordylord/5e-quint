// Source: https://rpg.stackexchange.com/q/99513
module _qa_be14e255e587f03c {
  import dnd.* from "./dnd"

  // Command Undead: INT >= 12 is checked at cast time; Feeblemind before casting permanently avoids hourly saves
  run qa_command_undead_int_check_at_cast_time = {
    val wizardLevel = 5
    // Spell save DC = 8 + prof(5) + CHA mod(16) = 8+3+3 = 14
    val commandUndeadDC = 8 + proficiencyBonus(wizardLevel) + abilityModifier(16)
  
    // Vampire (CHA 18, +4) fails the CHA save: roll 7 + 4 = 11 < DC 14
    val vampireChaMod = abilityModifier(18)
    val vampireFailedSave = not(saveSucceeds(7, vampireChaMod, false, proficiencyBonus(wizardLevel), 0, commandUndeadDC))
  
    // Unmodified vampire INT 17 >= 12 → gets hourly repeat saves
    val vampireGetsHourlySaves = 17 >= 12
  
    // Feebleminded vampire (INT 1) fails the same save (CHA unchanged): 7+4 = 11 < 14
    val feebmindedFailedSave = not(saveSucceeds(7, vampireChaMod, false, proficiencyBonus(wizardLevel), 0, commandUndeadDC))
  
    // INT at cast time is 1 (< 12) → condition for hourly saves is NOT met at cast time
    val intAtCast = 1
    val feebmindedGetsHourlySaves = intAtCast >= 12
  
    // Later, Feeblemind wears off and INT is restored to 17 — but the PHB says "has" (present tense)
    // meaning the check was at cast time; cast-time INT was 1, so no retroactive hourly saves
    val retroactiveHourlySaves = intAtCast >= 12
  
    assert(
      vampireFailedSave and
      vampireGetsHourlySaves and
      feebmindedFailedSave and
      not(feebmindedGetsHourlySaves) and
      not(retroactiveHourlySaves)
    )
  }
}
