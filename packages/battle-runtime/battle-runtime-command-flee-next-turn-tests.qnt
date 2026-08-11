// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-command-flee-route

module battleRuntimeCommandFleeNextTurnTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeCommandNextTurn.* from "./battle-runtime-command-next-turn"
  import battleRuntimeCommandMovementNextTurn.* from "./battle-runtime-command-movement-next-turn"
  run test_command_flee_spends_full_supplied_movement_and_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandFleeOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandFlee(goblinTurn, WalkSpeedKind, 30, false)
    all {
      assert(currentActor(followed) == Fighter),
      assert(followed.goblin.movementSpent == 30),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandFleeOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_flee_rejects_partial_movement_budget = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandFleeOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandFlee(goblinTurn, WalkSpeedKind, 10, false)
    all {
      assert(currentActor(followed) == Goblin),
      assert(followed.goblin.movementSpent == 0),
      assert(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandFleeOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      }))),
    }
  }

  run test_command_flee_no_movement_clears_pending_and_ends_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandFleeOption)
    val goblinTurn = endTurn(resolved)
    val immobile = { ...goblinTurn, goblin: { ...goblinTurn.goblin, speed: 0 } }
    val followed = followCommandFlee(immobile, WalkSpeedKind, 30, false)
    all {
      assert(currentActor(followed) == Fighter),
      assert(followed.goblin.movementSpent == 0),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandFleeOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_flee_movement_threat_opens_opportunity_attack_window = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandFleeOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandFlee(goblinTurn, WalkSpeedKind, 30, true)
    all {
      assert(currentActor(followed) == Goblin),
      assert(followed.interruptStack.length() == 1),
      assert(pendingReactionFrame(followed.interruptStack[0]) == HasPendingReactionFrame({
        trigger: OpportunityAttack,
        procedure: OpportunityAttackReactionProcedure,
        eligibleReactors: Set(Fighter),
        offeredReactors: Set(),
        continuation: ResumeCommandFleeMovement({
          speedKind: WalkSpeedKind,
          movementCost: 30,
        }),
      })),
    }
  }
}
