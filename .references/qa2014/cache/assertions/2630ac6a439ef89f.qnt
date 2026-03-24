// Source: https://rpg.stackexchange.com/q/47142
module _qa_2630ac6a439ef89f {
  import dnd.* from "./dnd"

  // How does Empowered Evocation work on spells with multiple damage types?
  run qa_empowered_evocation_single_bonus = {
    // Ice Storm: 2d8 bludgeoning + 4d6 cold; Evoker INT 16 -> +3
    // Accepted answer: INT mod added ONCE to combined total, not per damage type
    val bludgeoningRoll = 10  // pre-resolved 2d8
    val coldRoll        = 14  // pre-resolved 4d6
    val intMod          = 3   // INT 16
  
    // Option 1 (correct per accepted answer): single bonus on combined dice total
    val correctDamage   = normalDamage(bludgeoningRoll + coldRoll, intMod)
  
    // Option 2 (incorrect): bonus applied separately to each damage type
    val incorrectDamage = normalDamage(bludgeoningRoll, intMod) + normalDamage(coldRoll, intMod)
  
    assert(
      correctDamage   == 27     // 10 + 14 + 3
      and incorrectDamage == 30 // (10+3) + (14+3) — would overcount by one intMod
      and correctDamage != incorrectDamage
    )
  }
}
