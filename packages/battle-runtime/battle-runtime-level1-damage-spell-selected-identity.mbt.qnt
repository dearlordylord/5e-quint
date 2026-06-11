// -*- mode: Bluespec; -*-

module battleRuntimeLevel1DamageSpellSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type Level1DamageSpellSelectedIdentityScenarioOutcome = | Init | BurningHandsMixedConeSavingThrows | ChromaticOrbDuplicateDamageLeap | IceKnifeHitAttackDamageAndBurstSavingThrows | IceKnifeMissBurstSavingThrows | PoisonSpraySpellAttackDamage | RayOfSicknessSpellAttackDamageAndPoisoned | SacredFlameDexteritySavingThrowRadiantDamage | SorcerousBurstSpellAttackDamage | StarryWispObjectSpellAttackDamageAndDimLight | ViciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage

  type Level1DamageSpellSelectedIdentityWitnessState = {
    qActionAvailable: bool,
    qSpellSlotSpentThisTurn: bool,
    qLevel1SlotsRemaining: int,
    qPrimaryTargetHp: int,
    qPrimaryTargetPoisoned: bool,
    qPrimaryTargetNextAttackRollDisadvantage: bool,
    qSecondaryTargetHp: int,
    qScenarioOutcome: Level1DamageSpellSelectedIdentityScenarioOutcome,
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
  pure def qLastResult: Level1DamageSpellSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def level1DamageSpellSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: Level1DamageSpellSelectedIdentityScenarioOutcome,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
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
    lastResult: Level1DamageSpellSelectedIdentityScenarioOutcome,
  ): bool = all {
    qState' = {
      qActionAvailable: actionAvailable,
      qSpellSlotSpentThisTurn: spellSlotSpentThisTurn,
      qLevel1SlotsRemaining: level1SlotsRemaining,
      qPrimaryTargetHp: primaryTargetHp,
      qPrimaryTargetPoisoned: primaryTargetPoisoned,
      qPrimaryTargetNextAttackRollDisadvantage: primaryTargetNextAttackRollDisadvantage,
      qSecondaryTargetHp: secondaryTargetHp,
      qScenarioOutcome: lastResult,
      protocol: level1DamageSpellSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordProjection(true, false, 1, 12, false, false, 12, Init)

  action doResolveBurningHandsMixedConeSavingThrows = all {
    qLastResult == Init,
    recordProjection(
      false,
      true,
      0,
      6,
      false,
      false,
      9,
      BurningHandsMixedConeSavingThrows,
    ),
  }

  action doResolveChromaticOrbDuplicateDamageLeap = all {
    qLastResult == Init,
    recordProjection(
      false,
      true,
      0,
      3,
      false,
      false,
      9,
      ChromaticOrbDuplicateDamageLeap,
    ),
  }

  action doResolveIceKnifeHitAttackDamageAndBurstSavingThrows = all {
    qLastResult == Init,
    recordProjection(
      false,
      true,
      0,
      4,
      false,
      false,
      12,
      IceKnifeHitAttackDamageAndBurstSavingThrows,
    ),
  }

  action doResolveIceKnifeMissBurstSavingThrows = all {
    qLastResult == Init,
    recordProjection(
      false,
      true,
      0,
      8,
      false,
      false,
      12,
      IceKnifeMissBurstSavingThrows,
    ),
  }

  action doResolvePoisonSpraySpellAttackDamage = all {
    qLastResult == Init,
    recordProjection(
      false,
      false,
      1,
      5,
      false,
      false,
      12,
      PoisonSpraySpellAttackDamage,
    ),
  }

  action doResolveRayOfSicknessSpellAttackDamageAndPoisoned = all {
    qLastResult == Init,
    recordProjection(
      false,
      true,
      0,
      5,
      true,
      false,
      12,
      RayOfSicknessSpellAttackDamageAndPoisoned,
    ),
  }

  action doResolveSacredFlameDexteritySavingThrowRadiantDamage = all {
    qLastResult == Init,
    recordProjection(
      false,
      false,
      1,
      5,
      false,
      false,
      12,
      SacredFlameDexteritySavingThrowRadiantDamage,
    ),
  }

  action doResolveSorcerousBurstSpellAttackDamage = all {
    qLastResult == Init,
    recordProjection(
      false,
      false,
      1,
      2,
      false,
      false,
      12,
      SorcerousBurstSpellAttackDamage,
    ),
  }

  action doResolveStarryWispObjectSpellAttackDamageAndDimLight = all {
    qLastResult == Init,
    recordProjection(
      false,
      false,
      1,
      12,
      false,
      false,
      12,
      StarryWispObjectSpellAttackDamageAndDimLight,
    ),
  }

  action doResolveViciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage = all {
    qLastResult == Init,
    recordProjection(
      false,
      false,
      1,
      6,
      false,
      true,
      12,
      ViciousMockeryWisdomSavingThrowPsychicDamageAndNextAttackDisadvantage,
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
