// Source: https://rpg.stackexchange.com/q/210831
module _qa_0ac53ffcc0cd203a {
  import dnd.* from "./dnd"

  // Is it possible to hold back on skill checks by using a lower modifier than you actually have in the rules as written?
  run qa_cannot_reduce_modifier_for_skill_check = {
    // RAW: ability modifier is fixed by score; spec provides no mechanism to voluntarily use a lower value.
    // STR 16 → mod +3; no rule allows pretending to have mod +0 to feign weakness.
    val actualMod    = abilityModifier(16)  // +3, fixed by score
    val pretendMod   = abilityModifier(10)  // +0, the "held back" value — non-RAW, not supported
    val profBonus    = proficiencyBonus(3)  // level 3 → +2
    val dc           = 14
    val d20Roll      = 11
    // RAW result (must use actual mod): 11 + 3 + 0 = 14 >= 14 → succeeds
    val rawResult      = checkSucceeds(d20Roll, actualMod,  NoneProf, profBonus, 0, dc)
    // Non-RAW "held back" result: 11 + 0 + 0 = 11 < 14 → fails (but this path has no spec support)
    val heldBackResult = checkSucceeds(d20Roll, pretendMod, NoneProf, profBonus, 0, dc)
    // abilityModifier is deterministic from score — no choosable reduction exists in the spec
    assert(
      actualMod      == 3    and  // modifier fixed, not chooseable
      rawResult      == true and  // must use the real modifier per RAW
      heldBackResult == false     // the "held back" outcome only reachable via a non-RAW fake input
    )
  }
}
