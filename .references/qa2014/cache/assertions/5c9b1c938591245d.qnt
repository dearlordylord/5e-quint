// Source: https://rpg.stackexchange.com/q/80253
module _qa_5c9b1c938591245d {
  import dnd.* from "./dnd"

  // Can a 10th Level Bard use Magical Secrets to gain 5th level Paladin spells?
  run qa_bard_magical_secrets_5th_level_spells = {
    // Bard is a full caster: caster level == character level == 10.
    // Magical Secrets rule: may choose any spell of a level you can cast.
    // Verify a 10th-level full caster has 5th-level slots → can cast (and therefore learn) 5th-level spells.
    val casterLevel = 10
    val spellLevel  = 5
    val slotMap = pBuildSlotMap(casterLevel)
    val ss: SpellSlotState = {
      slotsMax:             slotMap,
      slotsCurrent:         slotMap,
      pactSlotsMax:         0,
      pactSlotsCurrent:     0,
      pactSlotLevel:        0,
      concentrationSpellId: "",
    }
    // pCanCastAtLevel checks slotLevel >= spellLevel AND current slots > 0.
    // At caster level 10, pSlotsPerLevel(10, 5) == 2, so the assertion holds.
    assert(pCanCastAtLevel(ss, spellLevel, spellLevel))
  }
}
