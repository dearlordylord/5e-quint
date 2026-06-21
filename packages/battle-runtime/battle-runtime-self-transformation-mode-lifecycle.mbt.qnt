// -*- mode: Bluespec; -*-

module battleRuntimeSelfTransformationModeLifecycleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

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
  type Hole = | NoHole

  type SelfTransformationModeLifecycleScenarioOutcome = | Init | AquaticCast | NaturalWeaponsCast | NextCasterTurn | ChangeAppearanceReplacement | NaturalWeaponsReplacement

  type SelfTransformationWitnessState = {
    magicActionAvailable: bool,
    castSpellAvailable: bool,
    modeReplacementAvailable: bool,
    spellSlotExpended: int,
    slotSpellCastThisTurn: bool,
    casterConcentrating: bool,
    activeMode: str,
    waterBreathing: bool,
    walkSpeedFeet: int,
    swimSpeedFeet: int,
    naturalWeaponDamageType: str,
    naturalWeaponDamageDieSize: int,
    naturalWeaponAttackBonus: int,
    naturalWeaponDamageOnRoll4: int,
    durationTicks: int,
    scenarioOutcome: SelfTransformationModeLifecycleScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SelfTransformationWitnessState

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
    scenarioOutcome: SelfTransformationModeLifecycleScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      magicActionAvailable: magicActionAvailable,
      castSpellAvailable: castSpellAvailable,
      modeReplacementAvailable: modeReplacementAvailable,
      spellSlotExpended: spellSlotExpended,
      slotSpellCastThisTurn: slotSpellCastThisTurn,
      casterConcentrating: casterConcentrating,
      activeMode: activeMode,
      waterBreathing: activeMode == aquaticAdaptationMode,
      walkSpeedFeet: walkSpeedFeet,
      swimSpeedFeet: if (activeMode == aquaticAdaptationMode) walkSpeedFeet else 0,
      naturalWeaponDamageType:
        if (activeMode == naturalWeaponsMode) naturalWeaponDamageType else noDamageType,
      naturalWeaponDamageDieSize: if (activeMode == naturalWeaponsMode) 6 else 0,
      naturalWeaponAttackBonus:
        if (activeMode == naturalWeaponsMode) spellcastingAttackBonus else 0,
      naturalWeaponDamageOnRoll4:
        if (activeMode == naturalWeaponsMode) 4 + spellcastingAbilityModifier else 0,
      durationTicks: durationTicks,
      scenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
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
    Init,
    witnessInit(NoHole))

  action doCastAquaticAdaptation = all {
    qState.magicActionAvailable,
    qState.castSpellAvailable,
    qState.spellSlotExpended == 0,
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
      AquaticCast,
      witnessResolved(NoHole)),
  }

  action doCastNaturalWeapons = all {
    qState.magicActionAvailable,
    qState.castSpellAvailable,
    qState.spellSlotExpended == 0,
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
      NaturalWeaponsCast,
      witnessResolved(NoHole)),
  }

  action doStartNextCasterTurn = all {
    qState.activeMode != noMode,
    not(qState.magicActionAvailable),
    qState.durationTicks > 0,
    recordSelfTransformationState(
      true,
      false,
      true,
      qState.spellSlotExpended,
      false,
      qState.casterConcentrating,
      qState.activeMode,
      qState.naturalWeaponDamageType,
      qState.durationTicks - 1,
      NextCasterTurn,
      witnessResolved(NoHole)),
  }

  action doReplaceChangeAppearance = all {
    qState.magicActionAvailable,
    qState.modeReplacementAvailable,
    qState.activeMode != noMode,
    qState.activeMode != changeAppearanceMode,
    recordSelfTransformationState(
      false,
      false,
      false,
      qState.spellSlotExpended,
      false,
      true,
      changeAppearanceMode,
      noDamageType,
      qState.durationTicks,
      ChangeAppearanceReplacement,
      witnessResolved(NoHole)),
  }

  action doReplaceNaturalWeapons = all {
    qState.magicActionAvailable,
    qState.modeReplacementAvailable,
    qState.activeMode != noMode,
    qState.activeMode != naturalWeaponsMode,
    recordSelfTransformationState(
      false,
      false,
      false,
      qState.spellSlotExpended,
      false,
      true,
      naturalWeaponsMode,
      piercingDamageType,
      qState.durationTicks,
      NaturalWeaponsReplacement,
      witnessResolved(NoHole)),
  }

  action doStutter = recordSelfTransformationState(
    qState.magicActionAvailable,
    qState.castSpellAvailable,
    qState.modeReplacementAvailable,
    qState.spellSlotExpended,
    qState.slotSpellCastThisTurn,
    qState.casterConcentrating,
    qState.activeMode,
    qState.naturalWeaponDamageType,
    qState.durationTicks,
    qState.scenarioOutcome,
    qState.protocol,
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
