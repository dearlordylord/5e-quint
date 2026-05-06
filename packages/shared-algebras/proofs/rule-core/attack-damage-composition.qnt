// -*- mode: Bluespec; -*-

module attackDamageComposition {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"

  type AttackRangeFact =
    | WithinMeleeReach
    | WithinNormalRange
    | WithinLongRange
    | BeyondRange

  type AttackKind = MeleeAttack | RangedAttack

  type AttackRollProcedureFacts = {
    naturalD20: int,
    total: int,
    armorClass: int,
    criticalThreshold: int,
  }

  type AttackRollOutcome = {
    hits: bool,
    critical: bool,
  }

  type AttackActionQuota = AttackActionAvailable | AttackActionSpent

  type AttackDamageDisposition =
    | OrdinaryAttackDamage
    | KnockOutAttackDamage

  type AttackDamageProcedureFacts = {
    attackKind: AttackKind,
    damageType: RuleDamageType,
    rolledDamage: int,
    damageModifier: int,
    targetAdjustments: DamageAdjustmentFacts,
    disposition: AttackDamageDisposition,
  }

  type AttackProcedureResult = {
    actionQuota: AttackActionQuota,
    attackRollOutcome: AttackRollOutcome,
    damageResult: HitPointRecoveryResult,
  }

  pure def legalAttackRollProcedureFacts(facts: AttackRollProcedureFacts): bool = all {
    facts.naturalD20 >= 1,
    facts.naturalD20 <= 20,
    facts.total >= 0,
    facts.total <= 40,
    facts.armorClass >= 1,
    facts.armorClass <= 30,
    facts.criticalThreshold == 19 or facts.criticalThreshold == 20,
  }

  pure def attackRollIsCriticalHit(facts: AttackRollProcedureFacts): bool =
    facts.naturalD20 >= facts.criticalThreshold

  pure def resolveAttackRoll(facts: AttackRollProcedureFacts): AttackRollOutcome = {
    val critical = attackRollIsCriticalHit(facts)
    {
      hits:
        if (facts.naturalD20 == 1) false
        else if (critical) true
        else facts.total >= facts.armorClass,
      critical: critical,
    }
  }

  pure def legalAttackTargetFact(attackKind: AttackKind, rangeFact: AttackRangeFact): bool =
    if (attackKind == MeleeAttack) rangeFact == WithinMeleeReach
    else rangeFact == WithinNormalRange or rangeFact == WithinLongRange

  pure def criticalDamageDiceCount(baseDice: int, critical: bool): int =
    if (critical) baseDice * 2 else baseDice

  pure def damageDiceCountMatchesCritical(
    baseDice: int,
    filledDiceCount: int,
    critical: bool
  ): bool =
    filledDiceCount == criticalDamageDiceCount(baseDice, critical)

  pure def spendAttackActionQuota(quota: AttackActionQuota): AttackActionQuota =
    AttackActionSpent

  pure def damageAmountBeforeHitPoints(facts: AttackDamageProcedureFacts): int = {
    val adjustedRoll = adjustedDamageRollAmount(facts.rolledDamage, facts.damageModifier)
    val damageByType =
      addDamageAmountForType(emptyDamageByType, facts.damageType, adjustedRoll)
    totalDamageAfterTargetAdjustments(damageByType, facts.targetAdjustments)
  }

  pure def attackDamageDispositionIsLegal(
    vitals: CreatureVitals,
    damageAmount: int,
    facts: AttackDamageProcedureFacts
  ): bool =
    facts.disposition == OrdinaryAttackDamage
      or all {
        facts.attackKind == MeleeAttack,
        damageAmount > 0,
        applyResolvedDamageToPositiveHitPoints(vitals, damageAmount).vitals.hitPoints == 0,
      }

  pure def resolveAttackDamage(
    vitals: CreatureVitals,
    facts: AttackDamageProcedureFacts
  ): HitPointRecoveryResult = {
    val damageAmount = damageAmountBeforeHitPoints(facts)
    val damageResult = applyResolvedDamageToPositiveHitPoints(vitals, damageAmount)
    if (facts.disposition == KnockOutAttackDamage) {
      applyKnockOutDisposition(damageResult)
    } else {
      {
        vitals: damageResult.vitals,
        deathSavingThrows:
          deathSavingThrowLifecycleAfterPositiveHitPointDamage(
            resetDeathSavingThrowLifecycle,
            damageResult
          ),
        positiveHitPointUnconsciousRecovery: NoPositiveHitPointUnconsciousRecovery,
        hitPointsRegained: 0,
      }
    }
  }

  pure def resolveAttackProcedure(
    quota: AttackActionQuota,
    rangeFact: AttackRangeFact,
    rollFacts: AttackRollProcedureFacts,
    targetVitals: CreatureVitals,
    damageFacts: AttackDamageProcedureFacts
  ): AttackProcedureResult = {
    val rollOutcome = resolveAttackRoll(rollFacts)
    val damageAmount = damageAmountBeforeHitPoints(damageFacts)
    val attackAdmitted = all {
      quota == AttackActionAvailable,
      legalAttackTargetFact(damageFacts.attackKind, rangeFact),
      legalAttackRollProcedureFacts(rollFacts),
      canApplyResolvedDamageToPositiveHitPoints(targetVitals),
    }
    val dispositionAdmitted =
      damageFacts.disposition == OrdinaryAttackDamage
        or (rollOutcome.hits and attackDamageDispositionIsLegal(targetVitals, damageAmount, damageFacts))
    val procedureAdmitted = attackAdmitted and dispositionAdmitted
    val canApplyDamage = all {
      procedureAdmitted,
      rollOutcome.hits,
    }
    {
      actionQuota: if (procedureAdmitted) spendAttackActionQuota(quota) else quota,
      attackRollOutcome: rollOutcome,
      damageResult:
        if (canApplyDamage) resolveAttackDamage(targetVitals, damageFacts)
        else {
          vitals: targetVitals,
          deathSavingThrows: resetDeathSavingThrowLifecycle,
          positiveHitPointUnconsciousRecovery: NoPositiveHitPointUnconsciousRecovery,
          hitPointsRegained: 0,
        },
    }
  }

  run test_natural_one_misses_regardless_of_total = {
    val outcome = resolveAttackRoll({
      naturalD20: 1,
      total: 40,
      armorClass: 10,
      criticalThreshold: 20,
    })
    all {
      assert(not(outcome.hits)),
      assert(not(outcome.critical)),
    }
  }

  run test_natural_twenty_hits_and_is_critical = {
    val outcome = resolveAttackRoll({
      naturalD20: 20,
      total: 1,
      armorClass: 30,
      criticalThreshold: 20,
    })
    all {
      assert(outcome.hits),
      assert(outcome.critical),
    }
  }

  run test_critical_threshold_nineteen_hits_and_is_critical = {
    val outcome = resolveAttackRoll({
      naturalD20: 19,
      total: 1,
      armorClass: 30,
      criticalThreshold: 19,
    })
    all {
      assert(outcome.hits),
      assert(outcome.critical),
    }
  }

  run test_critical_damage_requires_doubled_dice_count = {
    all {
      assert(damageDiceCountMatchesCritical(1, 1, false)),
      assert(damageDiceCountMatchesCritical(1, 2, true)),
      assert(not(damageDiceCountMatchesCritical(1, 1, true))),
    }
  }

  run test_ordinary_attack_damage_composes_adjustments_and_hp_damage = {
    val result = resolveAttackProcedure(
      AttackActionAvailable,
      WithinMeleeReach,
      { naturalD20: 12, total: 17, armorClass: 15, criticalThreshold: 20 },
      {
        kind: PlayerCharacter,
        hitPoints: 10,
        hitPointMaximum: 12,
        temporaryHitPoints: 2,
        dead: false,
        unconscious: false,
      },
      {
        attackKind: MeleeAttack,
        damageType: SlashingDamage,
        rolledDamage: 4,
        damageModifier: 0,
        targetAdjustments: noDamageAdjustmentFacts,
        disposition: OrdinaryAttackDamage,
      }
    )
    all {
      assert(result.actionQuota == AttackActionSpent),
      assert(result.attackRollOutcome.hits),
      assert(result.damageResult.vitals.hitPoints == 8),
      assert(result.damageResult.vitals.temporaryHitPoints == 0),
      assert(legalHitPointRecoveryState(
        result.damageResult.vitals,
        result.damageResult.deathSavingThrows,
        result.damageResult.positiveHitPointUnconsciousRecovery
      )),
    }
  }

  run test_missed_attack_spends_action_without_damage = {
    val vitals = {
      kind: PlayerCharacter,
      hitPoints: 10,
      hitPointMaximum: 12,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    }
    val result = resolveAttackProcedure(
      AttackActionAvailable,
      WithinMeleeReach,
      { naturalD20: 2, total: 8, armorClass: 15, criticalThreshold: 20 },
      vitals,
      {
        attackKind: MeleeAttack,
        damageType: SlashingDamage,
        rolledDamage: 8,
        damageModifier: 0,
        targetAdjustments: noDamageAdjustmentFacts,
        disposition: OrdinaryAttackDamage,
      }
    )
    all {
      assert(result.actionQuota == AttackActionSpent),
      assert(not(result.attackRollOutcome.hits)),
      assert(result.damageResult.vitals == vitals),
    }
  }

  run test_out_of_range_attack_does_not_spend_action = {
    val result = resolveAttackProcedure(
      AttackActionAvailable,
      BeyondRange,
      { naturalD20: 12, total: 17, armorClass: 15, criticalThreshold: 20 },
      {
        kind: PlayerCharacter,
        hitPoints: 10,
        hitPointMaximum: 12,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      {
        attackKind: MeleeAttack,
        damageType: SlashingDamage,
        rolledDamage: 8,
        damageModifier: 0,
        targetAdjustments: noDamageAdjustmentFacts,
        disposition: OrdinaryAttackDamage,
      }
    )
    assert(result.actionQuota == AttackActionAvailable)
  }

  run test_melee_knock_out_disposition_composes_qcore3 = {
    val result = resolveAttackProcedure(
      AttackActionAvailable,
      WithinMeleeReach,
      { naturalD20: 12, total: 17, armorClass: 15, criticalThreshold: 20 },
      {
        kind: MonsterCreature,
        hitPoints: 4,
        hitPointMaximum: 10,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      {
        attackKind: MeleeAttack,
        damageType: SlashingDamage,
        rolledDamage: 4,
        damageModifier: 0,
        targetAdjustments: noDamageAdjustmentFacts,
        disposition: KnockOutAttackDamage,
      }
    )
    all {
      assert(result.damageResult.vitals.hitPoints == 1),
      assert(not(result.damageResult.vitals.dead)),
      assert(result.damageResult.vitals.unconscious),
      assert(result.damageResult.positiveHitPointUnconsciousRecovery == EndsWhenHitPointsRegained),
    }
  }

  run test_ranged_knock_out_disposition_is_not_legal = {
    val vitals = {
      kind: MonsterCreature,
      hitPoints: 4,
      hitPointMaximum: 10,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    }
    val facts = {
      attackKind: RangedAttack,
      damageType: SlashingDamage,
      rolledDamage: 4,
      damageModifier: 0,
      targetAdjustments: noDamageAdjustmentFacts,
      disposition: KnockOutAttackDamage,
    }
    assert(not(attackDamageDispositionIsLegal(vitals, damageAmountBeforeHitPoints(facts), facts)))
  }
}
