// -*- mode: Bluespec; -*-

module battleRuntimeSelfTransformationModeLifecycleMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Alter Self:
  //   Alter Self is a level 2 Action spell with range Self and Concentration
  //   up to 1 hour. The caster chooses Aquatic Adaptation, Change Appearance,
  //   or Natural Weapons, and can take a later Magic action to replace the
  //   chosen option with a different one.
  // - Aquatic Adaptation grants underwater breathing and a Swim Speed equal to
  //   Speed. Change Appearance changes appearance without changing statistics.
  //   Natural Weapons replaces Unarmed Strike damage with 1d6 of the selected
  //   damage type and uses the spellcasting ability modifier for attack and
  //   damage rolls.
  // - UBIQUITOUS_LANGUAGE.md: Action, Concentration, Damage Roll, Speed,
  //   Spell Effect, Spell Slot, and Unarmed Strike.
  var qMagicActionAvailable: bool
  var qCastSpellAvailable: bool
  var qModeReplacementAvailable: bool
  var qSpellSlotExpended: int
  var qSlotSpellCastThisTurn: bool
  var qCasterConcentrating: bool
  var qActiveMode: str
  var qWaterBreathing: bool
  var qWalkSpeedFeet: int
  var qSwimSpeedFeet: int
  var qNaturalWeaponDamageType: str
  var qNaturalWeaponDamageDieSize: int
  var qNaturalWeaponAttackBonus: int
  var qNaturalWeaponDamageOnRoll4: int
  var qDurationTicks: int
  var qLastResult: str

  pure val noMode: str = "none"
  pure val aquaticAdaptationMode: str = "aquaticAdaptation"
  pure val changeAppearanceMode: str = "changeAppearance"
  pure val naturalWeaponsMode: str = "naturalWeapons"

  pure val noDamageType: str = "none"
  pure val slashingDamageType: str = "slashing"
  pure val piercingDamageType: str = "piercing"

  pure def alterSelfDurationTicks: int = 600
  pure def spellcastingAbilityModifier: int = 3
  pure def spellcastingAttackBonus: int = 5
  pure def walkSpeedFeet: int = 30

  action recordSelfTransformationState(
    magicActionAvailable: bool,
    castSpellAvailable: bool,
    modeReplacementAvailable: bool,
    spellSlotExpended: int,
    slotSpellCastThisTurn: bool,
    casterConcentrating: bool,
    activeMode: str,
    naturalWeaponDamageType: str,
    durationTicks: int,
    lastResult: str,
  ): bool = all {
    qMagicActionAvailable' = magicActionAvailable,
    qCastSpellAvailable' = castSpellAvailable,
    qModeReplacementAvailable' = modeReplacementAvailable,
    qSpellSlotExpended' = spellSlotExpended,
    qSlotSpellCastThisTurn' = slotSpellCastThisTurn,
    qCasterConcentrating' = casterConcentrating,
    qActiveMode' = activeMode,
    qWaterBreathing' = activeMode == aquaticAdaptationMode,
    qWalkSpeedFeet' = walkSpeedFeet,
    qSwimSpeedFeet' = if (activeMode == aquaticAdaptationMode) walkSpeedFeet else 0,
    qNaturalWeaponDamageType' =
      if (activeMode == naturalWeaponsMode) naturalWeaponDamageType else noDamageType,
    qNaturalWeaponDamageDieSize' = if (activeMode == naturalWeaponsMode) 6 else 0,
    qNaturalWeaponAttackBonus' =
      if (activeMode == naturalWeaponsMode) spellcastingAttackBonus else 0,
    qNaturalWeaponDamageOnRoll4' =
      if (activeMode == naturalWeaponsMode) 4 + spellcastingAbilityModifier else 0,
    qDurationTicks' = durationTicks,
    qLastResult' = lastResult,
  }

  action init = recordSelfTransformationState(
    true,
    true,
    false,
    0,
    false,
    false,
    noMode,
    noDamageType,
    0,
    "init",
  )

  action doCastAquaticAdaptation = all {
    qMagicActionAvailable,
    qCastSpellAvailable,
    qSpellSlotExpended == 0,
    recordSelfTransformationState(
      false,
      false,
      false,
      1,
      true,
      true,
      aquaticAdaptationMode,
      noDamageType,
      alterSelfDurationTicks,
      "aquaticCast",
    ),
  }

  action doCastNaturalWeapons = all {
    qMagicActionAvailable,
    qCastSpellAvailable,
    qSpellSlotExpended == 0,
    recordSelfTransformationState(
      false,
      false,
      false,
      1,
      true,
      true,
      naturalWeaponsMode,
      slashingDamageType,
      alterSelfDurationTicks,
      "naturalWeaponsCast",
    ),
  }

  action doStartNextCasterTurn = all {
    qActiveMode != noMode,
    not(qMagicActionAvailable),
    qDurationTicks > 0,
    recordSelfTransformationState(
      true,
      false,
      true,
      qSpellSlotExpended,
      false,
      qCasterConcentrating,
      qActiveMode,
      qNaturalWeaponDamageType,
      qDurationTicks - 1,
      "nextCasterTurn",
    ),
  }

  action doReplaceChangeAppearance = all {
    qMagicActionAvailable,
    qModeReplacementAvailable,
    qActiveMode != noMode,
    qActiveMode != changeAppearanceMode,
    recordSelfTransformationState(
      false,
      false,
      false,
      qSpellSlotExpended,
      false,
      true,
      changeAppearanceMode,
      noDamageType,
      qDurationTicks,
      "changeAppearanceReplacement",
    ),
  }

  action doReplaceNaturalWeapons = all {
    qMagicActionAvailable,
    qModeReplacementAvailable,
    qActiveMode != noMode,
    qActiveMode != naturalWeaponsMode,
    recordSelfTransformationState(
      false,
      false,
      false,
      qSpellSlotExpended,
      false,
      true,
      naturalWeaponsMode,
      piercingDamageType,
      qDurationTicks,
      "naturalWeaponsReplacement",
    ),
  }

  action doStutter = recordSelfTransformationState(
    qMagicActionAvailable,
    qCastSpellAvailable,
    qModeReplacementAvailable,
    qSpellSlotExpended,
    qSlotSpellCastThisTurn,
    qCasterConcentrating,
    qActiveMode,
    qNaturalWeaponDamageType,
    qDurationTicks,
    qLastResult,
  )

  action step = any {
    doCastAquaticAdaptation,
    doCastNaturalWeapons,
    doStartNextCasterTurn,
    doReplaceChangeAppearance,
    doReplaceNaturalWeapons,
    doStutter,
  }
}
