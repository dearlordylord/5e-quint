// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL
module battleRuntimeStatBlockBridge {
  import statBlockControls.* from "../shared-algebras/proofs/rule-core/stat-block-controls"

  pure def battleRuntimeRechargeAvailableAfterRoll(
    available: bool,
    minimumRoll: int,
    roll: int
  ): bool = {
    val resources = {
      dailyPool: initialStatBlockLimitedUsePool,
      recharge: { minimumRoll: minimumRoll, available: available },
      rechargeAfterRestAvailable: true,
      legendaryUsesRemaining: 2,
      legendaryUsesMaximum: 2,
    }
    processStatBlockRechargeRoll(resources, roll).recharge.available
  }

  pure def battleRuntimeLegendaryUsesAfterUse(
    usesRemaining: int,
    maximumUses: int,
    windowOpen: bool,
    actorIncapacitated: bool
  ): int = {
    val resources = {
      dailyPool: initialStatBlockLimitedUsePool,
      recharge: initialStatBlockRechargeControl,
      rechargeAfterRestAvailable: true,
      legendaryUsesRemaining: usesRemaining,
      legendaryUsesMaximum: maximumUses,
    }
    val stateWithWindow = initialStatBlockControlState.with("legendaryActionWindowOpen", windowOpen)
    val state = stateWithWindow.with("resources", resources)
    resolveStatBlockLegendaryActionOption(state, actorIncapacitated).resources.legendaryUsesRemaining
  }

  pure def battleRuntimeCanUseLegendaryAction(
    actorHpPositive: bool,
    windowOpen: bool,
    windowConsumed: bool,
    usesRemaining: int,
    maximumUses: int
  ): bool =
    actorHpPositive and
    not(windowConsumed) and
    battleRuntimeLegendaryUsesAfterUse(usesRemaining, maximumUses, windowOpen, false) < usesRemaining

  pure def battleRuntimeGoblinMultiattackDispatchesAfterFirstAttack: int =
    multiattackDispatchesRemaining(multiattackDispatchesAfterFirstAttack({
      firstAttackName: PrimaryStatBlockAttack,
      primaryAttackCount: 3,
      secondaryAttackCount: 0,
    }))

  pure def battleRuntimeGoblinMultiattackDispatchesAfterDispatch(remaining: int): int =
    multiattackDispatchesRemaining(decrementDispatch({
      primaryRemaining: remaining,
      secondaryRemaining: 0,
    }, PrimaryStatBlockAttack))
}
