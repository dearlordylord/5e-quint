// Source: https://rpg.stackexchange.com/q/200629
module _qa_8dc50a19110f1a32 {
  import dnd.* from "./dnd"

  // Would spells that modify attack bonus (e.g. Bless) apply to Spiritual Weapon or Bigby's Hand?
  run qa_bless_applies_to_spiritual_weapon_attack = {
    // Spiritual Weapon: "you can make a melee spell attack" — the caster makes the roll,
    // so Bless (+d4) is added to attackBonus. Pre-resolve: d20=10, d4=3, targetAC=15.
    // TEST_CONFIG: Wis=13 → mod=1, level=5 → profBonus=3, spellAttackBonus=4.
    val baseBonus  = spellAttackBonus(TEST_CONFIG)  // 1 + 3 = 4
    val blessBonus = 3                              // pre-resolved d4
    val roll       = 10
    val targetAC   = 15
  
    // Without Bless: 10 + 4 = 14 < 15 → miss
    val noBless   = resolveAttackRoll(roll, baseBonus, targetAC, 0)
    // With Bless applied (caster making the attack, per Spiritual Weapon wording): 10 + 4 + 3 = 17 >= 15 → hit
    val withBless = resolveAttackRoll(roll, baseBonus + blessBonus, targetAC, 0)
  
    all {
      assert(not(noBless.hits)),    // Bless absent: attack misses
      assert(withBless.hits),       // Bless present: d4 bonus pushes attack over AC
      assert(not(withBless.isCritical)),
    }
  }
}
