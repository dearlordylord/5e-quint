// Source: https://rpg.stackexchange.com/q/194949
module _qa_90c551432215c4a5 {
  import dnd.* from "./dnd"

  // Can a creature with Multiattack use Disarm with one of its attacks?
  run qa_multiattack_disarm_uses_extra_attack = {
    val creature = freshCreature(20)
    // pStartTurn with FExtraAttack in TEST_CONFIG grants extraAttacksRemaining = 1
    val t0 = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    // Use Attack action (represents the Multiattack / Extra Attack trigger)
    val t1 = pUseAction(t0, creature, AAttack)
    // Disarm (DMG optional): weapon attack roll contested by target Str(Athletics)/Dex(Acrobatics)
    // Attacker rolls d20=14 + attack bonus 4 = 18; target Athletics check = 10
    val disarmContest = contestWinner(18, 10)
    // Substitute one extra attack slot for the Disarm — same as using any weapon attack
    val t2 = pUseExtraAttack(t1)
    assert(
      and {
        // FExtraAttack provides 1 extra attack slot at turn start
        t0.extraAttacksRemaining == 1,
        // After Attack action, extra attacks are still available to spend
        t1.attackActionUsed == true,
        t1.extraAttacksRemaining == 1,
        // Attacker wins the contested Disarm
        disarmContest == AWins,
        // Spending one extra attack on the Disarm properly decrements the counter
        t2.extraAttacksRemaining == 0,
      }
    )
  }
}
