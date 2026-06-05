// -*- mode: Bluespec; -*-

module battleRuntimeLevel2ProtectionSpellSelectedIdentityMbt {
  var qLastResult: str

  action recordProjection(lastResult: str): bool = all {
    qLastResult' = lastResult,
  }

  action init = recordProjection("init")

  action doDiscoverAidHitPointBuff = all {
    qLastResult == "init",
    recordProjection("aidHitPointBuff"),
  }

  action doDiscoverBarkskinArmorClassFloor = all {
    qLastResult == "init",
    recordProjection("barkskinArmorClassFloor"),
  }

  action doDiscoverBlurAttackRollDefense = all {
    qLastResult == "init",
    recordProjection("blurAttackRollDefense"),
  }

  action doDiscoverContinualFlameObjectLight = all {
    qLastResult == "init",
    recordProjection("continualFlameObjectLight"),
  }

  action doDiscoverEnhanceAbilityRollModifier = all {
    qLastResult == "init",
    recordProjection("enhanceAbilityRollModifier"),
  }

  action doResolveEnhanceAbilityHigherSlotPerTarget = all {
    qLastResult == "init",
    recordProjection("enhanceAbilityHigherSlotPerTarget"),
  }

  action doDiscoverEnlargeReduceSizeIncrease = all {
    qLastResult == "init",
    recordProjection("enlargeReduceSizeIncrease"),
  }

  action doDiscoverMagicWeaponEnhancement = all {
    qLastResult == "init",
    recordProjection("magicWeaponEnhancement"),
  }

  action doDiscoverMirrorImageHitInterception = all {
    qLastResult == "init",
    recordProjection("mirrorImageHitInterception"),
  }

  action doDiscoverPassWithoutTraceStealthModifier = all {
    qLastResult == "init",
    recordProjection("passWithoutTraceStealthModifier"),
  }

  action doDiscoverWardingBondLinkedEffect = all {
    qLastResult == "init",
    recordProjection("wardingBondLinkedEffect"),
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
