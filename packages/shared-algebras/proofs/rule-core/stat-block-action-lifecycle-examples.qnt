// -*- mode: Bluespec; -*-

module statBlockActionLifecycleExamples {
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import statBlockActionLifecycle.* from "./stat-block-action-lifecycle"

  run test_stat_block_action_option_spends_ordinary_action = {
    val result = resolveStatBlockActionOption(initialTurnProcedureState)
    all {
      assert(result.actionQuota == ActionSpent),
      assert(result.bonusActionAvailable),
      assert(legalTurnProcedureState(result)),
    }
  }
}
