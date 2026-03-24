// Source: https://rpg.stackexchange.com/q/116269
module _qa_e7bd1a71edd2b64a {
  import dnd.* from "./dnd"

  // Does Empowered Evocation still work if you Overchannel?
  // Overchannel supplies the max dice result; Empowered Evocation adds INT mod — neither prevents the other.
  run qa_overchannel_empowered_evocation_stack = {
    // Wizard with INT 14 → modifier +2
    val intMod = abilityModifier(14)
    // Overchannel: roll maximum on each die; 2d6 per Scorching Ray beam → max = 12
    val overchannelMaxDice = 12
    // Empowered Evocation adds INT mod as a damage modifier on top of the (max) dice result
    val combinedDamage = normalDamage(overchannelMaxDice, intMod)
    assert(intMod == 2 and combinedDamage == 14)
  }
  
  // Non-evocation damage spell with Overchannel: Empowered Evocation does NOT apply, no INT mod bonus
  run qa_overchannel_non_evocation_no_empowered_evocation = {
    val intMod = abilityModifier(14)
    val overchannelMaxDice = 12
    // Without Empowered Evocation the modifier is 0
    val damageNoEmpEvoc   = normalDamage(overchannelMaxDice, 0)
    val damageWithEmpEvoc = normalDamage(overchannelMaxDice, intMod)
    assert(damageNoEmpEvoc == 12 and damageWithEmpEvoc == 14 and damageWithEmpEvoc > damageNoEmpEvoc)
  }
}
