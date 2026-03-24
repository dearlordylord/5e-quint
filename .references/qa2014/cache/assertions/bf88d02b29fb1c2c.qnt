// Source: https://rpg.stackexchange.com/q/216493
module _qa_bf88d02b29fb1c2c {
  import dnd.* from "./dnd"

  // Does couatl's poison end when the victim is shaken awake?
  run qa_shake_awake_does_not_remove_poison = {
    // Couatl bite: poisoned for 24h, unconscious until poison ends; shaking awake removes Unconscious only
    val s0 = freshCreature(20)
    // Failed CON save: apply Poisoned (the 24h poison) then Unconscious (caused by the poison)
    val s1 = pApplyCondition(s0, CPoisoned)
    val s2 = pApplyCondition(s1, CUnconscious)
    // Another creature uses an action to shake the target awake (removes Unconscious only)
    val s3 = pRemoveCondition(s2, CUnconscious)
    assert(
      // Poisoned persists — shaking awake does not end the couatl's poison
      s3.poisoned == true
      // Unconscious is lifted — the shake-awake succeeded
      and s3.unconscious == false
      // ISUnconscious no longer a source of incapacitation
      and not(s3.incapacitatedSources.contains(ISUnconscious))
      // The two conditions were independent: Poisoned was never touched
      and s2.poisoned == true
    )
  }
}
