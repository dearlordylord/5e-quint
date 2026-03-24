// Source: https://rpg.stackexchange.com/q/205363
module _qa_d5af2474677e1e03 {
  import dnd.* from "./dnd"

  // Does the damage from Hexblade's Curse apply to attacks from summons?
  run qa_hexblade_curse_summon_no_profbonus = {
    // Accepted answer: "You gain a bonus to damage rolls" — the warlock's own rolls only.
    // Summoned creatures make their OWN damage rolls; the curse bonus does not transfer.
    val warlockLevel = 5
    val profBonus = proficiencyBonus(warlockLevel) // 3 at level 5
    val roll = 6
    val warlockMod = 3
    val summonMod = 2
    // Warlock attacks the cursed target: proficiency bonus (curse bonus) is included
    val warlockDmg = normalDamage(roll, warlockMod + profBonus)
    // Summoned creature attacks the cursed target: only its own modifier applies
    val summonDmg = normalDamage(roll, summonMod)
    assert(
      // Summoned creature's damage is exactly roll + its own mod — no curse bonus
      summonDmg == roll + summonMod
      // Warlock's own damage roll correctly includes the curse's proficiency bonus
      and warlockDmg == roll + warlockMod + profBonus
      // The curse bonus is NOT "passed through" to the summoned creature's roll
      and summonDmg != normalDamage(roll, summonMod + profBonus)
    )
  }
}
