// Source: https://rpg.stackexchange.com/q/77722
module _qa_b5cf25dff7d70eb5 {
  import dnd.* from "./dnd"

  // MHL: unnoticed task requires Dex(Sleight of Hand) contested by Wis(Perception) — skill ability mapping
  run qa_mhl_skill_ability_mapping = {
    assert(skillAbility(SleightOfHand) == Dex and skillAbility(Perception) == Wis)
  }
  
  // MHL: rogue's Sleight of Hand total exceeds target's Perception — goes unnoticed (AWins)
  run qa_mhl_rogue_wins_unnoticed = {
    // Rogue: d20=14, Dex mod=+3, prof bonus=+3 => 20
    // Target: d20=10, Wis mod=+1 => 11
    val rogueTotal = 14 + 3 + 3
    val targetTotal = 10 + 1
    assert(contestWinner(rogueTotal, targetTotal) == AWins)
  }
  
  // MHL: target's Perception total exceeds rogue's Sleight of Hand — rogue is noticed (BWins)
  run qa_mhl_target_notices_rogue = {
    // Rogue: d20=5, Dex mod=+3, prof=+3 => 11
    // Target: d20=15, Wis mod=+2 => 17
    val rogueTotal = 5 + 3 + 3
    val targetTotal = 15 + 2
    assert(contestWinner(rogueTotal, targetTotal) == BWins)
  }
  
  // MHL: tied contest yields Tie (status quo — rogue fails to go unnoticed per PHB contest rules)
  run qa_mhl_tied_contest_is_status_quo = {
    val tied = 13
    assert(contestWinner(tied, tied) == Tie)
  }
  
  // MHL: passive Perception as detection baseline — 10 + Wis mod + prof if proficient
  run qa_mhl_passive_perception_baseline = {
    // Target: Wis mod=+2, Proficient in Perception (prof=+3), no adv/disadv
    val pp = passiveCheck(2, Proficient, 3, false, false)
    assert(pp == 15)
  }
}
