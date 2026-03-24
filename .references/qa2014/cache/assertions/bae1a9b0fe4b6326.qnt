// Source: https://rpg.stackexchange.com/q/50254
module _qa_bae1a9b0fe4b6326 {
  import dnd.* from "./dnd"

  // What are the limits of Glibness concerning Deception?
  // Scenario 3: a sufficiently high non-magical Insight roll can detect a Glibness-boosted lie
  run qa_glibness_high_insight_detects_lie = {
    // Glibness sets Bob's Deception die floor to 15; CHA mod +3 → total 18.
    // Jim rolls 20 Insight + WIS mod +2 → total 22. Non-magical contest uses normal rules.
    val bobDeceptionTotal = 15 + 3
    val jimInsightTotal   = 20 + 2
    assert(contestWinner(jimInsightTotal, bobDeceptionTotal) == AWins)
  }
  
  // What are the limits of Glibness concerning Deception?
  // Scenario 3: a low non-magical Insight roll still fails to pierce Glibness-buffed Deception
  run qa_glibness_low_insight_fails_to_detect = {
    // Bob's Deception total 18 (Glibness floor 15 + CHA +3).
    // Jim rolls 10 + WIS +1 = 11 — not enough to beat it.
    val bobDeceptionTotal = 15 + 3
    val jimInsightTotal   = 10 + 1
    assert(contestWinner(jimInsightTotal, bobDeceptionTotal) == BWins)
  }
  
  // What are the limits of Glibness concerning Deception?
  // Scenario 3: a tie on the Insight vs Deception contest leaves the lie undetected (status quo)
  run qa_glibness_tied_contest_lie_undetected = {
    // Both totals equal → Tie → no change; the lie stands.
    val bobDeceptionTotal = 18
    val jimInsightTotal   = 18
    assert(contestWinner(jimInsightTotal, bobDeceptionTotal) == Tie)
  }
}
