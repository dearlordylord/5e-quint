// Source: https://rpg.stackexchange.com/q/191093
module _qa_8522a405a006805a {
  import dnd.* from "./dnd"

  // Scrying: familiarity level adjusts target's Wisdom save (secondhand +5, firsthand +0, familiar -5)
  run qa_scrying_familiarity_save_modifiers = {
    val dc    = 15
    val roll  = 10
    // Secondhand (heard of target): +5 to save → 10+5=15 ≥ 15, target resists scrying
    val secondhandResists = saveSucceeds(roll, 0, false, 0, 5, dc)
    // Firsthand (met the target): +0 → 10+0=10 < 15, target fails save
    val firsthandFails    = saveSucceeds(roll, 0, false, 0, 0, dc)
    // Familiar (know well): −5 → 10−5=5 < 15, target fails save more easily
    val familiarFails     = saveSucceeds(roll, 0, false, 0, -5, dc)
    assert(secondhandResists and not(firsthandFails) and not(familiarFails))
  }
  
  // Scrying: physical connection bonus stacks additively with familiarity modifier
  run qa_scrying_connection_bonus_stacks = {
    val dc   = 15
    val roll = 10
    // Secondhand (+5) alone: 10+5=15, save succeeds (no connection)
    val noConnection   = saveSucceeds(roll, 0, false, 0, 5,  dc)
    // Secondhand (+5) + likeness (−2) = +3 net: 10+3=13 < 15, fails
    val withLikeness   = saveSucceeds(roll, 0, false, 0, 3,  dc)
    // Secondhand (+5) + possession (−4) = +1 net: 10+1=11 < 15, fails
    val withPossession = saveSucceeds(roll, 0, false, 0, 1,  dc)
    // Secondhand (+5) + body part (−10) = −5 net: 10−5=5 < 15, fails
    val withBodyPart   = saveSucceeds(roll, 0, false, 0, -5, dc)
    assert(noConnection and not(withLikeness) and not(withPossession) and not(withBodyPart))
  }
  
  // Scrying: firsthand + body part (−10) makes save far harder than familiar (−5) alone
  run qa_scrying_body_part_beats_familiar_alone = {
    val dc   = 15
    val roll = 14
    // Familiar (−5): 14−5=9 < 15, fails
    val familiarOnly      = saveSucceeds(roll, 0, false, 0, -5,  dc)
    // Firsthand (0) + body part (−10) = −10: 14−10=4 < 15, also fails
    val firsthandBodyPart = saveSucceeds(roll, 0, false, 0, -10, dc)
    // Firsthand (0) alone: 14+0=14 < 15, fails — body part is decisive
    val firsthandOnly     = saveSucceeds(roll, 0, false, 0, 0,   dc)
    // Secondhand (+5) alone: 14+5=19 ≥ 15, succeeds — shows secondhand is hardest to scry
    val secondhandOnly    = saveSucceeds(roll, 0, false, 0, 5,   dc)
    assert(not(familiarOnly) and not(firsthandBodyPart) and not(firsthandOnly) and secondhandOnly)
  }
}
