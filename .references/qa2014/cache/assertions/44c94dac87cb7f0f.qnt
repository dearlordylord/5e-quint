// Source: https://rpg.stackexchange.com/q/127286
module _qa_44c94dac87cb7f0f {
  import dnd.* from "./dnd"

  // "Can Blink and Banishment be combined to have an effect similar to Etherealness?" — breaking concentration requires no action
  run qa_break_concentration_no_action_required = {
    val creature = freshCreature(20)
    // Creature has already used their action (e.g. to dismiss Blink)
    val turnAfterAction = pUseAction(FRESH_TURN, creature, AUseObject)
    // Creature is concentrating on Banishment
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "banishment")
    // "You can end concentration at any time (no action required)" — PHB
    val ssAfterBreak = pBreakConcentration(ss)
    assert(
      ssAfterBreak.concentrationSpellId == ""
      and not(isConcentrating(ssAfterBreak))
      // TurnState completely unaffected by breaking concentration
      and turnAfterAction.actionUsed == true       // only action consumed was dismissing Blink
      and turnAfterAction.bonusActionUsed == false // bonus action untouched
      and turnAfterAction.reactionAvailable == true // reaction untouched
    )
  }
  
  // "Can Blink and Banishment be combined..." — Ready action uses action slot but leaves reaction available for triggered cast
  run qa_ready_action_leaves_reaction_for_trigger = {
    val creature = freshCreature(20)
    val turnAfterReady = pUseAction(FRESH_TURN, creature, AReady)
    // Ready action consumed, readiedAction set — but reaction is still free for the trigger
    assert(
      turnAfterReady.actionUsed == true
      and turnAfterReady.readiedAction == true
      and turnAfterReady.reactionAvailable == true  // reaction fires when trigger (entering Ethereal) occurs
      and turnAfterReady.bonusActionUsed == false
    )
  }
  
  // "Can Blink and Banishment be combined..." — 3rd-level (Blink) and 4th-level (Banishment) slots expended; concentration lifecycle
  run qa_blink_banishment_dual_slot_and_concentration_lifecycle = {
    val slots = {
      slotsMax:     Map(1->2, 2->2, 3->2, 4->1, 5->1, 6->1, 7->1, 8->1, 9->1),
      slotsCurrent: Map(1->2, 2->2, 3->2, 4->1, 5->1, 6->1, 7->1, 8->1, 9->1),
      pactSlotsMax: 0, pactSlotsCurrent: 0, pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Turn 1: expend 3rd-level slot for Blink
    val afterBlink = pExpendSlot(slots, 3)
    // Turn 2 (reaction fires): expend 4th-level slot for Banishment, begin concentration
    val afterBanishment = pStartConcentration(pExpendSlot(afterBlink, 4), "banishment")
    // Turn 3: dismiss Blink (action), then break concentration on Banishment — free, returns to Ethereal
    val afterBreak = pBreakConcentration(afterBanishment)
    assert(
      afterBlink.slotsCurrent.get(3) == 1            // one 3rd-level slot spent on Blink
      and afterBanishment.slotsCurrent.get(4) == 0   // 4th-level slot spent on Banishment
      and isConcentrating(afterBanishment)            // actively concentrating on Banishment
      and afterBreak.concentrationSpellId == ""       // concentration ended freely (no action)
      and not(isConcentrating(afterBreak))
      and afterBreak.slotsCurrent.get(3) == 1        // Blink slot not refunded when dismissed
    )
  }
}
