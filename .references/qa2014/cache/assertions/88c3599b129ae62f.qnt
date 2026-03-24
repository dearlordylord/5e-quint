// Source: https://rpg.stackexchange.com/q/127284
module _qa_88c3599b129ae62f {
  import dnd.* from "./dnd"

  // Does a Druid using Wild Shape roll for hit points or take the average?
  // Accepted answer: player's choice — same as PC level-up HP generation (roll or take average).
  // Mechanical claim: either choice yields a valid beast form starting at full HP.
  run qa_wild_shape_hp_player_chooses_roll_or_average = {
    // Brown bear: 4d10+8 — rolled result vs average (30)
    val beastHpRolled = 34   // player rolled 4d10: e.g. 7+8+9+10 + 8 CON
    val beastHpAverage = 30  // average of 4d10+8
  
    val wildShapeRolled  = freshCreature(beastHpRolled)
    val wildShapeAverage = freshCreature(beastHpAverage)
  
    // Both choices: form starts at full HP, HP is positive, and hp == maxHp
    assert(
      wildShapeRolled.hp  == beastHpRolled   and wildShapeRolled.maxHp  == beastHpRolled
      and wildShapeAverage.hp == beastHpAverage and wildShapeAverage.maxHp == beastHpAverage
      and wildShapeRolled.hp  > 0
      and wildShapeAverage.hp > 0
    )
  }
  
  // PHB rule cited by accepted answer: at each level "roll that Hit Die… Alternatively, use the fixed value."
  // pLevelUpHp models this: both rolled and averaged inputs yield valid positive HP.
  run qa_wild_shape_hp_levelup_analogy_roll_and_average_both_valid = {
    val hitDie     = 10   // e.g., Druid uses d8; beast uses its own die type
    val conMod     = 2
    // Path A: player rolls (result 7 on d10)
    val hpRolled   = pLevelUpHp(7, conMod)   // 7 + 2 = 9
    // Path B: player takes average (average of d10 = 5, rounded up) + conMod
    val hpAverage  = pLevelUpHp(6, conMod)   // 6 + 2 = 8  (ceil(10/2)+1 = 6 per PHB)
  
    assert(hpRolled > 0 and hpAverage > 0 and hpRolled >= hpAverage)
  }
}
