// -*- mode: Bluespec; -*-

module battleRuntimeLevel1DamageSpellSelectedIdentityMbt {
  var qActionAvailable: bool
  var qSpellSlotSpentThisTurn: bool
  var qLevel1SlotsRemaining: int
  var qPrimaryTargetHp: int
  var qPrimaryTargetPoisoned: bool
  var qSecondaryTargetHp: int
  var qLastResult: str

  action recordProjection(
    actionAvailable: bool,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    primaryTargetHp: int,
    primaryTargetPoisoned: bool,
    secondaryTargetHp: int,
    lastResult: str,
  ): bool = all {
    qActionAvailable' = actionAvailable,
    qSpellSlotSpentThisTurn' = spellSlotSpentThisTurn,
    qLevel1SlotsRemaining' = level1SlotsRemaining,
    qPrimaryTargetHp' = primaryTargetHp,
    qPrimaryTargetPoisoned' = primaryTargetPoisoned,
    qSecondaryTargetHp' = secondaryTargetHp,
    qLastResult' = lastResult,
  }

  action init = recordProjection(true, false, 1, 12, false, 12, "init")

  action doResolveBurningHandsMixedConeSavingThrows = all {
    qLastResult == "init",
    recordProjection(
      false,
      true,
      0,
      6,
      false,
      9,
      "burningHandsMixedConeSavingThrows",
    ),
  }

  action doResolveIceKnifeHitAttackDamageAndBurstSavingThrows = all {
    qLastResult == "init",
    recordProjection(
      false,
      true,
      0,
      4,
      false,
      12,
      "iceKnifeHitAttackDamageAndBurstSavingThrows",
    ),
  }

  action doResolveIceKnifeMissBurstSavingThrows = all {
    qLastResult == "init",
    recordProjection(
      false,
      true,
      0,
      8,
      false,
      12,
      "iceKnifeMissBurstSavingThrows",
    ),
  }

  action doResolvePoisonSpraySpellAttackDamage = all {
    qLastResult == "init",
    recordProjection(
      false,
      false,
      1,
      5,
      false,
      12,
      "poisonSpraySpellAttackDamage",
    ),
  }

  action doResolveRayOfSicknessSpellAttackDamageAndPoisoned = all {
    qLastResult == "init",
    recordProjection(
      false,
      true,
      0,
      5,
      true,
      12,
      "rayOfSicknessSpellAttackDamageAndPoisoned",
    ),
  }

  action doResolveSacredFlameDexteritySavingThrowRadiantDamage = all {
    qLastResult == "init",
    recordProjection(
      false,
      false,
      1,
      5,
      false,
      12,
      "sacredFlameDexteritySavingThrowRadiantDamage",
    ),
  }

  action step = any {
    doResolveBurningHandsMixedConeSavingThrows,
    doResolveIceKnifeHitAttackDamageAndBurstSavingThrows,
    doResolveIceKnifeMissBurstSavingThrows,
    doResolvePoisonSpraySpellAttackDamage,
    doResolveRayOfSicknessSpellAttackDamageAndPoisoned,
    doResolveSacredFlameDexteritySavingThrowRadiantDamage,
  }
}
