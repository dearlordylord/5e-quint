// -*- mode: Bluespec; -*-

module actionEconomyAlgebraMbt {
  var qTurnActionAvailable: bool
  // 0 none, 1 A, 2 B, 3 A then B, 4 B then A.
  var qRestrictedUnitActionOrder: int
  var qHasBonusAction: bool

  action init = all {
    qTurnActionAvailable' = true,
    qRestrictedUnitActionOrder' = 0,
    qHasBonusAction' = true,
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
  }

  action doSpendMagicAction = all {
    qTurnActionAvailable,
    qTurnActionAvailable' = false,
    qRestrictedUnitActionOrder' = qRestrictedUnitActionOrder,
    qHasBonusAction' = qHasBonusAction,
  }

  action doGrantRestrictedUnitActionA = all {
    qRestrictedUnitActionOrder == 0 or qRestrictedUnitActionOrder == 2,
    qTurnActionAvailable' = qTurnActionAvailable,
    qRestrictedUnitActionOrder' =
      if (qRestrictedUnitActionOrder == 2) 4 else 1,
    qHasBonusAction' = qHasBonusAction,
  }

  action doGrantRestrictedUnitActionB = all {
    qRestrictedUnitActionOrder == 0 or qRestrictedUnitActionOrder == 1,
    qTurnActionAvailable' = qTurnActionAvailable,
    qRestrictedUnitActionOrder' =
      if (qRestrictedUnitActionOrder == 1) 3 else 2,
    qHasBonusAction' = qHasBonusAction,
  }

  action doSpendBonusAction = all {
    qHasBonusAction,
    qTurnActionAvailable' = qTurnActionAvailable,
    qRestrictedUnitActionOrder' = qRestrictedUnitActionOrder,
    qHasBonusAction' = false,
  }

  action doSpendFreeAction = all {
    qTurnActionAvailable' = qTurnActionAvailable,
    qRestrictedUnitActionOrder' = qRestrictedUnitActionOrder,
    qHasBonusAction' = qHasBonusAction,
  }

  action doResetTurn = all {
    qTurnActionAvailable' = true,
    qRestrictedUnitActionOrder' = 0,
    qHasBonusAction' = true,
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

  val invariant = true
}
