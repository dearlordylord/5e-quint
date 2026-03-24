// Source: https://rpg.stackexchange.com/q/59789
module _qa_78f3cd5cd1a6abe8 {
  import dnd.* from "./dnd"

  // After level 20 I can still take new feats? — 5e level cap is 20; XP table never returns level > 20
  run qa_level_caps_at_20 = {
      assert(
          pLevelForXp(355000) == 20
          and pLevelForXp(385000) == 20
          and pLevelForXp(999999) == 20
      )
  }
  
  // After level 20 I can still take new feats? — no ASI/feat slots exist at levels 21+
  run qa_no_asi_levels_past_20 = {
      assert(
          not(pIsASILevel(21))
          and not(pIsASILevel(24))
          and not(pIsASILevel(28))
          and not(pIsASILevel(32))
      )
  }
}
