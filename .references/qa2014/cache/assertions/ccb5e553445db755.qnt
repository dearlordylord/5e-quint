// Source: https://rpg.stackexchange.com/q/79094
module _qa_ccb5e553445db755 {
  import dnd.* from "./dnd"

  // How Does a Shield Bash Work on Multiple Targets? - Shield Master shove (bonus action after Attack) knocks target prone on attacker win
  run qa_shield_master_shove_knocks_prone_on_win = {
    val goblin = freshCreature(7)
    val attacker = freshCreature(20)
    val t0 = FRESH_TURN
    // Take the Attack action (Shield Master requires this first)
    val t1 = pUseAction(t0, attacker, AAttack)
    // Use bonus action for shield bash shove
    val t2 = pUseBonusAction(t1, attacker)
    // Shove contest: attacker wins → target is knocked prone
    val shoveResult = pShove(Medium, Small, goblin, AWins, ShoveProne)
    assert(
      t1.attackActionUsed and
      not(t1.bonusActionUsed) and
      t2.bonusActionUsed and
      shoveResult.success and
      shoveResult.targetState.prone
    )
  }
  
  // How Does a Shield Bash Work on Multiple Targets? - bonus action exhausted after one shield bash; can't shove a second goblin with it
  run qa_shield_bash_only_one_bonus_action_shove_per_turn = {
    val attacker = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, attacker, AAttack)
    val t2 = pUseBonusAction(t1, attacker)
    // Attempting bonus action a second time (second goblin) is a no-op
    val t3 = pUseBonusAction(t2, attacker)
    assert(t2.bonusActionUsed and t2 == t3)
  }
  
  // How Does a Shield Bash Work on Multiple Targets? - contested shove tie leaves goblin standing (status quo)
  run qa_shield_bash_shove_tie_target_stays_standing = {
    val goblin = freshCreature(7)
    val shoveResult = pShove(Medium, Small, goblin, Tie, ShoveProne)
    assert(not(shoveResult.success) and not(shoveResult.targetState.prone))
  }
  
  // How Does a Shield Bash Work on Multiple Targets? - can't shove a creature more than one size larger (e.g. Medium vs Huge)
  run qa_shield_bash_size_restriction_blocks_huge_target = {
    val huge_creature = freshCreature(100)
    // Medium attacker (sizeOrd=2) vs Huge target (sizeOrd=4): 4 > 2+1 → fails
    val shoveResult = pShove(Medium, Huge, huge_creature, AWins, ShoveProne)
    assert(not(shoveResult.success) and not(shoveResult.targetState.prone))
  }
}
