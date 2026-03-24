// Source: https://rpg.stackexchange.com/q/71129
module _qa_a715a56d06b004c7 {
  import dnd.* from "./dnd"

  // Suggestion: verbal component requires ability to speak (mystic words separate from the spell's effect)
  run qa_verbal_component_requires_speech = {
    val normalCreature = freshCreature(20)
    val paralyzedCreature = pApplyCondition(freshCreature(20), CParalyzed)
    all {
      // A creature that can speak satisfies the verbal component requirement
      assert(pCanProvideComponents(normalCreature, true, false, true)),
      // A paralyzed creature cannot produce the required mystic words — verbal component fails
      assert(not(pCanProvideComponents(paralyzedCreature, true, false, true))),
    }
  }
}
