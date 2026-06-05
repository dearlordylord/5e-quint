// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.hunters-prey
module battleRuntimeHuntersPreyTests {
  import battleRuntimeHuntersPrey.* from "./battle-runtime-hunters-prey"

  run test_colossus_slayer_applies_once_to_weapon_hit_against_wounded_target = all {
    val result = resolveColossusSlayer(initialHuntersPreyState(ColossusSlayerChoice))
    all {
      assert(result.colossusDamageDice == 1),
      assert(result.colossusSlayerUsedThisTurn),
      assert(not(result.rejected)),
    }
  }

  run test_colossus_slayer_rejects_missing_choice_predicate_and_repeat = all {
    val missingChoice = resolveColossusSlayer(initialHuntersPreyState(NoHuntersPreyChoice))
    val unwounded = resolveColossusSlayer({ ...initialHuntersPreyState(ColossusSlayerChoice), targetMissingHitPoints: false })
    val repeated = resolveColossusSlayer({ ...initialHuntersPreyState(ColossusSlayerChoice), colossusSlayerUsedThisTurn: true })
    val skipped = resolveColossusSlayer({ ...initialHuntersPreyState(ColossusSlayerChoice), colossusSlayerChosen: false })
    all {
      assert(missingChoice.rejected),
      assert(unwounded.rejected),
      assert(repeated.rejected),
      assert(unwounded.colossusDamageDice == 0),
      assert(not(skipped.rejected)),
      assert(not(skipped.colossusSlayerUsedThisTurn)),
      assert(skipped.colossusDamageDice == 0),
    }
  }

  run test_horde_breaker_grants_same_weapon_attack_for_caller_eligible_second_target = all {
    val result = resolveHordeBreaker(initialHuntersPreyState(HordeBreakerChoice))
    val afterMiss = resolveHordeBreaker({ ...initialHuntersPreyState(HordeBreakerChoice), weaponAttackHit: false })
    all {
      assert(result.hordeBreakerAttackGranted),
      assert(result.hordeBreakerUsedThisTurn),
      assert(not(result.rejected)),
      assert(afterMiss.hordeBreakerAttackGranted),
      assert(afterMiss.hordeBreakerUsedThisTurn),
      assert(not(afterMiss.rejected)),
    }
  }

  run test_horde_breaker_rejects_missing_choice_target_predicates_and_repeat = all {
    val missingChoice = resolveHordeBreaker(initialHuntersPreyState(NoHuntersPreyChoice))
    val sameTarget = resolveHordeBreaker({ ...initialHuntersPreyState(HordeBreakerChoice), secondTargetDifferent: false })
    val notNear = resolveHordeBreaker({ ...initialHuntersPreyState(HordeBreakerChoice), secondTargetWithinFiveFeetOfOriginal: false })
    val outsideRange = resolveHordeBreaker({ ...initialHuntersPreyState(HordeBreakerChoice), secondTargetWithinWeaponRange: false })
    val alreadyAttacked = resolveHordeBreaker({ ...initialHuntersPreyState(HordeBreakerChoice), secondTargetNotAttackedThisTurn: false })
    val repeated = resolveHordeBreaker({ ...initialHuntersPreyState(HordeBreakerChoice), hordeBreakerUsedThisTurn: true })
    all {
      assert(missingChoice.rejected),
      assert(sameTarget.rejected),
      assert(notNear.rejected),
      assert(outsideRange.rejected),
      assert(alreadyAttacked.rejected),
      assert(repeated.rejected),
      assert(not(sameTarget.hordeBreakerAttackGranted)),
    }
  }
}
