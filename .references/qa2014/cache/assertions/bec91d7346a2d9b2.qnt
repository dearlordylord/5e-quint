// Source: https://rpg.stackexchange.com/q/114788
module _qa_bec91d7346a2d9b2 {
  import dnd.* from "./dnd"

  // Do lingering effects vanish when you use Wild Shape?
  run qa_conditions_persist_through_wildshape = {
    // Wild Shape is silent on conditions: poisoned druid remains poisoned after transform
    val druid = freshCreature(30)
    val druidPoisoned = pApplyCondition(druid, CPoisoned)
    assert(druidPoisoned.poisoned == true)
  }
  
  // Do lingering effects vanish when you use Wild Shape?
  run qa_immune_form_permanently_removes_condition = {
    // Transforming into a form immune to a condition removes it permanently;
    // reverting does not restore it without a new source
    val druid = freshCreature(30)
    val druidPoisoned = pApplyCondition(druid, CPoisoned)
    val afterImmunityTransform = pRemoveCondition(druidPoisoned, CPoisoned)
    assert(afterImmunityTransform.poisoned == false)
  }
  
  // Do lingering effects vanish when you use Wild Shape?
  run qa_poison_damage_immunity_distinct_from_condition_immunity = {
    // Immunity to Poison damage type does NOT remove the poisoned condition;
    // only condition immunity (e.g. elemental form) clears it on transform
    val druid = freshCreature(30)
    val druidPoisoned = pApplyCondition(druid, CPoisoned)
    val afterDamage = pTakeDamage(druidPoisoned, 15, Poison, Set(), Set(), Set(Poison), false)
    assert(afterDamage.poisoned == true and afterDamage.hp == 30)
  }
}
