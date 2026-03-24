// Source: https://rpg.stackexchange.com/q/215009
module _qa_f096ed19655ff1d8 {
  import dnd.* from "./dnd"

  // Can Glamour Bard use Enthralling Performance on a roped-up enemy after fighting him?
  // Accepted answer: if the target watched/listened and fails the Wisdom save, they become charmed.
  
  // Enthralling Performance: target fails Wis save against bard's spell save DC → charmed
  run qa_enthralling_performance_failed_save_applies_charm = {
    val bardConfig = TEST_CONFIG
      .with("abilityScores", Map(Str -> 10, Dex -> 10, Con -> 14, Int_ -> 10, Wis -> 12, Cha -> 16))
      .with("level", 3)
      .with("spellcastingAbility", Cha)
      .with("hasSpellcasting", true)
    // DC = 8 + abilityMod(16) + profBonus(3) = 8 + 3 + 2 = 13
    val dc = spellSaveDC(bardConfig)
    // Captain: Wis 11 → mod 0, not proficient in Wis saves
    val captainWisMod = abilityModifier(11)
    val prof = proficiencyBonus(3)
    // Roll 8: 8 + 0 = 8 < 13 → save fails
    val saveFailed = not(saveSucceeds(8, captainWisMod, false, prof, 0, dc))
    val captain = freshCreature(20)
    val captainCharmed = pApplyCondition(captain, CCharmed)
    all {
      assert(dc == 13),
      assert(saveFailed),
      assert(captainCharmed.charmed),
    }
  }
  
  // Enthralling Performance: target succeeds Wis save → not charmed (no hint of attempt)
  run qa_enthralling_performance_success_save_no_charm = {
    val bardConfig = TEST_CONFIG
      .with("abilityScores", Map(Str -> 10, Dex -> 10, Con -> 14, Int_ -> 10, Wis -> 12, Cha -> 16))
      .with("level", 3)
      .with("spellcastingAbility", Cha)
      .with("hasSpellcasting", true)
    val dc = spellSaveDC(bardConfig)
    val captainWisMod = abilityModifier(11)
    val prof = proficiencyBonus(3)
    // Roll 15: 15 + 0 = 15 >= 13 → save succeeds
    val saveSucceeded = saveSucceeds(15, captainWisMod, false, prof, 0, dc)
    val captain = freshCreature(20)
    all {
      assert(dc == 13),
      assert(saveSucceeded),
      assert(not(captain.charmed)),
    }
  }
  
  // Enthralling Performance: DM-granted circumstantial advantage can flip a borderline failure to success
  run qa_enthralling_performance_advantage_flips_failed_save = {
    val bardConfig = TEST_CONFIG
      .with("abilityScores", Map(Str -> 10, Dex -> 10, Con -> 14, Int_ -> 10, Wis -> 12, Cha -> 16))
      .with("level", 3)
      .with("spellcastingAbility", Cha)
      .with("hasSpellcasting", true)
    val dc = spellSaveDC(bardConfig)
    val captainWisMod = abilityModifier(11)
    val prof = proficiencyBonus(3)
    // Without advantage: roll 8, total 8 < 13 → fails
    val failsWithout = not(saveSucceeds(8, captainWisMod, false, prof, 0, dc))
    // With advantage: rolls 8 and 14; take the higher (intMax), total 14 >= 13 → succeeds
    val advRoll = intMax(8, 14)
    val succeedsWith = saveSucceeds(advRoll, captainWisMod, false, prof, 0, dc)
    assert(failsWithout and succeedsWith)
  }
}
