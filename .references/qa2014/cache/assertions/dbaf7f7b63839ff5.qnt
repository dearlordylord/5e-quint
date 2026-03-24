// Source: https://rpg.stackexchange.com/q/114707
module _qa_dbaf7f7b63839ff5 {
  import dnd.* from "./dnd"

  // Does a wand lose a charge if it attempts to target an invalid target?
  // Accepted answer: the charge is expended — spending the resource and casting are the same action.
  // Modeled here via the spell slot analog: pExpendSlot consumes the slot regardless of target state.
  run qa_wand_charge_expended_on_invalid_target = {
    // Set up one first-level slot (proxy for one wand charge)
    val slots = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(1, 1))
      .with("slotsCurrent", EMPTY_SLOTS.set(1, 1))
    // The "invalid target" creature: state is entirely unaffected by the spell
    val creature = freshCreature(20)
    // Cast the spell (expend the charge/slot) — target validity does not gate resource expenditure
    val afterCast = pExpendSlot(slots, 1)
    // Charge is spent (slot count drops to 0) even though nothing happened to the creature
    assert(afterCast.slotsCurrent.get(1) == 0 and creature.hp == 20)
  }
}
