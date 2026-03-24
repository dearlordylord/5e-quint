module _qa_69c529d8faef0a06 {
  import dnd.* from "./dnd"

  // Path of the Giant Elemental Cleaver - ranged weapon given Thrown property still uses DEX (still a ranged weapon attack)
  run qa_elemental_cleaver_ranged_thrown_uses_dex = {
    val shortbow_with_thrown: Weapon = {
      name: "shortbow",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, Thrown),  // Elemental Cleaver adds Thrown; Ammunition remains
      isMelee: false,                       // ranged weapon: isMelee unchanged by Thrown property
      normalRange: 80,
      longRange: 320,
    }
    val strMod = 2
    val dexMod = 3
    // Adding Thrown to a ranged weapon doesn't make it a melee weapon; DEX still governs
    assert(weaponAttackAbility(shortbow_with_thrown, strMod, dexMod) == dexMod)
  }
  
  // Path of the Giant Elemental Cleaver - contrast: melee weapon given Thrown uses STR (ranged attack with melee weapon)
  run qa_elemental_cleaver_melee_thrown_uses_str = {
    val longsword_with_thrown: Weapon = {
      name: "longsword",
      damageDie: 8,
      versatileDie: 10,
      damageType: Slashing,
      properties: Set(Versatile, Thrown),  // Elemental Cleaver adds Thrown to melee weapon
      isMelee: true,                       // still a melee weapon
      normalRange: 20,
      longRange: 60,
    }
    val strMod = 3
    val dexMod = 2
    // Melee weapon with Thrown uses STR per Thrown property rule; contrast with ranged weapon above
    assert(weaponAttackAbility(longsword_with_thrown, strMod, dexMod) == strMod)
  }
  
  // Path of the Giant Elemental Cleaver - Sneak Attack eligibility: ranged weapon with Thrown still qualifies (finesse OR ranged weapon)
  run qa_elemental_cleaver_sneak_attack_eligible_ranged = {
    val shortbow_with_thrown: Weapon = {
      name: "shortbow",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, Thrown),
      isMelee: false,
      normalRange: 80,
      longRange: 320,
    }
    // Sneak Attack requires "finesse or ranged weapon"; ranged weapon = not(isMelee)
    val sneakAttackEligible = shortbow_with_thrown.properties.contains(Finesse)
                              or not(shortbow_with_thrown.isMelee)
    assert(sneakAttackEligible)
  }
  
  // Path of the Giant Elemental Cleaver - Archery Fighting Style +2 applies: weapon is still a ranged weapon after Elemental Cleaver
  run qa_elemental_cleaver_archery_style_applies = {
    val shortbow_with_thrown: Weapon = {
      name: "shortbow",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Ammunition, Thrown),
      isMelee: false,
      normalRange: 80,
      longRange: 320,
    }
    val dexMod = 3
    // Archery Fighting Style: +2 to attack rolls with ranged weapons (not(isMelee))
    val archeryBonus = if (not(shortbow_with_thrown.isMelee)) 2 else 0
    val totalAttackBonus = weaponAttackAbility(shortbow_with_thrown, 1, dexMod) + archeryBonus
    // Roll 13 + 5 (dex 3 + archery 2) = 18 >= AC 17 → hits
    val result = resolveAttackRoll(13, totalAttackBonus, 17, 0)
    assert(result.hits and not(result.isCritical))
  }
}
