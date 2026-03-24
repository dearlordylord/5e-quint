// Source: https://rpg.stackexchange.com/q/152603
module _qa_b2c934f4ab018e6c {
  import dnd.* from "./dnd"

  // Can I see due to the mundane light source that I carry while I'm invisible?
  run qa_invisible_does_not_apply_blinded = {
    // CInvisible never sets blinded; invisible ≠ blinded in D&D 5e
    val s = pApplyCondition(freshCreature(20), CInvisible)
    assert(s.invisible == true and s.blinded == false)
  }
  
  // Can I see due to the mundane light source that I carry while I'm invisible?
  run qa_bright_light_from_invisible_lantern_unobscured = {
    // Lantern still emits light while invisible; bright light => Unobscured => can see normally
    val obs = pEffectiveObscurement(Bright, false)
    assert(pBlindedByObscurement(obs) == false)
  }
  
  // Can I see due to the mundane light source that I carry while I'm invisible?
  run qa_invisible_creature_sight_checks_not_penalized = {
    // Invisible creature is not blinded, so sight-based checks have no auto-fail or disadvantage
    val s = pApplyCondition(freshCreature(20), CInvisible)
    val mods = pCheckModifiers(s, true, false, false)
    assert(mods.autoFail == false and mods.hasDisadvantage == false)
  }
  
  // Can I see due to the mundane light source that I carry while I'm invisible?
  run qa_invisible_attacker_has_advantage_not_disadvantage = {
    // Invisible creature attacks with advantage (unseen), not disadvantage (not blinded by invisibility)
    val s = pApplyCondition(freshCreature(20), CInvisible)
    val mods = pOwnAttackModifiers(s, false)
    assert(mods.hasAdvantage == true and mods.hasDisadvantage == false)
  }
}
