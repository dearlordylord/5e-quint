// Source: https://rpg.stackexchange.com/q/123203
module _qa_3bbc41c056e5befe {
  import dnd.* from "./dnd"

  // A reason someone would not just go to a cleric to resurrect a loved one in D&D?
  // Accepted answer reason #2: Resurrection is a 7th-level spell — only caster level 13+
  // has any 7th-level spell slots; a common village cleric (level 5) has none at all.
  run qa_resurrection_requires_high_level_caster = {
    val RESURRECTION_LEVEL = 7
    val level5Map  = pBuildSlotMap(5)
    val level13Map = pBuildSlotMap(13)
    val lowLevelSlots: SpellSlotState = {
      slotsMax: level5Map,
      slotsCurrent: level5Map,
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    val highLevelSlots: SpellSlotState = {
      slotsMax: level13Map,
      slotsCurrent: level13Map,
      pactSlotsMax: 0,
      pactSlotsCurrent: 0,
      pactSlotLevel: 0,
      concentrationSpellId: "",
    }
    assert(
      // Level 5 cleric cannot cast Resurrection — zero 7th-level slots
      not(pCanCastAtLevel(lowLevelSlots, RESURRECTION_LEVEL, RESURRECTION_LEVEL))
      // Level 13 cleric can cast Resurrection — has at least one 7th-level slot
      and pCanCastAtLevel(highLevelSlots, RESURRECTION_LEVEL, RESURRECTION_LEVEL)
    )
  }
}
