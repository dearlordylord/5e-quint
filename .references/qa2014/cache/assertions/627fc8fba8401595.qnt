// Source: https://rpg.stackexchange.com/q/115258
module _qa_627fc8fba8401595 {
  import dnd.* from "./dnd"

  // Is there a proper way to handle large combat engagements with party members involved?
  // Accepted answer: no RAW mass combat rules; each creature uses standard individual combat.
  // Test encodes the described combatants: leather armor, longsword, level-1 militia/bandits.
  run qa_individual_combat_still_applies_in_large_battle = {
    // Leather armor on DEX 10 combatant -> AC 11
    val banditAC = calculateAC(WearingArmor(LEATHER), abilityModifier(10), false, NoUnarmoredDefense, 0, 0)
    // Level-1 attacker, STR 10: attack bonus = mod(0) + prof(+2) = +2
    val atkBonus = abilityModifier(10) + proficiencyBonus(1)
    // d20=9: 9+2=11 >= 11 -> hits exactly at AC threshold
    val hitResult = resolveAttackRoll(9, atkBonus, banditAC, 0)
    // d20=8: 8+2=10 < 11 -> misses
    val missResult = resolveAttackRoll(8, atkBonus, banditAC, 0)
    // Longsword (1d8 slashing): roll 6 + STR mod 0 = 6 damage
    val dmg = normalDamage(6, abilityModifier(10))
    assert(
      banditAC == 11
      and proficiencyBonus(1) == 2
      and hitResult.hits
      and not(hitResult.isCritical)
      and not(missResult.hits)
      and dmg == 6
    )
  }
}
