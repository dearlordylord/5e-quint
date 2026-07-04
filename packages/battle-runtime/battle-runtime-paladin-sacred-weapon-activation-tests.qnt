module battleRuntimePaladinSacredWeaponActivationTests {
  import battleRuntimePaladinSacredWeaponActivation.* from "./battle-runtime-paladin-sacred-weapon-activation"

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
