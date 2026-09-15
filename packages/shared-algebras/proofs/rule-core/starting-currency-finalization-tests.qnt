// -*- mode: Bluespec; -*-
module startingCurrencyFinalizationTests {
  import startingCurrencyFinalization.* from "./starting-currency-finalization"

  run classAndBackgroundGrantsAreSummedInCopperPiecesTest =
    match startingCurrencyAfterPurchases(5, 14, []) {
      | StartingCurrencyReady(result) => assert(result.remainingCp == 1900)
      | UnsupportedCurrencyFacts => assert(false)
      | PurchasesExceedStartingCurrency => assert(false)
    }

  run catalogPurchaseCostsAreAlreadyCopperPiecesTest =
    match startingCurrencyAfterPurchases(105, 0, [20]) {
      | StartingCurrencyReady(result) => assert(result.remainingCp == 10480)
      | UnsupportedCurrencyFacts => assert(false)
      | PurchasesExceedStartingCurrency => assert(false)
    }

  run projectedCopperPieceBalanceUsesCanonicalAffordabilityTest =
    match startingCurrencyAfterAvailableCopperPieces(5400, [20]) {
      | StartingCurrencyReady(result) => assert(result.remainingCp == 5380)
      | UnsupportedCurrencyFacts => assert(false)
      | PurchasesExceedStartingCurrency => assert(false)
    }

  run projectedCopperPieceBalanceRejectsOverBudgetPurchasesTest =
    match startingCurrencyAfterAvailableCopperPieces(5400, [10000]) {
      | StartingCurrencyReady(_) => assert(false)
      | UnsupportedCurrencyFacts => assert(false)
      | PurchasesExceedStartingCurrency => assert(true)
    }

  run anExactPurchaseCanLeaveZeroCurrencyTest =
    match startingCurrencyAfterPurchases(5, 0, [200, 300]) {
      | StartingCurrencyReady(result) => assert(result.remainingCp == 0)
      | UnsupportedCurrencyFacts => assert(false)
      | PurchasesExceedStartingCurrency => assert(false)
    }

  run purchasesOverStartingCurrencyAreRejectedTest =
    match startingCurrencyAfterPurchases(105, 0, [150000]) {
      | StartingCurrencyReady(_) => assert(false)
      | UnsupportedCurrencyFacts => assert(false)
      | PurchasesExceedStartingCurrency => assert(true)
    }

  run negativeCurrencyFactsAreUnsupportedTest = all {
    assert(startingCurrencyAfterPurchases(-1, 0, []) == UnsupportedCurrencyFacts),
    assert(startingCurrencyAfterPurchases(1, 0, [-1]) == UnsupportedCurrencyFacts),
  }
}
