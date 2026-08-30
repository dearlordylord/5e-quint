// -*- mode: Bluespec; -*-
// RAW-COVERAGE: verification-owner:qnt-proof RAW-STAT-BLOCK-BONUS-ACTION-LIFECYCLE-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof stat-block.bonus-action-lifecycle

module statBlockBonusActionLifecycleInductive {
  import actionTurnProcedures.* from "./action-turn-procedures"
  import statBlockBonusActionLifecycle.* from "./stat-block-bonus-action-lifecycle"

  var qBonusActionAvailable: bool

  pure def qState: TurnProcedureState =
    initialTurnProcedureState.with("bonusActionAvailable", qBonusActionAvailable)

  action init = all {
    qBonusActionAvailable' = initialTurnProcedureState.bonusActionAvailable,
  }
  action doBonusAction = {
    val result = resolveStatBlockBonusActionOption(qState)
    all { qBonusActionAvailable' = result.bonusActionAvailable }
  }
  action step = any { doBonusAction }

  val invariant = all {
    qBonusActionAvailable.in(Set(true, false)),
    legalTurnProcedureState(qState),
  }
}
