// Source: https://rpg.stackexchange.com/q/99321
module _qa_84ba6babf8372d86 {
  import dnd.* from "./dnd"

  // Is the target aware of the source of telepathy via Awakened Mind?
  // Accepted answer: origin not immediately known; impersonation resolved as a Deception (Cha) check at DM-set DC.
  run qa_telepathic_deception_uses_cha_check = {
    // Deception is Charisma-based (skillAbility mapping)
    val deceptionAbility = skillAbility(Deception)
    val persuasionAbility = skillAbility(Persuasion)
    // Warlock: CHA 16 (+3), level 5 (prof +3), proficient in Deception
    val chaMod = abilityModifier(16)   // (16-10)/2 = 3
    val prof    = proficiencyBonus(5)  // (5-1)/4 + 2 = 3
    // DC 15 telepathic impersonation check: 12 + 3 + 3 = 18 >= 15 → succeeds
    val withProf    = checkSucceeds(12, chaMod, Proficient, prof, 0, 15)
    // Same roll, no proficiency: 12 + 3 + 0 = 15 < 16 → fails
    val withoutProf = not(checkSucceeds(12, chaMod, NoneProf, prof, 0, 16))
    // Passive Insight of a perceptive NPC (WIS 14, proficient) vs the same DC
    val wisMod = abilityModifier(14)   // (14-10)/2 = 2
    val targetPassiveInsight = passiveCheck(wisMod, Proficient, prof, false, false)  // 10+2+3 = 15
    assert(
      deceptionAbility == Cha
      and persuasionAbility == Cha
      and withProf
      and withoutProf
      and targetPassiveInsight == 15
    )
  }
}
