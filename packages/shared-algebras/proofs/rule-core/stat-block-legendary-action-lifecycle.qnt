// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-STAT-BLOCK-LEGENDARY-ACTION-LIFECYCLE-001
// UNIT-PROFILE-COVERAGE: qnt-owner stat-block.legendary-action-lifecycle
// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.LEGENDARY_ACTION_LIFECYCLE

module statBlockLegendaryActionLifecycle {
  type StatBlockLegendaryActionPhase =
    | LegendaryActorOwnTurn
    | LegendaryBetweenTurns
    | LegendaryActionWindowOpen

  type StatBlockLegendaryActionState = {
    phase: StatBlockLegendaryActionPhase,
    usesRemaining: int,
    maximumUses: int,
  }

  pure def initialStatBlockLegendaryActionState: StatBlockLegendaryActionState = {
    phase: LegendaryActorOwnTurn,
    usesRemaining: 2,
    maximumUses: 2,
  }

  pure def legalStatBlockLegendaryActionState(state: StatBlockLegendaryActionState): bool = all {
    state.phase.in(Set(
      LegendaryActorOwnTurn,
      LegendaryBetweenTurns,
      LegendaryActionWindowOpen
    )),
    state.maximumUses > 0,
    state.usesRemaining >= 0,
    state.usesRemaining <= state.maximumUses,
    (state.phase == LegendaryActionWindowOpen) implies state.usesRemaining > 0,
  }

  pure def openLegendaryActionWindowAfterAnotherTurn(
    state: StatBlockLegendaryActionState,
    legendaryActorUnableToTakeActions: bool
  ): StatBlockLegendaryActionState =
    if (
      legendaryActorUnableToTakeActions
        or state.phase != LegendaryBetweenTurns
        or state.usesRemaining <= 0
    ) state
    else state.with("phase", LegendaryActionWindowOpen)

  pure def resolveStatBlockLegendaryActionOption(
    state: StatBlockLegendaryActionState,
    legendaryActorUnableToTakeActions: bool
  ): StatBlockLegendaryActionState =
    if (
      legendaryActorUnableToTakeActions
        or state.phase != LegendaryActionWindowOpen
        or state.usesRemaining <= 0
    ) state
    else state
      .with("phase", LegendaryBetweenTurns)
      .with("usesRemaining", state.usesRemaining - 1)

  pure def startStatBlockLegendaryActionTurn(
    state: StatBlockLegendaryActionState
  ): StatBlockLegendaryActionState =
    state
      .with("phase", LegendaryActorOwnTurn)
      .with("usesRemaining", state.maximumUses)

  pure def endStatBlockLegendaryActionTurn(
    state: StatBlockLegendaryActionState
  ): StatBlockLegendaryActionState = state.with("phase", LegendaryBetweenTurns)
}
