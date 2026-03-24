// Source: https://rpg.stackexchange.com/q/96950
module _qa_6f0582130487b21f {
  import dnd.* from "./dnd"

  // Can a druid in Ape wildshape use weapons? — accepted: proficiency is retained in wild shape
  run qa_wildshape_ape_weapon_proficiency_retained = {
    // Giant Ape STR 28 (mod +9); use a level 5 druid retaining proficiency
    // Demonstrate: same roll hits WITH prof, misses WITHOUT prof
    val apeSuperStrMod = abilityModifier(16) // ape STR 16 → +3 for a normal Ape
    val profBonus     = proficiencyBonus(5)  // level 5 druid → +3
    val attackBonusWithProf    = apeSuperStrMod + profBonus // +6
    val attackBonusWithoutProf = apeSuperStrMod             // +3
    val targetAC = 18
    val roll     = 12
    // Retained proficiency (accepted answer): 12 + 6 = 18 >= 18 → hits
    val withProf    = resolveAttackRoll(roll, attackBonusWithProf,    targetAC, 0)
    // Without proficiency (alt ruling):       12 + 3 = 15 < 18  → misses
    val withoutProf = resolveAttackRoll(roll, attackBonusWithoutProf, targetAC, 0)
    assert(withProf.hits and not(withoutProf.hits))
  }
  
  // Can a druid in Ape wildshape use weapons? — non-finesse melee weapon uses STR modifier
  run qa_wildshape_ape_spear_uses_str_mod = {
    // Spear: melee, Thrown + Versatile, no Finesse → weaponAttackAbility picks STR
    val spear: Weapon = {
      name: "spear",
      damageDie: 6,
      versatileDie: 8,
      damageType: Piercing,
      properties: Set(Thrown, Versatile),
      isMelee: true,
      normalRange: 20,
      longRange: 60,
    }
    val strMod = abilityModifier(16) // ape STR 16 → +3
    val dexMod = abilityModifier(14) // ape DEX 14 → +2
    val chosen = weaponAttackAbility(spear, strMod, dexMod)
    assert(chosen == strMod)
  }
}
