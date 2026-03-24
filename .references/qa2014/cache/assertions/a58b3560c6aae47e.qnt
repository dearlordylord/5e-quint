// Source: https://rpg.stackexchange.com/q/192571
module _qa_a58b3560c6aae47e {
  import dnd.* from "./dnd"

  // Blessed Strike triggered by Word of Radiance — once-per-round limit means bonus damage applies to only one chosen creature
  run qa_blessed_strikes_word_of_radiance_one_creature = {
    val creatureA = freshCreature(20)
    val creatureB = freshCreature(20)
    val creatureC = freshCreature(20)
  
    // Word of Radiance: pre-resolved d6 = 4; all three fail their CON save
    val wordDmg = normalDamage(4, 0)
    val aAfterWoR = pTakeDamage(creatureA, wordDmg, Radiant, Set(), Set(), Set(), false)
    val bAfterWoR = pTakeDamage(creatureB, wordDmg, Radiant, Set(), Set(), Set(), false)
    val cAfterWoR = pTakeDamage(creatureC, wordDmg, Radiant, Set(), Set(), Set(), false)
  
    // Blessed Strikes: pre-resolved d8 = 6; player chooses creature A (once per round — B and C do not receive the bonus)
    val blessedDmg = normalDamage(6, 0)
    val aFinal = pTakeDamage(aAfterWoR, blessedDmg, Radiant, Set(), Set(), Set(), false)
  
    assert(
      // Chosen creature took cantrip damage + Blessed Strikes bonus
      aFinal.hp == 20 - wordDmg - blessedDmg and
      // Remaining creatures took only Word of Radiance damage (Blessed Strikes expended)
      bAfterWoR.hp == 20 - wordDmg and
      cAfterWoR.hp == 20 - wordDmg
    )
  }
}
