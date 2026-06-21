// -*- mode: Bluespec; -*-

module battleRuntimeScalarBuffActiveEffectsMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Aid:
  //   targets' Hit Point maximum and current Hit Points increase for the
  //   duration.
  // - .references/srd-5.2.1/Spells/Descriptions-E-L.md#False Life:
  //   the caster gains rolled Temporary Hit Points.
  // - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Longstrider:
  //   the target's Speed increases by 10 feet until the spell ends.
  // - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield of Faith:
  //   a creature gains a +2 AC bonus for the Concentration duration.
  // - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Spider Climb:
  //   a willing target gains a Climb Speed equal to its Speed.
  // - .references/srd-5.2.1/Playing-the-Game.md#Temporary Hit Points and
  //   Rules-Glossary.md#Speed:
  //   Temporary Hit Points are a non-stacking buffer; special speeds are
  //   separate movement modes affected by Speed changes.
  // - UBIQUITOUS_LANGUAGE.md: Armor Class, Speed, Hit Point Maximum, Temporary
  //   Hit Points, Spell Invocation, and Spell Effect.
  type Hole = | NoHole

  type ScalarBuffActiveEffectsScenarioOutcome = | Init | ShieldOfFaith | Longstrider | SpiderClimb | Aid | FalseLife

  type ScalarBuffActiveEffectsWitnessState = {
    affectedArmorClass: int,
    affectedSpeedFeet: int,
    affectedClimbSpeedFeet: int,
    affectedHitPointMaximum: int,
    affectedHitPoints: int,
    affectedTemporaryHitPoints: int,
    armorClassBonusActive: bool,
    speedDeltaActive: bool,
    specialSpeedGrantActive: bool,
    hitPointMaximumIncreaseActive: bool,
    casterConcentrating: bool,
    scenarioOutcome: ScalarBuffActiveEffectsScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: ScalarBuffActiveEffectsWitnessState

  action recordScalarBuffState(
    affectedArmorClass: int,
    affectedSpeedFeet: int,
    affectedClimbSpeedFeet: int,
    affectedHitPointMaximum: int,
    affectedHitPoints: int,
    affectedTemporaryHitPoints: int,
    armorClassBonusActive: bool,
    speedDeltaActive: bool,
    specialSpeedGrantActive: bool,
    hitPointMaximumIncreaseActive: bool,
    casterConcentrating: bool,
    scenarioOutcome: ScalarBuffActiveEffectsScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      affectedArmorClass: affectedArmorClass,
      affectedSpeedFeet: affectedSpeedFeet,
      affectedClimbSpeedFeet: affectedClimbSpeedFeet,
      affectedHitPointMaximum: affectedHitPointMaximum,
      affectedHitPoints: affectedHitPoints,
      affectedTemporaryHitPoints: affectedTemporaryHitPoints,
      armorClassBonusActive: armorClassBonusActive,
      speedDeltaActive: speedDeltaActive,
      specialSpeedGrantActive: specialSpeedGrantActive,
      hitPointMaximumIncreaseActive: hitPointMaximumIncreaseActive,
      casterConcentrating: casterConcentrating,
      scenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordScalarBuffState(
    10,
    30,
    0,
    12,
    12,
    0,
    false,
    false,
    false,
    false,
    false,
    Init,
    witnessInit(NoHole))

  action doCastShieldOfFaith = all {
    qState.scenarioOutcome == Init,
    recordScalarBuffState(
      12,
      30,
      0,
      12,
      12,
      0,
      true,
      false,
      false,
      false,
      true,
      ShieldOfFaith,
      witnessResolved(NoHole)),
  }

  action doCastLongstrider = all {
    qState.scenarioOutcome == ShieldOfFaith,
    recordScalarBuffState(
      10,
      40,
      0,
      12,
      12,
      0,
      false,
      true,
      false,
      false,
      false,
      Longstrider,
      witnessResolved(NoHole)),
  }

  action doCastSpiderClimb = all {
    qState.scenarioOutcome == Longstrider,
    recordScalarBuffState(
      10,
      30,
      30,
      12,
      12,
      0,
      false,
      false,
      true,
      false,
      true,
      SpiderClimb,
      witnessResolved(NoHole)),
  }

  action doCastAid = all {
    qState.scenarioOutcome == SpiderClimb,
    recordScalarBuffState(
      10,
      30,
      0,
      17,
      17,
      0,
      false,
      false,
      false,
      true,
      false,
      Aid,
      witnessResolved(NoHole)),
  }

  action doCastFalseLife = all {
    qState.scenarioOutcome == Aid,
    recordScalarBuffState(
      10,
      30,
      0,
      12,
      12,
      9,
      false,
      false,
      false,
      false,
      false,
      FalseLife,
      witnessResolved(NoHole)),
  }

  action doStutter = all {
    qState.scenarioOutcome == FalseLife,
    recordScalarBuffState(
      qState.affectedArmorClass,
      qState.affectedSpeedFeet,
      qState.affectedClimbSpeedFeet,
      qState.affectedHitPointMaximum,
      qState.affectedHitPoints,
      qState.affectedTemporaryHitPoints,
      qState.armorClassBonusActive,
      qState.speedDeltaActive,
      qState.specialSpeedGrantActive,
      qState.hitPointMaximumIncreaseActive,
      qState.casterConcentrating,
      qState.scenarioOutcome,
      qState.protocol,
    ),
  }

  action step = any {
    doCastShieldOfFaith,
    doCastLongstrider,
    doCastSpiderClimb,
    doCastAid,
    doCastFalseLife,
    doStutter,
  }
}
