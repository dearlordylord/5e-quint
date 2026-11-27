// -*- mode: Bluespec; -*-

module turnStartLifecycleCoreExamples {
  import turnStartLifecycleCore.* from "./turn-start-lifecycle-core"

  pure val endTurnWithinRound: TurnStartEntry =
    EndTurn({ endingActor: "goblin", roundWraps: false })

  pure val endTurnWrappingRound: TurnStartEntry =
    EndTurn({ endingActor: "goblin", roundWraps: true })

  run test_the_opening_runs_only_the_shared_turn_start = {
    assert(turnBoundarySteps(BattleStart) == startingTurnSteps)
  }

  run test_both_entries_reach_the_same_turn_start = {
    all {
      assert(
        turnBoundarySteps(endTurnWithinRound).slice(2, 4) == startingTurnSteps
      ),
      assert(
        turnBoundarySteps(endTurnWrappingRound).slice(2, 4)
          == startingTurnSteps
      ),
    }
  }

  run test_only_end_turn_finishes_an_outgoing_turn = {
    all {
      assert(
        not(turnBoundarySteps(BattleStart).foldl(false, (found, step) =>
          found or step == FinishOutgoingTurn
        ))
      ),
      assert(turnBoundarySteps(endTurnWithinRound)[0] == FinishOutgoingTurn),
    }
  }

  run test_round_durations_tick_only_when_end_turn_wraps_the_round = {
    all {
      assert(turnBoundarySteps(endTurnWithinRound).length() == 4),
      assert(
        turnBoundarySteps(endTurnWrappingRound)
          == [
            FinishOutgoingTurn,
            AdvanceToNextParticipant,
            PrepareStartingTurn,
            ResolveStartTurnOccurrences,
            TickRoundDurations,
          ]
      ),
    }
  }

  run test_a_pending_turn_start_admits_only_start_turn = {
    all {
      assert(subjectAdmitted(TurnStartPending, StartTurnSubject)),
      assert(not(subjectAdmitted(TurnStartPending, OtherSubject))),
      assert(subjectAdmitted(TurnStarted, OtherSubject)),
      assert(not(subjectAdmitted(TurnStarted, StartTurnSubject))),
    }
  }

  run test_a_turn_start_waiting_on_input_stays_pending = {
    all {
      assert(statusAfterTurnStart(false) == TurnStartPending),
      assert(statusAfterTurnStart(true) == TurnStarted),
    }
  }
}
