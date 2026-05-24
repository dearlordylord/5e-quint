// -*- mode: Bluespec; -*-

module battleRuntimeDispelMagicSelectedIdentityMbt {
  var qMagicActionAvailable: bool
  var qThirdLevelSlotCommitted: bool
  var qSpellLightEmitterCount: int
  var qSelectedActiveEffectPresent: bool
  var qRetainedActiveEffectPresent: bool
  var qLastResult: str

  action recordDispelMagicState(
    magicActionAvailable: bool,
    thirdLevelSlotCommitted: bool,
    spellLightEmitterCount: int,
    selectedActiveEffectPresent: bool,
    retainedActiveEffectPresent: bool,
    lastResult: str,
  ): bool = all {
    qMagicActionAvailable' = magicActionAvailable,
    qThirdLevelSlotCommitted' = thirdLevelSlotCommitted,
    qSpellLightEmitterCount' = spellLightEmitterCount,
    qSelectedActiveEffectPresent' = selectedActiveEffectPresent,
    qRetainedActiveEffectPresent' = retainedActiveEffectPresent,
    qLastResult' = lastResult,
  }

  action init = all {
    recordDispelMagicState(
      true,
      false,
      1,
      true,
      true,
      "init",
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
      "objectSpellLightEnded",
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
      "selectedMagicalEffectEnded",
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
      "outOfRangeObjectRejected",
    ),
  }

  action step = any {
    doEndObjectAttachedSpellLight,
    doEndSelectedMagicalEffectActiveEffect,
    doRejectOutOfRangeObjectTarget,
  }
}
