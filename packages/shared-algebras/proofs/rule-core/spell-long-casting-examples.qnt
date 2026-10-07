module spellLongCastingExamples {
  import statBlockSpellcastingGroup as group from "./stat-block-spellcasting-group"
  import statBlockResourceLifecycle as resource from "./stat-block-resource-lifecycle"
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
  run test_finalLimitedPaymentUsesCanonicalSelectedPool = {
    val pools = Map(
      1 -> resource::StatBlockDailyUse(resource::initialStatBlockDailyUseResource),
      2 -> resource::StatBlockDailyUse(resource::initialStatBlockDailyUseResource),
      3 -> resource::StatBlockDailyUse(resource::initialStatBlockDailyUseResource)
    )
    val each = group::EachInvocationPool(Map(0 -> 1, 1 -> 2))
    val shared = group::SharedGroupPool({ invocations: Set(0, 1), pool: 1 })
    val started = startLongCasting(CastingMinutes(1), 1)
    val ready = ReadyToComplete({ lastMagicActionRound: 10 })
    val finished = completeLongCastingLimitedInvocation(ready, 10, pools, each, 0, true)
    all {
      assert(completeLongCastingLimitedInvocation(started, 1, pools, each, 0, true).pools == pools),
      assert(completeLongCastingLimitedInvocation(NotCasting, 10, pools, each, 0, true).pools == pools),
      assert(completeLongCastingLimitedInvocation(ready, 11, pools, each, 0, true).pools == pools),
      assert(completeLongCastingLimitedInvocation(ready, 10, pools, each, 0, false).pools == pools),
      assert(finished.admitted),
      assert(finished.pools.get(2) == pools.get(2)),
      assert(finished.pools.get(3) == pools.get(3)),
      assert(not(completeLongCastingLimitedInvocation(ready, 10, finished.pools, each, 0, true).admitted)),
      assert(completeLongCastingLimitedInvocation(ready, 10, pools, shared, 0, true).pools.get(3) == pools.get(3)),
    }
  }
}
