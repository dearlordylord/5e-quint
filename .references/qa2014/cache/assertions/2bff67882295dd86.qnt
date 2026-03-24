// Source: https://rpg.stackexchange.com/q/142075
module _qa_2bff67882295dd86 {
  import dnd.* from "./dnd"

  // Does the Dispel Magic spell end the control of undead granted by the Animate Dead spell?
  run qa_instantaneous_spell_not_dispellable = {
    // Animate Dead has instantaneous duration → caster expends a slot but never starts concentration.
    // Simulate the spell-slot state after casting: slot 3 spent, no concentrationSpellId set.
    val ss_before = {
      slotsMax: Map(1->4, 2->3, 3->2, 4->0, 5->0, 6->0, 7->0, 8->0, 9->0),
      slotsCurrent: Map(1->4, 2->3, 3->1, 4->0, 5->0, 6->0, 7->0, 8->0, 9->0), // one 3rd-level slot spent
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",   // instantaneous → no ongoing spell effect registered
    }
    // Dispel Magic targets the undead → modeled as pBreakConcentration (the spec's "end an active spell")
    val ss_after_dispel = pBreakConcentration(ss_before)
    // Because there is no active concentration (instantaneous duration leaves nothing to dispel),
    // Dispel Magic is a no-op: state is identical before and after.
    assert(
      not(isConcentrating(ss_before)) and
      ss_after_dispel == ss_before
    )
  }
}
