// Source: https://rpg.stackexchange.com/q/110209
module _qa_d153a33a045d0ed9 {
  import dnd.* from "./dnd"

  // Does the fire damage of a bow still work with lightning arrow?
  // Rule: Lightning Arrow replaces the weapon's normal damage including magical bonus damage
  // (e.g., Opal of the Ild Rune 1d6 fire) — fire rune is part of the bow's normal damage profile.
  run qa_lightning_arrow_replaces_bow_fire_rune_damage = {
    val creature = freshCreature(40)
  
    // Normal bow attack: 1d8 piercing (roll=6) + DEX mod 2 = 8, plus 1d6 fire from rune (roll=3) = 3
    val normalBowDmg = normalDamage(6, 2)   // 8 piercing
    val fireRuneDmg  = normalDamage(3, 0)   // 3 fire (Opal of the Ild Rune bonus)
  
    val afterPiercing  = pTakeDamage(creature, normalBowDmg, Piercing, Set(), Set(), Set(), false)
    val afterNormalBow = pTakeDamage(afterPiercing, fireRuneDmg, Fire, Set(), Set(), Set(), false)
  
    // Lightning Arrow replaces ALL weapon damage: only the spell's lightning damage applies.
    // Fire rune bonus is part of the bow's normal damage and is therefore replaced — not added on top.
    val lightningDmg = normalDamage(14, 0)  // 4d8 lightning on hit (roll=14)
    val afterLightningArrow = pTakeDamage(creature, lightningDmg, Lightning, Set(), Set(), Set(), false)
  
    assert(
      afterNormalBow.hp == 29                              // 40 - 8 - 3: both piercing and fire apply normally
      and afterLightningArrow.hp == 26                     // 40 - 14: only lightning, fire rune excluded
      and afterLightningArrow.hp != (40 - 14 - fireRuneDmg) // fire NOT wrongly stacked onto lightning (would be 23)
    )
  }
}
