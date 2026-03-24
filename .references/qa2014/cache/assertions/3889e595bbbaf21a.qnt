// Source: https://rpg.stackexchange.com/q/55220
module _qa_3889e595bbbaf21a {
  import dnd.* from "./dnd"

  // Hex spell: disadvantage applies only to ability checks with chosen ability, not saving throws or attack rolls
  run qa_hex_disadvantage_only_affects_ability_checks = {
    // Hex imposes disadvantage on ability checks → caller passes the lower of two d20 rolls
    // Lower roll 8 + STR mod 2 = 10 < DC 15 → check fails (Hex disadvantage applied)
    val hexCheckFails = not(checkSucceeds(8, 2, NoneProf, 3, 0, 15))
  
    // Saving throw: Hex does NOT impose disadvantage → full roll 15 + mod 2 = 17 >= DC 15 → succeeds
    val saveNotAffectedByHex = saveSucceeds(15, 2, false, 3, 0, 15)
  
    // Attack roll: Hex does NOT impose disadvantage → full roll 13 + bonus 2 = 15 >= AC 15 → hits
    val attackNotAffectedByHex = resolveAttackRoll(13, 2, 15, 0).hits
  
    assert(hexCheckFails and saveNotAffectedByHex and attackNotAffectedByHex)
  }
}
