// Source: https://rpg.stackexchange.com/q/175773
module _qa_5ab80f451edeafc1 {
  import dnd.* from "./dnd"

  // Does Improved Abjuration affect spells that have a circumstantial ability check?
  run qa_improved_abjuration_only_applies_at_cast_time = {
    // Accepted answer: Improved Abjuration adds proficiency only to checks made
    // as part of casting — not to checks triggered by spell effects after casting.
    val level = 10
    val profBonus = proficiencyBonus(level) // (10-1)/4 + 2 = 4
    val intMod = abilityModifier(18)        // (18-10)/2 = 4
    val dc = 15
    val roll = 10
  
    // Cast-time check (Improved Abjuration applies → Proficient): 10+4+4=18 >= 15 → true
    val castTimeCheck = checkSucceeds(roll, intMod, Proficient, profBonus, 0, dc)
    // Post-cast check (Improved Abjuration does NOT apply → NoneProf): 10+4+0=14 < 15 → false
    val postCastCheck = checkSucceeds(roll, intMod, NoneProf, profBonus, 0, dc)
  
    assert(castTimeCheck and not(postCastCheck))
  }
}
