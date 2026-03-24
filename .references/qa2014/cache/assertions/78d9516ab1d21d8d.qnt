// Source: https://rpg.stackexchange.com/q/171632
module _qa_78d9516ab1d21d8d {
  import dnd.* from "./dnd"

  // How exactly does a Changeling's shapeshifting work?
  run qa_changeling_medium_size_capacity_unchanged = {
    // Trait: "adjust height and weight, but not so much that your size changes"
    // + "none of your game statistics change" → STR and size category stay Medium
    // A changeling with STR 12 has 180lb carrying capacity in any medium form (dwarf or goliath)
    val strScore = 12
    assert(
      carryingCapacity(strScore, Medium) == 180
      // Going Large would double capacity — demonstrating why the size constraint matters
      and carryingCapacity(strScore, Large) == 360
      and carryingCapacity(strScore, Medium) != carryingCapacity(strScore, Large)
    )
  }
  
  // How exactly does a Changeling's shapeshifting work?
  run qa_changeling_speed_stat_unchanged_by_form = {
    // "none of your game statistics change" — speed lives in CharConfig, not in apparent form
    // A changeling's 30ft walk speed is identical whether appearing as a dwarf or a goliath
    val creature = freshCreature(20)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    assert(t.movementRemaining == 30 and t.effectiveSpeed == 30)
  }
  
  // How exactly does a Changeling's shapeshifting work?
  run qa_changeling_push_drag_lift_medium_unchanged = {
    // Push/drag/lift = 2× carrying capacity; also unchanged because STR and size stay Medium
    // The "muscle-bound goliath" appearance grants no extra lift over the "petite dwarf" appearance
    val strScore = 12
    assert(
      pushDragLift(strScore, Medium) == 360
      and pushDragLift(strScore, Medium) == carryingCapacity(strScore, Medium) * 2
    )
  }
}
