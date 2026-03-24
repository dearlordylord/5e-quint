// Source: https://rpg.stackexchange.com/q/118709
module _qa_02da9f0fbf29fcc4 {
  import dnd.* from "./dnd"

  // Half-orc cavalier, A lance seems rather un-orcish, Alternate item?
  // Accepted answer: changing damage type from piercing to bludgeoning/slashing has no balance impact
  run qa_physical_damage_types_equal_no_resistances = {
    // 1d12 weapon hit — same result regardless of physical damage type
    val amount = 12
    val s = freshCreature(20)
  
    val piercingResult  = applyDamageModifiers(amount, Piercing,    Set(), Set(), Set())
    val bludgeonResult  = applyDamageModifiers(amount, Bludgeoning, Set(), Set(), Set())
    val slashingResult  = applyDamageModifiers(amount, Slashing,    Set(), Set(), Set())
  
    val sAfterPiercing    = pTakeDamage(s, amount, Piercing,    Set(), Set(), Set(), false)
    val sAfterBludgeoning = pTakeDamage(s, amount, Bludgeoning, Set(), Set(), Set(), false)
    val sAfterSlashing    = pTakeDamage(s, amount, Slashing,    Set(), Set(), Set(), false)
  
    assert(
      // raw damage values are identical
      piercingResult == bludgeonResult
      and bludgeonResult == slashingResult
      // and resulting creature HP is identical
      and sAfterPiercing.hp == sAfterBludgeoning.hp
      and sAfterBludgeoning.hp == sAfterSlashing.hp
    )
  }
}
