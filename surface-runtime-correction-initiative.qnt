module surfaceRuntimeCorrectionInitiative::Impl {
  type CreatureId = str

  type InitiativeEntry = {
    creature: CreatureId,
    initiative: int,
  }

  type InitiativeStack = {
    round: int,
    alreadyActed: List[InitiativeEntry],
    stillToAct: List[InitiativeEntry],
  }

  type CreateInitiativeStackResult =
    | CreateInitiativeStackOk(InitiativeStack)
    | CreateInitiativeStackError

  type RemoveFromInitiativeResult =
    | RemoveFromInitiativeSome(InitiativeStack)
    | RemoveFromInitiativeNone

  type InitiativeTieDecision = {
    tie: List[CreatureId],
    index: int,
  }

  type OptionalInitiativeTieDecision =
    | NoInitiativeTieDecision
    | HasInitiativeTieDecision(InitiativeTieDecision)

  type InsertWithInitiativeResult =
    | InsertWithInitiativeOk(InitiativeStack)
    | InsertWithInitiativeDecide(List[CreatureId])
    | InsertWithInitiativeErrorDecisionSuppliedWithoutTie

  pure def initiativeOrder(stack: InitiativeStack): List[InitiativeEntry] =
    stack.alreadyActed.concat(stack.stillToAct)

  pure def isMonotoneInitiative(order: List[InitiativeEntry]): bool =
    order.foldl(
      { first: true, prev: 0, ok: true },
      (acc, current) =>
        if (acc.first)
          { first: false, prev: current.initiative, ok: true }
        else
          {
            first: false,
            prev: current.initiative,
            ok: acc.ok and acc.prev <= current.initiative,
          }
    ).ok

  pure def createInitiativeStack(order: List[InitiativeEntry], round: int): CreateInitiativeStackResult =
    if (order.length() > 0 and isMonotoneInitiative(order))
      CreateInitiativeStackOk({
        round: round,
        alreadyActed: List(),
        stillToAct: order,
      })
    else
      CreateInitiativeStackError

  pure def currentActing(stack: InitiativeStack): CreatureId =
    stack.stillToAct[0].creature

  pure def currentActingEntry(stack: InitiativeStack): InitiativeEntry =
    stack.stillToAct[0]

  pure def nextInitiative(stack: InitiativeStack): { stack: InitiativeStack, roundTicked: bool } = {
    val current = stack.stillToAct[0]
    val remaining = stack.stillToAct.slice(1, stack.stillToAct.length())
    val acted = stack.alreadyActed.append(current)
    if (remaining.length() == 0)
      {
        stack: {
          round: stack.round + 1,
          alreadyActed: List(),
          stillToAct: acted,
        },
        roundTicked: true,
      }
    else
      {
        stack: {
          round: stack.round,
          alreadyActed: acted,
          stillToAct: remaining,
        },
        roundTicked: false,
      }
  }

  pure def removeFromInitiative(
    stack: InitiativeStack,
    creature: CreatureId,
  ): RemoveFromInitiativeResult = {
    val acted = filterEntriesByCreature(stack.alreadyActed, creature)
    val still = filterEntriesByCreature(stack.stillToAct, creature)
    if (still.length() > 0)
      RemoveFromInitiativeSome({
        round: stack.round,
        alreadyActed: acted,
        stillToAct: still,
      })
    else if (acted.length() > 0)
      RemoveFromInitiativeSome({
        round: stack.round + 1,
        alreadyActed: List(),
        stillToAct: acted,
      })
    else
      RemoveFromInitiativeNone
  }

  pure def filterEntriesByCreature(
    entries: List[InitiativeEntry],
    creature: CreatureId,
  ): List[InitiativeEntry] =
    entries.foldl(List(), (acc, entry) =>
      if (entry.creature == creature) acc else acc.append(entry)
    )

  pure def creaturesOf(entries: List[InitiativeEntry]): List[CreatureId] =
    entries.foldl(List(), (acc, entry) => acc.append(entry.creature))

  pure def sameTieCreatures(actual: List[CreatureId], decision: List[CreatureId]): bool =
    if (actual.length() != decision.length()) false
    else
      actual.foldl({ idx: 0, ok: true }, (acc, creature) =>
        {
          idx: acc.idx + 1,
          ok: acc.ok and creature == decision[acc.idx],
        }
      ).ok

  pure def firstGreaterIndex(order: List[InitiativeEntry], initiative: int): int =
    order.foldl(
      { idx: 0, result: order.length() },
      (acc, current) =>
        if (acc.result < order.length())
          { idx: acc.idx + 1, result: acc.result }
        else if (current.initiative > initiative)
          { idx: acc.idx + 1, result: acc.idx }
        else
          { idx: acc.idx + 1, result: order.length() }
    ).result

  pure def firstEqualIndex(order: List[InitiativeEntry], initiative: int): int =
    order.foldl(
      { idx: 0, result: -1 },
      (acc, current) =>
        if (acc.result >= 0)
          { idx: acc.idx + 1, result: acc.result }
        else if (current.initiative == initiative)
          { idx: acc.idx + 1, result: acc.idx }
        else
          { idx: acc.idx + 1, result: -1 }
    ).result

  pure def firstGreaterAfter(order: List[InitiativeEntry], start: int, initiative: int): int =
    order.slice(start, order.length()).foldl(
      { idx: start, result: order.length() },
      (acc, current) =>
        if (acc.result < order.length())
          { idx: acc.idx + 1, result: acc.result }
        else if (current.initiative > initiative)
          { idx: acc.idx + 1, result: acc.idx }
        else
          { idx: acc.idx + 1, result: order.length() }
    ).result

  pure def insertAtOrderIndex(
    stack: InitiativeStack,
    index: int,
    entry: InitiativeEntry,
  ): InitiativeStack = {
    val order = initiativeOrder(stack)
    val normalizedIndex =
      if (index < 0) 0
      else if (index > order.length()) order.length()
      else index
    val actedCount = stack.alreadyActed.length()
    if (normalizedIndex <= actedCount)
      {
        round: stack.round,
        alreadyActed:
          stack.alreadyActed.slice(0, normalizedIndex)
            .append(entry)
            .concat(stack.alreadyActed.slice(normalizedIndex, actedCount)),
        stillToAct: stack.stillToAct,
      }
    else {
      val stillIndex = normalizedIndex - actedCount
      {
        round: stack.round,
        alreadyActed: stack.alreadyActed,
        stillToAct:
          stack.stillToAct.slice(0, stillIndex)
            .append(entry)
            .concat(stack.stillToAct.slice(stillIndex, stack.stillToAct.length())),
      }
    }
  }

  pure def insertWithInitiative(
    stack: InitiativeStack,
    creature: CreatureId,
    initiative: int,
    decision: OptionalInitiativeTieDecision,
  ): InsertWithInitiativeResult = {
    val entry: InitiativeEntry = {
      creature: creature,
      initiative: initiative,
    }
    val order = initiativeOrder(stack)
    val greaterIndex = firstGreaterIndex(order, initiative)
    val equalIndex = firstEqualIndex(order, initiative)
    if (equalIndex < 0)
      match decision {
        | NoInitiativeTieDecision => InsertWithInitiativeOk(insertAtOrderIndex(stack, greaterIndex, entry))
        | HasInitiativeTieDecision(_) => InsertWithInitiativeErrorDecisionSuppliedWithoutTie
      }
    else {
      val tieEnd = firstGreaterAfter(order, equalIndex, initiative)
      val tiedEntries = order.slice(equalIndex, tieEnd)
      val tie = creaturesOf(tiedEntries)
      match decision {
        | NoInitiativeTieDecision => InsertWithInitiativeDecide(tie)
        | HasInitiativeTieDecision(decisionRec) =>
            if (sameTieCreatures(tie, decisionRec.tie) and decisionRec.index >= 0 and decisionRec.index < tie.length())
              InsertWithInitiativeOk(insertAtOrderIndex(stack, equalIndex + decisionRec.index, entry))
            else
              InsertWithInitiativeDecide(tie)
      }
    }
  }

  pure val E1: InitiativeEntry = { creature: "c1", initiative: 1 }
  pure val E2: InitiativeEntry = { creature: "c2", initiative: 2 }
  pure val E2B: InitiativeEntry = { creature: "c2b", initiative: 2 }
  pure val E3: InitiativeEntry = { creature: "c3", initiative: 3 }
  pure val E4: InitiativeEntry = { creature: "c4", initiative: 4 }

  run test_createInitiativeStack_ok = {
    val created = createInitiativeStack([E1, E3, E4], 1)
    assert(created == CreateInitiativeStackOk({
      round: 1,
      alreadyActed: List(),
      stillToAct: [E1, E3, E4],
    }))
  }

  run test_createInitiativeStack_error_on_non_monotone = {
    val created = createInitiativeStack([E3, E1, E4], 1)
    assert(created == CreateInitiativeStackError)
  }

  run test_nextInitiative_advances = {
    val stack: InitiativeStack = {
      round: 1,
      alreadyActed: List(),
      stillToAct: [E1, E3, E4],
    }
    val advanced = nextInitiative(stack)
    all {
      assert(advanced.roundTicked == false),
      assert(advanced.stack == {
        round: 1,
        alreadyActed: [E1],
        stillToAct: [E3, E4],
      }),
    }
  }

  run test_nextInitiative_wraps = {
    val stack: InitiativeStack = {
      round: 1,
      alreadyActed: [E1, E3],
      stillToAct: [E4],
    }
    val advanced = nextInitiative(stack)
    all {
      assert(advanced.roundTicked == true),
      assert(advanced.stack == {
        round: 2,
        alreadyActed: List(),
        stillToAct: [E1, E3, E4],
      }),
    }
  }

  run test_removeFromInitiative_none_when_all_removed = {
    val stack: InitiativeStack = {
      round: 1,
      alreadyActed: List(),
      stillToAct: [E1],
    }
    assert(removeFromInitiative(stack, "c1") == RemoveFromInitiativeNone)
  }

  run test_removeFromInitiative_wraps_when_still_to_act_empties = {
    val stack: InitiativeStack = {
      round: 1,
      alreadyActed: [E1, E3],
      stillToAct: [E4],
    }
    assert(removeFromInitiative(stack, "c4") == RemoveFromInitiativeSome({
      round: 2,
      alreadyActed: List(),
      stillToAct: [E1, E3],
    }))
  }

  run test_insertWithInitiative_ok_without_tie = {
    val stack: InitiativeStack = {
      round: 1,
      alreadyActed: List(),
      stillToAct: [E1, E4],
    }
    assert(insertWithInitiative(stack, "c3", 3, NoInitiativeTieDecision) ==
      InsertWithInitiativeOk({
        round: 1,
        alreadyActed: List(),
        stillToAct: [E1, { creature: "c3", initiative: 3 }, E4],
      }))
  }

  run test_insertWithInitiative_decide_on_tie = {
    val stack: InitiativeStack = {
      round: 1,
      alreadyActed: [E1],
      stillToAct: [E2, E2B, E4],
    }
    assert(insertWithInitiative(stack, "cx", 2, NoInitiativeTieDecision) ==
      InsertWithInitiativeDecide(["c2", "c2b"]))
  }

  run test_insertWithInitiative_ok_with_valid_decision = {
    val stack: InitiativeStack = {
      round: 1,
      alreadyActed: [E1],
      stillToAct: [E2, E2B, E4],
    }
    val decision: InitiativeTieDecision = {
      tie: ["c2", "c2b"],
      index: 1,
    }
    assert(insertWithInitiative(stack, "cx", 2, HasInitiativeTieDecision(decision)) ==
      InsertWithInitiativeOk({
        round: 1,
        alreadyActed: [E1, { creature: "cx", initiative: 2 }],
        stillToAct: [E2, E2B, E4],
      }))
  }

  run test_insertWithInitiative_error_when_decision_supplied_without_tie = {
    val stack: InitiativeStack = {
      round: 1,
      alreadyActed: List(),
      stillToAct: [E1, E4],
    }
    val decision: InitiativeTieDecision = {
      tie: ["c1"],
      index: 0,
    }
    assert(insertWithInitiative(stack, "c3", 3, HasInitiativeTieDecision(decision)) ==
      InsertWithInitiativeErrorDecisionSuppliedWithoutTie)
  }

  run test_insertWithInitiative_decide_again_when_decision_is_stale = {
    val stack: InitiativeStack = {
      round: 1,
      alreadyActed: [E1],
      stillToAct: [E2, E2B, E4],
    }
    val decision: InitiativeTieDecision = {
      tie: ["c2b", "c2"],
      index: 1,
    }
    assert(insertWithInitiative(stack, "cx", 2, HasInitiativeTieDecision(decision)) ==
      InsertWithInitiativeDecide(["c2", "c2b"]))
  }
}
