// Source: https://rpg.stackexchange.com/q/70308
module _qa_0123797f2da5c116 {
  import dnd.* from "./dnd"

  // Would a Flameskull remember who killed it in previous attacks?
  // INT 16 gives +3 modifier — the mechanical basis for the accepted answer's strategic reasoning claim
  run qa_flameskull_int16_modifier = {
    assert(abilityModifier(16) == 3)
  }
  
  // Would a Flameskull remember who killed it in previous attacks?
  // Flameskull (INT 16, proficient, CR 4 ≈ level 4 proficiency bonus) has passive INT 15 — high enough for tactical memory
  run qa_flameskull_passive_int_check = {
    val intMod = abilityModifier(16)
    val prof    = proficiencyBonus(4)
    val passive = passiveCheck(intMod, Proficient, prof, false, false)
    assert(intMod == 3 and prof == 2 and passive == 15)
  }
}
