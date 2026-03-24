// Source: https://rpg.stackexchange.com/q/203599
module _qa_92e547131c66e121 {
  import dnd.* from "./dnd"

  // How many spells does my level 1 druid know?
  // Druid prepares Wis modifier + Druid level (minimum 1) spells; Wis 17 → +3 → 3+1=4.
  run qa_druid_spells_prepared = {
    val wisScore = 17
    val druidLevel = 1
    val wisMod = abilityModifier(wisScore)
    val spellsPrepared = intMax(1, wisMod + druidLevel)
    assert(spellsPrepared == 4)
  }
}
