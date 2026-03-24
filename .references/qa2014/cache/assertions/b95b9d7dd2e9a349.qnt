// Source: https://rpg.stackexchange.com/q/86488
module _qa_b95b9d7dd2e9a349 {
  import dnd.* from "./dnd"

  // Can you cast a Suggestion on a sleeping target? — No: unconscious = unaware of surroundings, cannot hear/understand
  run qa_unconscious_cannot_hear_suggestion = {
    val sleeping = pApplyCondition(freshCreature(20), CUnconscious)
    // Sleeping → unconscious condition; unconscious creatures are unaware of surroundings.
    // pCanSpeak is the spec's proxy for "can perceive/communicate" (checks not(unconscious)).
    // Suggestion requires the target to hear and understand — both impossible when unconscious.
    assert(
      sleeping.unconscious and
      isIncapacitated(sleeping) and
      not(pCanSpeak(sleeping))
    )
  }
}
