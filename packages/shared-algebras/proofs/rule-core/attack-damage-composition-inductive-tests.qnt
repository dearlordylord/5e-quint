// -*- mode: Bluespec; -*-

module attackDamageCompositionInductiveTests {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"
  import attackDamageCompositionInductive.* from "./attack-damage-composition-inductive"

  run melee_critical_attack_reaches_zero_hit_points = {
    val result = resolveAttackProcedure(
      ActionAvailable,
      WithinMeleeReach,
      {
        naturalD20: 20,
        total: 8,
        armorClass: 20,
        criticalThreshold: 20,
      },
      {
        kind: PlayerCharacter,
        hitPoints: 6,
        hitPointMaximum: 12,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      {
        attackKind: MeleeAttack,
        damageType: SlashingDamage,
        rolledDamage: 6,
        damageModifier: 0,
        targetAdjustments: noDamageAdjustmentFacts,
        disposition: OrdinaryAttackDamage,
      }
    )
    all {
      assert(result.actionQuota == criticalDamageFixtureActionQuota),
      assert(result.attackRollOutcome.hits == criticalDamageFixtureAttackHits),
      assert(result.attackRollOutcome.critical == criticalDamageFixtureCriticalHit),
      assert(result.damageResult.vitals.hitPoints == criticalDamageFixtureHitPoints),
      assert(result.damageResult.vitals.unconscious == criticalDamageFixtureUnconscious),
      assert(legalHitPointRecoveryState(
        result.damageResult.vitals,
        result.damageResult.deathSavingThrows,
        result.damageResult.positiveHitPointUnconsciousRecovery
      )),
    }
  }
}
