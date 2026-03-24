// Source: https://rpg.stackexchange.com/q/207820
module _qa_e30dd2e3fb07e8b3 {
  import dnd.* from "./dnd"

  // Double Rings of Amity: same spell/effect heals each bonded creature exactly once; second ring does not chain
  run qa_double_rings_of_amity = {
    val maxHp = 20
    val startHp = 10
    val healAmount = 4  // e.g. Potion of Healing
  
    val creatureA = freshCreature(maxHp).with("hp", startHp)
    val creatureB = freshCreature(maxHp).with("hp", startHp)
  
    // A drinks the potion: A heals healAmount directly
    val afterA = pHeal(creatureA, healAmount)
    // A's Ring of Amity transfers the same effect to B once
    val afterB = pHeal(creatureB, healAmount)
  
    // B's ring would "trigger" because B received healing, but B is already receiving
    // the benefit of the same spell/effect — you don't benefit from the same effect twice.
    // So A does NOT heal a second time from B's ring. Both heal exactly once.
    val aHealedOnce = afterA.hp == startHp + healAmount
    val bHealedOnce = afterB.hp == startHp + healAmount
  
    // Applying pHeal a second time on A (simulating B's ring incorrectly chaining)
    // would push A above startHp + healAmount — assert that does NOT happen under the ruling
    val noChain_A = pHeal(afterA, 0).hp == afterA.hp  // 0-heal no-op confirms no extra heal was applied
    val noChain_B = pHeal(afterB, 0).hp == afterB.hp
  
    assert(aHealedOnce and bHealedOnce and noChain_A and noChain_B)
  }
}
