// -*- mode: Bluespec; -*-

module attackDamageCompositionExamples {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"

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

  run test_light_property_extra_attack_damage_modifier_omits_positive_modifier = {
    all {
      assert(lightPropertyExtraAttackDamageModifier(3) == 0),
      assert(lightPropertyExtraAttackDamageModifier(0) == 0),
      assert(lightPropertyExtraAttackDamageModifier(-1) == -1),
      assert(lightPropertyExtraAttackDamageAmount(4, 3) == 4),
      assert(lightPropertyExtraAttackDamageAmount(4, -1) == 3),
    }
  }

  run test_ordinary_attack_damage_composes_adjustments_and_hp_damage = {
    val result = resolveAttackProcedure(
      ActionAvailable,
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
      assert(result.actionQuota == ActionSpent),
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
      ActionAvailable,
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
      assert(result.actionQuota == ActionSpent),
      assert(not(result.attackRollOutcome.hits)),
      assert(result.damageResult.vitals == vitals),
    }
  }

  run test_out_of_range_attack_does_not_spend_action = {
    val result = resolveAttackProcedure(
      ActionAvailable,
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
    assert(result.actionQuota == ActionAvailable)
  }

  run test_melee_knock_out_disposition_composes_qcore3 = {
    val result = resolveAttackProcedure(
      ActionAvailable,
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
