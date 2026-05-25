// -*- mode: Bluespec; -*-

module battleRuntimeScalarBuffActiveEffectsMbt {
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
  var qAffectedArmorClass: int
  var qAffectedSpeedFeet: int
  var qAffectedClimbSpeedFeet: int
  var qAffectedHitPointMaximum: int
  var qAffectedHitPoints: int
  var qAffectedTemporaryHitPoints: int
  var qArmorClassBonusActive: bool
  var qSpeedDeltaActive: bool
  var qSpecialSpeedGrantActive: bool
  var qHitPointMaximumIncreaseActive: bool
  var qCasterConcentrating: bool
  var qLastResult: str

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
    lastResult: str,
  ): bool = all {
    qAffectedArmorClass' = affectedArmorClass,
    qAffectedSpeedFeet' = affectedSpeedFeet,
    qAffectedClimbSpeedFeet' = affectedClimbSpeedFeet,
    qAffectedHitPointMaximum' = affectedHitPointMaximum,
    qAffectedHitPoints' = affectedHitPoints,
    qAffectedTemporaryHitPoints' = affectedTemporaryHitPoints,
    qArmorClassBonusActive' = armorClassBonusActive,
    qSpeedDeltaActive' = speedDeltaActive,
    qSpecialSpeedGrantActive' = specialSpeedGrantActive,
    qHitPointMaximumIncreaseActive' = hitPointMaximumIncreaseActive,
    qCasterConcentrating' = casterConcentrating,
    qLastResult' = lastResult,
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
    "init",
  )

  action doCastShieldOfFaith = all {
    qLastResult == "init",
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
      "shieldOfFaith",
    ),
  }

  action doCastLongstrider = all {
    qLastResult == "shieldOfFaith",
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
      "longstrider",
    ),
  }

  action doCastSpiderClimb = all {
    qLastResult == "longstrider",
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
      "spiderClimb",
    ),
  }

  action doCastAid = all {
    qLastResult == "spiderClimb",
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
      "aid",
    ),
  }

  action doCastFalseLife = all {
    qLastResult == "aid",
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
      "falseLife",
    ),
  }

  action doStutter = all {
    qLastResult == "falseLife",
    recordScalarBuffState(
      qAffectedArmorClass,
      qAffectedSpeedFeet,
      qAffectedClimbSpeedFeet,
      qAffectedHitPointMaximum,
      qAffectedHitPoints,
      qAffectedTemporaryHitPoints,
      qArmorClassBonusActive,
      qSpeedDeltaActive,
      qSpecialSpeedGrantActive,
      qHitPointMaximumIncreaseActive,
      qCasterConcentrating,
      qLastResult,
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
