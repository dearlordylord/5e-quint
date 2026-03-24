// Source: https://rpg.stackexchange.com/q/89879
module _qa_0f9608e3e226ad2d {
  import dnd.* from "./dnd"

  // 5e: Catapult Spell: Does my enemy gain advantage Dex Save within 5'
  run qa_no_advantage_on_dex_save_within_5ft = {
    // RAW: being within 5 feet of the caster grants no advantage on a saving throw.
    // pSaveModifiers has no proximity parameter; saveSucceeds has no proximity parameter.
    val creature = freshCreature(20)
    val dexMod = abilityModifier(12) // score 12 → +1
    val dc = 13
    // Conditionless creature: pSaveModifiers returns clean slate for Dex
    val mods = pSaveModifiers(creature, Dex)
    // Both calls are identical — proximity simply doesn't exist as an input
    val saveWithin5ft = saveSucceeds(12, dexMod, false, 0, 0, dc)
    val saveBeyond5ft = saveSucceeds(12, dexMod, false, 0, 0, dc)
    assert(
      // No advantage granted by proximity
      not(mods.hasAdvantage)
      // No disadvantage either (clean creature, no relevant conditions)
      and not(mods.hasDisadvantage)
      // No auto-fail
      and not(mods.autoFail)
      // Save succeeds purely on roll + mod >= DC (12 + 1 = 13 >= 13)
      and saveWithin5ft == true
      // Result is identical regardless of fictional proximity — same function, same inputs
      and saveWithin5ft == saveBeyond5ft
    )
  }
  
  // 5e: Catapult Spell: Does my enemy gain advantage Dex Save within 5' (contrast: conditions DO matter)
  run qa_save_modifiers_are_condition_not_proximity_based = {
    // Contrast: conditions like Restrained genuinely impose disadvantage on Dex saves,
    // but proximity to the caster is not a condition and grants nothing.
    val normalCreature    = freshCreature(20)
    val restrainedCreature = pApplyCondition(freshCreature(20), CRestrained)
    val modsNormal     = pSaveModifiers(normalCreature, Dex)
    val modsRestrained = pSaveModifiers(restrainedCreature, Dex)
    assert(
      // Proximity (no condition) → no save modifier
      not(modsNormal.hasDisadvantage)
      // Restrained condition → disadvantage on Dex saves (PHB conditions, not proximity)
      and modsRestrained.hasDisadvantage
    )
  }
}
