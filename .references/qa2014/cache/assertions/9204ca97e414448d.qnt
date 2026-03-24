// Source: https://rpg.stackexchange.com/q/153728
module _qa_9204ca97e414448d {
  import dnd.* from "./dnd"

  // Does the Temple of the Gods spell nullify critical hits?
  run qa_temple_of_gods_cannot_cancel_critical_hit = {
    // PHB: "If the d20 roll for an attack is a 20, the attack hits regardless of any modifiers"
    // Temple of the Gods subtracts a d4 from the d20 roll — modelled as a negative attackBonus.
    // Even the worst-case penalty (-4) cannot convert a natural 20 into a normal hit or miss.
    val worstCasePenalty = resolveAttackRoll(20, -4, 25, 0)
    assert(worstCasePenalty.hits and worstCasePenalty.isCritical)
  }
  
  // Contrast: the same penalty DOES affect a non-natural-20 roll (penalty is not meaningless)
  run qa_temple_of_gods_penalty_affects_normal_rolls = {
    // A roll of 16 with no penalty hits AC 16; with -4 penalty it misses — confirms penalty applies.
    val nopenalty = resolveAttackRoll(16, 0, 16, 0)
    val penalised = resolveAttackRoll(16, -4, 16, 0)
    assert(nopenalty.hits and not(nopenalty.isCritical) and not(penalised.hits))
  }
}
