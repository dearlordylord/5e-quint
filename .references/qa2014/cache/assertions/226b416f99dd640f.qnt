// Source: https://rpg.stackexchange.com/q/111533
module _qa_226b416f99dd640f {
  import dnd.* from "./dnd"

  // How does Keen Sight affect Passive Perception?
  run qa_keen_sight_passive_perception = {
    // Owlbear example: WIS 13 (+1 mod), proficient Perception, profBonus 2 → PP 13 normally
    val wisMod = abilityModifier(13) // +1
    val profBonus = proficiencyBonus(1) // +2 at level 1-4
    val basePassive = passiveCheck(wisMod, Proficient, profBonus, false, false)
    // Keen Sight grants advantage on sight-based Perception → passive check adds 5
    val advantagePassive = passiveCheck(wisMod, Proficient, profBonus, true, false)
    assert(
      basePassive == 13 and
      advantagePassive == 18 and
      advantagePassive - basePassive == 5
    )
  }
}
