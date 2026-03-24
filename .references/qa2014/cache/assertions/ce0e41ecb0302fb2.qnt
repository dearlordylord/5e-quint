// Source: https://rpg.stackexchange.com/q/58313
module _qa_ce0e41ecb0302fb2 {
  import dnd.* from "./dnd"

  // Geas: charmed creature may disobey command but takes 5d10 psychic damage; survives if HP sufficient
  run qa_geas_disobedience_survives = {
    val c = freshCreature(50)
    val charmed = pApplyCondition(c, CCharmed)
    // Creature disobeys Geas command; takes 5d10 psychic (roll=25)
    val afterDmg = pTakeDamage(charmed, 25, Psychic, Set(), Set(), Set(), false)
    assert(
      afterDmg.charmed and   // Geas still active (charmed persists)
      afterDmg.hp == 25 and  // took full 25 psychic damage
      afterDmg.hp > 0        // survived disobeying — can act freely for rest of day
    )
  }
  
  // Geas: disobedience damage can kill outright when overflow >= maxHp
  run qa_geas_disobedience_lethal = {
    val c = freshCreature(10)
    val charmed = pApplyCondition(c, CCharmed)
    // 5d10 roll=20: overflow=10 >= effMax=10 → instant death
    val afterDmg = pTakeDamage(charmed, 20, Psychic, Set(), Set(), Set(), false)
    assert(afterDmg.dead and afterDmg.hp == 0)
  }
  
  // Geas: psychic resistance halves the disobedience penalty
  run qa_geas_psychic_resistance_halves = {
    val c = freshCreature(50)
    val charmed = pApplyCondition(c, CCharmed)
    // 28 psychic with resistance → floor(28/2)=14 damage taken
    val afterDmg = pTakeDamage(charmed, 28, Psychic, Set(Psychic), Set(), Set(), false)
    assert(afterDmg.hp == 36 and afterDmg.charmed)
  }
}
