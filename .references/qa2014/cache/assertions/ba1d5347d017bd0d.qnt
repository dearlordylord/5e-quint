// Source: https://rpg.stackexchange.com/q/154326
module _qa_ba1d5347d017bd0d {
  import dnd.* from "./dnd"

  // "Does the Raven Queen's Sentinel Raven apply a bonus to passive Perception twice?"
  // Accepted answer: Combining Game Effects (DMG 252) means same-named bonus applies once only.
  // passive Perception = 10 + WIS mod + prof + CHA mod (once), NOT + CHA mod twice.
  run qa_sentinel_raven_cha_bonus_applies_once = {
    // WIS 14 → +2, CHA 16 → +3, level 1 → prof +2, proficient in Perception
    val wisMod  = abilityModifier(14)  // +2
    val chaMod  = abilityModifier(16)  // +3
    val prof    = proficiencyBonus(1)  // +2
  
    // Accepted answer: CHA bonus applies once (DMG Combining Game Effects rule)
    // passiveCheck folds misc bonuses into abilityMod; add chaMod once
    val passiveOnce  = passiveCheck(wisMod + chaMod,         Proficient, prof, false, false)
    // Rejected double-dip interpretation
    val passiveTwice = passiveCheck(wisMod + chaMod + chaMod, Proficient, prof, false, false)
  
    assert(
      // 10 + (2+3) + 2 = 17
      passiveOnce  == 17
      // 10 + (2+3+3) + 2 = 20  — wrong per accepted answer
      and passiveTwice == 20
      // The two interpretations differ; the correct one is passiveOnce
      and passiveOnce != passiveTwice
    )
  }
}
