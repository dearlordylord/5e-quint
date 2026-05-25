// -*- mode: Bluespec; -*-

module unitFeatureZeroHitPointCoreExamples {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import unitFeatureZeroHitPointCore.* from "./unit-feature-zero-hit-point-core"

  pure def ordinaryPlayerVitals: CreatureVitals = {
    kind: PlayerCharacter,
    hitPoints: 5,
    hitPointMaximum: 12,
    temporaryHitPoints: 0,
    dead: false,
    unconscious: false,
  }

  run test_zero_hit_point_replacement_spends_use_and_sets_one_hit_point = {
    val result = resolveZeroHitPointReplacement(
      ordinaryPlayerVitals,
      resetDeathSavingThrowLifecycle,
      { usesRemaining: 1, maximumUses: 1 },
      { incomingDamage: 5, choosesFeature: true }
    )
    all {
      assert(result.admitted),
      assert(result.pool.usesRemaining == 0),
      assert(result.vitals.hitPoints == 1),
      assert(not(result.vitals.dead)),
      assert(not(result.vitals.unconscious)),
      assert(result.deathSavingThrows == resetDeathSavingThrowLifecycle),
    }
  }

  run test_zero_hit_point_replacement_rejects_outright_death_and_depleted_use = {
    val outright = resolveZeroHitPointReplacement(
      ordinaryPlayerVitals,
      resetDeathSavingThrowLifecycle,
      { usesRemaining: 1, maximumUses: 1 },
      { incomingDamage: 17, choosesFeature: true }
    )
    val depleted = resolveZeroHitPointReplacement(
      ordinaryPlayerVitals,
      resetDeathSavingThrowLifecycle,
      { usesRemaining: 0, maximumUses: 1 },
      { incomingDamage: 5, choosesFeature: true }
    )
    all {
      assert(not(outright.admitted)),
      assert(outright.vitals.dead),
      assert(outright.deathSavingThrows.failures == 3),
      assert(not(depleted.admitted)),
      assert(depleted.pool.usesRemaining == 0),
      assert(depleted.vitals.hitPoints == 0),
      assert(depleted.vitals.unconscious),
      assert(depleted.deathSavingThrows == resetDeathSavingThrowLifecycle),
    }
  }
}
