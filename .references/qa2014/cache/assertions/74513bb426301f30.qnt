// Source: https://rpg.stackexchange.com/q/138361
module _qa_74513bb426301f30 {
  import dnd.* from "./dnd"

  // Can a spell scroll be upcast using a higher-level spell slot?
  run qa_scroll_cast_no_slot_expended = {
      // Caster has 2 level-1 slots and 1 level-2 slot available
      val slots = FRESH_SPELL_SLOTS
          .with("slotsMax", EMPTY_SLOTS.set(1, 2).set(2, 1))
          .with("slotsCurrent", EMPTY_SLOTS.set(1, 2).set(2, 1))
      // DMG p.141: spells from magic items cast at lowest possible level, no slot expended
      // Scroll of Magic Missile (spell level 1): pExpendSlot is NOT called at any level
      val afterScrollCast = slots
      // A normal level-2 upcast from memory WOULD consume the level-2 slot
      val afterNormalUpcast = pExpendSlot(slots, 2)
      assert(
          // Scroll leaves all slots intact — no slot consumed at any level
          afterScrollCast.slotsCurrent.get(1) == 2 and
          afterScrollCast.slotsCurrent.get(2) == 1 and
          // Normal upcast consumed the level-2 slot
          afterNormalUpcast.slotsCurrent.get(2) == 0 and
          // Scroll cast is strictly distinct from an upcast: level-2 slot untouched
          afterScrollCast.slotsCurrent.get(2) != afterNormalUpcast.slotsCurrent.get(2)
      )
  }
}
