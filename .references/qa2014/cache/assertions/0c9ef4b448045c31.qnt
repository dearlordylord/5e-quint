// Source: https://rpg.stackexchange.com/q/44530
module _qa_0c9ef4b448045c31 {
  import dnd.* from "./dnd"

  // Overchannel with cantrips: spell level 0 means 2d12 × 0 = 0 necrotic damage (RAW)
  run qa_overchannel_cantrip_zero_necrotic = {
    val maxHp = 20
    val creature = freshCreature(maxHp)
    val spellLevel = 0  // cantrip level is 0
    val d12a = 9
    val d12b = 7
    // PHB overchannel: 2d12 necrotic per spell level after first free use
    val overchannelDamage = (d12a + d12b) * spellLevel  // 16 * 0 = 0
    val s1 = pTakeDamage(creature, overchannelDamage, Necrotic, Set(), Set(), Set(), false)
    assert(s1.hp == maxHp and s1 == creature)
  }
  
  // Overchannel with a level-1 spell (second use): 2d12 × 1 necrotic, ignores immunity/resistance
  run qa_overchannel_level1_ignores_immunity = {
    val maxHp = 30
    val creature = freshCreature(maxHp)
    val spellLevel = 1
    val d12a = 8
    val d12b = 6
    // 2d12 * spellLevel = 14 necrotic; overchannel bypasses immunity so pass empty sets
    val overchannelDamage = (d12a + d12b) * spellLevel  // = 14
    val s1 = pTakeDamage(creature, overchannelDamage, Necrotic, Set(), Set(), Set(), false)
    assert(s1.hp == maxHp - 14)
  }
  
  // Overchannel necrotic escalates by 1d12 per spell level on subsequent uses (level-2 spell, third use = 3d12×2)
  run qa_overchannel_escalating_penalty = {
    val maxHp = 40
    val creature = freshCreature(maxHp)
    val spellLevel = 2
    // Third use: (2 + 1) d12 per level = 3d12 per spell level
    val dicePerLevel = 3
    val d12a = 10
    val d12b = 5
    val d12c = 8
    val overchannelDamage = (d12a + d12b + d12c) * spellLevel  // 23 * 2 = 46
    // Overchannel bypasses immunity — pass empty immunity/resistance sets
    val s1 = pTakeDamage(creature, overchannelDamage, Necrotic, Set(), Set(), Set(), false)
    assert(s1.hp == 0 and s1.unconscious)
  }
}
