// Source: https://rpg.stackexchange.com/q/109595
module _qa_5c42531d69e93b73 {
  import dnd.* from "./dnd"

  // Hex spell: extra 1d6 necrotic applies to every attack that hits, not just one
  run qa_hex_extra_d6_applies_to_all_attacks = {
    val maxHp = 30
    val creature = freshCreature(maxHp)
  
    // Pre-resolved dice for two separate attacks against the hexed target
    val weaponDmg1 = 7  // first attack weapon roll (e.g. 1d8 longsword)
    val hexD6_1    = 4  // first hit hex bonus, necrotic
    val weaponDmg2 = 5  // second attack weapon roll (Extra Attack / Scorching Ray bolt 2)
    val hexD6_2    = 2  // second hit hex bonus, necrotic
  
    // Attack 1 hits: weapon damage then hex bonus both applied
    val s1 = pTakeDamage(creature,  weaponDmg1, Slashing,  Set(), Set(), Set(), false)
    val s2 = pTakeDamage(s1,        hexD6_1,    Necrotic,  Set(), Set(), Set(), false)
  
    // Attack 2 hits: hex bonus fires AGAIN because the trigger is "whenever you hit"
    val s3 = pTakeDamage(s2,        weaponDmg2, Slashing,  Set(), Set(), Set(), false)
    val s4 = pTakeDamage(s3,        hexD6_2,    Necrotic,  Set(), Set(), Set(), false)
  
    val expectedHp = maxHp - weaponDmg1 - hexD6_1 - weaponDmg2 - hexD6_2
    assert(s4.hp == expectedHp)
  }
}
