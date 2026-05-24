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
}
