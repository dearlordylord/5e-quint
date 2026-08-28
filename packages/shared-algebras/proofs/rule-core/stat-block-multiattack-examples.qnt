// -*- mode: Bluespec; -*-

module statBlockMultiattackExamples {
  import statBlockMultiattack.* from "./stat-block-multiattack"

  run test_multiattack_spends_one_attack_action_and_opens_dispatches = {
    val profile = {
      dispatchProcedureRefs: List(0, 0, 1),
    }
    val activated = activateStatBlockMultiattack(initialStatBlockMultiattackState, profile)
    val firstDispatch = resolveStatBlockMultiattackDispatch(activated, 1)
    val secondDispatch = resolveStatBlockMultiattackDispatch(firstDispatch, 0)
    val thirdDispatch = resolveStatBlockMultiattackDispatch(secondDispatch, 0)
    all {
      assert(statBlockMultiattackPendingProcedureRefs(activated) == List(0, 0, 1)),
      assert(statBlockMultiattackPendingProcedureRefs(firstDispatch) == List(0, 0)),
      assert(statBlockMultiattackPendingProcedureRefs(secondDispatch) == List(0)),
      assert(multiattackDispatchSubjectPermitted(activated, StatBlockMovementSubject)),
      assert(not(multiattackDispatchSubjectPermitted(activated, StatBlockBonusActionSubject))),
      assert(not(statBlockMultiattackContinuationOpen(thirdDispatch))),
    }
  }

  run test_end_turn_closes_multiattack_dispatches = {
    val profile = {
      dispatchProcedureRefs: List(0, 0),
    }
    val activated = activateStatBlockMultiattack(initialStatBlockMultiattackState, profile)
    val ended = endStatBlockMultiattackTurn(activated)
    all {
      assert(statBlockMultiattackContinuationOpen(activated)),
      assert(not(statBlockMultiattackContinuationOpen(ended))),
      assert(ended == StatBlockMultiattackTurnEnded),
    }
  }
}
