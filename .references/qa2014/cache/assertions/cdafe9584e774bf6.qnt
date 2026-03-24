// Source: https://rpg.stackexchange.com/q/135220
module _qa_cdafe9584e774bf6 {
  import dnd.* from "./dnd"

  // "What fire spells would trigger the Slippery Ice effect in Against the Giants?"
  run qa_slippery_ice_aoe_fire_fail_prone = {
    // AoE fire spells (Fireball, Burning Hands) trigger slippery ice; creature failing DC 10 Dex (Acrobatics) check falls prone
    val creature = freshCreature(20)
    val dexMod = abilityModifier(10) // Dex 10 → mod 0
    val profBonus = proficiencyBonus(1)
    // d20=5, 5+0=5 < 10 → fails
    val checkPassed = checkSucceeds(5, dexMod, NoneProf, profBonus, 0, 10)
    val result = if (checkPassed) creature else pApplyCondition(creature, CProne)
    assert(not(checkPassed) and result.prone)
  }
  
  // "What fire spells would trigger the Slippery Ice effect in Against the Giants?"
  run qa_slippery_ice_aoe_fire_pass_not_prone = {
    // AoE fire triggers slippery ice; creature succeeding DC 10 Dex (Acrobatics) check stays upright
    val creature = freshCreature(20)
    val dexMod = abilityModifier(14) // Dex 14 → mod +2
    val profBonus = proficiencyBonus(1)
    // d20=10, 10+2=12 >= 10 → passes
    val checkPassed = checkSucceeds(10, dexMod, NoneProf, profBonus, 0, 10)
    val result = if (checkPassed) creature else pApplyCondition(creature, CProne)
    assert(checkPassed and not(result.prone))
  }
  
  // "What fire spells would trigger the Slippery Ice effect in Against the Giants?"
  run qa_slippery_ice_single_target_no_area_no_check = {
    // Fire Bolt / Scorching Ray have no area of effect → slippery ice rule never triggers → no DC 10 check → creature stays upright
    val creature = freshCreature(20)
    val isAoEFireSpell = false // single-target spells lack an area of effect
    // slippery ice only applies when an AoE fire effect is used; single-target → skip check entirely
    val result = if (isAoEFireSpell) pApplyCondition(creature, CProne) else creature
    assert(not(isAoEFireSpell) and not(result.prone))
  }
  
  // "What fire spells would trigger the Slippery Ice effect in Against the Giants?"
  run qa_slippery_ice_fog_renders_heavily_obscured = {
    // 5-minute fog produced by slippery ice effect renders the affected area heavily obscured;
    // creatures inside are effectively blinded and sight-based Perception checks suffer disadvantage
    val fogObscurement = HeavilyObscured
    assert(pBlindedByObscurement(fogObscurement) and pPerceptionDisadvantage(fogObscurement))
  }
}
