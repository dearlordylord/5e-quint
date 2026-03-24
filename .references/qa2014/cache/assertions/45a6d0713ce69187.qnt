// Source: https://rpg.stackexchange.com/q/117262
module _qa_45a6d0713ce69187 {
  import dnd.* from "./dnd"

  // Does upcasting bypass Limited Magic Immunity?
  run qa_upcasting_bypasses_level_immunity = {
    // PHB p.201: "the spell assumes the higher level for that casting"
    // Immunity to "spells of 6th level or lower" is pierced when slot level > 6
    val baseSpellLevel = 3
    val upcastSlotLevel = 7
    val immunityThreshold = 6
    val slots = FRESH_SPELL_SLOTS
      .with("slotsMax", EMPTY_SLOTS.set(7, 1))
      .with("slotsCurrent", EMPTY_SLOTS.set(7, 1))
    // pCanCastAtLevel encodes: slot must be >= spell's base level
    val canCastUpcast = pCanCastAtLevel(slots, baseSpellLevel, upcastSlotLevel)
    // When cast with a 7th-level slot the spell IS 7th level — not 3rd
    val effectiveLevel = upcastSlotLevel
    val upcastBypassesImmunity = effectiveLevel > immunityThreshold
    // Casting at base level 3 would NOT bypass the immunity
    val baseBypassesImmunity = baseSpellLevel > immunityThreshold
    assert(
      canCastUpcast and upcastBypassesImmunity and not(baseBypassesImmunity)
    )
  }
}
