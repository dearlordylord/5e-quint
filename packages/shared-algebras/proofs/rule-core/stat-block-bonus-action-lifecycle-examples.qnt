// -*- mode: Bluespec; -*-

module statBlockBonusActionLifecycleExamples {
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import statBlockBonusActionLifecycle.* from "./stat-block-bonus-action-lifecycle"

  run test_stat_block_bonus_action_option_spends_bonus_action = {
    val result = resolveStatBlockBonusActionOption(initialTurnProcedureState)
    all {
      assert(result.actionQuota == ActionAvailable),
      assert(not(result.bonusActionAvailable)),
      assert(legalTurnProcedureState(result)),
    }
  }
}
