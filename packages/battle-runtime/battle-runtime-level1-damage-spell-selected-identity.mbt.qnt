// -*- mode: Bluespec; -*-

module battleRuntimeLevel1DamageSpellSelectedIdentityMbt {
  var qActionAvailable: bool
  var qSpellSlotSpentThisTurn: bool
  var qLevel1SlotsRemaining: int
  var qPrimaryTargetHp: int
  var qSecondaryTargetHp: int
  var qLastResult: str

  action recordProjection(
    actionAvailable: bool,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    primaryTargetHp: int,
    secondaryTargetHp: int,
    lastResult: str,
  ): bool = all {
    qActionAvailable' = actionAvailable,
    qSpellSlotSpentThisTurn' = spellSlotSpentThisTurn,
    qLevel1SlotsRemaining' = level1SlotsRemaining,
    qPrimaryTargetHp' = primaryTargetHp,
    qSecondaryTargetHp' = secondaryTargetHp,
    qLastResult' = lastResult,
  }

  action init = recordProjection(true, false, 1, 12, 12, "init")

  action doResolveBurningHandsMixedConeSavingThrows = all {
    qLastResult == "init",
    recordProjection(false, true, 0, 6, 9, "burningHandsMixedConeSavingThrows"),
  }

  action step = any {
    doResolveBurningHandsMixedConeSavingThrows,
  }
}
