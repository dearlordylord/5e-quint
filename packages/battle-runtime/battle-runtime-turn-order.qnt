// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.initiative-proficiency-and-swap
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.initiative-proficiency-and-swap

module battleRuntimeTurnOrder {
  import battleRuntimeModel.* from "./battle-runtime-model"

  type AlertActor = AlertSource | AlertAlly | AlertEnemy

  type AlertInitiativeEntry = {
    actor: AlertActor,
    initiative: int,
    order: int,
  }

  type AlertInitiative = {
    round: int,
    alreadyActed: List[AlertActor],
    stillToAct: List[AlertInitiativeEntry],
  }

  pure val alertInitialScoredInitiative: AlertInitiative = {
    round: 1,
    alreadyActed: [],
    stillToAct: [
      { actor: AlertAlly, initiative: 18, order: 1 },
      { actor: AlertEnemy, initiative: 15, order: 2 },
      { actor: AlertSource, initiative: 12, order: 0 },
    ],
  }

  pure def currentActor(state: BattleState): Actor =
    state.initiative.stillToAct[0]

  pure def currentActorCanAttack(state: BattleState): bool =
    (state.actionAvailable or (currentActor(state) == Fighter and state.fighter.extraAttackSlotsRemaining > 0)) and
    (
      (currentActor(state) == Fighter and not(state.fighter.unconscious) and not(state.fighter.incapacitated)) or
      (currentActor(state) == Goblin and state.goblin.hp > 0)
    )

  pure def nextInitiative(initiative: Initiative): Initiative = {
    val current = initiative.stillToAct[0]
    val remaining = initiative.stillToAct.slice(1, initiative.stillToAct.length())
    val acted = initiative.alreadyActed.append(current)

    if (remaining.length() == 0)
      { round: initiative.round + 1, alreadyActed: [], stillToAct: acted }
    else
      { round: initiative.round, alreadyActed: acted, stillToAct: remaining }
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
    if (initiative.stillToAct[0].actor == actor)
      initiative.stillToAct[0].initiative
    else if (initiative.stillToAct[1].actor == actor)
      initiative.stillToAct[1].initiative
    else
      initiative.stillToAct[2].initiative

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
  ): List[AlertInitiativeEntry] =
    if (alertInitiativeEntryPrecedes(first, second) and alertInitiativeEntryPrecedes(second, third))
      [first, second, third]
    else if (alertInitiativeEntryPrecedes(first, third) and alertInitiativeEntryPrecedes(third, second))
      [first, third, second]
    else if (alertInitiativeEntryPrecedes(second, first) and alertInitiativeEntryPrecedes(first, third))
      [second, first, third]
    else if (alertInitiativeEntryPrecedes(second, third) and alertInitiativeEntryPrecedes(third, first))
      [second, third, first]
    else if (alertInitiativeEntryPrecedes(third, first) and alertInitiativeEntryPrecedes(first, second))
      [third, first, second]
    else
      [third, second, first]

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
  ): AlertInitiative =
    if (initiative.alreadyActed.length() != 0 or source == ally)
      initiative
    else {
      val sourceScore = alertInitiativeScoreFor(initiative, source)
      val allyScore = alertInitiativeScoreFor(initiative, ally)
      val first = alertInitiativeEntryAfterSwap(initiative.stillToAct[0], source, ally, sourceScore, allyScore)
      val second = alertInitiativeEntryAfterSwap(initiative.stillToAct[1], source, ally, sourceScore, allyScore)
      val third = alertInitiativeEntryAfterSwap(initiative.stillToAct[2], source, ally, sourceScore, allyScore)
      {
        ...initiative,
        stillToAct: alertSortThreeInitiativeEntries(first, second, third),
      }
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
      stillToAct: alertInitialScoredInitiative.stillToAct.slice(1, alertInitialScoredInitiative.stillToAct.length()),
    }
    val rejectedAfterTurn = swapInitialInitiativeScores(actedInitiative, AlertSource, AlertAlly)
    all {
      assert(swapped.alreadyActed == []),
      assert(swapped.stillToAct[0].actor == AlertSource),
      assert(swapped.stillToAct[1].actor == AlertEnemy),
      assert(swapped.stillToAct[2].actor == AlertAlly),
      assert(swapped.stillToAct[0].initiative == 18),
      assert(swapped.stillToAct[1].initiative == 15),
      assert(swapped.stillToAct[2].initiative == 12),
      assert(rejectedAfterTurn == actedInitiative),
    }
  }
}
