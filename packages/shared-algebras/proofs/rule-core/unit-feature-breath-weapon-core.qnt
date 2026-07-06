// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-action-area-save-damage-replacement
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeatureBreathWeaponCore {
  // RAW anchors:
  // - .references/srd-5.2.1/Character-Origins.md:107-121: Draconic Ancestry
  //   and Breath Weapon area, save, damage, scaling, use cap, and Long Rest
  //   reset.
  // - UBIQUITOUS_LANGUAGE.md: Attack action, Area of Effect, Saving Throw,
  //   Damage Type, Proficiency Bonus, and Long Rest.

  type BreathWeaponAreaShape =
    | BreathWeaponCone
    | BreathWeaponLine

  type BreathWeaponSaveAbility =
    | BreathWeaponDexteritySave

  type BreathWeaponRestRecovery =
    | BreathWeaponLongRestRecovery

  type BreathWeaponDamageTier = {
    characterLevel: int,
    damageDice: int,
    damageDieSize: int,
  }

  pure def breathWeaponSaveDc(constitutionModifier: int, proficiencyBonus: int): int =
    8 + constitutionModifier + proficiencyBonus

  pure def breathWeaponDamageDice(characterLevel: int): int =
    if (characterLevel >= 17) 4
    else if (characterLevel >= 11) 3
    else if (characterLevel >= 5) 2
    else 1

  pure def breathWeaponDamageTier(characterLevel: int): BreathWeaponDamageTier = {
    characterLevel: characterLevel,
    damageDice: breathWeaponDamageDice(characterLevel),
    damageDieSize: 10,
  }

  pure def breathWeaponSuccessfulSaveDamage(failedSaveDamage: int): int =
    failedSaveDamage / 2

  pure def breathWeaponUsesPerLongRest(proficiencyBonus: int): int =
    proficiencyBonus

  pure def breathWeaponAreaWidthFeet(shape: BreathWeaponAreaShape): int =
    match shape {
      | BreathWeaponCone => 15
      | BreathWeaponLine => 5
    }

  pure def breathWeaponAreaLengthFeet(shape: BreathWeaponAreaShape): int =
    match shape {
      | BreathWeaponCone => 15
      | BreathWeaponLine => 30
    }
}
