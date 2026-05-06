// -*- mode: Bluespec; -*-

module qcore0DamageContract {
  type CreatureVitals = {
    hp: int,
    maxHp: int,
    tempHp: int,
    dead: bool,
  }

  pure def nonnegative(n: int): int =
    if (n < 0) 0 else n

  pure def clampHp(hp: int, maxHp: int): int =
    if (hp < 0) 0 else if (hp > maxHp) maxHp else hp

  pure def legalVitals(vitals: CreatureVitals): bool = all {
    vitals.maxHp > 0,
    vitals.hp >= 0,
    vitals.hp <= vitals.maxHp,
    vitals.tempHp >= 0,
    vitals.dead == (vitals.hp == 0),
  }

  pure def applyDamage(vitals: CreatureVitals, rawDamage: int): CreatureVitals = {
    val damage = nonnegative(rawDamage)
    val absorbed = if (damage > vitals.tempHp) vitals.tempHp else damage
    val remainingDamage = damage - absorbed
    val nextHp = clampHp(vitals.hp - remainingDamage, vitals.maxHp)
    {
      hp: nextHp,
      maxHp: vitals.maxHp,
      tempHp: vitals.tempHp - absorbed,
      dead: nextHp == 0,
    }
  }

  pure def applyHealing(vitals: CreatureVitals, rawHealing: int): CreatureVitals = {
    val nextHp = clampHp(vitals.hp + nonnegative(rawHealing), vitals.maxHp)
    {
      hp: nextHp,
      maxHp: vitals.maxHp,
      tempHp: vitals.tempHp,
      dead: nextHp == 0,
    }
  }

  run test_damage_consumes_temp_hp_before_hp = {
    val resultingVitals = applyDamage({ hp: 8, maxHp: 10, tempHp: 3, dead: false }, 5)
    all {
      assert(resultingVitals.tempHp == 0),
      assert(resultingVitals.hp == 6),
      assert(not(resultingVitals.dead)),
      assert(legalVitals(resultingVitals)),
    }
  }

  run test_damage_clamps_to_zero = {
    val resultingVitals = applyDamage({ hp: 2, maxHp: 10, tempHp: 0, dead: false }, 99)
    all {
      assert(resultingVitals.hp == 0),
      assert(resultingVitals.dead),
      assert(legalVitals(resultingVitals)),
    }
  }
}
