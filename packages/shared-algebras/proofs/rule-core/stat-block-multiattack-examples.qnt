// -*- mode: Bluespec; -*-

module statBlockMultiattackExamples {
  import statBlockMultiattack.* from "./stat-block-multiattack"

  run test_multiattack_spends_one_attack_action_and_opens_dispatches = {
    val profile = {
      firstAttackName: PrimaryStatBlockAttack,
      primaryAttackCount: 2,
      secondaryAttackCount: 1,
    }
    val started = startStatBlockMultiattack(initialStatBlockMultiattackState, profile)
    val firstDispatch = resolveStatBlockMultiattackDispatch(started, PrimaryStatBlockAttack)
    val secondDispatch = resolveStatBlockMultiattackDispatch(firstDispatch, SecondaryStatBlockAttack)
    all {
      assert(statBlockMultiattackDispatches(started).primaryRemaining == 1),
      assert(statBlockMultiattackDispatches(started).secondaryRemaining == 1),
      assert(multiattackDispatchSubjectPermitted(started, StatBlockMovementSubject)),
      assert(not(multiattackDispatchSubjectPermitted(started, StatBlockBonusActionSubject))),
      assert(not(statBlockMultiattackContinuationOpen(secondDispatch))),
    }
  }

  run test_end_turn_closes_multiattack_dispatches = {
    val profile = {
      firstAttackName: PrimaryStatBlockAttack,
      primaryAttackCount: 2,
      secondaryAttackCount: 0,
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
