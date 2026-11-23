// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-command-drop-held-object spell.invocation-command-halt-grovel

module battleRuntimeCommandControlNextTurnTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeCommandNextTurn.* from "./battle-runtime-command-next-turn"
  import battleRuntimeCommandControlNextTurn.* from "./battle-runtime-command-control-next-turn"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"

  run test_command_grovel_records_next_turn_pending_effect_on_failed_save = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandGrovelOption)
    all {
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(not(resolved.actionAvailable)),
      assert(resolved.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandGrovelOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      }))),
      assert(not(resolved.goblin.prone)),
    }
  }

  run test_command_grovel_target_turn_applies_prone_and_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandGrovelOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandGrovel(goblinTurn)
    all {
      assert(followed.goblin.prone),
      assert(currentActor(followed) == Fighter),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandGrovelOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_halt_target_turn_suppresses_action_bonus_action_and_movement = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandHaltOption)
    val goblinTurn = endTurn(resolved)
    val halted = followCommandHalt(goblinTurn)
    val ended = endCommandHaltTurn(halted)
    all {
      assert(resolved.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandHaltOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      }))),
      assert(not(halted.actionAvailable)),
      assert(not(halted.bonusActionAvailable)),
      assert(halted.goblin.movementSpent == halted.goblin.speed),
      assert(dropCurrentActorProne(halted, false) == halted),
      assert(not(ended.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandHaltOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_drop_prone_requires_neither_action_nor_remaining_movement = {
    val spent = {
      ...initialState,
      actionAvailable: false,
      fighter: { ...initialState.fighter, incapacitated: true, movementSpent: initialState.fighter.speed },
    }
    val dropped = dropCurrentActorProne(spent, false)
    all {
      assert(dropped.fighter.prone),
      assert(dropped.fighter.movementSpent == spent.fighter.movementSpent),
      assert(not(dropped.actionAvailable)),
      assert(dropped.bonusActionAvailable == spent.bonusActionAvailable),
      assert(dropCurrentActorProne(spent, true) == spent),
    }
  }

  run test_incapacitated_can_move_but_cannot_spend_action_resources = {
    val incapacitated = { ...initialState, fighter: { ...initialState.fighter, incapacitated: true } }
    val projection = movementProjectionForFighter(incapacitated, WalkSpeedKind)
    val moved = moveFighter(incapacitated, 5, movementDoesNotProvokeOpportunityAttack)
    val refusedDash = dashFighter(moved)
    val recovered = { ...refusedDash, fighter: { ...refusedDash.fighter, incapacitated: false } }
    val recoveredProjection = movementProjectionForFighter(recovered, WalkSpeedKind)
    all {
      assert(battleRuntimeCanSpendMovement(projection, 5)),
      assert(moved.fighter.movementSpent == 5),
      assert(moved.actionAvailable == incapacitated.actionAvailable),
      assert(moved.bonusActionAvailable == incapacitated.bonusActionAvailable),
      assert(moved.fighter.reactionAvailable == incapacitated.fighter.reactionAvailable),
      assert(not(battleRuntimeSpendAttackAction(projection).admitted)),
      assert(not(battleRuntimeSpendBonusAction(projection).admitted)),
      assert(not(reactorCanReact(incapacitated, Fighter))),
      assert(battleRuntimeDash(projection, 30).dashMovementBonus == 0),
      assert(battleRuntimeBonusActionDash(projection, 30).dashMovementBonus == 0),
      assert(refusedDash.actionAvailable == moved.actionAvailable),
      assert(refusedDash.bonusActionAvailable == moved.bonusActionAvailable),
      assert(refusedDash.fighter.reactionAvailable == moved.fighter.reactionAvailable),
      assert(battleRuntimeSpendAttackAction(recoveredProjection).admitted),
      assert(battleRuntimeSpendBonusAction(recoveredProjection).admitted),
      assert(reactorCanReact(recovered, Fighter)),
    }
  }

  run test_command_drop_target_turn_emits_held_object_outcomes_and_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandDropOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandDrop(goblinTurn, 2)
    all {
      assert(commandDropOutcomeCount(goblinTurn, 2) == 2),
      assert(currentActor(followed) == Fighter),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandDropOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_drop_known_empty_held_objects_still_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandDropOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandDrop(goblinTurn, 0)
    all {
      assert(commandDropOutcomeCount(goblinTurn, 0) == 0),
      assert(currentActor(followed) == Fighter),
    }
  }

}
