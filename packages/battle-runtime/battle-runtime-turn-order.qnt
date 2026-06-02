// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.initiative-proficiency-and-swap
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.initiative-proficiency-and-swap

module battleRuntimeTurnOrder {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import attackActionAdditionalAttacks.* from "../shared-algebras/proofs/rule-core/attack-action-additional-attacks"

  type AlertActor = AlertSource | AlertAlly | AlertEnemy

  type AlertInitiativeEntry = {
    actor: AlertActor,
    initiative: int,
    order: int,
  }

  type AlertInitiativeScores = {
    sourceInitiative: int,
    allyInitiative: int,
    enemyInitiative: int,
  }

  type AlertOrderedInitiativeEntries = {
    first: AlertInitiativeEntry,
    second: AlertInitiativeEntry,
    third: AlertInitiativeEntry,
  }

  type AlertInitiative = {
    round: int,
    alreadyActed: List[AlertActor],
    scores: AlertInitiativeScores,
  }

  type AlertInitiativeSwapResult =
    | AlertInitiativeSwapUnavailable
    | AlertInitiativeSwapped(AlertInitiative)

  type InitiativeStillToActInputResult =
    | InitiativeStillToActAccepted(InitiativeStillToAct)
    | InitiativeStillToActRejectedEmpty

  pure val alertInitialScoredInitiative: AlertInitiative = {
    round: 1,
    alreadyActed: [],
    scores: {
      sourceInitiative: 12,
      allyInitiative: 18,
      enemyInitiative: 15,
    },
  }

  pure def currentActor(state: BattleState): Actor =
    state.initiative.stillToAct.actor

  pure def initiativeStillToActActors(initiative: Initiative): List[Actor] =
    [initiative.stillToAct.actor].concat(initiative.stillToAct.waiting)

  pure def initiativeStillToActCount(initiative: Initiative): int =
    1 + initiative.stillToAct.waiting.length()

  pure def initiativeStillToActFromInput(actors: List[Actor]): InitiativeStillToActInputResult =
    if (actors.length() == 0)
      InitiativeStillToActRejectedEmpty
    else
      InitiativeStillToActAccepted({
        actor: actors[0],
        waiting: actors.slice(1, actors.length()),
      })

  pure def initiativeStillToActAfterRoundWrap(alreadyActed: List[Actor], actor: Actor): InitiativeStillToAct =
    match initiativeStillToActFromInput(alreadyActed.append(actor)) {
      | InitiativeStillToActAccepted(stillToAct) => stillToAct
      | InitiativeStillToActRejectedEmpty => { actor: actor, waiting: [] }
    }

  pure def currentActorCanAttack(state: BattleState): bool =
    (state.actionAvailable or (currentActor(state) == Fighter and hasAttackActionAdditionalAttacks(state.fighter.extraAttackSlotsRemaining))) and
    (
      (currentActor(state) == Fighter and not(state.fighter.unconscious) and not(state.fighter.incapacitated)) or
      (currentActor(state) == Goblin and state.goblin.hp > 0)
    )

  pure def nextInitiative(initiative: Initiative): Initiative = {
    val current = initiative.stillToAct.actor
    val remaining = initiative.stillToAct.waiting
    val acted = initiative.alreadyActed.append(current)

    match initiativeStillToActFromInput(remaining) {
      | InitiativeStillToActAccepted(stillToAct) =>
          {
            round: initiative.round,
            alreadyActed: acted,
            stillToAct: stillToAct,
          }
      | InitiativeStillToActRejectedEmpty =>
          {
            round: initiative.round + 1,
            alreadyActed: [],
            stillToAct: initiativeStillToActAfterRoundWrap(initiative.alreadyActed, current),
          }
    }
  }

  // RAW Alert: immediately after rolling Initiative, swap once with one willing
  // ally in the same combat unless either creature is Incapacitated.
  pure def alertInitiativeSwapAllowed(
    initiative: Initiative,
    consumedSwapSources: Set[Actor],
    source: Actor,
    ally: Actor,
    sameSide: bool,
    allyWilling: bool,
    sourceIncapacitated: bool,
    allyIncapacitated: bool,
  ): bool =
    initiative.alreadyActed.length() == 0 and
    not(consumedSwapSources.contains(source)) and
    source != ally and
    sameSide and
    allyWilling and
    not(sourceIncapacitated) and
    not(allyIncapacitated)

  pure def alertInitiativeSwapConsumedSourcesAfterSwap(
    consumedSwapSources: Set[Actor],
    source: Actor,
  ): Set[Actor] =
    consumedSwapSources.union(Set(source))

  pure def alertInitiativeScoreFor(
    initiative: AlertInitiative,
    actor: AlertActor,
  ): int =
    match actor {
      | AlertSource => initiative.scores.sourceInitiative
      | AlertAlly => initiative.scores.allyInitiative
      | AlertEnemy => initiative.scores.enemyInitiative
    }

  pure def alertInitiativeEntryFor(
    initiative: AlertInitiative,
    actor: AlertActor,
  ): AlertInitiativeEntry =
    match actor {
      | AlertSource => { actor: AlertSource, initiative: initiative.scores.sourceInitiative, order: 0 }
      | AlertAlly => { actor: AlertAlly, initiative: initiative.scores.allyInitiative, order: 1 }
      | AlertEnemy => { actor: AlertEnemy, initiative: initiative.scores.enemyInitiative, order: 2 }
    }

  pure def alertInitiativeEntryPrecedes(
    left: AlertInitiativeEntry,
    right: AlertInitiativeEntry,
  ): bool =
    left.initiative > right.initiative or
    (left.initiative == right.initiative and left.order < right.order)

  pure def alertSortThreeInitiativeEntries(
    first: AlertInitiativeEntry,
    second: AlertInitiativeEntry,
    third: AlertInitiativeEntry,
  ): AlertOrderedInitiativeEntries =
    if (alertInitiativeEntryPrecedes(first, second) and alertInitiativeEntryPrecedes(second, third))
      { first: first, second: second, third: third }
    else if (alertInitiativeEntryPrecedes(first, third) and alertInitiativeEntryPrecedes(third, second))
      { first: first, second: third, third: second }
    else if (alertInitiativeEntryPrecedes(second, first) and alertInitiativeEntryPrecedes(first, third))
      { first: second, second: first, third: third }
    else if (alertInitiativeEntryPrecedes(second, third) and alertInitiativeEntryPrecedes(third, first))
      { first: second, second: third, third: first }
    else if (alertInitiativeEntryPrecedes(third, first) and alertInitiativeEntryPrecedes(first, second))
      { first: third, second: first, third: second }
    else
      { first: third, second: second, third: first }

  pure def alertSortedInitialInitiativeEntries(
    initiative: AlertInitiative,
  ): AlertOrderedInitiativeEntries =
    alertSortThreeInitiativeEntries(
      alertInitiativeEntryFor(initiative, AlertSource),
      alertInitiativeEntryFor(initiative, AlertAlly),
      alertInitiativeEntryFor(initiative, AlertEnemy),
    )

  pure def alertInitiativeEntryAfterSwap(
    entry: AlertInitiativeEntry,
    source: AlertActor,
    ally: AlertActor,
    sourceScore: int,
    allyScore: int,
  ): AlertInitiativeEntry =
    if (entry.actor == source)
      { ...entry, initiative: allyScore }
    else if (entry.actor == ally)
      { ...entry, initiative: sourceScore }
    else
      entry

  pure def swapInitialInitiativeScores(
    initiative: AlertInitiative,
    source: AlertActor,
    ally: AlertActor,
  ): AlertInitiativeSwapResult =
    if (initiative.alreadyActed.length() != 0 or source == ally)
      AlertInitiativeSwapUnavailable
    else {
      val sourceScore = alertInitiativeScoreFor(initiative, source)
      val allyScore = alertInitiativeScoreFor(initiative, ally)
      val sourceEntry = alertInitiativeEntryAfterSwap(alertInitiativeEntryFor(initiative, AlertSource), source, ally, sourceScore, allyScore)
      val allyEntry = alertInitiativeEntryAfterSwap(alertInitiativeEntryFor(initiative, AlertAlly), source, ally, sourceScore, allyScore)
      val enemyEntry = alertInitiativeEntryAfterSwap(alertInitiativeEntryFor(initiative, AlertEnemy), source, ally, sourceScore, allyScore)
      AlertInitiativeSwapped({
        ...initiative,
        scores: {
          sourceInitiative: sourceEntry.initiative,
          allyInitiative: allyEntry.initiative,
          enemyInitiative: enemyEntry.initiative,
        },
      })
    }

  pure def endOfCasterNextTurnExpiresAtRound(state: BattleState, source: Actor): int =
    if (currentActor(state) == source) state.initiative.round + 1 else state.initiative.round

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
