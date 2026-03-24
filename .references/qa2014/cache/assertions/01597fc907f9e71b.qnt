// Source: https://rpg.stackexchange.com/q/205170
module _qa_01597fc907f9e71b {
  import dnd.* from "./dnd"

  // Is there a RAW rule for how a player could discover what type of skill check needs to be made?
  run qa_dm_determines_skill_check = {
    // PHB: DM picks which check applies based on character's described action; players narrate,
    // DM decides. DM may allow History instead of Arcana for arcane glyphs — both derive from Int_.
    val dc = 15
    val intMod = abilityModifier(16) // score 16 -> +3
    val prof = proficiencyBonus(5)   // level 5 -> +3
  
    // Both candidate skills share the same base ability
    val sameAbility = skillAbility(Arcana) == Int_ and skillAbility(History) == Int_
  
    // Character lacks Arcana prof: 12 + 3 + 0 = 15 >= 15 — barely passes
    val arcanaNoProf = checkSucceeds(12, intMod, NoneProf, prof, 0, dc)
  
    // DM allows History (per creative background); proficient: 12 + 3 + 3 = 18 >= 15 — also passes
    val historyProf = checkSucceeds(12, intMod, Proficient, prof, 0, dc)
  
    // Without any Int proficiency a lower roll fails — player cannot game check selection
    val noProf_lowRoll = checkSucceeds(8, intMod, NoneProf, prof, 0, dc) // 8+3=11 < 15
  
    assert(sameAbility and arcanaNoProf and historyProf and not(noProf_lowRoll))
  }
}
