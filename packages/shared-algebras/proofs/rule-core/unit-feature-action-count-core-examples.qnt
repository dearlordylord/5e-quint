// -*- mode: Bluespec; -*-

module unitFeatureActionCountCoreExamples {
  import actionTurnProcedures.* from "./action-turn-procedures"
  import unitFeatureActionCountCore.* from "./unit-feature-action-count-core"

  run test_action_surge_grants_one_non_magic_action_once_per_turn = {
    val pool = { usesRemaining: 2, maximumUses: 2 }
    val surged = activateActionSurge(initialActionSurgeState(pool), true)
    val attack = spendActionSurgeAction(surged, AttackAction)
    val secondActivation = activateActionSurge(attack.actionSurge, true)
    val nextTurnActivation = activateActionSurge(startTurnActionSurge(attack.actionSurge), true)
    all {
      assert(surged.pool.usesRemaining == 1),
      assert(attack.actionWasTaken),
      assert(attack.actionSurge.actionGrant == ActionSurgeActionSpent),
      assert(secondActivation == attack.actionSurge),
      assert(nextTurnActivation.pool.usesRemaining == 0),
      assert(legalActionSurgeState(nextTurnActivation)),
    }
  }

  run test_action_surge_extra_action_excludes_magic = {
    val pool = { usesRemaining: 1, maximumUses: 1 }
    val surged = activateActionSurge(initialActionSurgeState(pool), true)
    val magic = spendActionSurgeAction(surged, MagicAction)
    all {
      assert(not(magic.actionWasTaken)),
      assert(magic.actionSurge.actionGrant == ActionSurgeActionAvailable),
    }
  }

  run test_extra_attack_spends_one_action_and_resolves_two_attack_slots = {
    val first = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: 1 }
    )
    val second = resolveExtraAttackSlot(first.state)
    all {
      assert(first.actionWasSpent),
      assert(first.attackWasResolved),
      assert(not(first.state.actionAvailable)),
      assert(first.state.extraAttackSlotOpen),
      assert(not(second.actionWasSpent)),
      assert(second.attackWasResolved),
      assert(not(second.state.extraAttackSlotOpen)),
      assert(second.state.attacksResolved == 2),
    }
  }

  run test_extra_attack_allows_movement_between_attack_slots = {
    val first = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: 1 }
    )
    val moved = moveDuringAttackActionAttackCount(first.state)
    val second = resolveExtraAttackSlot(moved)
    all {
      assert(moved.extraAttackSlotOpen),
      assert(moved.movementSegmentsTaken == 1),
      assert(second.attackWasResolved),
      assert(second.state.attacksResolved == 2),
    }
  }

  run test_extra_attack_end_turn_closes_unspent_slot = {
    val first = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: 1 }
    )
    val ended = endTurnDuringAttackActionAttackCount(first.state)
    val rejected = resolveExtraAttackSlot(ended)
    all {
      assert(not(ended.extraAttackSlotOpen)),
      assert(ended.turnEnded),
      assert(not(rejected.attackWasResolved)),
      assert(rejected.state.attacksResolved == 1),
    }
  }

  run test_extra_attack_profile_rejects_adjacent_additional_counts = {
    val admitted = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: 1 }
    )
    val rejected = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: 2 }
    )
    all {
      assert(admitted.attackWasResolved),
      assert(not(rejected.attackWasResolved)),
      assert(rejected.state.actionAvailable),
    }
  }
}
