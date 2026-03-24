// Source: https://rpg.stackexchange.com/q/70619
module _qa_1dccd40f4ec2f48f {
  import dnd.* from "./dnd"

  // Is there currently a feat enabling dextrous grappling?
  run qa_grapple_athletics_defaults_to_str = {
    // PHB: no feat exists for Dex-based grappling; Athletics contests default to Strength
    assert(skillAbility(Athletics) == Str)
  }
  
  // PHB p.175 variant (Skills with Different Abilities): DM may allow Dex for Athletics; checkSucceeds is ability-mod-agnostic
  run qa_grapple_variant_dex_beats_str_at_same_roll = {
    // DEX 14 (+2) vs STR 10 (+0), level 5 prof (+3), roll 15, DC 19
    val dexMod = abilityModifier(14)   // +2
    val strMod = abilityModifier(10)   // +0
    val pb     = proficiencyBonus(5)   // +3
    val roll   = 15
    val dc     = 19
    // variant: 15+2+3=20 >= 19 succeeds; default: 15+0+3=18 < 19 fails
    assert(
      checkSucceeds(roll, dexMod, Proficient, pb, 0, dc) and
      not(checkSucceeds(roll, strMod, Proficient, pb, 0, dc))
    )
  }
}
