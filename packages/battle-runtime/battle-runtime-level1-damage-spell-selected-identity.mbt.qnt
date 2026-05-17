// -*- mode: Bluespec; -*-

module battleRuntimeLevel1DamageSpellSelectedIdentityMbt {
  var qActionAvailable: bool
  var qSpellSlotSpentThisTurn: bool
  var qLevel1SlotsRemaining: int
  var qPrimaryTargetHp: int
  var qPrimaryTargetPoisoned: bool
  var qPrimaryTargetNextAttackRollDisadvantage: bool
  var qSecondaryTargetHp: int
  var qLastResult: str

  action recordProjection(
    actionAvailable: bool,
    spellSlotSpentThisTurn: bool,
    level1SlotsRemaining: int,
    primaryTargetHp: int,
    primaryTargetPoisoned: bool,
    primaryTargetNextAttackRollDisadvantage: bool,
    secondaryTargetHp: int,
    lastResult: str,
  ): bool = all {
    qActionAvailable' = actionAvailable,
    qSpellSlotSpentThisTurn' = spellSlotSpentThisTurn,
    qLevel1SlotsRemaining' = level1SlotsRemaining,
    qPrimaryTargetHp' = primaryTargetHp,
    qPrimaryTargetPoisoned' = primaryTargetPoisoned,
    qPrimaryTargetNextAttackRollDisadvantage' = primaryTargetNextAttackRollDisadvantage,
    qSecondaryTargetHp' = secondaryTargetHp,
    qLastResult' = lastResult,
  }

  action init = recordProjection(true, false, 1, 12, false, false, 12, "init")

  action doResolveBurningHandsMixedConeSavingThrows = all {
    qLastResult == "init",
    recordProjection(
      false,
      true,
      0,
      6,
      false,
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
      false,
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
      false,
      12,
      "sacredFlameDexteritySavingThrowRadiantDamage",
    ),
  }

  action doResolveSorcerousBurstSpellAttackDamage = all {
    qLastResult == "init",
    recordProjection(
      false,
      false,
      1,
      2,
      false,
      false,
      12,
      "sorcerousBurstSpellAttackDamage",
    ),
  }

  action doResolveStarryWispObjectSpellAttackDamageAndDimLight = all {
    qLastResult == "init",
    recordProjection(
      false,
      false,
      1,
      12,
      false,
      false,
      12,
      "starryWispObjectSpellAttackDamageAndDimLight",
    ),
  }

  action doResolveViciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage = all {
    qLastResult == "init",
    recordProjection(
      false,
      false,
      1,
      6,
      false,
      true,
      12,
      "viciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage",
    ),
  }

  action step = any {
    doResolveBurningHandsMixedConeSavingThrows,
    doResolveIceKnifeHitAttackDamageAndBurstSavingThrows,
    doResolveIceKnifeMissBurstSavingThrows,
    doResolvePoisonSpraySpellAttackDamage,
    doResolveRayOfSicknessSpellAttackDamageAndPoisoned,
    doResolveSacredFlameDexteritySavingThrowRadiantDamage,
    doResolveSorcerousBurstSpellAttackDamage,
    doResolveStarryWispObjectSpellAttackDamageAndDimLight,
    doResolveViciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage,
  }
}
