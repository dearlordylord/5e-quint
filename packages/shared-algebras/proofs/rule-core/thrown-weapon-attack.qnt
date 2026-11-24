// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.ATTACK.THROWN_WEAPON_ATTACK

// RAW anchors:
// - equipment.md, Thrown: a weapon with the Thrown property can be thrown to
//   make a ranged attack; a thrown Melee weapon uses the ability modifier of
//   its melee attack.
// - equipment.md, Melee or Ranged: the weapon's category is Melee or Ranged.
// - equipment.md, Light: the extra attack is made with a different Light
//   weapon later on the same turn.
module thrownWeaponAttack {
  type WeaponCategory = MeleeWeaponCategory | RangedWeaponCategory

  type WeaponFacts = {
    category: WeaponCategory,
    thrown: bool,
    ammunition: bool,
  }

  type WeaponAttackDelivery = CategoryDelivery | ThrownDelivery

  type WeaponCustody = HeldWeapon | WeaponOnGround

  type AttackOutcome = AttackRollAccepted | AttackPreventedBeforeRoll

  /// A held Melee weapon with Thrown offers a thrown attack beside its own.
  pure def weaponAttackDeliveries(weapon: WeaponFacts): Set[WeaponAttackDelivery] =
    if (weapon.category == MeleeWeaponCategory and weapon.thrown) {
      Set(CategoryDelivery, ThrownDelivery)
    } else {
      Set(CategoryDelivery)
    }

  pure def weaponAttackIsRanged(
    weapon: WeaponFacts,
    delivery: WeaponAttackDelivery,
  ): bool = weapon.category == RangedWeaponCategory or delivery == ThrownDelivery

  /// The thrown option keeps its weapon's melee ability choice.
  pure def weaponAttackUsesMeleeAbility(
    weapon: WeaponFacts,
    delivery: WeaponAttackDelivery,
  ): bool = weapon.category == MeleeWeaponCategory

  /// A Melee weapon's thrown option, or a Ranged weapon with Thrown and no
  /// Ammunition, sends the weapon out of its owner's hand.
  pure def weaponAttackThrowsWeapon(
    weapon: WeaponFacts,
    delivery: WeaponAttackDelivery,
  ): bool =
    delivery == ThrownDelivery or
    (weapon.category == RangedWeaponCategory and weapon.thrown and not(weapon.ammunition))

  pure def weaponCustodyAfterAttack(
    custody: WeaponCustody,
    weapon: WeaponFacts,
    delivery: WeaponAttackDelivery,
    outcome: AttackOutcome,
  ): WeaponCustody =
    if (outcome == AttackRollAccepted and weaponAttackThrowsWeapon(weapon, delivery)) {
      WeaponOnGround
    } else {
      custody
    }

  pure def weaponAttackAvailable(custody: WeaponCustody): bool =
    custody == HeldWeapon

  /// The Light extra attack needs its own weapon in hand and an earlier Light
  /// attack with a different weapon, wherever that weapon is now.
  pure def lightExtraAttackAvailable(
    extraAttackWeaponCustody: WeaponCustody,
    earlierLightAttackWithOtherWeapon: bool,
  ): bool =
    weaponAttackAvailable(extraAttackWeaponCustody) and
    earlierLightAttackWithOtherWeapon
}
