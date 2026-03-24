// Source: https://rpg.stackexchange.com/q/119072
module _qa_2160204185abb327 {
  import dnd.* from "./dnd"

  // Can you cast Mending on a single object multiple times?
  run qa_mending_multiple_casts_same_object = {
    val caster = freshCreature(20)
    val slots = FRESH_SPELL_SLOTS
    // Turn 1: cast Mending (cantrip) as action — repairs first break
    val t1 = pUseAction(FRESH_TURN, caster, ACastSpell)
    // Turn 2: new turn, cast Mending again — repairs second break on same object
    val t2 = pUseAction(FRESH_TURN, caster, ACastSpell)
    assert(
      // Each turn's action is consumed by the cast
      t1.actionUsed
      and t2.actionUsed
      // Cantrip: nonCantripActionSpellCast never set, so no restriction on subsequent turns
      and not(t1.nonCantripActionSpellCast)
      and not(t2.nonCantripActionSpellCast)
      // Cantrip: no spell slot expended across either casting
      and slots.slotsCurrent == EMPTY_SLOTS
    )
  }
}
