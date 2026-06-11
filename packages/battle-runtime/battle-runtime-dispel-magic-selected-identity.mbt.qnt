// -*- mode: Bluespec; -*-

module battleRuntimeDispelMagicSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | DispelMagicSelectedIdentity

  type DispelMagicSelectedIdentityScenarioOutcome = | Init | ObjectSpellLightEnded | SelectedMagicalEffectEnded | OutOfRangeObjectRejected


  type WitnessState = {
    qMagicActionAvailable: bool,
    qThirdLevelSlotCommitted: bool,
    qSpellLightEmitterCount: int,
    qSelectedActiveEffectPresent: bool,
    qRetainedActiveEffectPresent: bool,
    qScenarioOutcome: DispelMagicSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qMagicActionAvailable: bool = qState.qMagicActionAvailable
  pure def qThirdLevelSlotCommitted: bool = qState.qThirdLevelSlotCommitted
  pure def qSpellLightEmitterCount: int = qState.qSpellLightEmitterCount
  pure def qSelectedActiveEffectPresent: bool = qState.qSelectedActiveEffectPresent
  pure def qRetainedActiveEffectPresent: bool = qState.qRetainedActiveEffectPresent
  pure def qScenarioOutcome: DispelMagicSelectedIdentityScenarioOutcome = qState.qScenarioOutcome


  action recordDispelMagicState(
    magicActionAvailable: bool,
    thirdLevelSlotCommitted: bool,
    spellLightEmitterCount: int,
    selectedActiveEffectPresent: bool,
    retainedActiveEffectPresent: bool,
    scenarioOutcome: DispelMagicSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qMagicActionAvailable: magicActionAvailable,
      qThirdLevelSlotCommitted: thirdLevelSlotCommitted,
      qSpellLightEmitterCount: spellLightEmitterCount,
      qSelectedActiveEffectPresent: selectedActiveEffectPresent,
      qRetainedActiveEffectPresent: retainedActiveEffectPresent,
      qScenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = all {
    recordDispelMagicState(
      true,
      false,
      1,
      true,
      true,
      Init,
    witnessInit(DispelMagicSelectedIdentity),
  ),
  }

  action doEndObjectAttachedSpellLight = all {
    qMagicActionAvailable,
    recordDispelMagicState(
      false,
      true,
      0,
      false,
      false,
      ObjectSpellLightEnded,
    witnessResolved(DispelMagicSelectedIdentity),
  ),
  }

  action doEndSelectedMagicalEffectActiveEffect = all {
    qMagicActionAvailable,
    recordDispelMagicState(
      false,
      true,
      0,
      false,
      true,
      SelectedMagicalEffectEnded,
    witnessResolved(DispelMagicSelectedIdentity),
  ),
  }

  action doRejectOutOfRangeObjectTarget = all {
    qMagicActionAvailable,
    recordDispelMagicState(
      true,
      false,
      1,
      false,
      false,
      OutOfRangeObjectRejected,
    witnessInvalid(DispelMagicSelectedIdentity, WInvalidFill),
  ),
  }

  action step = any {
    doEndObjectAttachedSpellLight,
    doEndSelectedMagicalEffectActiveEffect,
    doRejectOutOfRangeObjectTarget,
  }
}
