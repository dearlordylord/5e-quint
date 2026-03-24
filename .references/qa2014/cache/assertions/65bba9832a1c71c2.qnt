// Source: https://rpg.stackexchange.com/q/99770
module _qa_65bba9832a1c71c2 {
  import dnd.* from "./dnd"

  // Wizard/Sorcerer can pick any simple weapon as starting equipment; without weapon proficiency no bonus applies
  run qa_weapon_no_proficiency_omits_prof_bonus = {
    // Level 1 caster, STR mod 0, target AC 13, roll 11
    // Proficient: 11 + profBonus(1)=2 = 13 >= 13 → hits
    // Not proficient (chose a non-proficient simple weapon): 11 + 0 = 11 < 13 → misses
    val profBonus   = proficiencyBonus(1)
    val withProf    = resolveAttackRoll(11, profBonus, 13, 0)
    val withoutProf = resolveAttackRoll(11, 0, 13, 0)
    assert(withProf.hits and not(withoutProf.hits))
  }
}
