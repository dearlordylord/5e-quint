// Source: https://rpg.stackexchange.com/q/154216
module _qa_be8219c29170faf0 {
  import dnd.* from "./dnd"

  // Does the Reduce option from the Enlarge/Reduce spell cause a critical hit to do 2d4 less damage?
  run qa_reduce_spell_crit_doubles_penalty = {
    // Pre-resolved dice: weapon die (e.g. longsword 1d8), reduce penalty die (1d4), STR mod
    val weaponDie1  = 6   // first weapon die roll (always used)
    val weaponDie2  = 5   // second weapon die roll (bonus dice on crit)
    val reduceDie1  = 3   // first reduce-penalty die (always used)
    val reduceDie2  = 2   // second reduce-penalty die (only appears on crit — the doubled penalty)
    val strMod      = 2
  
    // Normal hit: the 1d4 Reduce penalty is a damage die, subtracted once
    val normalNoPenalty  = normalDamage(weaponDie1, strMod)
    val normalWithReduce = normalDamage(weaponDie1 - reduceDie1, strMod)
  
    // Critical hit: per PHB "roll all damage dice twice" — the reduce penalty die is
    // also a damage die, so it is rolled twice and both values subtracted
    val critNoPenalty    = criticalDamage(weaponDie1, weaponDie2, strMod)
    val critWithReduce   = criticalDamage(weaponDie1 - reduceDie1, weaponDie2 - reduceDie2, strMod)
  
    assert(
      // Normal hit: damage reduced by exactly one penalty die
      normalNoPenalty - normalWithReduce == reduceDie1
      // Critical hit: damage reduced by both penalty dice (the full 2d4 penalty)
      and critNoPenalty - critWithReduce == reduceDie1 + reduceDie2
      // The crit penalty is strictly larger than the normal-hit penalty
      and (critNoPenalty - critWithReduce) > (normalNoPenalty - normalWithReduce)
    )
  }
}
