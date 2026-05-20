// -*- mode: Bluespec; -*-

module battleRuntimeRollModifierBuffSelectedIdentityMbt {
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeModel.* from "./battle-runtime-model"

  var qCasterConcentrating: bool
  var qCasterHp: int
  var qCasterEffectCount: int
  var qPrimaryTargetEffectCount: int
  var qSecondaryTargetEffectCount: int
  var qPrimaryTargetArmorClass: int
  var qPrimaryTargetHp: int
  var qD20ModifierSign: str
  var qD20ModifierAttackRoll: bool
  var qD20ModifierSavingThrow: bool
  var qD20ModifierAbilityCheck: bool
  var qD20ModifierSkill: str
  var qInvalidTargetRejected: bool
  var qDamageReductionType: str
  var qDamageReductionUsed: bool
  var qLastResult: str

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
    qCasterConcentrating' = casterConcentrating,
    qCasterHp' = casterHp,
    qCasterEffectCount' = casterEffectCount,
    qPrimaryTargetEffectCount' = primaryTargetEffectCount,
    qSecondaryTargetEffectCount' = secondaryTargetEffectCount,
    qPrimaryTargetArmorClass' = primaryTargetArmorClass,
    qPrimaryTargetHp' = primaryTargetHp,
    qD20ModifierSign' = d20ModifierSign,
    qD20ModifierAttackRoll' = d20ModifierAttackRoll,
    qD20ModifierSavingThrow' = d20ModifierSavingThrow,
    qD20ModifierAbilityCheck' = d20ModifierAbilityCheck,
    qD20ModifierSkill' = d20ModifierSkill,
    qInvalidTargetRejected' = invalidTargetRejected,
    qDamageReductionType' = damageReductionType,
    qDamageReductionUsed' = damageReductionUsed,
    qLastResult' = lastResult,
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
    val effects = Set(ResistanceDamageReduction({ damageType: Bludgeoning, usedThisTurn: false }))
    val reducedDamage = damageAfterResistanceSpellReduction(2, Bludgeoning, effects, 1)
    val usedEffects = activeEffectsAfterResistanceSpellReduction(effects, Bludgeoning)
    all {
      qLastResult == "init",
      recordProjection(
        true, 12, 1, 0, 0, 10, 12, "none", false, false, false,
        "none", false, if (reducedDamage == 1) "bludgeoning" else "none",
        usedEffects.contains(ResistanceDamageReduction({ damageType: Bludgeoning, usedThisTurn: true })),
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
