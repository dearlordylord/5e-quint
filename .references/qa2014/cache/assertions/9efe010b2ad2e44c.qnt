// Source: https://rpg.stackexchange.com/q/184625
module _qa_9efe010b2ad2e44c {
  import dnd.* from "./dnd"

  // Effects of wearing armor without proficiency: Str/Dex disadvantage applies to checks, saves, AND attacks (not attacks only)
  run qa_nonproficient_armor_strdex_disadv = {
    // Chain mail = HeavyArmor; only Light+Medium proficiency → lacks prof
    val lacksProf = lacksArmorProficiency(WearingArmor(CHAIN_MAIL), Set(LightArmor, MediumArmor))
  
    val strMod = abilityModifier(14) // +2
    val dc = 13
  
    // Str ability check: normal roll succeeds, disadvantage roll fails
    val strCheckNormal = checkSucceeds(11, strMod, NoneProf, 4, 0, dc)
    val strCheckDisadv  = checkSucceeds(7,  strMod, NoneProf, 4, 0, dc)
  
    // Accepted answer: the Str/Dex qualifier applies to saving throws too, not just attacks
    val strSaveNormal = saveSucceeds(11, strMod, false, 4, 0, dc)
    val strSaveDisadv  = saveSucceeds(7,  strMod, false, 4, 0, dc)
  
    // Attack roll: same Str/Dex disadvantage pattern
    val attackNormal = resolveAttackRoll(11, strMod, 13, 0)
    val attackDisadv  = resolveAttackRoll(7,  strMod, 13, 0)
  
    assert(
      lacksProf
      and strCheckNormal and not(strCheckDisadv)   // Str check: normal ok, disadv fails
      and strSaveNormal  and not(strSaveDisadv)    // Str save: same (accepted interp — not attacks-only)
      and attackNormal.hits and not(attackDisadv.hits) // Str attack: same
    )
  }
}
