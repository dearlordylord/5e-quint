// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.EQUIPMENT.STARTING_CURRENCY_FINALIZATION

// RAW anchors:
// - Equipment.md, Coins: one Copper Piece is one hundredth of a Gold Piece.
// - Character-Creation.md#Choose Starting Equipment: starting coins can be
//   spent immediately, and the remaining coins are recorded on the Character
//   Sheet.
//
// This semantic core accepts whole-GP starting grants and purchase costs that
// are already expressed as nonnegative CP. Runtime owns decimal GP-to-CP
// conversion and safe-integer/range validation at the authored catalog
// boundary; those concerns are intentionally outside this integer model.
module startingCurrencyFinalization {
  type StartingCurrencyFinalization =
    | UnsupportedCurrencyFacts
    | PurchasesExceedStartingCurrency
    | StartingCurrencyReady({ remainingCp: int })

  pure def wholeGoldPiecesInCopperPieces(goldPieces: int): int = goldPieces * 100

  pure def startingCurrencyAfterPurchases(
    classGrantGp: int,
    backgroundGrantGp: int,
    purchaseCostsCp: List[int],
  ): StartingCurrencyFinalization = {
    val availableCp = wholeGoldPiecesInCopperPieces(classGrantGp + backgroundGrantGp)
    val purchaseCostCp = purchaseCostsCp.foldl(0, (total, cost) => total + cost)
    val legalFacts = all {
      classGrantGp >= 0,
      backgroundGrantGp >= 0,
      purchaseCostsCp.foldl(true, (legal, cost) => legal and cost >= 0),
    }
    if (not(legalFacts)) {
      UnsupportedCurrencyFacts
    } else if (purchaseCostCp > availableCp) {
      PurchasesExceedStartingCurrency
    } else {
      StartingCurrencyReady({ remainingCp: availableCp - purchaseCostCp })
    }
  }
}
