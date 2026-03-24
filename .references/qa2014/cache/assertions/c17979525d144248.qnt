// Source: https://rpg.stackexchange.com/q/182043
module _qa_c17979525d144248 {
  import dnd.* from "./dnd"

  // Can a wizard prepare new spells while blinded?
  run qa_blinded_wizard_cannot_study_spellbook = {
    // Accepted answer: blinded wizard cannot read spellbook (sight-required activity → autoFail)
    val wizard = pApplyCondition(freshCreature(20), CBlinded)
    val mods = pCheckModifiers(wizard, true, false, false)
    assert(mods.autoFail == true)
  }
  
  // Can a wizard prepare new spells while blinded? (control: unblinded wizard has no auto-fail)
  run qa_sighted_wizard_can_study_spellbook = {
    // Unblinded wizard studying spellbook: sight-required check does not auto-fail
    val wizard = freshCreature(20)
    val mods = pCheckModifiers(wizard, true, false, false)
    assert(mods.autoFail == false)
  }
  
  // Can a wizard prepare new spells while blinded? (spellshard / familiar workaround: sight not required)
  run qa_blinded_wizard_with_non_sight_alternative = {
    // Accepted answer: spellshard or familiar sight bypasses the sight requirement;
    // model as requiresSight=false — autoFail does not trigger even when blinded
    val wizard = pApplyCondition(freshCreature(20), CBlinded)
    val mods = pCheckModifiers(wizard, false, false, false)
    assert(mods.autoFail == false)
  }
}
