// Source: https://rpg.stackexchange.com/q/151898
module _qa_b699d060bbe13a97 {
  import dnd.* from "./dnd"

  // From how far away can an illusion be investigated? — Major Image DC formula (level 13, INT 20)
  run qa_illusion_major_image_spell_dc = {
    // Accepted answer: DC = 8 + spellcasting bonus; no RAW distance limit on the check
    // Level 13 caster: profBonus=5, INT 20 mod=5 → DC = 8+5+5 = 18
    val pb = proficiencyBonus(13)
    val am = abilityModifier(20)
    assert(pb == 5 and am == 5 and (8 + pb + am) == 18)
  }
  
  // From how far away can an illusion be investigated? — successful Investigation check exactly meets DC
  run qa_illusion_investigation_check_succeeds_at_dc = {
    // Proficient investigator: INT 16 (+3 mod), level 5 prof +3, roll 12 → 12+3+3=18 ≥ DC 18
    assert(checkSucceeds(12, 3, Proficient, 3, 0, 18))
  }
  
  // From how far away can an illusion be investigated? — non-proficient investigator fails below DC
  run qa_illusion_investigation_check_fails_below_dc = {
    // INT 10 (+0 mod), no Investigation proficiency, roll 17 → 17+0=17 < DC 18
    assert(not(checkSucceeds(17, 0, NoneProf, 3, 0, 18)))
  }
  
  // From how far away can an illusion be investigated? — investigating the image requires spending your action
  run qa_illusion_investigation_uses_action = {
    // Accepted answer: "A creature that uses its action to examine the image"
    val creature = freshCreature(20)
    val t1 = pUseAction(FRESH_TURN, creature, ASearch)
    assert(t1.actionUsed and not(t1.bonusActionUsed))
  }
  
  // From how far away can an illusion be investigated? — expertise doubles contribution, still not guaranteed
  run qa_illusion_investigation_expertise_still_can_fail = {
    // Expertise investigator: INT 14 (+2 mod), level 5 prof +3, expertise → profMultiplier=6
    // Roll 7 → 7+2+6=15 < DC 18
    assert(not(checkSucceeds(7, 2, Expertise, 3, 0, 18)))
  }
  
  // From how far away can an illusion be investigated? — incapacitated creature cannot take the action to investigate
  run qa_illusion_investigation_incapacitated_cannot_act = {
    val creature = freshCreature(20).with("stunned", true)
                                     .with("incapacitatedSources", Set(ISStunned))
    val t1 = pUseAction(FRESH_TURN, creature, ASearch)
    // incapacitated: pUseAction is a no-op, action remains unused
    assert(not(t1.actionUsed))
  }
}
