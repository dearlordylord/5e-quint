// Source: https://rpg.stackexchange.com/q/209967
module _qa_327bab133edbb811 {
  import dnd.* from "./dnd"

  // Could a creature use a spell like Plane Shift or Word of Recall to escape the Maze spell?
  run qa_maze_target_not_incapacitated_can_cast = {
    // Maze imposes no incapacitation; target retains full use of actions,
    // can speak (verbal components), and can provide somatic components with a free hand.
    val mazeTarget = freshCreature(30)
    assert(
      not(isIncapacitated(mazeTarget))
      and pCanAct(mazeTarget)
      and pCanSpeak(mazeTarget)
      and pCanProvideComponents(mazeTarget, true, true, true)
    )
  }
  
  // Contrast: incapacitated creature (e.g., Banishment's target) cannot use actions to cast
  run qa_incapacitated_target_cannot_cast_escape_spell = {
    // Banishment incapacitates its target; that creature cannot use actions to self-banish or teleport out
    val bannedTarget = pApplyCondition(freshCreature(30), CIncapacitated)
    assert(
      isIncapacitated(bannedTarget)
      and not(pCanAct(bannedTarget))
    )
  }
}
