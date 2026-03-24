// Source: https://rpg.stackexchange.com/q/103539
module _qa_d659d9b76522fcc2 {
  import dnd.* from "./dnd"

  // What is the difference between an Arcane Focus and a Component Pouch?
  run qa_component_somatic_requires_free_hand = {
    val c = freshCreature(10)
    // PHB: "A spellcaster must have a hand free to access material components or to hold a focus"
    assert(
      pCanProvideComponents(c, false, true, false) == false
      and pCanProvideComponents(c, false, true, true) == true
    )
  }
  
  // What is the difference between an Arcane Focus and a Component Pouch?
  run qa_component_same_hand_for_somatic_and_material = {
    val c = freshCreature(10)
    // PHB: the hand for material/focus "can be the same hand used to perform somatic components"
    // One free hand satisfies both S and M simultaneously — no second hand needed
    assert(pCanProvideComponents(c, false, true, true) == true)
  }
  
  // What is the difference between an Arcane Focus and a Component Pouch?
  run qa_component_verbal_requires_speech = {
    val c = freshCreature(10)
    val paralyzed = pApplyCondition(c, CParalyzed)
    val petrified  = pApplyCondition(c, CPetrified)
    // Paralyzed/petrified creatures cannot speak, so cannot supply verbal components
    assert(
      pCanProvideComponents(paralyzed, true, false, true) == false
      and pCanProvideComponents(petrified, true, false, true) == false
      and pCanProvideComponents(c, true, false, true) == true
    )
  }
  
  // What is the difference between an Arcane Focus and a Component Pouch?
  run qa_component_unconscious_no_verbal = {
    val c = freshCreature(10)
    val unconscious = pApplyCondition(c, CUnconscious)
    // Unconscious creature cannot speak → verbal component impossible
    assert(pCanProvideComponents(unconscious, true, false, true) == false)
  }
  
  // What is the difference between an Arcane Focus and a Component Pouch?
  run qa_component_no_requirements_always_satisfiable = {
    val c = freshCreature(10)
    val paralyzed = pApplyCondition(c, CParalyzed)
    // If a spell has no V/S components (e.g. pure M only, caller-validated),
    // neither speech nor hand restrictions block casting at this layer
    assert(
      pCanProvideComponents(paralyzed, false, false, false) == true
      and pCanProvideComponents(c, false, false, false) == true
    )
  }
}
