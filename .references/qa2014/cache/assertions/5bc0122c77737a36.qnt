// Source: https://rpg.stackexchange.com/q/203682
module _qa_5bc0122c77737a36 {
  import dnd.* from "./dnd"

  // Can a Path of Wild Magic Barbarian/Rogue use a greataxe (with Thrown from Wild Surge) for sneak attack?
  run qa_thrown_property_does_not_enable_sneak_attack = {
    // Greataxe after Wild Surge #4: gains Thrown (and Light), damage becomes Force,
    // but the weapon's melee classification is unchanged — Thrown ≠ Ranged Weapon
    val greataxeWithThrown: Weapon = {
      name: "greataxe",
      damageDie: 12,
      versatileDie: 0,
      damageType: Force,
      properties: Set(Heavy, TwoHanded, Light_, Thrown),
      isMelee: true,     // still a melee weapon; Thrown does not reclassify it
      normalRange: 20,   // Thrown supplies a range, but category stays melee
      longRange: 60,
    }
    // Sneak Attack eligibility: weapon must have Finesse OR be a ranged weapon (not isMelee)
    val sneakAttackEligible =
      greataxeWithThrown.properties.contains(Finesse) or not(greataxeWithThrown.isMelee)
    assert(not(sneakAttackEligible))
  }
}
