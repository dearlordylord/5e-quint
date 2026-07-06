// -*- mode: Bluespec; -*-

module actionTurnProceduresInductiveTests {
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"

  run ready_movement_reaches_held_reaction_state = {
    val result = resolveReadyMovement(initialTurnProcedureState, true)
    all {
      assert(result.actionQuota == ActionSpent),
      assert(result.reactionAvailable),
      assert(result.readiedMovementHeld),
      assert(result.startOfTurnHookActive),
      assert(legalTurnProcedureState(result)),
    }
  }

  run bonus_action_dash_reaches_bonus_spent_movement_bonus_state = {
    val result = resolveDash(initialTurnProcedureState, 30, BonusActionCost)
    all {
      assert(result.actionQuota == ActionAvailable),
      assert(not(result.bonusActionAvailable)),
      assert(result.dashMovementBonusFeet == 30),
      assert(legalTurnProcedureState(result)),
    }
  }
}
