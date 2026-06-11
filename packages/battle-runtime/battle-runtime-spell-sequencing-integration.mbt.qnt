// -*- mode: Bluespec; -*-

module battleRuntimeSpellSequencingIntegrationMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SpellSequencingWitnessState = {
    turnRole: str,
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    dragonsBreathActive: bool,
    heatMetalActive: bool,
    concentrationSpell: str,
    heatMetalRepeatAvailable: bool,
    casterHp: int,
    targetHp: int,
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SpellSequencingWitnessState

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
    scenarioResult: str,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      turnRole: turnRole,
      magicActionAvailable: magicActionAvailable,
      bonusActionAvailable: bonusActionAvailable,
      dragonsBreathActive: dragonsBreathActive,
      heatMetalActive: heatMetalActive,
      concentrationSpell: concentrationSpell,
      heatMetalRepeatAvailable: heatMetalRepeatAvailable,
      casterHp: casterHp,
      targetHp: targetHp,
      scenarioResult: scenarioResult,
      protocol: protocol,
    },
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
    witnessInit(NoHole),
  )

  action doCastDragonsBreath = all {
    qState.scenarioResult == "init",
    qState.turnRole == casterTurnRole,
    qState.magicActionAvailable,
    qState.bonusActionAvailable,
    not(qState.dragonsBreathActive),
    not(qState.heatMetalActive),
    qState.concentrationSpell == noConcentrationSpell,
    recordSpellSequencingState(
      casterTurnRole,
      qState.magicActionAvailable,
      false,
      true,
      false,
      dragonsBreathConcentrationSpell,
      false,
      qState.casterHp,
      qState.targetHp,
      "castDragonsBreath",
      witnessResolved(NoHole),
    ),
  }

  action doEndCasterTurnForDragonsBreath = all {
    qState.scenarioResult == "castDragonsBreath",
    qState.turnRole == casterTurnRole,
    qState.dragonsBreathActive,
    qState.concentrationSpell == dragonsBreathConcentrationSpell,
    recordSpellSequencingState(
      targetTurnRole,
      true,
      true,
      true,
      false,
      dragonsBreathConcentrationSpell,
      false,
      qState.casterHp,
      qState.targetHp,
      "targetTurnWithBreath",
      witnessResolved(NoHole),
    ),
  }

  action doExhaleAndMaintainConcentration = all {
    qState.scenarioResult == "targetTurnWithBreath",
    qState.turnRole == targetTurnRole,
    qState.magicActionAvailable,
    qState.dragonsBreathActive,
    qState.concentrationSpell == dragonsBreathConcentrationSpell,
    recordSpellSequencingState(
      targetTurnRole,
      false,
      qState.bonusActionAvailable,
      true,
      false,
      dragonsBreathConcentrationSpell,
      false,
      qState.casterHp - dragonsBreathDamage,
      qState.targetHp,
      "exhaledBreath",
      witnessResolved(NoHole),
    ),
  }

  action doEndTargetTurnAfterBreath = all {
    qState.scenarioResult == "exhaledBreath",
    qState.turnRole == targetTurnRole,
    qState.dragonsBreathActive,
    qState.concentrationSpell == dragonsBreathConcentrationSpell,
    recordSpellSequencingState(
      casterTurnRole,
      true,
      true,
      true,
      false,
      dragonsBreathConcentrationSpell,
      false,
      qState.casterHp,
      qState.targetHp,
      "casterTurnAfterBreath",
      witnessResolved(NoHole),
    ),
  }

  action doCastHeatMetalContact = all {
    qState.scenarioResult == "casterTurnAfterBreath",
    qState.turnRole == casterTurnRole,
    qState.magicActionAvailable,
    qState.dragonsBreathActive,
    qState.concentrationSpell == dragonsBreathConcentrationSpell,
    recordSpellSequencingState(
      casterTurnRole,
      false,
      qState.bonusActionAvailable,
      false,
      true,
      heatMetalConcentrationSpell,
      false,
      qState.casterHp,
      qState.targetHp - heatMetalCastDamage,
      "castHeatMetal",
      witnessResolved(NoHole),
    ),
  }

  action doEndCasterTurnForHeatMetal = all {
    qState.scenarioResult == "castHeatMetal",
    qState.turnRole == casterTurnRole,
    qState.heatMetalActive,
    qState.concentrationSpell == heatMetalConcentrationSpell,
    recordSpellSequencingState(
      targetTurnRole,
      true,
      true,
      false,
      true,
      heatMetalConcentrationSpell,
      false,
      qState.casterHp,
      qState.targetHp,
      "targetTurnWithHeatMetal",
      witnessResolved(NoHole),
    ),
  }

  action doEndTargetTurnForHeatMetal = all {
    qState.scenarioResult == "targetTurnWithHeatMetal",
    qState.turnRole == targetTurnRole,
    qState.heatMetalActive,
    qState.concentrationSpell == heatMetalConcentrationSpell,
    recordSpellSequencingState(
      casterTurnRole,
      true,
      true,
      false,
      true,
      heatMetalConcentrationSpell,
      true,
      qState.casterHp,
      qState.targetHp,
      "casterTurnWithHeatMetalRepeat",
      witnessResolved(NoHole),
    ),
  }

  action doRepeatHeatMetalContactDamage = all {
    qState.scenarioResult == "casterTurnWithHeatMetalRepeat",
    qState.turnRole == casterTurnRole,
    qState.bonusActionAvailable,
    qState.heatMetalRepeatAvailable,
    qState.heatMetalActive,
    qState.concentrationSpell == heatMetalConcentrationSpell,
    recordSpellSequencingState(
      casterTurnRole,
      qState.magicActionAvailable,
      false,
      false,
      true,
      heatMetalConcentrationSpell,
      false,
      qState.casterHp,
      qState.targetHp - heatMetalRepeatDamage,
      "repeatHeatMetal",
      witnessResolved(NoHole),
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
