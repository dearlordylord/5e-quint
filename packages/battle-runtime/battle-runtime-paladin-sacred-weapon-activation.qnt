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

  run test_sacred_weapon_activation_spends_channel_divinity_and_binds_weapon = {
    val projection = activateSacredWeapon(readyState)
    all {
      assert(projection.activationOffered),
      assert(projection.channelDivinityUsesRemaining == 1),
      assert(projection.boundWeapon == HeldMeleeWeapon),
      assert(projection.activeBindingCount == 1),
    }
  }

  run test_sacred_weapon_rejects_missing_resource_or_weapon = {
    val noResource = activateSacredWeapon({
      ...readyState,
      channelDivinityUsesRemaining: 0,
    })
    val rangedWeapon = activateSacredWeapon({
      ...readyState,
      heldWeapon: HeldRangedWeapon,
    })
    all {
      assert(not(noResource.activationOffered)),
      assert(noResource.channelDivinityUsesRemaining == 0),
      assert(not(rangedWeapon.activationOffered)),
      assert(rangedWeapon.channelDivinityUsesRemaining == 2),
    }
  }

  run test_sacred_weapon_recast_keeps_one_active_binding = {
    val recast = activateSacredWeapon({
      ...readyState,
      activeWeaponBindings: Set(HeldMeleeWeapon),
    })
    all {
      assert(recast.activationOffered),
      assert(recast.channelDivinityUsesRemaining == 1),
      assert(recast.activeBindingCount == 1),
    }
  }

  run test_sacred_weapon_active_effect_projects_attack_damage_and_light = {
    val weakCharisma = { active: true, carryingBoundWeapon: true, charismaModifier: -1 }
    val strongCharisma = { active: true, carryingBoundWeapon: true, charismaModifier: 3 }
    all {
      assert(sacredWeaponAttackRollBonus(weakCharisma.charismaModifier) == 1),
      assert(sacredWeaponAttackRollBonus(strongCharisma.charismaModifier) == 3),
      assert(sacredWeaponDamageTypeChoices(true).contains(NormalWeaponDamage)),
      assert(sacredWeaponDamageTypeChoices(true).contains(RadiantWeaponDamage)),
      assert(sacredWeaponLightProjection(true).contains({ brightRadiusFeet: 20, dimAdditionalFeet: 20 })),
    }
  }

  run test_sacred_weapon_cleanup_ends_active_effect = {
    val active = { active: true, carryingBoundWeapon: true, charismaModifier: 2 }
    val notCarrying = { active: true, carryingBoundWeapon: false, charismaModifier: 2 }
    all {
      assert(not(sacredWeaponActiveAfterDismissal(active))),
      assert(not(sacredWeaponActiveAfterCarryCheck(notCarrying))),
      assert(sacredWeaponActiveAfterCarryCheck(active)),
      assert(sacredWeaponDamageTypeChoices(false).size() == 0),
      assert(sacredWeaponLightProjection(false).size() == 0),
    }
  }
}
