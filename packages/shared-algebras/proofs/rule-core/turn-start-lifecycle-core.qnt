// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.SHARED_TURN_START

module turnStartLifecycleCore {
  // RAW anchors:
  // - playing-the-game.md: Combat, step 3: Take Turns. "Each participant in
  //   the battle takes a turn in Initiative order."
  // - playing-the-game.md: Death Saving Throws. "Whenever you start your turn
  //   with 0 Hit Points, you must make a Death Saving Throw".
  // - classes.md: Champion, Level 10: Heroic Warrior. "whenever you start
  //   your turn without it."
  // - rules-glossary.md: Simultaneous Effects. "if two effects occur at the
  //   start of a player character's turn, the player decides which of the
  //   effects happens first."
  // Nothing in RAW exempts the battle's first turn from its start, so the
  // opening and End Turn reach the same turn-start procedure; only End Turn
  // has an ending turn to finish and a round that can wrap.

  type TurnStartEntry =
    | BattleStart
    | EndTurn(EndingTurn)

  type EndingTurn = {
    endingActor: str,
    roundWraps: bool,
  }

  type TurnBoundaryStep =
    | FinishOutgoingTurn
    | AdvanceToNextParticipant
    | PrepareStartingTurn
    | ResolveStartTurnOccurrences
    | TickRoundDurations

  type TurnStartStatus =
    | TurnStartPending
    | TurnStarted

  type BattleSubjectKind =
    | StartTurnSubject
    | OtherSubject

  /** The procedure every turn start runs, whatever reached it. */
  pure val startingTurnSteps: List[TurnBoundaryStep] = [
    PrepareStartingTurn,
    ResolveStartTurnOccurrences,
  ]

  pure def turnBoundarySteps(entry: TurnStartEntry): List[TurnBoundaryStep] =
    match entry {
      | BattleStart => startingTurnSteps
      | EndTurn(ending) =>
        [FinishOutgoingTurn, AdvanceToNextParticipant]
          .concat(startingTurnSteps)
          .concat(if (ending.roundWraps) [TickRoundDurations] else [])
    }

  /** While a turn start is pending, it is the only subject the battle admits. */
  pure def subjectAdmitted(
    status: TurnStartStatus,
    subject: BattleSubjectKind,
  ): bool =
    match status {
      | TurnStartPending => subject == StartTurnSubject
      | TurnStarted => subject == OtherSubject
    }

  /** A turn start that resolves leaves the turn started. */
  pure def statusAfterTurnStart(resolved: bool): TurnStartStatus =
    if (resolved) TurnStarted else TurnStartPending
}
