// -*- mode: Bluespec; -*-

module statBlockLegendaryActionLifecycleExamples {
  import statBlockLegendaryActionLifecycle.* from "./stat-block-legendary-action-lifecycle"

  run test_legendary_action_window_spends_use_and_closes = {
    val waiting = endStatBlockLegendaryActionTurn(initialStatBlockLegendaryActionState)
    val opened = openLegendaryActionWindowAfterAnotherTurn(waiting, false)
    val resolved = resolveStatBlockLegendaryActionOption(opened, false)
    all {
      assert(opened.phase == LegendaryActionWindowOpen),
      assert(resolved.phase == LegendaryBetweenTurns),
      assert(resolved.usesRemaining == 1),
      assert(legalStatBlockLegendaryActionState(resolved)),
    }
  }

  run test_start_turn_refreshes_legendary_action_uses = {
    val spent = initialStatBlockLegendaryActionState.with("usesRemaining", 0)
    val started = startStatBlockLegendaryActionTurn(spent)
    all {
      assert(started.usesRemaining == started.maximumUses),
      assert(started.phase == LegendaryActorOwnTurn),
    }
  }
}
