// RAW: spells.md: Longer Casting Times; rules-glossary.md: Magic, Concentration;
// playing-the-game.md: Order of Combat (six seconds per round).
module spellLongCasting {
  import actionTurnProcedures as turn from "./action-turn-procedures"

  type LongCastingTime = CastingMinutes(int) | CastingHours(int)
  type LongCastingProgress =
    | NotCasting
    | Casting({ remainingTurns: int, lastMagicActionRound: int })
    | ReadyToComplete({ lastMagicActionRound: int })

  pure val roundsPerMinute = 10
  pure val roundsPerHour = 60 * roundsPerMinute

  pure def longCastingTurns(time: LongCastingTime): int = match time {
    | CastingMinutes(amount) => amount * roundsPerMinute
    | CastingHours(amount) => amount * roundsPerHour
  }

  pure def canStartLongCasting(
    progress: LongCastingProgress,
    time: LongCastingTime,
    resources: turn::ActionResourceState
  ): bool = all {
    progress == NotCasting,
    longCastingTurns(time) >= roundsPerMinute,
    turn::canSpendActionResources(resources, turn::StandardActionCost(turn::MagicAction)),
  }

  pure def startLongCasting(time: LongCastingTime, round: int): LongCastingProgress =
    Casting({ remainingTurns: longCastingTurns(time) - 1, lastMagicActionRound: round })

  pure def canContinueLongCasting(
    progress: LongCastingProgress,
    round: int,
    resources: turn::ActionResourceState
  ): bool = match progress {
    | NotCasting => false
    | ReadyToComplete(_) => false
    | Casting(data) => all {
        round == data.lastMagicActionRound + 1,
        turn::canSpendActionResources(resources, turn::StandardActionCost(turn::MagicAction)),
      }
  }

  pure def continueLongCasting(progress: LongCastingProgress, round: int): LongCastingProgress =
    match progress {
      | Casting(data) =>
          if (data.remainingTurns == 1) ReadyToComplete({ lastMagicActionRound: round })
          else Casting({ remainingTurns: data.remainingTurns - 1, lastMagicActionRound: round })
      | NotCasting => NotCasting
      | ReadyToComplete(data) => ReadyToComplete(data)
    }

  pure def longCastingMustFailAtTurnEnd(progress: LongCastingProgress, round: int): bool =
    match progress {
      | NotCasting => false
      | Casting(data) => data.lastMagicActionRound != round
      | ReadyToComplete(_) => true
    }

  // Both casting phases require Concentration. Loss abandons progress before
  // any invocation resource or lasting spell effect has been created.
  pure def breakLongCasting: LongCastingProgress = NotCasting

  pure def longCastingCanComplete(progress: LongCastingProgress, round: int): bool =
    match progress {
      | ReadyToComplete(data) => data.lastMagicActionRound == round
      | NotCasting => false
      | Casting(_) => false
    }
}
