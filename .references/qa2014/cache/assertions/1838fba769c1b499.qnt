// Source: https://rpg.stackexchange.com/q/212350
module _qa_1838fba769c1b499 {
  import dnd.* from "./dnd"

  // Will it break Counterspell if the trigger becomes "perceive" instead of "see"?
  // Old rule: caster behind a pillar (total cover) cannot be targeted at all — counterspell impossible
  run qa_counterspell_total_cover_blocks_targeting = {
    assert(canBeTargeted(TotalCover) == false)
  }
  
  // Will it break Counterspell if the trigger becomes "perceive" instead of "see"?
  // Old rule: caster standing in magical Darkness without darkvision is heavily obscured (effectively blinded to observers)
  run qa_counterspell_darkness_no_darkvision_heavily_obscured = {
    assert(pEffectiveObscurement(Dark, false) == HeavilyObscured)
  }
  
  // Will it break Counterspell if the trigger becomes "perceive" instead of "see"?
  // Old rule: heavily obscured (e.g. Darkness zone) counts as blinded — sight-based perception fails
  run qa_counterspell_heavily_obscured_implies_blinded = {
    assert(pBlindedByObscurement(HeavilyObscured) == true)
  }
  
  // Will it break Counterspell if the trigger becomes "perceive" instead of "see"?
  // Old rule: Greater Invisibility caster is invisible — attacks (and sight-based targeting) against them have disadvantage;
  // under old "see" rule you cannot counterspell them even while casting
  run qa_counterspell_invisible_caster_cannot_be_seen = {
    val invisCaster = freshCreature(20).with("invisible", true)
    val defMods = pDefenseModifiers(invisCaster, true)
    assert(defMods.attackerDisadvantage)
  }
  
  // Will it break Counterspell if the trigger becomes "perceive" instead of "see"?
  // Partial cover does NOT block targeting — caster with half-cover can still be seen and counterspelled under old rule
  run qa_counterspell_partial_cover_still_targetable = {
    assert(canBeTargeted(HalfCover) == true and canBeTargeted(ThreeQuartersCover) == true)
  }
  
  // Will it break Counterspell if the trigger becomes "perceive" instead of "see"?
  // Darkvision in Darkness yields only lightly-obscured (not blinded), so sight persists for counterspell trigger
  run qa_counterspell_darkvision_in_darkness_not_blinded = {
    assert(pEffectiveObscurement(Dark, true) == LightlyObscured)
    and assert(pBlindedByObscurement(LightlyObscured) == false)
  }
}
