// Source: https://rpg.stackexchange.com/q/142688
module _qa_1666d31184409f0d {
  import dnd.* from "./dnd"

  // Do natural melee weapons (from racial traits) trigger Improved Divine Smite?
  // Natural melee weapons (isMelee: true) qualify; unarmed strikes (unarmedDamage path) do not.
  run qa_natural_weapon_ids_eligible = {
    // Minotaur horns: racial trait explicitly says "natural melee weapons" → isMelee: true
    val horns: Weapon = {
      name: "horns",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val strMod = 3
    // Attack hits: roll 15, STR bonus +3, vs AC 15, no cover → total 18 >= 15
    val attackResult = resolveAttackRoll(15, weaponAttackAbility(horns, strMod, 1), 15, 0)
    // Weapon damage: 1d6 (roll 4) + STR mod
    val weaponDmg = normalDamage(4, strMod)
    // IDS triggers because horns.isMelee == true: extra 1d8 (roll 5) radiant, no ability mod
    val idsDmg = normalDamage(5, 0)
    val target = freshCreature(20)
    val s1 = pTakeDamage(target, weaponDmg, Piercing, Set(), Set(), Set(), false)
    val s2 = pTakeDamage(s1, idsDmg, Radiant, Set(), Set(), Set(), false)
    assert(
      horns.isMelee         // natural melee weapon IS a melee weapon → IDS applies
      and attackResult.hits
      and weaponDmg == 7    // 4 + 3
      and idsDmg == 5       // IDS: 1d8 roll 5
      and s2.hp == 8        // 20 - 7 - 5 = 8
    )
  }
  
  // Unarmed strikes are "none of which count as weapons" (PHB p.195) → IDS does NOT trigger
  run qa_unarmed_strike_no_ids = {
    val strMod = 3
    // Unarmed strike uses unarmedDamage — not a Weapon record, no isMelee property
    val unarmedDmg = unarmedDamage(strMod)
    val target = freshCreature(20)
    // Only unarmed damage applied — IDS bonus absent because code path is not a weapon
    val s1 = pTakeDamage(target, unarmedDmg, Bludgeoning, Set(), Set(), Set(), false)
    assert(
      unarmedDmg == 4   // 1 + 3, no IDS bonus added
      and s1.hp == 16   // 20 - 4 = 16
    )
  }
}
