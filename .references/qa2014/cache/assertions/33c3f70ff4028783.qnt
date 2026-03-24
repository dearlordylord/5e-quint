// Source: https://rpg.stackexchange.com/q/164168
module _qa_33c3f70ff4028783 {
  import dnd.* from "./dnd"

  // Can an Eldritch Knight bond with a natural weapon? (Alter Self requires concentration; bond ritual takes 1 hour)
  run qa_alter_self_concentration_ends_natural_weapons = {
    // Alter Self grants temporary natural weapons while concentrating (PHB p211)
    val ss = pStartConcentration(FRESH_SPELL_SLOTS, "alter_self")
    // During the 1-hour Weapon Bond ritual, any damage requires a concentration save
    // DC = max(10, damage/2) — e.g. 14 damage → DC max(10,7) = 10; 22 damage → DC 11
    val dc_14 = pConcentrationDC(14)
    val dc_22 = pConcentrationDC(22)
    // Failed save: concentration (and natural weapons) end → ritual target disappears
    val ssFailedSave = pConcentrationCheck(ss, false)
    // Passed save: concentration maintained, natural weapons persist
    val ssPassedSave = pConcentrationCheck(ss, true)
    // Being knocked unconscious mid-ritual also breaks concentration immediately
    val awake = freshCreature(20)
    val knocked = pApplyCondition(awake, CUnconscious)
    val ssKnockedOut = pBreakConcOnStateChange(ss, awake, knocked)
    assert(
      // DC floors at 10
      dc_14 == 10
      and dc_22 == 11
      // Failed save ends Alter Self → natural weapons gone, bond ritual pointless
      and not(isConcentrating(ssFailedSave))
      and ssFailedSave.concentrationSpellId == ""
      // Passed save keeps Alter Self active
      and isConcentrating(ssPassedSave)
      and ssPassedSave.concentrationSpellId == "alter_self"
      // Incapacitation (e.g. knocked out) also ends Alter Self immediately
      and not(isConcentrating(ssKnockedOut))
    )
  }
}
