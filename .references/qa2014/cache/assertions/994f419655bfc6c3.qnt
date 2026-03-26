// Source: https://rpg.stackexchange.com/q/147079
module _qa_994f419655bfc6c3 {
  import dnd.* from "./dnd"

  // Is it possible to Ready a spell triggered by an ally's attack? Ready action uses action slot and sets flag.
  run qa_ready_action_sets_readied_flag = {
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, AReady)
    assert(t1.readiedAction == true and t1.actionsRemaining == 0)
  }
  
  // Readying a non-cantrip spell (e.g. Slow) requires concentration; supersedes any prior concentration.
  run qa_readied_spell_breaks_prior_concentration = {
    val ss_with_bless = FRESH_SPELL_SLOTS.with("concentrationSpellId", "bless")
    val ss_after_ready = pStartConcentration(ss_with_bless, "slow")
    assert(ss_after_ready.concentrationSpellId == "slow")
  }
  
  // After readied spell fires and next turn begins, creature has full action economy (enables back-to-back casts).
  run qa_next_turn_after_ready_has_full_action_economy = {
    val creature = freshCreature(20)
    val t_next = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    assert(
      t_next.actionsRemaining > 0 and
      t_next.bonusActionUsed == false and
      t_next.movementRemaining == 30
    )
  }
  
  // AReady does NOT set nonCantripActionSpellCast, so bonus-action spell casting remains unrestricted that turn.
  run qa_ready_does_not_block_bonus_action_spell = {
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, AReady)
    assert(t1.nonCantripActionSpellCast == false and canCastBonusActionSpell(t1) == true)
  }
}
