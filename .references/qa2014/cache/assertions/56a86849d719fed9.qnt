// Source: https://rpg.stackexchange.com/q/134450
module _qa_56a86849d719fed9 {
  import dnd.* from "./dnd"

  // Can an Abjurer wizard use Projected Ward without Arcane Ward? — No: ward at 0 HP absorbs nothing
  run qa_projected_ward_no_ward_no_absorption = {
    // Arcane Ward modeled as tempHp; ward absent (tempHp=0) means Projected Ward is useless
    val wizard = freshCreature(20).with("tempHp", 0)
    val afterDamage = pTakeDamage(wizard, 6, Force, Set(), Set(), Set(), false)
    // No ward to intercept: full damage reaches HP, tempHp unchanged at 0
    assert(afterDamage.tempHp == 0 and afterDamage.hp == 14)
  }
  
  // Can an Abjurer wizard use Projected Ward without Arcane Ward? — Active ward absorbs before HP
  run qa_projected_ward_active_ward_absorbs = {
    // Arcane Ward with HP remaining (tempHp=10) intercepts damage on behalf of the target
    val wizard = freshCreature(20).with("tempHp", 10)
    val afterDamage = pTakeDamage(wizard, 6, Force, Set(), Set(), Set(), false)
    // Ward (tempHp) absorbs 6 points; HP untouched; tempHp reduced by 6
    assert(afterDamage.tempHp == 4 and afterDamage.hp == 20)
  }
  
  // Can an Abjurer wizard use Projected Ward without Arcane Ward? — Ward at 0 HP, ward exhausted, damage breaks through
  run qa_projected_ward_exhausted_ward_no_absorption = {
    // Ward was reduced to 0 HP earlier; Projected Ward can be "used" but absorbs nothing
    val wizard = freshCreature(20).with("tempHp", 0)
    val afterDamage = pTakeDamage(wizard, 8, Force, Set(), Set(), Set(), false)
    // 0 tempHp = ward cannot absorb; damage passes directly to HP
    assert(afterDamage.hp == 12 and afterDamage.tempHp == 0)
  }
}
