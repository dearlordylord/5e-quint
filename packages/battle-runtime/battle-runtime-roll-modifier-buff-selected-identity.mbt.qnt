// -*- mode: Bluespec; -*-

module battleRuntimeRollModifierBuffSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Self-contained literal projection witness for fixed roll-modifier buff
  // selected-identity scenarios. The TS witness independently discovers these
  // projections from runtime, so this QNT side keeps no reducer imports.

  type WitnessHole = | WitnessProtocolHole

  type RollModifierBuffSelectedIdentityWitnessState = {
    qCasterConcentrating: bool,
    qCasterHp: int,
    qCasterEffectCount: int,
    qPrimaryTargetEffectCount: int,
    qSecondaryTargetEffectCount: int,
    qPrimaryTargetArmorClass: int,
    qPrimaryTargetHp: int,
    qD20ModifierSign: str,
    qD20ModifierAttackRoll: bool,
    qD20ModifierSavingThrow: bool,
    qD20ModifierAbilityCheck: bool,
    qD20ModifierSkill: str,
    qInvalidTargetRejected: bool,
    qDamageReductionType: str,
    qDamageReductionUsed: bool,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: RollModifierBuffSelectedIdentityWitnessState

  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qCasterHp: int = qState.qCasterHp
  pure def qCasterEffectCount: int = qState.qCasterEffectCount
  pure def qPrimaryTargetEffectCount: int = qState.qPrimaryTargetEffectCount
  pure def qSecondaryTargetEffectCount: int = qState.qSecondaryTargetEffectCount
  pure def qPrimaryTargetArmorClass: int = qState.qPrimaryTargetArmorClass
  pure def qPrimaryTargetHp: int = qState.qPrimaryTargetHp
  pure def qD20ModifierSign: str = qState.qD20ModifierSign
  pure def qD20ModifierAttackRoll: bool = qState.qD20ModifierAttackRoll
  pure def qD20ModifierSavingThrow: bool = qState.qD20ModifierSavingThrow
  pure def qD20ModifierAbilityCheck: bool = qState.qD20ModifierAbilityCheck
  pure def qD20ModifierSkill: str = qState.qD20ModifierSkill
  pure def qInvalidTargetRejected: bool = qState.qInvalidTargetRejected
  pure def qDamageReductionType: str = qState.qDamageReductionType
  pure def qDamageReductionUsed: bool = qState.qDamageReductionUsed
  pure def qLastResult: str = qState.qScenarioResult

  pure def selectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordProjection(
    casterConcentrating: bool,
    casterHp: int,
    casterEffectCount: int,
    primaryTargetEffectCount: int,
    secondaryTargetEffectCount: int,
    primaryTargetArmorClass: int,
    primaryTargetHp: int,
    d20ModifierSign: str,
    d20ModifierAttackRoll: bool,
    d20ModifierSavingThrow: bool,
    d20ModifierAbilityCheck: bool,
    d20ModifierSkill: str,
    invalidTargetRejected: bool,
    damageReductionType: str,
    damageReductionUsed: bool,
    lastResult: str,
  ): bool = all {
    qState' = {
      qCasterConcentrating: casterConcentrating,
      qCasterHp: casterHp,
      qCasterEffectCount: casterEffectCount,
      qPrimaryTargetEffectCount: primaryTargetEffectCount,
      qSecondaryTargetEffectCount: secondaryTargetEffectCount,
      qPrimaryTargetArmorClass: primaryTargetArmorClass,
      qPrimaryTargetHp: primaryTargetHp,
      qD20ModifierSign: d20ModifierSign,
      qD20ModifierAttackRoll: d20ModifierAttackRoll,
      qD20ModifierSavingThrow: d20ModifierSavingThrow,
      qD20ModifierAbilityCheck: d20ModifierAbilityCheck,
      qD20ModifierSkill: d20ModifierSkill,
      qInvalidTargetRejected: invalidTargetRejected,
      qDamageReductionType: damageReductionType,
      qDamageReductionUsed: damageReductionUsed,
      qScenarioResult: lastResult,
      protocol: selectedIdentityProtocolForProjection(Set(), lastResult, ""),
    },
  }
  action init = recordProjection(
    false, 12, 0, 0, 0, 10, 12, "none", false, false, false,
    "none", false, "none", false, "init",
  )

  action doBlessAttackAndSaveModifier = all {
    qLastResult == "init",
    recordProjection(
      true, 12, 0, 1, 1, 10, 12, "+", true, true, false,
      "none", false, "none", false, "bless",
    ),
  }

  action doBaneFailedSavePenalty = all {
    qLastResult == "init",
    recordProjection(
      true, 12, 0, 1, 0, 10, 12, "-", true, true, false,
      "none", false, "none", false, "bane",
    ),
  }

  action doGuidanceSkillAbilityCheckModifier = all {
    qLastResult == "init",
    recordProjection(
      true, 12, 1, 0, 0, 10, 12, "+", false, false, true,
      "stealth", true, "none", false, "guidance",
    ),
  }

  action doResistanceReducesMatchingDamage = {
    all {
      qLastResult == "init",
      recordProjection(
        true, 12, 1, 0, 0, 10, 12, "none", false, false, false,
        "none", false, "bludgeoning", true,
        "resistance",
      ),
    }
  }

  action doShieldOfFaithArmorClassBonus = all {
    qLastResult == "init",
    recordProjection(
      true, 12, 0, 1, 0, 12, 12, "none", false, false, false,
      "none", false, "none", false, "shieldOfFaith",
    ),
  }

  action step = any {
    doBlessAttackAndSaveModifier,
    doBaneFailedSavePenalty,
    doGuidanceSkillAbilityCheckModifier,
    doResistanceReducesMatchingDamage,
    doShieldOfFaithArmorClassBonus,
  }
}
