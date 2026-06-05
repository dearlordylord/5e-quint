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
  // UBIQUITOUS_LANGUAGE.md: Action, Attack action, Spend, Holding / Wielding.
  type HeldWeapon = HeldMeleeWeapon | HeldRangedWeapon | NoHeldWeapon

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
}
