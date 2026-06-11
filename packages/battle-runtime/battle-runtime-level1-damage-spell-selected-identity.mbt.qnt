// -*- mode: Bluespec; -*-

module battleRuntimeLevel1DamageSpellSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type Level1DamageSpellSelectedIdentityWitnessState = {
    qActionAvailable: bool,
    qSpellSlotSpentThisTurn: bool,
    qLevel1SlotsRemaining: int,
    qPrimaryTargetHp: int,
    qPrimaryTargetPoisoned: bool,
    qPrimaryTargetNextAttackRollDisadvantage: bool,
    qSecondaryTargetHp: int,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: Level1DamageSpellSelectedIdentityWitnessState

  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qSpellSlotSpentThisTurn: bool = qState.qSpellSlotSpentThisTurn
  pure def qLevel1SlotsRemaining: int = qState.qLevel1SlotsRemaining
  pure def qPrimaryTargetHp: int = qState.qPrimaryTargetHp
  pure def qPrimaryTargetPoisoned: bool = qState.qPrimaryTargetPoisoned
  pure def qPrimaryTargetNextAttackRollDisadvantage: bool = qState.qPrimaryTargetNextAttackRollDisadvantage
  pure def qSecondaryTargetHp: int = qState.qSecondaryTargetHp
  pure def qLastResult: str = qState.qScenarioResult

  pure def level1DamageSpellSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


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
    qState' = {
      qActionAvailable: actionAvailable,
      qSpellSlotSpentThisTurn: spellSlotSpentThisTurn,
      qLevel1SlotsRemaining: level1SlotsRemaining,
      qPrimaryTargetHp: primaryTargetHp,
      qPrimaryTargetPoisoned: primaryTargetPoisoned,
      qPrimaryTargetNextAttackRollDisadvantage: primaryTargetNextAttackRollDisadvantage,
      qSecondaryTargetHp: secondaryTargetHp,
      qScenarioResult: lastResult,
      protocol: level1DamageSpellSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
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

  action doResolveChromaticOrbDuplicateDamageLeap = all {
    qLastResult == "init",
    recordProjection(
      false,
      true,
      0,
      3,
      false,
      false,
      9,
      "chromaticOrbDuplicateDamageLeap",
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
    doResolveChromaticOrbDuplicateDamageLeap,
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
