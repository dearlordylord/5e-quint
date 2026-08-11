// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-command-approach-route

module battleRuntimeCommandApproachNextTurnTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeCommandNextTurn.* from "./battle-runtime-command-next-turn"
  import battleRuntimeCommandMovementNextTurn.* from "./battle-runtime-command-movement-next-turn"
  run test_command_approach_spends_supplied_movement_and_continues_when_not_within_five_feet = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandApproachOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandApproach(goblinTurn, WalkSpeedKind, 10, false)
    all {
      assert(currentActor(followed) == Goblin),
      assert(followed.goblin.movementSpent == 10),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandApproachOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_approach_ends_turn_when_supplied_proximity_reached = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandApproachOption)
    val goblinTurn = endTurn(resolved)
    val followed = followCommandApproach(goblinTurn, WalkSpeedKind, 10, true)
    all {
      assert(currentActor(followed) == Fighter),
      assert(followed.goblin.movementSpent == 10),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandApproachOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

  run test_command_approach_no_movement_clears_pending_and_continues_turn = {
    val resolved = resolveCommand(initialState, Set(Goblin), Set(Goblin), 1, CommandApproachOption)
    val goblinTurn = endTurn(resolved)
    val immobile = { ...goblinTurn, goblin: { ...goblinTurn.goblin, speed: 0 } }
    val followed = followCommandApproach(immobile, WalkSpeedKind, 10, false)
    all {
      assert(currentActor(followed) == Goblin),
      assert(followed.goblin.movementSpent == 0),
      assert(not(followed.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandApproachOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
    }
  }

}

