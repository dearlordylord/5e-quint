// Source: https://rpg.stackexchange.com/q/212191
module _qa_a959225774e71ecc {
  import dnd.* from "./dnd"

  // Can my Battle Smith Artificer attack twice with his musket?
  // Repeating Shot infusion removes Loading property, enabling Extra Attack
  run qa_battle_smith_repeating_shot_removes_loading = {
    val musketRepeatShot: Weapon = {
      name: "musket_repeating_shot",
      damageDie: 12,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, TwoHanded),  // Loading removed by infusion
      isMelee: false,
      normalRange: 40,
      longRange: 120,
    }
    assert(pCanExtraAttackWithWeapon(musketRepeatShot))
  }
  
  // Can my Battle Smith Artificer attack twice with his musket?
  // Standard musket retains Loading — Extra Attack is blocked
  run qa_battle_smith_loading_blocks_extra_attack = {
    val musketStandard: Weapon = {
      name: "musket_standard",
      damageDie: 12,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, TwoHanded, Loading),
      isMelee: false,
      normalRange: 40,
      longRange: 120,
    }
    assert(not(pCanExtraAttackWithWeapon(musketStandard)))
  }
  
  // Can my Battle Smith Artificer attack twice with his musket?
  // Battle Smith level 5 (FExtraAttack) starts turn with 1 extra attack available
  run qa_battle_smith_extra_attack_turn_state = {
    val creature = freshCreature(30)
    // TEST_CONFIG is level 5 with features: Set(FExtraAttack)
    val t = pStartTurn(TEST_CONFIG, creature, Unarmored, false, 0, false, false)
    assert(t.extraAttacksRemaining == 1)
  }
  
  // Can my Battle Smith Artificer attack twice with his musket?
  // Attack bonus: INT 18 (+4) + PB at level 5 (+3) + Repeating Shot (+1) = +8
  run qa_battle_smith_attack_bonus_total = {
    val intMod    = abilityModifier(18)  // 4
    val pb        = proficiencyBonus(5)  // 3
    val magicBon  = 1                    // Repeating Shot
    assert(intMod + pb + magicBon == 8)
  }
  
  // Can my Battle Smith Artificer attack twice with his musket?
  // Damage: 1d12 roll 10 + INT(+4) + Repeating Shot(+1) = 15
  run qa_battle_smith_damage_calc = {
    val intMod    = abilityModifier(18)        // 4
    val magicBon  = 1                          // Repeating Shot
    val damageMod = intMod + magicBon          // 5
    assert(normalDamage(10, damageMod) == 15)
  }
}
