// -*- mode: Bluespec; -*-

module actionEconomyAlgebraMbt {
  var qTurnActionAvailable: bool
  // 0 none, 1 A, 2 B, 3 A then B, 4 B then A.
  var qRestrictedUnitActionOrder: int
  var qHasBonusAction: bool
  var qActionTakenThisTurn: bool

  action init = all {
    qTurnActionAvailable' = true,
    qRestrictedUnitActionOrder' = 0,
    qHasBonusAction' = true,
    qActionTakenThisTurn' = false,
  }

  action doSpendAttackAction = all {
    qTurnActionAvailable or qRestrictedUnitActionOrder != 0,
    qTurnActionAvailable' =
      if (qRestrictedUnitActionOrder != 0) qTurnActionAvailable else false,
    qRestrictedUnitActionOrder' =
      if (qRestrictedUnitActionOrder == 3) 2
      else if (qRestrictedUnitActionOrder == 4) 1
      else 0,
    qHasBonusAction' = qHasBonusAction,
    qActionTakenThisTurn' = true,
  }

  action doSpendMagicAction = all {
    qTurnActionAvailable,
    qTurnActionAvailable' = false,
    qRestrictedUnitActionOrder' = qRestrictedUnitActionOrder,
    qHasBonusAction' = qHasBonusAction,
    qActionTakenThisTurn' = true,
  }

  action doGrantRestrictedUnitActionA = all {
    qRestrictedUnitActionOrder == 0 or qRestrictedUnitActionOrder == 2,
    qTurnActionAvailable' = qTurnActionAvailable,
    qRestrictedUnitActionOrder' =
      if (qRestrictedUnitActionOrder == 2) 4 else 1,
    qHasBonusAction' = qHasBonusAction,
    qActionTakenThisTurn' = qActionTakenThisTurn,
  }

  action doGrantRestrictedUnitActionB = all {
    qRestrictedUnitActionOrder == 0 or qRestrictedUnitActionOrder == 1,
    qTurnActionAvailable' = qTurnActionAvailable,
    qRestrictedUnitActionOrder' =
      if (qRestrictedUnitActionOrder == 1) 3 else 2,
    qHasBonusAction' = qHasBonusAction,
    qActionTakenThisTurn' = qActionTakenThisTurn,
  }

  action doSpendBonusAction = all {
    qHasBonusAction,
    qTurnActionAvailable' = qTurnActionAvailable,
    qRestrictedUnitActionOrder' = qRestrictedUnitActionOrder,
    qHasBonusAction' = false,
    qActionTakenThisTurn' = qActionTakenThisTurn,
  }

  action doSpendFreeAction = all {
    qTurnActionAvailable' = qTurnActionAvailable,
    qRestrictedUnitActionOrder' = qRestrictedUnitActionOrder,
    qHasBonusAction' = qHasBonusAction,
    qActionTakenThisTurn' = qActionTakenThisTurn,
  }

  action doResetTurn = all {
    qTurnActionAvailable' = true,
    qRestrictedUnitActionOrder' = 0,
    qHasBonusAction' = true,
    qActionTakenThisTurn' = false,
  }

  action step = any {
    doSpendAttackAction,
    doSpendMagicAction,
    doGrantRestrictedUnitActionA,
    doGrantRestrictedUnitActionB,
    doSpendBonusAction,
    doSpendFreeAction,
    doResetTurn,
  }

  pure def qUnitActionCount(order: int): int =
    if (order == 0) 0
    else if (order == 1 or order == 2) 1
    else 2

  pure def qHasRestrictedUnitActionA(order: int): bool =
    order == 1 or order == 3 or order == 4

  pure def qHasRestrictedUnitActionB(order: int): bool =
    order == 2 or order == 3 or order == 4

  pure def qBoolCount(value: bool): int =
    if (value) 1 else 0

  val invariant = all {
    qTurnActionAvailable.in(Set(true, false)),
    qRestrictedUnitActionOrder.in(0.to(4)),
    qHasBonusAction.in(Set(true, false)),
    qActionTakenThisTurn.in(Set(true, false)),
    qUnitActionCount(qRestrictedUnitActionOrder) >= 0,
    qUnitActionCount(qRestrictedUnitActionOrder) <= 2,
    qUnitActionCount(qRestrictedUnitActionOrder) ==
      qBoolCount(qHasRestrictedUnitActionA(qRestrictedUnitActionOrder))
        + qBoolCount(qHasRestrictedUnitActionB(qRestrictedUnitActionOrder)),
    (qRestrictedUnitActionOrder == 0) == (qUnitActionCount(qRestrictedUnitActionOrder) == 0),
  }
}
