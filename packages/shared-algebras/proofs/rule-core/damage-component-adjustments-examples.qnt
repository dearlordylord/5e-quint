// -*- mode: Bluespec; -*-

module damageComponentAdjustmentsExamples {
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import hitPointDamage.* from "./hit-point-damage"

  run test_same_type_damage_aggregates_before_resistance = {
    val facts = noDamageAdjustmentFacts.with("resistances", Set(SlashingDamage))
    val pair = {
      firstType: SlashingDamage,
      firstAmount: 5,
      secondType: SlashingDamage,
      secondAmount: 3,
    }
    all {
      assert(totalDamageAfterTargetAdjustments(aggregateDamagePair(pair), facts) == 4),
      assert((5 / 2) + (3 / 2) == 3),
    }
  }

  run test_modifier_cannot_make_negative_damage = {
    assert(adjustedDamageRollAmount(3, -5) == 0)
  }

  run test_immunity_nullifies_before_resistance_and_vulnerability = {
    val facts = noDamageAdjustmentFacts
      .with("immunities", Set(FireDamage))
      .with("resistances", Set(FireDamage))
      .with("vulnerabilities", Set(FireDamage))
    assert(damageAmountAfterTargetAdjustments(9, FireDamage, facts) == 0)
  }

  run test_resistance_then_vulnerability_order = {
    val facts = noDamageAdjustmentFacts
      .with("immunities", Set(FireDamage))
      .with("resistances", Set(SlashingDamage))
      .with("vulnerabilities", Set(SlashingDamage))
    all {
      assert(damageAmountAfterTargetAdjustments(7, SlashingDamage, facts) == 6),
      assert(damageAmountAfterTargetAdjustments(7, PoisonDamage, facts) == 7),
    }
  }

  run test_mixed_damage_adjusts_by_type_and_sums = {
    val facts = noDamageAdjustmentFacts
      .with("immunities", Set(PoisonDamage))
      .with("resistances", Set(SlashingDamage))
      .with("vulnerabilities", Set(FireDamage))
    val amounts = emptyDamageByType
      .set(SlashingDamage, 5)
      .set(FireDamage, 4)
      .set(PoisonDamage, 6)
    assert(totalDamageAfterTargetAdjustments(amounts, facts) == 10)
  }

  run test_thunder_damage_projection_is_explicit = {
    val facts = noDamageAdjustmentFacts.with("resistances", Set(ThunderDamage))
    val amounts = addDamageAmountForType(emptyDamageByType, ThunderDamage, 9)
    val adjusted = damageByTypeAfterTargetAdjustments(amounts, facts)
    all {
      assert(damageAmountForType(amounts, ThunderDamage) == 9),
      assert(damageAmountForType(adjusted, ThunderDamage) == 4),
      assert(totalDamageByType(adjusted) == 4),
    }
  }

  run test_scalar_reduction_allocates_proportionally_by_largest_remainder = {
    val pair = {
      firstType: SlashingDamage,
      firstAmount: 5,
      secondType: PoisonDamage,
      secondAmount: 4,
    }
    val result = damagePairAfterScalarReduction(pair, 3)
    all {
      assert(result.firstAmount == 3),
      assert(result.secondAmount == 3),
      assert(pairTotal(result) == 6),
    }
  }

  run test_adjusted_damage_total_feeds_positive_hit_point_damage = {
    val facts = noDamageAdjustmentFacts.with("vulnerabilities", Set(SlashingDamage))
    val damage = totalDamageAfterTargetAdjustments(emptyDamageByType.set(SlashingDamage, 4), facts)
    val result = applyResolvedDamageToPositiveHitPoints({
      kind: PlayerCharacter,
      hitPoints: 10,
      hitPointMaximum: 12,
      temporaryHitPoints: 2,
      dead: false,
      unconscious: false,
    }, damage)
    all {
      assert(damage == 8),
      assert(result.vitals.temporaryHitPoints == 0),
      assert(result.vitals.hitPoints == 4),
      assert(legalVitals(result.vitals)),
    }
  }
}
