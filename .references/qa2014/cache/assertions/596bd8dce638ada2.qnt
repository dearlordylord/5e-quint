// Source: https://rpg.stackexchange.com/q/182088
module _qa_596bd8dce638ada2 {
  import dnd.* from "./dnd"

  // Grease spell: Can a creature with 10 strength or more jump over the greased area?
  run qa_grease_jump_str10_equals_area_not_sufficient = {
    // STR 10 running long jump covers exactly 10ft — equals the grease square; lands at boundary,
    // does NOT clear it (needs strictly > 10ft), so DEX save still required
    val dist = pLongJumpDistance(10, true)
    val greaseAreaFeet = 10
    assert(dist == greaseAreaFeet and not(dist > greaseAreaFeet))
  }
  
  // Grease spell: Can a creature with 10 strength or more jump over the greased area?
  run qa_grease_jump_str11_clears_area = {
    // STR 11 running long jump covers 11ft > 10ft grease square — clears completely, no DEX save
    val dist = pLongJumpDistance(11, true)
    val greaseAreaFeet = 10
    assert(dist > greaseAreaFeet)
  }
  
  // Grease spell: Can a creature with 10 strength or more jump over the greased area?
  run qa_grease_standing_jump_str10_insufficient = {
    // Without a running start (standing jump), STR 10 covers only 5ft — far short of 10ft area
    val dist = pLongJumpDistance(10, false)
    assert(dist == 5 and dist < 10)
  }
}
