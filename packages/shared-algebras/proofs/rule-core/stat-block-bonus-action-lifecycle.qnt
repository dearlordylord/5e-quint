// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-BONUS-ACTION-LIFECYCLE-001
// UNIT-PROFILE-COVERAGE: qnt-owner stat-block.bonus-action-lifecycle
// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.BONUS_ACTION_LIFECYCLE

module statBlockBonusActionLifecycle {
  import actionTurnProcedures.* from "./action-turn-procedures"

  pure def resolveStatBlockBonusActionOption(turn: TurnProcedureState): TurnProcedureState = {
    val spend = spendActionCost(turn, BonusActionCost)
    if (spend.admitted) spend.turn else turn
  }
}
