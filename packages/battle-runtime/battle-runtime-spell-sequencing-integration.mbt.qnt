// -*- mode: Bluespec; -*-

module battleRuntimeSpellSequencingIntegrationMbt {
  var qTurnRole: str
  var qMagicActionAvailable: bool
  var qBonusActionAvailable: bool
  var qDragonsBreathActive: bool
  var qHeatMetalActive: bool
  var qConcentrationSpell: str
  var qHeatMetalRepeatAvailable: bool
  var qCasterHp: int
  var qTargetHp: int
  var qLastResult: str

  pure val casterTurnRole: str = "caster"
  pure val targetTurnRole: str = "target"
  pure val noConcentrationSpell: str = "none"
  pure val dragonsBreathConcentrationSpell: str = "dragonsBreath"
  pure val heatMetalConcentrationSpell: str = "heatMetal"
  pure val initialCasterHp: int = 12
  pure val initialTargetHp: int = 40
  pure val dragonsBreathDamage: int = 6
  pure val heatMetalCastDamage: int = 7
  pure val heatMetalRepeatDamage: int = 5

  action recordSpellSequencingState(
    turnRole: str,
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    dragonsBreathActive: bool,
    heatMetalActive: bool,
    concentrationSpell: str,
    heatMetalRepeatAvailable: bool,
    casterHp: int,
    targetHp: int,
    lastResult: str,
  ): bool = all {
    qTurnRole' = turnRole,
    qMagicActionAvailable' = magicActionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qDragonsBreathActive' = dragonsBreathActive,
    qHeatMetalActive' = heatMetalActive,
    qConcentrationSpell' = concentrationSpell,
    qHeatMetalRepeatAvailable' = heatMetalRepeatAvailable,
    qCasterHp' = casterHp,
    qTargetHp' = targetHp,
    qLastResult' = lastResult,
  }

  action init = recordSpellSequencingState(
    casterTurnRole,
    true,
    true,
    false,
    false,
    noConcentrationSpell,
    false,
    initialCasterHp,
    initialTargetHp,
    "init",
  )

  action doCastDragonsBreath = all {
    qLastResult == "init",
    qTurnRole == casterTurnRole,
    qMagicActionAvailable,
    qBonusActionAvailable,
    not(qDragonsBreathActive),
    not(qHeatMetalActive),
    qConcentrationSpell == noConcentrationSpell,
    recordSpellSequencingState(
      casterTurnRole,
      qMagicActionAvailable,
      false,
      true,
      false,
      dragonsBreathConcentrationSpell,
      false,
      qCasterHp,
      qTargetHp,
      "castDragonsBreath",
    ),
  }

  action doEndCasterTurnForDragonsBreath = all {
    qLastResult == "castDragonsBreath",
    qTurnRole == casterTurnRole,
    qDragonsBreathActive,
    qConcentrationSpell == dragonsBreathConcentrationSpell,
    recordSpellSequencingState(
      targetTurnRole,
      true,
      true,
      true,
      false,
      dragonsBreathConcentrationSpell,
      false,
      qCasterHp,
      qTargetHp,
      "targetTurnWithBreath",
    ),
  }

  action doExhaleAndMaintainConcentration = all {
    qLastResult == "targetTurnWithBreath",
    qTurnRole == targetTurnRole,
    qMagicActionAvailable,
    qDragonsBreathActive,
    qConcentrationSpell == dragonsBreathConcentrationSpell,
    recordSpellSequencingState(
      targetTurnRole,
      false,
      qBonusActionAvailable,
      true,
      false,
      dragonsBreathConcentrationSpell,
      false,
      qCasterHp - dragonsBreathDamage,
      qTargetHp,
      "exhaledBreath",
    ),
  }

  action doEndTargetTurnAfterBreath = all {
    qLastResult == "exhaledBreath",
    qTurnRole == targetTurnRole,
    qDragonsBreathActive,
    qConcentrationSpell == dragonsBreathConcentrationSpell,
    recordSpellSequencingState(
      casterTurnRole,
      true,
      true,
      true,
      false,
      dragonsBreathConcentrationSpell,
      false,
      qCasterHp,
      qTargetHp,
      "casterTurnAfterBreath",
    ),
  }

  action doCastHeatMetalContact = all {
    qLastResult == "casterTurnAfterBreath",
    qTurnRole == casterTurnRole,
    qMagicActionAvailable,
    qDragonsBreathActive,
    qConcentrationSpell == dragonsBreathConcentrationSpell,
    recordSpellSequencingState(
      casterTurnRole,
      false,
      qBonusActionAvailable,
      false,
      true,
      heatMetalConcentrationSpell,
      false,
      qCasterHp,
      qTargetHp - heatMetalCastDamage,
      "castHeatMetal",
    ),
  }

  action doEndCasterTurnForHeatMetal = all {
    qLastResult == "castHeatMetal",
    qTurnRole == casterTurnRole,
    qHeatMetalActive,
    qConcentrationSpell == heatMetalConcentrationSpell,
    recordSpellSequencingState(
      targetTurnRole,
      true,
      true,
      false,
      true,
      heatMetalConcentrationSpell,
      false,
      qCasterHp,
      qTargetHp,
      "targetTurnWithHeatMetal",
    ),
  }

  action doEndTargetTurnForHeatMetal = all {
    qLastResult == "targetTurnWithHeatMetal",
    qTurnRole == targetTurnRole,
    qHeatMetalActive,
    qConcentrationSpell == heatMetalConcentrationSpell,
    recordSpellSequencingState(
      casterTurnRole,
      true,
      true,
      false,
      true,
      heatMetalConcentrationSpell,
      true,
      qCasterHp,
      qTargetHp,
      "casterTurnWithHeatMetalRepeat",
    ),
  }

  action doRepeatHeatMetalContactDamage = all {
    qLastResult == "casterTurnWithHeatMetalRepeat",
    qTurnRole == casterTurnRole,
    qBonusActionAvailable,
    qHeatMetalRepeatAvailable,
    qHeatMetalActive,
    qConcentrationSpell == heatMetalConcentrationSpell,
    recordSpellSequencingState(
      casterTurnRole,
      qMagicActionAvailable,
      false,
      false,
      true,
      heatMetalConcentrationSpell,
      false,
      qCasterHp,
      qTargetHp - heatMetalRepeatDamage,
      "repeatHeatMetal",
    ),
  }

  action step = any {
    doCastDragonsBreath,
    doEndCasterTurnForDragonsBreath,
    doExhaleAndMaintainConcentration,
    doEndTargetTurnAfterBreath,
    doCastHeatMetalContact,
    doEndCasterTurnForHeatMetal,
    doEndTargetTurnForHeatMetal,
    doRepeatHeatMetalContactDamage,
  }
}
