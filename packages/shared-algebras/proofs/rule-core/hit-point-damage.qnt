// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHARED.HIT_POINTS.POSITIVE_DAMAGE

module hitPointDamage {
  type CreatureKind = PlayerCharacter | MonsterCreature

  type CreatureVitals = {
    kind: CreatureKind,
    hitPoints: int,
    hitPointMaximum: int,
    temporaryHitPoints: int,
    dead: bool,
    unconscious: bool,
  }

  type DamageResult = {
    vitals: CreatureVitals,
    damageToHitPoints: int,
    remainingDamageAtZero: int,
  }

  pure def nonnegative(n: int): int =
    if (n < 0) 0 else n

  pure def clampHitPoints(hitPoints: int, hitPointMaximum: int): int =
    if (hitPoints < 0) 0
    else if (hitPoints > hitPointMaximum) hitPointMaximum
    else hitPoints

  pure def legalVitals(vitals: CreatureVitals): bool = all {
    vitals.hitPointMaximum > 0,
    vitals.hitPoints >= 0,
    vitals.hitPoints <= vitals.hitPointMaximum,
    vitals.temporaryHitPoints >= 0,
    vitals.dead implies vitals.hitPoints == 0,
    (vitals.kind == MonsterCreature and vitals.hitPoints == 0) implies vitals.dead,
    (vitals.kind == PlayerCharacter and vitals.hitPoints == 0 and not(vitals.dead)) implies vitals.unconscious,
  }

  pure def canApplyResolvedDamageToPositiveHitPoints(vitals: CreatureVitals): bool =
    legalVitals(vitals) and (vitals.dead or vitals.hitPoints > 0)

  pure def absorbTemporaryHitPoints(vitals: CreatureVitals, damage: int): int =
    if (damage > vitals.temporaryHitPoints) vitals.temporaryHitPoints else damage

  pure def applyResolvedDamageToPositiveHitPoints(vitals: CreatureVitals, rawDamage: int): DamageResult =
    if (vitals.dead) {
      vitals: vitals,
      damageToHitPoints: 0,
      remainingDamageAtZero: 0,
    } else {
      val resolvedDamage = nonnegative(rawDamage)
      val absorbedByTemporaryHitPoints = absorbTemporaryHitPoints(vitals, resolvedDamage)
      val damageToHitPoints = resolvedDamage - absorbedByTemporaryHitPoints
      val remainingDamageAtZero =
        if (damageToHitPoints > vitals.hitPoints) damageToHitPoints - vitals.hitPoints else 0
      val nextHitPoints = clampHitPoints(vitals.hitPoints - damageToHitPoints, vitals.hitPointMaximum)
      val dropsToZero = vitals.hitPoints > 0 and nextHitPoints == 0
      val instantDeath =
        dropsToZero
          and vitals.kind == PlayerCharacter
          and remainingDamageAtZero >= vitals.hitPointMaximum
      val nextDead =
        vitals.dead
          or (vitals.kind == MonsterCreature and nextHitPoints == 0)
          or instantDeath
      val nextUnconscious =
        vitals.unconscious
          or (dropsToZero and vitals.kind == PlayerCharacter and not(instantDeath))
      {
        vitals: {
          kind: vitals.kind,
          hitPoints: nextHitPoints,
          hitPointMaximum: vitals.hitPointMaximum,
          temporaryHitPoints: vitals.temporaryHitPoints - absorbedByTemporaryHitPoints,
          dead: nextDead,
          unconscious: nextUnconscious,
        },
        damageToHitPoints: damageToHitPoints,
        remainingDamageAtZero: remainingDamageAtZero,
      }
    }

  run test_temporary_hit_points_absorb_first = {
    val result = applyResolvedDamageToPositiveHitPoints({
      kind: PlayerCharacter,
      hitPoints: 8,
      hitPointMaximum: 10,
      temporaryHitPoints: 3,
      dead: false,
      unconscious: false,
    }, 5)
    all {
      assert(result.vitals.temporaryHitPoints == 0),
      assert(result.vitals.hitPoints == 6),
      assert(result.damageToHitPoints == 2),
      assert(legalVitals(result.vitals)),
    }
  }

  run test_monster_dies_at_zero_hit_points = {
    val result = applyResolvedDamageToPositiveHitPoints({
      kind: MonsterCreature,
      hitPoints: 4,
      hitPointMaximum: 7,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    }, 4)
    all {
      assert(result.vitals.hitPoints == 0),
      assert(result.vitals.dead),
      assert(legalVitals(result.vitals)),
    }
  }

  run test_player_character_falls_unconscious_without_instant_death = {
    val result = applyResolvedDamageToPositiveHitPoints({
      kind: PlayerCharacter,
      hitPoints: 4,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    }, 7)
    all {
      assert(result.vitals.hitPoints == 0),
      assert(not(result.vitals.dead)),
      assert(result.vitals.unconscious),
      assert(result.remainingDamageAtZero == 3),
      assert(legalVitals(result.vitals)),
    }
  }

  run test_player_character_dies_from_massive_damage = {
    val result = applyResolvedDamageToPositiveHitPoints({
      kind: PlayerCharacter,
      hitPoints: 6,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    }, 18)
    all {
      assert(result.vitals.hitPoints == 0),
      assert(result.vitals.dead),
      assert(result.remainingDamageAtZero == 12),
      assert(legalVitals(result.vitals)),
    }
  }

  run test_dead_creature_damage_is_noop = {
    val deadVitals = {
      kind: PlayerCharacter,
      hitPoints: 0,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: true,
      unconscious: true,
    }
    val result = applyResolvedDamageToPositiveHitPoints(deadVitals, 10)
    all {
      assert(result.vitals == deadVitals),
      assert(result.damageToHitPoints == 0),
      assert(result.remainingDamageAtZero == 0),
      assert(legalVitals(result.vitals)),
    }
  }

  run test_non_dead_zero_hit_point_damage_is_out_of_scope = {
    assert(not(canApplyResolvedDamageToPositiveHitPoints({
      kind: PlayerCharacter,
      hitPoints: 0,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: true,
    })))
  }
}
