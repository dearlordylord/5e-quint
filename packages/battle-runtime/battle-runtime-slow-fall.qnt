// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.reaction-roll-or-damage-reduction
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.reaction-roll-or-damage-reduction

module battleRuntimeSlowFall {
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import unitFeatureReactionReductionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core"

  pure def battleRuntimeSlowFallDamageAfterReaction(
    reactionAvailable: bool,
    incomingFallDamage: int,
    monkLevel: int
  ): SlowFallReductionResult =
    resolveSlowFallReaction(
      initialTurnProcedureState.with("reactionAvailable", reactionAvailable),
      {
        incomingFallDamage: incomingFallDamage,
        monkLevel: monkLevel,
      }
    )

  run test_slow_fall_runtime_reduces_by_five_times_monk_level = {
    val result = battleRuntimeSlowFallDamageAfterReaction(true, 28, 5)
    all {
      assert(not(result.turn.reactionAvailable)),
      assert(result.reducedFallDamage == 3),
      assert(not(result.fallingPronePrevented)),
    }
  }

  run test_slow_fall_runtime_requires_reaction = {
    val result = battleRuntimeSlowFallDamageAfterReaction(false, 18, 4)
    all {
      assert(not(result.turn.reactionAvailable)),
      assert(result.reducedFallDamage == 18),
      assert(not(result.fallingPronePrevented)),
    }
  }

  run test_slow_fall_runtime_zero_damage_prevents_falling_prone = {
    val result = battleRuntimeSlowFallDamageAfterReaction(true, 18, 4)
    all {
      assert(not(result.turn.reactionAvailable)),
      assert(result.reducedFallDamage == 0),
      assert(result.fallingPronePrevented),
    }
  }
}
