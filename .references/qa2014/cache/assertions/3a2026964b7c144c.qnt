// Source: https://rpg.stackexchange.com/q/212626
module _qa_3a2026964b7c144c {
  import dnd.* from "./dnd"

  // Intelligence vs Wisdom in D&D: high Wisdom does not auto-succeed — dice still determine outcome
  run qa_high_wis_insight_can_still_fail = {
    // WIS 16 → mod +3; Proficient; profBonus 2 (level 1); DC 15; roll 1 → 1+3+2=6 < 15
    val wisMod = abilityModifier(16)
    val prof = proficiencyBonus(1)
    assert(
      wisMod == 3
      and not(checkSucceeds(1, wisMod, Proficient, prof, 0, 15))
    )
  }
  
  // Intelligence vs Wisdom in D&D: low Intelligence does not auto-fail — a high roll can still succeed
  run qa_low_int_arcana_can_still_succeed = {
    // INT 10 → mod +0; no proficiency; profBonus 2 (level 1); DC 15; roll 20 → 20+0+0=20 >= 15
    val intMod = abilityModifier(10)
    val prof = proficiencyBonus(1)
    assert(
      intMod == 0
      and checkSucceeds(20, intMod, NoneProf, prof, 0, 15)
    )
  }
  
  // Intelligence vs Wisdom in D&D: proficiency + high ability mod raises success probability but needs sufficient roll
  run qa_wis_insight_proficient_mid_roll_succeeds = {
    // WIS 16 mod+3, Proficient (prof=2), roll 12, DC 15: 12+3+2=17 >= 15 → success
    val wisMod = abilityModifier(16)
    val prof = proficiencyBonus(1)
    assert(checkSucceeds(12, wisMod, Proficient, prof, 0, 15))
  }
  
  // Intelligence vs Wisdom in D&D: same mid roll fails without proficiency and lower modifier
  run qa_low_int_no_prof_mid_roll_fails = {
    // INT 10 mod+0, NoneProf, roll 12, DC 15: 12+0+0=12 < 15 → failure
    val intMod = abilityModifier(10)
    val prof = proficiencyBonus(1)
    assert(not(checkSucceeds(12, intMod, NoneProf, prof, 0, 15)))
  }
}
