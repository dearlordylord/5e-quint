// Source: https://rpg.stackexchange.com/q/199834
module _qa_9516e62b44fc0a3b {
  import dnd.* from "./dnd"

  // Does the caster of a tiny hut know whom it affects? — invisible ≠ undetectable; Stealth check still required
  run qa_invisible_fiend_fails_stealth_detected = {
    // Imp: Dex+3, Proficient Stealth, profBonus=2 → rolls d20=1, total=6
    // Bard passive Perception: Wis+1, Proficient, profBonus=3, disadvantage (invisible target) → 10+1+3-5=9
    // 6 < 9 → Stealth fails → fiend detectable despite being invisible
    val passivePerc = passiveCheck(1, Proficient, 3, false, true)
    assert(not(checkSucceeds(1, 3, Proficient, 2, 0, passivePerc)))
  }
  
  // Does the caster of a tiny hut know whom it affects? — invisible fiend passes Stealth, evades detection
  run qa_invisible_fiend_passes_stealth_hidden = {
    // Imp: Dex+3, Proficient Stealth, profBonus=2 → rolls d20=15, total=20
    // Bard passive Perception: Wis+1, Proficient, profBonus=3, disadvantage (invisible target) → 9
    // 20 >= 9 → Stealth succeeds → fiend stays undetected
    val passivePerc = passiveCheck(1, Proficient, 3, false, true)
    assert(checkSucceeds(15, 3, Proficient, 2, 0, passivePerc))
  }
  
  // Does the caster of a tiny hut know whom it affects? — very high passive Perception can beat invisible fiend's Stealth
  run qa_high_passive_perception_beats_invisible_stealth = {
    // Scout bard: Wis+3, Expertise in Perception, profBonus=3 → passive = 10+3+6-5=14 (disadvantage, invisible)
    // Imp rolls d20=8, Dex+3, Proficient, profBonus=2 → 8+3+2=13 < 14 → detected
    val passivePerc = passiveCheck(3, Expertise, 3, false, true)
    assert(not(checkSucceeds(8, 3, Proficient, 2, 0, passivePerc)))
  }
}
