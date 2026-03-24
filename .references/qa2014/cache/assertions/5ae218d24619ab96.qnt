// Source: https://rpg.stackexchange.com/q/130108
module _qa_5ae218d24619ab96 {
  import dnd.* from "./dnd"

  // Does feeblemind change the effect of Command Undead on high intelligence targets?
  run qa_feeblemind_removes_command_undead_repeat_threshold = {
    // Feeblemind reduces INT to 1; INT<12 removes hourly-repeat clause, INT<8 removes advantage clause
    val vampireIntBefore = 14   // typical vampire INT (>= 12 → gets hourly repeats)
    val feeblemindedInt  = 1    // feeblemind sets INT to 1
  
    val hasAdvantage_pre     = vampireIntBefore >= 8
    val hasHourlyRepeat_pre  = vampireIntBefore >= 12
    val hasAdvantage_post    = feeblemindedInt >= 8
    val hasHourlyRepeat_post = feeblemindedInt >= 12
  
    assert(
      // before feeblemind: both thresholds met
      hasAdvantage_pre and hasHourlyRepeat_pre
      // after feeblemind: neither threshold met
      and not(hasAdvantage_post) and not(hasHourlyRepeat_post)
    )
  }
  
  // Does feeblemind change the effect of Command Undead on high intelligence targets?
  run qa_feeblemind_cha1_almost_guarantees_command_undead_failure = {
    // Feeblemind also sets CHA to 1 → -5 modifier on the Charisma save
    val feeblemindedChaMod = abilityModifier(1)  // (1-10)/2 floor = -5
  
    // Level-14 wizard, INT 20: spell save DC = 8 + profBonus(14) + intMod(20)
    //   profBonus(14) = (14-1)/4 + 2 = 3+2 = 5
    //   abilityModifier(20) = 5
    //   DC = 18
    val wizDC = 8 + proficiencyBonus(14) + abilityModifier(20)
  
    // Even a natural 20 roll (not a guaranteed success on saves in 5e) still fails
    val roll20Passes = saveSucceeds(20, feeblemindedChaMod, false, 0, 0, wizDC)
    // A middling roll of 12 also fails
    val roll12Passes = saveSucceeds(12, feeblemindedChaMod, false, 0, 0, wizDC)
  
    assert(
      feeblemindedChaMod == -5
      and wizDC == 18
      and not(roll20Passes)   // 20 + (-5) = 15 < 18
      and not(roll12Passes)   // 12 + (-5) = 7  < 18
    )
  }
}
