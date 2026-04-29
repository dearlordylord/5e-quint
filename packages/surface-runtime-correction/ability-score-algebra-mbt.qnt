// -*- mode: Bluespec; -*-

module abilityScoreAlgebraMbt {
  var qMethod: str
  var qStr: int
  var qDex: int
  var qCon: int
  var qInt: int
  var qWis: int
  var qCha: int
  var qValid: bool

  pure val standardArrayScoreSet: Set[int] = Set(15, 14, 13, 12, 10, 8)

  pure def qAbilityScoreSet(
    strScore: int,
    dexScore: int,
    conScore: int,
    intScore: int,
    wisScore: int,
    chaScore: int,
  ): Set[int] =
    Set(strScore, dexScore, conScore, intScore, wisScore, chaScore)

  pure def qIsStandardArrayAssignment(
    strScore: int,
    dexScore: int,
    conScore: int,
    intScore: int,
    wisScore: int,
    chaScore: int,
  ): bool =
    qAbilityScoreSet(strScore, dexScore, conScore, intScore, wisScore, chaScore) == standardArrayScoreSet

  pure def qPointBuyCost(score: int): int =
    if (score == 8) 0
    else if (score == 9) 1
    else if (score == 10) 2
    else if (score == 11) 3
    else if (score == 12) 4
    else if (score == 13) 5
    else if (score == 14) 7
    else if (score == 15) 9
    else 0

  pure def qInPointBuyRange(score: int): bool =
    score >= 8 and score <= 15

  pure def qIsPointBuyAssignment(
    strScore: int,
    dexScore: int,
    conScore: int,
    intScore: int,
    wisScore: int,
    chaScore: int,
  ): bool =
    qInPointBuyRange(strScore)
      and qInPointBuyRange(dexScore)
      and qInPointBuyRange(conScore)
      and qInPointBuyRange(intScore)
      and qInPointBuyRange(wisScore)
      and qInPointBuyRange(chaScore)
      and qPointBuyCost(strScore)
        + qPointBuyCost(dexScore)
        + qPointBuyCost(conScore)
        + qPointBuyCost(intScore)
        + qPointBuyCost(wisScore)
        + qPointBuyCost(chaScore) <= 27

  pure def qIsValidAbilityScoreAssignment(
    method: str,
    strScore: int,
    dexScore: int,
    conScore: int,
    intScore: int,
    wisScore: int,
    chaScore: int,
  ): bool =
    if (method == "standardArray") {
      qIsStandardArrayAssignment(strScore, dexScore, conScore, intScore, wisScore, chaScore)
    } else if (method == "pointBuy") {
      qIsPointBuyAssignment(strScore, dexScore, conScore, intScore, wisScore, chaScore)
    } else {
      false
    }

  action init = all {
    qMethod' = "standardArray",
    qStr' = 15,
    qDex' = 14,
    qCon' = 13,
    qInt' = 12,
    qWis' = 10,
    qCha' = 8,
    qValid' = qIsValidAbilityScoreAssignment("standardArray", 15, 14, 13, 12, 10, 8),
  }

  action setStandardArrayValid = all {
    qMethod' = "standardArray",
    qStr' = 14,
    qDex' = 15,
    qCon' = 13,
    qInt' = 8,
    qWis' = 10,
    qCha' = 12,
    qValid' = qIsValidAbilityScoreAssignment("standardArray", 14, 15, 13, 8, 10, 12),
  }

  action setStandardArrayInvalid = all {
    qMethod' = "standardArray",
    qStr' = 15,
    qDex' = 15,
    qCon' = 13,
    qInt' = 8,
    qWis' = 10,
    qCha' = 12,
    qValid' = qIsValidAbilityScoreAssignment("standardArray", 15, 15, 13, 8, 10, 12),
  }

  action setPointBuyValid = all {
    qMethod' = "pointBuy",
    qStr' = 13,
    qDex' = 13,
    qCon' = 13,
    qInt' = 12,
    qWis' = 12,
    qCha' = 12,
    qValid' = qIsValidAbilityScoreAssignment("pointBuy", 13, 13, 13, 12, 12, 12),
  }

  action setPointBuyBudgetInvalid = all {
    qMethod' = "pointBuy",
    qStr' = 15,
    qDex' = 15,
    qCon' = 15,
    qInt' = 15,
    qWis' = 8,
    qCha' = 8,
    qValid' = qIsValidAbilityScoreAssignment("pointBuy", 15, 15, 15, 15, 8, 8),
  }

  action setPointBuyRangeInvalid = all {
    qMethod' = "pointBuy",
    qStr' = 16,
    qDex' = 14,
    qCon' = 13,
    qInt' = 12,
    qWis' = 10,
    qCha' = 8,
    qValid' = qIsValidAbilityScoreAssignment("pointBuy", 16, 14, 13, 12, 10, 8),
  }

  action setPointBuyStandardArrayValid = all {
    qMethod' = "pointBuy",
    qStr' = 15,
    qDex' = 14,
    qCon' = 13,
    qInt' = 12,
    qWis' = 10,
    qCha' = 8,
    qValid' = qIsValidAbilityScoreAssignment("pointBuy", 15, 14, 13, 12, 10, 8),
  }

  action step = any {
    setStandardArrayValid,
    setStandardArrayInvalid,
    setPointBuyValid,
    setPointBuyBudgetInvalid,
    setPointBuyRangeInvalid,
    setPointBuyStandardArrayValid,
  }
}
