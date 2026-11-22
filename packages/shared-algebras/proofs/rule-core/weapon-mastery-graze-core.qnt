// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.WEAPON_MASTERY_GRAZE
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.weapon-mastery-graze
module weaponMasteryGrazeCore {
  // .references/srd-5.2.1/equipment.md "Graze": "If your attack roll with this
  // weapon misses a creature, you can deal damage to that creature equal to the
  // ability modifier you used to make the attack roll. This damage is the same
  // type dealt by the weapon, and the damage can be increased only by
  // increasing the ability modifier."
  //
  // .references/srd-5.2.1/equipment.md "Mastery Properties": "Each Mastery
  // property requires a feature like Weapon Mastery to use it." The record's
  // masteryUnlocked is that feature, with this weapon chosen for it.

  type GrazeAttackRoll = {
    weaponMasteryIsGraze: bool,
    masteryUnlocked: bool,
    targetIsCreature: bool,
    hit: bool,
    attackAbilityModifier: int,
    attackDamageBonus: int,
    weaponDamageType: str,
  }

  type GrazeDamage = {
    amount: int,
    damageType: str,
  }

  pure def grazeOffered(roll: GrazeAttackRoll): bool = all {
    roll.weaponMasteryIsGraze,
    roll.masteryUnlocked,
    roll.targetIsCreature,
    not(roll.hit),
  }

  // "you can deal damage": the attacker chooses. The damage bonus of the attack
  // never adds to it; only the ability modifier sets the amount. Damage Rolls
  // clamps damage at 0 rather than permitting negative damage.
  pure def grazeDamage(roll: GrazeAttackRoll, use: bool): Set[GrazeDamage] =
    if (grazeOffered(roll) and use)
      Set({
        amount: if (roll.attackAbilityModifier < 0) 0 else roll.attackAbilityModifier,
        damageType: roll.weaponDamageType,
      })
    else
      Set()
}
