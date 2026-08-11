// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-command-drop-held-object spell.invocation-command-halt-grovel

module battleRuntimeCommandControlNextTurnTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeCommandNextTurn.* from "./battle-runtime-command-next-turn"
  import battleRuntimeCommandControlNextTurn.* from "./battle-runtime-command-control-next-turn"

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
      assert(not(ended.goblin.activeEffects.contains(CommandPending({
        source: Fighter,
        option: CommandHaltOption,
        expiresAtActor: Goblin,
        expiresAtRound: 1,
      })))),
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
