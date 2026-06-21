// -*- mode: Bluespec; -*-

module battleRuntimeLevel2ProtectionSpellSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type Level2ProtectionSpellSelectedIdentityScenarioOutcome = | Init | AidHitPointBuff | BarkskinArmorClassFloor | BlurAttackRollDefense | ContinualFlameObjectLight | EnhanceAbilityRollModifier | EnhanceAbilityHigherSlotPerTarget | EnlargeReduceSizeIncrease | MagicWeaponEnhancement | MirrorImageHitInterception | PassWithoutTraceStealthModifier | WardingBondLinkedEffect

  type Level2ProtectionSpellSelectedIdentityWitnessState = {
    qScenarioOutcome: Level2ProtectionSpellSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: Level2ProtectionSpellSelectedIdentityWitnessState

  pure def scenarioOutcome: Level2ProtectionSpellSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def level2ProtectionSpellSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: Level2ProtectionSpellSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(lastResult: Level2ProtectionSpellSelectedIdentityScenarioOutcome): bool = all {
    qState' = {
      qScenarioOutcome: lastResult,
      protocol: level2ProtectionSpellSelectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordProjection(Init)

  action doDiscoverAidHitPointBuff = all {
    scenarioOutcome == Init,
    recordProjection(AidHitPointBuff),
  }

  action doDiscoverBarkskinArmorClassFloor = all {
    scenarioOutcome == Init,
    recordProjection(BarkskinArmorClassFloor),
  }

  action doDiscoverBlurAttackRollDefense = all {
    scenarioOutcome == Init,
    recordProjection(BlurAttackRollDefense),
  }

  action doDiscoverContinualFlameObjectLight = all {
    scenarioOutcome == Init,
    recordProjection(ContinualFlameObjectLight),
  }

  action doDiscoverEnhanceAbilityRollModifier = all {
    scenarioOutcome == Init,
    recordProjection(EnhanceAbilityRollModifier),
  }

  action doResolveEnhanceAbilityHigherSlotPerTarget = all {
    scenarioOutcome == Init,
    recordProjection(EnhanceAbilityHigherSlotPerTarget),
  }

  action doDiscoverEnlargeReduceSizeIncrease = all {
    scenarioOutcome == Init,
    recordProjection(EnlargeReduceSizeIncrease),
  }

  action doDiscoverMagicWeaponEnhancement = all {
    scenarioOutcome == Init,
    recordProjection(MagicWeaponEnhancement),
  }

  action doDiscoverMirrorImageHitInterception = all {
    scenarioOutcome == Init,
    recordProjection(MirrorImageHitInterception),
  }

  action doDiscoverPassWithoutTraceStealthModifier = all {
    scenarioOutcome == Init,
    recordProjection(PassWithoutTraceStealthModifier),
  }

  action doDiscoverWardingBondLinkedEffect = all {
    scenarioOutcome == Init,
    recordProjection(WardingBondLinkedEffect),
  }

  action step = any {
    doDiscoverAidHitPointBuff,
    doDiscoverBarkskinArmorClassFloor,
    doDiscoverBlurAttackRollDefense,
    doDiscoverContinualFlameObjectLight,
    doDiscoverEnhanceAbilityRollModifier,
    doResolveEnhanceAbilityHigherSlotPerTarget,
    doDiscoverEnlargeReduceSizeIncrease,
    doDiscoverMagicWeaponEnhancement,
    doDiscoverMirrorImageHitInterception,
    doDiscoverPassWithoutTraceStealthModifier,
    doDiscoverWardingBondLinkedEffect,
  }
}
