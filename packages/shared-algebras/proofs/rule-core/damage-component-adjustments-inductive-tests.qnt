// -*- mode: Bluespec; -*-

module damageComponentAdjustmentsInductiveTests {
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import damageComponentAdjustmentsInductive.* from "./damage-component-adjustments-inductive"

  run resisted_slashing_fixture_matches_reducer = {
    val adjusted = damageByTypeAfterTargetAdjustments(
      addDamageAmountForType(emptyDamageByType, SlashingDamage, 5),
      noDamageAdjustmentFacts.with("resistances", Set(SlashingDamage))
    )
    all {
      assert(damageAmountForType(adjusted, SlashingDamage) == resistedSlashingFixtureSlashing),
      assert(damageAmountForType(adjusted, FireDamage) == resistedSlashingFixtureFire),
      assert(damageAmountForType(adjusted, PoisonDamage) == resistedSlashingFixturePoison),
      assert(totalDamageByType(adjusted) == resistedSlashingFixtureTotal),
    }
  }

  run mixed_adjustments_reach_resisted_vulnerable_and_immune_totals = {
    val facts = noDamageAdjustmentFacts
      .with("immunities", Set(PoisonDamage))
      .with("resistances", Set(SlashingDamage))
      .with("vulnerabilities", Set(FireDamage))
    val adjusted = damageByTypeAfterTargetAdjustments(
      aggregateDamagePair({
        firstType: SlashingDamage,
        firstAmount: 5,
        secondType: FireDamage,
        secondAmount: 4,
      }).set(PoisonDamage, 6),
      facts
    )
    all {
      assert(damageAmountForType(adjusted, SlashingDamage) == 2),
      assert(damageAmountForType(adjusted, FireDamage) == 8),
      assert(damageAmountForType(adjusted, PoisonDamage) == 0),
      assert(totalDamageByType(adjusted) == 10),
      assert(legalDamageByType(adjusted)),
    }
  }

  run scalar_reduction_reaches_largest_remainder_allocation = {
    val result = damagePairAfterScalarReduction({
      firstType: SlashingDamage,
      firstAmount: 5,
      secondType: FireDamage,
      secondAmount: 4,
    }, 3)
    all {
      assert(result.firstAmount == scalarReductionFixtureSlashing),
      assert(result.secondAmount == scalarReductionFixtureFire),
      assert(pairTotal(result) == scalarReductionFixtureTotal),
    }
  }

  run modifier_floor_fixture_matches_reducer = {
    assert(adjustedDamageRollAmount(0, -5) == modifierFloorFixtureAmount)
  }
}
