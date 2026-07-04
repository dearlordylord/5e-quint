module battleRuntimeTurnOrderTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import attackActionAdditionalAttacks.* from "../shared-algebras/proofs/rule-core/attack-action-additional-attacks"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  run test_alert_initiative_swap_requires_initial_willing_non_incapacitated_ally = {
    val afterOneTurn = nextInitiative(initialState.initiative)
    val consumedAfterFighterSwap = alertInitiativeSwapConsumedSourcesAfterSwap(Set(), Fighter)
    all {
      assert(alertInitiativeSwapAllowed(initialState.initiative, Set(), Fighter, Goblin, true, true, false, false)),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, Set(), Fighter, Fighter, true, true, false, false))),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, Set(), Fighter, Goblin, false, true, false, false))),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, Set(), Fighter, Goblin, true, false, false, false))),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, Set(), Fighter, Goblin, true, true, true, false))),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, Set(), Fighter, Goblin, true, true, false, true))),
      assert(not(alertInitiativeSwapAllowed(afterOneTurn, Set(), Fighter, Goblin, true, true, false, false))),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, Set(Fighter), Fighter, Goblin, true, true, false, false))),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, consumedAfterFighterSwap, Fighter, Goblin, true, true, false, false))),
      assert(alertInitiativeSwapAllowed(initialState.initiative, Set(Goblin), Fighter, Goblin, true, true, false, false)),
    }
  }

  run test_alert_initiative_swap_exchanges_scores_and_resorts_interleaving_combatants = {
    val swapped = swapInitialInitiativeScores(alertInitialScoredInitiative, AlertSource, AlertAlly)
    val actedInitiative = {
      ...alertInitialScoredInitiative,
      alreadyActed: [AlertAlly],
    }
    val rejectedAfterTurn = swapInitialInitiativeScores(actedInitiative, AlertSource, AlertAlly)
    match swapped {
      | AlertInitiativeSwapped(swappedInitiative) =>
          val ordered = alertSortedInitialInitiativeEntries(swappedInitiative)
          all {
            assert(swappedInitiative.alreadyActed == []),
            assert(ordered.first.actor == AlertSource),
            assert(ordered.second.actor == AlertEnemy),
            assert(ordered.third.actor == AlertAlly),
            assert(ordered.first.initiative == 18),
            assert(ordered.second.initiative == 15),
            assert(ordered.third.initiative == 12),
            assert(rejectedAfterTurn == AlertInitiativeSwapUnavailable),
          }
      | AlertInitiativeSwapUnavailable => assert(false)
    }
  }

  run test_alert_initial_initiative_order_is_derived_from_exact_named_scores = {
    val ordered = alertSortedInitialInitiativeEntries(alertInitialScoredInitiative)
    all {
      assert(ordered.first.actor == AlertAlly),
      assert(ordered.second.actor == AlertEnemy),
      assert(ordered.third.actor == AlertSource),
      assert(ordered.first.initiative == alertInitialScoredInitiative.scores.allyInitiative),
      assert(ordered.second.initiative == alertInitialScoredInitiative.scores.enemyInitiative),
      assert(ordered.third.initiative == alertInitialScoredInitiative.scores.sourceInitiative),
    }
  }

  run test_generic_initiative_advances_to_waiting_actor = {
    val advanced = nextInitiative(initialState.initiative)
    all {
      assert(advanced.round == 1),
      assert(advanced.alreadyActed == [Fighter]),
      assert(advanced.stillToAct == { actor: Goblin, waiting: [] }),
      assert(initiativeStillToActActors(advanced) == [Goblin]),
    }
  }

  run test_generic_initiative_wraps_to_next_round_order = {
    val goblinTurn = nextInitiative(initialState.initiative)
    val nextRound = nextInitiative(goblinTurn)
    all {
      assert(nextRound.round == 2),
      assert(nextRound.alreadyActed == []),
      assert(nextRound.stillToAct == { actor: Fighter, waiting: [Goblin] }),
      assert(initiativeStillToActActors(nextRound) == [Fighter, Goblin]),
    }
  }

  run test_generic_initiative_rejects_empty_input_queue = {
    all {
      assert(initiativeStillToActFromInput([]) == InitiativeStillToActRejectedEmpty),
      assert(initiativeStillToActFromInput([Goblin]) == InitiativeStillToActAccepted({ actor: Goblin, waiting: [] })),
    }
  }

}
