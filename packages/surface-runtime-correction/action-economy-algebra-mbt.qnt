// -*- mode: Bluespec; -*-

module actionEconomyAlgebraMbt {
  var qActions: int
  var qHasBonusAction: bool
  var qHasFreeAction: bool

  action init = all {
    qActions' = 1,
    qHasBonusAction' = true,
    qHasFreeAction' = true,
  }

  action doSpendAction = all {
    qActions > 0,
    qActions' = qActions - 1,
    qHasBonusAction' = qHasBonusAction,
    qHasFreeAction' = qHasFreeAction,
  }

  action doSpendBonusAction = all {
    qHasBonusAction,
    qActions' = qActions,
    qHasBonusAction' = false,
    qHasFreeAction' = qHasFreeAction,
  }

  action doSpendFreeAction = all {
    qHasFreeAction,
    qActions' = qActions,
    qHasBonusAction' = qHasBonusAction,
    qHasFreeAction' = false,
  }

  action doResetTurn = all {
    qActions' = 1,
    qHasBonusAction' = true,
    qHasFreeAction' = true,
  }

  action step = any {
    doSpendAction,
    doSpendBonusAction,
    doSpendFreeAction,
    doResetTurn,
  }

  val invariant =
    qActions >= 0 and qActions <= 2
}
