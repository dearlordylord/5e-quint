// -*- mode: Bluespec; -*-
// RAW-COVERAGE: verification-owner:qnt-proof RAW-STAT-BLOCK-LEGENDARY-ACTION-LIFECYCLE-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof stat-block.legendary-action-lifecycle

module statBlockLegendaryActionLifecycleInductive {
  import statBlockLegendaryActionLifecycle.* from "./stat-block-legendary-action-lifecycle"

  var qPhase: StatBlockLegendaryActionPhase
  var qUsesRemaining: int
  var qMaximumUses: int

  pure def qState: StatBlockLegendaryActionState = {
    phase: qPhase,
    usesRemaining: qUsesRemaining,
    maximumUses: qMaximumUses,
  }

  action recordState(state: StatBlockLegendaryActionState): bool = all {
    qPhase' = state.phase,
    qUsesRemaining' = state.usesRemaining,
    qMaximumUses' = state.maximumUses,
  }

  action init = all { recordState(initialStatBlockLegendaryActionState) }
  action doOpen = all {
    recordState(openLegendaryActionWindowAfterAnotherTurn(qState, false))
  }
  action doResolve = all {
    recordState(resolveStatBlockLegendaryActionOption(qState, false))
  }
  action doStartTurn = all {
    recordState(startStatBlockLegendaryActionTurn(qState))
  }
  action doEndTurn = all {
    recordState(endStatBlockLegendaryActionTurn(qState))
  }
  action step = any { doOpen, doResolve, doStartTurn, doEndTurn }

  val invariant = all {
    qPhase.in(Set(
      LegendaryActorOwnTurn,
      LegendaryBetweenTurns,
      LegendaryActionWindowOpen
    )),
    qMaximumUses.in(1.to(6)),
    qUsesRemaining.in(0.to(qMaximumUses)),
    legalStatBlockLegendaryActionState(qState),
  }
}
