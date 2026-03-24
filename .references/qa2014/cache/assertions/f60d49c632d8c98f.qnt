// Source: https://rpg.stackexchange.com/q/160282
module _qa_f60d49c632d8c98f {
  import dnd.* from "./dnd"

  // Does Heat Metal work on weapons impaled into enemies? - physical contact means fire damage applies
  run qa_heat_metal_embedded_physical_contact_takes_fire_damage = {
    // Accepted: "Any creature in physical contact with the object takes 2d8 fire damage"
    // An embedded dagger counts as physical contact → fire damage applies (2d8 pre-resolved as 10)
    val creature = freshCreature(20)
    val afterDamage = pTakeDamage(creature, 10, Fire, Set(), Set(), Set(), false)
    assert(afterDamage.hp == 10)
  }
  
  // Does Heat Metal work on weapons impaled into enemies? - bonus action repeats fire damage on subsequent turns
  run qa_heat_metal_embedded_repeated_damage = {
    // Accepted: "you can use a bonus action on each of your subsequent turns to cause this damage again"
    // Two rounds of 2d8 fire damage (pre-resolved as 9 each) from embedded heated weapon
    val creature = freshCreature(30)
    val afterRound1 = pTakeDamage(creature, 9, Fire, Set(), Set(), Set(), false)
    val afterRound2 = pTakeDamage(afterRound1, 9, Fire, Set(), Set(), Set(), false)
    assert(afterRound2.hp == 12)
  }
  
  // Does Heat Metal work on weapons impaled into enemies? - embedded != "holding or wearing", no secondary disadvantage
  run qa_heat_metal_embedded_not_holding_no_attack_disadvantage = {
    // Accepted: "I don't think having a knife embedded in you would count as 'holding' or 'wearing'"
    // → Con-save-or-drop and attack-roll disadvantage secondary effects do NOT apply to embedded weapon
    // Taking only fire damage (no "holding" condition) leaves attack modifiers clean
    val creature = freshCreature(20)
    val afterFire = pTakeDamage(creature, 10, Fire, Set(), Set(), Set(), false)
    // No condition was applied by the fire damage itself; pOwnAttackModifiers reflects no disadvantage
    val mods = pOwnAttackModifiers(afterFire, false)
    assert(not(mods.hasDisadvantage) and not(afterFire.poisoned) and not(afterFire.restrained))
  }
  
  // Does Heat Metal work on weapons impaled into enemies? - fire damage from embedded weapon requires concentration check
  run qa_heat_metal_embedded_fire_damage_concentration_check = {
    // Taking fire damage from heated embedded weapon triggers concentration check
    // DC = max(10, damage/2); failed save breaks concentration, passed save maintains it
    val dc = pConcentrationDC(10)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "bless")
    val afterFail = pConcentrationCheck(ss, false)
    val afterPass = pConcentrationCheck(ss, true)
    assert(
      dc == 10
      and afterFail.concentrationSpellId == ""
      and afterPass.concentrationSpellId == "bless"
    )
  }
}
