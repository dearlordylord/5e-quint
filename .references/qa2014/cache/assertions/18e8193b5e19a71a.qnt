// Source: https://rpg.stackexchange.com/q/212489
module _qa_18e8193b5e19a71a {
  import dnd.* from "./dnd"

  // Is the "natural disease" phase of Contagion magical?
  run qa_contagion_disease_magical_dispel_removes_poisoned = {
    // Ruling: Contagion's disease persists for the spell's duration → it is a
    // magical effect.  Dispel Magic ends the spell and therefore removes the
    // disease.  Modelled as pRemoveCondition(CPoisoned) representing the spell
    // being dispelled.
    val creature = freshCreature(20)
    val withDisease = pApplyCondition(creature, CPoisoned)
    val afterDispel = pRemoveCondition(withDisease, CPoisoned)
    assert(withDisease.poisoned and not(afterDispel.poisoned))
  }
}
