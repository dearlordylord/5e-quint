// Source: https://rpg.stackexchange.com/q/124884
module _qa_443ed56a7c8c629d {
  import dnd.* from "./dnd"

  // Is a beast from Bag of Tricks a willing creature for Polymorph?
  run qa_bag_of_tricks_beast_willing_for_polymorph = {
    // Friendly, controlled beast = willing → no WIS save needed; contrast with unwilling path
    val casterSlots = {
      slotsMax:    Map(1 -> 0, 2 -> 0, 3 -> 0, 4 -> 1, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      slotsCurrent: Map(1 -> 0, 2 -> 0, 3 -> 0, 4 -> 1, 5 -> 0, 6 -> 0, 7 -> 0, 8 -> 0, 9 -> 0),
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    // Unwilling creature with low WIS (mod=-1, roll=5, profBonus=3, DC=15) would fail the save
    val unwillingWouldFail = not(saveSucceeds(5, -1, false, 3, 0, 15))
    // Willing beast: bypass the save entirely — just expend the 4th-level slot and start concentration
    val canCast    = pCanCastAtLevel(casterSlots, 4, 4)
    val afterCast  = pStartConcentration(pExpendSlot(casterSlots, 4), "polymorph")
    assert(
      // The same save roll that fails for an unwilling target…
      unwillingWouldFail
      // …is irrelevant for the willing Bag-of-Tricks beast: spell auto-succeeds
      and canCast
      and isConcentrating(afterCast)
      and afterCast.slotsCurrent.get(4) == 0
    )
  }
}
