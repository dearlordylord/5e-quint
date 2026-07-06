// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.attack-action-area-save-damage-replacement

module unitFeatureBreathWeaponCoreExamples {
  import unitFeatureBreathWeaponCore.* from "./unit-feature-breath-weapon-core"

  run test_breath_weapon_projects_srd_save_damage_area_and_use_facts = {
    all {
      assert(breathWeaponSaveDc(3, 2) == 13),
      assert(breathWeaponDamageTier(1).damageDice == 1),
      assert(breathWeaponDamageTier(5).damageDice == 2),
      assert(breathWeaponDamageTier(11).damageDice == 3),
      assert(breathWeaponDamageTier(17).damageDice == 4),
      assert(breathWeaponSuccessfulSaveDamage(9) == 4),
      assert(breathWeaponUsesPerLongRest(3) == 3),
      assert(breathWeaponAreaLengthFeet(BreathWeaponCone) == 15),
      assert(breathWeaponAreaLengthFeet(BreathWeaponLine) == 30),
      assert(breathWeaponAreaWidthFeet(BreathWeaponLine) == 5),
    }
  }
}
