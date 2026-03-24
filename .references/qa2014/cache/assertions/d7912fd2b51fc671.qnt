// Source: https://rpg.stackexchange.com/q/75736
module _qa_d7912fd2b51fc671 {
  import dnd.* from "./dnd"

  // Can a Half-Elf pass for a Full Human, or a Full Elf, using a disguise kit?
  // Easy disguise (similar race, e.g. half-elf → elf): deceiver gets advantage on Deception vs Perception contest
  run qa_disguise_easy_similar_race_deceiver_advantage = {
    val chaMod = abilityModifier(14)           // CHA 14 → +2
    val pb     = proficiencyBonus(3)           // level 3 → +2
    val adv    = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: false })
    val d1 = 7
    val d2 = 14
    // Advantage: take higher of two pre-resolved d20s
    val deceiverRoll  = if (adv.hasAdvantage) intMax(d1, d2) else intMin(d1, d2) // 14
    val deceiverTotal = deceiverRoll + chaMod + pb             // 14+2+2 = 18
    // Inspector: active Perception, WIS 12 → +1, no proficiency
    val inspectorTotal = 12 + abilityModifier(12)              // 12+1 = 13
    assert(contestWinner(deceiverTotal, inspectorTotal) == AWins)
  }
  
  // Hard disguise (very different race, e.g. half-elf → tiefling with horns/tail): deceiver has disadvantage
  run qa_disguise_hard_different_race_deceiver_disadvantage = {
    val chaMod  = abilityModifier(14)
    val pb      = proficiencyBonus(3)
    val disadv  = resolveAdvantage({ hasAdvantage: false, hasDisadvantage: true })
    val d1 = 15
    val d2 = 6
    // Disadvantage: take lower of two pre-resolved d20s
    val deceiverRoll  = if (disadv.hasDisadvantage) intMin(d1, d2) else intMax(d1, d2) // 6
    val deceiverTotal = deceiverRoll + chaMod + pb             // 6+2+2 = 10
    // Inspector straight roll, same WIS
    val inspectorTotal = 11 + abilityModifier(12)              // 11+1 = 12
    assert(contestWinner(deceiverTotal, inspectorTotal) == BWins)
  }
}
