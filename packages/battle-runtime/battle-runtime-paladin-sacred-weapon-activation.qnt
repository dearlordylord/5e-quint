// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.paladin-sacred-weapon
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.paladin-sacred-weapon

module battleRuntimePaladinSacredWeaponActivation {
  // RAW trace:
  // - .references/srd-5.2.1/Classes/Paladin.md#Level 3: Sacred Weapon:
  //   when taking the Attack action, expend Channel Divinity to imbue one
  //   held Melee weapon for 10 minutes.
  // - .references/srd-5.2.1/Equipment.md#Weapons: weapons are Melee or Ranged.
  // UBIQUITOUS_LANGUAGE.md: Action, Attack action, Attack Roll, Damage Type,
  //   Spend, Bright Light, Dim Light, Holding / Wielding.
  type HeldWeapon = HeldMeleeWeapon | HeldRangedWeapon | NoHeldWeapon
  type SacredWeaponDamageTypeChoice = NormalWeaponDamage | RadiantWeaponDamage

  type SacredWeaponActivationState = {
    attackActionAvailable: bool,
    channelDivinityUsesRemaining: int,
    heldWeapon: HeldWeapon,
    activeWeaponBindings: Set[HeldWeapon],
  }

  type SacredWeaponActivationProjection = {
    activationOffered: bool,
    channelDivinityUsesRemaining: int,
    boundWeapon: HeldWeapon,
    activeBindingCount: int,
  }

  type SacredWeaponEffectState = {
    active: bool,
    carryingBoundWeapon: bool,
    charismaModifier: int,
  }

  type SacredWeaponLightProjection = {
    brightRadiusFeet: int,
    dimAdditionalFeet: int,
  }

  pure def sacredWeaponActivationOffered(
    state: SacredWeaponActivationState
  ): bool =
    state.attackActionAvailable and
    state.channelDivinityUsesRemaining > 0 and
    state.heldWeapon == HeldMeleeWeapon

  pure def activateSacredWeapon(
    state: SacredWeaponActivationState
  ): SacredWeaponActivationProjection =
    if (sacredWeaponActivationOffered(state)) {
      activationOffered: true,
      channelDivinityUsesRemaining: state.channelDivinityUsesRemaining - 1,
      boundWeapon: HeldMeleeWeapon,
      activeBindingCount: 1,
    } else {
      activationOffered: false,
      channelDivinityUsesRemaining: state.channelDivinityUsesRemaining,
      boundWeapon: NoHeldWeapon,
      activeBindingCount: state.activeWeaponBindings.size(),
    }

  pure def sacredWeaponAttackRollBonus(charismaModifier: int): int =
    if (charismaModifier < 1) 1 else charismaModifier

  pure def sacredWeaponDamageTypeChoices(active: bool): Set[SacredWeaponDamageTypeChoice] =
    if (active) Set(NormalWeaponDamage, RadiantWeaponDamage) else Set()

  pure def sacredWeaponLightProjection(active: bool): Set[SacredWeaponLightProjection] =
    if (active) Set({ brightRadiusFeet: 20, dimAdditionalFeet: 20 }) else Set()

  pure def sacredWeaponActiveAfterDismissal(state: SacredWeaponEffectState): bool =
    false

  pure def sacredWeaponActiveAfterCarryCheck(state: SacredWeaponEffectState): bool =
    state.active and state.carryingBoundWeapon

  pure def readyState: SacredWeaponActivationState = {
    attackActionAvailable: true,
    channelDivinityUsesRemaining: 2,
    heldWeapon: HeldMeleeWeapon,
    activeWeaponBindings: Set(),
  }

}
