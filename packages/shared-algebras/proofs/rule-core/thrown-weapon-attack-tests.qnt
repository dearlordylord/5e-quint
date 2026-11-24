// -*- mode: Bluespec; -*-
module thrownWeaponAttackTests {
  import thrownWeaponAttack.* from "./thrown-weapon-attack"

  pure val dagger = { category: MeleeWeaponCategory, thrown: true, ammunition: false }
  pure val shortsword = { category: MeleeWeaponCategory, thrown: false, ammunition: false }
  pure val dart = { category: RangedWeaponCategory, thrown: true, ammunition: false }
  pure val shortbow = { category: RangedWeaponCategory, thrown: false, ammunition: true }

  run aMeleeWeaponWithThrownOffersARangedThrowWithItsMeleeAbility = all {
    assert(weaponAttackDeliveries(dagger) == Set(CategoryDelivery, ThrownDelivery)),
    assert(weaponAttackDeliveries(shortsword) == Set(CategoryDelivery)),
    assert(weaponAttackDeliveries(dart) == Set(CategoryDelivery)),
    assert(not(weaponAttackIsRanged(dagger, CategoryDelivery))),
    assert(weaponAttackIsRanged(dagger, ThrownDelivery)),
    assert(weaponAttackUsesMeleeAbility(dagger, ThrownDelivery)),
    assert(weaponAttackIsRanged(shortbow, CategoryDelivery)),
  }

  run anAcceptedThrowLeavesTheWeaponOnTheGround = all {
    assert(weaponCustodyAfterAttack(HeldWeapon, dagger, ThrownDelivery, AttackRollAccepted) == WeaponOnGround),
    assert(weaponCustodyAfterAttack(HeldWeapon, dart, CategoryDelivery, AttackRollAccepted) == WeaponOnGround),
    assert(weaponCustodyAfterAttack(HeldWeapon, dagger, ThrownDelivery, AttackPreventedBeforeRoll) == HeldWeapon),
    assert(weaponCustodyAfterAttack(HeldWeapon, dagger, CategoryDelivery, AttackRollAccepted) == HeldWeapon),
    assert(weaponCustodyAfterAttack(HeldWeapon, shortbow, CategoryDelivery, AttackRollAccepted) == HeldWeapon),
    assert(not(weaponAttackAvailable(WeaponOnGround))),
  }

  run theLightExtraAttackFollowsAThrownWeapon = all {
    assert(lightExtraAttackAvailable(HeldWeapon, true)),
    assert(not(lightExtraAttackAvailable(HeldWeapon, false))),
    assert(not(lightExtraAttackAvailable(WeaponOnGround, true))),
  }
}
