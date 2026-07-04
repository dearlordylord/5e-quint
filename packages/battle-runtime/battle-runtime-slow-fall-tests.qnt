module battleRuntimeSlowFallTests {
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import unitFeatureReactionReductionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core"
  import battleRuntimeSlowFall.* from "./battle-runtime-slow-fall"

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
