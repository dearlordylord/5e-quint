module spellLongCastingExamples {
  import spellLongCasting.* from "./spell-long-casting"
  import actionTurnProcedures as turn from "./action-turn-procedures"
  import attackDamageComposition.* from "./attack-damage-composition"

  pure val ready = { actionQuota: ActionAvailable, bonusActionAvailable: true, currentActorOwnsTurn: true }
  pure def castThrough(time: LongCastingTime, lastRound: int): LongCastingProgress =
    2.to(lastRound).fold(startLongCasting(time, 1), (progress, _) => match progress {
      | Casting(data) => continueLongCasting(progress, data.lastMagicActionRound + 1)
      | ReadyToComplete(data) => ReadyToComplete(data)
      | NotCasting => NotCasting
    })

  run test_full_minute_requires_ten_distinct_turns = {
    val started = startLongCasting(CastingMinutes(1), 1)
    all {
      assert(canStartLongCasting(NotCasting, CastingMinutes(1), ready)),
      assert(not(canContinueLongCasting(started, 1, ready))),
      assert(canContinueLongCasting(started, 2, ready)),
      assert(not(longCastingCanComplete(castThrough(CastingMinutes(1), 9), 9))),
      assert(longCastingCanComplete(castThrough(CastingMinutes(1), 10), 10)),
      assert(not(longCastingCanComplete(castThrough(CastingMinutes(1), 10), 11))),
    }
  }

  run test_full_hour_requires_six_hundred_turns = all {
    assert(longCastingTurns(CastingHours(1)) == 600),
    assert(not(longCastingCanComplete(castThrough(CastingHours(1), 599), 599))),
    assert(longCastingCanComplete(castThrough(CastingHours(1), 600), 600)),
    assert(longCastingTurns(CastingMinutes(10)) == 100),
    assert(longCastingTurns(CastingHours(2)) == 1200),
  }

  run test_missed_magic_action_and_concentration_loss_abandon_casting = {
    val started = startLongCasting(CastingMinutes(1), 1)
    all {
      assert(not(longCastingMustFailAtTurnEnd(started, 1))),
      assert(longCastingMustFailAtTurnEnd(started, 2)),
      assert(not(canContinueLongCasting(started, 3, ready))),
      assert(not(longCastingCanComplete(breakLongCasting, 10))),
      assert(canStartLongCasting(breakLongCasting, CastingMinutes(1), ready)),
    }
  }
}
