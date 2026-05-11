// -*- mode: Bluespec; -*-

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

  run test_recharge_roll_uses_stat_block_resource_contract = {
    all {
      assert(not(battleRuntimeRechargeAvailableAfterRoll(false, 5, 4))),
      assert(battleRuntimeRechargeAvailableAfterRoll(false, 5, 5)),
      assert(battleRuntimeRechargeAvailableAfterRoll(true, 5, 1)),
    }
  }

  run test_legendary_action_use_spends_one_resource = {
    all {
      assert(battleRuntimeCanUseLegendaryAction(true, true, false, 2, 2)),
      assert(battleRuntimeLegendaryUsesAfterUse(2, 2, true, false) == 1),
      assert(battleRuntimeLegendaryUsesAfterUse(2, 2, false, false) == 2),
    }
  }

  run test_goblin_multiattack_dispatch_count_uses_stat_block_profile = {
    all {
      assert(battleRuntimeGoblinMultiattackDispatchesAfterFirstAttack == 2),
      assert(battleRuntimeGoblinMultiattackDispatchesAfterDispatch(2) == 1),
      assert(battleRuntimeGoblinMultiattackDispatchesAfterDispatch(1) == 0),
    }
  }
}
