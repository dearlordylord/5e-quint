// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.HP_REST_HIT_DICE.TRANSITIONS

module hitPointRecovery {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"

  type PositiveHitPointUnconsciousRecovery =
    | NoPositiveHitPointUnconsciousRecovery
    | EndsWhenHitPointsRegained

  type HitPointRecoveryResult = {
    vitals: CreatureVitals,
    deathSavingThrows: DeathSavingThrowLifecycle,
    positiveHitPointUnconsciousRecovery: PositiveHitPointUnconsciousRecovery,
    hitPointsRegained: int,
  }

  pure def legalPositiveHitPointUnconsciousRecovery(
    vitals: CreatureVitals,
    recovery: PositiveHitPointUnconsciousRecovery
  ): bool =
    recovery == NoPositiveHitPointUnconsciousRecovery
      or all {
        vitals.hitPoints > 0,
        vitals.hitPoints <= vitals.hitPointMaximum,
        vitals.unconscious,
        not(vitals.dead),
      }

  pure def legalHitPointRecoveryState(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    recovery: PositiveHitPointUnconsciousRecovery
  ): bool = all {
    legalVitals(vitals),
    if (vitals.kind == PlayerCharacter) {
      legalPlayerCharacterDeathSavingThrowState(vitals, lifecycle)
    } else {
      lifecycle == resetDeathSavingThrowLifecycle
    },
    legalPositiveHitPointUnconsciousRecovery(vitals, recovery),
    vitals.dead implies recovery == NoPositiveHitPointUnconsciousRecovery,
    (vitals.hitPoints == 0 and not(vitals.dead)) implies recovery == NoPositiveHitPointUnconsciousRecovery,
  }

  pure def applyHitPointHealing(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    recovery: PositiveHitPointUnconsciousRecovery,
    rawHealing: int
  ): HitPointRecoveryResult =
    if (vitals.dead or rawHealing <= 0) {
      vitals: vitals,
      deathSavingThrows: lifecycle,
      positiveHitPointUnconsciousRecovery: recovery,
      hitPointsRegained: 0,
    } else {
      val healing = nonnegative(rawHealing)
      val nextHitPoints = clampHitPoints(vitals.hitPoints + healing, vitals.hitPointMaximum)
      val regainedHitPoints = nextHitPoints - vitals.hitPoints
      val healedFromZero = vitals.hitPoints == 0 and nextHitPoints > 0
      val healedPositiveRecovery =
        vitals.hitPoints > 0
          and regainedHitPoints > 0
          and recovery == EndsWhenHitPointsRegained
      {
        vitals: {
          kind: vitals.kind,
          hitPoints: nextHitPoints,
          hitPointMaximum: vitals.hitPointMaximum,
          temporaryHitPoints: vitals.temporaryHitPoints,
          dead: false,
          unconscious: if (healedFromZero or healedPositiveRecovery) false else vitals.unconscious,
        },
        deathSavingThrows: if (regainedHitPoints > 0) resetDeathSavingThrowLifecycle else lifecycle,
        positiveHitPointUnconsciousRecovery:
          if (healedPositiveRecovery) NoPositiveHitPointUnconsciousRecovery else recovery,
        hitPointsRegained: regainedHitPoints,
      }
    }

  pure def applyKnockOutDisposition(
    damageResult: DamageResult
  ): HitPointRecoveryResult =
    if (damageResult.vitals.hitPoints != 0 or damageResult.damageToHitPoints <= 0) {
      {
        vitals: damageResult.vitals,
        deathSavingThrows:
          deathSavingThrowLifecycleAfterPositiveHitPointDamage(resetDeathSavingThrowLifecycle, damageResult),
        positiveHitPointUnconsciousRecovery: NoPositiveHitPointUnconsciousRecovery,
        hitPointsRegained: 0,
      }
    } else {
      {
        vitals: {
          kind: damageResult.vitals.kind,
          hitPoints: 1,
          hitPointMaximum: damageResult.vitals.hitPointMaximum,
          temporaryHitPoints: damageResult.vitals.temporaryHitPoints,
          dead: false,
          unconscious: true,
        },
        deathSavingThrows: resetDeathSavingThrowLifecycle,
        positiveHitPointUnconsciousRecovery: EndsWhenHitPointsRegained,
        hitPointsRegained: 0,
      }
    }

  pure def applyFirstAidToKnockOutUnconscious(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    recovery: PositiveHitPointUnconsciousRecovery,
    medicineCheckSucceeded: bool
  ): HitPointRecoveryResult =
    if (not(medicineCheckSucceeded) or recovery != EndsWhenHitPointsRegained) {
      {
        vitals: vitals,
        deathSavingThrows: lifecycle,
        positiveHitPointUnconsciousRecovery: recovery,
        hitPointsRegained: 0,
      }
    } else {
      {
        vitals: {
          kind: vitals.kind,
          hitPoints: vitals.hitPoints,
          hitPointMaximum: vitals.hitPointMaximum,
          temporaryHitPoints: vitals.temporaryHitPoints,
          dead: vitals.dead,
          unconscious: false,
        },
        deathSavingThrows: lifecycle,
        positiveHitPointUnconsciousRecovery: NoPositiveHitPointUnconsciousRecovery,
        hitPointsRegained: 0,
      }
    }

}
