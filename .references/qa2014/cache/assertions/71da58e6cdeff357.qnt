// Source: https://rpg.stackexchange.com/q/57267
module _qa_71da58e6cdeff357 {
  import dnd.* from "./dnd"

  // How can I create a playable monster in DnD 5e? — no Level Adjustment: proficiency bonus is purely level-based, not penalised by race/template
  run qa_no_level_adjustment_profbonus = {
    // 5e has no LA mechanic: a Vampire/Lycanthrope/Half-Dragon at level 5 has the
    // exact same proficiency bonus as any other level-5 character.
    assert(
      proficiencyBonus(1) == 2 and
      proficiencyBonus(5) == 3 and
      proficiencyBonus(20) == 6
    )
  }
  
  // How can I create a playable monster in DnD 5e? — monster race characters use standard ability score generation rules
  run qa_monster_race_point_buy_valid = {
    // Standard array [15,14,13,12,10,8] costs exactly 27 pts; valid for any race
    // including characters built from MM templates (Vampire, Lycanthrope, Half-Dragon).
    assert(pValidPointBuy([15, 14, 13, 12, 10, 8]))
  }
  
  // How can I create a playable monster in DnD 5e? — ASI progression is identical for monster race characters
  run qa_monster_race_asi_levels = {
    // No LA means ASI levels are unchanged: 4, 8, 12, 16, 19 for all characters.
    assert(
      pIsASILevel(4)  and
      pIsASILevel(8)  and
      pIsASILevel(12) and
      pIsASILevel(16) and
      pIsASILevel(19) and
      not(pIsASILevel(1)) and
      not(pIsASILevel(5))
    )
  }
}
