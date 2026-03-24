// Source: https://rpg.stackexchange.com/q/160121
module _qa_3f89f00d4b97106a {
  import dnd.* from "./dnd"

  // How exactly does Might of the Master apply your proficiency bonus to your Homunculus Servant?
  run qa_might_of_master_tracks_full_proficiency_bonus = {
    // Accepted answer: bonus = proficiencyBonus(level) - 2, i.e. cumulative increases from the
    // starting proficiency bonus of +2 (+1 at level 5, +2 at level 9, +3 at level 13, +4 at level 17)
    assert(and {
      proficiencyBonus(1)  - 2 == 0,   // level 1:  profBonus +2, no increase yet
      proficiencyBonus(5)  - 2 == 1,   // level 5:  profBonus +3, first increase
      proficiencyBonus(9)  - 2 == 2,   // level 9:  profBonus +4, second increase
      proficiencyBonus(13) - 2 == 3,   // level 13: profBonus +5, third increase
      proficiencyBonus(17) - 2 == 4,   // level 17: profBonus +6, fourth increase
    })
  }
  
  // How exactly does Might of the Master apply your proficiency bonus to your Homunculus Servant?
  run qa_might_of_master_late_acquisition_not_zero = {
    // Accepted answer: bonus is NOT 0 when infusion obtained late; a character who first
    // creates the Homunculus at level 9 still gets the full cumulative bonus (+2), not 0
    assert(proficiencyBonus(9) - 2 == 2)
  }
  
  // How exactly does Might of the Master apply your proficiency bonus to your Homunculus Servant?
  run qa_might_of_master_bonus_equals_prof_minus_base = {
    // Corollary: bonus at any level equals (current profBonus - base profBonus at level 1),
    // so a level-6 character already has a +1 bonus on their servant regardless of when
    // the infusion was learned (profBonus(6)=3, base=2, bonus=1)
    assert(and {
      proficiencyBonus(6)  - proficiencyBonus(1) == 1,
      proficiencyBonus(10) - proficiencyBonus(1) == 2,
      proficiencyBonus(14) - proficiencyBonus(1) == 3,
      proficiencyBonus(18) - proficiencyBonus(1) == 4,
    })
  }
}
