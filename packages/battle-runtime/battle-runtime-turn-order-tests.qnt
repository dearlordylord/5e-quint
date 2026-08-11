module battleRuntimeTurnOrderTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import attackActionAdditionalAttacks.* from "../shared-algebras/proofs/rule-core/attack-action-additional-attacks"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_alert_initiative_swap_requires_initial_willing_non_incapacitated_ally = {
    val afterOneTurn = nextInitiative(initialState.initiative)
    val consumedAfterFighterSwap = alertInitiativeSwapConsumedSourcesAfterSwap(Set(), Fighter)
    all {
      assert(alertInitiativeSwapAllowed(initialState.initiative, Set(), Fighter, Goblin, WillingAlly, false, false)),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, Set(), Fighter, Fighter, WillingAlly, false, false))),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, Set(), Fighter, Goblin, NotAlly, false, false))),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, Set(), Fighter, Goblin, UnwillingAlly, false, false))),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, Set(), Fighter, Goblin, WillingAlly, true, false))),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, Set(), Fighter, Goblin, WillingAlly, false, true))),
      assert(not(alertInitiativeSwapAllowed(afterOneTurn, Set(), Fighter, Goblin, WillingAlly, false, false))),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, Set(Fighter), Fighter, Goblin, WillingAlly, false, false))),
      assert(not(alertInitiativeSwapAllowed(initialState.initiative, consumedAfterFighterSwap, Fighter, Goblin, WillingAlly, false, false))),
      assert(alertInitiativeSwapAllowed(initialState.initiative, Set(Goblin), Fighter, Goblin, WillingAlly, false, false)),
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

  run test_end_turn_advances_current_actor_and_resets_resources = {
    val result = endTurn({
      ...initialState,
      actionAvailable: false,
      bonusActionAvailable: false,
      dashMovementBonus: 30,
      disengaged: true,
      goblin: {
        ...initialState.goblin,
        reactionAvailable: false,
        movementSpent: 20,
        dodging: true,
      },
    })
    all {
      assert(currentActor(result) == Goblin),
      assert(result.initiative.round == 1),
      assert(result.actionAvailable),
      assert(result.bonusActionAvailable),
      assert(result.goblin.reactionAvailable),
      assert(result.goblin.movementSpent == 0),
      assert(not(result.goblin.dodging)),
      assert(result.dashMovementBonus == 0),
      assert(not(result.disengaged)),
    }
  }
  run test_end_turn_wraps_to_next_round = {
    val result = endTurn(endTurn(initialState))
    all {
      assert(currentActor(result) == Fighter),
      assert(result.initiative.round == 2),
      assert(result.initiative.alreadyActed == []),
      assert(initiativeStillToActActors(result.initiative) == [Fighter, Goblin]),
    }
  }
}
