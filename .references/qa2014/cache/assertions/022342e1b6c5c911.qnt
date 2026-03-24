// Source: https://rpg.stackexchange.com/q/213088
module _qa_022342e1b6c5c911 {
  import dnd.* from "./dnd"

  // Is there a way to swap my longbow from being a ranger for a shortbow?
  run qa_small_creature_longbow_disadvantage = {
    val longbow: Weapon = {
      name: "longbow",
      damageDie: 8,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(Heavy, TwoHanded, Ammunition),
      isMelee: false,
      normalRange: 150,
      longRange: 600,
    }
    val shortbow: Weapon = {
      name: "shortbow",
      damageDie: 6,
      versatileDie: 0,
      damageType: Piercing,
      properties: Set(TwoHanded, Ammunition),
      isMelee: false,
      normalRange: 80,
      longRange: 320,
    }
    // Small fairy ranger: longbow (Heavy) imposes disadvantage; shortbow does not
    assert(
      heavyWeaponDisadvantage(longbow, Small) and
      not(heavyWeaponDisadvantage(shortbow, Small))
    )
  }
}
