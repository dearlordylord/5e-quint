// Source: https://rpg.stackexchange.com/q/215556
module _qa_036942a1542e493b {
  import dnd.* from "./dnd"

  // Do the effects of Enlarge/Reduce continue to apply after using Wild Shape? (2024 PHB)
  run qa_enlarge_reduce_persists_through_wild_shape = {
    // Druid (or ally) concentrating on Enlarge/Reduce before Wild Shape
    val preWildShape = freshCreature(30)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "enlarge_reduce")
    // Wild Shape: 2024 PHB — "shape-shifting carries over ongoing effects";
    // beast form has a different HP pool but creature remains alive and not incapacitated.
    // pBreakConcOnStateChange only fires on death or new incapacitation — neither applies here.
    val postWildShape = freshCreature(20)
    val ssAfter = pBreakConcOnStateChange(ss, preWildShape, postWildShape)
    assert(
      isConcentrating(ssAfter) and
      ssAfter.concentrationSpellId == "enlarge_reduce"
    )
  }
  
  // P.S.: self-casting druid — Wild Shape doesn't break the druid's own concentration (PHB p.81)
  run qa_enlarge_reduce_self_cast_druid_wild_shape = {
    // Druid cast Enlarge/Reduce on themselves, then uses Wild Shape
    val druid = freshCreature(28)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "enlarge_reduce")
    // Wild Shape transition: druid is still alive, still not incapacitated in beast form.
    // The druid cannot cast new spells in beast form, but an already-cast concentration spell
    // persists — pBreakConcOnStateChange does not trigger.
    val druidBeastForm = freshCreature(18)
    val ssAfter = pBreakConcOnStateChange(ss, druid, druidBeastForm)
    assert(
      not(druidBeastForm.dead) and
      not(isIncapacitated(druidBeastForm)) and
      isConcentrating(ssAfter) and
      ssAfter.concentrationSpellId == "enlarge_reduce"
    )
  }
}
