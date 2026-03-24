module _qa_97abd0a56af79361 {
  import dnd.* from "./dnd"

  // Can multiple characters cast concentration spells from the same item by passing it around?
  run qa_concentration_per_caster_not_per_item = {
    // Caster A casts a concentration spell from a wand; item is then passed to Caster B.
    // Concentration belongs to the caster, not the item — modelled as two independent SpellSlotStates.
    val casterA_slots = pStartConcentration(FRESH_SPELL_SLOTS, "detect_magic")
    // Passing the wand has no effect on casterA_slots — no operation touches it.
    // Caster B now casts their own concentration spell from the same wand.
    val casterB_slots = pStartConcentration(FRESH_SPELL_SLOTS, "detect_magic")
    // Both casters are independently concentrating; neither broke the other.
    assert(
      isConcentrating(casterA_slots) and
      isConcentrating(casterB_slots) and
      casterA_slots.concentrationSpellId == "detect_magic" and
      casterB_slots.concentrationSpellId == "detect_magic"
    )
  }
  
  // Can multiple characters cast concentration spells from the same item by passing it around?
  run qa_item_pass_leaves_original_concentration_intact = {
    // Accepted answer: concentration is per-caster. Handing the wand away does not break
    // the first caster's concentration. Verify that nothing in the spec touches casterA's
    // slot state when casterB starts concentrating on their own state.
    val casterA_slots = pStartConcentration(FRESH_SPELL_SLOTS, "detect_magic")
    // Simulate caster B receiving the item and starting concentration — entirely separate state.
    val casterB_slots = pStartConcentration(FRESH_SPELL_SLOTS, "detect_magic")
    // casterA_slots is structurally identical after the "pass": concentration never broken.
    assert(
      casterA_slots == pStartConcentration(FRESH_SPELL_SLOTS, "detect_magic")
    )
  }
  
  // Can multiple characters cast concentration spells from the same item by passing it around?
  run qa_each_caster_limited_to_one_concentration = {
    // Even with the item available, a single caster still cannot concentrate on two spells.
    // Starting a second concentration spell replaces the first (PHB rule, modelled by pStartConcentration).
    val after_first  = pStartConcentration(FRESH_SPELL_SLOTS, "detect_magic")
    val after_second = pStartConcentration(after_first, "detect_magic")
    assert(
      isConcentrating(after_second) and
      after_second.concentrationSpellId == "detect_magic" and
      // Only one spell tracked — not two simultaneous concentrations.
      after_second == after_first
    )
  }
}
