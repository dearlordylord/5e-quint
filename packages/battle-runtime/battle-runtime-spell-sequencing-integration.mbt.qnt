// -*- mode: Bluespec; -*-

module battleRuntimeSpellSequencingIntegrationMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type Hole = | NoHole

  type SpellSequencingIntegrationScenarioOutcome = | Init | CastDragonsBreath | TargetTurnWithBreath | ExhaledBreath | CasterTurnAfterBreath | CastHeatMetal | TargetTurnWithHeatMetal | CasterTurnWithHeatMetalRepeat | RepeatHeatMetal

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
    scenarioOutcome: SpellSequencingIntegrationScenarioOutcome,
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
    scenarioOutcome: SpellSequencingIntegrationScenarioOutcome,
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
      scenarioOutcome: scenarioOutcome,
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
    Init,
    witnessInit(NoHole))

  action doCastDragonsBreath = all {
    qState.scenarioOutcome == Init,
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
      CastDragonsBreath,
      witnessResolved(NoHole)),
  }

  action doEndCasterTurnForDragonsBreath = all {
    qState.scenarioOutcome == CastDragonsBreath,
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
      TargetTurnWithBreath,
      witnessResolved(NoHole)),
  }

  action doExhaleAndMaintainConcentration = all {
    qState.scenarioOutcome == TargetTurnWithBreath,
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
      ExhaledBreath,
      witnessResolved(NoHole)),
  }

  action doEndTargetTurnAfterBreath = all {
    qState.scenarioOutcome == ExhaledBreath,
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
      CasterTurnAfterBreath,
      witnessResolved(NoHole)),
  }

  action doCastHeatMetalContact = all {
    qState.scenarioOutcome == CasterTurnAfterBreath,
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
      CastHeatMetal,
      witnessResolved(NoHole)),
  }

  action doEndCasterTurnForHeatMetal = all {
    qState.scenarioOutcome == CastHeatMetal,
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
      TargetTurnWithHeatMetal,
      witnessResolved(NoHole)),
  }

  action doEndTargetTurnForHeatMetal = all {
    qState.scenarioOutcome == TargetTurnWithHeatMetal,
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
      CasterTurnWithHeatMetalRepeat,
      witnessResolved(NoHole)),
  }

  action doRepeatHeatMetalContactDamage = all {
    qState.scenarioOutcome == CasterTurnWithHeatMetalRepeat,
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
      RepeatHeatMetal,
      witnessResolved(NoHole)),
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
