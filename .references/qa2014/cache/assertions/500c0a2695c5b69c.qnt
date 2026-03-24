// Source: https://rpg.stackexchange.com/q/78371
module _qa_500c0a2695c5b69c {
  import dnd.* from "./dnd"

  // Why use leveled spells: damage type immunity can completely negate a cantrip but not a differently-typed leveled spell
  run qa_poison_immunity_nullifies_cantrip_not_thunder = {
    val creature = freshCreature(30)
    // Poison Spray (cantrip, 4d12 @ lvl17 = ~26): immune creature takes 0
    val afterPoisonSpray = pTakeDamage(creature, 26, Poison, Set(), Set(), Set(Poison), false)
    // Thunderwave (level 1, 2d8 = 12): same immune creature takes full thunder damage
    val afterThunderwave = pTakeDamage(creature, 12, Thunder, Set(), Set(), Set(Poison), false)
    assert(
      afterPoisonSpray.hp == 30 and  // poison immunity: 0 damage regardless of cantrip scaling
      afterThunderwave.hp == 18      // poison immunity irrelevant; 30 - 12 = 18
    )
  }
  
  // Why use leveled spells: Thunderwave still deals half damage on a successful save; Poison Spray deals 0 on success
  run qa_thunderwave_half_damage_on_successful_save = {
    val creature = freshCreature(30)
    val rawRoll = 12  // 2d8
    // Thunderwave: save = half damage (PHB); caller computes half before applying
    val halfDamage = rawRoll / 2
    val afterThunderwaveSaved = pTakeDamage(creature, halfDamage, Thunder, Set(), Set(), Set(), false)
    // Poison Spray: save = 0 damage (no effect on success)
    val afterPoisonSpraySaved = pTakeDamage(creature, 0, Poison, Set(), Set(), Set(), false)
    assert(
      afterThunderwaveSaved.hp == 24 and  // 30 - 6 = 24: save still costs the target HP
      afterPoisonSpraySaved.hp == 30      // save = completely avoided
    )
  }
  
  // Why use leveled spells: Thunderwave push + fall off a 200ft cliff yields far more damage than 4d12 Poison Spray
  run qa_thunderwave_push_plus_fall_exceeds_cantrip = {
    val creature = freshCreature(60)
    // Thunderwave damage component (2d8 = 10 thunder)
    val afterThunderwave = pTakeDamage(creature, 10, Thunder, Set(), Set(), Set(), false)
    // 200ft fall: pFallingDamageDice caps at 20d6; pre-resolved roll = 70
    val fallDice = pFallingDamageDice(200)
    val afterFall = pApplyFall(afterThunderwave, 70, Set(), Set(), Set())
    // Best-case Poison Spray (4d12, max = 48) against same creature
    val afterPoisonSpray = pTakeDamage(creature, 48, Poison, Set(), Set(), Set(), false)
    assert(
      fallDice == 20 and                          // 200 / 10 = 20 dice, at cap
      afterFall.hp == 0 and                       // 10 thunder + 70 bludgeoning = 80 total: knocked out
      afterFall.prone == true and                 // fall always lands prone
      afterPoisonSpray.hp == 12                   // max cantrip (48) only brings from 60 to 12
    )
  }
}
