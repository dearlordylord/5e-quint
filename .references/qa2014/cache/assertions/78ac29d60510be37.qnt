// Source: https://rpg.stackexchange.com/q/192434
module _qa_78ac29d60510be37 {
  import dnd.* from "./dnd"

  // Thunder Gauntlets: no Light property blocks TWF by default (Armorer Artificer attack rules)
  run qa_thunder_gauntlets_no_twf_without_light_property = {
    val thunderGauntlet: Weapon = {
      name: "thunder_gauntlet",
      damageDie: 8,
      versatileDie: 0,
      damageType: Thunder,
      properties: Set(),   // simple melee, no Light_
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    // attack action already taken this turn, bonus action still available
    val t = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(30)
    assert(not(pCanTWFWithWeapons(thunderGauntlet, thunderGauntlet, t, creature)))
  }
  
  // Level 5 Artificer (Extra Attack feature) gets 1 extra attack on the Attack action
  run qa_thunder_gauntlets_level5_extra_attack = {
    val creature = freshCreature(30)
    // TEST_CONFIG is level 5 with FExtraAttack — matches Artificer 5
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    assert(t.extraAttacksRemaining == 1)
  }
  
  // Thunder Gauntlets WITH Light_ property (simulating Dual Wielder feat override) enables TWF
  run qa_thunder_gauntlets_twf_enabled_with_light = {
    val lightGauntlet: Weapon = {
      name: "thunder_gauntlet_light",
      damageDie: 8,
      versatileDie: 0,
      damageType: Thunder,
      properties: Set(Light_),   // Dual Wielder feat effectively grants this path
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val t = FRESH_TURN.with("attackActionUsed", true)
    val creature = freshCreature(30)
    assert(pCanTWFWithWeapons(lightGauntlet, lightGauntlet, t, creature))
  }
  
  // Off-hand gauntlet hit via TWF: no ability modifier added to damage (unless negative)
  run qa_thunder_gauntlets_twf_offhand_no_ability_mod = {
    // positive STR mod: not added to off-hand damage
    val diceResult = 6   // rolled 6 on d8
    val strMod = 3
    assert(pTWFOffHandDamage(diceResult, strMod) == 6)
  }
  
  // Off-hand gauntlet hit via TWF: negative ability modifier IS subtracted
  run qa_thunder_gauntlets_twf_offhand_negative_mod_applied = {
    val diceResult = 4
    val strMod = -1   // negative penalty applies
    assert(pTWFOffHandDamage(diceResult, strMod) == 3)
  }
}
