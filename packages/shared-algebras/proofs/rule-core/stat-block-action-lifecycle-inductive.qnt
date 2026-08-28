// -*- mode: Bluespec; -*-
// RAW-COVERAGE: verification-owner:qnt-proof RAW-STAT-BLOCK-ACTION-LIFECYCLE-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof stat-block.action-lifecycle

module statBlockActionLifecycleInductive {
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import statBlockActionLifecycle.* from "./stat-block-action-lifecycle"

  var qActionQuota: ActionQuota

  pure def qState: TurnProcedureState =
    initialTurnProcedureState.with("actionQuota", qActionQuota)

  action init = all { qActionQuota' = initialTurnProcedureState.actionQuota }
  action doAction = {
    val result = resolveStatBlockActionOption(qState)
    all { qActionQuota' = result.actionQuota }
  }
  action step = any { doAction }

  val invariant = all {
    qActionQuota.in(Set(ActionAvailable, ActionSpent)),
    legalTurnProcedureState(qState),
  }
}
