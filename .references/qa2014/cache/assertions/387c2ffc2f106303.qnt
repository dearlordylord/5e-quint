// Source: https://rpg.stackexchange.com/q/156138
module _qa_387c2ffc2f106303 {
  import dnd.* from "./dnd"

  // Druid - Spell slots vs spells prepared: prepared = max(1, WisMod + druidLevel), can be fewer than slots
  run qa_druid_prepared_spells_less_than_slots = {
    val wisScore = 10 // WisMod = 0
    val druidLevel = 1
    val wisMod = abilityModifier(wisScore)
    val preparedCount = intMax(1, wisMod + druidLevel)
    val slotsAtLevel1 = pSlotsPerLevel(druidLevel, 1) // full caster level 1 → 2 slots
    assert(
      wisMod == 0
      and preparedCount == 1
      and slotsAtLevel1 == 2
      and preparedCount < slotsAtLevel1
    )
  }
}
