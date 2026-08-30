// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-ACTION-LIFECYCLE-001
// UNIT-PROFILE-COVERAGE: qnt-owner stat-block.action-lifecycle
// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.ACTION_LIFECYCLE

module statBlockActionLifecycle {
  import actionTurnProcedures.* from "./action-turn-procedures"

  pure def resolveStatBlockActionOption(turn: TurnProcedureState): TurnProcedureState = {
    val spend = spendOrdinaryActionResource(turn)
    if (spend.admitted) spend.turn else turn
  }
}
