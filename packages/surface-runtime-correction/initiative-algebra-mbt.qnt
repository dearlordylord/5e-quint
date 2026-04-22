module initiativeAlgebraMbt::Impl {
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

  var qRound: int
  var qAlreadyActed: List[InitiativeEntry]
  var qStillToAct: List[InitiativeEntry]
  var qLastInsertStatus: str
  var qLastTie: List[CreatureId]

  pure def initiativeOrder(stack: InitiativeStack): List[InitiativeEntry] =
    stack.alreadyActed.concat(stack.stillToAct)

  pure def nextInitiative(stack: InitiativeStack): { stack: InitiativeStack, roundTicked: bool } = {
    val current = stack.stillToAct[0]
    val remaining = stack.stillToAct.slice(1, stack.stillToAct.length())
    val acted = stack.alreadyActed.append(current)
    if (remaining.length() == 0)
      {
        stack: { round: stack.round + 1, alreadyActed: List(), stillToAct: acted },
        roundTicked: true,
      }
    else
      {
        stack: { round: stack.round, alreadyActed: acted, stillToAct: remaining },
        roundTicked: false,
      }
  }

  pure def filterEntriesByCreature(
    entries: List[InitiativeEntry],
    creature: CreatureId,
  ): List[InitiativeEntry] =
    entries.foldl(List(), (acc, entry) =>
      if (entry.creature == creature) acc else acc.append(entry)
    )

  pure def removeFromInitiative(
    stack: InitiativeStack,
    creature: CreatureId,
  ): InitiativeStack =
    {
      round: stack.round,
      alreadyActed: filterEntriesByCreature(stack.alreadyActed, creature),
      stillToAct: filterEntriesByCreature(stack.stillToAct, creature),
    }

  pure def normalizeAfterRemove(stack: InitiativeStack): InitiativeStack =
    if (stack.stillToAct.length() > 0) stack
    else { round: stack.round + 1, alreadyActed: List(), stillToAct: stack.alreadyActed }

  pure def creaturesOf(entries: List[InitiativeEntry]): List[CreatureId] =
    entries.foldl(List(), (acc, entry) => acc.append(entry.creature))

  pure def sameTieCreatures(actual: List[CreatureId], decision: List[CreatureId]): bool =
    if (actual.length() != decision.length()) false
    else
      actual.foldl({ idx: 0, ok: true }, (acc, creature) =>
        { idx: acc.idx + 1, ok: acc.ok and creature == decision[acc.idx] }
      ).ok

  pure def firstGreaterIndex(order: List[InitiativeEntry], initiative: int): int =
    order.foldl(
      { idx: 0, result: order.length() },
      (acc, current) =>
        if (acc.result < order.length())
          { idx: acc.idx + 1, result: acc.result }
        else if (current.initiative < initiative)
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
        else if (current.initiative < initiative)
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
    val entry: InitiativeEntry = { creature: creature, initiative: initiative }
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
      val tie = creaturesOf(order.slice(equalIndex, tieEnd))
      match decision {
        | NoInitiativeTieDecision => InsertWithInitiativeDecide(tie)
        | HasInitiativeTieDecision(decisionRec) =>
            if (sameTieCreatures(tie, decisionRec.tie) and decisionRec.index >= 0 and decisionRec.index <= tie.length())
              InsertWithInitiativeOk(insertAtOrderIndex(stack, equalIndex + decisionRec.index, entry))
            else
              InsertWithInitiativeDecide(tie)
      }
    }
  }

  action init = all {
    qRound' = 1,
    qAlreadyActed' = List(),
    qStillToAct' = [
      { creature: "c4", initiative: 4 },
      { creature: "c2", initiative: 2 },
      { creature: "c2b", initiative: 2 },
      { creature: "c1", initiative: 1 },
    ],
    qLastInsertStatus' = "none",
    qLastTie' = List(),
  }

  action doNext = all {
    qStillToAct.length() > 0,
    qRound' = nextInitiative({ round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct }).stack.round,
    qAlreadyActed' = nextInitiative({ round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct }).stack.alreadyActed,
    qStillToAct' = nextInitiative({ round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct }).stack.stillToAct,
    qLastInsertStatus' = qLastInsertStatus,
    qLastTie' = qLastTie,
  }

  action doRemoveC1 = all {
    normalizeAfterRemove(removeFromInitiative({ round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct }, "c1")).stillToAct.length() > 0,
    qRound' = normalizeAfterRemove(removeFromInitiative({ round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct }, "c1")).round,
    qAlreadyActed' = normalizeAfterRemove(removeFromInitiative({ round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct }, "c1")).alreadyActed,
    qStillToAct' = normalizeAfterRemove(removeFromInitiative({ round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct }, "c1")).stillToAct,
    qLastInsertStatus' = qLastInsertStatus,
    qLastTie' = qLastTie,
  }

  action doRemoveC2 = all {
    normalizeAfterRemove(removeFromInitiative({ round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct }, "c2")).stillToAct.length() > 0,
    qRound' = normalizeAfterRemove(removeFromInitiative({ round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct }, "c2")).round,
    qAlreadyActed' = normalizeAfterRemove(removeFromInitiative({ round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct }, "c2")).alreadyActed,
    qStillToAct' = normalizeAfterRemove(removeFromInitiative({ round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct }, "c2")).stillToAct,
    qLastInsertStatus' = qLastInsertStatus,
    qLastTie' = qLastTie,
  }

  action doInsertC3NoDecision = match insertWithInitiative(
    { round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct },
    "c3",
    3,
    NoInitiativeTieDecision,
  ) {
      | InsertWithInitiativeOk(stack) =>
          all {
            qRound' = stack.round,
            qAlreadyActed' = stack.alreadyActed,
            qStillToAct' = stack.stillToAct,
            qLastInsertStatus' = "ok",
            qLastTie' = List(),
          }
      | InsertWithInitiativeDecide(tie) =>
          all {
            qRound' = qRound,
            qAlreadyActed' = qAlreadyActed,
            qStillToAct' = qStillToAct,
            qLastInsertStatus' = "decide",
            qLastTie' = tie,
          }
      | InsertWithInitiativeErrorDecisionSuppliedWithoutTie =>
          all {
            qRound' = qRound,
            qAlreadyActed' = qAlreadyActed,
            qStillToAct' = qStillToAct,
            qLastInsertStatus' = "error",
            qLastTie' = List(),
          }
  }

  action doInsertCxTieNoDecision = match insertWithInitiative(
    { round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct },
    "cx",
    2,
    NoInitiativeTieDecision,
  ) {
      | InsertWithInitiativeOk(stack) =>
          all {
            qRound' = stack.round,
            qAlreadyActed' = stack.alreadyActed,
            qStillToAct' = stack.stillToAct,
            qLastInsertStatus' = "ok",
            qLastTie' = List(),
          }
      | InsertWithInitiativeDecide(tie) =>
          all {
            qRound' = qRound,
            qAlreadyActed' = qAlreadyActed,
            qStillToAct' = qStillToAct,
            qLastInsertStatus' = "decide",
            qLastTie' = tie,
          }
      | InsertWithInitiativeErrorDecisionSuppliedWithoutTie =>
          all {
            qRound' = qRound,
            qAlreadyActed' = qAlreadyActed,
            qStillToAct' = qStillToAct,
            qLastInsertStatus' = "error",
            qLastTie' = List(),
          }
  }

  action doInsertCxTieDecision = match insertWithInitiative(
    { round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct },
    "cx",
    2,
    HasInitiativeTieDecision({ tie: ["c2", "c2b"], index: 1 }),
  ) {
      | InsertWithInitiativeOk(stack) =>
          all {
            qRound' = stack.round,
            qAlreadyActed' = stack.alreadyActed,
            qStillToAct' = stack.stillToAct,
            qLastInsertStatus' = "ok",
            qLastTie' = List(),
          }
      | InsertWithInitiativeDecide(tie) =>
          all {
            qRound' = qRound,
            qAlreadyActed' = qAlreadyActed,
            qStillToAct' = qStillToAct,
            qLastInsertStatus' = "decide",
            qLastTie' = tie,
          }
      | InsertWithInitiativeErrorDecisionSuppliedWithoutTie =>
          all {
            qRound' = qRound,
            qAlreadyActed' = qAlreadyActed,
            qStillToAct' = qStillToAct,
            qLastInsertStatus' = "error",
            qLastTie' = List(),
          }
  }

  action doInsertC3WrongDecision = match insertWithInitiative(
    { round: qRound, alreadyActed: qAlreadyActed, stillToAct: qStillToAct },
    "c3",
    3,
    HasInitiativeTieDecision({ tie: ["c1"], index: 0 }),
  ) {
      | InsertWithInitiativeOk(stack) =>
          all {
            qRound' = stack.round,
            qAlreadyActed' = stack.alreadyActed,
            qStillToAct' = stack.stillToAct,
            qLastInsertStatus' = "ok",
            qLastTie' = List(),
          }
      | InsertWithInitiativeDecide(tie) =>
          all {
            qRound' = qRound,
            qAlreadyActed' = qAlreadyActed,
            qStillToAct' = qStillToAct,
            qLastInsertStatus' = "decide",
            qLastTie' = tie,
          }
      | InsertWithInitiativeErrorDecisionSuppliedWithoutTie =>
          all {
            qRound' = qRound,
            qAlreadyActed' = qAlreadyActed,
            qStillToAct' = qStillToAct,
            qLastInsertStatus' = "error",
            qLastTie' = List(),
          }
  }

  action step = any {
    doNext,
    doRemoveC1,
    doRemoveC2,
    doInsertC3NoDecision,
    doInsertCxTieNoDecision,
    doInsertCxTieDecision,
    doInsertC3WrongDecision,
  }
}
