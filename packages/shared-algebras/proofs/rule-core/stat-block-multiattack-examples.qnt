// -*- mode: Bluespec; -*-

module statBlockMultiattackExamples {
  import statBlockMultiattack.* from "./stat-block-multiattack"

  run test_multiattack_spends_one_attack_action_and_opens_dispatches = {
    val profile = {
      dispatchProcedureRefs: List(0, 0, 1),
    }
    val started = startStatBlockMultiattack(initialStatBlockMultiattackState, profile)
    val firstDispatch = resolveStatBlockMultiattackDispatch(started, 1)
    val secondDispatch = resolveStatBlockMultiattackDispatch(firstDispatch, 0)
    all {
      assert(statBlockMultiattackPendingProcedureRefs(started) == List(0, 1)),
      assert(statBlockMultiattackPendingProcedureRefs(firstDispatch) == List(0)),
      assert(multiattackDispatchSubjectPermitted(started, StatBlockMovementSubject)),
      assert(not(multiattackDispatchSubjectPermitted(started, StatBlockBonusActionSubject))),
      assert(not(statBlockMultiattackContinuationOpen(secondDispatch))),
    }
  }

  run test_end_turn_closes_multiattack_dispatches = {
    val profile = {
      dispatchProcedureRefs: List(0, 0),
    }
    val started = startStatBlockMultiattack(initialStatBlockMultiattackState, profile)
    val ended = endStatBlockMultiattackTurn(started)
    all {
      assert(statBlockMultiattackContinuationOpen(started)),
      assert(not(statBlockMultiattackContinuationOpen(ended))),
      assert(ended == StatBlockMultiattackTurnEnded),
    }
  }
}
