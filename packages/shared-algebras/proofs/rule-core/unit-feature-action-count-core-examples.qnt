// -*- mode: Bluespec; -*-

module unitFeatureActionCountCoreExamples {
  import attackActionAdditionalAttacks.* from "./attack-action-additional-attacks"
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
      { additionalAttacks: OneAdditionalAttack }
    )
    val second = resolveExtraAttackSlot(first.state)
    all {
      assert(first.actionWasSpent),
      assert(first.attackWasResolved),
      assert(not(first.state.actionAvailable)),
      assert(first.state.additionalAttacksRemaining == OneAdditionalAttack),
      assert(not(second.actionWasSpent)),
      assert(second.attackWasResolved),
      assert(second.state.additionalAttacksRemaining == NoAdditionalAttacks),
      assert(second.state.attacksResolved == 2),
    }
  }

  run test_attack_action_without_extra_attack_resolves_one_attack_slot = {
    val first = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: NoAdditionalAttacks }
    )
    val rejected = resolveExtraAttackSlot(first.state)
    all {
      assert(first.actionWasSpent),
      assert(first.attackWasResolved),
      assert(first.state.additionalAttacksRemaining == NoAdditionalAttacks),
      assert(first.state.attacksResolved == 1),
      assert(not(rejected.attackWasResolved)),
      assert(rejected.state.additionalAttacksRemaining == NoAdditionalAttacks),
      assert(rejected.state.attacksResolved == 1),
    }
  }

  run test_two_extra_attacks_decrease_one_at_a_time = {
    val first = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: TwoAdditionalAttacks }
    )
    val second = resolveExtraAttackSlot(first.state)
    val third = resolveExtraAttackSlot(second.state)
    val rejected = resolveExtraAttackSlot(third.state)
    all {
      assert(first.state.additionalAttacksRemaining == TwoAdditionalAttacks),
      assert(second.state.additionalAttacksRemaining == OneAdditionalAttack),
      assert(third.state.additionalAttacksRemaining == NoAdditionalAttacks),
      assert(third.state.attacksResolved == 3),
      assert(not(rejected.attackWasResolved)),
      assert(rejected.state.additionalAttacksRemaining == NoAdditionalAttacks),
      assert(rejected.state.attacksResolved == 3),
    }
  }

  run test_three_extra_attacks_decrease_one_at_a_time = {
    val first = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: ThreeAdditionalAttacks }
    )
    val second = resolveExtraAttackSlot(first.state)
    val third = resolveExtraAttackSlot(second.state)
    val fourth = resolveExtraAttackSlot(third.state)
    val rejected = resolveExtraAttackSlot(fourth.state)
    all {
      assert(first.state.additionalAttacksRemaining == ThreeAdditionalAttacks),
      assert(second.state.additionalAttacksRemaining == TwoAdditionalAttacks),
      assert(third.state.additionalAttacksRemaining == OneAdditionalAttack),
      assert(fourth.state.additionalAttacksRemaining == NoAdditionalAttacks),
      assert(fourth.state.attacksResolved == 4),
      assert(not(rejected.attackWasResolved)),
      assert(rejected.state.additionalAttacksRemaining == NoAdditionalAttacks),
      assert(rejected.state.attacksResolved == 4),
    }
  }

  run test_extra_attack_allows_movement_between_attack_slots = {
    val first = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: OneAdditionalAttack }
    )
    val moved = moveDuringAttackActionAttackCount(first.state)
    val second = resolveExtraAttackSlot(moved)
    all {
      assert(moved.additionalAttacksRemaining == OneAdditionalAttack),
      assert(moved.movementSegmentsTaken == 1),
      assert(second.attackWasResolved),
      assert(second.state.attacksResolved == 2),
    }
  }

  run test_extra_attack_end_turn_closes_unspent_slot = {
    val first = takeAttackActionWithAttackCountScaling(
      initialAttackActionAttackCountState,
      { additionalAttacks: OneAdditionalAttack }
    )
    val ended = endTurnDuringAttackActionAttackCount(first.state)
    val rejected = resolveExtraAttackSlot(ended)
    all {
      assert(ended.additionalAttacksRemaining == NoAdditionalAttacks),
      assert(ended.turnEnded),
      assert(not(rejected.attackWasResolved)),
      assert(rejected.state.attacksResolved == 1),
    }
  }

  run test_extra_attack_profile_rejects_unmodeled_additional_counts = {
    val admitted = admitAttackActionAdditionalAttacks(3)
    val rejected = admitAttackActionAdditionalAttacks(4)
    all {
      assert(admitted == SupportedAdditionalAttackCount({
        additionalAttacks: ThreeAdditionalAttacks,
      })),
      assert(rejected == UnsupportedAdditionalAttackCount),
    }
  }
}
