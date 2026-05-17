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

  action doResolveIceKnifeHitAttackDamageAndBurstSavingThrows = all {
    qLastResult == "init",
    recordProjection(
      false,
      true,
      0,
      4,
      12,
      "iceKnifeHitAttackDamageAndBurstSavingThrows",
    ),
  }

  action doResolveIceKnifeMissBurstSavingThrows = all {
    qLastResult == "init",
    recordProjection(false, true, 0, 8, 12, "iceKnifeMissBurstSavingThrows"),
  }

  action doResolvePoisonSpraySpellAttackDamage = all {
    qLastResult == "init",
    recordProjection(false, false, 1, 5, 12, "poisonSpraySpellAttackDamage"),
  }

  action step = any {
    doResolveBurningHandsMixedConeSavingThrows,
    doResolveIceKnifeHitAttackDamageAndBurstSavingThrows,
    doResolveIceKnifeMissBurstSavingThrows,
    doResolvePoisonSpraySpellAttackDamage,
  }
}
