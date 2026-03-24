// Source: https://rpg.stackexchange.com/q/74167
module _qa_8e105f70d7ae4e90 {
  import dnd.* from "./dnd"

  // When a Yuan-Ti or Slaad shapechanges, do they retain their class abilities?
  run qa_shapechange_retains_all_stats_except_size = {
    // Rule: shapechange only changes size; spellcasting bonus, spell save DC, spell attack bonus,
    // and proficiency bonus are all preserved — size is the sole exception in the stat block.
    val beforeShapechange = TEST_CONFIG                      // size: Medium
    val afterShapechange  = TEST_CONFIG.with("size", Small)  // size: Small, everything else identical
    assert(
      spellcastingBonus(beforeShapechange) == spellcastingBonus(afterShapechange)
      and spellSaveDC(beforeShapechange) == spellSaveDC(afterShapechange)
      and spellAttackBonus(beforeShapechange) == spellAttackBonus(afterShapechange)
      and proficiencyBonus(beforeShapechange.level) == proficiencyBonus(afterShapechange.level)
    )
  }
}
