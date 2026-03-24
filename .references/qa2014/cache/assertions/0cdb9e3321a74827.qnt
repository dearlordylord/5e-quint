// Source: https://rpg.stackexchange.com/q/74267
module _qa_0cdb9e3321a74827 {
  import dnd.* from "./dnd"

  // Rod of Lordly Might: per 2018 DMG errata, choosing greatsword form gives Heavy property — Small barbarian has disadvantage
  run qa_rolm_greatsword_heavy_small_has_disadvantage = {
    val rolmAsGreatsword: Weapon = {
      name: "RoLM Greatsword",
      damageDie: 6,
      versatileDie: 0,
      damageType: Slashing,
      properties: Set(Heavy, TwoHanded),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    assert(heavyWeaponDisadvantage(rolmAsGreatsword, Small))
  }
  
  // Rod of Lordly Might: greatsword form — Medium barbarian does NOT have heavy weapon disadvantage
  run qa_rolm_greatsword_heavy_medium_no_disadvantage = {
    val rolmAsGreatsword: Weapon = {
      name: "RoLM Greatsword",
      damageDie: 6,
      versatileDie: 0,
      damageType: Slashing,
      properties: Set(Heavy, TwoHanded),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    assert(not(heavyWeaponDisadvantage(rolmAsGreatsword, Medium)))
  }
  
  // Rod of Lordly Might: choosing scimitar (finesse) form, wielder uses the higher of STR or DEX for attack rolls
  run qa_rolm_scimitar_finesse_picks_higher_mod = {
    val rolmAsScimitar: Weapon = {
      name: "RoLM Scimitar",
      damageDie: 6,
      versatileDie: 0,
      damageType: Slashing,
      properties: Set(Finesse, Light_),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val strMod = 2  // STR 14
    val dexMod = 4  // DEX 18
    assert(weaponAttackAbility(rolmAsScimitar, strMod, dexMod) == dexMod)
  }
  
  // Rod of Lordly Might: longsword form (no Finesse) uses STR for melee attack rolls, not DEX
  run qa_rolm_longsword_non_finesse_uses_str = {
    val rolmAsLongsword: Weapon = {
      name: "RoLM Longsword",
      damageDie: 8,
      versatileDie: 10,
      damageType: Slashing,
      properties: Set(Versatile),
      isMelee: true,
      normalRange: 0,
      longRange: 0,
    }
    val strMod = 3  // STR 16
    val dexMod = 1  // DEX 12
    assert(weaponAttackAbility(rolmAsLongsword, strMod, dexMod) == strMod)
  }
}
