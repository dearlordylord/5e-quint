// Source: https://rpg.stackexchange.com/q/127297
module _qa_a0673a6c156bedf9 {
  import dnd.* from "./dnd"

  // Is there a reason this homebrew spell wouldn't work with the Attack action?
  run qa_lightning_lash_attack_action_next_turn = {
    val creature = freshCreature(20)
    // Turn 1: cast 2nd-level concentration spell — uses action, starts concentration
    val t1 = pMarkNonCantripActionSpell(pUseAction(FRESH_TURN, creature, ACastSpell))
    val ss1 = pStartConcentration(FRESH_SPELL_SLOTS, "lightning_lash")
    // Turn 2: fresh turn — Attack action fully available (arc persists via concentration)
    val t2 = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    val t2a = pUseAction(t2, creature, AAttack)
    assert(
      t1.actionUsed and
      isConcentrating(ss1) and
      not(t2.actionUsed) and
      t2a.attackActionUsed
    )
  }
  
  // Is there a reason this homebrew spell wouldn't work with the Attack action?
  run qa_lightning_lash_light_property_enables_twf = {
    // Arc has finesse + light + reach — Light_ qualifies it for TWF off-hand
    val lightningArc = {
      name: "lightning_arc",
      damageDie: 4,
      versatileDie: 0,
      damageType: Lightning,
      properties: Set(Finesse, Light_, Reach),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val dagger = {
      name: "dagger",
      damageDie: 4,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Finesse, Light_, Thrown),
      isMelee: true,
      normalRange: 20,
      longRange: 60,
    }
    val creature = freshCreature(20)
    // Attack action already taken this turn; bonus action still available
    val t = FRESH_TURN.with("attackActionUsed", true)
    assert(pCanTWFWithWeapons(lightningArc, dagger, t, creature))
  }
  
  // Is there a reason this homebrew spell wouldn't work with the Attack action?
  run qa_lightning_lash_concentration_check = {
    val ss = pStartConcentration(FRESH_SPELL_SLOTS, "lightning_lash")
    // Taking damage requires CON save; failure ends the spell
    val ss_fail = pConcentrationCheck(ss, false)
    val ss_pass = pConcentrationCheck(ss, true)
    assert(
      isConcentrating(ss) and
      not(isConcentrating(ss_fail)) and
      isConcentrating(ss_pass)
    )
  }
  
  // Is there a reason this homebrew spell wouldn't work with the Attack action?
  run qa_lightning_lash_extra_attack_applies = {
    // Arc acts as a melee weapon — Extra Attack applies identically to any other weapon
    val creature = freshCreature(20)
    // TEST_CONFIG: level 5 with FExtraAttack => extraAttacksRemaining starts at 1
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    val t1 = pUseAction(t, creature, AAttack)
    val t2 = pUseExtraAttack(t1)
    assert(
      t1.extraAttacksRemaining == 1 and
      t2.extraAttacksRemaining == 0
    )
  }
}
