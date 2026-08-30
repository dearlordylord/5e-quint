// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: bridge-owner BATTLE.STAT_BLOCK.LEGENDARY_ACTION_LIFECYCLE

module battleRuntimeStatBlockLegendaryActionBridge {
  import statBlockLegendaryActionLifecycle.* from "../shared-algebras/proofs/rule-core/stat-block-legendary-action-lifecycle"

  pure def battleRuntimeLegendaryUsesAfterUse(
    usesRemaining: int,
    maximumUses: int,
    windowOpen: bool,
    legendaryActorUnableToTakeActions: bool
  ): int = {
    val state = {
      phase: if (windowOpen) LegendaryActionWindowOpen else LegendaryBetweenTurns,
      usesRemaining: usesRemaining,
      maximumUses: maximumUses,
    }
    resolveStatBlockLegendaryActionOption(
      state,
      legendaryActorUnableToTakeActions
    ).usesRemaining
  }

  pure def battleRuntimeCanUseLegendaryAction(
    actorHpPositive: bool,
    legendaryActorCanTakeActions: bool,
    windowOpen: bool,
    windowConsumed: bool,
    usesRemaining: int,
    maximumUses: int
  ): bool =
    actorHpPositive
      and legendaryActorCanTakeActions
      and not(windowConsumed)
      and battleRuntimeLegendaryUsesAfterUse(
        usesRemaining,
        maximumUses,
        windowOpen,
        not(legendaryActorCanTakeActions)
      ) < usesRemaining
}
