// Source: https://rpg.stackexchange.com/q/135958
module _qa_ffb59f4a5464c115 {
  import dnd.* from "./dnd"

  // Does an Oni get new HP when it changes shape into a humanoid or large giant?
  run qa_change_shape_preserves_hp = {
    // Oni starts at 110 HP, takes 76 damage → 34 HP remaining
    val oni = freshCreature(110)
    val afterDamage = pTakeDamage(oni, 76, Slashing, Set(), Set(), Set(), false)
    // Change Shape: "Other than its size, its statistics are the same in each form"
    // HP is a statistic; no reset occurs — modeled as identity (spec has no HP-resetting shape-change function)
    val afterShapeChange = afterDamage
    assert(afterShapeChange.hp == 34)
  }
}
