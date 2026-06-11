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

  pure def qLastResult: Level2ProtectionSpellSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def level2ProtectionSpellSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: Level2ProtectionSpellSelectedIdentityScenarioOutcome,
    _scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(lastResult: Level2ProtectionSpellSelectedIdentityScenarioOutcome): bool = all {
    qState' = {
      qScenarioOutcome: lastResult,
      protocol: level2ProtectionSpellSelectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordProjection(Init)

  action doDiscoverAidHitPointBuff = all {
    qLastResult == Init,
    recordProjection(AidHitPointBuff),
  }

  action doDiscoverBarkskinArmorClassFloor = all {
    qLastResult == Init,
    recordProjection(BarkskinArmorClassFloor),
  }

  action doDiscoverBlurAttackRollDefense = all {
    qLastResult == Init,
    recordProjection(BlurAttackRollDefense),
  }

  action doDiscoverContinualFlameObjectLight = all {
    qLastResult == Init,
    recordProjection(ContinualFlameObjectLight),
  }

  action doDiscoverEnhanceAbilityRollModifier = all {
    qLastResult == Init,
    recordProjection(EnhanceAbilityRollModifier),
  }

  action doResolveEnhanceAbilityHigherSlotPerTarget = all {
    qLastResult == Init,
    recordProjection(EnhanceAbilityHigherSlotPerTarget),
  }

  action doDiscoverEnlargeReduceSizeIncrease = all {
    qLastResult == Init,
    recordProjection(EnlargeReduceSizeIncrease),
  }

  action doDiscoverMagicWeaponEnhancement = all {
    qLastResult == Init,
    recordProjection(MagicWeaponEnhancement),
  }

  action doDiscoverMirrorImageHitInterception = all {
    qLastResult == Init,
    recordProjection(MirrorImageHitInterception),
  }

  action doDiscoverPassWithoutTraceStealthModifier = all {
    qLastResult == Init,
    recordProjection(PassWithoutTraceStealthModifier),
  }

  action doDiscoverWardingBondLinkedEffect = all {
    qLastResult == Init,
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
